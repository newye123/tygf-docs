from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import AppConfig, create_app


def fake_scanner(path, source_hash=None):
    return (
        {
            "source_sha256": source_hash,
            "source_name": path.name,
            "source_size_bytes": path.stat().st_size,
            "format": path.suffix.lstrip("."),
            "width": 1200,
            "height": 800,
            "depth": 8,
            "color_mode": "RGB",
            "channels": 3,
            "total_layers": 2,
            "group_count": 1,
            "text_layer_count": 1,
            "text_with_content_count": 1,
            "metadata_partial_count": 0,
            "unsupported_feature_count": 0,
            "parser": "fake-test-parser",
            "parser_version": "test",
            "mode": "read_only",
        },
        [{
            "object_id": "txt_12345678901234567890",
            "layer_index": 1,
            "layer_id": 22,
            "name": "Title",
            "path": "Hero/Title",
            "kind": "type",
            "text": "Test Text",
            "text_length": 9,
            "visible": True,
            "locked": False,
            "bbox": {"left": 1, "top": 2, "right": 101, "bottom": 32, "width": 100, "height": 30},
            "transform": None,
            "font_family": "Arial",
            "font_postscript_name": "ArialMT",
            "font_style": "Regular",
            "font_size_pt": 24.0,
            "leading_pt": 28.0,
            "tracking": 0,
            "parser_confidence": "high",
            "parser_notes": [],
            "unsupported_flags": [],
        }],
    )


def make_client(tmp_path, scanner=fake_scanner):
    config = AppConfig(data_dir=tmp_path / "agent-data", max_upload_bytes=1024 * 1024, port=8765, project_root=Path(__file__).resolve().parents[2])
    app = create_app(config, scanner=scanner)
    return TestClient(app, base_url="http://127.0.0.1:8765")


def get_token(client):
    response = client.get("/api/session")
    assert response.status_code == 200
    return response.json()["token"]


def test_health_exposes_read_only_boundary(tmp_path):
    client = make_client(tmp_path)
    data = client.get("/api/health").json()
    assert data["scan_mode"] == "read_only"
    assert data["photoshop_write_enabled"] is False
    assert data["bind_host"] == "127.0.0.1"


def test_api_requires_session_token(tmp_path):
    client = make_client(tmp_path)
    response = client.get("/api/scans")
    assert response.status_code == 401


def test_cross_origin_is_rejected(tmp_path):
    client = make_client(tmp_path)
    response = client.get("/api/session", headers={"Origin": "https://untrusted.example"})
    assert response.status_code == 403


def test_upload_and_read_only_scan_flow(tmp_path):
    client = make_client(tmp_path)
    token = get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    upload = client.post(
        "/api/scans",
        headers=headers,
        files={"file": ("sample.psd", b"fake psd bytes", "application/octet-stream")},
    )
    assert upload.status_code == 200
    scan_id = upload.json()["scan_id"]
    job = client.get(f"/api/scans/{scan_id}", headers=headers).json()
    assert job["status"] == "completed"
    assert job["summary"]["text_layer_count"] == 1
    layers = client.get(f"/api/scans/{scan_id}/layers?q=Test", headers=headers).json()
    assert layers["total"] == 1
    assert layers["items"][0]["text"] == "Test Text"
    csv_response = client.get(f"/api/scans/{scan_id}/export.csv", headers=headers)
    assert csv_response.status_code == 200
    assert "ArialMT" in csv_response.text
    json_response = client.get(f"/api/scans/{scan_id}/export.json", headers=headers)
    assert json_response.status_code == 200
    assert "source_sha256" in json_response.text


def test_invalid_extension_is_rejected(tmp_path):
    client = make_client(tmp_path)
    token = get_token(client)
    response = client.post(
        "/api/scans",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("notes.txt", b"not a PSD", "text/plain")},
    )
    assert response.status_code == 415


def test_upload_limit_is_enforced(tmp_path):
    client = make_client(tmp_path)
    token = get_token(client)
    response = client.post(
        "/api/scans",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("large.psd", b"x" * (1024 * 1024 + 1), "application/octet-stream")},
    )
    assert response.status_code == 413


def test_delete_removes_scan_record_and_source_copy(tmp_path):
    client = make_client(tmp_path)
    token = get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    upload = client.post("/api/scans", headers=headers, files={"file": ("sample.psb", b"fake", "application/octet-stream")})
    scan_id = upload.json()["scan_id"]
    response = client.delete(f"/api/scans/{scan_id}", headers=headers)
    assert response.status_code == 200
    assert client.get(f"/api/scans/{scan_id}", headers=headers).status_code == 404


def test_host_header_rebinding_is_rejected(tmp_path):
    client = make_client(tmp_path)
    response = client.get("/api/health", headers={"Host": "attacker.example"})
    assert response.status_code == 403


