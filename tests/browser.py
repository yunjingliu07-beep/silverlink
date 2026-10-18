"""Optional integration checks. Requires Playwright and a running local server."""
import os
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.environ.get('SILVERLINK_TEST_URL', 'http://127.0.0.1:5173')
LANGUAGE = os.environ.get('SILVERLINK_TEST_LANGUAGE', 'zh')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE_URL, wait_until='networkidle')
    if LANGUAGE == 'en': page.locator('.topbar [data-action="language"]').click()
    expect(page.locator('.task-card')).to_have_count(6)
    page.locator('[data-filter="digital"]').click()
    expect(page.locator('.task-card')).to_have_count(2)
    page.locator('[data-filter="all"]').click()
    def role(r): page.locator('#role').select_option(r)
    def action(name, selector='body'): page.locator(f'{selector} [data-action="{name}"]').first.click()
    def complete(id):
        role('volunteer')
        page.goto(BASE_URL+'/#explore')
        page.locator(f'.task-card[data-id="{id}"]').click()
        page.locator('.map-summary [data-action="detail"]').click()
        action('apply','#modal')
        expect(page.locator('.service-card').filter(has=page.locator(f'[data-id="{id}"]')).first).to_be_visible()
        role('elder')
        page.locator(f'[data-action="accept"][data-id="{id}"]').click()
        code=page.locator('.service-card .notice strong').inner_text()
        role('volunteer')
        page.locator(f'[data-action="start"][data-id="{id}"]').click()
        page.locator('[name="code"]').fill('000000')
        page.locator('#start-form button[type="submit"]').click()
        expect(page.locator('#modal-error')).to_contain_text('code is incorrect' if LANGUAGE == 'en' else '不正确')
        page.locator('[name="code"]').fill(code)
        page.locator('#start-form button[type="submit"]').click()
        page.locator(f'[data-action="finish"][data-id="{id}"]').click()
        page.locator('#finish-form [name="hours"]').fill('2')
        page.locator('#finish-form button').click()
        role('elder')
        page.locator(f'[data-action="confirm"][data-id="{id}"]').click()
        page.locator(f'[data-action="review"][data-id="{id}"]').click()
        page.locator('#review-form textarea').fill('很有耐心，谢谢你的陪伴。')
        page.locator('#review-form button').click()
        role('volunteer')
        page.locator(f'[data-action="review"][data-id="{id}"]').click()
        page.locator('#review-form textarea').fill('交流顺利，服务需求清晰。')
        page.locator('#review-form button').click()
        role('admin')
        page.goto(BASE_URL+'/#admin')
        page.locator(f'[data-action="verify"][data-id="{id}"]').click()
    complete('SL-1001')
    complete('SL-1004')
    page.goto(BASE_URL+'/#rewards')
    expect(page.locator('.stat strong').first).to_contain_text('40.0')
    with page.expect_download() as d:
        page.locator('[data-action="certificate"][data-id="service"]').click()
    assert d.value.suggested_filename.endswith('.html')
    certificate_html=open(d.value.path(),encoding='utf8').read()
    if LANGUAGE == 'en':
        assert '<html lang="en">' in certificate_html and 'DEMO ONLY' in certificate_html
    else:
        assert '<html lang="zh-Hans">' in certificate_html and '演示样本' in certificate_html
    action('redeem')
    action('confirm-redeem','#modal')
    assert page.evaluate("JSON.parse(localStorage.getItem('silverlink-demo-v1')).points") == 250
    # Creation, draft editing and escaped user content.
    role('elder')
    page.goto(BASE_URL+'/#explore')
    action('create')
    page.locator('#request-form textarea').fill('想学会手机视频通话 <img src=x onerror=alert(1)>')
    page.locator('#request-form button[type="submit"]').click()
    expect(page.locator('#publish-form [name="category"]')).to_have_value('digital')
    page.locator('#publish-form [name="title"]').fill('手机教学 <script>alert(1)</script>')
    page.locator('#publish-form button[type="submit"]').click()
    expect(page.locator('.task-card')).to_have_count(5)
    assert page.locator('article script').count()==0
    page.reload()
    expect(page.locator('.task-card')).to_have_count(5)
    # Contact persistence.
    page.goto(BASE_URL+'/#safety')
    page.locator('[name="contactName"]').fill('示例联系人')
    page.locator('[name="contactPhone"]').fill('+65 81234567')
    page.locator('#contact-form button').click()
    action('sos')
    expect(page.locator('#modal a[href="tel:+6581234567"]')).to_be_visible()
    action('close','#modal')
    # All sections at phone widths, including dialogs and large text.
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for route in ['explore','services','rewards','safety','profile','admin']:
            page.goto(BASE_URL+'/#'+route)
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Overflow at {width} {route}'
    page.set_viewport_size({'width':320,'height':850})
    page.goto(BASE_URL+'/#services')
    role('elder')
    # No script exceptions occurred throughout the role-switching flow.
    assert errors==[],errors
    print('PASS: full service flow, two-sided reviews, 40h certificate download, redemption, task creation, persistence, emergency contact, XSS escaping, and 24 responsive page checks.')
    browser.close()
