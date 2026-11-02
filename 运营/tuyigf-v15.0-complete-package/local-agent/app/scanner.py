from __future__ import annotations

import hashlib
import json
import math
from collections.abc import Iterable, Mapping
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass
class LayerRecord:
    object_id: str
    layer_index: int
    layer_id: str | int | None
    name: str
    path: str
    kind: str
    text: str | None
    text_length: int | None
    text_type: str | None
    visible: bool | None
    effective_visible: bool | None
    locked: bool | None
    opacity: int | None
    bbox: dict[str, int] | None
    transform: Any
    font_family: str | None
    font_postscript_name: str | None
    font_style: str | None
    font_names: list[str]
    font_size_pt: float | None
    leading_pt: float | None
    tracking: float | None
    style_run_count: int | None
    style_runs: list[dict[str, Any]]
    font_metadata_scope: str
    parser_confidence: str
    parser_notes: list[str]
    unsupported_flags: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _safe_get(obj: Any, name: str, default: Any = None) -> Any:
    try:
        value = getattr(obj, name)
        return value() if callable(value) and name in {"is_group", "is_locked", "is_visible"} else value
    except Exception:
        return default


def _mapping(value: Any) -> Mapping | None:
    return value if isinstance(value, Mapping) else None


def _unwrap(value: Any) -> Any:
    """Unwrap psd-tools EngineData scalar wrappers without guessing other objects."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    try:
        inner = getattr(value, "value")
    except Exception:
        return value
    return inner if isinstance(inner, (str, int, float, bool)) else value


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, bool)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, Mapping):
        return {str(k): _json_safe(v) for k, v in value.items()}
    try:
        scalar = value.item()
        if scalar is not value:
            return _json_safe(scalar)
    except Exception:
        pass
    try:
        return str(value)
    except Exception:
        return None


def _as_float(value: Any) -> float | None:
    value = _unwrap(value)
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError, OverflowError):
        return None


def _extract_engine_text(engine: Any) -> str | None:
    root = _mapping(engine)
    if root is None:
        return None
    editor = _mapping(root.get("Editor"))
    if editor is not None:
        candidate = _unwrap(editor.get("Text"))
        if isinstance(candidate, str):
            return candidate
    found: list[str] = []

    def walk(node: Any) -> None:
        mapping = _mapping(node)
        if mapping is not None:
            for key, value in mapping.items():
                if key == "Text":
                    candidate = _unwrap(value)
                    if isinstance(candidate, str):
                        found.append(candidate)
                else:
                    walk(value)
        elif isinstance(node, (list, tuple)):
            for item in node:
                walk(item)

    walk(root)
    return found[0] if found else None


def _extract_text(layer: Any) -> tuple[str | None, list[str]]:
    notes: list[str] = []
    value = _safe_get(layer, "text")
    if isinstance(value, str):
        return value, notes
    if value is not None:
        nested = _safe_get(value, "text")
        if isinstance(nested, str):
            return nested, notes
        notes.append("text_property_not_plain_string")
    engine = _safe_get(layer, "engine_dict")
    text = _extract_engine_text(engine)
    if text is not None:
        notes.append("text_extracted_from_engine_dict")
        return text, notes
    return None, notes


def _first_style_data(engine: Any) -> Mapping:
    root = _mapping(engine)
    if root is None:
        return {}
    style_run = _mapping(root.get("StyleRun"))
    runs = style_run.get("RunArray") if style_run else None
    if isinstance(runs, (list, tuple)) and runs:
        first = _mapping(runs[0])
        sheet = _mapping(first.get("StyleSheet")) if first else None
        data = _mapping(sheet.get("StyleSheetData")) if sheet else None
        if data is not None:
            return data
    return {}


def _style_runs(layer: Any) -> list[dict[str, Any]]:
    """Read character-level runs through psd-tools' documented typesetting API."""
    result: list[dict[str, Any]] = []
    typesetting = _safe_get(layer, "typesetting")
    if typesetting is not None:
        try:
            for paragraph_index, paragraph in enumerate(typesetting):
                runs = _safe_get(paragraph, "runs", []) or []
                for run_index, run in enumerate(runs):
                    style = _safe_get(run, "style")
                    if style is None:
                        continue
                    run_text = _safe_get(run, "text")
                    result.append({
                        "paragraph_index": paragraph_index,
                        "run_index": run_index,
                        "text": run_text if isinstance(run_text, str) else None,
                        "font_name": _string_or_none(_safe_get(style, "font_name")),
                        "font_size_pt": _as_float(_safe_get(style, "font_size")),
                        "font_style": _string_or_none(_safe_get(style, "font_style")),
                        "leading_pt": _as_float(_safe_get(style, "leading")),
                        "tracking": _as_float(_safe_get(style, "tracking")),
                    })
        except Exception:
            return result
    return result


