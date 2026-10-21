"""Checks the packaged web UI and native bridge contract using mock native calls.

Requires Playwright, Chromium and `python -m http.server 5173 --directory www`.
This does not replace testing the APK on an Android device.
"""
import os
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get("SILVERLINK_TEST_URL", "http://127.0.0.1:5173")
BRIDGE = """
window.androidBridge = {};
window.deviceCalls = [];
window.nativeListeners = {};
window.Capacitor = {
  PluginHeaders: [
    {name:'App', methods:[
      {name:'addListener',rtype:'callback'},
      {name:'removeListener',rtype:'callback'},
      {name:'exitApp',rtype:'promise'}
    ]},
    {name:'DemoDevice',methods:[
      {name:'saveFile',rtype:'promise'},
      {name:'openDialer',rtype:'promise'},
      {name:'recognizeSpeech',rtype:'promise'}
    ]}
  ],
  nativeCallback(plugin,method,args,callback) {
    window.nativeListeners[args.eventName] = callback;
    return 'mock-listener';
  },
  async nativePromise(plugin,method,args) {
    window.deviceCalls.push({plugin,method,args});
    if (window.failNextNative) {
      window.failNextNative = false;
      throw Object.assign(new Error('Unavailable'),{code:'UNAVAILABLE'});
    }
    return method === 'recognizeSpeech' ? {text:'希望有人陪我去复诊'} : {};
  }
};
"""

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
        headless=True, args=["--no-sandbox"],
    )
    context = browser.new_context(viewport={"width": 390, "height": 844})
    context.add_init_script(BRIDGE)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL, wait_until="networkidle")
    expect(page.locator(".task-card")).to_have_count(6)
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")

    page.locator("#role").select_option("elder")
    expect(page.locator(".recipient-hero")).to_be_visible()
    page.locator(".topbar [data-action='language']").click()
    expect(page.locator("html")).to_have_attribute("lang", "en")
    page.reload(wait_until="networkidle")
    expect(page.locator("#role")).to_have_value("elder")
    expect(page.locator("html")).to_have_attribute("lang", "en")
    page.locator(".topbar [data-action='language']").click()

    # A real Blob export reaches the native save API with intact JSON.
    page.goto(URL + "/#profile", wait_until="networkidle")
    page.locator("[data-action='export']").click()
    page.wait_for_function("deviceCalls.some(c => c.method === 'saveFile')")
    saved = page.evaluate("deviceCalls.find(c=>c.method==='saveFile').args")
    assert saved["mimeType"] == "application/json"
    assert '"role": "elder"' in saved["content"] or '"role":"elder"' in saved["content"]

    # Return from a page to home, then close an open dialog before exiting.
    page.evaluate("nativeListeners.backButton({canGoBack:true})")
    page.wait_for_url("**/#explore")
    page.locator("[data-action='create']").first.click()
    expect(page.locator("#modal")).to_be_visible()
    page.evaluate("nativeListeners.backButton({canGoBack:true})")
    expect(page.locator("#modal")).not_to_be_visible()
    page.evaluate("nativeListeners.backButton({canGoBack:false})")
    page.wait_for_function("deviceCalls.some(c=>c.method==='exitApp')")

    # Voice consent and successful recognition keep the original form flow.
    page.locator("[data-action='create']").first.click()
    page.locator("[data-action='dictate']").click()
    page.locator("[data-action='start-dictate']").click()
    expect(page.locator("#request-text")).to_have_value("希望有人陪我去复诊")
    page.locator("[data-action='dictate']").click()
    page.evaluate("window.failNextNative=true")
    page.locator("[data-action='start-dictate']").click()
    expect(page.locator("#speech-status")).to_contain_text("请改用文字")
    page.locator("#modal [data-action='close']").click()

    # The telephone link opens the dialer API, never an automatic call.
    page.goto(URL + "/#safety", wait_until="networkidle")
    page.locator("[data-action='sos']").first.click()
    page.locator("#modal a[href^='tel:']").first.click()
    page.wait_for_function("deviceCalls.some(c=>c.method==='openDialer')")
    page.locator("#modal [data-action='close']").click()

    for width in [360, 390, 768]:
        page.set_viewport_size({"width": width, "height": 900})
        for role in ["elder", "volunteer", "institution", "admin"]:
            page.locator("#role").select_option(role)
            page.goto(URL + "/#explore", wait_until="networkidle")
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (role, width)
    assert not errors, errors
    print("PASS: mobile layout, language/data persistence, export, back, speech and dialer bridge.")
    browser.close()
