import { EN } from './i18n-en.js';

export const LANGUAGE_STORAGE_KEY = 'silverlink-language';
function storedLanguage() {
  try { return globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'zh'; }
  catch { return 'zh'; }
}
let language = storedLanguage();
export function getLanguage() { return language; }
export function setLanguage(next, { persist = true } = {}) {
  if (!['zh','en'].includes(next)) throw new Error('Unsupported language');
  language = next;
  if (persist) { try { globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* In-memory switching still works. */ } }
}
export function dateLocale() { return language === 'en' ? 'en-SG' : 'zh-CN'; }
export function tr(message, values = {}) {
  const translated = language === 'en' ? EN[message] ?? message : message;
  return String(translated).replace(/\{([a-zA-Z]+)\}/g, (token,key) => Object.hasOwn(values,key) ? String(values[key]) : token);
}
