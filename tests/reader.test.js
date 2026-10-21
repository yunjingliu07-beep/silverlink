import test from 'node:test';
import assert from 'node:assert/strict';
import {PageReader,chooseVoice,splitSpeech} from '../dist/reader.js';
const voices=[{name:'Cantonese',lang:'zh-HK'},{name:'English',lang:'en-GB'},{name:'Mandarin',lang:'zh-CN'},{name:'Malay',lang:'ms-MY'},{name:'Tamil',lang:'ta-IN'}];
function setup(list=voices){let cancelled=0;const spoken=[];const synth={getVoices:()=>list,speak:u=>spoken.push(u),cancel:()=>cancelled++};const reader=new PageReader({synth,Utterance:class{constructor(text){this.text=text;}}});return {reader,spoken,get cancelled(){return cancelled;}};}
test('voice selection matches Mandarin, English, Malay and Tamil without a wrong-language fallback',()=>{
 assert.equal(chooseVoice(voices,'zh').lang,'zh-CN');assert.equal(chooseVoice(voices,'en').lang,'en-GB');assert.equal(chooseVoice(voices,'ms').lang,'ms-MY');assert.equal(chooseVoice(voices,'ta').lang,'ta-IN');assert.equal(chooseVoice([voices[0]],'zh'),null);assert.equal(chooseVoice([voices[1]],'ta'),null);
});
test('long content splits into short utterances without dropping words or Chinese characters',()=>{
 for(const text of ['你好，欢迎来到银龄连线。'.repeat(80),'Welcome to the community. '.repeat(100),'வணக்கம். '.repeat(100)]){const chunks=splitSpeech(text);assert.ok(chunks.length>2);assert.ok(chunks.every(s=>Array.from(s).length<=140));assert.equal(chunks.join('').replace(/\s/g,''),text.replace(/\s/g,''));}
});
test('read, pause, resume and stop cancel stale callbacks and do not restart on cancellation',()=>{
 const {reader,spoken}=setup();reader.start([{text:'First'},{text:'Second'}],'en',.85);assert.equal(reader.state,'reading');assert.equal(spoken[0].rate,.85);reader.pause();spoken[0].onend();assert.equal(reader.index,0);assert.equal(reader.state,'paused');reader.resume();assert.equal(spoken[1].text,'First');spoken[1].onend();assert.equal(spoken[2].text,'Second');reader.stop();spoken[2].onend();assert.equal(reader.state,'idle');assert.equal(spoken.length,3);
});
test('changing page/language cannot let previous utterances continue',()=>{
 const {reader,spoken}=setup();reader.start([{text:'Old'},{text:'Stale'}],'en');const old=spoken[0];reader.start([{text:'你好'}],'zh');old.onerror({error:'interrupted'});old.onend();assert.equal(reader.state,'reading');assert.equal(spoken.length,2);assert.equal(spoken[1].lang,'zh-CN');spoken[1].onend();assert.equal(reader.state,'done');
});
test('rate change resumes current phrase at chosen speed, and errors permit retry',()=>{
 const {reader,spoken}=setup();reader.start([{text:'Hello'}],'en');reader.setRate(.7);assert.equal(spoken.at(-1).rate,.7);spoken.at(-1).onerror({error:'not-allowed'});assert.equal(reader.error,'blocked');reader.start([{text:'Hello'}],'en');assert.equal(reader.state,'reading');
});
test('missing voices and unsupported browsers give explicit states without speaking',()=>{
 const {reader,spoken}=setup([]);reader.start([{text:'Hello'}],'en');assert.equal(reader.error,'voice');assert.equal(spoken.length,0);const unsupported=new PageReader({synth:null,Utterance:null});unsupported.start([],'zh');assert.equal(unsupported.error,'unsupported');
});
