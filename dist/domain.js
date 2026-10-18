export const CATEGORIES = {
  medical: { label: '陪同就医', icon: 'medical', color: 'rose' },
  grocery: { label: '日常采购', icon: 'bag', color: 'orange' },
  digital: { label: '数码协助', icon: 'phone', color: 'blue' },
  companion: { label: '陪伴交流', icon: 'heart', color: 'green' },
};
export const STATUS = { open: '等待接单', applied: '等待老人确认', reserved: '已预约', active: '服务进行中', confirming: '等待双方确认', completed: '待平台核实', verified: '已核实完成', cancelled: '已取消' };
export const DEMO_DATE = '2026-10-19';
export function uid(prefix = 'SL') { return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`; }
export function initialState() {
  return {
    version: 1, role: 'volunteer', points: 360,
    profile: { name: '林悦', languages: ['华语', '英语'], skills: ['陪同就医', '数码协助', '陪伴交流'], area: 'Toa Payoh', available: ['09:00', '10:00', '14:00'], interests: '散步、摄影、园艺', contactName: '', contactPhone: '' },
    elder: { name: '陈阿姨', languages: ['华语', '福建话'], interests: '园艺、散步、烹饪', habits: '习惯上午出门，喜欢慢步行走', needs: '陪诊、手机教学', area: 'Toa Payoh' },
    tasks: [
      { id: 'SL-1001', title: '一起去复诊，路上有个伴', category: 'medical', elder: '陈阿姨', age: 72, language: '华语', area: 'Toa Payoh', date: DEMO_DATE, time: '09:00', hours: 2, distance: 0.8, x: 46, y: 35, description: '陪我从大巴窑社区中心附近出发，前往综合诊疗所复诊。希望你能协助看路和使用自助挂号机。无需提供任何医疗护理。', note: '步行较慢，请预留充足时间。具体集合点在预约确认后展示。', status: 'open', initials: '陈', flexible: false },
      { id: 'SL-1002', title: '教我和孙女打视频电话', category: 'digital', elder: '黄伯伯', age: 76, language: '华语', area: 'Bishan', date: DEMO_DATE, time: '14:00', hours: 1.5, distance: 2.1, x: 62, y: 19, description: '想学会在手机上用 WhatsApp 打视频电话，以及如何辨认可疑链接。请在社区活动室耐心教我。', note: '请勿索取或操作银行密码。', status: 'open', initials: '黄', flexible: true },
      { id: 'SL-1003', title: '到湿巴刹买一点新鲜食材', category: 'grocery', elder: '李阿姨', age: 69, language: '英语', area: 'Ang Mo Kio', date: '2026-10-20', time: '10:00', hours: 1.5, distance: 3.4, x: 76, y: 31, description: '陪我到附近巴刹采购蔬菜和水果，帮忙拿轻便购物袋。采购费用由我自行支付。', note: '购物总重量不超过 5kg。', status: 'open', initials: '李', flexible: true },
      { id: 'SL-1004', title: '公园散散步，聊聊从前', category: 'companion', elder: '王伯伯', age: 74, language: '华语', area: 'Toa Payoh', date: '2026-10-20', time: '10:00', hours: 2, distance: 1.2, x: 39, y: 51, description: '喜欢园艺和老歌，希望有人陪我到大巴窑市镇公园走走，坐下来聊一会儿。', note: '雨天可改为社区中心室内活动。', status: 'open', initials: '王', flexible: true },
      { id: 'SL-1005', title: '一起整理手机里的老照片', category: 'digital', elder: '许阿姨', age: 71, language: '英语', area: 'Novena', date: '2026-10-21', time: '14:00', hours: 2, distance: 2.8, x: 30, y: 69, description: '帮我学习给照片分类、建立相册和备份家庭照片。由我自己操作手机，请你在旁指导。', note: '在社区公共空间进行。', status: 'open', initials: '许', flexible: true },
      { id: 'SL-1006', title: '社区花园的一个悠闲下午', category: 'companion', elder: '吴伯伯', age: 78, language: '马来语', area: 'Kallang', date: '2026-10-21', time: '14:00', hours: 1, distance: 4.2, x: 76, y: 74, description: '希望有一位会说马来语的志愿者，陪我到社区花园散步和浇花。', note: '请穿舒适的鞋子。', status: 'open', initials: '吴', flexible: false },
    ],
    ledger: [{ id: 'seed', text: '示例历史服务积分', amount: 360, date: '2026-10-17' }],
    reports: [], audit: [], certificates: [], seed: { hours: 36, sessions: 18, positives: 17, ratingSum: 86, ratingCount: 18 },
  };
}
export function eligible(task, profile) {
  return profile.languages.includes(task.language) && profile.skills.includes(CATEGORIES[task.category]?.label) && (task.flexible || profile.available.includes(task.time));
}
export function match(task, profile) {
  const language = profile.languages.includes(task.language), skill = profile.skills.includes(CATEGORIES[task.category]?.label), time = task.flexible || profile.available.includes(task.time);
  const score = Math.round((language ? 35 : 0) + (skill ? 30 : 0) + (time ? 20 : 0) + Math.max(0, 15 - task.distance * 2));
  return { score, eligible: eligible(task, profile), reasons: [language ? `会说${task.language}` : `需要${task.language}`, skill ? '技能相符' : '需补充相关技能', time ? '时间合适' : '时段不符', `${task.distance} km 内`] };
}
export function stats(state) {
  const verified = state.tasks.filter(t => t.status === 'verified');
  const reviews = verified.filter(t => t.elderReview);
  const ratingCount = state.seed.ratingCount + reviews.length;
  return { hours: state.seed.hours + verified.reduce((a,t) => a + t.actualHours, 0), sessions: state.seed.sessions + verified.length, positives: state.seed.positives + reviews.filter(t => t.elderReview.stars >= 4).length, rating: (state.seed.ratingSum + reviews.reduce((a,t) => a + t.elderReview.stars,0)) / ratingCount };
}
export function audit(state, message) { state.audit.unshift({ id: uid('event'), message, date: new Date().toISOString() }); }
export function transition(state, id, action, payload = {}) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) throw new Error('找不到这个任务。');
  const role = state.role;
  if (action === 'apply' && role === 'volunteer' && t.status === 'open') {
    if (!eligible(t, state.profile)) throw new Error('语言、技能或可服务时间不符，请先更新个人资料。');
    const minutes = time => { const [h,m] = time.split(':').map(Number); return h * 60 + m; };
    const conflict = state.tasks.some(other => other.id !== id && ['applied','reserved','active','confirming'].includes(other.status) && other.date === t.date && minutes(other.time) < minutes(t.time) + t.hours * 60 && minutes(t.time) < minutes(other.time) + other.hours * 60);
    if (conflict) throw new Error('与已申请的服务时间重叠，请选择其他时段。');
    t.status = 'applied';
  } else if (action === 'accept' && role === 'elder' && t.status === 'applied') { t.status = 'reserved'; t.code = String(Math.floor(100000 + Math.random() * 900000)); }
  else if (action === 'start' && role === 'volunteer' && t.status === 'reserved') {
    if (payload.code !== t.code) throw new Error('签到码不正确，请与老人核对。');
    t.status = 'active'; t.startedAt = new Date().toISOString();
  } else if (action === 'finish' && role === 'volunteer' && t.status === 'active') {
    const h = Number(payload.hours);
    if (!Number.isFinite(h) || h <= 0 || h > 12) throw new Error('请填写 0.1 至 12 小时的服务时长。');
    t.actualHours = Math.round(h * 10) / 10; t.status = 'confirming'; t.volunteerConfirmed = true;
  } else if (action === 'confirm' && role === 'elder' && t.status === 'confirming') { t.elderConfirmed = true; t.status = 'completed'; }
  else if (action === 'verify' && role === 'admin' && t.status === 'completed') {
    if (state.reports.some(r => r.taskId === t.id && !r.closed)) throw new Error('此任务有尚未处理的反馈，请先处理后再核实。');
    t.status = 'verified'; const points = Math.round(t.actualHours * 10); state.points += points;
    state.ledger.unshift({ id: uid('points'), text: t.title, amount: points, date: new Date().toISOString().slice(0,10) });
  } else if (action === 'cancel' && ['volunteer','elder'].includes(role) && ['applied','reserved'].includes(t.status)) { t.status = 'open'; delete t.code; }
  else if (action === 'review' && ['volunteer','elder'].includes(role) && ['completed','verified'].includes(t.status)) {
    const key = role === 'elder' ? 'elderReview' : 'volunteerReview';
    if (t[key]) throw new Error('你已经提交过评价。');
    const stars = Number(payload.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error('请选择 1 至 5 星。');
    t[key] = { stars, text: String(payload.text || '').trim().slice(0,500), date: new Date().toISOString() };
  } else throw new Error('当前角色或任务状态不允许此操作。');
  audit(state, `${STATUS[t.status]} · ${t.title} · ${role}`); return t;
}
export function parseRequest(text, fields) {
  let category = 'companion';
  if (/医|诊|hospital|clinic/i.test(text)) category = 'medical';
  else if (/手机|视频|照片|数码|phone|whatsapp/i.test(text)) category = 'digital';
  else if (/买|采购|菜|巴刹|grocery|market/i.test(text)) category = 'grocery';
  return { title: String(text).trim().slice(0,26), description: String(text).trim(), category, ...fields };
}
export function certificateEligibility(state, kind) {
  const s = stats(state); return kind === 'service' ? s.hours >= 40 : s.positives >= 100 && s.rating >= 4.5;
}
export function redeem(state, cost, title) {
  if (!Number.isInteger(cost) || cost <= 0 || state.points < cost) throw new Error('积分不足，继续完成服务即可累积。');
  state.points -= cost; state.ledger.unshift({ id: uid('redeem'), text: `演示兑换：${title}`, amount: -cost, date: new Date().toISOString().slice(0,10) });
}
