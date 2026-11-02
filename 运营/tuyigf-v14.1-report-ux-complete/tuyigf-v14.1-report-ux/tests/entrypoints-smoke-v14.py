from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
checks = [
    ('tuyigf-v14-fullsite.html', '#/home', 'main[data-page="home"]'),
    ('tuyigf-v14-workbench-single.html', '#/studio/single', '#v12StudioRoot'),
    ('tuyigf-v14-workbench-batch.html', '#/studio/batch', '#v12StudioRoot'),
    ('tuyigf-v14-typography-drawer.html', '#/studio/type', '#v12StudioRoot'),
    ('tuyigf-v14-saas-overview.html', '#/app/overview', '#wbRoot'),
]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for filename, route, selector in checks:
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content((ROOT / filename).read_text(encoding='utf-8'), wait_until='domcontentloaded')
        page.evaluate(f"location.hash='{route}'")
        page.wait_for_selector(selector, timeout=10000)
        assert not errors, (filename, errors)
        print('PASS', filename, route)
        page.close()
    browser.close()
