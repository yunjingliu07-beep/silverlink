import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as reader from '../dist/reader.js';
import * as domain from '../dist/domain.js';
import * as localization from '../dist/i18n.js';
import * as data from '../dist/i18n-data.js';
import * as community from '../dist/community.js';

test('historical details reconcile hours, visits, points, positive reviews and ratings',()=>{
 const s=domain.initialState(),h=community.historyRecords(s),stats=domain.stats(s);
 assert.equal(h.length,stats.sessions);assert.equal(h.reduce((a,r)=>a+r.hours,0),stats.hours);
 assert.equal(h.reduce((a,r)=>a+r.points,0),s.points);assert.equal(h.filter(r=>r.rating>=4).length,stats.positives);
 assert.equal(h.reduce((a,r)=>a+r.rating,0)/h.length,stats.rating);
});
test('bilingual fields retain originals, support both directions and invalidate stale translations after editing',()=>{
 const record={interests:'散步、摄影、园艺'};
 assert.equal(community.localizedField(record,'interests','en'),'Walking, photography, gardening');
 community.saveLocalized(record,'interests','Walking, photography, gardening','en');
 assert.equal(record.interests,'散步、摄影、园艺');
 community.saveLocalized(record,'interests','Reading, cooking','en');
 assert.equal(community.localizedField(record,'interests','zh'),'阅读、烹饪');
 community.saveLocalized(record,'interests','唱歌','zh');
 assert.equal(community.localizedField(record,'interests','en'),'Singing');
 assert.equal(community.autoText('一段未知原文','en'),'一段未知原文');
});
test('institution batches become individually matchable tasks and recipient views stay separate',()=>{
 let i=0;const s=domain.initialState();const rows=[{name:'李大爷',age:72,category:'medical',description:'陪我看病',language:'华语'},{name:'王奶奶',age:76,category:'digital',description:'教我打视频电话',language:'英语'}];
 const tasks=community.batchTasks(rows,{date:'2027-01-20',time:'09:00',hours:2,area:'Toa Payoh'},()=>`ORG-${i++}`);
 assert.equal(new Set(tasks.map(t=>t.id)).size,2);assert.ok(tasks.every(t=>domain.eligible(t,s.profile)));
 s.tasks.push(...tasks);s.role='elder';assert.ok(community.visibleTasks(s).every(t=>t.ownerRole!=='institution'));
 s.role='institution';assert.deepEqual(community.visibleTasks(s).map(t=>t.id),tasks.map(t=>t.id));
 s.role='volunteer';domain.transition(s,tasks[0].id,'apply');assert.throws(()=>domain.transition(s,tasks[1].id,'apply'),/重叠/);
 s.role='institution';domain.transition(s,tasks[0].id,'accept');assert.equal(tasks[0].status,'reserved');
 assert.throws(()=>community.batchTasks([{...rows[0],age:0}],{},()=>''));
 assert.throws(()=>community.batchTasks([],{},()=>''));
});
function appHarness(){
 const nodes=new Map();const element=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'',open:false,classList:{add(){},remove(){},toggle(){},contains(){return false;}},close(){this.open=false;},showModal(){this.open=true;},querySelector(){return null;},addEventListener(){}});return nodes.get(selector);};
 const events={};const context=vm.createContext({...reader,...domain,...localization,...data,...community,console,Date,URL,crypto:globalThis.crypto,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},location:{hash:'',href:'https://example.test'},document:{querySelector:element,getElementById:id=>element('#'+id),querySelectorAll:()=>[],documentElement:{dataset:{}},body:element('body'),addEventListener(name,fn){events[name]=fn;}},window:{addEventListener(){},scrollTo(){},scrollY:0}});
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 vm.runInContext(source+'\nglobalThis.api={setRole:r=>{state.role=r;},setPage:p=>{page=p;},render,showHistory,submitAppeal,resolveAppeal,recipientDetail,getState:()=>state};',context);
 return {api:context.api,element};
}
test('all four roles render in all four languages; recipient pages cannot expose volunteer statistics or rewards',()=>{
 const {api,element}=appHarness();
 for(const language of ['zh','en','ms','ta']){localization.setLanguage(language);for(const role of ['elder','institution','volunteer','admin']){api.setRole(role);for(const page of ['explore','services','profile','safety','rewards','admin','residents']){api.setPage(page);api.render();const html=element('#app').innerHTML;assert.ok(html.length>1000,`${role}/${page}/${language}`);if(community.isRecipient(role)){assert.doesNotMatch(html,/data-action="history"|data-page="rewards"|data-page="admin"/);assert.doesNotMatch(html,/累计服务时长|Total service hours|我的爱心积分|My kindness points|匹配度|Match score/);}}}}
 localization.setLanguage('zh');api.setRole('elder');api.setPage('explore');api.render();assert.match(element('#app').innerHTML,/100\+/);assert.match(element('#app').innerHTML,/李大爷成功找到志愿者陪他看病/);assert.match(element('#app').innerHTML,/AI 生成示意图/);
 api.setRole('volunteer');api.setPage('explore');api.render();assert.equal((element('#app').innerHTML.match(/data-action="history"/g)||[]).length,4);
 for(const tab of ['hours','sessions','rating','points']){api.showHistory(tab);assert.equal((element('#modal').innerHTML.match(/class="history-record"/g)||[]).length,18);assert.match(element('#modal').innerHTML,/data-action="appeal"/);}
});
test('appeals travel to admin and return a reply in volunteer history without silently changing points',()=>{
 const {api,element}=appHarness();api.setRole('volunteer');const fd=new Map(Object.entries({recordId:'HIST-001',date:'2026-09-01',kind:'hours',hours:'3',points:'30',details:'请核对我的服务时长'}));api.submitAppeal(fd);const a=api.getState().appeals[0];assert.equal(a.status,'pending');
 api.setRole('admin');api.setPage('admin');api.render();assert.match(element('#app').innerHTML,/请核对我的服务时长/);
 element('#resolution-'+a.id).value='已核对，等待补充签到记录。';api.resolveAppeal(a.id);assert.equal(a.status,'resolved');assert.equal(api.getState().points,360);
 api.setRole('volunteer');api.showHistory('hours');assert.match(element('#modal').innerHTML,/等待补充签到记录/);
});
