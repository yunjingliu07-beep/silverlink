import { EN } from './i18n-en.js';
import { EXTRA_EN } from './i18n-extra.js';
import { MS, TA, CONTENT_EN } from './i18n-locales.js';
export const LANGUAGES = Object.freeze({
 zh:{name:'中文',html:'zh-Hans',locale:'zh-CN'},
 en:{name:'English',html:'en',locale:'en-SG'},
 ms:{name:'Bahasa Melayu',html:'ms',locale:'ms-SG'},
 ta:{name:'தமிழ்',html:'ta',locale:'ta-SG'},
});
export const CATALOGUES = {en:{...EXTRA_EN,...EN,...CONTENT_EN},ms:MS,ta:TA};
export const LANGUAGE_STORAGE_KEY = 'silverlink-language';
function storedLanguage() { try { const value=globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY); return Object.hasOwn(LANGUAGES,value)?value:'zh'; } catch { return 'zh'; } }
let language=storedLanguage();
export function getLanguage(){return language;}
export function setLanguage(next,{persist=true}={}) {
 if(!Object.hasOwn(LANGUAGES,next))throw new Error('Unsupported language');
 language=next;
 if(persist){try{globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY,next);}catch{/* Switching still works without storage. */}}
}
export function dateLocale(){return LANGUAGES[language].locale;}
export function translate(message,target=language,fallback){return target==='zh'?message:CATALOGUES[target]?.[message]??fallback??CATALOGUES.en[message]??message;}
export function tr(message,values={},fallback){return String(translate(message,language,fallback)).replace(/\{([a-zA-Z]+)\}/g,(token,key)=>Object.hasOwn(values,key)?String(values[key]):token);}