def test_default_scanner_fails_closed_on_invalid_signature(tmp_path):
    config = AppConfig(data_dir=tmp_path / "agent-data", max_upload_bytes=1024 * 1024, port=8765, project_root=Path(__file__).resolve().parents[2])
    client = TestClient(create_app(config), base_url="http://127.0.0.1:8765")
    token = get_token(client)
    upload = client.post(
        "/api/scans",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("bad.psd", b"NOTPSD", "application/octet-stream")},
    )
    scan_id = upload.json()["scan_id"]
    job = client.get(f"/api/scans/{scan_id}", headers={"Authorization": f"Bearer {token}"}).json()
    assert job["status"] == "failed"
    assert "8BPS" in job["error"]


def test_home_and_scanner_ui_are_served_from_local_agent(tmp_path):
    client = make_client(tmp_path)
    home = client.get("/")
    scanner = client.get("/scanner")
    assert home.status_code == 200
    assert "V15.0" in home.text
    assert scanner.status_code == 200
    assert "本地 PSD 扫描器" in scanner.text
    report = client.get("/execution-report-redesign.html")
    assert report.status_code == 200
    assert "执行报告" in report.text


def test_delete_rejects_active_scan(tmp_path):
    client = make_client(tmp_path)
    token = get_token(client)
    source = tmp_path / "active.psd"
    source.write_bytes(b"pending")
    scan_id = "active-scan"
    client.app.state.store.create_scan(scan_id, source.name, str(source), source.stat().st_size)
    response = client.delete(
        f"/api/scans/{scan_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 409
    assert client.get(f"/api/scans/{scan_id}", headers={"Authorization": f"Bearer {token}"}).status_code == 200


def test_scan_fails_if_task_copy_changes_during_scan(tmp_path):
    def mutating_scanner(path, source_hash=None):
        path.write_bytes(b"changed by scanner")
        summary, layers = fake_scanner(path, source_hash=source_hash)
        return summary, layers

    client = make_client(tmp_path, scanner=mutating_scanner)
    token = get_token(client)
    upload = client.post(
        "/api/scans",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("sample.psd", b"original bytes", "application/octet-stream")},
    )
    scan_id = upload.json()["scan_id"]
    job = client.get(f"/api/scans/{scan_id}", headers={"Authorization": f"Bearer {token}"}).json()
    assert job["status"] == "failed"
    assert "完整性校验失败" in job["error"]


def test_health_exposes_worker_timeout_and_read_only_controls(tmp_path):
    config = AppConfig(
        data_dir=tmp_path / "agent-data",
        max_upload_bytes=1024 * 1024,
        port=8765,
        project_root=Path(__file__).resolve().parents[2],
        scan_timeout_seconds=77,
    )
    client = TestClient(create_app(config), base_url="http://127.0.0.1:8765")
    health = client.get("/api/health").json()
    assert health["scan_timeout_seconds"] == 77
    assert health["scan_mode"] == "read_only"
    assert health["photoshop_write_enabled"] is False


def test_default_scanner_runs_in_separate_process(tmp_path):
    config = AppConfig(data_dir=tmp_path / "agent-data", max_upload_bytes=1024 * 1024, port=8765, project_root=Path(__file__).resolve().parents[2])
    client = TestClient(create_app(config), base_url="http://127.0.0.1:8765")
    token = get_token(client)
    upload = client.post(
        "/api/scans",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("bad.psd", b"NOTPSD", "application/octet-stream")},
    )
    scan_id = upload.json()["scan_id"]
    job = client.get(f"/api/scans/{scan_id}", headers={"Authorization": f"Bearer {token}"}).json()
    assert job["status"] == "failed"
    events = client.get("/api/events", headers={"Authorization": f"Bearer {token}"}).json()["items"]
    started = [item for item in events if item["scan_id"] == scan_id and item["event"] == "scan_started"]
    assert started and started[0]["details"]["isolated_process"] is True


def test_worker_timeout_is_reported_and_temporary_result_is_removed(tmp_path, monkeypatch):
    import subprocess
    from app.main import _scan_in_worker

    source = tmp_path / "timeout.psd"
    source.write_bytes(b"timeout")

    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired(args[0], kwargs.get("timeout", 30))

    monkeypatch.setattr("app.main.subprocess.run", timeout)
    try:
        _scan_in_worker(source, "a" * 64, 5)
    except RuntimeError as exc:
        assert "扫描超过时限" in str(exc)
    else:
        raise AssertionError("Worker timeout should fail closed")
    assert not (tmp_path / "scan-result.json").exists()


def test_worker_result_size_cap_fails_closed(tmp_path, monkeypatch):
    import subprocess
    from app.main import _scan_in_worker

    source = tmp_path / "oversize.psd"
    source.write_bytes(b"source")

    def write_oversize(command, **kwargs):
        result_path = Path(command[4])
        result_path.write_bytes(b"{}" * 4)
        return subprocess.CompletedProcess(command, 0, "", "")

    monkeypatch.setattr("app.main.MAX_WORKER_RESULT_BYTES", 4)
    monkeypatch.setattr("app.main.subprocess.run", write_oversize)
    try:
        _scan_in_worker(source, "b" * 64, 30)
    except RuntimeError as exc:
        assert "安全输出上限" in str(exc)
    else:
        raise AssertionError("Oversized worker output should be rejected")
    assert not (tmp_path / "scan-result.json").exists()
