import { CATALOGUES, translate, LANGUAGES } from './i18n.js';
import { EN } from './i18n-en.js';
const phrases = {
 '林悦':'Lin Yue','陈阿姨':'Auntie Chen','李大爷':'Uncle Li','王奶奶':'Grandma Wang',
 '散步、摄影、园艺':'Walking, photography, gardening','园艺、散步、烹饪':'Gardening, walking, cooking',
 '习惯上午出门，喜欢慢步行走':'Prefers morning outings and a gentle walking pace','陪诊、手机教学':'Clinic accompaniment, smartphone lessons',
 '散步':'Walking','摄影':'Photography','园艺':'Gardening','烹饪':'Cooking','阅读':'Reading','唱歌':'Singing','下棋':'Chess','听音乐':'Listening to music','书法':'Calligraphy','游泳':'Swimming',
 '陪诊':'Clinic accompaniment','手机教学':'Smartphone lessons','轮椅协助':'Wheelchair assistance','步行较慢':'Walks slowly','上午出门':'Morning outings','喜欢聊天':'Enjoys conversation',
 '希望有人陪我去复诊，协助看路和挂号。':'I would like company for a clinic visit and help with directions and registration.',
 '希望有人教我用手机打视频电话。':'I would like help learning to make video calls on my phone.',
 '希望有人陪我到附近巴刹买菜，帮忙提轻便购物袋。':'I would like company for grocery shopping and help carrying light bags.',
 '希望有人陪我散步、聊天，一起度过轻松的时光。':'I would enjoy a gentle walk and a friendly conversation.',
 '陪我看病':'Accompany me to a clinic','教我打视频电话':'Teach me to make video calls','需要轮椅协助':'Needs wheelchair assistance',
};
const dictionary = {...EN,...phrases};
export function autoText(value, target) {
 const text=String(value??''); if(!text)return text;
 const dictionaries={en:{...CATALOGUES.en,...phrases},ms:CATALOGUES.ms,ta:CATALOGUES.ta};
 const source=Object.entries(dictionaries).flatMap(([,dict])=>Object.entries(dict)).reverse().find(([,v])=>v.toLowerCase()===text.toLowerCase())?.[0]||text;
 const direct=target==='zh'?source:(dictionaries[target]?.[source]??(target==='en'?dictionary[source]:undefined));
 if(direct && direct!==text)return direct;
 const bits=text.split(/[、,，]/).map(x=>x.trim());
 if(bits.length>1){const converted=bits.map(bit=>autoText(bit,target));if(converted.some((v,i)=>v!==bits[i]))return converted.join(target==='zh'?'、':', ');}
 return text;
}
export function localizedField(record,key,lang) { return record?.translations?.[key]?.[lang] || autoText(record?.[key],lang); }
export function saveLocalized(record,key,value,lang) {
 const text=String(value??'').trim();
 record.translations??={};record.translations[key]??={};
 const old=localizedField(record,key,lang);
 if(text!==old){record.translations[key]={};record[key]=text;}
 record.translations[key][lang]=text;
 for(const other of Object.keys(LANGUAGES)){if(other===lang)continue;const converted=autoText(text,other);if(converted!==text)record.translations[key][other]=converted;}
}
export function historyRecords(state) {
 const seed=Array.from({length:18},(_,i)=>({id:`HIST-${String(i+1).padStart(3,'0')}`,category:['medical','digital','grocery','companion'][i%4],date:`2026-09-${String(i+1).padStart(2,'0')}`,elder:i%2?'王奶奶':'李大爷',hours:2,points:20,rating:i===17?3:i<15?5:4,status:'verified',sample:true}));
 return [...state.tasks.filter(t=>t.status==='verified').map(t=>({...t,hours:t.actualHours,points:Math.round(t.actualHours*10),rating:t.elderReview?.stars??null})),...seed].sort((a,b)=>b.date.localeCompare(a.date));
}
export const stories=[
 {id:'story-1',date:'2026-09-01',category:'medical',name:'李大爷',enName:'Uncle Li',zh:'李大爷成功找到志愿者陪他看病',en:'Uncle Li found a volunteer to accompany him to his clinic visit',area:'Toa Payoh',x:46,y:35},
 {id:'story-2',date:'2026-09-03',category:'digital',name:'王奶奶',enName:'Grandma Wang',zh:'王奶奶成功找到志愿者教她打视频',en:'Grandma Wang learned to make video calls with a volunteer',area:'Bishan',x:62,y:19},
 {id:'story-3',date:'2026-09-08',category:'grocery',name:'黄阿姨',enName:'Auntie Huang',zh:'黄阿姨在志愿者陪伴下完成了日常采购',en:'Auntie Huang completed her grocery shopping with a volunteer',area:'Ang Mo Kio',x:76,y:31},
 {id:'story-4',date:'2026-09-12',category:'companion',name:'林伯伯',enName:'Uncle Lim',zh:'林伯伯和志愿者度过了愉快的公园时光',en:'Uncle Lim enjoyed a lovely park visit with a volunteer',area:'Novena',x:30,y:69}
];
export const isRecipient=role=>['elder','institution'].includes(role);
export function visibleTasks(state){return isRecipient(state.role)?state.tasks.filter(t=>state.role==='institution'?t.ownerRole==='institution':t.ownerRole!=='institution'):state.tasks;}
export function batchTasks(rows, common, idFactory) {
 if(!rows.length||rows.length>30)throw new Error('请填写 1 至 30 位老人资料。');
 return rows.map((r,i)=>{
  if(!r.name?.trim()||!r.description?.trim()||!r.category||!Number.isInteger(Number(r.age))||Number(r.age)<55||Number(r.age)>120)throw new Error('请完整填写每位老人的称呼、年龄和服务需求。');
  return {...common,id:idFactory(),title:r.description.trim().slice(0,60),description:r.description.trim(),elder:r.name.trim(),age:Number(r.age),language:r.language,category:r.category,note:r.note?.trim()||'',ownerRole:'institution',status:'open',initials:r.name.slice(0,1),x:42+i%5*3,y:35+Math.floor(i/5)*3,distance:.9,flexible:false};
 });
}
