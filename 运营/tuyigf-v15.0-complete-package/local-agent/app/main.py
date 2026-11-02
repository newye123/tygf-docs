from __future__ import annotations

import csv
import io
import json
import os
import secrets
import shutil
import subprocess
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

from .scanner import scan_psd_file, sha256_file
from .store import Store

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MAX_WORKER_RESULT_BYTES = 512 * 1024 * 1024


@dataclass
class AppConfig:
    data_dir: Path = Path(os.environ.get("TUYI_DATA_DIR", str(PROJECT_ROOT / "local-agent" / "data")))
    max_upload_bytes: int = int(os.environ.get("TUYI_MAX_UPLOAD_MB", "2048")) * 1024 * 1024
    host: str = "127.0.0.1"
    port: int = int(os.environ.get("TUYI_PORT", "8765"))
    scan_timeout_seconds: int = int(os.environ.get("TUYI_SCAN_TIMEOUT_SECONDS", "1200"))
    project_root: Path = PROJECT_ROOT

    def __post_init__(self):
        self.max_upload_bytes = max(1, int(self.max_upload_bytes))
        self.scan_timeout_seconds = max(30, int(self.scan_timeout_seconds))


class LocalSecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, token: str, config: AppConfig):
        super().__init__(app)
        self.token = token
        self.config = config

    async def dispatch(self, request: Request, call_next):
        host = request.headers.get("host", "").lower()
        allowed_hosts = {
            f"127.0.0.1:{self.config.port}",
            f"localhost:{self.config.port}",
            "127.0.0.1",
            "localhost",
        }
        if host and host not in allowed_hosts:
            return JSONResponse({"detail": "Local agent only accepts loopback Host headers."}, status_code=403)

        origin = request.headers.get("origin")
        allowed_origins = {
            f"http://127.0.0.1:{self.config.port}",
            f"http://localhost:{self.config.port}",
        }
        if origin and origin not in allowed_origins:
            return JSONResponse({"detail": "Cross-origin requests are blocked by the local agent."}, status_code=403)

        if request.url.path.startswith("/api/") and request.url.path not in {"/api/session", "/api/health"}:
            auth = request.headers.get("authorization", "")
            supplied = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
            if not supplied or not secrets.compare_digest(supplied, self.token):
                return JSONResponse({"detail": "Missing or invalid local session token."}, status_code=401)

        return await call_next(request)


def _safe_name(filename: str) -> str:
    name = Path(filename.replace("\\", "/")).name
    name = "".join(ch for ch in name if ch.isalnum() or ch in " ._-()[]")
    return name[:180] or "uploaded-design.psd"


