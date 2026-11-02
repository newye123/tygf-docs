from pathlib import Path
from playwright.sync_api import sync_playwright
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "local-scanner.html").read_text(encoding="utf-8")
errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append("console: " + message.text) if message.type == "error" else None)

    mock_script = r"""
    (() => {
      const summary = {
        source_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        task_copy_sha256_after_scan: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        task_copy_integrity_verified: true, scan_isolated_process: true, scan_timeout_seconds: 1200,
        source_name: "fixture.psd", source_size_bytes: 2048, format: "psd", width: 1600, height: 900,
        depth: 8, color_mode: "RGB", parser_version: "1.26.0", total_layers: 5, text_layer_count: 2,
        metadata_partial_count: 1, unsupported_feature_count: 0
      };
      const layers = [
        {object_id:"txt_001",layer_index:0,layer_id:18,name:"Hero Title",path:"Hero/Title",kind:"type",text:"Capture Every Moment",text_length:20,text_type:"paragraph",visible:true,effective_visible:true,locked:false,opacity:255,bbox:{left:80,top:120,right:680,bottom:210,width:600,height:90},font_family:"Arial",font_postscript_name:"ArialMT",font_style:"Regular",font_names:["ArialMT"],font_size_pt:32,leading_pt:36,tracking:0,style_run_count:1,style_runs:[],font_metadata_scope:"single_style_run",parser_confidence:"high",parser_notes:[],unsupported_flags:[]},
        {object_id:"txt_002",layer_index:1,layer_id:19,name:"JP Subtitle",path:"Hero/Subtitle",kind:"type",text:"軽量設計",text_length:4,text_type:"point",visible:true,effective_visible:false,locked:true,opacity:220,bbox:{left:90,top:240,right:490,bottom:300,width:400,height:60},font_family:"Noto Sans JP",font_postscript_name:"NotoSansJP-Regular",font_style:"Regular",font_names:["NotoSansJP-Regular","ArialMT"],font_size_pt:24,leading_pt:28,tracking:10,style_run_count:2,style_runs:[{font_name:"NotoSansJP-Regular"},{font_name:"ArialMT"}],font_metadata_scope:"first_style_run_only",parser_confidence:"partial",parser_notes:["multiple_character_style_runs"],unsupported_flags:[]}
      ];
      const health = {agent:"Tuyi Local Agent",version:"15.0.0",status:"ready",bind_host:"127.0.0.1",bind_port:8765,psd_parser_available:true,psd_parser_version:"1.26.0",photoshop_connected:false,photoshop_write_enabled:false,scan_mode:"read_only",supported_extensions:[".psd",".psb"],max_upload_bytes:2147483648,scan_timeout_seconds:1200};
      window.fetch = async (input, options={}) => {
        const url = typeof input === "string" ? input : input.url;
        let data = {};
        if (url.endsWith("/api/session")) data = {token:"test-token",agent_version:"15.0.0",mode:"read_only"};
        else if (url.endsWith("/api/health")) data = health;
        else if (url.endsWith("/api/scans?limit=8")) data = {items:[{id:"scan-browser-smoke",source_name:"fixture.psd",status:"completed",created_at:"2026-10-31T10:00:00+00:00"}]};
        else if (url.includes("/api/scans/scan-browser-smoke/layers")) data = {total:2,offset:0,limit:30,items:layers};
        else if (url.endsWith("/api/scans/scan-browser-smoke")) data = {id:"scan-browser-smoke",status:"completed",source_name:"fixture.psd",source_size_bytes:2048,finished_at:"2026-10-31T10:01:00+00:00",source_sha256:summary.source_sha256,summary};
        else data = {detail:"mock route not found"};
        return new Response(JSON.stringify(data), {status:200,headers:{"Content-Type":"application/json"}});
      };
      window.XMLHttpRequest = class {
        constructor(){this.upload={};this.status=0;this.responseText="";this.timeout=0;}
        open(method,url){this.method=method;this.url=url;}
        setRequestHeader(){}
        send(){
          if(this.upload.onprogress)this.upload.onprogress({lengthComputable:true,loaded:100,total:100});
          queueMicrotask(()=>{this.status=200;this.responseText=JSON.stringify({scan_id:"scan-browser-smoke",status:"queued",source_name:"fixture.psd",source_size_bytes:2048});if(this.onload)this.onload();});
        }
      };
    })();
    """
    blocks = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", HTML, re.S | re.I)
    assert len(blocks) == 1
    page.set_content(re.sub(r"<script(?:\s[^>]*)?>.*?</script>", "", HTML, flags=re.S | re.I), wait_until="domcontentloaded")
    page.add_script_tag(content=mock_script)
    page.add_script_tag(content=blocks[0])
    page.wait_for_function("document.querySelector('#agentState').textContent.includes('已连接')")
    page.locator("#fileInput").set_input_files({"name": "fixture.psd", "mimeType": "application/octet-stream", "buffer": b"mock psd bytes"})
    assert page.locator("#scanBtn").is_enabled()
    page.locator("#scanBtn").click()
    page.wait_for_function("!document.querySelector('#resultPanel').classList.contains('hidden') && document.querySelector('#statText').textContent === '2'", timeout=10000)
    assert page.locator("#statText").inner_text() == "2"
    assert "SHA-256 一致" in page.locator("#hashNotice").inner_text()
    assert page.locator("#layerRows tr").count() == 2
    assert "NotoSansJP-Regular" in page.locator("#layerRows").inner_text()
    assert "段落" in page.locator("#layerRows").inner_text()
    page.screenshot(path=str(ROOT / "previews" / "v15-scanner-result.png"), full_page=True)

    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=str(ROOT / "previews" / "v15-scanner-mobile.png"), full_page=True)
    width = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    assert width <= 1, f"mobile page has horizontal overflow: {width}px"
    if errors:
        raise AssertionError("\\n".join(errors))
    browser.close()

print("PASS: local agent health and parser status")
print("PASS: file selection and upload via XHR")
print("PASS: scan summary, source hash integrity and isolated-process disclosure")
print("PASS: font family, mixed style-run, text type and visibility rendering")
print("PASS: desktop and mobile layout; no horizontal overflow")
print("PASS: no browser console or page errors")
