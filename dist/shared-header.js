import { getLanguage, LANGUAGES } from './i18n.js';
import { ui } from './perspectives.js';
const LABELS={
 language:['语言','Language','Bahasa','மொழி'],
 text:['切换大字号','Change text size','Tukar saiz teks','எழுத்தளவை மாற்றுங்கள்'],
 search:['搜索','Search','Cari','தேடல்'],
 notifications:['通知','Notifications','Pemberitahuan','அறிவிப்புகள்'],
};
const label=(key,lang)=>LABELS[key][['zh','en','ms','ta'].indexOf(lang)]||LABELS[key][1];
const svg=path=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">${path}</svg>`;
export function languageControl({staff=false,language=getLanguage()}={}){
 const effective=staff&&language!=='zh'?'en':language;
 return `<label class="language-picker shared-language-field"><span class="shared-label">${label('language',effective)}</span><select class="language-switch" data-language-select aria-label="${label('language',effective)}">${Object.entries(LANGUAGES).filter(([key])=>!staff||['zh','en'].includes(key)).map(([key,value])=>`<option value="${key}" ${key===effective?'selected':''}>${value.name}</option>`).join('')}</select></label>`;
}
export function sharedHeader({perspective,staff=false,language=getLanguage()}={}){
 const lang=staff&&language!=='zh'?'en':language;
 const views=staff?[['volunteer','volunteer'],['nonprofit','ngo'],['elder','senior'],['care','care']]:[['volunteer','volunteer'],['admin','ngo'],['elder','senior'],['institution','care']];
 return `<div class="shared-brand-row"><a class="shared-brand" href="${staff?'#'+perspective+'/overview':'#explore'}"><img src="${staff?'../':'./'}favicon.svg" alt=""><strong>Silver Link</strong></a></div><div class="shared-controls"><label class="shared-view-field"><span class="shared-label">${ui('switch',lang)}</span><select class="perspective-picker" id="${staff?'perspective':'role'}" aria-label="${ui('switch',lang)}">${views.map(([value,key])=>`<option value="${value}" ${value===perspective?'selected':''}>${ui(key,lang)}</option>`).join('')}</select></label>${languageControl({staff,language:lang})}</div><div class="shared-tools">${staff?`<button class="icon-button shared-search" data-action="search" aria-label="${label('search',lang)}">${svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>')}</button>`:''}<button class="icon-button" data-action="text-size" aria-label="${label('text',lang)}" title="${label('text',lang)}">A<span class="small">a</span></button><button class="icon-button shared-notifications" data-action="notifications" aria-label="${label('notifications',lang)}">${svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>')}</button></div>`;
}