def _string_or_none(value: Any) -> str | None:
    value = _unwrap(value)
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return str(value)
    return None


def _font_metadata(layer: Any) -> dict[str, Any]:
    engine = _safe_get(layer, "engine_dict")
    style = _first_style_data(engine)
    style_runs = _style_runs(layer)

    # font_names is the documented TypeLayer convenience property and returns
    # PostScript names from the structured typesetting model.
    raw_names = _safe_get(layer, "font_names", []) or []
    font_names = [str(name) for name in raw_names if name is not None]
    if not font_names:
        for run in style_runs:
            name = run.get("font_name")
            if name and name not in font_names:
                font_names.append(name)

    font_family = None
    postscript = font_names[0] if font_names else None
    style_name = style_runs[0].get("font_style") if style_runs else None
    size = style_runs[0].get("font_size_pt") if style_runs else None
    leading = style_runs[0].get("leading_pt") if style_runs else None
    tracking = style_runs[0].get("tracking") if style_runs else None

    # Some parser versions expose font records through typesetting.fonts.
    typesetting = _safe_get(layer, "typesetting")
    fonts = _safe_get(typesetting, "fonts", []) or []
    if fonts:
        first_font = fonts[0]
        font_family = _string_or_none(_safe_get(first_font, "family_name"))
        if not postscript:
            postscript = _string_or_none(_safe_get(first_font, "postscript_name"))
        if not style_name:
            style_name = _string_or_none(_safe_get(first_font, "style_name"))

    # Backward-compatible fallback for raw EngineData. Font may be an index into
    # resource_dict['FontSet']; never mistake that integer for a font name.
    if postscript is None:
        raw_font = _unwrap(style.get("Font"))
        if isinstance(raw_font, Mapping):
            postscript = _string_or_none(raw_font.get("Name") or raw_font.get("PostScriptName") or raw_font.get("name"))
            font_family = font_family or _string_or_none(raw_font.get("Family") or raw_font.get("family"))
            style_name = style_name or _string_or_none(raw_font.get("Style") or raw_font.get("style"))
        elif isinstance(raw_font, int):
            resources = _mapping(_safe_get(layer, "resource_dict")) or {}
            font_set = resources.get("FontSet")
            if isinstance(font_set, (list, tuple)) and 0 <= raw_font < len(font_set):
                entry = font_set[raw_font]
                entry_map = _mapping(entry)
                if entry_map:
                    postscript = _string_or_none(entry_map.get("Name") or entry_map.get("PostScriptName"))
                    font_family = font_family or _string_or_none(entry_map.get("Family"))

    if size is None:
        size = _as_float(style.get("FontSize"))
    if leading is None:
        leading = _as_float(style.get("Leading"))
    if tracking is None:
        tracking = _as_float(style.get("Tracking"))

    return {
        "font_family": font_family,
        "font_postscript_name": postscript,
        "font_style": style_name,
        "font_names": font_names,
        "font_size_pt": size,
        "leading_pt": leading,
        "tracking": tracking,
        "style_run_count": len(style_runs) if style_runs else _raw_style_run_count(engine),
        "style_runs": style_runs,
    }


def _raw_style_run_count(engine: Any) -> int | None:
    root = _mapping(engine)
    style_run = _mapping(root.get("StyleRun")) if root else None
    runs = style_run.get("RunArray") if style_run else None
    return len(runs) if isinstance(runs, (list, tuple)) else None


def _bbox(layer: Any) -> dict[str, int] | None:
    raw = _safe_get(layer, "bbox")
    if raw is None:
        return None
    try:
        left, top, right, bottom = [int(round(float(v))) for v in raw]
        return {
            "left": left,
            "top": top,
            "right": right,
            "bottom": bottom,
            "width": max(0, right - left),
            "height": max(0, bottom - top),
        }
    except Exception:
        return None


def _layer_id(layer: Any) -> str | int | None:
    value = _safe_get(layer, "layer_id")
    if value is None:
        value = _safe_get(layer, "id")
    return value if isinstance(value, (str, int)) else None


def _is_group(layer: Any) -> bool:
    value = _safe_get(layer, "is_group")
    if isinstance(value, bool):
        return value
    kind = str(_safe_get(layer, "kind", "")).lower()
    return kind in {"group", "layersection"}


