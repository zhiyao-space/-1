import type { AppCategory } from '../store/factory'

/**
 * 「mulin 功能应用制造厂」预置模板库。
 * 纯数据文件：每个模板的 html/css/js 拼起来即可独立运行，不依赖任何外部库。
 * 风格统一为「厚块黑白渐变 / neumorphism」，适配 375px 宽。
 */

export interface AppTemplate {
  id: string
  name: string
  /** 单个 emoji 作为图标 */
  icon: string
  /** 只能是 '效率' | '生活' | '娱乐' | '工具' | '自定义' */
  category: AppCategory
  /** 一句话，12-20 字 */
  description: string
  html: string
  css: string
  js: string
}

export const APP_TEMPLATES: AppTemplate[] = [
  // 1
  {
    id: 'tmpl_todo',
    name: '待办清单',
    icon: '✅',
    category: '效率',
    description: '随手记录待办，完成即划掉的极简清单',
    html: `<div class="app">
  <header class="hd">
    <h1>待办清单</h1>
    <span class="count" id="cnt">0 / 0</span>
  </header>
  <div class="input-row">
    <input id="inp" class="field" type="text" placeholder="添加一项待办…" maxlength="60" />
    <button id="add" class="btn">添加</button>
  </div>
  <ul id="list" class="list"></ul>
  <p id="empty" class="empty">还没有待办，先添加一条吧</p>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:16px}
.hd{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.count{font-family:monospace;color:#999;font-size:13px}
.input-row{display:flex;gap:12px}
.field{flex:1;min-height:44px;border:0;border-radius:16px;background:#111;color:#fff;padding:0 16px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none}
.field::placeholder{color:#666}
.btn{min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.item{display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 12px;border-radius:18px;background:#2a2a2a;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .14s ease}
.check{width:28px;height:28px;flex:0 0 auto;border:0;border-radius:10px;background:#111;color:#fff;box-shadow:inset 3px 3px 6px #000,inset -3px -3px 6px #2a2a2a;font-size:15px;line-height:1;cursor:pointer}
.txt{flex:1;color:#ddd;font-size:15px;word-break:break-all}
.item.done .txt{color:#777;text-decoration:line-through}
.del{width:28px;height:28px;flex:0 0 auto;border:0;border-radius:10px;background:#2a2a2a;color:#999;font-size:18px;cursor:pointer;box-shadow:3px 3px 6px #000,-3px -3px 6px #222;transition:transform .12s ease,color .12s ease}
.del:active{transform:translateY(3px);color:#fff}
.empty{text-align:center;color:#666;font-size:13px;margin:6px 0;animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`,
    js: `(function(){
  var KEY='mt_todo_items';
  var inp=document.getElementById('inp');
  var add=document.getElementById('add');
  var list=document.getElementById('list');
  var cnt=document.getElementById('cnt');
  var empty=document.getElementById('empty');
  if(!inp||!add||!list) return;
  var items=[];
  try{ items=JSON.parse(localStorage.getItem(KEY)||'[]')||[] }catch(e){ items=[] }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(items)) }catch(e){} }
  function render(){
    list.innerHTML='';
    items.forEach(function(it){
      var li=document.createElement('li');
      li.className='item'+(it.done?' done':'');
      var box=document.createElement('button');
      box.className='check';
      box.setAttribute('aria-label','切换完成');
      box.textContent=it.done?'✓':'';
      box.onclick=function(){ it.done=!it.done; save(); render() };
      var span=document.createElement('span');
      span.className='txt';
      span.textContent=it.text;
      var del=document.createElement('button');
      del.className='del';
      del.setAttribute('aria-label','删除');
      del.textContent='×';
      del.onclick=function(){ items=items.filter(function(x){return x.id!==it.id}); save(); render() };
      li.appendChild(box); li.appendChild(span); li.appendChild(del);
      list.appendChild(li);
    });
    var done=items.filter(function(x){return x.done}).length;
    if(cnt) cnt.textContent=done+' / '+items.length;
    if(empty) empty.style.display=items.length?'none':'block';
  }
  function addItem(){
    var v=(inp.value||'').trim();
    if(!v) return;
    items.unshift({ id:'t'+Date.now()+Math.random().toString(36).slice(2,5), text:v, done:false });
    inp.value='';
    save(); render();
  }
  add.onclick=addItem;
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter') addItem() });
  render();
})();`,
  },

  // 2
  {
    id: 'tmpl_notes',
    name: '备忘录',
    icon: '📝',
    category: '效率',
    description: '快速记录零散想法与文字片段',
    html: `<div class="app">
  <header class="hd">
    <h1>备忘录</h1>
    <button id="new" class="btn sm">新建</button>
  </header>
  <div id="list" class="list"></div>
  <section class="editor">
    <textarea id="ta" class="field area" placeholder="写点什么…"></textarea>
    <div class="row">
      <span id="meta" class="meta">未保存</span>
      <div class="act">
        <button id="del" class="btn sm ghost">删除</button>
        <button id="save" class="btn sm">保存</button>
      </div>
    </div>
  </section>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:16px}
.hd{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.field{width:100%;min-height:44px;border:0;border-radius:16px;background:#111;color:#fff;padding:0 16px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none;font-family:inherit}
.field::placeholder{color:#666}
.area{min-height:150px;padding:14px 16px;line-height:1.6;resize:vertical}
.btn{min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.btn.sm{min-height:38px;padding:0 14px;font-size:13px;border-radius:12px}
.btn.ghost{color:#999}
.row{display:flex;justify-content:space-between;align-items:center;gap:10px}
.act{display:flex;gap:10px}
.meta{color:#999;font-size:12px;font-family:monospace;animation:pulse 3s ease-in-out infinite}
.list{display:flex;flex-direction:column;gap:10px}
.note-item{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:16px;background:#2a2a2a;box-shadow:3px 3px 6px #000,-3px -3px 6px #222;cursor:pointer;transition:transform .14s ease,box-shadow .14s ease}
.note-item.active{box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a;transform:translateY(-2px)}
.ni-t{color:#fff;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ni-d{color:#999;font-size:11px;font-family:monospace}
.empty{text-align:center;color:#666;font-size:13px;margin:6px 0}
.editor{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:20px;background:#2a2a2a;box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a}
@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`,
    js: `(function(){
  var KEY='mt_notes';
  var listEl=document.getElementById('list');
  var ta=document.getElementById('ta');
  var meta=document.getElementById('meta');
  var btnNew=document.getElementById('new');
  var btnSave=document.getElementById('save');
  var btnDel=document.getElementById('del');
  if(!listEl||!ta) return;
  var notes=[];
  try{ notes=JSON.parse(localStorage.getItem(KEY)||'[]')||[] }catch(e){ notes=[] }
  var curId=notes.length?notes[0].id:null;
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(notes)) }catch(e){} }
  function p2(n){ return n<10?'0'+n:''+n }
  function fmt(ts){ var d=new Date(ts); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())+' '+p2(d.getHours())+':'+p2(d.getMinutes()) }
  function find(id){ for(var i=0;i<notes.length;i++){ if(notes[i].id===id) return notes[i] } return null }
  function brief(t){ var s=(t||'').trim().slice(0,20); return s?s:'空备忘录' }
  function render(){
    listEl.innerHTML='';
    if(!notes.length){ listEl.innerHTML='<p class="empty">还没有备忘录</p>' }
    notes.slice().sort(function(a,b){ return b.updatedAt-a.updatedAt }).forEach(function(n){
      var item=document.createElement('div');
      item.className='note-item'+(n.id===curId?' active':'');
      var t=document.createElement('span'); t.className='ni-t'; t.textContent=brief(n.text);
      var d=document.createElement('span'); d.className='ni-d'; d.textContent=fmt(n.updatedAt);
      item.appendChild(t); item.appendChild(d);
      item.onclick=function(){ curId=n.id; load(); render() };
      listEl.appendChild(item);
    });
  }
  function load(){
    var n=find(curId);
    if(n){ ta.value=n.text||''; if(meta) meta.textContent='更新于 '+fmt(n.updatedAt) }
    else { ta.value=''; if(meta) meta.textContent='未保存' }
  }
  function newNote(){
    var n={ id:'n'+Date.now()+Math.random().toString(36).slice(2,5), text:'', updatedAt:Date.now() };
    notes.unshift(n); curId=n.id; save(); load(); render(); ta.focus();
  }
  function saveNote(){
    var v=ta.value;
    var n=find(curId);
    if(!n){ if(!v.trim()) return; n={ id:'n'+Date.now()+Math.random().toString(36).slice(2,5), text:v, updatedAt:Date.now() }; notes.unshift(n); curId=n.id }
    else { n.text=v; n.updatedAt=Date.now() }
    save(); load(); render();
    if(meta) meta.textContent='已保存 '+fmt(Date.now());
  }
  function delNote(){
    if(!curId) return;
    notes=notes.filter(function(x){ return x.id!==curId });
    curId=notes.length?notes[0].id:null; save(); load(); render();
  }
  if(btnNew) btnNew.onclick=newNote;
  if(btnSave) btnSave.onclick=saveNote;
  if(btnDel) btnDel.onclick=delNote;
  render(); load();
})();`,
  },

  // 3
  {
    id: 'tmpl_habit',
    name: '习惯打卡',
    icon: '🎯',
    category: '生活',
    description: '每天一点，连续打卡养成好习惯',
    html: `<div class="app">
  <header class="hd">
    <h1>习惯打卡</h1>
    <span class="count" id="today"></span>
  </header>
  <div class="input-row">
    <input id="inp" class="field" type="text" placeholder="新习惯，如：喝水" maxlength="20" />
    <button id="add" class="btn">添加</button>
  </div>
  <div id="list" class="list"></div>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:16px}
.hd{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.count{font-family:monospace;color:#999;font-size:13px}
.input-row{display:flex;gap:12px}
.field{flex:1;min-height:44px;border:0;border-radius:16px;background:#111;color:#fff;padding:0 16px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none}
.field::placeholder{color:#666}
.btn{min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.list{display:flex;flex-direction:column;gap:14px}
.habit{padding:16px;border-radius:20px;background:#2a2a2a;box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a}
.h-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
.h-name{font-size:16px;color:#fff}
.h-streak{font-family:monospace;font-size:12px;color:#d8d8d8}
.days{display:flex;justify-content:space-between;gap:6px}
.day{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px}
.day-w{font-size:11px;color:#999}
.dot{width:100%;aspect-ratio:1/1;max-width:34px;border:0;border-radius:12px;background:#111;box-shadow:inset 3px 3px 6px #000,inset -3px -3px 6px #2a2a2a;cursor:pointer;transition:transform .14s ease}
.dot.on{background:#2a2a2a;box-shadow:3px 3px 6px #000,-3px -3px 6px #222,inset 0 0 0 2px #fff;animation:pop .28s ease}
.dot.is-today{outline:1px solid #666;outline-offset:2px}
.h-del{min-height:32px;padding:0 12px;border:0;border-radius:10px;background:#2a2a2a;color:#999;font-size:12px;cursor:pointer;box-shadow:3px 3px 6px #000,-3px -3px 6px #222}
.empty{text-align:center;color:#666;font-size:13px;margin:6px 0}
@keyframes pop{0%{transform:scale(.7)}60%{transform:scale(1.12)}100%{transform:scale(1)}}`,
    js: `(function(){
  var KEY='mt_habit';
  var inp=document.getElementById('inp');
  var add=document.getElementById('add');
  var list=document.getElementById('list');
  var todayEl=document.getElementById('today');
  if(!inp||!add||!list) return;
  var habits=[];
  try{ habits=JSON.parse(localStorage.getItem(KEY)||'[]')||[] }catch(e){ habits=[] }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(habits)) }catch(e){} }
  function p2(n){ return n<10?'0'+n:''+n }
  function dstr(d){ return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()) }
  var WEEK=['日','一','二','三','四','五','六'];
  function recent(){ var out=[]; for(var i=6;i>=0;i--){ var d=new Date(); d.setDate(d.getDate()-i); out.push(d) } return out }
  function streak(h){
    var d=new Date(); var c=0;
    if(h.dates.indexOf(dstr(d))<0){ d.setDate(d.getDate()-1) }
    for(var i=0;i<400;i++){
      var k=dstr(d);
      if(h.dates.indexOf(k)>=0){ c++; d.setDate(d.getDate()-1) }
      else break;
    }
    return c;
  }
  function render(){
    list.innerHTML='';
    if(!habits.length){ list.innerHTML='<p class="empty">还没有习惯，添加一个开始打卡</p>' }
    var today=dstr(new Date());
    if(todayEl) todayEl.textContent=today;
    habits.forEach(function(h){
      var card=document.createElement('div'); card.className='habit';
      var top=document.createElement('div'); top.className='h-top';
      var name=document.createElement('span'); name.className='h-name'; name.textContent=h.name;
      var right=document.createElement('div'); right.className='row'; right.style.gap='8px';
      var st=document.createElement('span'); st.className='h-streak'; st.textContent='连续 '+streak(h)+' 天';
      var del=document.createElement('button'); del.className='h-del'; del.textContent='删除';
      del.onclick=function(){ habits=habits.filter(function(x){ return x.id!==h.id }); save(); render() };
      right.appendChild(st); right.appendChild(del);
      top.appendChild(name); top.appendChild(right);
      card.appendChild(top);
      var days=document.createElement('div'); days.className='days';
      recent().forEach(function(d){
        var k=dstr(d);
        var col=document.createElement('div'); col.className='day';
        var w=document.createElement('span'); w.className='day-w'; w.textContent=WEEK[d.getDay()];
        var dot=document.createElement('button'); dot.className='dot'+(h.dates.indexOf(k)>=0?' on':'')+(k===today?' is-today':'');
        dot.onclick=function(){
          if(h.dates.indexOf(k)>=0){ h.dates=h.dates.filter(function(x){ return x!==k }) }
          else { h.dates.push(k) }
          save(); render();
        };
        col.appendChild(w); col.appendChild(dot);
        days.appendChild(col);
      });
      card.appendChild(days);
      list.appendChild(card);
    });
  }
  function addHabit(){
    var v=(inp.value||'').trim();
    if(!v) return;
    habits.push({ id:'h'+Date.now()+Math.random().toString(36).slice(2,5), name:v, dates:[] });
    inp.value=''; save(); render();
  }
  add.onclick=addHabit;
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter') addHabit() });
  render();
})();`,
  },

  // 4
  {
    id: 'tmpl_countdown',
    name: '纪念日',
    icon: '🎂',
    category: '生活',
    description: '记录纪念日与重要日子的倒计时',
    html: `<div class="app">
  <header class="hd">
    <h1>纪念日</h1>
  </header>
  <div class="form">
    <input id="name" class="field" type="text" placeholder="事件名称，如：生日" maxlength="20" />
    <div class="input-row">
      <input id="date" class="field" type="date" />
      <button id="add" class="btn">添加</button>
    </div>
  </div>
  <div id="list" class="list"></div>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:16px}
.hd{padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.form{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:20px;background:#2a2a2a;box-shadow:6px 6px 12px #000,-5px -5px 10px #333}
.input-row{display:flex;gap:12px}
.field{flex:1;min-height:44px;width:100%;border:0;border-radius:16px;background:#111;color:#fff;padding:0 16px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none}
.field::placeholder{color:#666}
input[type=date]{color-scheme:dark}
.btn{min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.list{display:flex;flex-direction:column;gap:14px}
.event{display:flex;align-items:center;gap:14px;padding:16px;border-radius:20px;background:#2a2a2a;box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a}
.e-info{flex:1;display:flex;flex-direction:column;gap:6px}
.e-name{font-size:16px;color:#fff}
.e-date{font-size:12px;color:#999;font-family:monospace}
.e-num{font-family:monospace;font-size:26px;color:#fff;min-width:64px;text-align:right}
.e-num.near{animation:pulse 1.6s ease-in-out infinite}
.e-unit{font-size:11px;color:#999;text-align:right;display:block}
.e-del{width:28px;height:28px;border:0;border-radius:10px;background:#2a2a2a;color:#999;font-size:16px;cursor:pointer;box-shadow:3px 3px 6px #000,-3px -3px 6px #222}
.empty{text-align:center;color:#666;font-size:13px;margin:6px 0}
@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}`,
    js: `(function(){
  var KEY='mt_countdown';
  var nameEl=document.getElementById('name');
  var dateEl=document.getElementById('date');
  var add=document.getElementById('add');
  var list=document.getElementById('list');
  if(!nameEl||!dateEl||!add||!list) return;
  var events=[];
  try{ events=JSON.parse(localStorage.getItem(KEY)||'[]')||[] }catch(e){ events=[] }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(events)) }catch(e){} }
  function p2(n){ return n<10?'0'+n:''+n }
  function dstr(d){ return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()) }
  function diffDays(s){
    var p=(s||'').split('-');
    if(p.length<3) return null;
    var t=new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
    var now=new Date(); now.setHours(0,0,0,0); t.setHours(0,0,0,0);
    return Math.round((t-now)/86400000);
  }
  function render(){
    list.innerHTML='';
    if(!events.length){ list.innerHTML='<p class="empty">还没有纪念日，添加一个吧</p>' }
    events.slice().sort(function(a,b){ return a.date<b.date?-1:1 }).forEach(function(ev){
      var n=diffDays(ev.date);
      var row=document.createElement('div'); row.className='event';
      var info=document.createElement('div'); info.className='e-info';
      var nm=document.createElement('span'); nm.className='e-name'; nm.textContent=ev.name;
      var dt=document.createElement('span'); dt.className='e-date'; dt.textContent=ev.date;
      info.appendChild(nm); info.appendChild(dt);
      var numWrap=document.createElement('div');
      var num=document.createElement('span');
      num.className='e-num'+(n!==null&&Math.abs(n)<=30?' near':'');
      var unit=document.createElement('span'); unit.className='e-unit';
      if(n===null){ num.textContent='--'; unit.textContent='' }
      else if(n===0){ num.textContent='今天'; unit.textContent='就是今天' }
      else if(n>0){ num.textContent=String(n); unit.textContent='天后' }
      else { num.textContent=String(-n); unit.textContent='天前' }
      numWrap.appendChild(num); numWrap.appendChild(unit);
      var del=document.createElement('button'); del.className='e-del'; del.textContent='×';
      del.onclick=function(){ events=events.filter(function(x){ return x.id!==ev.id }); save(); render() };
      row.appendChild(info); row.appendChild(numWrap); row.appendChild(del);
      list.appendChild(row);
    });
  }
  function addEvent(){
    var v=(nameEl.value||'').trim();
    var d=dateEl.value;
    if(!v||!d) return;
    events.push({ id:'e'+Date.now()+Math.random().toString(36).slice(2,5), name:v, date:d });
    nameEl.value=''; dateEl.value=''; save(); render();
  }
  add.onclick=addEvent;
  render();
})();`,
  },

  // 5
  {
    id: 'tmpl_mood',
    name: '心情记录',
    icon: '🌤️',
    category: '生活',
    description: '用表情记录每天的心情与随笔',
    html: `<div class="app">
  <header class="hd">
    <h1>心情记录</h1>
    <span class="count" id="streak"></span>
  </header>
  <div class="faces" id="faces">
    <button class="face" data-m="1" aria-label="很差">
      <span class="face-circle"><i class="eye l"></i><i class="eye r"></i><i class="mouth"></i></span>
      <span class="face-label">很差</span>
    </button>
    <button class="face" data-m="2" aria-label="有点丧">
      <span class="face-circle"><i class="eye l"></i><i class="eye r"></i><i class="mouth"></i></span>
      <span class="face-label">有点丧</span>
    </button>
    <button class="face" data-m="3" aria-label="一般">
      <span class="face-circle"><i class="eye l"></i><i class="eye r"></i><i class="mouth"></i></span>
      <span class="face-label">一般</span>
    </button>
    <button class="face" data-m="4" aria-label="不错">
      <span class="face-circle"><i class="eye l"></i><i class="eye r"></i><i class="mouth"></i></span>
      <span class="face-label">不错</span>
    </button>
    <button class="face" data-m="5" aria-label="很好">
      <span class="face-circle"><i class="eye l"></i><i class="eye r"></i><i class="mouth"></i></span>
      <span class="face-label">很好</span>
    </button>
  </div>
  <textarea id="note" class="field area" placeholder="今天发生了什么…" maxlength="120"></textarea>
  <button id="save" class="btn block">记录今天的心情</button>
  <div id="list" class="list"></div>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:16px}
.hd{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.count{font-family:monospace;color:#999;font-size:13px}
.faces{display:flex;justify-content:space-between;gap:6px}
.face{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 2px;border:0;border-radius:18px;background:#2a2a2a;box-shadow:3px 3px 6px #000,-3px -3px 6px #222;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}
.face:active{transform:translateY(4px)}
.face.sel{box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a;transform:translateY(-3px)}
.face-circle{position:relative;width:42px;height:42px;border-radius:50%;background:#111;box-shadow:inset 4px 4px 8px #000,inset -4px -4px 8px #2a2a2a}
.eye{position:absolute;top:14px;width:5px;height:5px;border-radius:50%;background:#fff}
.eye.l{left:11px}
.eye.r{right:11px}
.mouth{position:absolute;left:50%;transform:translateX(-50%);bottom:9px;width:16px;height:8px;border:2px solid #fff;border-top:0;border-radius:0 0 16px 16px}
.face[data-m="1"] .mouth{border:2px solid #fff;border-bottom:0;border-radius:16px 16px 0 0;height:8px;bottom:7px}
.face[data-m="2"] .mouth{width:12px;height:0;border:0;border-bottom:2px solid #fff;border-radius:0}
.face[data-m="3"] .mouth{width:14px;height:0;border:0;border-bottom:2px solid #fff;border-radius:0}
.face[data-m="4"] .mouth{width:16px;height:8px}
.face[data-m="5"] .mouth{width:20px;height:11px}
.face-label{font-size:11px;color:#999}
.face.sel .face-label{color:#fff}
.field{width:100%;min-height:44px;border:0;border-radius:16px;background:#111;color:#fff;padding:0 16px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none;font-family:inherit}
.field::placeholder{color:#666}
.area{min-height:90px;padding:14px 16px;line-height:1.6;resize:vertical}
.btn{min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.btn.block{width:100%}
.list{display:flex;flex-direction:column;gap:10px}
.rec{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:#2a2a2a;box-shadow:3px 3px 6px #000,-3px -3px 6px #222}
.rec-m{width:34px;height:34px;flex:0 0 auto;border-radius:50%;background:#111;box-shadow:inset 3px 3px 6px #000,inset -3px -3px 6px #2a2a2a;display:flex;align-items:center;justify-content:center;font-family:monospace;color:#fff;font-size:14px}
.rec-info{flex:1;display:flex;flex-direction:column;gap:3px}
.rec-note{font-size:14px;color:#ddd}
.rec-date{font-size:11px;color:#999;font-family:monospace}
.empty{text-align:center;color:#666;font-size:13px;margin:6px 0;animation:pulse 2.6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`,
    js: `(function(){
  var KEY='mt_mood';
  var faces=document.getElementById('faces');
  var note=document.getElementById('note');
  var saveBtn=document.getElementById('save');
  var list=document.getElementById('list');
  var streakEl=document.getElementById('streak');
  if(!faces||!note||!saveBtn||!list) return;
  var recs=[];
  try{ recs=JSON.parse(localStorage.getItem(KEY)||'[]')||[] }catch(e){ recs=[] }
  var picked=0;
  function saveLS(){ try{ localStorage.setItem(KEY,JSON.stringify(recs)) }catch(e){} }
  function p2(n){ return n<10?'0'+n:''+n }
  function dstr(d){ return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()) }
  function mark(){ var today=dstr(new Date()); faces.querySelectorAll('.face').forEach(function(f){ var on=f.getAttribute('data-m')===String(picked); f.classList.toggle('sel',on) }) }
  function render(){
    list.innerHTML='';
    var sorted=recs.slice().sort(function(a,b){ return a.date<b.date?1:-1 });
    if(!sorted.length){ list.innerHTML='<p class="empty">还没有记录，从今天开始吧</p>' }
    sorted.slice(0,20).forEach(function(r){
      var row=document.createElement('div'); row.className='rec';
      var m=document.createElement('span'); m.className='rec-m'; m.textContent=String(r.mood);
      var info=document.createElement('div'); info.className='rec-info';
      var nt=document.createElement('span'); nt.className='rec-note'; nt.textContent=r.note||'（无备注）';
      var dt=document.createElement('span'); dt.className='rec-date'; dt.textContent=r.date;
      info.appendChild(nt); info.appendChild(dt);
      row.appendChild(m); row.appendChild(info);
      list.appendChild(row);
    });
    var today=dstr(new Date());
    var hit=null;
    for(var i=0;i<recs.length;i++){ if(recs[i].date===today) hit=recs[i] }
    if(hit){ picked=hit.mood; note.value=hit.note||'' }
    if(streakEl) streakEl.textContent='已记录 '+recs.length+' 天';
    mark();
  }
  faces.querySelectorAll('.face').forEach(function(f){
    f.onclick=function(){ picked=Number(f.getAttribute('data-m'))||3; mark() };
  });
  saveBtn.onclick=function(){
    if(!picked) picked=3;
    var today=dstr(new Date());
    var existed=null;
    for(var i=0;i<recs.length;i++){ if(recs[i].date===today) existed=recs[i] }
    if(existed){ existed.mood=picked; existed.note=(note.value||'').trim() }
    else { recs.unshift({ date:today, mood:picked, note:(note.value||'').trim() }) }
    saveLS(); render();
  };
  render();
})();`,
  },

  // 6
  {
    id: 'tmpl_pomodoro',
    name: '番茄钟',
    icon: '🍅',
    category: '效率',
    description: '专注二十五分钟，然后好好休息',
    html: `<div class="app">
  <header class="hd">
    <h1>番茄钟</h1>
    <span class="count" id="rounds">今日 0 个</span>
  </header>
  <div class="tabs" id="tabs">
    <button class="tab on" data-min="25">专注 25</button>
    <button class="tab" data-min="5">休息 5</button>
    <button class="tab" data-min="15">长休 15</button>
  </div>
  <div class="dial" id="dial">
    <div class="time" id="time">25:00</div>
    <div class="bar"><div class="bar-fill" id="bar"></div></div>
    <div class="phase" id="phase">准备开始</div>
  </div>
  <div class="row2">
    <button id="start" class="btn">开始</button>
    <button id="reset" class="btn">重置</button>
  </div>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:18px}
.hd{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.count{font-family:monospace;color:#999;font-size:13px}
.tabs{display:flex;gap:10px}
.tab{flex:1;min-height:40px;border:0;border-radius:14px;background:#2a2a2a;color:#999;font-size:13px;cursor:pointer;box-shadow:3px 3px 6px #000,-3px -3px 6px #222;transition:transform .12s ease,box-shadow .12s ease}
.tab.on{color:#fff;box-shadow:6px 6px 12px #000,-5px -5px 10px #333}
.tab:active{transform:translateY(3px)}
.dial{display:flex;flex-direction:column;align-items:center;gap:18px;padding:28px 20px;border-radius:24px;background:#2a2a2a;box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a}
.time{font-family:monospace;font-size:56px;letter-spacing:2px;color:#fff;line-height:1}
.dial.running .time{animation:pulse 1.4s ease-in-out infinite}
.bar{width:100%;height:14px;border-radius:10px;background:#111;box-shadow:inset 4px 4px 8px #000,inset -4px -4px 8px #2a2a2a;overflow:hidden}
.bar-fill{height:100%;width:0%;background:#fff;border-radius:10px;transition:width .3s linear}
.phase{font-size:13px;color:#999}
.row2{display:flex;gap:12px}
.btn{flex:1;min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
@keyframes pulse{0%,100%{opacity:.75}50%{opacity:1}}`,
    js: `(function(){
  var KEY='mt_pomodoro';
  var timeEl=document.getElementById('time');
  var barEl=document.getElementById('bar');
  var phaseEl=document.getElementById('phase');
  var startBtn=document.getElementById('start');
  var resetBtn=document.getElementById('reset');
  var dial=document.getElementById('dial');
  var tabs=document.getElementById('tabs');
  var roundsEl=document.getElementById('rounds');
  if(!timeEl||!startBtn||!resetBtn) return;
  var data={ minute:25, rounds:0, day:'' };
  try{ var raw=JSON.parse(localStorage.getItem(KEY)||'null'); if(raw) data={ minute:raw.minute||25, rounds:raw.rounds||0, day:raw.day||'' } }catch(e){}
  function p2(n){ return n<10?'0'+n:''+n }
  function dstr(){ var d=new Date(); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()) }
  if(data.day!==dstr()){ data.day=dstr(); data.rounds=0 }
  var total=data.minute*60;
  var remain=total;
  var running=false;
  var timer=null;
  var endAt=0;
  function persist(){ try{ localStorage.setItem(KEY,JSON.stringify(data)) }catch(e){} }
  function render(){
    var m=Math.floor(remain/60), s=remain%60;
    timeEl.textContent=p2(m)+':'+p2(s);
    if(barEl) barEl.style.width=(total?((total-remain)/total*100):0)+'%';
    if(roundsEl) roundsEl.textContent='今日 '+data.rounds+' 个';
    if(dial) dial.classList.toggle('running',running);
    startBtn.textContent=running?'暂停':'开始';
    if(phaseEl) phaseEl.textContent=running?'进行中…':(remain===total?'准备开始':'已暂停');
    if(tabs) tabs.querySelectorAll('.tab').forEach(function(t){ t.classList.toggle('on',Number(t.getAttribute('data-min'))===data.minute) });
  }
  function stop(){ running=false; if(timer){ clearInterval(timer); timer=null } }
  function tick(){
    remain=Math.max(0,Math.round((endAt-Date.now())/1000));
    if(remain<=0){
      stop();
      if(data.minute>=25){ data.rounds++; persist() }
      remain=total; render();
      if(phaseEl) phaseEl.textContent='这一轮结束啦';
      return;
    }
    render();
  }
  function start(){
    if(running){ stop(); render(); return }
    if(remain<=0) remain=total;
    running=true; endAt=Date.now()+remain*1000;
    timer=setInterval(tick,250);
    render();
  }
  function reset(){ stop(); remain=total; render() }
  startBtn.onclick=start;
  resetBtn.onclick=reset;
  if(tabs) tabs.querySelectorAll('.tab').forEach(function(t){
    t.onclick=function(){
      var m=Number(t.getAttribute('data-min'))||25;
      data.minute=m; total=m*60; persist(); reset();
    };
  });
  render();
})();`,
  },

  // 7
  {
    id: 'tmpl_calculator',
    name: '计算器',
    icon: '🧮',
    category: '工具',
    description: '支持四则运算与括号的简易计算器',
    html: `<div class="app">
  <div class="screen">
    <div class="expr" id="expr"></div>
    <div class="val" id="val">0</div>
  </div>
  <div class="keys" id="keys">
    <button class="key fn" data-k="C">C</button>
    <button class="key fn" data-k="(">(</button>
    <button class="key fn" data-k=")">)</button>
    <button class="key op" data-k="/">÷</button>

    <button class="key" data-k="7">7</button>
    <button class="key" data-k="8">8</button>
    <button class="key" data-k="9">9</button>
    <button class="key op" data-k="*">×</button>

    <button class="key" data-k="4">4</button>
    <button class="key" data-k="5">5</button>
    <button class="key" data-k="6">6</button>
    <button class="key op" data-k="-">−</button>

    <button class="key" data-k="1">1</button>
    <button class="key" data-k="2">2</button>
    <button class="key" data-k="3">3</button>
    <button class="key op" data-k="+">+</button>

    <button class="key" data-k="0">0</button>
    <button class="key" data-k=".">.</button>
    <button class="key fn" data-k="B">⌫</button>
    <button class="key eq" data-k="=">=</button>
  </div>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:18px}
.screen{padding:20px 18px;border-radius:20px;background:#111;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;min-height:112px;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;overflow:hidden}
.expr{color:#999;font-size:14px;font-family:monospace;min-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.val{color:#fff;font-size:38px;font-family:monospace;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.val.flash{animation:pop .26s ease}
.keys{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.key{min-height:56px;border:0;border-radius:18px;background:#2a2a2a;color:#fff;font-size:20px;font-family:monospace;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .1s ease,box-shadow .1s ease}
.key:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.key.op{color:#d8d8d8}
.key.fn{color:#999;font-size:17px}
.key.eq{color:#fff;box-shadow:3px 3px 6px #000,-3px -3px 6px #222;background:#2a2a2a}
@keyframes pop{0%{transform:scale(.9);opacity:.6}100%{transform:scale(1);opacity:1}}`,
    js: `(function(){
  var keys=document.getElementById('keys');
  var exprEl=document.getElementById('expr');
  var valEl=document.getElementById('val');
  if(!keys||!exprEl||!valEl) return;
  var expr='';
  function safe(s){ return s.replace(/[^0-9+*/.%()-]/g,'') }
  function evaluate(s){
    if(!s) return '';
    try{
      var r=Function('"use strict";return ('+s+')')();
      if(typeof r!=='number'||!isFinite(r)) return '错误';
      return String(Math.round(r*1e10)/1e10);
    }catch(e){ return '错误' }
  }
  function render(flash){
    exprEl.textContent=expr;
    var out=evaluate(expr);
    valEl.textContent=out===''?'0':out;
    if(flash){ valEl.classList.remove('flash'); void valEl.offsetWidth; valEl.classList.add('flash') }
  }
  function press(k){
    if(k==='C'){ expr=''; render(); return }
    if(k==='B'){ expr=expr.slice(0,-1); render(); return }
    if(k==='='){ var r=evaluate(expr); if(r!==''){ expr=r==='错误'?'':r; } render(true); return }
    expr=safe(expr+k);
    render();
  }
  keys.querySelectorAll('.key').forEach(function(b){
    b.onclick=function(){ press(b.getAttribute('data-k')||'') };
  });
  render();
})();`,
  },

  // 8
  {
    id: 'tmpl_sticky',
    name: '便签墙',
    icon: '🗒️',
    category: '效率',
    description: '便签墙随手贴，灵感不再丢失',
    html: `<div class="app">
  <header class="hd">
    <h1>便签墙</h1>
    <button id="add" class="btn sm">＋ 新便签</button>
  </header>
  <div class="wall" id="wall"></div>
</div>
<div class="modal" id="modal">
  <div class="sheet">
    <textarea id="ta" class="field area" placeholder="写点什么…" maxlength="200"></textarea>
    <div class="modal-row">
      <button id="mdel" class="btn sm ghost">删除</button>
      <button id="msave" class="btn sm">保存</button>
      <button id="mclose" class="btn sm ghost">关闭</button>
    </div>
  </div>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:16px}
.hd{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.btn{min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.btn.sm{min-height:38px;padding:0 14px;font-size:13px;border-radius:12px}
.btn.ghost{color:#999}
.wall{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.sticky{position:relative;min-height:120px;padding:14px;border-radius:18px;background:#2a2a2a;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;cursor:pointer;overflow:hidden;transition:transform .16s ease,box-shadow .16s ease}
.sticky:hover{transform:translateY(-4px) rotate(0deg);box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a}
.sticky:active{transform:translateY(4px)}
.sticky p{margin:0;color:#ddd;font-size:14px;line-height:1.55;word-break:break-word;white-space:pre-wrap}
.s-time{position:absolute;left:14px;bottom:10px;color:#777;font-size:10px;font-family:monospace}
.s-fold{position:absolute;top:0;right:0;width:22px;height:22px;background:#111;border-radius:0 18px 0 14px;box-shadow:inset 2px 2px 4px #000}
.empty{grid-column:1/3;text-align:center;color:#666;font-size:13px;margin:12px 0;animation:pulse 2.6s ease-in-out infinite}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.72);display:none;align-items:flex-end;justify-content:center;padding:16px;z-index:50}
.modal.open{display:flex}
.sheet{width:100%;display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:22px;background:#2a2a2a;box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a;animation:rise .22s ease}
.field{width:100%;border:0;border-radius:16px;background:#111;color:#fff;padding:0 16px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none;font-family:inherit}
.field::placeholder{color:#666}
.area{min-height:140px;padding:14px 16px;line-height:1.6;resize:vertical}
.modal-row{display:flex;gap:10px;justify-content:flex-end}
@keyframes rise{0%{transform:translateY(24px);opacity:.4}100%{transform:translateY(0);opacity:1}}
@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`,
    js: `(function(){
  var KEY='mt_sticky';
  var wall=document.getElementById('wall');
  var addBtn=document.getElementById('add');
  var modal=document.getElementById('modal');
  var ta=document.getElementById('ta');
  var mdel=document.getElementById('mdel');
  var msave=document.getElementById('msave');
  var mclose=document.getElementById('mclose');
  if(!wall) return;
  var notes=[];
  try{ notes=JSON.parse(localStorage.getItem(KEY)||'[]')||[] }catch(e){ notes=[] }
  var curId=null;
  function saveLS(){ try{ localStorage.setItem(KEY,JSON.stringify(notes)) }catch(e){} }
  function p2(n){ return n<10?'0'+n:''+n }
  function fmt(ts){ var d=new Date(ts); return p2(d.getMonth()+1)+'-'+p2(d.getDate())+' '+p2(d.getHours())+':'+p2(d.getMinutes()) }
  function find(id){ for(var i=0;i<notes.length;i++){ if(notes[i].id===id) return notes[i] } return null }
  function openModal(id){
    curId=id;
    var n=find(id);
    if(ta) ta.value=n?(n.text||''):'';
    if(modal) modal.classList.add('open');
    if(ta) ta.focus();
  }
  function closeModal(){ if(modal) modal.classList.remove('open'); curId=null }
  function render(){
    wall.innerHTML='';
    if(!notes.length){ wall.innerHTML='<p class="empty">墙上空空，点右上角贴一张</p>'; return }
    notes.forEach(function(n){
      var card=document.createElement('div');
      card.className='sticky';
      card.style.transform='rotate('+(n.rot||0)+'deg)';
      var p=document.createElement('p'); p.textContent=(n.text||'').slice(0,200)||'（空白便签）';
      var t=document.createElement('span'); t.className='s-time'; t.textContent=fmt(n.ts);
      var fold=document.createElement('span'); fold.className='s-fold';
      card.appendChild(p); card.appendChild(t); card.appendChild(fold);
      card.onclick=function(){ openModal(n.id) };
      wall.appendChild(card);
    });
  }
  if(addBtn) addBtn.onclick=function(){
    var n={ id:'s'+Date.now()+Math.random().toString(36).slice(2,5), text:'', ts:Date.now(), rot:Math.round((Math.random()*6-3)) };
    notes.unshift(n); saveLS(); render(); openModal(n.id);
  };
  if(msave) msave.onclick=function(){
    var n=find(curId);
    if(n){ n.text=(ta?ta.value:''); n.ts=Date.now(); saveLS(); render() }
    closeModal();
  };
  if(mdel) mdel.onclick=function(){
    if(curId) notes=notes.filter(function(x){ return x.id!==curId });
    saveLS(); render(); closeModal();
  };
  if(mclose) mclose.onclick=closeModal;
  if(modal) modal.onclick=function(e){ if(e.target===modal) closeModal() };
  render();
})();`,
  },

  // 9
  {
    id: 'tmpl_currency',
    name: '汇率转换器',
    icon: '💱',
    category: '工具',
    description: '离线可编辑汇率的货币换算小工具',
    html: `<div class="app">
  <header class="hd">
    <h1>汇率换算</h1>
    <span class="count">以美元为基准</span>
  </header>
  <div class="result-box">
    <div class="res-label">换算结果</div>
    <div class="res" id="out">0.00</div>
    <div class="res-sub" id="sub">—</div>
  </div>
  <div class="convert">
    <input id="amount" class="field" type="number" inputmode="decimal" value="100" />
    <select id="from" class="field sel"></select>
    <button id="swap" class="btn swap">⇅</button>
    <select id="to" class="field sel"></select>
  </div>
  <details class="rates">
    <summary>编辑汇率（相对美元）</summary>
    <div id="rateList" class="list"></div>
  </details>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:16px}
.hd{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.count{font-size:12px;color:#999}
.result-box{padding:22px 20px;border-radius:24px;background:#2a2a2a;box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a;text-align:center;display:flex;flex-direction:column;gap:8px}
.res-label{font-size:13px;color:#999}
.res{font-family:monospace;font-size:36px;color:#fff;line-height:1.1;word-break:break-all;animation:pop .3s ease}
.res-sub{font-size:12px;color:#999;font-family:monospace}
.convert{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}
.field{min-height:44px;width:100%;border:0;border-radius:16px;background:#111;color:#fff;padding:0 14px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none;font-family:inherit}
.field::placeholder{color:#666}
#amount{grid-column:1/3}
.sel{appearance:none;-webkit-appearance:none;font-family:monospace}
.btn{min-height:44px;padding:0 16px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.swap{grid-column:1/3;justify-self:center;min-height:40px;padding:0 22px}
.rates{padding:14px 16px;border-radius:18px;background:#2a2a2a;box-shadow:3px 3px 6px #000,-3px -3px 6px #222}
.rates summary{cursor:pointer;color:#ddd;font-size:14px;list-style:none}
.rates summary::-webkit-details-marker{display:none}
.list{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.rate-row{display:flex;align-items:center;gap:12px}
.rate-code{width:52px;font-family:monospace;color:#fff;font-size:14px}
.rate-input{flex:1;min-height:38px;border:0;border-radius:12px;background:#111;color:#fff;padding:0 12px;font-size:14px;font-family:monospace;box-shadow:inset 4px 4px 8px #000,inset -4px -4px 8px #2a2a2a;outline:none}
@keyframes pop{0%{transform:scale(.96);opacity:.5}100%{transform:scale(1);opacity:1}}`,
    js: `(function(){
  var KEY='mt_currency_rates';
  var amount=document.getElementById('amount');
  var from=document.getElementById('from');
  var to=document.getElementById('to');
  var swap=document.getElementById('swap');
  var out=document.getElementById('out');
  var sub=document.getElementById('sub');
  var rateList=document.getElementById('rateList');
  if(!amount||!from||!to||!out) return;
  var CURRENCIES=['USD','CNY','EUR','JPY','GBP','HKD'];
  var DEFAULTS={ USD:1, CNY:7.2, EUR:0.92, JPY:150, GBP:0.79, HKD:7.8 };
  var rates={};
  try{ rates=JSON.parse(localStorage.getItem(KEY)||'null')||Object.assign({},DEFAULTS) }catch(e){ rates=Object.assign({},DEFAULTS) }
  CURRENCIES.forEach(function(c){ if(typeof rates[c]!=='number') rates[c]=DEFAULTS[c] });
  function persist(){ try{ localStorage.setItem(KEY,JSON.stringify(rates)) }catch(e){} }
  function fill(){
    from.innerHTML=''; to.innerHTML='';
    CURRENCIES.forEach(function(c){
      var o1=document.createElement('option'); o1.value=c; o1.textContent=c; from.appendChild(o1);
      var o2=document.createElement('option'); o2.value=c; o2.textContent=c; to.appendChild(o2);
    });
    from.value='CNY'; to.value='USD';
  }
  function conv(){
    var a=parseFloat(amount.value);
    if(isNaN(a)) a=0;
    var rf=rates[from.value]||1, rt=rates[to.value]||1;
    var r=a/rf*rt;
    out.textContent=(Math.round(r*100)/100).toFixed(2);
    if(sub) sub.textContent=a+' '+from.value+' = '+out.textContent+' '+to.value;
  }
  function renderRates(){
    rateList.innerHTML='';
    CURRENCIES.forEach(function(c){
      var row=document.createElement('div'); row.className='rate-row';
      var code=document.createElement('span'); code.className='rate-code'; code.textContent=c;
      var inp=document.createElement('input'); inp.className='rate-input'; inp.type='number'; inp.step='0.0001'; inp.value=String(rates[c]);
      inp.oninput=function(){ var v=parseFloat(inp.value); if(!isNaN(v)&&v>0){ rates[c]=v; persist(); conv() } };
      row.appendChild(code); row.appendChild(inp);
      rateList.appendChild(row);
    });
  }
  amount.oninput=conv;
  from.onchange=conv;
  to.onchange=conv;
  if(swap) swap.onclick=function(){ var t=from.value; from.value=to.value; to.value=t; conv() };
  fill(); renderRates(); conv();
})();`,
  },

  // 10
  {
    id: 'tmpl_vault',
    name: '密码保险箱',
    icon: '🔐',
    category: '工具',
    description: '本地保存账号密码的加密小保险箱',
    html: `<div class="app">
  <div id="gate" class="gate">
    <div class="lock-icon"><span class="shackle"></span><span class="lock-body"></span></div>
    <h2 id="gateTitle">设置主密码</h2>
    <input id="pw" class="field" type="password" placeholder="请设置主密码" />
    <button id="unlock" class="btn block">解锁</button>
    <p class="hint" id="hint">密码仅保存在本机浏览器，请牢记</p>
  </div>
  <div id="vault" class="vault" style="display:none">
    <header class="hd">
      <h1>保险箱</h1>
      <button id="lock" class="btn sm ghost">锁定</button>
    </header>
    <div class="form">
      <input id="title" class="field" placeholder="名称，如：邮箱" maxlength="24" />
      <input id="user" class="field" placeholder="账号" maxlength="48" />
      <input id="pass" class="field" type="password" placeholder="密码" maxlength="64" />
      <button id="saveEntry" class="btn block">保存到保险箱</button>
    </div>
    <div id="list" class="list"></div>
  </div>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:16px}
.hd{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.gate{display:flex;flex-direction:column;align-items:center;gap:16px;padding:28px 20px;border-radius:24px;background:#2a2a2a;box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a;text-align:center}
.vault{flex-direction:column;gap:16px}
.lock-icon{position:relative;width:56px;height:64px}
.shackle{position:absolute;top:0;left:50%;transform:translateX(-50%);width:32px;height:26px;border:6px solid #666;border-bottom:0;border-radius:18px 18px 0 0}
.lock-body{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:56px;height:44px;border-radius:12px;background:#111;box-shadow:6px 6px 12px #000,-5px -5px 10px #333}
.gate.shake{animation:shake .4s ease}
.gate h2{margin:0;font-size:18px;color:#fff}
.hint{font-size:12px;color:#999;margin:0}
.field{width:100%;min-height:44px;border:0;border-radius:16px;background:#111;color:#fff;padding:0 16px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none;font-family:inherit}
.field::placeholder{color:#666}
.btn{min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.btn.block{width:100%}
.btn.sm{min-height:38px;padding:0 14px;font-size:13px;border-radius:12px}
.btn.ghost{color:#999}
.form{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:20px;background:#2a2a2a;box-shadow:6px 6px 12px #000,-5px -5px 10px #333}
.list{display:flex;flex-direction:column;gap:10px}
.entry{display:flex;align-items:center;gap:12px;padding:14px;border-radius:16px;background:#2a2a2a;box-shadow:3px 3px 6px #000,-3px -3px 6px #222}
.entry-info{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
.entry-title{font-size:15px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.entry-sub{font-size:12px;color:#999;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mini{min-height:32px;padding:0 12px;border:0;border-radius:10px;background:#2a2a2a;color:#999;font-size:12px;cursor:pointer;box-shadow:3px 3px 6px #000,-3px -3px 6px #222}
.mini:active{transform:translateY(3px);color:#fff}
.empty{text-align:center;color:#666;font-size:13px;margin:6px 0}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`,
    js: `(function(){
  var KEY='mt_vault_entries';
  var CHECK='mt_vault_check';
  var gate=document.getElementById('gate');
  var gateTitle=document.getElementById('gateTitle');
  var pw=document.getElementById('pw');
  var unlock=document.getElementById('unlock');
  var hint=document.getElementById('hint');
  var vault=document.getElementById('vault');
  var lock=document.getElementById('lock');
  var titleEl=document.getElementById('title');
  var userEl=document.getElementById('user');
  var passEl=document.getElementById('pass');
  var saveBtn=document.getElementById('saveEntry');
  var list=document.getElementById('list');
  if(!gate||!pw||!unlock||!list) return;
  var hasCheck=false;
  try{ hasCheck=!!localStorage.getItem(CHECK) }catch(e){}
  if(gateTitle) gateTitle.textContent=hasCheck?'输入主密码':'设置主密码';
  if(hint) hint.textContent=hasCheck?'密码仅保存在本机，忘记无法找回':'密码仅保存在本机，请牢记';
  var key='';
  function shift(s,k){ var o=''; for(var i=0;i<s.length;i++){ o+=String.fromCharCode(s.charCodeAt(i)^k.charCodeAt(i%k.length)) } return o }
  function enc(s,k){ try{ return btoa(shift(encodeURIComponent(s),k)) }catch(e){ return '' } }
  function dec(t,k){ try{ return decodeURIComponent(shift(atob(t),k)) }catch(e){ return '' } }
  var entries=[];
  function loadEntries(){
    var raw='';
    try{ raw=localStorage.getItem(KEY)||'' }catch(e){ raw='' }
    var parsed=[];
    try{ parsed=JSON.parse(raw||'[]')||[] }catch(e){ parsed=[] }
    entries=parsed;
  }
  function persistEntries(){ try{ localStorage.setItem(KEY,JSON.stringify(entries)) }catch(e){} }
  function render(){
    list.innerHTML='';
    if(!entries.length){ list.innerHTML='<p class="empty">保险箱是空的</p>'; return }
    entries.forEach(function(en){
      var row=document.createElement('div'); row.className='entry';
      var info=document.createElement('div'); info.className='entry-info';
      var t=document.createElement('span'); t.className='entry-title'; t.textContent=dec(en.title,key)||'（无名称）';
      var s=document.createElement('span'); s.className='entry-sub';
      s.textContent='账号 '+(dec(en.user,key)||'-')+'  密码 '+(dec(en.pass,key)||'-');
      info.appendChild(t); info.appendChild(s);
      var del=document.createElement('button'); del.className='mini'; del.textContent='删除';
      del.onclick=function(){ entries=entries.filter(function(x){ return x.id!==en.id }); persistEntries(); render() };
      row.appendChild(info); row.appendChild(del);
      list.appendChild(row);
    });
  }
  function enter(){
    gate.style.display='none';
    if(vault) vault.style.display='flex';
    loadEntries(); render();
  }
  unlock.onclick=function(){
    var v=pw.value||'';
    if(!v) return;
    if(!hasCheck){
      try{ localStorage.setItem(CHECK,enc('MULIN_OK',v)) }catch(e){}
      hasCheck=true; key=v; pw.value=''; enter(); return;
    }
    var stored='';
    try{ stored=localStorage.getItem(CHECK)||'' }catch(e){ stored='' }
    if(enc('MULIN_OK',v)===stored){ key=v; pw.value=''; enter() }
    else {
      if(gate){ gate.classList.remove('shake'); void gate.offsetWidth; gate.classList.add('shake') }
      if(hint) hint.textContent='密码不正确，请重试';
    }
  };
  pw.addEventListener('keydown',function(e){ if(e.key==='Enter') unlock.click() });
  if(lock) lock.onclick=function(){
    key=''; entries=[]; list.innerHTML='';
    if(vault) vault.style.display='none';
    if(gate) gate.style.display='flex';
  };
  if(saveBtn) saveBtn.onclick=function(){
    var t=(titleEl?titleEl.value:'').trim();
    var u=(userEl?userEl.value:'').trim();
    var p=(passEl?passEl.value:'');
    if(!t&&!u&&!p) return;
    entries.unshift({ id:'v'+Date.now()+Math.random().toString(36).slice(2,5), title:enc(t,key), user:enc(u,key), pass:enc(p,key) });
    persistEntries(); render();
    if(titleEl) titleEl.value='';
    if(userEl) userEl.value='';
    if(passEl) passEl.value='';
  };
})();`,
  },

  // 11
  {
    id: 'tmpl_reading',
    name: '追剧读书',
    icon: '📚',
    category: '生活',
    description: '追踪读书观影进度与完成百分比',
    html: `<div class="app">
  <header class="hd">
    <h1>追剧读书</h1>
    <span class="count" id="cnt"></span>
  </header>
  <div class="form">
    <input id="title" class="field" placeholder="书名 / 剧名" maxlength="24" />
    <div class="input-row">
      <input id="total" class="field" type="number" min="1" placeholder="总集数 / 总页数" />
      <button id="add" class="btn">添加</button>
    </div>
  </div>
  <div id="list" class="list"></div>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:16px}
.hd{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.count{font-family:monospace;color:#999;font-size:13px}
.form{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:20px;background:#2a2a2a;box-shadow:6px 6px 12px #000,-5px -5px 10px #333}
.input-row{display:flex;gap:12px}
.field{flex:1;min-height:44px;width:100%;border:0;border-radius:16px;background:#111;color:#fff;padding:0 16px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none}
.field::placeholder{color:#666}
.btn{min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.list{display:flex;flex-direction:column;gap:14px}
.item{padding:16px;border-radius:20px;background:#2a2a2a;box-shadow:6px 6px 12px #000,-5px -5px 10px #333}
.i-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
.i-title{font-size:16px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.i-pct{font-family:monospace;font-size:13px;color:#d8d8d8}
.bar{height:12px;border-radius:10px;background:#111;box-shadow:inset 4px 4px 8px #000,inset -4px -4px 8px #2a2a2a;overflow:hidden;margin-bottom:12px}
.bar-fill{height:100%;width:0%;background:#fff;border-radius:10px;transition:width .32s ease}
.i-ctrl{display:flex;align-items:center;gap:10px}
.i-cur{font-family:monospace;color:#ddd;font-size:14px;min-width:74px;text-align:center}
.round-btn{width:40px;height:40px;border:0;border-radius:14px;background:#2a2a2a;color:#fff;font-size:20px;cursor:pointer;box-shadow:3px 3px 6px #000,-3px -3px 6px #222;transition:transform .12s ease}
.round-btn:active{transform:translateY(4px);box-shadow:1px 1px 3px #000}
.i-del{margin-left:auto;min-height:34px;padding:0 14px;border:0;border-radius:12px;background:#2a2a2a;color:#999;font-size:12px;cursor:pointer;box-shadow:3px 3px 6px #000,-3px -3px 6px #222}
.i-del:active{transform:translateY(3px);color:#fff}
.empty{text-align:center;color:#666;font-size:13px;margin:6px 0;animation:pulse 2.6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`,
    js: `(function(){
  var KEY='mt_reading';
  var titleEl=document.getElementById('title');
  var totalEl=document.getElementById('total');
  var add=document.getElementById('add');
  var list=document.getElementById('list');
  var cnt=document.getElementById('cnt');
  if(!titleEl||!totalEl||!add||!list) return;
  var items=[];
  try{ items=JSON.parse(localStorage.getItem(KEY)||'[]')||[] }catch(e){ items=[] }
  function saveLS(){ try{ localStorage.setItem(KEY,JSON.stringify(items)) }catch(e){} }
  function render(){
    list.innerHTML='';
    if(!items.length){ list.innerHTML='<p class="empty">还没有记录，添加一个开始追踪</p>' }
    if(cnt) cnt.textContent='共 '+items.length+' 部';
    items.forEach(function(it){
      var total=it.total>0?it.total:1;
      var pct=Math.min(100,Math.round(it.cur/total*100));
      var card=document.createElement('div'); card.className='item';
      var top=document.createElement('div'); top.className='i-top';
      var t=document.createElement('span'); t.className='i-title'; t.textContent=it.title;
      var p=document.createElement('span'); p.className='i-pct'; p.textContent=pct+'%';
      top.appendChild(t); top.appendChild(p);
      var bar=document.createElement('div'); bar.className='bar';
      var fill=document.createElement('div'); fill.className='bar-fill'; fill.style.width=pct+'%';
      bar.appendChild(fill);
      var ctrl=document.createElement('div'); ctrl.className='i-ctrl';
      var minus=document.createElement('button'); minus.className='round-btn'; minus.textContent='−';
      minus.onclick=function(){ it.cur=Math.max(0,it.cur-1); saveLS(); render() };
      var cur=document.createElement('span'); cur.className='i-cur'; cur.textContent=it.cur+' / '+it.total;
      var plus=document.createElement('button'); plus.className='round-btn'; plus.textContent='+';
      plus.onclick=function(){ it.cur=Math.min(it.total,it.cur+1); saveLS(); render() };
      var del=document.createElement('button'); del.className='i-del'; del.textContent='删除';
      del.onclick=function(){ items=items.filter(function(x){ return x.id!==it.id }); saveLS(); render() };
      ctrl.appendChild(minus); ctrl.appendChild(cur); ctrl.appendChild(plus); ctrl.appendChild(del);
      card.appendChild(top); card.appendChild(bar); card.appendChild(ctrl);
      list.appendChild(card);
    });
  }
  function addItem(){
    var v=(titleEl.value||'').trim();
    var n=parseInt(totalEl.value,10);
    if(!v||isNaN(n)||n<1) return;
    items.unshift({ id:'r'+Date.now()+Math.random().toString(36).slice(2,5), title:v, total:n, cur:0 });
    titleEl.value=''; totalEl.value=''; saveLS(); render();
  }
  add.onclick=addItem;
  render();
})();`,
  },

  // 12
  {
    id: 'tmpl_dice',
    name: '随机抽签',
    icon: '🎲',
    category: '娱乐',
    description: '输入选项随机抽取幸运结果',
    html: `<div class="app">
  <header class="hd">
    <h1>随机抽签</h1>
    <span class="count" id="n">0 项</span>
  </header>
  <div class="stage">
    <div class="result" id="result">准备好了吗</div>
  </div>
  <textarea id="opts" class="field area" placeholder="每行一个选项，例如&#10;火锅&#10;烧烤&#10;日料"></textarea>
  <button id="draw" class="btn block">抽一个</button>
  <div id="hist" class="hist"></div>
</div>`,
    css: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;min-height:100vh;background:linear-gradient(160deg,#000 0%,#1a1a1a 50%,#0a0a0a 100%);color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:18px 16px 28px}
.app{width:100%;display:flex;flex-direction:column;gap:16px}
.hd{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:4px}
.hd h1{margin:0;font-size:20px;letter-spacing:1px}
.count{font-family:monospace;color:#999;font-size:13px}
.stage{display:flex;align-items:center;justify-content:center;min-height:150px;border-radius:24px;background:#2a2a2a;box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a;padding:24px}
.result{font-size:28px;color:#fff;text-align:center;word-break:break-all}
.result.done{animation:pop .34s ease}
.result.rolling{animation:shake .12s linear infinite}
.field{width:100%;border:0;border-radius:16px;background:#111;color:#fff;padding:0 16px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none;font-family:inherit}
.field::placeholder{color:#666}
.area{min-height:110px;padding:14px 16px;line-height:1.6;resize:vertical}
.btn{min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}
.btn.block{width:100%}
.hist{display:flex;flex-wrap:wrap;gap:8px}
.chip{padding:7px 12px;border-radius:12px;background:#2a2a2a;color:#bbb;font-size:12px;box-shadow:3px 3px 6px #000,-3px -3px 6px #222}
@keyframes pop{0%{transform:scale(.8);opacity:.5}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
@keyframes shake{0%{transform:translateX(-3px)}50%{transform:translateX(3px)}100%{transform:translateX(-3px)}}`,
    js: `(function(){
  var OKEY='mt_dice_opts';
  var HKEY='mt_dice_hist';
  var result=document.getElementById('result');
  var opts=document.getElementById('opts');
  var draw=document.getElementById('draw');
  var hist=document.getElementById('hist');
  var n=document.getElementById('n');
  if(!result||!opts||!draw) return;
  var history=[];
  try{ history=JSON.parse(localStorage.getItem(HKEY)||'[]')||[] }catch(e){ history=[] }
  var rolling=false;
  function parseOptions(){
    var lines=(opts.value||'').split(String.fromCharCode(10));
    var out=[];
    for(var i=0;i<lines.length;i++){ var s=lines[i].trim(); if(s) out.push(s) }
    return out;
  }
  function count(){ if(n) n.textContent=parseOptions().length+' 项' }
  function renderHist(){
    if(!hist) return;
    hist.innerHTML='';
    history.slice(0,10).forEach(function(h){
      var c=document.createElement('span'); c.className='chip'; c.textContent=h.label;
      hist.appendChild(c);
    });
  }
  function persistHist(){ try{ localStorage.setItem(HKEY,JSON.stringify(history)) }catch(e){} }
  function persistOpts(){ try{ localStorage.setItem(OKEY,opts.value||'') }catch(e){} }
  function pick(){
    if(rolling) return;
    var list=parseOptions();
    if(!list.length){ result.textContent='先写几个选项吧'; result.className='result done'; return }
    persistOpts();
    rolling=true;
    result.className='result rolling';
    var ticks=0;
    var timer=setInterval(function(){
      result.textContent=list[Math.floor(Math.random()*list.length)];
      ticks++;
      if(ticks>=12){
        clearInterval(timer);
        var ans=list[Math.floor(Math.random()*list.length)];
        result.textContent=ans;
        result.className='result done';
        rolling=false;
        history.unshift({ label:ans, ts:Date.now() });
        history=history.slice(0,30);
        persistHist(); renderHist();
      }
    },70);
  }
  try{ var saved=localStorage.getItem(OKEY); if(saved) opts.value=saved }catch(e){}
  opts.addEventListener('input',function(){ persistOpts(); count() });
  draw.onclick=pick;
  count(); renderHist();
})();`,
  },
]

export const SNIPPET_LIBRARY: { name: string; type: 'html' | 'css' | 'js'; tags: string[]; description: string; code: string }[] = [
  {
    name: '厚块按钮',
    type: 'css',
    tags: ['按钮', '交互', '厚块', 'neumorphism'],
    description: '凸起厚块按钮，按下时块面下压并减弱阴影',
    code: `.btn-thick{min-height:44px;padding:0 20px;border:0;border-radius:18px;background:#2a2a2a;color:#fff;font-size:15px;cursor:pointer;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;transition:transform .12s ease,box-shadow .12s ease}
.btn-thick:hover{box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a}
.btn-thick:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}`,
  },
  {
    name: '卡片容器',
    type: 'css',
    tags: ['卡片', '容器', '布局'],
    description: '统一的中景凸起卡片，用于承载内容区块',
    code: `.card{padding:18px;border-radius:20px;background:#2a2a2a;box-shadow:6px 6px 12px #000,-5px -5px 10px #333}
.card-title{margin:0 0 8px;font-size:16px;color:#fff;letter-spacing:.5px}
.card-desc{margin:0;font-size:13px;color:#999;line-height:1.6}`,
  },
  {
    name: '悬浮动效',
    type: 'css',
    tags: ['动效', '悬浮', '交互'],
    description: '悬停上浮、按下下压的通用交互动效类',
    code: `.hover-lift{transition:transform .18s ease,box-shadow .18s ease}
.hover-lift:hover{transform:translateY(-3px);box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a}
.hover-lift:active{transform:translateY(4px);box-shadow:2px 2px 5px #000,-2px -2px 4px #333}`,
  },
  {
    name: '渐变文字',
    type: 'css',
    tags: ['文字', '渐变', '标题'],
    description: '黑白渐变文字，用于强调标题或数字',
    code: `.gradient-text{background:linear-gradient(120deg,#fff 0%,#d8d8d8 45%,#666 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:700;letter-spacing:1px}`,
  },
  {
    name: '输入框样式',
    type: 'css',
    tags: ['输入框', '表单', '凹陷'],
    description: '凹陷式输入框，聚焦时描白边以示强调',
    code: `.input-thick{width:100%;min-height:44px;border:0;border-radius:16px;background:#111;color:#fff;padding:0 16px;font-size:15px;box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a;outline:none;font-family:inherit;transition:box-shadow .18s ease}
.input-thick::placeholder{color:#666}
.input-thick:focus{box-shadow:inset 6px 6px 12px #000,inset -6px -6px 12px #2a2a2a,0 0 0 1px #fff}`,
  },
  {
    name: 'Toast 提示',
    type: 'js',
    tags: ['提示', 'Toast', '反馈'],
    description: '底部浮起的轻提示，自动消失，可重复调用',
    code: `function showToast(msg,dur){
  dur=dur||1800;
  var old=document.getElementById('mt-toast');
  if(old&&old.parentNode) old.parentNode.removeChild(old);
  var t=document.createElement('div');
  t.id='mt-toast';
  t.textContent=String(msg);
  t.style.cssText='position:fixed;left:50%;bottom:48px;transform:translateX(-50%);background:#2a2a2a;color:#fff;padding:12px 20px;border-radius:16px;font-size:14px;box-shadow:6px 6px 12px #000,-5px -5px 10px #333;z-index:9999;opacity:0;transition:opacity .25s ease,transform .25s ease';
  document.body.appendChild(t);
  requestAnimationFrame(function(){ t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(-6px)' });
  setTimeout(function(){ t.style.opacity='0'; setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t) },300) },dur);
}`,
  },
  {
    name: '防抖函数',
    type: 'js',
    tags: ['工具函数', '防抖', '性能'],
    description: '高频事件延迟执行，降低回调触发频率',
    code: `function debounce(fn,wait){
  wait=(wait==null)?300:wait;
  var timer=null;
  return function(){
    var ctx=this,args=arguments;
    if(timer) clearTimeout(timer);
    timer=setTimeout(function(){ fn.apply(ctx,args) },wait);
  };
}`,
  },
  {
    name: '格式化时间',
    type: 'js',
    tags: ['工具函数', '时间', '格式化'],
    description: '把时间戳格式化为日期，可选附带时分',
    code: `function formatTime(ts,withTime){
  var d=new Date(ts);
  if(isNaN(d.getTime())) return '';
  function p(n){ return n<10?'0'+n:''+n }
  var date=d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  if(!withTime) return date;
  return date+' '+p(d.getHours())+':'+p(d.getMinutes());
}`,
  },
  {
    name: '随机 id',
    type: 'js',
    tags: ['工具函数', 'id', '随机'],
    description: '生成带前缀的短随机 id，适合本地列表主键',
    code: `function uid(prefix){
  prefix=prefix||'id';
  return prefix+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
}`,
  },
  {
    name: '深拷贝',
    type: 'js',
    tags: ['工具函数', '深拷贝', '对象'],
    description: '递归克隆对象与数组，处理 Date 类型',
    code: `function deepClone(v){
  if(v==null||typeof v!=='object') return v;
  if(v instanceof Date) return new Date(v.getTime());
  if(Array.isArray(v)) return v.map(deepClone);
  var out={};
  for(var k in v){ if(Object.prototype.hasOwnProperty.call(v,k)) out[k]=deepClone(v[k]) }
  return out;
}`,
  },
  {
    name: '类型判断',
    type: 'js',
    tags: ['工具函数', '类型', '判断'],
    description: '判断 null、数组、纯对象与空值的一组小函数',
    code: `function typeOf(v){
  if(v===null) return 'null';
  if(v===undefined) return 'undefined';
  if(Array.isArray(v)) return 'array';
  return typeof v;
}
function isPlainObject(v){ return Object.prototype.toString.call(v)==='[object Object]'; }
function isEmpty(v){ if(v==null) return true; if(typeof v==='string'||Array.isArray(v)) return v.length===0; if(typeof v==='object') return Object.keys(v).length===0; return false }`,
  },
  {
    name: 'SVG 图标片段',
    type: 'html',
    tags: ['图标', 'SVG', '组件'],
    description: '纯描边风格的内联 SVG 图标，继承文字颜色',
    code: `<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 5v14M5 12h14" />
</svg>
<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="8" />
  <path d="M12 8v4l3 2" />
</svg>`,
  },
]