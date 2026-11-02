import { getLanguage } from './i18n.js';
const labels={
 volunteer:['个人志愿者','Individual volunteer','Sukarelawan individu','தனிநபர் தொண்டர்'],
 ngo:['公益组织','Nonprofit organisation','Organisasi bukan untung','இலாப நோக்கற்ற அமைப்பு'],
 senior:['长者','Senior','Warga emas','முதியவர்'],
 care:['养老院／医院','Care home / hospital','Rumah jagaan / hospital','பராமரிப்பு இல்லம் / மருத்துவமனை'],
 switch:['切换视角','Switch view','Tukar paparan','பார்வையை மாற்று'],
 more:['更多','More','Lagi','மேலும்'],
 extras:['社区故事与使用指南','Community stories & guidance','Kisah komuniti & panduan','சமூகக் கதைகள் மற்றும் வழிகாட்டல்'],
 progress:['我的贡献与服务记录','My contribution & service records','Sumbangan & rekod perkhidmatan saya','எனது பங்களிப்பு மற்றும் சேவைப் பதிவுகள்'],
 accept:['接受请求','Accept request','Terima permintaan','கோரிக்கையை ஏற்கவும்'],
 requests:['我的请求','My requests','Permintaan saya','எனது கோரிக்கைகள்'],
 help:['今天需要什么帮助？','How can we help today?','Bagaimana kami boleh membantu hari ini?','இன்று நாங்கள் எவ்வாறு உதவலாம்?'],
};
export function ui(key){return labels[key]?.[['zh','en','ms','ta'].indexOf(getLanguage())]||labels[key]?.[1]||key;}
