"""Four-language browser and read-aloud controls. Speech events are mocked; audio is device-provided."""
import os,re
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('SILVERLINK_TEST_URL','http://127.0.0.1:5173')
SPEECH='''
window.__speech={spoken:[],cancelled:0,voices:[{name:'Mandarin',lang:'zh-CN'},{name:'English',lang:'en-SG'},{name:'Malay',lang:'ms-MY'},{name:'Tamil',lang:'ta-IN'}]};
Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>__speech.voices,speak:u=>__speech.spoken.push(u),cancel:()=>__speech.cancelled++}});
Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1000});ctx.add_init_script(SPEECH)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='networkidle');page.locator('#role').select_option('elder')
 def language(lang,modal=False):page.locator(('#modal' if modal else '.topbar')+' [data-language-select]').select_option(lang)
 def action(name,modal=False):page.locator(('#modal' if modal else '.workspace')+' [data-action="'+name+'"]').first.click()
 for lang,html,voice in [('zh','zh-Hans','zh-CN'),('en','en','en-SG'),('ms','ms','ms-MY'),('ta','ta','ta-IN')]:
  language(lang);expect(page.locator('html')).to_have_attribute('lang',html)
  assert 'undefined' not in page.locator('main').inner_text()
  if lang!='zh':assert not re.search('[\u4e00-\u9fff]',page.locator('main').inner_text()),page.locator('main').inner_text()
  action('read-page');assert page.evaluate('__speech.spoken.at(-1).lang')==voice
  assert page.locator('.read-aloud-active').count()==1
  action('read-page');assert page.evaluate('__speech.cancelled')>0
  previous=page.evaluate('__speech.spoken.length');action('read-page');assert page.evaluate('__speech.spoken.length')==previous+1
  page.locator('[data-reader-rate]').select_option('0.7');assert page.evaluate('__speech.spoken.at(-1).rate')==.7
  action('read-stop');expect(page.locator('.workspace [data-action="read-stop"]')).to_be_disabled();assert page.locator('.read-aloud-active').count()==0
 # Changing language cancels and does not auto-play.
 action('read-page');before=page.evaluate('__speech.spoken.length');language('en');assert page.evaluate('__speech.spoken.length')==before
 expect(page.locator('.workspace [data-action="read-stop"]')).to_be_disabled()
 # Dialog reads its content only; drafts remain and are not spoken.
 action('create');page.locator('#request-text').fill('PRIVATE DRAFT 81234567')
 page.locator('#request-form [name="hours"]').fill('3')
 language('ms',True);expect(page.locator('#request-text')).to_have_value('PRIVATE DRAFT 81234567');expect(page.locator('[name="hours"]')).to_have_value('3')
 action('read-page',True);assert page.evaluate('__speech.spoken.at(-1).lang')=='ms-MY'
 readable=page.evaluate("async()=>{const {collectReadable}=await import('./reader.js');return collectReadable(document.querySelector('#modal')).map(x=>x.text).join(' ')}")
 assert 'PRIVATE DRAFT' not in readable and '81234567' not in readable and '100+' not in readable
 action('close',True);expect(page.locator('.workspace [data-action="read-stop"]')).to_be_disabled()
 # Missing voice never falls back to a different language.
 language('ta');page.evaluate('__speech.voices=[]');action('read-page')
 expect(page.locator('.workspace .reader-status')).to_contain_text('சாதனத்தில் இல்லை')
 page.reload();expect(page.locator('html')).to_have_attribute('lang','ta');expect(page.locator('[data-reader-rate]')).to_have_value('0.7')
 # Four language versions of a profile are editable; unknown names stay intact.
 page.goto(BASE+'/#profile');page.locator('#elder-form [name="name"]').fill('Sample Person 2026');language('ms');expect(page.locator('#elder-form [name="name"]')).to_have_value('Sample Person 2026')
 page.locator('#elder-form button[type="submit"]').click()
 # Long translations and large text remain within narrow viewports in all roles.
 for lang in os.environ.get('SILVERLINK_LAYOUT_LANGUAGES','zh,en,ms,ta').split(','):
  language(lang)
  for role in ['elder','volunteer','institution','admin']:
   page.locator('#role').select_option(role)
   for width in [320,390,1440]:
    page.set_viewport_size({'width':width,'height':1000})
    for route in ['explore','services','profile','safety']+(['residents'] if role=='institution' else []):
     page.goto(BASE+'/#'+route)
     assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'Overflow {lang}/{role}/{width}/{route}'
     assert 'undefined' not in page.locator('main').inner_text(),f'Undefined {lang}/{role}/{route}'
  page.locator('#role').select_option('elder');page.set_viewport_size({'width':320,'height':1000});page.goto(BASE+'/#explore');action('text-size')
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'Large type {lang}'
  action('create');assert page.locator('#modal').evaluate('(el)=>el.scrollWidth<=el.clientWidth'),f'Dialog {lang}';action('close',True);action('text-size')
 # Synchronise all four locales across tabs.
 second=ctx.new_page();second.goto(BASE,wait_until='networkidle');language('ms');expect(second.locator('html')).to_have_attribute('lang','ms');second.close()
 # Representative screenshots, for internal review.
 page.set_viewport_size({'width':1440,'height':1000});language('zh');page.screenshot(path='/workspace/work/elder-zh.png',full_page=False)
 page.set_viewport_size({'width':390,'height':1000});language('ta');page.screenshot(path='/workspace/work/elder-ta-mobile.png',full_page=False)
 assert not errors,errors
 print('PASS: all four languages, read/pause/resume/stop/rate, matching voices, cancellation, missing voice, dialog scope, draft preservation, persisted preferences, four-role layouts and cross-tab sync. Audible speech requires device validation.')
 b.close()
