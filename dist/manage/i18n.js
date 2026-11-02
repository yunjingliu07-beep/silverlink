import { getLanguage } from '../i18n.js';
import { ZH } from './i18n-zh.js';
export const staffLanguage=()=>getLanguage()==='zh'?'zh':'en';
const patterns=[
 [/^(\d+) (resident|patient) profiles$/,(_,n,k)=>`${n} 份${k==='resident'?'院友':'患者'}资料`],
 [/^(\d\d:\d\d) SGT$/,(_,time)=>`${time} 新加坡时间`],
 [/^(\d+) people in your team$/,(_,n)=>`团队共 ${n} 人`],
 [/^(\d+) submissions to verify$/,(_,n)=>`${n} 份申报待核实`],
 [/^(\d+) (?:person needs|people need) a follow-up$/,(_,n)=>`${n} 人需要跟进`],
 [/^(\d+) requests? awaiting volunteers$/,(_,n)=>`${n} 项请求待安排志愿者`],
 [/^(\d+) volunteer applications?$/,(_,n)=>`${n} 份志愿者申请`],
 [/^(\d+) partner (?:request needs|requests need) a volunteer$/,(_,n)=>`${n} 项合作机构请求待安排志愿者`],
 [/^(\d+) hour submissions to review$/,(_,n)=>`${n} 份时长申报待审核`],
 [/^(\d+) applications? to review$/,(_,n)=>`${n} 份申请待审核`],
 [/^(\d+) hours to verify$/,(_,n)=>`${n} 份时长待核实`],
 [/^(\d+) (applications|volunteers) in your organisation$/,(_,n,k)=>k==='applications'?`机构共有 ${n} 份申请`:`机构共有 ${n} 位志愿者`],
 [/^(\d+) volunteers shown$/,(_,n)=>`显示 ${n} 位志愿者`],
 [/^(\d+) volunteer placements$/,(_,n)=>`${n} 项志愿服务安排`],
 [/^(\d+) open requests?$/,(_,n)=>`${n} 项待安排请求`],
 [/^(\d+) matching requests$/,(_,n)=>`${n} 项匹配请求`],
 [/^(\d+) people need a review\.$/,(_,n)=>`${n} 人需要跟进。`],
 [/^([\d.]+) submitted hours$/,(_,n)=>`已申报 ${n} 小时`],
 [/^([\d.]+) (?:hrs|hours)$/,(_,n)=>`${n} 小时`],
 [/^([\d.]+) years$/,(_,n)=>`${n} 岁`],
 [/^(\d+) \/ (\d+) completed$/,(_,n,total)=>`已完成 ${n} / ${total}`],
 [/^([\d.]+) more verified hours to the 40-hour milestone\.$/,(_,n)=>`距离 40 小时里程碑还差 ${n} 小时。`],
 [/^(Orientation|Code of conduct|Service safety) completed$/,(_,s)=>`已完成${ZH[s]}`],
 [/^(Name|Age|Language|Room or ward|Support needs) (\d+)$/,(_,s,n)=>`${ZH[s]||'房间／病区'} ${n}`],
 [/^View (.+)$/,(_,s)=>`查看${s}`],
 [/^(\d+) profiles added( and support requests sent)?\.$/,(_,n,s)=>`已添加 ${n} 份资料${s?'并提交服务请求':''}。`],
 [/^([\d.]+) verified hours added to (.+)’s record\.$/,(_,n,name)=>`已为 ${name} 计入 ${n} 小时已核实服务。`],
 [/^Add (\d+) (resident|patient) profiles to$/,(_,n,k)=>`为以下机构添加 ${n} 份${k==='resident'?'院友':'患者'}资料：`],
 [/^and create (\d+) individual volunteer requests$/,(_,n)=>`，并创建 ${n} 项个人志愿服务请求`],
 [/^(\d+) Nov(?:ember)?(?: (\d{4}))?$/,(_,day,year)=>`${year?year+'年':''}11月${day}日`],
 [/^(\d+) Oct(?:ober)?(?: (\d{4}))?$/,(_,day,year)=>`${year?year+'年':''}10月${day}日`],
 [/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d+) November$/,(_,d,n)=>`11月${n}日（${ZH[d]}）`],
 [/^2–8 November(?: 2026)?$/,()=> '2026年11月2日至8日'],
 [/^this week$/,()=> '本周'],
 [/^all times in SGT$/,()=> '均为新加坡时间'],
 [/^Level (\d+)$/,(_,n)=>`${n} 层`],
 [/^Room (\d+)$/,(_,n)=>`${n} 号房间`],
 [/^Ward (\d+)$/,(_,n)=>`${n} 病区`],
 [/^Bay ([A-Z])$/,(_,n)=>`${n} 区`],
];
export function t(message,language=staffLanguage()){
 const source=String(message??'');if(language!=='zh')return source;
 const trimmed=source.trim();let translated=ZH[trimmed];
 if(translated===undefined){
  for(const [pattern,replace] of patterns){if(pattern.test(trimmed)){translated=trimmed.replace(pattern,replace);break;}}
 }
 if(translated===undefined&&trimmed.includes('·'))translated=trimmed.split(/\s*·\s*/).map(p=>t(p,language)).join(' · ');
 if(translated===undefined&&/^(English|Mandarin|Malay|Tamil)(, (English|Mandarin|Malay|Tamil))+$/.test(trimmed))translated=trimmed.split(', ').map(p=>ZH[p]).join('、');
 return translated===undefined?source:source.replace(trimmed,translated);
}
// Only presentation nodes are translated. Record content and form values stay canonical.
export function translateUI(root=document.body){
 if(!root)return;
 for(const el of root.querySelectorAll('[data-record-label]'))el.textContent=t(el.dataset.recordLabel);
 for(const option of root.querySelectorAll('option:not([value])'))option.setAttribute('value',option.value);
 const excluded='[data-record-text],.unified-topbar,.dialog-language-actions .language-picker,script,style,textarea';
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while(node=walker.nextNode()){
  if(node.parentElement?.closest(excluded))continue;
  const original=node.__sourceText??node.nodeValue;node.__sourceText=original;node.nodeValue=t(original);
 }
 for(const el of root.querySelectorAll('[placeholder],[aria-label],[title]')){
  if(el.closest(excluded))continue;
  for(const attr of ['placeholder','aria-label','title'])if(el.hasAttribute(attr)){
   el.__sourceAttrs??={};el.__sourceAttrs[attr]??=el.getAttribute(attr);el.setAttribute(attr,t(el.__sourceAttrs[attr]));
  }
 }
}
