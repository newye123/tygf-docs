from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'tuyigf-v14-fullsite.html').read_text(encoding='utf-8')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(html, wait_until='domcontentloaded')
    page.evaluate("location.hash='#/studio/single'")
    page.wait_for_selector('#v12TranslationText')
    csv = 'source,Spanish,Japanese\n80mm clamp,Abrazadera 80mm,80mm clamp\nShop now,Shop now,今すぐ購入\nShop now,Comprar ahora,今すぐ購入\n1/4-20 screw,Tornillo,1/4-20 ネジ'
    page.locator('#v12TranslationText').fill(csv)
    page.locator('[data-v12="sample-file"]').click()
    page.locator('[data-v12="scan"]').click()
    page.locator('[data-v12="next"]').click()
    assert page.locator('.v14-summary-card strong').nth(0).inner_text() == '4'
    assert page.locator('.v14-summary-card strong').nth(1).inner_text() == '0'
    assert page.locator('.v14-summary-card strong').nth(2).inner_text() == '1'
    assert page.locator('.v14-summary-card strong').nth(3).inner_text() == '1'
    page.locator('#v14OnlyIssues').check()
    assert page.locator('.v12-tbl tbody tr').count() == 3
    page.screenshot(path=str(ROOT / 'previews' / 'v14-issue-audit.png'), full_page=True)
    assert not errors, '\n'.join(errors)
    browser.close()
print('PASS: empty, unchanged, duplicate-source and numeric-risk counts')
print('PASS: issue-only filter returns the three expected rows')
print('PASS: no browser page errors')
