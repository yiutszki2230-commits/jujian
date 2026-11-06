import {SCHEMA,STORAGE_KEY,CATEGORIES,REFLECTIONS,id,dayKey,countWords,emptyState,newEntry,entryTitle,exportEntry,weekDays,validateBackup,mergeBackup} from './core.js';
import {SEED_TOPICS} from './seeds.js';
import {VIEW_KEY,normalizePosition,normalizeView} from './view-state.js';

const $ = s => document.querySelector(s);
const h = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
 pen:'M4 20l4.5-1 12-12a2.1 2.1 0 0 0-3-3l-12 12L4 20zm11-14 3 3M4 20l3-3',
 library:'M3 4h4v16H3zM10 4h4v16h-4zM16.5 5l3.8-1 4 15-3.8 1z',
 book:'M3 4.5C6 3.8 9 4 12 6c3-2 6-2.2 9-1.5v15c-3-.7-6-.5-9 1.5-3-2-6-2.2-9-1.5zM12 6v15',
 settings:'M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1M13 3v6M7 9v6m8 0v6',
 plus:'M12 5v14M5 12h14', close:'M6 6l12 12M6 18 18 6', arrow:'M5 12h14m-5-5 5 5-5 5',
 chevron:'m9 5 7 7-7 7', down:'m6 9 6 6 6-6', up:'m6 15 6-6 6 6',
 refresh:'M20 7v5h-5M4 17v-5h5M5.2 7a7.8 7.8 0 0 1 12.9-2L20 8M4 16l1.9 3A7.8 7.8 0 0 0 19 17',
 spark:'m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z',
 calendar:'M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1zm-1 5h16M8 3v4m8-4v4M8 14h1m3 0h1m3 0h1m-9 3h1m3 0h1',
 check:'m5 12 4 4L19 6', star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
 search:'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 share:'M12 15V3m-4 4 4-4 4 4M5 11v9h14v-9', download:'M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5',
 copy:'M8 8h12v13H8zM16 5V2H3v15h2', focus:'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5',
 trash:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
 edit:'m4 16 12-12 4 4L8 20H4zM13 7l4 4', info:'M12 10v7M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 leaf:'M19 3c1 10-1 16-8 16a7 7 0 0 1-7-7C4 5 11 4 19 3zM4 21 16 8',
 upload:'M12 16V4m-4 4 4-4 4 4M4 16v5h16v-5', back:'M19 12H5m5-5-5 5 5 5',
 note:'M5 3h14v18H5zM8 7h8m-8 4h8m-8 4h5', question:'M9 8a3 3 0 1 1 4 3c-1 .5-1 1-1 3m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'
};
const icon = name => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[name]||paths.pen}"/></svg>`;
let state=emptyState(),storageError='',recoveryRaw=null;
try { const raw=localStorage.getItem(STORAGE_KEY); if(raw) state=validateBackup(JSON.parse(raw)); }
catch(err) { storageError='未能讀取已儲存的資料。請先下載原始資料，避免覆蓋。'; try{recoveryRaw=localStorage.getItem(STORAGE_KEY);}catch{} }
let route=['writer','library','archive','settings'].includes(location.hash.slice(1))?location.hash.slice(1):'writer';
let view=normalizeView();try{view=normalizeView(JSON.parse(localStorage.getItem(VIEW_KEY)||'{}'));}catch{}
let activeId=view.activeId, libraryCategory='全部',libraryFilter='all',librarySearch='',archiveFilter='all',archiveSearch='',reflectionOpen=false,focusMode=false,toastTimer=null,exportId=null,pendingImport=null;
let writeFailed=false,exportURLs=[],writerCache=null,lastEditor='entry-body',panelOpen=false,panelMode='library',panelSearch='',panelCategory='全部',panelFilter='all',panelChoice='same',panelReturn=null,panelCloseTimer=null,viewTimer=null,lastAdded=null,composing=false;
let focusReturnY=0;
const allTopics=()=>[...SEED_TOPICS,...state.topics];
const currentEntry=()=>state.entries.find(e=>e.id===activeId);
const hasContent=e=>!!(e?.body.trim()||e?.title.trim()||REFLECTIONS.some(([key])=>e?.reflection?.[key]?.trim()));
const visibleEntries=()=>state.entries.filter(hasContent);
const finishedEntries=()=>state.entries.filter(e=>e.status==='finished'&&e.body.trim());
const topicById=topicId=>allTopics().find(t=>t.id===topicId);
function topicForEntry(entry) {
  const original=topicById(entry.topicId);
  if(entry.topicTitle) return {...original,id:entry.topicId,title:entry.topicTitle,text:entry.topicText,category:entry.category};
  return null;
}
function ensureEntry() {
  if(currentEntry()) return;
  const today=state.entries.filter(e=>e.date===dayKey()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  if(today.length) activeId=(today.find(e=>e.status==='draft')||today[0]).id;
  else {const entry=newEntry(SEED_TOPICS[(Math.floor((Date.now()-new Date(2026,10,2).getTime())/86400000)%SEED_TOPICS.length+SEED_TOPICS.length)%SEED_TOPICS.length]);state.entries.push(entry);activeId=entry.id;}
}
ensureEntry();
function persist(quiet=false) {
  if(recoveryRaw!==null) {if(!quiet)toast('原始資料還未處理，請先下載並到設定重新開始。');return false;}
  state.updatedAt=new Date().toISOString();
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageError='';writeFailed=false;updateSaveLabel('已自動儲存');return true;}
  catch(err) {storageError='暫時無法儲存：瀏覽器空間可能已滿或儲存被限制。請立即下載完整備份。';writeFailed=true;updateSaveLabel('儲存失敗 · 請備份',true);if(!quiet)toast(storageError,6500);updateErrorBanner();return false;}
}
function touchEntry(){const entry=currentEntry();if(entry)entry.updatedAt=new Date().toISOString();return entry;}
function updateSaveLabel(text,error=false){const el=$('#save-label');if(el){el.textContent=text;el.classList.toggle('error',error);}}
function toast(message,duration=3100){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),duration);}
function applySettings(){const s=state.settings,r=document.documentElement.style;r.setProperty('--writing-size',`${s.fontSize}px`);r.setProperty('--writing-width',`${s.pageWidth}px`);r.setProperty('--writing-line',s.lineHeight);r.setProperty('--writing-font',s.font==='sans'?'var(--sans)':'var(--serif)');document.body.classList.toggle('no-motion',!s.motion);document.body.classList.toggle('focus-mode',focusMode&&route==='writer');}
const dateLabel = date => new Intl.DateTimeFormat('zh-HK',{month:'long',day:'numeric',weekday:'long'}).format(date);
const footer=()=>`<footer class="page-footer"><span>在句與句之間，慢慢認識自己。</span><span>JUJIAN · A LITTLE EVERY DAY</span></footer>`;
function render() {
  const oldView=$('.view-enter');if(oldView?.dataset.writerId){rememberWriter();writerCache={id:oldView.dataset.writerId,node:oldView};}
  applySettings();ensureEntry();
  const titles={writer:'每日書寫',library:'議題圖書館',archive:'我的文集',settings:'閱讀與設定'};
  $('#app').innerHTML=`<div class="shell"><aside class="sidebar" aria-label="主要選單"><button class="brand" data-route="writer" aria-label="句間首頁"><span class="brand-mark">句</span><span class="brand-name">句間<small>JUJIAN · WRITING ROOM</small></span></button><nav class="nav">${[['writer','pen','每日書寫','01'],['library','library','議題圖書館','02'],['archive','book','我的文集','03']].map(([r,i,label,num])=>`<button class="nav-button ${route===r?'active':''}" ${route===r?'aria-current="page"':''} data-route="${r}">${icon(i)}<span>${label}</span><span class="nav-number">${num}</span></button>`).join('')}</nav><div class="side-note"><svg class="branch" viewBox="0 0 62 74" aria-hidden="true"><path d="M19 70c1-26 12-40 22-61M26 45C8 43 7 28 8 23c13 1 20 7 18 22zm6-13C30 17 39 7 47 4c4 12-1 23-15 28zm-10 24C8 58 3 48 2 41c12-2 19 4 20 15zm13-21c9-9 20-6 25-2-7 10-17 11-25 2z"/></svg><p>不必寫得漂亮。<br>先寫得像自己。</p></div><div class="sidebar-bottom"><button class="nav-button ${route==='settings'?'active':''}" ${route==='settings'?'aria-current="page"':''} data-route="settings">${icon('settings')}<span>閱讀與設定</span></button><p class="version">一日一篇 · 慢慢來就好</p></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumbs"><span>句間</span><span>/</span><span class="current">${titles[route]}</span></div><div class="top-actions"><button class="quick-trigger" data-action="quick-idea" aria-label="記下念頭">${icon('plus')}<span>記下念頭</span></button><span class="date-mini">${h(dateLabel(new Date()))}</span><button class="circle-button" data-action="help" aria-label="使用說明">${icon('question')}</button></div></header><main class="main" id="main" tabindex="-1"><div id="storage-banner">${errorHTML()}</div><div class="view-enter">${route==='writer'?renderWriter():route==='library'?renderLibrary():route==='archive'?renderArchive():renderSettings()}</div>${footer()}</main></div></div>`;
  if(route==='writer'){const node=$('.view-enter');if(writerCache?.id===activeId)node.replaceWith(writerCache.node);$('.view-enter').dataset.writerId=activeId;syncWriterChrome();updateCounter();}
}
function errorHTML(){return storageError?`<div class="error-banner" role="alert">${h(storageError)} <button class="text-button" data-action="${recoveryRaw!==null?'recovery-download':'backup'}">${recoveryRaw!==null?'下載原始資料':'下載完整備份'}</button> <button class="text-button" data-route="settings">前往設定</button></div>`:'';}
function updateErrorBanner(){const el=$('#storage-banner');if(el)el.innerHTML=errorHTML();}
function heroArt(){return `<div class="hero-art" aria-hidden="true"><svg viewBox="0 0 235 145"><circle cx="123" cy="68" r="51" fill="#e8e3ca"/><path d="M52 97c25-61 61-81 90-52 18 17-3 33-22 26-16-6-5-23 8-17 16 8 17 33-8 44-19 8-42 6-54-3" stroke="#76805f" stroke-width="1.7" fill="none"/><path d="M64 106c38 12 71 8 99-7" stroke="#b96047" stroke-width="1.8" fill="none"/><path d="m47 111 8-7 8 3-9 5z" fill="#b96047"/><path d="M162 21v14m-7-7h14" stroke="#b5b69a" stroke-width="1"/><circle cx="52" cy="51" r="2.4" fill="#ba563c"/></svg><span>讓念頭，有處安放。</span></div>`;}
function renderWriter(){
  const entry=currentEntry(),topic=topicForEntry(entry),days=weekDays(state.entries),total=finishedEntries().length;
  return `<section class="hero"><div><p class="eyebrow">DAILY PRACTICE / 每日練筆</p><h1>把念頭寫下，<br>也把自己讀懂。</h1><p>一句回答、一小段文字，都可以是今天的書寫。</p></div>${heroArt()}</section><div class="writer-layout"><div class="writing-column"><section class="prompt-card" aria-label="本篇寫作題目"><div class="prompt-top"><span class="prompt-label">${topic?`${h(topic.category)} · ${topic.kind==='proverb'?'俗語與古語':'思考議題'}`:'自由書寫 · 跟著今天的念頭'}</span><span class="prompt-num">TODAY'S SEED</span></div><h2>${h(topic?.title||'此刻，你想寫些什麼？')}</h2><p>${h(topic?.text||'一個畫面、一種感受，或一句還沒想通的話。從最想說的地方開始。')}</p><div class="prompt-footer"><button class="text-button" data-action="idea-library">${icon('library')}打開選題抽屜</button><button class="text-button" data-action="random">${icon('refresh')}隨機一題</button><button class="text-button" data-action="free">自由書寫 ${icon('arrow')}</button></div></section><section class="paper" aria-label="書寫區"><div class="paper-top"><span>${h(entry.date.replaceAll('-',' / '))} <span id="entry-state">· ${entry.status==='finished'?'已收進文集':'草稿'}</span></span><span class="save-status ${writeFailed||recoveryRaw!==null?'error':''}" id="save-label">${writeFailed?'儲存失敗 · 請備份':recoveryRaw!==null?'原始資料待處理':'內容會自動儲存'}</span></div><div class="paper-interior"><label class="sr-only" for="entry-title">文章標題</label><input id="entry-title" class="title-input" maxlength="500" placeholder="替今天的想法，取個名字" value="${h(entry.title)}" autocomplete="off"><label class="sr-only" for="entry-body">文章正文</label><textarea id="entry-body" class="body-input" spellcheck="false" placeholder="${h(topic?.starter||'不用急著寫好，先把第一句留下來。\n\n今天，我想從這裡開始……')}">${h(entry.body)}</textarea></div><div class="paper-bottom"><div class="word-counter"><strong id="word-count">0</strong><span>字 / 小目標 ${state.settings.goal}</span><span class="goal-line" aria-hidden="true"><i id="word-progress"></i></span></div><button class="text-button" data-action="focus">${icon('focus')}<span>${focusMode?'退出專注':'專注書寫'}</span></button></div></section><div class="writing-actions"><span class="gentle-note">寫一小段，也是在前進。</span><button class="button quiet" data-action="quick-idea">${icon('plus')}記下念頭</button><button class="button" data-action="export-current">${icon('share')}匯出文章</button><button class="button primary" data-action="finish">${icon('check')}${entry.status==='finished'?'儲存修改':'收進文集'}</button></div><section class="reflection"><button class="reflection-header" data-action="reflection" aria-expanded="${reflectionOpen}" aria-controls="reflection-content">${icon('spark')}<span>讀懂自己的想法</span><small>寫完後，再想一步</small>${icon(reflectionOpen?'up':'down')}</button><div class="reflection-content" id="reflection-content" ${reflectionOpen?'':'hidden'}><p class="reflection-intro">這裡沒有標準答案。挑一兩題回應就好，幫自己看見「為什麼我會這樣想」。</p><div class="reflection-grid">${REFLECTIONS.map(([key,label,question],i)=>`<div class="reflection-field"><label for="reflection-${key}"><span>0${i+1}</span>${label}</label><textarea id="reflection-${key}" data-reflection="${key}" placeholder="${h(question)}">${h(entry.reflection?.[key]||'')}</textarea></div>`).join('')}</div><p class="revision-note">回頭讀一次正文：有沒有一個籠統的詞，可以換成具體的人、畫面或例子？</p></div></section></div><aside class="right-rail"><section class="rail-card"><div class="rail-icon">${icon('leaf')}</div><span class="rail-label">A SMALL WRITING RITUAL</span><h3>給今天的三個提示</h3><ol class="guide-list"><li><b>01</b><span>先寫一個具體片段，<br>讓想法有個起點。</span></li><li><b>02</b><span>暫時放下「寫得好」，<br>把真正的感受寫出來。</span></li><li><b>03</b><span>多問一句「為什麼」，<br>也替另一種答案留位置。</span></li></ol><button class="text-button" data-action="reflection-open">打開思考拆解 ${icon('arrow')}</button></section><section class="rail-card"><span class="rail-label">YOUR LITTLE COLLECTION</span><h3>一點一點，留下來</h3><div class="mini-stat"><strong>${total}</strong><span>篇已完成的書寫</span></div><div class="week" aria-label="最近七日寫作紀錄">${days.map(d=>`<div class="week-day ${d.done?'done':''} ${d.today?'today':''}" title="${d.date} ${d.done?'已完成一篇':'尚未完成'}"><span>${d.day}</span><span class="dot">${d.done?'✓':'·'}</span></div>`).join('')}</div><div class="week-caption"><span>最近 7 天</span><span>${days.filter(d=>d.done).length} 天有留下文字</span></div></section><p class="rail-quote">「慢慢寫，<br>有些答案會自己浮出來。」<span>A LITTLE EVERY DAY</span></p></aside></div>`;
}
function topicCard(t,index){
  const written=finishedEntries().filter(e=>e.topicId===t.id).length,custom=state.topics.some(x=>x.id===t.id),star=state.favorites.includes(t.id);
  return `<article class="topic-card ${lastAdded?.id===t.id&&Date.now()-lastAdded.at<6000?'new-idea':''}" data-cat="${h(t.category)}"><div class="top"><span class="topic-tag">${h(t.category)}</span><button class="star ${star?'on':''}" data-action="favorite" data-id="${h(t.id)}" aria-label="${star?'取消收藏':'收藏'}：${h(t.title)}" aria-pressed="${star}">${icon('star')}</button></div><h2>${h(t.title)}</h2><p>${h(t.text)}</p><div class="card-foot"><span>${written?`寫過 ${written} 篇`:t.kind==='proverb'?'一句話，重新想':'一個念頭，慢慢寫'}</span>${custom?`<div class="topic-actions"><button class="mini-button" data-action="edit-topic" data-id="${h(t.id)}" aria-label="編輯議題">${icon('edit')}</button><button class="mini-button" data-action="delete-topic" data-id="${h(t.id)}" aria-label="刪除議題">${icon('trash')}</button></div>`:''}<button class="text-button" data-action="choose" data-id="${h(t.id)}">由這裡起筆 ${icon('arrow')}</button></div></article>`;
}
function filteredTopics(){
  const written=new Set(finishedEntries().map(e=>e.topicId));
  return allTopics().filter(t=>(libraryCategory==='全部'||t.category===libraryCategory)&&(libraryFilter!=='starred'||state.favorites.includes(t.id))&&(libraryFilter!=='unwritten'||!written.has(t.id))&&`${t.title} ${t.text} ${t.category}`.toLowerCase().includes(librarySearch.toLowerCase().trim()));
}
function libraryResults(){const topics=filteredTopics();return `${topics.length?topics.map(topicCard).join(''):`<div class="empty">${icon('library')}<h2>這一格，暫時留白。</h2><p>${librarySearch?'試試其他關鍵字，或加入自己的題目。':'可以換個分類，或把想到的議題放進來。'}</p><button class="button" data-action="reset-library">顯示全部議題</button></div>`}<button class="topic-card add-card" data-action="add-topic">${icon('plus')}<b>收藏一個新念頭</b><small>一句俗語，一個疑問，<br>都可以成為下一篇的開始。</small></button>`;}
function renderLibrary(){return `<header class="page-heading"><div><span class="eyebrow">THE IDEA LIBRARY / 念頭收藏室</span><h1>每一個問題，<br>都是一扇小窗。</h1><p>把還沒想通的事先放進來，想寫的時候，再慢慢打開。</p></div><button class="button primary" data-action="add-topic">${icon('plus')}加入議題</button></header><div class="toolbar"><div class="searchbox">${icon('search')}<label class="sr-only" for="library-search">搜尋議題</label><input id="library-search" value="${h(librarySearch)}" type="search" placeholder="找一個議題、一句話……"></div><div class="segment" role="group" aria-label="議題篩選">${[['all','全部議題'],['starred','我的收藏'],['unwritten','還未寫過']].map(([v,l])=>`<button class="${libraryFilter===v?'active':''}" data-action="library-filter" data-value="${v}" aria-pressed="${libraryFilter===v}">${l}</button>`).join('')}</div></div><div class="filters" role="group" aria-label="議題分類">${['全部',...CATEGORIES.filter(c=>c!=='其他'||state.topics.some(t=>t.category==='其他'))].map(c=>`<button class="chip ${libraryCategory===c?'active':''}" data-action="category" data-value="${h(c)}" aria-pressed="${libraryCategory===c}">${c}</button>`).join('')}</div><div class="results-line"><span id="library-count">${filteredTopics().length} 個念頭，等你慢慢寫</span><span>選題沒有先後，跟著好奇心就好。</span></div><section class="topic-grid" id="library-grid" aria-label="議題卡片">${libraryResults()}</section>`;}
function updateLibraryResults(){const grid=$('#library-grid');if(grid)grid.innerHTML=libraryResults();const count=$('#library-count');if(count)count.textContent=`${filteredTopics().length} 個念頭，等你慢慢寫`;}
function filteredEntries(){return visibleEntries().filter(e=>(archiveFilter==='all'||e.status===archiveFilter)&&`${e.title} ${e.topicTitle} ${e.body} ${Object.values(e.reflection||{}).join(' ')}`.toLowerCase().includes(archiveSearch.trim().toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt));}
function archiveResults(){const entries=filteredEntries();if(!entries.length)return `<div class="empty">${icon('book')}<h2>${archiveSearch?'還沒有找到這段文字。':'你的文集，從第一句開始。'}</h2><p>${archiveSearch?'換個關鍵字，找找其他片段。':'不需要很長，也不需要完美。\n把今天的一個想法留下來就好。'}</p><button class="button primary" data-route="writer">${icon('pen')}寫下今天的一段</button></div>`;
  return entries.map(e=>`<article class="entry-card"><div class="entry-date"><strong>${Number(e.date.slice(8))}</strong><small>${e.date.slice(0,7).replace('-',' / ')}</small></div><div class="entry-info"><div class="entry-meta"><span>${h(e.category||'自由書寫')}</span><span>${countWords(e.body)} 字</span>${e.status==='draft'?'<span class="draft-tag">草稿</span>':'<span>已收進文集</span>'}</div><h2>${h(entryTitle(e))}</h2><p>${h(e.body||'一個剛開始的念頭……')}</p></div><div class="entry-tools"><button class="mini-button" data-action="delete-entry" data-id="${h(e.id)}" aria-label="刪除文章：${h(entryTitle(e))}">${icon('trash')}</button><button class="button" data-action="export-entry" data-id="${h(e.id)}">${icon('share')}匯出</button><button class="button" data-action="open-entry" data-id="${h(e.id)}">打開 ${icon('arrow')}</button></div></article>`).join('');
}
function renderArchive(){return `<header class="page-heading"><div><span class="eyebrow">YOUR WORDS, OVER TIME / 留下的文字</span><h1>原來，我也寫了這些。</h1><p>回頭看看自己走過的想法。有些答案，會隨時間變得不同。</p></div><button class="button primary" data-action="new-entry">${icon('plus')}新的一篇</button></header><div class="toolbar"><div class="searchbox">${icon('search')}<label class="sr-only" for="archive-search">搜尋文章</label><input id="archive-search" type="search" placeholder="找標題、正文或思考片段……" value="${h(archiveSearch)}"></div><div class="segment" role="group" aria-label="文章篩選">${[['all','全部文字'],['finished','已完成'],['draft','草稿']].map(([v,l])=>`<button class="${archiveFilter===v?'active':''}" data-action="archive-filter" data-value="${v}" aria-pressed="${archiveFilter===v}">${l}</button>`).join('')}</div></div><div class="results-line"><span id="archive-count">${finishedEntries().length} 篇完成 · ${visibleEntries().filter(e=>e.status==='draft').length} 篇草稿</span><span>文字會自動保存，可以隨時回來。</span></div><section id="archive-list" class="archive-list" aria-label="文章列表">${archiveResults()}</section>`;}
function rangeSetting(key,label,min,max,step,unit){return `<div class="setting-row"><label for="setting-${key}">${label}<output id="output-${key}" for="setting-${key}">${state.settings[key]}${unit}</output></label><input id="setting-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${state.settings[key]}" data-setting="${key}" data-unit="${unit}"><div class="range-labels"><span>${min}${unit}</span><span>${max}${unit}</span></div></div>`;}
function renderSettings(){return `<header class="page-heading"><div><span class="eyebrow">MAKE YOURSELF AT HOME / 你的書寫空間</span><h1>舒服一點，慢慢寫。</h1><p>調整文字與留白，找到最適合自己的閱讀節奏。</p></div></header><div class="settings-layout"><div><section class="setting-card"><h2>字，與留白</h2><p>這些設定會套用到正文與思考拆解預覽。手機版會配合螢幕寬度。</p><div class="setting-row"><label>正文的字體</label><div class="font-buttons"><button class="font-choice serif ${state.settings.font==='serif'?'active':''}" data-action="font" data-value="serif" aria-pressed="${state.settings.font==='serif'}">明體 · 像一頁書</button><button class="font-choice sans ${state.settings.font==='sans'?'active':''}" data-action="font" data-value="sans" aria-pressed="${state.settings.font==='sans'}">黑體 · 清楚輕鬆</button></div></div>${rangeSetting('fontSize','正文字體大小',15,28,1,' px')}${rangeSetting('pageWidth','書寫頁面寬度',520,960,20,' px')}${rangeSetting('lineHeight','行與行的距離',1.5,2.6,.05,' 倍')}<div class="setting-row toggle-row"><div class="toggle-copy">輕微動畫<small>保留淡入與按鈕回應，也可以完全關閉。</small></div><button class="switch" role="switch" aria-label="輕微動畫" aria-checked="${state.settings.motion}" data-action="motion"></button></div></section><section class="setting-card"><h2>給自己一個小目標</h2><p>只是參考，不會阻止你收下較短的文章。字數以中文字與英文詞估算。</p>${rangeSetting('goal','每天想留多少文字',50,1000,50,' 字')}</section><section class="setting-card"><h2>把文字好好帶走</h2><p>文章與議題保存在目前裝置的這個瀏覽器，沒有自動跨裝置同步。完整備份可帶到另一部裝置；也建議定期保留一份。</p><div class="data-actions"><button class="button primary" data-action="backup">${icon('download')}下載完整備份</button><button class="button" data-action="import">${icon('upload')}匯入備份</button></div><p class="footnote storage-count">目前 ${finishedEntries().length} 篇完成 · ${visibleEntries().filter(e=>e.status==='draft').length} 篇草稿 · ${state.topics.length} 個自訂議題。備份包括收藏與閱讀設定。清除瀏覽器資料或換網址後，需要匯入備份。</p>${recoveryRaw!==null?'<div class="dialog-actions"><button class="button" data-action="recovery-download">下載原始資料</button><button class="button" data-action="recovery-reset">已備份，重新開始</button></div>':''}</section><section class="setting-card"><h2>放進日常</h2><div class="help-block"><b>加入 iPhone 主畫面</b><br>用 Safari 打開 → 分享 →「加入主畫面」。首次開啟並載入後，可以離線書寫。<br><br><b>備忘錄</b><br>在文章按「匯出」→「分享至備忘錄」→ 在系統分享選單選備忘錄並儲存。若未顯示，可先複製全文再貼上。<br><br><b>Notion</b><br>手機用「複製 Notion 版本」後貼到 Notion。保留標題層級的可靠方式是下載 Markdown，再在 Notion 電腦或網頁版的 Settings → Import → Text & Markdown 匯入。<br><br><a href="https://www.notion.com/help/import-data-into-notion" target="_blank" rel="noopener">Notion 官方匯入說明 ↗</a> · <a href="https://support.apple.com/en-us/102223" target="_blank" rel="noopener">Apple 官方分享說明 ↗</a></div></section></div><aside><div class="settings-preview"><span class="rail-label">LIVE PREVIEW / 文字預覽</span><div class="preview-text" id="settings-preview">今天，我想把一個念頭寫下來。<br><br>不是為了給誰看，只是想更清楚地知道：我為什麼這樣想，又在意些什麼。</div><p>你的文章有自己的速度，<br>讓頁面跟上它就好。</p><button class="text-button" style="margin-top:15px" data-route="writer">回到書寫 ${icon('arrow')}</button></div></aside></div>`;}
function updateCounter(){const entry=currentEntry();if(!entry)return;const count=countWords(entry.body),el=$('#word-count');if(el)el.textContent=count;const progress=$('#word-progress');if(progress)progress.style.width=Math.min(100,count/state.settings.goal*100)+'%';}
function navigate(next){
  rememberWriter();route=next;focusMode=false;location.hash=next;render();
  if(next==='writer')restoreWriter(true);else{window.scrollTo({top:0,behavior:'instant'});$('#main')?.focus({preventScroll:true});}
}
function openDialog(content){const dialog=$('#dialog');if(dialog.open)dialog.close();dialog.innerHTML=content;dialog.showModal();}
function dialogHeader(title){return `<div class="dialog-top"><h2>${title}</h2><button class="circle-button" data-action="close-dialog" aria-label="關閉">${icon('close')}</button></div>`;}
function confirmDialog(title,desc,action,idValue,button='確認'){openDialog(`${dialogHeader(h(title))}<p class="dialog-desc">${h(desc)}</p><div class="dialog-actions"><button class="button" data-action="close-dialog">取消</button><button class="button rust" data-action="${action}" data-id="${h(idValue)}">${button}</button></div>`);}
function chooseTopic(topic,free=false){
  const existing=currentEntry();
  if(existing&&!hasContent(existing)&&existing.status==='draft') {Object.assign(existing,{topicId:topic?.id||null,topicTitle:topic?.title||'',topicText:topic?.text||'',category:topic?.category||'其他'});existing.updatedAt=new Date().toISOString();}
  else {const entry=newEntry(topic);state.entries.push(entry);activeId=entry.id;}
  persist();reflectionOpen=false;navigate('writer');toast(free?'留一頁空白，寫你此刻想寫的。':'已選好題目，原有文字會保留在文集。');
}
function newBlankEntry(){const entry=newEntry();state.entries.push(entry);activeId=entry.id;persist();reflectionOpen=false;navigate('writer');$('#entry-title')?.focus();}
function finishEntry(){
  const entry=currentEntry();if(!entry?.body.trim()){toast('先留下一句正文，再把它收進文集。');$('#entry-body')?.focus();return;}
  const prior=entry.status;entry.status='finished';touchEntry();
  if(!persist()) {entry.status=prior;return;}
  syncWriterChrome();updateRail();const button=$('[data-action=finish]');button?.classList.add('saved-pulse');setTimeout(()=>button?.classList.remove('saved-pulse'),450);toast('已收進文集。今天，也留住了一點自己。');
}
function topicForm(topicId){const t=state.topics.find(t=>t.id===topicId);openDialog(`${dialogHeader(t?'整理這個念頭':'收藏一個新念頭')}<p class="dialog-desc">先把問題放在這裡。不用現在想通，日後可以隨時挑一題起筆。</p><form id="topic-form" data-id="${h(t?.id||'')}"><div class="form-field"><label for="topic-title">一句話或想思考的議題</label><input id="topic-title" name="title" maxlength="180" required placeholder="例如：什麼樣的忙碌，才讓我覺得值得？" value="${h(t?.title||'')}"></div><div class="form-row"><div class="form-field"><label for="topic-kind">念頭的起點</label><select id="topic-kind" name="kind"><option value="issue" ${t?.kind!=='proverb'?'selected':''}>一個議題 / 疑問</option><option value="proverb" ${t?.kind==='proverb'?'selected':''}>一句俗語 / 古語</option></select></div><div class="form-field"><label for="topic-category">放在哪個書架</label><select id="topic-category" name="category">${CATEGORIES.map(c=>`<option ${c===(t?.category||'其他')?'selected':''}>${c}</option>`).join('')}</select></div></div><div class="form-field"><label for="topic-text">補一點背景 <span style="color:var(--muted)">（選填）</span></label><textarea id="topic-text" name="text" maxlength="1000" placeholder="原句、想到它的原因，或你想從哪個角度探索……">${h(t?.text||'')}</textarea></div><div class="dialog-actions"><button class="button" type="button" data-action="close-dialog">先取消</button><button class="button primary" type="submit">${icon('check')}${t?'儲存修改':'放進圖書館'}</button></div></form>`);}
function openExport(entryId){const entry=state.entries.find(e=>e.id===entryId);if(!entry||!hasContent(entry)){toast('先寫下一點文字，才可以匯出。');return;}exportId=entryId;openDialog(`${dialogHeader('把這一篇帶走')}<p class="dialog-desc">${h(entryTitle(entry))}<br>${h(entry.date)} · ${countWords(entry.body)} 字</p><label class="checkbox-row"><input type="checkbox" id="with-reflection" checked>一併帶走「思考拆解」</label><div class="export-options"><button class="export-option" data-action="share-notes">${icon('note')}<span><b>分享至備忘錄</b><small>在 iPhone 系統選單選「備忘錄」，再按儲存。</small></span><span class="arrow">↗</span></button><button class="export-option" data-action="copy-notion">${icon('copy')}<span><b>複製 Notion 版本</b><small>貼到 Notion 即可；標題標記可能需手動轉換。</small></span><span class="arrow">↗</span></button><a class="export-option" id="export-md" download>${icon('download')}<span><b>下載 Markdown</b><small>適合在 Notion 電腦 / 網頁版匯入，保留標題層級。</small></span><span class="arrow">↓</span></a><a class="export-option" id="export-txt" download>${icon('download')}<span><b>下載純文字</b><small>通用 .txt 版本，留一份簡單的文字備份。</small></span><span class="arrow">↓</span></a></div><p class="footnote">匯出的是本篇內容，並不會自動同步到外部 App。</p>`);updateExportLinks();}
function getExport(markdown){const entry=state.entries.find(e=>e.id===exportId);return entry?exportEntry(entry,$('#with-reflection')?.checked!==false,markdown):'';}
function updateExportLinks(){
  for(const url of exportURLs)URL.revokeObjectURL(url);
  exportURLs=[];
  const entry=state.entries.find(e=>e.id===exportId);if(!entry)return;
  for(const [kind,mime] of [['md','text/markdown'],['txt','text/plain']]){
    const link=$('#export-'+kind);if(!link)continue;
    const url=URL.createObjectURL(new Blob([getExport(kind==='md')],{type:mime+';charset=utf-8'}));
    exportURLs.push(url);link.href=url;link.download=fileName(entry,kind);
  }
}
function fileName(entry,extension){return `${entry.date}_${entryTitle(entry).replace(/[\\/:*?"<>|\r\n]/g,'_').slice(0,75)}.${extension}`;}
function download(text,name,mime){const blob=new Blob([text],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;($('#dialog').open?$('#dialog'):document.body).append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function copyText(text,format='文字') {
  try{if(!navigator.clipboard?.writeText)throw Error('unsupported');await navigator.clipboard.writeText(text);toast(`已複製${format}，可以到目標 App 貼上。`);return true;}
  catch {openDialog(`${dialogHeader('選取並複製文字')}<p class="dialog-desc">目前瀏覽器未開放直接複製。長按下方文字，選「全選」→「複製」。</p><textarea class="fallback-text" readonly id="fallback-copy">${h(text)}</textarea><div class="dialog-actions"><button class="button primary" data-action="select-copy">選取全部文字</button><button class="button" data-action="close-dialog">完成</button></div>`);$('#fallback-copy')?.select();return false;}
}
async function shareNotes(){const entry=state.entries.find(e=>e.id===exportId);if(!entry)return;const text=getExport(false);if(!navigator.share){await copyText(text,'全文');return;}try{await navigator.share({title:entryTitle(entry),text});toast('分享選單已關閉；請以備忘錄中的儲存結果為準。');}catch(err){if(err.name!=='AbortError'){toast('暫時無法開啟分享，改為複製全文。');await copyText(text,'全文');}}}
function backup(){download(JSON.stringify(state,null,2),`句間_完整備份_${dayKey()}.json`,'application/json;charset=utf-8');toast('備份已交給瀏覽器下載，請保留這份檔案。');}
function importDialog(incoming){pendingImport=incoming;openDialog(`${dialogHeader('把文字接回來')}<p class="dialog-desc">已讀取備份。你可以合併文章與收藏，或完整還原這份備份。</p><div class="file-info">${incoming.entries.filter(hasContent).length} 篇文字 · ${incoming.topics.length} 個自訂議題<br>合併時保留相同編號中修改時間較新的文章，沿用本機閱讀設定。同名但不同編號的文章會分別保留。</div><div class="dialog-actions"><button class="button" data-action="close-dialog">取消</button><button class="button" data-action="restore-confirm">完整還原</button><button class="button primary" data-action="merge-import">合併到目前資料</button></div>`);}
function performImport(replace){if(!pendingImport)return;const previous=state;state=replace?pendingImport:mergeBackup(state,pendingImport);if(!persist()){state=previous;toast('未能儲存匯入結果，原本資料仍然保留。',5000);return;}activeId=null;writerCache=null;view=normalizeView();ensureEntry();pendingImport=null;$('#dialog').close();navigate('archive');toast(replace?'已還原備份，包括閱讀設定。':'已合併文章、議題與收藏。');}
function openHelp(){openDialog(`${dialogHeader('歡迎來到句間')}<p class="dialog-desc">把文筆慢慢養回來，也在文字裡看見自己。</p><div class="help-block"><b>01　選一個讓你好奇的念頭</b><br>圖書館裡有議題與俗語，也可以加入自己的。<br><br><b>02　先寫，再整理</b><br>寫一小段就好。文章會自動儲存，寫完按「收進文集」。<br><br><b>03　讀懂自己的思考</b><br>展開「讀懂自己的想法」，由立場、理由、假設與反例，挑一兩題慢慢回答。這是自我提問，不是 AI 評分。<br><br><b>04　帶走你的文字</b><br>在文章匯出備忘錄 / Notion 版本；到設定下載完整備份，可以移到另一部裝置。<br><br><b>閱讀與操作</b><br>設定可調整正文大小、行距與書寫頁寬。桌面快捷鍵 ⌘ / Ctrl + S 可收進文集；Esc 可退出專注。</div><div class="dialog-actions"><button class="button primary" data-action="close-dialog">留下一點文字 ${icon('arrow')}</button></div>`);}

const motionEnabled=()=>state.settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
function saveView(){try{localStorage.setItem(VIEW_KEY,JSON.stringify(normalizeView(view)));}catch{}}
function scheduleViewSave(){clearTimeout(viewTimer);viewTimer=setTimeout(saveView,200);}
function rememberWriter(){
  const writer=$('.view-enter[data-writer-id]');if(!writer)return;
  const entryId=writer.dataset.writerId;
  const field=$('#'+lastEditor)||$('#entry-body');if(!field)return;
  view.activeId=entryId;
  view.positions[entryId]=normalizePosition({field:field.id,start:field.selectionStart,end:field.selectionEnd,direction:field.selectionDirection,scroll:window.scrollY,innerScroll:field.scrollTop,reflection:!$('#reflection-content')?.hidden});
  scheduleViewSave();
}
function restoreWriter(focus=false){
  if(route!=='writer')return;
  const pos=normalizePosition(view.positions[activeId]);
  setReflection(pos.reflection,false);
  const field=$('#'+pos.field)||$('#entry-body');lastEditor=field.id;
  if(focus)field.focus({preventScroll:true});
  field.setSelectionRange(Math.min(pos.start,field.value.length),Math.min(pos.end,field.value.length),pos.direction);
  field.scrollTop=pos.innerScroll;window.scrollTo({top:pos.scroll,behavior:'instant'});
}
function syncWriterChrome(){
  const entry=currentEntry();if(!entry||!$('#entry-state'))return;
  $('#entry-state').textContent=entry.status==='finished'?'· 已收進文集':'· 草稿';
  const finish=$('[data-action=finish]');if(finish)finish.innerHTML=icon('check')+(entry.status==='finished'?'儲存修改':'收進文集');
  for(const [selector,value] of [['#entry-title',entry.title],['#entry-body',entry.body],...REFLECTIONS.map(([key])=>['#reflection-'+key,entry.reflection?.[key]||''])]){const field=$(selector);if(field&&field.value!==value)field.value=value;}
  const goal=$('.word-counter>span');if(goal)goal.textContent=`字 / 小目標 ${state.settings.goal}`;
  const focus=$('[data-action=focus] span');if(focus)focus.textContent=focusMode?'退出專注':'專注書寫';
}
function updateRail(){const rail=$('.right-rail');if(!rail)return;const temp=document.createElement('div');temp.innerHTML=renderWriter();rail.replaceWith(temp.querySelector('.right-rail'));}
function setReflection(open,remember=true){
  const content=$('#reflection-content'),button=$('[data-action=reflection]');if(!content||!button)return;
  reflectionOpen=open;content.hidden=!open;button.setAttribute('aria-expanded',String(open));
  button.innerHTML=icon('spark')+'<span>讀懂自己的想法</span><small>寫完後，再想一步</small>'+icon(open?'up':'down');
  if(open&&motionEnabled())content.animate([{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'ease-out'});
  if(remember)rememberWriter();
}
function toggleFocus(){
  rememberWriter();if(!focusMode)focusReturnY=window.scrollY;
  focusMode=!focusMode;applySettings();syncWriterChrome();
  const field=$('#'+lastEditor)||$('#entry-body');field?.focus({preventScroll:true});
  window.scrollTo({top:focusMode?0:focusReturnY,behavior:'instant'});
}
function panelTopics(){const written=new Set(finishedEntries().map(e=>e.topicId));return allTopics().filter(t=>(panelCategory==='全部'||t.category===panelCategory)&&(panelFilter!=='starred'||state.favorites.includes(t.id))&&(panelFilter!=='unwritten'||!written.has(t.id))&&`${t.title} ${t.text} ${t.category}`.toLowerCase().includes(panelSearch.trim().toLowerCase()));}
function openIdeaPanel(mode){
  rememberWriter();saveView();
  if(!panelOpen){panelReturn={element:document.activeElement,entryId:activeId,scroll:window.scrollY,overflow:document.body.style.overflow};}
  panelMode=mode;panelChoice=currentEntry()?.status==='finished'?'new':'same';
  let panel=$('#idea-panel');if(!panel){panel=document.createElement('div');panel.id='idea-panel';panel.className='idea-overlay';panel.hidden=true;panel.innerHTML='<div class="idea-backdrop" data-panel-backdrop></div><section class="idea-sheet" role="dialog" aria-modal="true" aria-labelledby="idea-panel-title" tabindex="-1"></section>';document.body.append(panel);}
  clearTimeout(panelCloseTimer);panel.hidden=false;panel.removeAttribute('aria-hidden');panel.classList.remove('is-closing');panelOpen=true;
  renderPanelContent();$('#app').inert=true;document.body.style.overflow='hidden';
  panel.classList.add('is-open');
  // Focus during the original tap so mobile keyboards can open normally.
  (mode==='quick'?$('#quick-title'):$('#idea-panel [data-action=panel-close]'))?.focus({preventScroll:true});
}
function closeIdeaPanel(restore=true){
  if(!panelOpen)return;panelOpen=false;
  const panel=$('#idea-panel');$('#app').inert=false;document.body.style.overflow=panelReturn?.overflow||'';
  panel.classList.remove('is-open');panel.classList.add('is-closing');
  if(restore){if(route==='writer'&&activeId===panelReturn?.entryId)restoreWriter(true);else if(panelReturn?.element?.isConnected)panelReturn.element.focus({preventScroll:true});}
  else if(panel.contains(document.activeElement))document.activeElement.blur();
  panel.setAttribute('aria-hidden','true');
  panelCloseTimer=setTimeout(()=>{if(!panelOpen){panel.hidden=true;panel.classList.remove('is-closing');}},motionEnabled()?230:0);
}
function renderPanelContent(){
  const sheet=$('#idea-panel .idea-sheet');
  sheet.innerHTML=`<div class="drawer-handle" aria-hidden="true"></div><header class="idea-heading"><div><p class="eyebrow">${panelMode==='quick'?'CATCH A THOUGHT':'THE IDEA LIBRARY'}</p><h2 id="idea-panel-title">${panelMode==='quick'?'先把念頭留下來。':'找一句，讓你想寫的話。'}</h2></div><button class="circle-button" data-action="panel-close" aria-label="關閉念頭面板">${icon('close')}</button></header><div class="idea-tabs"><button data-action="panel-mode" data-value="library" class="${panelMode==='library'?'active':''}" aria-pressed="${panelMode==='library'}">${icon('library')}挑一個題目</button><button data-action="panel-mode" data-value="quick" class="${panelMode==='quick'?'active':''}" aria-pressed="${panelMode==='quick'}">${icon('plus')}記下新念頭</button></div>${panelMode==='quick'?quickIdeaHTML():`<p class="idea-intro">題目可以換，寫下的文字會好好留下。</p>${route==='writer'?`<div class="segment idea-choice" role="group" aria-label="選題後怎樣寫"><button data-action="panel-choice" data-value="same" class="${panelChoice==='same'?'active':''}" aria-pressed="${panelChoice==='same'}">替本篇換題 · 正文保留</button><button data-action="panel-choice" data-value="new" class="${panelChoice==='new'?'active':''}" aria-pressed="${panelChoice==='new'}">另開一篇</button></div>`:''}<div class="searchbox idea-search">${icon('search')}<label class="sr-only" for="panel-search">在抽屜搜尋議題</label><input type="search" id="panel-search" placeholder="找一個議題、一句話……" value="${h(panelSearch)}"></div><div id="panel-filters"></div><div class="results-line"><span id="panel-count"></span><button class="text-button" data-action="panel-random">${icon('refresh')}幫我選一題</button></div><div id="panel-results" class="idea-results" aria-label="可選題目"></div>`}`;
  if(panelMode==='library'){renderPanelFilters();refreshPanelResults();}
  else $('#quick-title')?.focus({preventScroll:true});
}
function renderPanelFilters(){const el=$('#panel-filters');if(!el)return;el.innerHTML=`<div class="filters">${['全部',...CATEGORIES].map(c=>`<button class="chip ${panelCategory===c?'active':''}" data-action="panel-category" data-value="${h(c)}" aria-pressed="${panelCategory===c}">${c}</button>`).join('')}</div><div class="idea-small-filters">${[['all','全部'],['starred','已收藏'],['unwritten','未寫過']].map(([v,l])=>`<button data-action="panel-filter" data-value="${v}" aria-pressed="${panelFilter===v}" class="${panelFilter===v?'active':''}">${l}</button>`).join('')}</div>`;}
function refreshPanelResults(){const el=$('#panel-results');if(!el)return;const topics=panelTopics();$('#panel-count').textContent=`${topics.length} 個念頭，慢慢選。`;el.innerHTML=topics.length?topics.map(t=>`<article class="drawer-topic ${lastAdded?.id===t.id?'new-idea':''}"><div class="drawer-topic-copy"><span class="topic-tag">${h(t.category)}</span><h3>${h(t.title)}</h3><p>${h(t.text)}</p><button class="text-button" data-action="panel-use" data-id="${h(t.id)}">由這裡起筆 ${icon('arrow')}</button></div><button class="star ${state.favorites.includes(t.id)?'on':''}" aria-label="${state.favorites.includes(t.id)?'取消收藏':'收藏'}：${h(t.title)}" aria-pressed="${state.favorites.includes(t.id)}" data-action="panel-star" data-id="${h(t.id)}">${icon('star')}</button></article>`).join(''):'<div class="empty"><h3>這裡暫時留白。</h3><p>換個關鍵字，或記下一個自己的問題。</p></div>';}
function quickIdeaHTML(){return `<p class="idea-intro">一句話就夠了。收好後，回到你原本正在做的事。</p><form id="quick-form"><label class="quick-label" for="quick-title">這一刻，想到什麼？</label><textarea id="quick-title" name="title" rows="3" maxlength="180" required placeholder="例如：我是在堅持，還是只是不甘心？">${h(view.quickText)}</textarea><div class="quick-meta"><span id="quick-length">最多 180 字 · 換行也可以</span><span>⌘ / Ctrl + Enter 儲存</span></div><details class="quick-options"><summary>分類與類型（可以稍後再改）</summary><div class="form-row"><div class="form-field"><label for="quick-category">書架</label><select id="quick-category" name="category">${CATEGORIES.map(c=>`<option ${c==='其他'?'selected':''}>${c}</option>`).join('')}</select></div><div class="form-field"><label for="quick-kind">起點</label><select id="quick-kind" name="kind"><option value="issue">一個議題 / 疑問</option><option value="proverb">一句俗語 / 古語</option></select></div></div></details><div class="quick-note">${icon('leaf')}原本的文章、游標和閱讀位置都會保留。</div><div class="dialog-actions"><button class="button" type="button" data-action="panel-close">稍後再記</button><button class="button primary" type="submit">${icon('check')}收好，繼續寫</button></div></form>`;}
function saveQuickIdea(form){
  if(composing)return;const data=new FormData(form),title=String(data.get('title')||'').trim();if(!title){$('#quick-title').focus();return;}
  const topic={id:id(),title,text:'',kind:String(data.get('kind')||'issue'),category:String(data.get('category')||'其他')};
  state.topics.push(topic);if(!persist()){state.topics.pop();return;}
  lastAdded={id:topic.id,at:Date.now()};view.quickText='';saveView();
  closeIdeaPanel();if(route==='library')updateLibraryResults();toast('✓ 念頭已收好，接著寫吧。');
}
function usePanelTopic(topicId){
  const topic=topicById(topicId);if(!topic)return;
  if(route==='writer'&&panelChoice==='same'){
    const entry=currentEntry(),old={...entry};Object.assign(entry,{topicId:topic.id,topicTitle:topic.title,topicText:topic.text,category:topic.category,updatedAt:new Date().toISOString()});
    if(!persist()){Object.assign(entry,old);return;}
    const temp=document.createElement('div');temp.innerHTML=renderWriter();const card=$('.prompt-card');card.innerHTML=temp.querySelector('.prompt-card').innerHTML;
    $('#entry-body').placeholder=topic.starter||'不用急著寫好，先把第一句留下來。';
    if(motionEnabled())card.animate([{opacity:.5,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:200});
    closeIdeaPanel();toast('題目已換好，正文與標題保留。');
  }else{
    const entry=newEntry(topic);state.entries.push(entry);if(!persist()){state.entries.pop();return;}
    rememberWriter();activeId=entry.id;closeIdeaPanel(false);reflectionOpen=false;navigate('writer');$('#entry-body')?.focus({preventScroll:true});toast('已另開一篇，原稿仍在文集。');
  }
}
function trapPanelFocus(event){const nodes=[...$('#idea-panel').querySelectorAll('button,input,textarea,select,summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
document.addEventListener('pointerdown',event=>{if(!panelOpen&&event.target.closest('button')&&route==='writer')rememberWriter();},true);
document.addEventListener('focusin',event=>{if(event.target.matches('#entry-title,#entry-body,[data-reflection]'))lastEditor=event.target.id;});
document.addEventListener('selectionchange',()=>{if(!panelOpen&&document.activeElement?.matches('#entry-title,#entry-body,[data-reflection]'))rememberWriter();});
window.addEventListener('scroll',()=>{if(!panelOpen)rememberWriter();},{passive:true});
document.addEventListener('input',event=>{if(event.target.matches('#entry-title,#entry-body,[data-reflection]'))rememberWriter();});
document.addEventListener('compositionstart',()=>composing=true);
document.addEventListener('compositionend',()=>composing=false);
document.addEventListener('keydown',event=>{if(event.target.id==='quick-title'&&(event.metaKey||event.ctrlKey)&&event.key==='Enter'&&!event.isComposing&&!composing){event.preventDefault();$('#quick-form').requestSubmit();}});
document.addEventListener('click',event=>{if(event.target.matches('[data-panel-backdrop]'))closeIdeaPanel();});
window.addEventListener('pagehide',()=>{if(!panelOpen)rememberWriter();saveView();});

document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.route){if($('#dialog').open)$('#dialog').close();navigate(button.dataset.route);return;}
  const {action,id:buttonId,value}=button.dataset;
  switch(action){
    case 'idea-library':openIdeaPanel('library');break;
    case 'quick-idea':openIdeaPanel('quick');break;
    case 'panel-close':closeIdeaPanel();break;
    case 'panel-mode':panelMode=value;renderPanelContent();break;
    case 'panel-category':panelCategory=value;renderPanelFilters();refreshPanelResults();break;
    case 'panel-filter':panelFilter=value;renderPanelFilters();refreshPanelResults();break;
    case 'panel-choice':panelChoice=value;document.querySelectorAll('[data-action=panel-choice]').forEach(b=>{b.classList.toggle('active',b.dataset.value===value);b.setAttribute('aria-pressed',String(b.dataset.value===value));});break;
    case 'panel-use':usePanelTopic(buttonId);break;
    case 'panel-random':{const topics=panelTopics().filter(t=>t.id!==currentEntry()?.topicId);if(topics.length)usePanelTopic(topics[Math.floor(Math.random()*topics.length)].id);else toast('這個書架暫時沒有其他題目。');break;}
    case 'panel-star':{const previous=state.favorites;state.favorites=state.favorites.includes(buttonId)?state.favorites.filter(x=>x!==buttonId):[...state.favorites,buttonId];if(!persist()){state.favorites=previous;break;}refreshPanelResults();break;}

    case 'close-dialog':$('#dialog').close();break;
    case 'help':openHelp();break;
    case 'new-entry':newBlankEntry();break;
    case 'finish':finishEntry();break;
    case 'focus':toggleFocus();break;
    case 'reflection':setReflection(!reflectionOpen);break;
    case 'reflection-open':setReflection(true);$('#reflection-content')?.scrollIntoView({behavior:motionEnabled()?'smooth':'instant',block:'center'});break;
    case 'random':{const options=allTopics().filter(t=>t.id!==currentEntry()?.topicId);const topic=options[Math.floor(Math.random()*options.length)]||SEED_TOPICS[0];panelChoice=currentEntry()?.status==='finished'?'new':'same';usePanelTopic(topic.id);restoreWriter(true);break;}
    case 'free':chooseTopic(null,true);break;
    case 'choose':{const topic=topicById(buttonId);if(topic)chooseTopic(topic);break;}
    case 'favorite':{state.favorites=state.favorites.includes(buttonId)?state.favorites.filter(x=>x!==buttonId):[...state.favorites,buttonId];persist();render();break;}
    case 'category':libraryCategory=value;render();break;
    case 'library-filter':libraryFilter=value;render();break;
    case 'reset-library':librarySearch='';libraryCategory='全部';libraryFilter='all';render();break;
    case 'archive-filter':archiveFilter=value;render();break;
    case 'add-topic':topicForm();break;
    case 'edit-topic':topicForm(buttonId);break;
    case 'delete-topic':confirmDialog('移走這個議題？','只會移除自訂議題。已寫過的文章與當時的題目仍會保留。','delete-topic-confirm',buttonId,'移除議題');break;
    case 'delete-topic-confirm':state.topics=state.topics.filter(t=>t.id!==buttonId);state.favorites=state.favorites.filter(x=>x!==buttonId);persist();$('#dialog').close();render();toast('已移除自訂議題。');break;
    case 'open-entry':activeId=buttonId;reflectionOpen=false;navigate('writer');break;
    case 'delete-entry':confirmDialog('刪除這一篇文字？','刪除後將無法從 App 復原。若想保留，請先匯出文章或下載完整備份。','delete-entry-confirm',buttonId,'刪除文章');break;
    case 'delete-entry-confirm':state.entries=state.entries.filter(e=>e.id!==buttonId);if(activeId===buttonId)activeId=null;ensureEntry();persist();$('#dialog').close();render();toast('已刪除這篇文字。');break;
    case 'export-current':openExport(activeId);break;
    case 'export-entry':openExport(buttonId);break;
    case 'share-notes':await shareNotes();break;
    case 'copy-notion':await copyText(getExport(true),'Notion 版本');break;
    case 'download-md':case 'download-txt':{const entry=state.entries.find(e=>e.id===exportId);if(!entry)break;const md=action==='download-md';download(getExport(md),fileName(entry,md?'md':'txt'),`${md?'text/markdown':'text/plain'};charset=utf-8`);toast('文章已交給瀏覽器下載。');break;}
    case 'select-copy':$('#fallback-copy')?.focus();$('#fallback-copy')?.select();break;
    case 'font':state.settings.font=value;persist();applySettings();document.querySelectorAll('[data-action=font]').forEach(b=>{b.classList.toggle('active',b.dataset.value===value);b.setAttribute('aria-pressed',String(b.dataset.value===value));});break;
    case 'motion':state.settings.motion=!state.settings.motion;persist();applySettings();button.setAttribute('aria-checked',String(state.settings.motion));break;
    case 'backup':backup();break;
    case 'import':$('#import-file').click();break;
    case 'merge-import':performImport(false);break;
    case 'restore-confirm':openDialog(`${dialogHeader('完整還原這份備份？')}<p class="dialog-desc">目前裝置的文章、議題、收藏與設定都會換成這份備份。請先保留目前的完整備份。</p><div class="dialog-actions"><button class="button" data-action="backup">${icon('download')}先備份目前資料</button><button class="button" data-action="close-dialog">取消</button><button class="button rust" data-action="restore-import">還原備份</button></div>`);break;
    case 'restore-import':performImport(true);break;
    case 'recovery-download':if(recoveryRaw!==null)download(recoveryRaw,`句間_原始資料_${dayKey()}.json`,'application/json');break;
    case 'recovery-reset':confirmDialog('重新開始？','請先下載原始資料。確認後會清除目前無法讀取的資料，建立新的空白文集。','recovery-reset-confirm','','重新開始');break;
    case 'recovery-reset-confirm':recoveryRaw=null;state=emptyState();activeId=null;ensureEntry();persist();$('#dialog').close();navigate('writer');break;
  }
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='entry-title'||el.id==='entry-body') {const entry=touchEntry();if(!entry)return;entry[el.id==='entry-title'?'title':'body']=el.value;persist(true);updateCounter();if(storageError)updateErrorBanner();return;}
  if(el.dataset.reflection){const entry=touchEntry();if(!entry)return;entry.reflection[el.dataset.reflection]=el.value;persist(true);return;}
  if(el.id==='panel-search'){panelSearch=el.value;refreshPanelResults();return;}
  if(el.id==='quick-title'){view.quickText=el.value;scheduleViewSave();return;}
  if(el.id==='library-search'){librarySearch=el.value;updateLibraryResults();return;}
  if(el.id==='archive-search'){archiveSearch=el.value;$('#archive-list').innerHTML=archiveResults();return;}
  if(el.dataset.setting){state.settings[el.dataset.setting]=Number(el.value);const output=$(`#output-${el.dataset.setting}`);if(output)output.textContent=el.value+el.dataset.unit;applySettings();persist(true);}
});
document.addEventListener('change',event=>{if(event.target.id==='with-reflection')updateExportLinks();});
document.addEventListener('submit',event=>{
  if(event.target.id==='quick-form'){event.preventDefault();saveQuickIdea(event.target);return;}
  if(event.target.id!=='topic-form')return;event.preventDefault();
  const form=event.target,data=new FormData(form),title=String(data.get('title')||'').trim();if(!title){$('#topic-title').focus();return;}
  const topic={id:form.dataset.id||id(),title,text:String(data.get('text')||'').trim(),kind:String(data.get('kind')),category:String(data.get('category'))};
  if(form.dataset.id)state.topics=state.topics.map(t=>t.id===topic.id?topic:t);else state.topics.push(topic);
  persist();$('#dialog').close();if(route!=='library')navigate('library');else render();toast('這個念頭，已放進圖書館。');
});
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{if(file.size>30*1024*1024)throw Error('檔案超過 30 MB，請先確認是否為句間備份。');const incoming=validateBackup(JSON.parse(await file.text()));importDialog(incoming);}
  catch(err){toast(err instanceof SyntaxError?'檔案不是有效的 JSON 備份，未有更改目前資料。':err.message,6000);}
});
document.addEventListener('keydown',event=>{
  if(event.isComposing||composing)return;
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'&&route==='writer'&&!$('#dialog').open&&!panelOpen){event.preventDefault();finishEntry();}
  if(panelOpen){if(event.key==='Escape'){event.preventDefault();closeIdeaPanel();}if(event.key==='Tab')trapPanelFocus(event);return;}
  if(event.key==='Enter'&&event.target.id==='quick-title'&&(event.isComposing||composing||event.keyCode===229))event.preventDefault();
  if(event.key==='Escape'&&focusMode&&!$('#dialog').open)toggleFocus();
});
$('#dialog').addEventListener('click',event=>{if(event.target===$('#dialog')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.target.close();}});
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(['writer','library','archive','settings'].includes(next)&&next!==route){if(panelOpen)closeIdeaPanel(false);navigate(next);}});
window.addEventListener('storage',event=>{if(event.key!==STORAGE_KEY||!event.newValue)return;try{state=mergeBackup(state,JSON.parse(event.newValue));writerCache=null;applySettings();if(!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))render();toast('已接收另一個分頁的最新文字。');}catch{toast('另一個分頁的資料未能讀取，請先備份目前內容。',5000);}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&hasContent(currentEntry()))persist(true);});
render();restoreWriter(false);
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
