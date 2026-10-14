import sys
from playwright.sync_api import sync_playwright
url, out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 650, "height": 420})
    pg.goto(url)
    pg.wait_for_selector(".sbb-bar", timeout=20000)
    pg.wait_for_timeout(1000)
    print("bars:", [t.strip() for t in pg.locator(".sbb-bar").all_inner_texts()])
    print("visible posts:", pg.locator(".post:visible .h").all_inner_texts())
    pg.screenshot(path=out)
    b.close()
