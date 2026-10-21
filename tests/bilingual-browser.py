"""Bilingual UI regression tests. Run with the local static server on port 5173."""
import json, os, re
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('SILVERLINK_TEST_URL','http://127.0.0.1:5173')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 context=b.new_context(viewport={'width':1440,'height':1000})
 page=context.new_page(); errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='networkidle')
 def toggle(modal=False):
  page.locator(('#modal' if modal else '.topbar')+' [data-language-select]').select_option('zh' if page.locator('html').get_attribute('lang')=='en' else 'en')
 def close():page.locator('#modal [data-action="close"]').click()
 def check_english(root):
  # The switch intentionally displays 中文; proper names and entered text stay in their original language.
  cjk=re.findall(r'[^\n]*[\u4e00-\u9fff][^\n]*',root.inner_text())
  assert not [x for x in cjk if x not in ['中文'] and not x.startswith('Hello, 林悦')],cjk
 initial=page.evaluate("JSON.parse(localStorage.getItem('silverlink-demo-v1') || 'null')")
 toggle()
 expect(page.locator('html')).to_have_attribute('lang','en')
 expect(page.locator('.filters [data-filter="medical"]')).to_have_text('Medical visits')
 expect(page.locator('.task-card').first).to_contain_text('A friendly companion for my clinic visit')
 expect(page.locator('.task-meta').first).to_contain_text('Toa Payoh')
 assert '19 Oct' in page.locator('.task-card').first.inner_text()
 check_english(page.locator('main'))
 page.reload()
 expect(page.locator('html')).to_have_attribute('lang','en')
 # Profile identifiers are canonical regardless of display language; unsaved inputs survive switches.
 page.goto(BASE+'/#profile')
 page.locator('#profile-form [name="name"]').fill('我的服务 <Alice>')
 page.locator('#profile-form [name="languages"][value="福建话"]').check()
 before=page.evaluate("localStorage.getItem('silverlink-demo-v1')")
 toggle()
 expect(page.locator('#profile-form [name="name"]')).to_have_value('我的服务 <Alice>')
 expect(page.locator('#profile-form [name="languages"][value="福建话"]')).to_be_checked()
 assert before==page.evaluate("localStorage.getItem('silverlink-demo-v1')")
 toggle()
 page.locator('#profile-form button[type="submit"]').click()
 saved=page.evaluate("JSON.parse(localStorage.getItem('silverlink-demo-v1'))")
 assert '福建话' in saved['profile']['languages'] and 'Hokkien' not in saved['profile']['languages']
 # Canonical language values remain stable when creating a task in English.
 page.goto(BASE+'/#explore')
 page.locator('[data-action="create"]').click()
 page.locator('#request-form [name="description"]').fill('Please help me organise family photos. 我的服务 <script>alert(1)</script>')
 page.locator('#request-form [name="language"]').select_option('英语')
 page.locator('#request-form [name="hours"]').fill('1.5')
 toggle(True)
 expect(page.locator('#modal-title')).to_have_text('说出需要，让帮助找到你')
 expect(page.locator('#request-form [name="hours"]')).to_have_value('1.5')
 expect(page.locator('#request-form [name="language"]')).to_have_value('英语')
 expect(page.locator('#request-form [name="description"]')).to_have_value(re.compile('我的服务'))
 toggle(True)
 page.locator('#request-form button[type="submit"]').click()
 expect(page.locator('#publish-form [name="category"]')).to_have_value('digital')
 page.locator('#publish-form [name="title"]').fill('我的服务 <custom task>')
 toggle(True)
 expect(page.locator('#publish-form [name="title"]')).to_have_value('我的服务 <custom task>')
 toggle(True)
 page.locator('#publish-form button[type="submit"]').click()
 task_id=page.evaluate("JSON.parse(localStorage.getItem('silverlink-demo-v1')).tasks[0].id")
 # Our custom title must not be translated, even though it contains an exact UI phrase.
 page.locator('[data-view="list"]').click()
 expect(page.locator(f'.task-card[data-id="{task_id}"] h3')).to_have_text('我的服务 <custom task>')
 assert page.locator('article script').count()==0
 toggle();expect(page.locator(f'.task-card[data-id="{task_id}"] h3')).to_have_text('我的服务 <custom task>');toggle()
 # Test translated validation; invalid phone numbers must be rejected.
 page.goto(BASE+'/#safety')
 page.locator('[name="contactName"]').fill('Demo Contact')
 page.locator('[name="contactPhone"]').fill('12345')
 page.locator('#contact-form button').click()
 assert page.locator('[name="contactPhone"]').evaluate('(el)=>el.validationMessage')=='Please use the requested format.'
 page.locator('[name="contactPhone"]').fill('+65 81234567')
 page.locator('#contact-form button').click()
 expect(page.locator('#toast')).to_contain_text('Emergency contact saved')
 page.locator('[data-action="sos"]').first.click();check_english(page.locator('#modal'));close()
 # Test an English task application, translated error, and switching an active error dialog.
 page.goto(BASE+'/#explore')
 page.locator('[data-view="map"]').click()
 page.locator('.task-card[data-id="SL-1001"]').click()
 page.locator('.map-summary [data-action="detail"]').click();check_english(page.locator('#modal'))
 page.locator('#modal [data-action="apply"]').click()
 page.locator('#role').select_option('elder')
 page.locator('[data-action="accept"]').click()
 page.locator('#role').select_option('volunteer')
 page.locator('[data-action="start"]').click()
 page.locator('[name="code"]').fill('000000')
 page.locator('#start-form button').click()
 expect(page.locator('#modal-error')).to_contain_text('code is incorrect')
 toggle(True)
 expect(page.locator('#modal-error')).to_contain_text('签到码不正确')
 expect(page.locator('[name="code"]')).to_have_value('000000')
 toggle(True);close()
 # All routes, languages and narrow layouts. Include large-text mode and dialogs.
 for lang in ['en','zh']:
  if page.locator('html').get_attribute('lang') != ('en' if lang=='en' else 'zh-Hans'): toggle()
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900})
   for route in ['explore','services','rewards','safety','profile','admin']:
    page.goto(BASE+'/#'+route)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'Overflow: {lang}, {width}, {route}'
  page.set_viewport_size({'width':320,'height':900})
  page.goto(BASE+'/#explore')
  page.locator('[data-action="text-size"]').click()
  for route in ['explore','services','rewards','safety','profile','admin']:
   page.goto(BASE+'/#'+route)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'Large text overflow: {lang}, {route}'
  page.locator('[data-action="text-size"]').click()
  page.goto(BASE+'/#services')
  page.locator('[data-action="start"]').click()
  assert page.locator('#modal').evaluate('(el)=>el.scrollWidth<=el.clientWidth'),'Dialog overflow'
  close()
 # Locale changes synchronize across same-browser tabs without changing service data.
 second=context.new_page();second.goto(BASE,wait_until='networkidle')
 before=page.evaluate("localStorage.getItem('silverlink-demo-v1')")
 toggle()
 expect(second.locator('html')).to_have_attribute('lang',page.locator('html').get_attribute('lang'))
 assert before==page.evaluate("localStorage.getItem('silverlink-demo-v1')")
 assert errors==[],errors
 print('PASS: persistent bilingual UI, complete seeded translations, canonical matching values, preserved page/dialog drafts and errors, unchanged user content, English request parsing, translated phone validation, 48 responsive page checks, large text and cross-tab language sync.')
 b.close()
