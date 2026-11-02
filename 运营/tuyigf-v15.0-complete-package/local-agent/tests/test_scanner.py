from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.scanner import build_layer_record, _extract_engine_text, _font_metadata


class FakeLayer:
    kind = "type"
    name = "Headline"
    visible = True
    locked = False
    bbox = (10, 20, 310, 80)
    layer_id = 42
    transform = (1, 0, 0, 1, 0, 0)

    def __init__(self, text="Hello World", engine=None):
        self.text = text
        self.engine_dict = engine or {
            "Editor": {"Text": text},
            "StyleRun": {
                "RunArray": [{
                    "StyleSheet": {"StyleSheetData": {
                        "Font": {"Name": "ArialMT", "Family": "Arial", "Style": "Regular"},
                        "FontSize": 24.0,
                        "Leading": 28.0,
                        "Tracking": 15,
                    }}
                }]
            },
        }


class FakeGroup:
    kind = "group"
    name = "Hero"
    visible = True
    locked = False

    def __init__(self, children):
        self.children = children

    def is_group(self):
        return True

    def __iter__(self):
        return iter(self.children)


def test_build_layer_record_extracts_text_and_metadata():
    row = build_layer_record(FakeLayer(), 3, "Hero/Headline", "a" * 64)
    assert row is not None
    data = row.to_dict()
    assert data["text"] == "Hello World"
    assert data["font_postscript_name"] == "ArialMT"
    assert data["font_size_pt"] == 24.0
    assert data["bbox"]["width"] == 300
    assert data["bbox"]["height"] == 60
    assert data["visible"] is True
    assert data["locked"] is False
    assert data["parser_confidence"] == "high"
    assert data["object_id"].startswith("txt_")


def test_object_id_is_stable_for_same_source_and_layer_evidence():
    a = build_layer_record(FakeLayer(), 3, "Hero/Headline", "b" * 64)
    b = build_layer_record(FakeLayer(), 3, "Hero/Headline", "b" * 64)
    c = build_layer_record(FakeLayer(), 3, "Hero/Headline", "c" * 64)
    assert a.object_id == b.object_id
    assert a.object_id != c.object_id


def test_engine_dict_fallback_is_explicit():
    layer = FakeLayer(text=None, engine={"Editor": {"Text": "Fallback Text"}})
    row = build_layer_record(layer, 0, "Group/Text", "d" * 64)
    assert row.text == "Fallback Text"
    assert "text_extracted_from_engine_dict" in row.parser_notes
    assert "engine_dict_unavailable" not in row.unsupported_flags


def test_unavailable_metadata_stays_unknown():
    layer = FakeLayer(text="Text")
    layer.engine_dict = None
    layer.bbox = None
    layer.visible = "unknown"
    layer.locked = None
    row = build_layer_record(layer, 0, "Text", "e" * 64)
    assert row.bbox is None
    assert row.visible is None
    assert row.locked is None
    assert row.parser_confidence == "partial"
    assert "engine_dict_unavailable" in row.unsupported_flags


def test_non_text_layer_is_not_added():
    class RasterLayer:
        kind = "pixel"
        name = "Photo"
        text = None
    assert build_layer_record(RasterLayer(), 0, "Photo", "f" * 64) is None


def test_empty_text_is_retained_as_text_layer():
    row = build_layer_record(FakeLayer(text=""), 0, "Empty", "g" * 64)
    assert row is not None
    assert row.text == ""
    assert "empty_text_content" in row.parser_notes


def test_psd_header_validation_rejects_non_photoshop_file(tmp_path):
    from app.scanner import validate_psd_header
    path = tmp_path / "not-a-psd.psd"
    path.write_bytes(b"NOPE\x00\x01")
    try:
        validate_psd_header(path)
    except RuntimeError as exc:
        assert "8BPS" in str(exc)
    else:
        raise AssertionError("Invalid file header should be rejected")


def test_psb_header_version_is_detected(tmp_path):
    from app.scanner import validate_psd_header
    path = tmp_path / "sample.psb"
    header = b"8BPS\x00\x02" + (b"\x00" * 6) + (3).to_bytes(2, "big") + (800).to_bytes(4, "big") + (1200).to_bytes(4, "big") + (8).to_bytes(2, "big") + (3).to_bytes(2, "big")
    path.write_bytes(header)
    version, notes = validate_psd_header(path)
    assert version == 2
    assert notes == []