def _iter_tree(layers: Iterable[Any], parent_path: str = ""):
    for index, layer in enumerate(layers):
        name = str(_safe_get(layer, "name", f"Layer {index + 1}"))
        path = f"{parent_path}/{name}" if parent_path else name
        yield layer, index, path
        if _is_group(layer):
            try:
                children = list(layer)
            except Exception:
                children = []
            yield from _iter_tree(children, path)


def _stable_object_id(source_hash: str, path: str, index: int, layer_id: Any, bbox: Any) -> str:
    payload = json.dumps(
        [source_hash, path, index, layer_id, bbox], ensure_ascii=False, separators=(",", ":")
    )
    return "txt_" + hashlib.sha256(payload.encode("utf-8")).hexdigest()[:20]


def build_layer_record(layer: Any, layer_index: int, path: str, source_hash: str) -> LayerRecord | None:
    kind = str(_safe_get(layer, "kind", "unknown"))
    text, notes = _extract_text(layer)
    is_text = kind.lower() in {"type", "text", "textlayer"} or text is not None
    if not is_text:
        return None

    if text is None:
        notes.append("text_layer_detected_but_content_unavailable")
    if text == "":
        notes.append("empty_text_content")

    bbox = _bbox(layer)
    if bbox is None:
        notes.append("bbox_unavailable")

    visible_raw = _safe_get(layer, "visible")
    visible = visible_raw if isinstance(visible_raw, bool) else None
    effective_raw = _safe_get(layer, "is_visible")
    effective_visible = effective_raw if isinstance(effective_raw, bool) else visible
    locked_raw = _safe_get(layer, "locked")
    if not isinstance(locked_raw, bool):
        locked_raw = _safe_get(layer, "is_locked")
    locked = locked_raw if isinstance(locked_raw, bool) else None
    opacity_raw = _safe_get(layer, "opacity")
    opacity = int(opacity_raw) if isinstance(opacity_raw, (int, float)) else None

    engine = _safe_get(layer, "engine_dict")
    unsupported: list[str] = []
    if _mapping(engine) is None:
        unsupported.append("engine_dict_unavailable")
    run_count = _raw_style_run_count(engine)
    font = _font_metadata(layer)
    if font["style_run_count"] is not None:
        run_count = font["style_run_count"]
    if run_count is not None and run_count > 1:
        notes.append("multiple_character_style_runs")
    if text is not None and bbox is not None and font["font_postscript_name"]:
        confidence = "high" if run_count in (None, 0, 1) else "partial"
    elif text is not None:
        confidence = "partial"
    else:
        confidence = "low"
    font_scope = "first_style_run_only" if run_count and run_count > 1 else ("single_style_run" if run_count == 1 else "unknown")

    text_type_raw = _safe_get(layer, "text_type")
    text_type = getattr(text_type_raw, "name", None) or (_string_or_none(text_type_raw) if text_type_raw is not None else None)
    if text_type:
        text_type = text_type.lower()

    raw_id = _layer_id(layer)
    object_id = _stable_object_id(source_hash, path, layer_index, raw_id, bbox)
    return LayerRecord(
        object_id=object_id,
        layer_index=layer_index,
        layer_id=raw_id,
        name=str(_safe_get(layer, "name", f"Layer {layer_index + 1}")),
        path=path,
        kind=kind,
        text=text,
        text_length=len(text) if text is not None else None,
        text_type=text_type,
        visible=visible,
        effective_visible=effective_visible,
        locked=locked,
        opacity=opacity,
        bbox=bbox,
        transform=_json_safe(_safe_get(layer, "transform")),
        font_family=font["font_family"],
        font_postscript_name=font["font_postscript_name"],
        font_style=font["font_style"],
        font_names=font["font_names"],
        font_size_pt=font["font_size_pt"],
        leading_pt=font["leading_pt"],
        tracking=font["tracking"],
        style_run_count=run_count,
        style_runs=font["style_runs"],
        font_metadata_scope=font_scope,
        parser_confidence=confidence,
        parser_notes=notes,
        unsupported_flags=unsupported,
    )


