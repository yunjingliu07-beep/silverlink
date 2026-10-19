import { initialState, STATUS } from './domain.js';
import { tr, getLanguage } from './i18n.js';
import { localizedField } from './community.js';
const seedTasks = new Map(initialState().tasks.map(task => [task.id,task]));
// Localize known examples and supported user content without mutating the original.
export function seedText(task, field) {
  const original = seedTasks.get(task.id);
  return original && original[field] === task[field] ? tr(original[field]) : localizedField(task,field,getLanguage());
}
export function localizeReason(reason) {
  if (reason.startsWith('会说')) return tr('会说{language}', { language: tr(reason.slice(2)) });
  if (reason.startsWith('需要')) return tr('需要{language}', { language: tr(reason.slice(2)) });
  if (reason.endsWith(' km 内')) return tr('{distance} km 内', { distance: reason.slice(0,-5) });
  return tr(reason);
}
export const REWARDS = ['社区咖啡体验券','社区园艺工作坊'];
export function ledgerText(entry, tasks = []) {
  if (entry.id === 'seed') return tr('示例历史服务积分');
  if (entry.reward) return tr('模拟兑换：{reward}', {reward:tr(entry.reward)});
  if (entry.taskId) { const task=tasks.find(t=>t.id===entry.taskId); if(task) return seedText(task,'title'); }
  // Migrate display of historical system-generated redemption labels, without touching saved data.
  const prefix='演示兑换：';
  if (entry.text.startsWith(prefix) && REWARDS.includes(entry.text.slice(prefix.length))) return tr('模拟兑换：{reward}',{reward:tr(entry.text.slice(prefix.length))});
  return entry.text;
}
export function auditText(entry, tasks = []) {
  if (entry.type) {
    const task = tasks.find(t=>t.id===entry.taskId);
    const title = task ? seedText(task,'title') : '';
    const role={volunteer:'志愿者',elder:'老人',admin:'管理员'};
    if(entry.type==='service') return `${tr(STATUS[entry.status])} · ${title} · ${tr(role[entry.role])}`;
    const prefixes={published:'发布演示任务 ·',report:'收到演示反馈 ·',resolved:'反馈已处理 ·'};
    if(prefixes[entry.type]) return `${tr(prefixes[entry.type])} ${title}`;
  }
  const parts=entry.message.split(' · ');
  if(Object.values(STATUS).includes(parts[0])) parts[0]=tr(parts[0]);
  if(['发布演示任务','收到演示反馈','反馈已处理'].includes(parts[0])) parts[0]=tr(parts[0]+' ·').replace(/ ·$/,'');
  const roles={volunteer:'志愿者',elder:'老人',admin:'管理员'};
  if(parts.length===3 && roles[parts[2]]) parts[2]=tr(roles[parts[2]]);
  return parts.join(' · ');
}
