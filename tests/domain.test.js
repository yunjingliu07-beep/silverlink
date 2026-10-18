import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, match, stats, transition, certificateEligibility, parseRequest, redeem } from '../dist/domain.js';
function complete(s,id,hours=2) {
 s.role='volunteer';transition(s,id,'apply');s.role='elder';transition(s,id,'accept');const code=s.tasks.find(t=>t.id===id).code;s.role='volunteer';transition(s,id,'start',{code});transition(s,id,'finish',{hours});s.role='elder';transition(s,id,'confirm');s.role='admin';transition(s,id,'verify');
}
test('matching requires language, skill and availability rather than score alone',()=>{
 const s=initialState();assert.equal(match(s.tasks[0],s.profile).eligible,true);assert.equal(match(s.tasks[2],s.profile).eligible,false);assert.equal(match(s.tasks[5],s.profile).eligible,false);s.profile.available=[];assert.equal(match(s.tasks[0],s.profile).eligible,false);
});
test('service requires both roles, valid check-in code, and admin verification',()=>{
 const s=initialState();const id=s.tasks[0].id;assert.throws(()=>transition(s,id,'verify'));transition(s,id,'apply');assert.throws(()=>transition(s,id,'accept'));s.role='elder';transition(s,id,'accept');s.role='volunteer';assert.throws(()=>transition(s,id,'start',{code:'000000'}));transition(s,id,'start',{code:s.tasks[0].code});assert.throws(()=>transition(s,id,'finish',{hours:0}));transition(s,id,'finish',{hours:2});assert.equal(stats(s).hours,36);assert.throws(()=>transition(s,id,'confirm'));s.role='elder';transition(s,id,'confirm');assert.equal(stats(s).hours,36);s.role='admin';transition(s,id,'verify');assert.equal(stats(s).hours,38);assert.equal(s.points,380);assert.throws(()=>transition(s,id,'verify'));assert.equal(s.points,380);
});
test('overlap uses minutes and permits adjacent bookings',()=>{
 const s=initialState();s.tasks[0].time='09:30';s.tasks[0].hours=.5;s.profile.available.push('09:30');transition(s,s.tasks[0].id,'apply');s.tasks[1].time='09:45';assert.throws(()=>transition(s,s.tasks[1].id,'apply'),/重叠/);s.tasks[1].time='10:00';transition(s,s.tasks[1].id,'apply');assert.equal(s.tasks[1].status,'applied');
});
test('cancel invalidates code and frees task for another application',()=>{
 const s=initialState(),id=s.tasks[0].id;transition(s,id,'apply');s.role='elder';transition(s,id,'accept');transition(s,id,'cancel');assert.equal(s.tasks[0].status,'open');assert.equal(s.tasks[0].code,undefined);s.role='volunteer';transition(s,id,'apply');
});
test('open reports block verification and award eligibility uses verified hours',()=>{
 const s=initialState(),id=s.tasks[0].id;assert.equal(certificateEligibility(s,'service'),false);complete(s,id);assert.equal(certificateEligibility(s,'service'),false);const id2=s.tasks[3].id;complete(s,id2);assert.equal(certificateEligibility(s,'service'),true);assert.equal(certificateEligibility(s,'honor'),false);const id3=s.tasks[1].id;const t=s.tasks.find(t=>t.id===id3);t.status='completed';t.actualHours=2;s.reports.push({taskId:id3,closed:false});assert.throws(()=>transition(s,id3,'verify'),/反馈/);s.reports[0].closed=true;transition(s,id3,'verify');assert.equal(s.points,420);
});
test('mutual reviews are separate, validated, and cannot be submitted twice',()=>{
 const s=initialState(),id=s.tasks[0].id;complete(s,id);s.role='elder';assert.throws(()=>transition(s,id,'review',{stars:6}));transition(s,id,'review',{stars:5,text:'耐心细致'});assert.throws(()=>transition(s,id,'review',{stars:5}));s.role='volunteer';transition(s,id,'review',{stars:4,text:'交流顺利'});assert.equal(s.tasks[0].elderReview.stars,5);assert.equal(s.tasks[0].volunteerReview.stars,4);assert.equal(stats(s).positives,18);
});
test('redemption preserves nonnegative balance and requires positive integral cost',()=>{
 const s=initialState();redeem(s,150,'咖啡');assert.equal(s.points,210);assert.throws(()=>redeem(s,300,'园艺'));assert.throws(()=>redeem(s,-50,'无效'));assert.equal(s.points,210);assert.equal(s.ledger[0].amount,-150);
});
test('request parser is an explicit local keyword categorizer',()=>{
 assert.equal(parseRequest('陪我去医院',{}).category,'medical');assert.equal(parseRequest('教我使用手机',{}).category,'digital');assert.equal(parseRequest('帮忙采购蔬菜',{}).category,'grocery');assert.equal(parseRequest('散步聊天',{}).category,'companion');
});
