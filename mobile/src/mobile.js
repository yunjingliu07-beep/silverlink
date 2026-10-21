import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';

const Device = registerPlugin('DemoDevice');

function message(text) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4500);
}

const english = () => localStorage.getItem('silverlink-language') === 'en';

if (Capacitor.isNativePlatform()) {
  // The website creates Blob URLs for its certificate and JSON exports.
  // Keep that implementation intact and route download anchors to Android's
  // document picker; it does not require broad file-system permissions.
  const anchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && this.href.startsWith('blob:')) {
      const url = this.href;
      const filename = this.download;
      fetch(url)
        .then(response => response.blob())
        .then(async blob => {
          await Device.saveFile({
            filename,
            content: await blob.text(),
            mimeType: blob.type.split(';')[0] || 'text/plain',
          });
          message(english() ? 'File saved.' : '文件已保存。');
        })
        .catch(error => {
          if (error.code !== 'CANCELLED') {
            message(english() ? 'Could not save the file. Please try again.' : '文件未能保存，请重试。');
          }
        });
      return;
    }
    return anchorClick.call(this);
  };

  // Preserve the website's consent dialog and text-entry fallback. Android
  // delegates recognition to the user's installed speech provider.
  class NativeSpeechRecognition {
    lang = 'zh-CN';
    aborted = false;
    start() {
      this.aborted = false;
      Device.recognizeSpeech({ language: this.lang })
        .then(({ text }) => {
          if (!this.aborted) this.onresult?.({ results: [[{ transcript: text }]] });
        })
        .catch(error => {
          if (!this.aborted) this.onerror?.({ error: error.code || 'unavailable' });
        })
        .finally(() => {
          if (!this.aborted) this.onend?.();
        });
    }
    abort() { this.aborted = true; }
  }
  window.SpeechRecognition = NativeSpeechRecognition;

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="tel:"]');
    if (!link) return;
    event.preventDefault();
    Device.openDialer({ number: link.getAttribute('href').slice(4) }).catch(() => {
      message(english() ? 'No phone app is available on this device.' : '此设备没有可用的拨号应用。');
    });
  }, true);

  await App.addListener('backButton', () => {
    const dialog = document.querySelector('dialog[open]');
    if (dialog) {
      dialog.close();
    } else if (location.hash && location.hash !== '#explore') {
      location.hash = 'explore';
    } else {
      App.exitApp();
    }
  });
}

// The domain and UI modules remain the same files used by the website.
await import('./app.js');