def create_app(config: AppConfig | None = None, scanner=scan_psd_file) -> FastAPI:
    cfg = config or AppConfig()
    cfg.data_dir.mkdir(parents=True, exist_ok=True)
    token = secrets.token_urlsafe(32)
    store = Store(cfg.data_dir)

    app = FastAPI(title="Tuyi Workshop Local Agent", version="15.0.0", docs_url=None, redoc_url=None)
    app.state.config = cfg
    app.state.token = token
    app.state.store = store
    app.add_middleware(LocalSecurityMiddleware, token=token, config=cfg)

    @app.get("/api/health")
    async def health():
        try:
            import psd_tools
            parser_available = True
            parser_version = getattr(psd_tools, "__version__", "unknown")
        except ImportError:
            parser_available = False
            parser_version = None
        return {
            "agent": "Tuyi Local Agent",
            "version": "15.0.0",
            "status": "ready" if parser_available else "setup_required",
            "bind_host": cfg.host,
            "bind_port": cfg.port,
            "psd_parser_available": parser_available,
            "psd_parser_version": parser_version,
            "photoshop_connected": False,
            "photoshop_write_enabled": False,
            "scan_mode": "read_only",
            "supported_extensions": [".psd", ".psb"],
            "max_upload_bytes": cfg.max_upload_bytes,
            "scan_timeout_seconds": cfg.scan_timeout_seconds,
        }

    @app.get("/api/session")
    async def session():
        return {"token": token, "agent_version": "15.0.0", "mode": "read_only"}

    @app.post("/api/scans")
    async def create_scan(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
        original_name = file.filename or "uploaded-design.psd"
        safe_name = _safe_name(original_name)
        suffix = Path(safe_name).suffix.lower()
        if suffix not in {".psd", ".psb"}:
            raise HTTPException(status_code=415, detail="仅支持 .psd 和 .psb 文件。")

        scan_id = uuid.uuid4().hex
        task_dir = cfg.data_dir / "scans" / scan_id
        task_dir.mkdir(parents=True, exist_ok=False)
        target = task_dir / safe_name
        written = 0
        try:
            with target.open("wb") as output:
                while True:
                    chunk = await file.read(8 * 1024 * 1024)
                    if not chunk:
                        break
                    written += len(chunk)
                    if written > cfg.max_upload_bytes:
                        raise HTTPException(status_code=413, detail="文件超过本地助手允许的上传大小。")
                    output.write(chunk)
        except Exception:
            shutil.rmtree(task_dir, ignore_errors=True)
            raise
        finally:
            await file.close()

        if written == 0:
            shutil.rmtree(task_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail="上传文件为空。")

        store.create_scan(scan_id, safe_name, str(target), written)
        background_tasks.add_task(_run_scan, store, scan_id, target, scanner, cfg.scan_timeout_seconds)
        return {"scan_id": scan_id, "status": "queued", "source_name": safe_name, "source_size_bytes": written}

    @app.get("/api/scans")
    async def list_scans(limit: int = 50):
        return {"items": store.list_scans(max(1, min(limit, 100)))}

    @app.get("/api/scans/{scan_id}")
    async def get_scan(scan_id: str):
        item = store.get_scan(scan_id)
        if item is None:
            raise HTTPException(status_code=404, detail="扫描任务不存在。")
        return item

    @app.get("/api/scans/{scan_id}/layers")
    async def get_layers(scan_id: str, q: str = "", confidence: str = "", offset: int = 0, limit: int = 50):
        item = store.get_scan(scan_id)
        if item is None:
            raise HTTPException(status_code=404, detail="扫描任务不存在。")
        if item["status"] != "completed":
            raise HTTPException(status_code=409, detail="扫描尚未完成。")
        if confidence and confidence not in {"high", "partial", "low"}:
            raise HTTPException(status_code=422, detail="confidence 参数无效。")
        total, rows = store.query_layers(scan_id, q=q[:200], confidence=confidence, offset=max(0, offset), limit=max(1, min(limit, 200)))
        return {"total": total, "offset": max(0, offset), "limit": max(1, min(limit, 200)), "items": rows}

    @app.get("/api/scans/{scan_id}/export.json")
    async def export_json(scan_id: str):
        item = store.get_scan(scan_id)
        if item is None:
            raise HTTPException(status_code=404, detail="扫描任务不存在。")
        if item["status"] != "completed":
            raise HTTPException(status_code=409, detail="扫描尚未完成。")
        payload = {"scan": item, "layers": store.all_layers(scan_id)}
        content = json.dumps(payload, ensure_ascii=False, indent=2)
        return Response(content, media_type="application/json; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="tuyi-scan-{scan_id[:8]}.json"'})

    @app.get("/api/scans/{scan_id}/export.csv")
    async def export_csv(scan_id: str):
        item = store.get_scan(scan_id)
        if item is None:
            raise HTTPException(status_code=404, detail="扫描任务不存在。")
        if item["status"] != "completed":
            raise HTTPException(status_code=409, detail="扫描尚未完成。")
        output = io.StringIO(newline="")
        fields = [
            "object_id", "layer_index", "layer_id", "name", "path", "kind", "text", "text_length", "text_type",
            "visible", "effective_visible", "locked", "opacity", "left", "top", "right", "bottom", "width", "height",
            "font_family", "font_postscript_name", "font_style", "font_names", "font_size_pt", "leading_pt", "tracking", "style_run_count", "font_metadata_scope",
            "parser_confidence", "parser_notes", "unsupported_flags", "style_runs",
        ]
        writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in store.all_layers(scan_id):
            flat = dict(row)
            bbox = flat.pop("bbox", None) or {}
            for key in ("left", "top", "right", "bottom", "width", "height"):
                flat[key] = bbox.get(key)
            flat["parser_notes"] = " | ".join(flat.get("parser_notes") or [])
            flat["unsupported_flags"] = " | ".join(flat.get("unsupported_flags") or [])
            flat["font_names"] = " | ".join(flat.get("font_names") or [])
            flat["style_runs"] = json.dumps(flat.get("style_runs") or [], ensure_ascii=False)
            writer.writerow(flat)
        csv_text = "\ufeff" + output.getvalue()
        return Response(csv_text, media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="tuyi-scan-{scan_id[:8]}.csv"'})

    @app.delete("/api/scans/{scan_id}")
    async def delete_scan(scan_id: str):
        item = store.get_scan(scan_id)
        if item is None:
            raise HTTPException(status_code=404, detail="扫描任务不存在。")
        if item["status"] in {"queued", "scanning"}:
            raise HTTPException(status_code=409, detail="扫描仍在执行，暂时不能删除。请等待任务完成或失败后再删除。")
        with store._connect() as conn:
            row = conn.execute("SELECT source_path FROM scans WHERE id=?", (scan_id,)).fetchone()
        source_path = Path(row[0]) if row else None
        store.delete_scan(scan_id)
        if source_path:
            shutil.rmtree(source_path.parent, ignore_errors=True)
        store.event(scan_id, "scan_deleted")
        return {"deleted": True, "scan_id": scan_id}

    @app.get("/api/events")
    async def events(limit: int = 100):
        if not store.events_path.exists():
            return {"items": []}
        lines = store.events_path.read_text(encoding="utf-8").splitlines()[-max(1, min(limit, 500)):]
        items = []
        for line in lines:
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return {"items": items}

    @app.get("/scanner")
    async def scanner_page():
        return FileResponse(cfg.project_root / "local-scanner.html")

    @app.get("/execution-report-redesign.html")
    async def execution_report_page():
        return FileResponse(cfg.project_root / "execution-report-redesign.html")

    @app.get("/")
    async def home_page():
        return FileResponse(cfg.project_root / "tuyigf-v15.0-fullsite.html")

    return app


def _scan_in_worker(path: Path, source_hash: str, timeout_seconds: int):
    agent_dir = Path(__file__).resolve().parents[1]
    worker = agent_dir / "scan_worker.py"
    result_path = path.parent / "scan-result.json"
    result_path.unlink(missing_ok=True)
    command = [sys.executable, str(worker), str(path), source_hash, str(result_path)]
    try:
        completed = subprocess.run(
            command,
            cwd=str(agent_dir),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=max(30, int(timeout_seconds)),
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except subprocess.TimeoutExpired as exc:
        result_path.unlink(missing_ok=True)
        raise RuntimeError(f"PSD/PSB 扫描超过时限（{timeout_seconds} 秒），扫描进程已终止。原文件未修改。") from exc
    if not result_path.exists():
        detail = (completed.stderr or completed.stdout or "worker returned no result")[-1800:]
        raise RuntimeError(f"扫描子进程异常退出（代码 {completed.returncode}）：{detail}")
    if result_path.stat().st_size > MAX_WORKER_RESULT_BYTES:
        result_path.unlink(missing_ok=True)
        raise RuntimeError("扫描结果超过本地 Agent 的安全输出上限（512 MiB），已拒绝加载。")
    try:
        payload = json.loads(result_path.read_text(encoding="utf-8"))
    finally:
        result_path.unlink(missing_ok=True)
    if completed.returncode != 0 or "error" in payload:
        raise RuntimeError(payload.get("error") or (completed.stderr or "PSD parser worker failed")[-1800:])
    return payload["summary"], payload["layers"]


def _run_scan(store: Store, scan_id: str, path: Path, scanner, timeout_seconds: int = 1200):
    store.update_scan(scan_id, status="scanning", started_at=store.now())
    store.event(scan_id, "scan_started", {"source_name": path.name, "isolated_process": scanner is scan_psd_file})
    try:
        digest = sha256_file(path)
        if scanner is scan_psd_file:
            summary, layers = _scan_in_worker(path, digest, timeout_seconds)
        else:
            summary, layers = scanner(path, source_hash=digest)
        digest_after = sha256_file(path)
        if digest_after != digest:
            raise RuntimeError("只读完整性校验失败：扫描期间任务副本发生变化，结果已拒绝入库。")
        summary["task_copy_integrity_verified"] = True
        summary["task_copy_sha256_after_scan"] = digest_after
        summary["scan_isolated_process"] = scanner is scan_psd_file
        summary["scan_timeout_seconds"] = timeout_seconds
        summary["scan_id"] = scan_id
        summary["scan_completed_at"] = store.now()
        store.insert_layers(scan_id, layers)
        store.update_scan(
            scan_id,
            status="completed",
            source_sha256=digest,
            finished_at=store.now(),
            summary_json=json.dumps(summary, ensure_ascii=False, allow_nan=False),
            error=None,
        )
        store.event(scan_id, "scan_completed", {
            "total_layers": summary.get("total_layers"),
            "text_layer_count": summary.get("text_layer_count"),
            "metadata_partial_count": summary.get("metadata_partial_count"),
            "task_copy_integrity_verified": True,
        })
    except Exception as exc:
        message = str(exc)[:1500]
        store.update_scan(scan_id, status="failed", finished_at=store.now(), error=message)
        store.event(scan_id, "scan_failed", {"error": message})
