from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'tuyigf-v14-fullsite.html').read_text(encoding='utf-8')
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--allow-file-access-from-files'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append('console: '+m.text) if m.type == 'error' else None)
    page.set_content(html, wait_until='domcontentloaded')
    page.evaluate("location.hash='#/studio/single'")
    page.wait_for_selector('#v12StudioRoot')
    assert page.locator('[data-v12="step"][data-step="1"]').is_disabled(), 'future single step should be locked'
    assert page.locator('[data-v12="next"]').is_disabled(), 'single next should be gated before inputs'
    page.locator('[data-v12="scan"]').click()
    assert page.locator('[data-v12="next"]').is_disabled(), 'filename must be selected before the gate opens'
    page.locator('[data-v12="sample-file"]').click()
    page.locator('[data-v12="sample"]').click()
    page.locator('[data-v12="scan"]').click()
    assert not page.locator('[data-v12="next"]').is_disabled(), 'single next should unlock after file and table are ready'
    page.locator('[data-v12="next"]').click()
    assert page.locator('h2').filter(has_text='智能检测').count() == 1
    assert page.locator('.v14-summary-grid').count() == 1
    page.locator('[data-v12="detect"]').click()
    assert not page.locator('[data-v12="next"]').is_disabled(), 'detection should unlock next step'
    page.locator('[data-v12="next"]').click()
    assert page.locator('h2').filter(has_text='设计稿校对').count() == 1
    page.locator('[data-v12="confirm"]').click()
    page.locator('[data-v12="next"]').click()
    assert page.locator('h2').filter(has_text='生成交付').count() == 1
    assert page.locator('.v14-output-grid button').count() == 3
    page.locator('[data-v12="current-output-lang"]').click()
    assert page.locator('.v14-output-grid button[aria-pressed="true"]').count() == 1
    page.locator('[data-v12="all-output-langs"]').click()
    assert page.locator('.v14-output-grid button[aria-pressed="true"]').count() == 3
    page.screenshot(path=str(ROOT / 'previews' / 'v14-single-stage3.png'), full_page=True)
    page.locator('[data-v12="drawer"]').first.click()
    page.wait_for_selector('#v12Drawer')
    page.locator('#v12TypeSize').fill('18')
    page.locator('[data-v12="save-style"]').click()
    assert page.locator('#v12Drawer').count() == 1, 'drawer should stay open after save'
    page.screenshot(path=str(ROOT / 'previews' / 'v14-desktop-drawer.png'), full_page=True)
    page.locator('[data-v12="close-drawer"]').click()
    page.locator('[data-v12="drawer"]').first.click()
    page.wait_for_selector('#v12Drawer')
    assert page.locator('#v12TypeSize').input_value() == '18', 'saved typography setting should persist after reopening'
    page.locator('#v12TypeSize').fill('20')
    page.once('dialog', lambda dialog: dialog.accept())
    page.locator('[data-v12="close-drawer"]').click()
    assert page.locator('#v12Drawer').count() == 0, 'unsaved-change confirmation should allow discard'
    with page.expect_download() as dl:
        page.locator('[data-v12="generate"]').click()
    download = dl.value
    assert download.suggested_filename.endswith('.html')
    assert page.locator('text=模拟报告已生成').count() == 1

    page.evaluate("location.hash='#/studio/batch'")
    page.wait_for_selector('#v12StudioRoot')
    assert page.locator('[data-v12="batch-next"]').is_enabled(), 'batch initial stage should allow moving to checks'
    page.locator('[data-v12="batch-next"]').click()
    assert page.locator('[data-v12="batch-next"]').is_disabled(), 'batch stage 1 should be gated'
    page.locator('[data-v12="batch-detect"]').click()
    assert page.locator('[data-v12="batch-next"]').is_enabled(), 'batch detection should unlock review'
    page.locator('[data-v12="batch-next"]').click()
    assert page.locator('[data-v12="batch-next"]').is_disabled(), 'batch stage 2 should require review confirmation'
    page.locator('[data-v12="batch-confirm"]').click()
    assert page.locator('[data-v12="batch-next"]').is_enabled(), 'batch review should unlock delivery'
    page.locator('[data-v12="batch-next"]').click()
    assert page.locator('h2').filter(has_text='批量结果摘要').count() == 1
    assert page.locator('text=批量模拟报告已生成').count() == 0
    with page.expect_download() as batch_dl:
        page.locator('[data-v12="generate"]').click()
    batch_download = batch_dl.value
    assert '批量模拟报告' in batch_download.suggested_filename
    assert page.locator('text=批量模拟报告已生成').count() == 1
    page.screenshot(path=str(ROOT / 'previews' / 'v14-batch.png'), full_page=True)

    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate("location.hash='#/studio/single'")
    page.wait_for_selector('#v12StudioRoot')
    page.locator('[data-v12="drawer"]').first.click()
    page.wait_for_selector('#v12Drawer')
    page.screenshot(path=str(ROOT / 'previews' / 'v14-mobile-drawer.png'), full_page=True)
    if errors:
        raise AssertionError('\n'.join(errors))
    browser.close()
print('PASS: single workflow gates and advances')
print('PASS: language selection and issue summary render')
print('PASS: typography drawer edits and saves')
print('PASS: simulated report state renders')
print('PASS: batch workflow gates and advances')
print('PASS: mobile drawer renders')
print('PASS: no browser console or page errors')
