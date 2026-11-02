export const SCHEMA = 1;
export const STORAGE_KEY = 'jujian-journal-v1';
export const CATEGORIES = ['日常與關係', '自我與成長', '社會與觀察', '古語新讀', '其他'];
export const REFLECTIONS = [
  ['position', '我的立場', '如果只留一句，我最想說的是什麼？'],
  ['reason', '我的理由', '什麼經驗、觀察或證據，讓我這樣想？'],
  ['assumption', '隱藏的假設', '這個理由成立之前，我先相信了什麼？'],
  ['counterexample', '另一種可能', '在哪種情況下，我的說法可能不成立？'],
  ['value', '在意的價值', '這個想法背後，我最想保護的是什麼？'],
  ['revision', '再想一步', '考慮另一面後，我會怎樣修正原本的說法？']
];
export const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const countWords = text => (String(text).match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[\p{L}\p{N}]+/gu) || []).length;
export const emptyState = () => ({schema:SCHEMA, entries:[], topics:[], favorites:[], settings:{fontSize:19, pageWidth:720, lineHeight:1.95, font:'serif', motion:true, goal:200}, updatedAt:new Date().toISOString()});
export function newEntry(topic = null) {
  const now = new Date().toISOString();
  return {id:id(), date:dayKey(), createdAt:now, updatedAt:now, title:'', body:'', topicId:topic?.id||null, topicTitle:topic?.title||'', topicText:topic?.text||'', category:topic?.category||'其他', status:'draft', reflection:{}};
}
export const entryTitle = e => e.title.trim() || e.topicTitle || '無題小記';
const cleanHeading = text => String(text).replace(/[\r\n]+/g, ' ').trim();
export function exportEntry(e, withReflection=true, markdown=true) {
  const heading = markdown ? '# ' : '';
  const parts = [`${heading}${cleanHeading(entryTitle(e))}`, e.date];
  if(e.topicTitle) parts.push(`${markdown?'## ':''}起筆的題目`, e.topicTitle);
  if(e.topicText && e.topicText !== e.topicTitle) parts.push(e.topicText);
  parts.push(`${markdown?'## ':''}正文`, e.body.trim());
  if(withReflection) {
    const values = REFLECTIONS.filter(([key])=>e.reflection?.[key]?.trim());
    if(values.length) {
      parts.push(`${markdown?'## ':''}思考拆解`);
      for(const [key,label] of values) parts.push(`${markdown?'### ':''}${label}`, e.reflection[key].trim());
    }
  }
  return parts.join('\n\n')+'\n';
}
export function weekDays(entries, now=new Date()) {
  const written = new Set(entries.filter(e=>e.status==='finished'&&e.body.trim()).map(e=>e.date));
  return Array.from({length:7},(_,i)=>{ const d = new Date(now.getFullYear(),now.getMonth(),now.getDate()-6+i,12); return {date:dayKey(d),day:d.getDate(),done:written.has(dayKey(d)),today:i===6}; });
}
export function validateBackup(raw) {
  if(!raw || raw.schema !== SCHEMA || !Array.isArray(raw.entries) || !Array.isArray(raw.topics) || !Array.isArray(raw.favorites)) throw new Error('這不是句間 V1 的有效備份檔。');
  if(raw.entries.length>20000 || raw.topics.length>10000) throw new Error('備份內容過大，請分開匯入。');
  const maxString = (s,max) => typeof s==='string' && s.length<=max;
  for(const e of raw.entries) {
    if(!e || !maxString(e.id,200)||!e.id || !maxString(e.title,500) || !maxString(e.body,2000000) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !['draft','finished'].includes(e.status) || !maxString(e.createdAt,100) || !maxString(e.updatedAt,100) || !Number.isFinite(Date.parse(e.updatedAt))) throw new Error('備份內的文章格式不完整，尚未匯入。');
    if(e.topicTitle!==undefined && !maxString(e.topicTitle,500)) throw new Error('文章的議題名稱格式不正確。');
    if(e.topicText!==undefined && !maxString(e.topicText,10000)) throw new Error('文章的議題描述格式不正確。');
    if(e.topicId!==undefined && e.topicId!==null && !maxString(e.topicId,200)) throw new Error('文章的議題編號格式不正確。');
    if(e.category!==undefined && !maxString(e.category,100)) throw new Error('文章分類格式不正確。');
    if(e.reflection!==undefined && (!e.reflection || typeof e.reflection!=='object' || Array.isArray(e.reflection))) throw new Error('思考拆解的格式不正確。');
    for(const [key] of REFLECTIONS) if(e.reflection?.[key]!==undefined&&!maxString(e.reflection[key],200000)) throw new Error('思考拆解的內容格式不正確。');
  }
  for(const t of raw.topics) if(!t || !maxString(t.id,200) || !t.id || !maxString(t.title,180)||!t.title.trim() || !maxString(t.text||'',1000) || !maxString(t.category,100) || !['issue','proverb'].includes(t.kind)) throw new Error('備份內的議題格式不完整，尚未匯入。');
  if(raw.favorites.some(f=>!maxString(f,200))) throw new Error('收藏的格式不正確。');
  if(new Set(raw.entries.map(e=>e.id)).size!==raw.entries.length || new Set(raw.topics.map(t=>t.id)).size!==raw.topics.length) throw new Error('備份內有重複編號，尚未匯入。');
  const settings = {...emptyState().settings,...raw.settings};
  settings.fontSize = Math.min(28,Math.max(15,Number(settings.fontSize)||19));
  settings.pageWidth = Math.min(960,Math.max(520,Number(settings.pageWidth)||720));
  settings.lineHeight = Math.min(2.6,Math.max(1.5,Number(settings.lineHeight)||1.95));
  settings.goal = Math.min(3000,Math.max(50,Number(settings.goal)||200));
  settings.font = settings.font==='sans'?'sans':'serif';
  settings.motion = settings.motion!==false;
  return {schema:SCHEMA,entries:raw.entries.map(e=>({...e,topicTitle:e.topicTitle||'',topicText:e.topicText||'',reflection:e.reflection||{}})),topics:raw.topics,favorites:raw.favorites,settings,updatedAt:new Date().toISOString()};
}
export function mergeBackup(current,incoming) {
  const safe = validateBackup(incoming);
  const entries = new Map(current.entries.map(e=>[e.id,e]));
  for(const e of safe.entries) {
    const old=entries.get(e.id);
    if(!old || new Date(e.updatedAt)>new Date(old.updatedAt)) entries.set(e.id,e);
  }
  const topics=new Map(current.topics.map(t=>[t.id,t]));
  for(const t of safe.topics) if(!topics.has(t.id)) topics.set(t.id,t);
  return {...current,entries:[...entries.values()],topics:[...topics.values()],favorites:[...new Set([...current.favorites,...safe.favorites])],updatedAt:new Date().toISOString()};
}
