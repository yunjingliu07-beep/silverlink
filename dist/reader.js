// Browser speech adapter. No microphone, recording, or automatic playback.
export const SPEECH_LOCALES={zh:'zh-CN',en:'en-SG',ms:'ms-SG',ta:'ta-SG'};
export function chooseVoice(voices,language){
 const preferred={zh:['zh-CN','zh-SG','zh-Hans','zh-TW'],en:['en-SG','en-GB','en-US'],ms:['ms-SG','ms-MY'],ta:['ta-SG','ta-IN','ta-LK']}[language]||[];
 const norm=value=>value.toLowerCase().replaceAll('_','-');
 for(const locale of preferred){const found=voices.find(v=>norm(v.lang)===norm(locale));if(found)return found;}
 return voices.find(v=>norm(v.lang).split('-')[0]===language && !(language==='zh'&&/hk|mo|yue|canton/i.test(v.lang+' '+v.name)))||null;
}
export function splitSpeech(text,max=140){
 const result=[];
 for(const sentence of String(text).replace(/\s+/g,' ').trim().match(/[^。！？.!?;；]+[。！？.!?;；]*|[。！？.!?;；]+/gu)||[]){
  let chars=Array.from(sentence.trim());
  while(chars.length>max){let cut=chars.slice(0,max+1).lastIndexOf(' ');if(cut<max/2)cut=max;result.push(chars.slice(0,cut).join('').trim());chars=chars.slice(cut);}
  if(chars.join('').trim())result.push(chars.join('').trim());
 }
 return result;
}
export function collectReadable(root){
 if(!root)return [];
 const document=root.ownerDocument,win=document.defaultView,items=[];
 const walker=document.createTreeWalker(root,win.NodeFilter.SHOW_TEXT,{acceptNode(node){
  const parent=node.parentElement;
  if(!node.textContent.trim()||parent.closest('[data-reader], [data-no-read], [aria-hidden="true"], [hidden], script, style, svg, input, textarea, select, .sr-only, #modal-error'))return win.NodeFilter.FILTER_REJECT;
  if(!parent.getClientRects().length||win.getComputedStyle(parent).visibility==='hidden')return win.NodeFilter.FILTER_REJECT;
  return win.NodeFilter.FILTER_ACCEPT;
 }});
 let node;
 while((node=walker.nextNode())){
  const element=node.parentElement.closest('h1,h2,h3,h4,p,li,label,button,a,summary,figcaption,dt,dd,.notice,.detail-copy')||node.parentElement;
  const previous=items.at(-1);
  if(previous?.element===element)previous.text+=' '+node.textContent.trim();else items.push({element,text:node.textContent.trim()});
 }
 return items.flatMap(item=>splitSpeech(item.text).map(text=>({...item,text})));
}
export class PageReader{
 constructor({synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onChange=()=>{}}={}){
  this.synth=synth;this.Utterance=Utterance;this.onChange=onChange;this.state='idle';this.error='';this.index=0;this.items=[];this.generation=0;this.current=null;
  this.synth?.getVoices(); // Warm up asynchronously loaded device voices before the first click.
 }
 get supported(){return !!(this.synth&&this.Utterance);}
 notify(){this.onChange(this);}
 clearHighlight(){this.items.forEach(item=>item.element?.classList.remove('read-aloud-active'));}
 stop(){this.generation++;this.synth?.cancel();this.current=null;this.clearHighlight();this.items=[];this.index=0;this.state='idle';this.error='';this.notify();}
 start(items,language,rate=.85){
  this.stop();
  if(!this.supported)return this.fail('unsupported');
  this.voice=chooseVoice(this.synth.getVoices(),language);
  if(!this.voice)return this.fail('voice');
  if(!items.length)return this.fail('empty');
  this.items=items;this.language=language;this.rate=rate;this.state='reading';this.speak(this.generation);
 }
 fail(error){this.state='error';this.error=error;this.clearHighlight();this.current=null;this.notify();}
 speak(generation){
  if(generation!==this.generation||this.state!=='reading')return;
  if(this.index>=this.items.length){this.clearHighlight();this.state='done';this.current=null;this.notify();return;}
  const item=this.items[this.index],utterance=new this.Utterance(item.text);
  this.clearHighlight();item.element?.classList.add('read-aloud-active');
  utterance.voice=this.voice;utterance.lang=this.voice.lang||SPEECH_LOCALES[this.language];utterance.rate=this.rate;utterance.volume=1;this.current=utterance;
  utterance.onend=()=>{if(generation!==this.generation)return;this.index++;this.speak(generation);};
  utterance.onerror=event=>{if(generation!==this.generation)return;this.fail(event.error==='not-allowed'?'blocked':'failed');};
  this.notify();this.synth.speak(utterance);
 }
 // Cancel at a short phrase boundary: native pause/resume is unreliable on mobile.
 pause(){if(this.state!=='reading')return;this.generation++;this.synth.cancel();this.current=null;this.state='paused';this.notify();}
 resume(){if(this.state!=='paused')return;this.state='reading';this.speak(this.generation);}
 setRate(rate){if(![.7,.85,1].includes(rate))return;this.rate=rate;if(this.state==='reading'){this.pause();this.resume();}}
}
