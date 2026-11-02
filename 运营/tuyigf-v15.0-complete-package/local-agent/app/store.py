from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class Store:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.data_dir / "tuyi-local-agent.sqlite3"
        self.events_path = self.data_dir / "events.jsonl"
        self.lock = threading.RLock()
        self._init()

    def _connect(self):
        conn = sqlite3.connect(self.db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _init(self):
        with self.lock, self._connect() as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("""CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                source_name TEXT NOT NULL,
                source_path TEXT NOT NULL,
                source_sha256 TEXT,
                source_size_bytes INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                started_at TEXT,
                finished_at TEXT,
                summary_json TEXT,
                error TEXT
            )""")
            conn.execute("""CREATE TABLE IF NOT EXISTS layers (
                scan_id TEXT NOT NULL,
                sort_index INTEGER NOT NULL,
                object_id TEXT NOT NULL,
                data_json TEXT NOT NULL,
                PRIMARY KEY (scan_id, object_id),
                FOREIGN KEY(scan_id) REFERENCES scans(id) ON DELETE CASCADE
            )""")
            conn.commit()

    @staticmethod
    def now():
        return datetime.now(timezone.utc).isoformat(timespec="seconds")

    def event(self, scan_id: str, event: str, details: dict[str, Any] | None = None):
        record = {"timestamp": self.now(), "scan_id": scan_id, "event": event, "details": details or {}}
        with self.lock, self.events_path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(record, ensure_ascii=False) + "\n")
            stream.flush()

    def create_scan(self, scan_id: str, source_name: str, source_path: str, size: int):
        now = self.now()
        with self.lock, self._connect() as conn:
            conn.execute(
                "INSERT INTO scans(id,status,source_name,source_path,source_size_bytes,created_at) VALUES(?,?,?,?,?,?)",
                (scan_id, "queued", source_name, source_path, size, now),
            )
            conn.commit()
        self.event(scan_id, "scan_queued", {"source_name": source_name, "size_bytes": size})

    def update_scan(self, scan_id: str, **fields):
        allowed = {"status", "source_sha256", "started_at", "finished_at", "summary_json", "error"}
        updates = {key: value for key, value in fields.items() if key in allowed}
        if not updates:
            return
        assignments = ",".join(f"{key}=?" for key in updates)
        values = list(updates.values()) + [scan_id]
        with self.lock, self._connect() as conn:
            conn.execute(f"UPDATE scans SET {assignments} WHERE id=?", values)
            conn.commit()

    def insert_layers(self, scan_id: str, layers: list[dict[str, Any]]):
        with self.lock, self._connect() as conn:
            conn.executemany(
                "INSERT OR REPLACE INTO layers(scan_id,sort_index,object_id,data_json) VALUES(?,?,?,?)",
                [(scan_id, i, item["object_id"], json.dumps(item, ensure_ascii=False)) for i, item in enumerate(layers)],
            )
            conn.commit()

    def get_scan(self, scan_id: str):
        with self.lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM scans WHERE id=?", (scan_id,)).fetchone()
        if not row:
            return None
        result = dict(row)
        result["summary"] = json.loads(result.pop("summary_json")) if result.get("summary_json") else None
        result.pop("source_path", None)
        return result

    def list_scans(self, limit: int = 50):
        with self.lock, self._connect() as conn:
            rows = conn.execute("SELECT * FROM scans ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        result = []
        for row in rows:
            item = dict(row)
            item["summary"] = json.loads(item.pop("summary_json")) if item.get("summary_json") else None
            item.pop("source_path", None)
            result.append(item)
        return result

    def query_layers(self, scan_id: str, q: str = "", confidence: str = "", offset: int = 0, limit: int = 50):
        clauses = ["scan_id=?"]
        args: list[Any] = [scan_id]
        if q:
            clauses.append("data_json LIKE ?")
            args.append(f"%{q}%")
        if confidence:
            clauses.append("json_extract(data_json,'$.parser_confidence')=?")
            args.append(confidence)
        where = " AND ".join(clauses)
        with self.lock, self._connect() as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM layers WHERE {where}", args).fetchone()[0]
            rows = conn.execute(
                f"SELECT data_json FROM layers WHERE {where} ORDER BY sort_index LIMIT ? OFFSET ?",
                args + [limit, offset],
            ).fetchall()
        return total, [json.loads(row[0]) for row in rows]

    def all_layers(self, scan_id: str):
        with self.lock, self._connect() as conn:
            rows = conn.execute("SELECT data_json FROM layers WHERE scan_id=? ORDER BY sort_index", (scan_id,)).fetchall()
        return [json.loads(row[0]) for row in rows]

    def delete_scan(self, scan_id: str):
        with self.lock, self._connect() as conn:
            conn.execute("DELETE FROM layers WHERE scan_id=?", (scan_id,))
            conn.execute("DELETE FROM scans WHERE id=?", (scan_id,))
            conn.commit()
