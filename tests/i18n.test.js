import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tr, getLanguage, setLanguage, dateLocale, CATALOGUES } from '../dist/i18n.js';
import { EN } from '../dist/i18n-en.js';
import { initialState, match, parseRequest } from '../dist/domain.js';
import { seedText, localizeReason, ledgerText, auditText } from '../dist/i18n-data.js';

test('all static translation calls have nonempty English messages',()=>{
 for(const file of ['app.js','i18n-data.js']) {
  const source=readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
  for(const [,quote,key] of source.matchAll(/\btr\((['"])(.*?)\1/g)) {
   if(/[\u3400-\u9fff]/.test(key)) assert.ok(CATALOGUES.en[key]?.trim(),`Missing translation: ${key}`);
  }
 }
 for(const [key,value] of Object.entries(EN)) assert.ok(value.trim(),`Empty English message: ${key}`);
});
test('locale switches both ways, uses Singapore English dates, and rejects unsupported locales',()=>{
 setLanguage('en');assert.equal(getLanguage(),'en');assert.equal(dateLocale(),'en-SG');assert.equal(tr('我的服务'),'My services');
 assert.equal(tr('会说{language}',{language:'Mandarin'}),'Speaks Mandarin');
 assert.equal(tr('unrecognised user input'),'unrecognised user input');
 setLanguage('zh');assert.equal(tr('我的服务'),'我的服务');assert.equal(dateLocale(),'zh-CN');
 assert.throws(()=>setLanguage('xx'));assert.equal(getLanguage(),'zh');
});
test('language changes do not mutate saved tasks or matching identifiers',()=>{
 const state=initialState(),before=JSON.stringify(state),score=match(state.tasks[0],state.profile).score;
 setLanguage('en');assert.equal(seedText(state.tasks[0],'title'),'A friendly companion for my clinic visit');assert.equal(localizeReason('会说华语'),'Speaks Mandarin');assert.equal(localizeReason('0.8 km 内'),'Within 0.8 km');
 assert.equal(match(state.tasks[0],state.profile).score,score);assert.equal(JSON.stringify(state),before);
 setLanguage('zh');assert.equal(seedText(state.tasks[0],'title'),state.tasks[0].title);
});
test('known custom content localizes while unknown text and originals stay intact',()=>{
 setLanguage('en');const original=initialState().tasks[0];
 const custom={...original,id:'custom-task',title:'我的服务'};
 assert.equal(seedText(custom,'title'),'My services');assert.equal(custom.title,'我的服务');
 assert.equal(seedText({...original,title:'自定义的陪诊需求'},'title'),'自定义的陪诊需求');
 assert.equal(ledgerText({id:'custom',text:'我的服务'}),'我的服务');
 assert.equal(tr('提交评价'),'Submit review');setLanguage('zh');
});
test('system ledger entries and structured activity logs localize without changing stored descriptions',()=>{
 const state=initialState();setLanguage('en');
 assert.equal(ledgerText(state.ledger[0]),'Sample historical service points');
 assert.equal(ledgerText({reward:'社区咖啡体验券'}),'Demo redemption: Community coffee voucher');
 const event={type:'service',status:'reserved',taskId:'SL-1001',role:'volunteer'};
 assert.match(auditText(event,state.tasks),/^Booked · A friendly companion.* · Volunteer$/);
 setLanguage('zh');assert.match(auditText(event,state.tasks),/^已预约/);
});
test('English requests support digital, grocery, medical and companionship keywords',()=>{
 assert.equal(parseRequest('Help me organise family photos',{}).category,'digital');
 assert.equal(parseRequest('A companion for my doctor appointment',{}).category,'medical');
 assert.equal(parseRequest('Help with shopping for vegetables',{}).category,'grocery');
 assert.equal(parseRequest('Join me for a walk',{}).category,'companion');
});

test('Malay and Tamil cover every catalogue key with matching interpolation variables',()=>{
 for(const lang of ['ms','ta'])for(const [key,value] of Object.entries(CATALOGUES.en)){
  const translated=CATALOGUES[lang][key];assert.ok(translated?.trim(),`Missing ${lang}: ${key}`);
  const tokens=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();assert.deepEqual(tokens(translated),tokens(value),`${lang}: ${key}`);
 }
});
test('Malay and Tamil use appropriate locale dates and local request categories',()=>{
 for(const [lang,locale] of [['ms','ms-SG'],['ta','ta-SG']]){setLanguage(lang);assert.equal(dateLocale(),locale);assert.notEqual(tr('我的服务'),'我的服务');}
 for(const [text,category] of [['Temani saya ke klinik','medical'],['Belajar telefon pintar','digital'],['Membeli sayur di pasar','grocery'],['மருத்துவமனை செல்ல உதவி','medical'],['காணொளி அழைப்பு','digital'],['காய்கறி வாங்க உதவி','grocery']])assert.equal(parseRequest(text,{}).category,category);
 setLanguage('zh');
});
