from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
report_html = (ROOT / 'execution-report-redesign.html').read_text(encoding='utf-8')
fullsite_html = (ROOT / 'tuyigf-v14.1-fullsite.html').read_text(encoding='utf-8')
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--allow-file-access-from-files'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append('console: '+m.text) if m.type == 'error' else None)
    page.set_content(report_html, wait_until='domcontentloaded')
    assert page.locator('#metricGrid .metric').count() == 6
    assert page.locator('#uncoveredRows tr').count() == 8
    assert page.locator('#numericRows tr').count() == 12
    assert page.locator('#layoutRows tr').count() == 40
    assert page.locator('#deliveryRows tr').count() == 12
    assert page.locator('#outputRows tr').count() == 24
    assert page.locator('#replacementRows tr').count() == 25
    assert '348 条' in page.locator('#replacementCount').inner_text()
    assert '200 条' in page.locator('#unmatchedCount').inner_text()
    page.screenshot(path=str(ROOT / 'previews' / 'v14.1-report-overview.png'), full_page=True)
    page.locator('[data-tab="issues"]').click()
    assert page.locator('[data-panel="issues"]').is_visible()
    page.locator('#layoutSearch').fill('Flip Screen')
    assert page.locator('#layoutRows tr').count() > 0
    page.locator('#unmatchedLanguage').select_option(label='越南语')
    assert '越南语' in page.locator('#unmatchedRows').inner_text()
    with page.expect_download() as dl:
        page.locator('#exportUnmatched').click()
    assert dl.value.suggested_filename.endswith('.csv')
    page.locator('[data-tab="delivery"]').click()
    assert page.locator('#outputRows tr').count() == 24
    page.locator('[data-tab="layers"]').click()
    page.locator('#replacementLanguage').select_option(label='日语')
    assert page.locator('#replacementRows tr').count() == 25
    page.locator('#replacementSearch').fill('6350')
    assert page.locator('#replacementRows tr').count() == 1
    page.locator('[data-tab="trace"]').click()
    assert page.locator('#provenanceRows details').count() == 12
    page.screenshot(path=str(ROOT / 'previews' / 'v14.1-report-trace.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('[data-tab="issues"]').click()
    page.screenshot(path=str(ROOT / 'previews' / 'v14.1-report-mobile.png'), full_page=True)
    if errors:
        raise AssertionError('\n'.join(errors))
    browser.close()

# Main site integration smoke check
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(fullsite_html, wait_until='domcontentloaded')
    assert page.locator('a[href="./execution-report-redesign.html"]').count() >= 2
    page.evaluate("location.hash='#/studio/single'")
    page.wait_for_selector('#v12StudioRoot')
    assert page.locator('a[href="./execution-report-redesign.html"]').count() >= 3
    browser.close()
    if errors:
        raise AssertionError('\n'.join(errors))
print('PASS: report summary metrics and evidence counts render')
print('PASS: issue, layout, unmatched and replacement filters render')
print('PASS: CSV export triggers')
print('PASS: delivery and provenance sections render')
print('PASS: desktop and mobile report views render')
print('PASS: V14.1 main site links to report center')
print('PASS: no browser page or console errors')
