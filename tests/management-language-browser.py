"""Shared-header geometry, bilingual management UI and canonical data regression checks."""
import os,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('SILVERLINK_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/'
MANAGE=BASE+'manage/'
STAFF='silverlink-management-v1'
ROUTES=['nonprofit/'+p for p in ['overview','volunteers','onboarding','training','placements','shifts','hours','reports','settings']]+['care/'+p for p in ['overview','residents','requests','calendar','followups','batch','reports','settings']]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1000});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def lang(value,dialog=False):page.locator(('#dialog' if dialog else '.topbar')+' [data-language-select]').select_option(value)
 def go(route):page.goto(MANAGE+'#'+route)
 def close():page.locator('#dialog [data-action="close"]').first.click()
 def action(name):page.locator('[data-action="'+name+'"]').first.click()
 def staff_data():return page.evaluate("JSON.parse(localStorage.getItem('silverlink-management-v1'))")
 # The two selectors occupy identical rectangles in every view at each breakpoint.
 for language in ['zh','en']:
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});boxes=[]
   for route,selector in [('?view=volunteer#explore','#role'),('?view=elder#explore','#role'),('manage/#nonprofit/overview','#perspective'),('manage/#care/overview','#perspective')]:
    page.goto(BASE+route);lang(language)
    expect(page.locator('html')).to_have_attribute('lang','zh-Hans' if language=='zh' else 'en')
    boxes.append([page.locator(selector).bounding_box(),page.locator('.topbar [data-language-select]').bounding_box()])
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(language,width,route)
   for pair in boxes[1:]:
    for actual,expected in zip(pair,boxes[0]):
     assert all(abs(actual[k]-expected[k])<1 for k in ['x','y','width','height']),(language,width,boxes)
 # All management routes render in both languages, including responsive tables and menus.
 for language in ['zh','en']:
  go('nonprofit/overview');lang(language)
  for width in [320,390,1440]:
   page.set_viewport_size({'width':width,'height':950})
   for route in ROUTES:
    go(route);expect(page.locator('#main h1')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(language,width,route)
    if language=='zh':assert re.search('[\u4e00-\u9fff]',page.locator('#main h1').inner_text()),route
    else:assert not re.search('[\u4e00-\u9fff]',page.locator('#main').inner_text()),route
 # A user name identical to an interface label must stay unchanged.
 page.set_viewport_size({'width':1440,'height':1000});go('nonprofit/overview');lang('zh');action('new-volunteer')
 page.locator('#create-form [name="name"]').fill('Active')
 page.locator('#create-form [name="language"]').fill('English, Mandarin')
 page.locator('#create-form [name="skill"]').select_option('Digital support')
 page.locator('#create-form [name="availability"]').select_option('Flexible')
 for language in ['en','zh']:
  lang(language,True)
  expect(page.locator('#create-form [name="name"]')).to_have_value('Active')
  expect(page.locator('#create-form [name="language"]')).to_have_value('English, Mandarin')
  expect(page.locator('#create-form [name="skill"]')).to_have_value('Digital support')
  expect(page.locator('#create-form [name="availability"]')).to_have_value('Flexible')
 page.locator('#create-form [type="submit"]').click()
 expect(page.locator('#toast')).to_contain_text('已加入')
 volunteer=next(v for v in staff_data()['volunteers'] if v['name']=='Active')
 assert volunteer['status']=='Onboarding' and volunteer['skill']=='Digital support'
 before=page.evaluate("localStorage.getItem('silverlink-management-v1')")
 lang('en');lang('zh');assert before==page.evaluate("localStorage.getItem('silverlink-management-v1')")
 page.locator('[data-action="volunteer"][data-id="'+volunteer['id']+'"]').first.click()
 for control in page.locator('#volunteer-profile-form [name="training"]').all():control.check()
 lang('en',True)
 assert page.locator('#volunteer-profile-form [name="training"]:checked').count()==3
 expect(page.locator('#dialog')).to_contain_text('Digital support')
 assert '数码协助' not in page.locator('#dialog').inner_text()
 lang('zh',True);page.locator('#volunteer-profile-form [type="submit"]').click();action('approve-volunteer');close()
 # Care form drafts, custom text and canonical dates survive language switches.
 go('care/overview');action('new-resident')
 page.locator('#create-form [name="name"]').fill('Patient <Test>')
 page.locator('#create-form [name="room"]').fill('Room 99')
 page.locator('#create-form [name="needs"]').fill('Do not translate my words.')
 page.locator('#create-form [name="language"]').select_option('English')
 lang('en',True);lang('zh',True)
 expect(page.locator('#create-form [name="needs"]')).to_have_value('Do not translate my words.')
 page.locator('#create-form [type="submit"]').click()
 resident=next(r for r in staff_data()['beneficiaries'] if r['name']=='Patient <Test>')
 page.locator('[data-action="resident"][data-id="'+resident['id']+'"]').first.click()
 page.locator('#note-form [name="note"]').fill('PRIVATE UNSAVED NOTE')
 lang('en',True);lang('zh',True);expect(page.locator('#note-form [name="note"]')).to_have_value('PRIVATE UNSAVED NOTE')
 action('new-request')
 page.locator('#create-form [name="title"]').fill('Active')
 page.locator('#create-form [name="day"]').select_option('4')
 page.locator('#create-form [name="time"]').fill('14:00')
 page.locator('#create-form [name="brief"]').fill('Custom <script>alert(1)</script> support request')
 lang('en',True);lang('zh',True)
 expect(page.locator('#create-form [name="day"]')).to_have_value('4')
 expect(page.locator('#create-form [name="beneficiaryId"]')).to_have_value(resident['id'])
 page.locator('#create-form [type="submit"]').click()
 service=next(s for s in staff_data()['services'] if s['beneficiaryId']==resident['id'])
 assert service['status']=='Needs volunteer' and service['day']==4 and service['language']=='English'
 go('nonprofit/placements');page.locator('[data-action="request"][data-id="'+service['id']+'"]').first.click()
 expect(page.locator('#dialog h3')).to_have_text('Active')
 assert page.locator('#dialog script').count()==0
 expect(page.locator('#assignment-form option[value="Active"]')).to_have_text('Active')
 page.locator('#assignment-form select').select_option('Active');lang('en',True);lang('zh',True)
 expect(page.locator('#assignment-form select')).to_have_value('Active')
 page.locator('#assignment-form [type="submit"]').click();close()
 go('care/requests');page.locator('[data-action="request"][data-id="'+service['id']+'"]').first.click()
 page.locator('#completion-form [type="submit"]').click();close()
 go('nonprofit/hours');page.locator('tr').filter(has_text='Active').locator('[data-action="verify-hours"]').click()
 assert next(s for s in staff_data()['services'] if s['id']==service['id'])['status']=='Verified'
 # Localized downloads keep user-entered names unchanged.
 go('nonprofit/volunteers')
 with page.expect_download() as d:action('export')
 csv=Path(d.value.path()).read_text();assert '姓名' in csv and 'Active' in csv and '数码协助' in csv
 # Bilingual search and status filtering use canonical identifiers.
 page.locator('[data-control="search-list"]').fill('数码')
 assert page.locator('tbody tr').count()>=1
 page.locator('[data-control="filter-list"]').select_option('Active')
 lang('en');expect(page.locator('[data-control="filter-list"]')).to_have_value('Active')
 expect(page.locator('[data-control="search-list"]')).to_have_value('数码')
 assert page.locator('tbody tr').count()>=1
 # Extra batch rows, unsaved checkbox choices and canonical day values are preserved.
 go('care/batch');lang('zh');action('add-batch-row')
 page.locator('[name="batchName"]').nth(3).fill('Batch Test')
 page.locator('[name="batchAge"]').nth(3).fill('79')
 page.locator('[name="batchLanguage"]').nth(3).select_option('Malay')
 page.locator('[name="createRequests"]').check();page.locator('[name="authorised"]').check()
 page.locator('[name="day"]').select_option('Thursday, 5 November')
 lang('en');lang('zh')
 assert page.locator('[data-batch-row]').count()==4
 expect(page.locator('[name="batchName"]').nth(3)).to_have_value('Batch Test')
 expect(page.locator('[name="batchLanguage"]').nth(3)).to_have_value('Malay')
 expect(page.locator('[name="createRequests"]')).to_be_checked()
 expect(page.locator('[name="day"]')).to_have_value('Thursday, 5 November')
 page.locator('#batch-form [type="submit"]').click();lang('en',True);lang('zh',True);action('confirm-batch')
 batch=next(r for r in staff_data()['beneficiaries'] if r['name']=='Batch Test')
 assert batch['language']=='Malay'
 assert next(s for s in staff_data()['services'] if s['beneficiaryId']==batch['id'])['day']==3
 # Language follows the four-way view switch and synchronizes with another tab.
 page.locator('#perspective').select_option('elder');expect(page.locator('html')).to_have_attribute('lang','zh-Hans')
 lang('en');page.locator('#role').select_option('admin');expect(page.locator('html')).to_have_attribute('lang','en')
 second=ctx.new_page();second.goto(MANAGE+'#care/overview');lang('zh');expect(second.locator('html')).to_have_attribute('lang','zh-Hans');second.close()
 assert not errors,errors
 print('PASS: identical headers in four views, Chinese/English on all management routes, mobile layouts, translated records and exports, preserved drafts and checkboxes, canonical request-to-verification workflow, batch intake and cross-view/tab language persistence.')
 b.close()