def test_multiple_style_runs_are_marked_partial_and_first_run_scoped():
    engine = {
        "Editor": {"Text": "Mixed style"},
        "StyleRun": {"RunArray": [
            {"StyleSheet": {"StyleSheetData": {"Font": {"Name": "ArialMT"}, "FontSize": 20}}},
            {"StyleSheet": {"StyleSheetData": {"Font": {"Name": "NotoSansJP-Regular"}, "FontSize": 22}}},
        ]},
    }
    layer = FakeLayer(text="Mixed style", engine=engine)
    row = build_layer_record(layer, 0, "Hero/Mixed", "h" * 64)
    assert row.parser_confidence == "partial"
    assert row.font_metadata_scope == "first_style_run_only"
    assert "multiple_character_style_runs" in row.parser_notes


def test_engine_data_scalar_wrappers_are_unwrapped():
    class Wrapped:
        def __init__(self, value):
            self.value = value
    layer = FakeLayer(text=None, engine={"Editor": {"Text": Wrapped("Wrapped text")}})
    row = build_layer_record(layer, 0, "Wrapped", "1" * 64)
    assert row.text == "Wrapped text"
    assert "text_extracted_from_engine_dict" in row.parser_notes


def test_fontset_index_resolves_to_postscript_name_and_family():
    layer = FakeLayer(text="Indexed font", engine={
        "Editor": {"Text": "Indexed font"},
        "StyleRun": {"RunArray": [{"StyleSheet": {"StyleSheetData": {"Font": 1, "FontSize": 18}}}]},
    })
    layer.resource_dict = {"FontSet": [{"Name": "Other-Regular"}, {"Name": "NotoSansJP-Regular", "Family": "Noto Sans JP"}]}
    layer.font_names = []
    row = build_layer_record(layer, 0, "Text", "2" * 64)
    assert row.font_postscript_name == "NotoSansJP-Regular"
    assert row.font_family == "Noto Sans JP"
    assert row.font_size_pt == 18.0


def test_non_finite_transform_values_are_json_safe():
    import math
    from app.scanner import _json_safe
    assert _json_safe([1.0, math.nan, math.inf]) == [1.0, None, None]


def test_psd_header_rejects_nonzero_reserved_bytes(tmp_path):
    from app.scanner import read_psd_header
    path = tmp_path / "reserved.psd"
    header = b"8BPS\x00\x01" + b"BADBAD" + (3).to_bytes(2, "big") + (800).to_bytes(4, "big") + (1200).to_bytes(4, "big") + (8).to_bytes(2, "big") + (3).to_bytes(2, "big")
    path.write_bytes(header)
    try:
        read_psd_header(path)
    except RuntimeError as exc:
        assert "保留字段" in str(exc)
    else:
        raise AssertionError("Non-zero reserved header bytes should be rejected")


def test_typesetting_api_preserves_all_character_style_runs():
    class Style:
        def __init__(self, name, size):
            self.font_name = name
            self.font_size = size
            self.font_style = "Regular"
            self.leading = size + 4
            self.tracking = 10
    class Run:
        def __init__(self, text, style):
            self.text = text
            self.style = style
    class Paragraph:
        def __init__(self, runs):
            self.runs = runs
    class TypeSetting(list):
        pass
    class Font:
        def __init__(self, postscript, family):
            self.postscript_name = postscript
            self.family_name = family
            self.style_name = "Regular"
    class TextType:
        name = "PARAGRAPH"
    layer = FakeLayer(text="Mixed font")
    layer.typesetting = TypeSetting([Paragraph([Run("Mixed", Style("ArialMT", 20)), Run(" font", Style("NotoSansJP-Regular", 22))])])
    layer.typesetting.fonts = [Font("ArialMT", "Arial"), Font("NotoSansJP-Regular", "Noto Sans JP")]
    layer.font_names = ["ArialMT", "NotoSansJP-Regular"]
    layer.text_type = TextType()
    layer.is_visible = lambda: False
    layer.opacity = 220
    row = build_layer_record(layer, 0, "Mixed", "3" * 64)
    assert row.font_names == ["ArialMT", "NotoSansJP-Regular"]
    assert row.font_postscript_name == "ArialMT"
    assert row.font_family == "Arial"
    assert row.style_run_count == 2
    assert len(row.style_runs) == 2
    assert row.style_runs[1]["font_name"] == "NotoSansJP-Regular"
    assert row.font_metadata_scope == "first_style_run_only"
    assert row.text_type == "paragraph"
    assert row.visible is True
    assert row.effective_visible is False
    assert row.opacity == 220
    assert row.parser_confidence == "partial"