def sha256_file(path: Path, chunk_size: int = 8 * 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while True:
            chunk = stream.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def read_psd_header(path: Path) -> dict[str, Any]:
    with path.open("rb") as stream:
        header = stream.read(26)
    if len(header) < 26 or header[:4] != b"8BPS":
        raise RuntimeError("文件头校验失败：未识别到 Photoshop PSD/PSB 标识 8BPS。")
    version = int.from_bytes(header[4:6], "big")
    if version not in (1, 2):
        raise RuntimeError(f"不支持的 Photoshop 文件版本标识：{version}。")
    if header[6:12] != b"\x00" * 6:
        raise RuntimeError("PSD/PSB 文件头保留字段异常，文件可能损坏或格式不受支持。")
    channels = int.from_bytes(header[12:14], "big")
    height = int.from_bytes(header[14:18], "big")
    width = int.from_bytes(header[18:22], "big")
    depth = int.from_bytes(header[22:24], "big")
    color_mode = int.from_bytes(header[24:26], "big")
    if not 1 <= channels <= 56:
        raise RuntimeError(f"PSD/PSB 通道数异常：{channels}。")
    if width <= 0 or height <= 0:
        raise RuntimeError(f"PSD/PSB 画布尺寸异常：{width} × {height}。")
    if depth not in {1, 8, 16, 32}:
        raise RuntimeError(f"PSD/PSB 位深不受支持：{depth}。")
    if color_mode not in {0, 1, 2, 3, 4, 7, 8, 9}:
        raise RuntimeError(f"PSD/PSB 色彩模式标识异常：{color_mode}。")
    expected = ".psb" if version == 2 else ".psd"
    notes = []
    if path.suffix.lower() != expected:
        notes.append(f"extension_version_mismatch: header={expected}, extension={path.suffix.lower()}")
    return {
        "version": version,
        "format_from_header": expected.lstrip("."),
        "channels": channels,
        "height": height,
        "width": width,
        "depth": depth,
        "color_mode_code": color_mode,
        "notes": notes,
    }


def validate_psd_header(path: Path) -> tuple[int, list[str]]:
    info = read_psd_header(path)
    return info["version"], info["notes"]


def _open_psd_safely(PSDImage: Any, path: Path):
    """Use structural parser limits when supported by the installed psd-tools."""
    try:
        from psd_tools import ParseLimits
        limits = ParseLimits(
            max_read_bytes=1024 * 1024 * 1024,
            max_total_bytes=2 * 1024 * 1024 * 1024,
            max_objects=500_000,
            max_nesting_depth=64,
        )
        return PSDImage.open(
            str(path),
            max_alloc_bytes=512 * 1024 * 1024,
            parse_limits=limits,
        )
    except ImportError:
        # Older psd-tools versions do not expose ParseLimits. V15 package pins
        # a version that does, but this fallback keeps adapter tests portable.
        return PSDImage.open(str(path))


def scan_psd_file(path: Path, source_hash: str | None = None) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    header = read_psd_header(path)
    try:
        import psd_tools
        PSDImage = psd_tools.PSDImage
        psd_tools_version = getattr(psd_tools, "__version__", "unknown")
    except ImportError as exc:
        raise RuntimeError(
            "缺少 PSD 解析依赖 psd-tools。请运行 install-windows.bat 安装依赖后重试。"
        ) from exc

    digest = source_hash or sha256_file(path)
    try:
        psd = _open_psd_safely(PSDImage, path)
    except Exception as exc:
        raise RuntimeError(f"PSD/PSB 解析失败：{type(exc).__name__}: {exc}") from exc

    layers: list[dict[str, Any]] = []
    total_layers = 0
    groups = 0
    for layer, _sibling_index, layer_path in _iter_tree(list(psd)):
        total_layers += 1
        if _is_group(layer):
            groups += 1
            continue
        record = build_layer_record(layer, total_layers - 1, layer_path, digest)
        if record is not None:
            layers.append(record.to_dict())

    summary = {
        "source_sha256": digest,
        "source_name": path.name,
        "source_size_bytes": path.stat().st_size,
        "format": header["format_from_header"],
        "photoshop_header_version": header["version"],
        "header_notes": header["notes"],
        "width": _safe_get(psd, "width", header["width"]),
        "height": _safe_get(psd, "height", header["height"]),
        "depth": _safe_get(psd, "depth", header["depth"]),
        "color_mode": str(_safe_get(psd, "color_mode", "unknown")),
        "color_mode_code": header["color_mode_code"],
        "channels": _safe_get(psd, "channels", header["channels"]),
        "total_layers": total_layers,
        "group_count": groups,
        "text_layer_count": len(layers),
        "text_with_content_count": sum(1 for item in layers if item["text"] is not None),
        "metadata_partial_count": sum(1 for item in layers if item["parser_confidence"] != "high"),
        "unsupported_feature_count": sum(len(item["unsupported_flags"]) for item in layers),
        "parser": "psd-tools",
        "parser_version": psd_tools_version,
        "mode": "read_only",
        "font_metadata_method": "psd-tools TypeLayer.typesetting and font_names with raw EngineData fallback",
    }
    return summary, layers
