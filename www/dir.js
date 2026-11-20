/* =====================================================================
   فواتح ومناسبات IBRA — الدليل العام، النشر، الإشعارات، التحديث، الإدارة
   ===================================================================== */
(function(){
const CFG=window.APP_CONFIG||{};
const VERSION=CFG.version||'1.0.0';
const $=id=>document.getElementById(id);

/* ---------- ثوابت ---------- */
const KINDS={fatiha:['🕊️','فاتحة'],majlis:['🏴','مجلس حسيني'],memorial:['🕯️','ذكرى / أربعينية'],religious:['🌙','مناسبة دينية'],wedding:['💍','عرس'],tuhur:['🎉','طهور'],engagement:['💐','خطوبة'],birth:['👶','مولود'],hajj:['🕋','رجعة حج/عمرة'],other:['📌','مناسبة']};
const GROUPS={sorrow:['fatiha','majlis','memorial'],joy:['wedding','tuhur','engagement','birth','hajj'],relig:['majlis','religious']};
const SORROW=k=>GROUPS.sorrow.includes(k);
const JOY=k=>GROUPS.joy.includes(k);
const kcls=k=>JOY(k)?'joy':k==='religious'?'rel':'';
const WEB=(CFG.webUrl||'https://ibrata2.github.io/ibra-fawateh/').replace(/\/?$/,'/');
const evLink=id=>WEB+'?e='+id;
const VENUES={house:['🏠','دار / بيت'],husseiniya:['🕌','حسينية'],mosque:['🕌','جامع'],hall:['🏛️','قاعة'],madhif:['⛺','مضيف'],other:['📍','مكان آخر']};
const PROVINCES=['بغداد','البصرة','نينوى','أربيل','النجف','كربلاء','بابل','ذي قار','ميسان','واسط','الديوانية','المثنى','الأنبار','ديالى','صلاح الدين','كركوك','السليمانية','دهوك','حلبجة','خارج العراق'];
const TITLE_LABEL={fatiha:'اسم المرحوم / المرحومة',majlis:'عنوان المجلس أو صاحبه',memorial:'اسم المرحوم / المرحومة',religious:'اسم المناسبة',wedding:'اسم العريس (أو صاحب العرس)',tuhur:'اسم الطفل أو صاحب المناسبة',engagement:'اسم صاحب المناسبة',birth:'اسم المولود أو الأب',hajj:'اسم الحاج / المعتمر',other:'اسم صاحب المناسبة'};
const TITLE_PH={fatiha:'مثال: المرحوم الحاج علي حسين',majlis:'مثال: مجلس عزاء الإمام الحسين (ع) — دار الحاج كاظم',memorial:'مثال: أربعينية المرحوم علي حسين',religious:'مثال: مولد الإمام علي (ع)',wedding:'مثال: عرس حيدر علي',tuhur:'مثال: طهور محمد ابن علي',engagement:'مثال: خطوبة مصطفى',birth:'مثال: مولود أبو حسين',hajj:'مثال: الحاج كاظم جبار',other:'مثال: مناسبة آل فلان'};

/* ---------- حالة محلية ---------- */
function st(){ if(!db.dir) db.dir={}; const d=db.dir;
  d.token=d.token||(uid()+uid()+uid()); d.mine=d.mine||{}; d.seen=d.seen||{}; d.cache=d.cache||[];
  d.notif=d.notif||{on:true,radius:10,province:'',area:'',tribes:[],kinds:'all',lat:null,lng:null};
  d.filter=d.filter||{q:'',kind:'',province:'',venue:'',sort:'date'}; d.profile=d.profile||{name:'',phone:''}; d.received=d.received||{}; d.privCache=d.privCache||{}; return d }
let EVENTS=[], LOADING=false, LAST_ERR='', REMOTE={};

/* ---------- أدوات ---------- */
const norm=s=>String(s||'').replace(/[ً-ْٰـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').toLowerCase().trim();
const tday=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const dS=d=>d?String(d).slice(0,10).split('-').reverse().join('/'):'';
function rangeTxt(e){const f=String(e.date_from).slice(0,10),t=String(e.date_to||'').slice(0,10);return t&&t!==f?`من ${dS(f)} إلى ${dS(t)}`:dS(f)}
function dist(a,b,c,d){const R=6371,r=x=>x*Math.PI/180;const dl=r(c-a),dn=r(d-b);const h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function parseLoc(u){u=String(u||'').trim();if(!u)return null;
  let m=u.match(/^\s*(-?\d{1,3}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)\s*$/)||u.match(/[?&](?:q|ll|query|destination|center)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/)||u.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/)||u.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  return m?{lat:+m[1],lng:+m[2]}:null}
const mapUrl=e=>e.lat!=null&&e.lng!=null?`https://maps.google.com/?q=${e.lat},${e.lng}`:(e.loc_url||'');
function errTxt(m){m=String(m||'');
  if(m.includes('rate_limit'))return 'نشرت كثير خلال ساعة، حاول بعد شوية';
  if(m.includes('busy'))return 'السيرفر مشغول، حاول بعد دقائق';
  if(m.includes('date_range'))return 'تاريخ غير صحيح (المدة لا تزيد عن 30 يوم، والنهاية بعد البداية)';
  if(m.includes('not_admin'))return 'كود الإدارة غير صحيح';
  if(m.includes('Failed to fetch')||m.includes('NetworkError')||m.includes('Load failed'))return 'ما اكو اتصال بالإنترنت';
  if(m.includes('check constraint'))return 'تأكد من البيانات المكتوبة';
  return 'صار خطأ: '+m.slice(0,120)}
const configured=()=>!!(CFG.supabaseUrl&&CFG.supabaseKey);
async function rpc(fn,args){
  const h={'Content-Type':'application/json',apikey:CFG.supabaseKey};
  if(!/^sb_/.test(CFG.supabaseKey))h.Authorization='Bearer '+CFG.supabaseKey;
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),20000);
  try{const r=await fetch(`${CFG.supabaseUrl.replace(/\/$/,'')}/rest/v1/rpc/${fn}`,{method:'POST',headers:h,body:JSON.stringify(args||{}),signal:ctl.signal});
    const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null}catch(_){}
    if(!r.ok)throw new Error((j&&(j.message||j.hint))||txt||('HTTP '+r.status));
    return j}catch(e){if(e.name==='AbortError')throw new Error('Failed to fetch');throw e}finally{clearTimeout(t)}}
function locNow(){return new Promise((res,rej)=>{if(!navigator.geolocation)return rej(new Error('nogeo'));
  navigator.geolocation.getCurrentPosition(p=>res({lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6)}),rej,{enableHighAccuracy:true,timeout:15000,maximumAge:120000})})}
function platform(){if(isNative&&Cap.getPlatform)return Cap.getPlatform();if(/Electron/i.test(navigator.userAgent))return 'windows';return 'web'}

/* ---------- تحميل المناسبات ---------- */
async function loadEvents(silent){
  const d=st();
  if(!configured()){EVENTS=[];LAST_ERR='config';renderDir();return}
  if(LOADING)return;LOADING=true;if(!silent)renderDir();
  try{const rows=await rpc('list_events',{});EVENTS=rows||[];d.cache=EVENTS;d.cacheAt=Date.now();LAST_ERR='';save();checkNotify();
    const extra=[...Object.keys(d.mine),...Object.keys(d.received)].filter(id=>!EVENTS.find(e=>e.id===id));
    for(const id of extra.slice(0,20)){const e=await fetchEv(id);if(!e){delete d.received[id]}}save();}
  catch(e){LAST_ERR=errTxt(e.message);if(!EVENTS.length)EVENTS=d.cache||[]}
  finally{LOADING=false;renderDir()}}
async function loadConfig(){if(!configured())return;
  try{const rows=await rpc('get_config',{});REMOTE={};(rows||[]).forEach(r=>REMOTE[r.key]=r.value);
    window.REMOTE_LINK=REMOTE.download_link||'';st().remote=REMOTE;save();renderDir();renderSettings()}catch(e){REMOTE=st().remote||{};window.REMOTE_LINK=REMOTE.download_link||''}}

/* ---------- الدليل: الواجهة ---------- */
function visible(){
  const d=st(),f=d.filter,today=tday(),q=norm(f.q).split(/\s+/).filter(Boolean);
  let list=EVENTS.filter(e=>e.visibility!=='private'&&String(e.date_to).slice(0,10)>=today);
  if(GROUPS[f.kind])list=list.filter(e=>GROUPS[f.kind].includes(e.kind));else if(f.kind)list=list.filter(e=>e.kind===f.kind);
  if(f.province)list=list.filter(e=>e.province===f.province);
  if(f.venue)list=list.filter(e=>e.venue_type===f.venue);
  if(q.length)list=list.filter(e=>{const h=norm([e.title,e.tribe,e.province,e.area,e.venue,e.note,KINDS[e.kind]?.[1],VENUES[e.venue_type]?.[1]].join(' '));return q.every(w=>h.includes(w))});
  const me=d.notif;list.forEach(e=>{e._d=(me.lat!=null&&e.lat!=null)?dist(me.lat,me.lng,e.lat,e.lng):null});
  const now=e=>String(e.date_from).slice(0,10)<=today;
  if(f.sort==='near'&&me.lat!=null)list.sort((a,b)=>(a._d??1e9)-(b._d??1e9));
  else if(f.sort==='new')list.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  else list.sort((a,b)=>(now(b)-now(a))||String(a.date_from).localeCompare(String(b.date_from)));
  return list}
function evCard(e){
  const d=st(),mine=!!d.mine[e.id],k=KINDS[e.kind]||KINDS.other,v=VENUES[e.venue_type],today=tday();
  const live=String(e.date_from).slice(0,10)<=today;
  const loc=mapUrl(e);
  return `<div class="ev ${mine?'mine':''}">
   <span class="st ${live?'now':'soon'}">${live?'● اليوم':'قادمة'}</span>
   <span class="k ${kcls(e.kind)}">${k[0]} ${k[1]}</span>${e.visibility==='private'?' <span class="k" style="background:var(--card2);color:var(--muted);border-color:var(--line)">🔒 خاصة</span>':''}
   <h3>${esc(e.title)}</h3>
   ${e.tribe?`<div class="m" style="color:var(--gold)">🏷️ ${esc(e.tribe)}</div>`:''}
   <div class="m">📍 ${esc(e.province)}${e.area?' · '+esc(e.area):''}${e._d!=null?` · <b style="color:var(--text)">${e._d<1?Math.round(e._d*1000)+' م':e._d.toFixed(1)+' كم'}</b>`:''}</div>
   ${(v||e.venue)?`<div class="m">${v?v[0]+' '+v[1]:'📍'}${e.venue?' — '+esc(e.venue):''}</div>`:''}
   <div class="m">📅 ${rangeTxt(e)}${e.time_text?' · ⏰ '+esc(e.time_text):''}</div>
   ${e.note?`<div class="m">📝 ${esc(e.note)}</div>`:''}
   ${e.poster_name?`<div class="m" style="font-size:11px">👤 نشرها: ${esc(e.poster_name)}</div>`:''}
   <div class="actions">
     ${e.lat!=null?`<button class="btn grn sm" onclick="DIR.viewMap('${e.id}')">🗺️ الموقع</button>`:loc?`<button class="btn grn sm" onclick="DIR.open('${esc(loc)}')">🗺️ الموقع</button>`:''}
     ${e.contact?`<a class="btn sec sm" href="tel:${esc(e.contact)}">📞 اتصال</a>`:''}
     <button class="btn sec sm" onclick="DIR.share('${e.id}')">📤 مشاركة</button>
     ${mine||e.visibility==='private'?`<button class="btn sec sm" onclick="DIR.copyLink('${e.id}')">🔗 الرابط</button>`:''}
     ${mine?`<button class="btn sec sm" onclick="DIR.edit('${e.id}')">✏️ تعديل</button><button class="btn red sm" onclick="DIR.del('${e.id}')">🗑️</button>`
           :`<button class="btn sec sm" onclick="DIR.report('${e.id}')" title="إبلاغ">🚩</button>`}
   </div></div>`}
function renderDir(){
  const root=$('dirRoot');if(!root)return;const d=st(),f=d.filter;
  const list=visible();
  const chip=(val,label)=>`<button class="chip ${f.kind===val?'on':''}" onclick="DIR.setF('kind','${val}')">${label}</button>`;
  root.innerHTML=`
   ${REMOTE.announcement?`<div class="banner">📢 ${esc(REMOTE.announcement)}</div>`:''}
   <div class="card" style="padding:12px">
     <input class="bigsearch" id="dirQ" placeholder="🔍 ابحث باسم المرحوم، صاحب المناسبة، العشيرة، المنطقة..." value="${esc(f.q)}" oninput="DIR.q(this.value)">
     <div class="chips" style="margin-top:10px">${chip('','الكل')}${chip('sorrow','🕊️ أحزان')}${chip('joy','🎊 أفراح')}${chip('majlis','🏴 مجالس حسينية')}${chip('relig','🌙 دينية')}${chip('fatiha','فواتح')}${chip('memorial','🕯️ أربعينيات')}${chip('wedding','💍 أعراس')}${chip('tuhur','🎉 طهور')}${chip('engagement','💐 خطوبة')}${chip('birth','👶 مواليد')}${chip('hajj','🕋 حج')}</div>
     <div class="row" style="margin-top:8px;gap:6px">
       <select onchange="DIR.setF('province',this.value)" style="min-width:110px"><option value="">كل المحافظات</option>${PROVINCES.map(p=>`<option ${f.province===p?'selected':''}>${p}</option>`).join('')}</select>
       <select onchange="DIR.setF('venue',this.value)" style="min-width:110px"><option value="">كل الأماكن</option>${Object.entries(VENUES).map(([k,v])=>`<option value="${k}" ${f.venue===k?'selected':''}>${v[0]} ${v[1]}</option>`).join('')}</select>
       <select onchange="DIR.sort(this.value)" style="min-width:110px">
         <option value="date" ${f.sort==='date'?'selected':''}>📅 حسب الموعد</option>
         <option value="near" ${f.sort==='near'?'selected':''}>📍 الأقرب لي</option>
         <option value="new" ${f.sort==='new'?'selected':''}>🆕 الأحدث نشراً</option></select>
     </div>
   </div>
   <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin:4px 2px 8px;font-size:12px;color:var(--muted)">
     <span>${LOADING?'⏳ جاري التحديث...':`${list.length} مناسبة`}${d.cacheAt&&!LOADING?'<br><small style="font-size:10px">آخر تحديث '+new Date(d.cacheAt).toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'})+'</small>':''}</span>
     <span style="display:flex;gap:4px;flex-shrink:0"><button class="btn sec sm" onclick="DIR.mapAll()">🗺️ خريطة</button><button class="btn sec sm" onclick="DIR.openLinkBox()" title="فتح رابط مناسبة">🔗 رابط</button><button class="btn sec sm" onclick="DIR.reload()" title="تحديث">🔄</button></span>
   </div>
   ${LAST_ERR==='config'?`<div class="banner">⚙️ الدليل العام قيد التجهيز. دفتر الفضل يشتغل عادي.</div>`:LAST_ERR?`<div class="banner">⚠️ ${esc(LAST_ERR)}${EVENTS.length?' — تعرض آخر نسخة محفوظة':''}</div>`:''}
   ${receivedHtml()}
   ${list.length?list.map(evCard).join(''):`<div class="empty">${LOADING?'':(f.q||f.kind||f.province||f.venue)?'ما لكينا نتائج — جرّب كلمة ثانية أو شيل الفلاتر':'ما اكو مناسبات منشورة حالياً.<br><br><button class="btn" onclick="go(\'post\')">📢 انشر أول مناسبة</button>'}</div>`}`;
  const qi=$('dirQ');if(qi&&DIR._focus){qi.focus();qi.setSelectionRange(qi.value.length,qi.value.length)}}

function receivedHtml(){const d=st(),today=tday();
  const rec=Object.keys(d.received).map(id=>d.privCache[id]).filter(e=>e&&String(e.date_to).slice(0,10)>=today&&!EVENTS.find(x=>x.id===e.id));
  return rec.length?`<h2 style="font-size:15px">🔗 مناسبات وصلتني بالرابط</h2>${rec.map(evCard).join('')}<h2 style="font-size:15px;margin-top:6px">🌍 الدليل العام</h2>`:''}
async function fetchEv(id){try{const r=await rpc('get_event',{p_id:id});const e=Array.isArray(r)?r[0]:r;if(e){st().privCache[id]=e;save()}return e||null}catch(e){return st().privCache[id]||null}}
async function openById(id){if(!/^[0-9a-f-]{36}$/i.test(id))return;
  go('dir');toast('جاري فتح المناسبة...');const e=await fetchEv(id);
  if(!e)return showSheet('المناسبة غير موجودة','<p style="color:var(--muted);padding:10px">يمكن انتهت أو انحذفت من صاحبها.</p>');
  const d=st();if(!d.mine[id]){d.received[id]=Date.now();save()}
  const inApp=isNative||/Electron/i.test(navigator.userAgent);
  showSheet((KINDS[e.kind]||KINDS.other)[1],evCard(e)+(inApp?'':`<div class="banner" style="margin-top:8px">📲 حمّل تطبيق <b>فواتح ومناسبات</b> حتى توصلك المناسبات وتحفظ دفتر الفضل
    <div class="actions"><a class="btn sm" href="fawateh://e/${id}">فتح بالتطبيق</a><a class="btn sec sm" href="${esc(appLink())}" target="_blank">⬇️ تحميل التطبيق</a></div></div>`));renderDir()}
function idFromUrl(u){const m=String(u||'').match(/[?&]e=([0-9a-f-]{36})/i)||String(u||'').match(/\/e\/([0-9a-f-]{36})/i);return m?m[1]:null}

/* ---------- النشر ---------- */
let EDIT_ID=null;
function renderPost(e){
  const root=$('postRoot');if(!root)return;e=e||{};const kind=e.kind||'fatiha';
  root.innerHTML=`
   <div class="card">
     <h2>${EDIT_ID?'✏️ تعديل المناسبة':'📢 نشر مناسبة بالدليل العام'}</h2>
     <p style="font-size:12px;color:var(--muted);margin-bottom:10px">يشوفها كل مستخدمين التطبيق، وتختفي تلقائياً بعد انتهاء موعدها.</p>
     <div class="mb"><label>من يشوف المناسبة؟</label>
       <div class="seg" id="pkVisSeg"><button type="button" class="${(e.visibility||'public')==='public'?'on':''}" onclick="DIR.vis('public')">🌍 عامة بالدليل</button><button type="button" class="${e.visibility==='private'?'on':''}" onclick="DIR.vis('private')">🔒 خاصة بالرابط</button></div>
       <input type="hidden" id="pkVis" value="${e.visibility||'public'}">
       <small id="pkVisHint" style="color:var(--muted);font-size:11px;display:block;margin-top:4px">${e.visibility==='private'?'ما تظهر بالدليل. بعد النشر ترسل رابطها بس للناس اللي تريدهم.':'تظهر لكل المستخدمين بالبحث، وتوصل إشعاراتها للقريبين.'}</small></div>
     <div class="mb" id="pkReachBox" style="${e.visibility==='private'?'display:none':''}"><label>توصل إشعاراتها للي ساكنين ضمن</label>
       <select id="pkReach">${[['2','2 كم (نفس المنطقة)'],['5','5 كم'],['10','10 كم'],['25','25 كم'],['50','50 كم (المحافظة)'],['','بدون حد']].map(([v,l])=>`<option value="${v}" ${String(e.reach_km??'10')===v?'selected':''}>${l}</option>`).join('')}</select>
       <small style="color:var(--muted);font-size:11px">والمتلقي هم يحدد مسافته، فالإشعار يوصل للي ضمن المسافتين. البحث بالاسم يلكاها أي شخص.</small></div>
     <div class="mb"><label>نوع المناسبة</label><div class="chips" id="pkChips">${Object.entries(KINDS).map(([k,v])=>`<button type="button" class="chip ${k===kind?'on':''}" data-k="${k}" onclick="DIR.pk('${k}')">${v[0]} ${v[1]}</button>`).join('')}</div></div>
     <input type="hidden" id="pkKind" value="${kind}">
     <div class="mb"><label id="pkTitleL">${TITLE_LABEL[kind]} *</label><input id="pkTitle" maxlength="120" placeholder="${TITLE_PH[kind]}" value="${esc(e.title||'')}"></div>
     <div class="mb"><label>العشيرة</label><input id="pkTribe" maxlength="80" placeholder="مثال: آل فلان" value="${esc(e.tribe||'')}"></div>
     <div class="row mb">
       <div><label>المحافظة *</label><select id="pkProv">${PROVINCES.map(p=>`<option ${(e.province||st().notif.province||'بغداد')===p?'selected':''}>${p}</option>`).join('')}</select></div>
       <div><label>المنطقة</label><input id="pkArea" maxlength="80" placeholder="مثال: بغداد الجديدة" value="${esc(e.area||'')}"></div>
     </div>
     <div class="row mb">
       <div><label>نوع المكان</label><select id="pkVT">${Object.entries(VENUES).map(([k,v])=>`<option value="${k}" ${(e.venue_type||(SORROW(kind)?'husseiniya':'hall'))===k?'selected':''}>${v[0]} ${v[1]}</option>`).join('')}</select></div>
       <div><label>اسم المكان</label><input id="pkVenue" maxlength="120" placeholder="مثال: حسينية الزهراء" value="${esc(e.venue||'')}"></div>
     </div>
     <div class="row mb">
       <div><label>من تاريخ *</label><input id="pkFrom" type="date" value="${String(e.date_from||tday()).slice(0,10)}"></div>
       <div><label>إلى تاريخ</label><input id="pkTo" type="date" value="${e.date_to&&e.date_to!==e.date_from?String(e.date_to).slice(0,10):''}"></div>
     </div>
     <div class="mb"><label>الوقت</label><input id="pkTime" maxlength="80" placeholder="مثال: من العصر إلى المغرب" value="${esc(e.time_text||'')}"></div>
     <div class="mb"><label>لوكيشن المكان</label>
       <div style="display:flex;gap:6px"><input id="pkLoc" inputmode="url" style="flex:1" placeholder="الصق رابط كوكل ماب أو اضغط موقعي" value="${esc(e.lat!=null?e.lat+','+e.lng:(e.loc_url||''))}">
       <button type="button" class="btn sec" onclick="DIR.myLoc()" style="white-space:nowrap">📍 موقعي</button></div>
       <button type="button" class="btn grn" onclick="DIR.mapPick()" style="width:100%;margin-top:6px">🗺️ اختار المكان من الخريطة</button>
       <small style="color:var(--muted);font-size:11px">حرّك الخريطة وحط الدبوس على المكان بالضبط، أو اضغط موقعي إذا أنت هناك. اللوكيشن يوصل الناس ويوصلهم الإشعارات.</small></div>
     <div class="row mb">
       <div><label>اسم الناشر *</label><input id="pkPoster" maxlength="60" placeholder="اسمك (عربي أو English)" value="${esc(e.poster_name||st().profile.name||'')}"></div>
       <div><label>رقم للتواصل (اختياري)</label><input id="pkContact" type="tel" inputmode="tel" maxlength="20" placeholder="07xxxxxxxxx" value="${esc(e.contact||(EDIT_ID?'':st().profile.phone)||'')}"></div>
     </div>
     <div class="mb"><label>ملاحظة (اختياري)</label><textarea id="pkNote" maxlength="400" placeholder="مثال: الفاتحة للرجال والنساء">${esc(e.note||'')}</textarea></div>
     ${EDIT_ID?'':`<label style="display:flex;gap:8px;align-items:center;margin-bottom:12px;color:var(--text);font-size:14px"><input type="checkbox" id="pkLedger" style="width:auto"> أنشئ لها سجل بدفتر الفضل مالتي</label>`}
     <div class="actions"><button class="btn" id="pkBtn" onclick="DIR.submit()">${EDIT_ID?'💾 حفظ التعديل':'📢 نشر'}</button>${EDIT_ID?`<button class="btn sec" onclick="DIR.cancelEdit()">إلغاء</button>`:''}</div>
     <p style="font-size:11px;color:var(--muted);margin-top:10px">بالنشر تتعهد إن المعلومات صحيحة. المنشورات الكاذبة تنحذف بعد بلاغات المستخدمين.</p>
   </div>
   ${myPostsHtml()}`}
function myPostsHtml(){const d=st();const mine=Object.keys(d.mine).map(id=>EVENTS.find(e=>e.id===id)||d.privCache[id]).filter(Boolean);
  return mine.length?`<h2>📌 منشوراتي</h2>${mine.map(evCard).join('')}`:''}
async function submit(){
  const v=id=>$(id).value.trim();const title=v('pkTitle');
  if(title.length<2)return toast('اكتب الاسم');
  const from=v('pkFrom');if(!from)return toast('اختار تاريخ البداية');
  const to=v('pkTo');if(to&&to<from)return toast('تاريخ النهاية قبل البداية!');
  if(!configured())return toast('الدليل العام قيد التجهيز');
  const locRaw=v('pkLoc'),ll=parseLoc(locRaw);
  const p={kind:v('pkKind'),title,tribe:v('pkTribe'),province:v('pkProv'),area:v('pkArea'),venue_type:v('pkVT'),venue:v('pkVenue'),
    date_from:from,date_to:to||from,time_text:v('pkTime'),lat:ll?String(ll.lat):'',lng:ll?String(ll.lng):'',loc_url:ll?'':(/^https?:\/\//i.test(locRaw)?locRaw:''),
    note:v('pkNote'),contact:v('pkContact'),visibility:v('pkVis'),reach_km:v('pkVis')==='public'?v('pkReach'):'',poster_name:v('pkPoster')};
  if(p.poster_name.length<2)return toast('اكتب اسم الناشر');
  const pr=st().profile;if(!pr.name){pr.name=p.poster_name;if(!pr.phone&&p.contact)pr.phone=p.contact}
  const btn=$('pkBtn');btn.disabled=true;btn.textContent='⏳ جاري الإرسال...';
  const d=st();
  try{
    if(EDIT_ID){const ok=await rpc('update_event',{p_id:EDIT_ID,p,p_token:d.token});if(!ok)throw new Error('ما تكدر تعدّل هذا المنشور');toast('تم حفظ التعديل ✔');await fetchEv(EDIT_ID);EDIT_ID=null}
    else{const id=await rpc('add_event',{p,p_token:d.token});d.mine[id]=Date.now();d.seen[id]=1;
      if($('pkLedger')?.checked){const le={id:uid(),name:(p.kind==='fatiha'?'':KINDS[p.kind][1]+' ')+title,tribe:p.tribe,from,to:to,date:from,place:[VENUES[p.venue_type]?.[1],p.venue,p.area].filter(Boolean).join(' - '),time:p.time_text,loc:ll?`https://maps.google.com/?q=${ll.lat},${ll.lng}`:p.loc_url,note:p.note};db.events.unshift(le);db.cur=le.id}
      d.postsCount=(d.postsCount||0)+1;save();toast(p.visibility==='private'?'تم النشر ✔ أرسل الرابط للناس اللي تريدهم':'تم النشر ✔');await fetchEv(id);
      await loadEvents(true);renderPost();go('dir');setTimeout(()=>{share(id);maybeSupport()},300);return}
    save();await loadEvents(true);renderPost();go('dir')
  }catch(e){toast(errTxt(e.message))}finally{if($('pkBtn')){btn.disabled=false;btn.textContent=EDIT_ID?'💾 حفظ التعديل':'📢 نشر'}}}
function editEv(id){const e=EVENTS.find(x=>x.id===id)||st().privCache[id];if(!e)return;EDIT_ID=id;go('post');renderPost(e)}
async function delEv(id){if(!confirm('حذف المنشور من الدليل العام؟'))return;
  try{const ok=await rpc('delete_event',{p_id:id,p_token:st().token});if(ok){delete st().mine[id];save();toast('تم الحذف');loadEvents(true);renderPost()}else toast('ما تكدر تحذف هذا المنشور')}catch(e){toast(errTxt(e.message))}}
async function report(id){const r=prompt('سبب الإبلاغ (مثلاً: معلومات كاذبة، إزعاج، مكرر):','معلومات غير صحيحة');if(r===null)return;
  try{await rpc('report_event',{p_id:id,p_device:st().token,p_reason:r});toast('وصل البلاغ، شكراً 🙏')}catch(e){toast(errTxt(e.message))}}
async function myLoc(){toast('جاري تحديد موقعك...');try{const p=await locNow();$('pkLoc').value=`${p.lat},${p.lng}`;toast('تم تحديد الموقع ✔')}
  catch(e){toast(e.code===1?'اسمح للتطبيق باستخدام الموقع من الإعدادات':'تعذّر تحديد الموقع — الصق رابط كوكل ماب')}}

/* ---------- المشاركة ---------- */
function share(id){const e=EVENTS.find(x=>x.id===id)||st().privCache[id];if(!e)return;
  const k=KINDS[e.kind]||KINDS.other,v=VENUES[e.venue_type],loc=mapUrl(e);
  const L=[];if(SORROW(e.kind)&&e.kind!=='majlis'){L.push('إنا لله وإنا إليه راجعون');L.push('')}
  L.push(`${k[0]} ${e.kind==='fatiha'?'فاتحة ':k[1]+' · '}${e.title}`);
  if(e.tribe)L.push(`🏷️ ${e.tribe}`);
  L.push(`📍 ${e.province}${e.area?' - '+e.area:''}`);
  if(v||e.venue)L.push(`${v?v[0]+' '+v[1]:'📍'}${e.venue?': '+e.venue:''}`);
  L.push(`📅 ${rangeTxt(e)}`);if(e.time_text)L.push(`⏰ ${e.time_text}`);
  if(loc)L.push(`🗺️ الموقع: ${loc}`);if(e.contact)L.push(`📞 ${e.contact}`);if(e.note){L.push('');L.push(e.note)}
  L.push('');L.push('🔗 التفاصيل والموقع: '+evLink(e.id));L.push('');L.push('📲 تطبيق فواتح ومناسبات IBRA:');L.push(appLink());
  shareText.value=L.join('\n');
  shareEv={name:e.title,tribe:e.tribe,from:String(e.date_from).slice(0,10),to:String(e.date_to).slice(0,10),time:e.time_text,place:[v?.[1],e.venue,e.area,e.province].filter(Boolean).join(' - '),loc,note:e.note,
    cardTitle:(e.kind==='fatiha'?'فاتحة ':k[1]+' ')+e.title,cardTop:SORROW(e.kind)&&e.kind!=='majlis'?'إنا لله وإنا إليه راجعون':e.kind==='majlis'||e.kind==='religious'?'السلام على الحسين وعلى أولاد الحسين':'ألف مبروك 🎊'};
  $('mShare').classList.add('on')}

/* ---------- الإشعارات ---------- */
const LN=()=>isNative?Plug('LocalNotifications'):null;
async function notifPerm(){
  if(LN()){try{let p=await LN().checkPermissions();if(p.display!=='granted')p=await LN().requestPermissions();return p.display==='granted'}catch(e){return false}}
  if('Notification' in window){if(Notification.permission==='granted')return true;if(Notification.permission!=='denied')return (await Notification.requestPermission())==='granted'}
  return false}
async function notify(list){
  if(!list.length)return;
  const body=e=>{const k=KINDS[e.kind]||KINDS.other;return `${k[0]} ${k[1]}: ${e.title}${e.tribe?' — '+e.tribe:''} · ${e.province}${e.area?' - '+e.area:''} · ${rangeTxt(e)}`};
  const items=list.slice(0,5);
  if(LN()){try{await LN().schedule({notifications:items.map((e,i)=>({id:Math.floor(Math.random()*2e9),title:items.length>1&&i===0&&list.length>5?`${list.length} مناسبات جديدة قريبة منك`:'مناسبة جديدة قريبة منك',body:body(e),extra:{id:e.id},smallIcon:'ic_stat_notify',iconColor:'#D4AF37'}))})}catch(e){}return}
  if('Notification' in window&&Notification.permission==='granted'){items.forEach(e=>{try{const n=new Notification('فواتح ومناسبات — مناسبة جديدة',{body:body(e),icon:'icon.png',tag:e.id});n.onclick=()=>{window.focus();go('dir')}}catch(_){}})}}
function matches(e){const n=st().notif;
  if(n.kinds==='fatiha'&&!SORROW(e.kind))return false;if(n.kinds==='joy'&&!JOY(e.kind))return false;if(n.kinds==='relig'&&!GROUPS.relig.includes(e.kind))return false;
  if(e.visibility==='private')return false;
  const dd=(n.lat!=null&&e.lat!=null)?dist(n.lat,n.lng,e.lat,e.lng):null;
  if(dd!=null&&e.reach_km&&dd>e.reach_km)return false;
  if(dd!=null&&dd<=(+n.radius||10))return true;
  if(n.province&&e.province===n.province){if(!n.area)return true;const a=norm(n.area);return norm(e.area).includes(a)||norm(e.venue).includes(a)}
  if(n.tribes&&n.tribes.length&&e.tribe){const t=norm(e.tribe);if(n.tribes.some(x=>{x=norm(x).replace(/^ال\s*/,'');return x&&t.includes(x)}))return true}
  return false}
function checkNotify(){const d=st();
  const first=!d.seenInit;const fresh=[];
  EVENTS.forEach(e=>{if(d.seen[e.id])return;d.seen[e.id]=1;if(!first&&!d.mine[e.id]&&d.notif.on&&matches(e))fresh.push(e)});
  d.seenInit=1;const keep=new Set(EVENTS.map(e=>e.id));Object.keys(d.seen).forEach(k=>{if(!keep.has(k))delete d.seen[k]});save();notify(fresh)}
async function refreshMyLoc(silent){try{const p=await locNow();const n=st().notif;n.lat=p.lat;n.lng=p.lng;n.locAt=Date.now();save();if(!silent)toast('تم تحديث موقعك ✔');renderSettings();renderDir()}
  catch(e){if(!silent)toast(e.code===1?'اسمح للتطبيق باستخدام الموقع':'تعذّر تحديد الموقع')}}

/* ---------- التحديث التلقائي ---------- */
let UPD=null;
const vnum=v=>String(v||'').replace(/^v/,'').split('.').map(n=>parseInt(n)||0);
const newer=(a,b)=>{a=vnum(a);b=vnum(b);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0)}return false};
async function checkUpdate(manual){
  try{const r=await fetch(`https://api.github.com/repos/${CFG.repo}/releases/latest`,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw 0;const j=await r.json();
    if(newer(j.tag_name,VERSION)){const pl=platform(),A=j.assets||[];
      const pick=pl==='android'?A.find(a=>/\.apk$/i.test(a.name)):pl==='ios'?A.find(a=>/\.ipa$/i.test(a.name)):pl==='windows'?A.find(a=>/Setup\.exe$/i.test(a.name)):null;
      UPD={ver:j.tag_name.replace(/^v/,''),url:pick?pick.browser_download_url:(REMOTE.download_link||CFG.site),notes:j.body||''};
      $('updBtn').style.display='';if(manual)openUpdate()}
    else{UPD=null;$('updBtn').style.display='none';if(manual)toast('عندك آخر إصدار ✔ ('+VERSION+')')}}
  catch(e){if(manual)toast('تعذّر التحقق من التحديث')}}
window.openUpdate=function(){if(!UPD)return checkUpdate(true);
  const ios=platform()==='ios';
  if(confirm(`⬆️ إصدار جديد ${UPD.ver} متوفر (عندك ${VERSION}).\n\n${ios?'ينزل ملف IPA، وقّعه وثبّته مثل كل مرة.':'ينزل الملف وثبّته فوق النسخة الحالية، وبياناتك تبقى.'}\n\nتنزيل التحديث الآن؟`))openLink(UPD.url)};

/* ---------- الإعدادات ---------- */
function renderSettings(){const root=$('setRoot');if(!root)return;const n=st().notif;
  const tg=(on,fn)=>`<div class="tgl ${on?'on':''}" onclick="${fn}"></div>`;
  const pr=st().profile;
  root.innerHTML=`
   <div class="card"><h2>👤 حسابي</h2>
     <div class="row mb"><div><label>الاسم (عربي أو English)</label><input value="${esc(pr.name)}" maxlength="60" placeholder="مثال: ابراهيم الخزرجي" onchange="DIR.prof('name',this.value.trim())"></div>
     <div><label>رقم الموبايل</label><input type="tel" inputmode="tel" value="${esc(pr.phone)}" maxlength="20" placeholder="07xxxxxxxxx" onchange="DIR.prof('phone',this.value.trim())"></div></div>
     <p style="font-size:11px;color:var(--muted)">يطلع اسمك كناشر للمناسبات، والرقم يتعبّى تلقائياً للتواصل. محفوظين بجهازك.</p></div>
   ${UPD?`<div class="banner">⬆️ إصدار جديد ${esc(UPD.ver)} متوفر <button class="btn sm" onclick="openUpdate()">تحديث</button></div>`:''}
   <div class="card"><h2>🔔 إشعارات المناسبات</h2>
     <div class="sw"><span>تفعيل الإشعارات</span>${tg(n.on,'DIR.ntog()')}</div>
     <div class="sw"><span>نوع المناسبات</span><select style="width:auto" onchange="DIR.nset('kinds',this.value)">
        <option value="all" ${n.kinds==='all'?'selected':''}>الكل</option><option value="fatiha" ${n.kinds==='fatiha'?'selected':''}>أحزان فقط</option><option value="joy" ${n.kinds==='joy'?'selected':''}>أفراح فقط</option><option value="relig" ${n.kinds==='relig'?'selected':''}>مجالس ودينية</option></select></div>
     <div class="sw"><span>📍 القريبة مني ضمن</span><select style="width:auto" onchange="DIR.nset('radius',+this.value)">${[3,5,10,20,50].map(r=>`<option value="${r}" ${+n.radius===r?'selected':''}>${r} كم</option>`).join('')}</select></div>
     <div class="sw"><span style="font-size:13px">${n.lat!=null?'✅ موقعك محفوظ':'⚠️ موقعك غير محدد'}</span><button class="btn sec sm" onclick="DIR.myPos()">📍 حدّث موقعي</button></div>
     <div class="sw"><span>🏙️ محافظتي</span><select style="width:auto" onchange="DIR.nset('province',this.value)"><option value="">—</option>${PROVINCES.map(p=>`<option ${n.province===p?'selected':''}>${p}</option>`).join('')}</select></div>
     <div class="mb" style="margin-top:8px"><label>منطقتي (اختياري — حتى تجيك مناسبات منطقتك بس)</label><input value="${esc(n.area||'')}" placeholder="مثال: بغداد الجديدة" onchange="DIR.nset('area',this.value.trim())"></div>
     <div class="mb"><label>🏷️ العشائر اللي أتابعها (افصل بفاصلة)</label><input value="${esc((n.tribes||[]).join('، '))}" placeholder="مثال: آل فلان، الجبور" onchange="DIR.nset('tribes',this.value.split(/[،,]/).map(s=>s.trim()).filter(Boolean))"></div>
     <p style="font-size:11px;color:var(--muted)">يوصلك إشعار بأي مناسبة جديدة قريبة منك، أو بمحافظتك ومنطقتك، أو لعشيرة تتابعها. الإشعار يوصل لمن التطبيق مفتوح أو تفتحه.</p>
     <button class="btn sec sm" onclick="DIR.testN()">🔔 تجربة إشعار</button>
   </div>
   <div class="card"><h2>🔄 التحديثات</h2><p style="font-size:13px;color:var(--muted);margin-bottom:8px">الإصدار الحالي ${VERSION}. التطبيق يتحقق تلقائياً من التحديثات.</p><button class="btn sec" onclick="DIR.upd()">تحقق من التحديث</button></div>
   <div class="card"><h2>💛 ادعم المؤسس</h2><p style="font-size:13px;color:var(--muted);margin-bottom:8px">التطبيق مجاني وبدون إعلانات. دعمك يساعد يستمر ويتطور ويغطي كلفة السيرفر.</p><button class="btn" onclick="DIR.support()">💛 طرق الدعم</button></div>
   <div class="card"><h2>📖 شرح التطبيق</h2><button class="btn sec" onclick="DIR.onb(0)">عرض شاشات الترحيب</button></div>`;
  const vt=$('verTxt');if(vt)vt.textContent='الإصدار '+VERSION}

/* ---------- الدعم ---------- */
function support(){const s=(REMOTE.support||'').trim();
  const lines=s?s.split('\n').filter(Boolean):[];
  const html=lines.length?lines.map(l=>{const m=l.match(/(\+?\d[\d\s-]{6,}\d)/);const val=m?m[1].replace(/\s|-/g,''):l;
      return `<div class="sw"><span style="font-size:14px">${esc(l)}</span><button class="btn sec sm" onclick="copyText('${esc(val)}').then(()=>toast('تم النسخ ✔ شكراً لدعمك 💛'))">📋 نسخ</button></div>`}).join('')
     :`<p style="color:var(--muted);text-align:center;padding:14px">طرق الدعم راح تنضاف قريباً إن شاء الله 🤍</p>`;
  showSheet('💛 ادعم المؤسس',`<p style="font-size:14px;line-height:1.9;margin-bottom:10px">التطبيق مجاني بالكامل وبدون إعلانات، صنعته حتى يخدم الناس بالفواتح والمناسبات. إذا حبيت تدعم استمراره وتطويره، هذي الطرق المتاحة:</p>${html}<p style="font-size:12px;color:var(--muted);margin-top:10px;text-align:center">جزاك الله خير — ابراهيم الخزرجي</p>`)}
function maybeSupport(){const d=st();if(d.supportShown||!(REMOTE.support||'').trim())return;
  if((d.postsCount||0)>=2||db.people.length>=5){d.supportShown=1;save();setTimeout(support,1500)}}

/* ---------- لوحة الإدارة ---------- */
let taps=0,tapT=null,ADMIN='';
window.adminTap=function(){taps++;clearTimeout(tapT);tapT=setTimeout(()=>taps=0,1500);if(taps>=5){taps=0;adminOpen()}};
async function adminOpen(){if(!ADMIN){const c=prompt('كود الإدارة:');if(!c)return;ADMIN=c.trim()}
  try{const rows=await rpc('admin_list',{p_code:ADMIN});
    showSheet('🛡️ لوحة الإدارة',`
     <div class="mb"><label>💛 طرق الدعم (كل طريقة بسطر، مثال: زين كاش: 07xxxxxxxxx)</label><textarea id="adSup" style="min-height:90px">${esc(REMOTE.support||'')}</textarea></div>
     <div class="mb"><label>🔗 رابط تحميل التطبيق الثابت</label><input id="adLink" inputmode="url" value="${esc(REMOTE.download_link||'')}" placeholder="${esc(CFG.site)}"></div>
     <div class="mb"><label>📢 إعلان يظهر للجميع بأعلى الدليل (اتركه فارغ للإخفاء)</label><textarea id="adAnn">${esc(REMOTE.announcement||'')}</textarea></div>
     <button class="btn" onclick="DIR.adSave()">💾 حفظ الإعدادات</button>
     <h2 style="margin-top:16px">المنشورات (${rows.length})</h2>
     ${rows.map(r=>`<div class="ev" style="${r.hidden?'opacity:.6':''}"><b>${(KINDS[r.kind]||KINDS.other)[0]} ${esc(r.title)}</b>
       <div class="m">${esc(r.province)}${r.area?' · '+esc(r.area):''} · ${dS(r.date_from)} · 🚩 ${r.reports}${r.hidden?' · <b style="color:var(--red)">مخفي</b>':''}</div>
       ${r.reasons?`<div class="m">البلاغات: ${esc(r.reasons)}</div>`:''}
       <div class="actions">${r.hidden?`<button class="btn grn sm" onclick="DIR.adAct('${r.id}','unhide')">إظهار</button>`:`<button class="btn sec sm" onclick="DIR.adAct('${r.id}','hide')">إخفاء</button>`}<button class="btn red sm" onclick="DIR.adAct('${r.id}','delete')">حذف</button></div></div>`).join('')||'<div class="empty">ما اكو منشورات</div>'}`)}
  catch(e){toast(errTxt(e.message));if(String(e.message).includes('not_admin'))ADMIN=''}}
async function adSave(){try{for(const[k,id] of [['support','adSup'],['download_link','adLink'],['announcement','adAnn']])await rpc('admin_set_config',{p_code:ADMIN,p_key:k,p_value:$(id).value});toast('تم الحفظ ✔');await loadConfig()}catch(e){toast(errTxt(e.message))}}
async function adAct(id,a){if(a==='delete'&&!confirm('حذف نهائي؟'))return;try{await rpc('admin_action',{p_code:ADMIN,p_id:id,p_action:a});toast('تم ✔');closeM('mGen');adminOpen();loadEvents(true)}catch(e){toast(errTxt(e.message))}}

/* ---------- نافذة عامة ---------- */
function showSheet(title,html){let m=$('mGen');if(!m){m=document.createElement('div');m.className='modal';m.id='mGen';m.innerHTML='<div class="sheet"><h2><span id="mGenT"></span><button class="x" onclick="closeM(\'mGen\')">×</button></h2><div id="mGenB"></div></div>';m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('on')});document.body.appendChild(m)}
  $('mGenT').textContent=title;$('mGenB').innerHTML=html;m.classList.add('on')}

/* ---------- شاشات الترحيب ---------- */
const SLIDES=[
 ['فواتح ومناسبات','أهلاً بيك 🤍 تطبيق واحد يخدمك بشغلتين:<br><b>🔍 دليل الواجب</b> و<b>📒 دفتر الفضل</b>'],
 ['🔍 دليل الواجب','ابحث عن أي فاتحة أو مجلس حسيني أو عرس أو مناسبة دينية، باسم صاحبها أو العشيرة أو المنطقة، وشوف المكان والموعد واللوكيشن حتى لو مو من منطقتك.'],
 ['📢 انشر مناسبتك','<b>🌍 عامة</b>: تظهر بالدليل وتوصل إشعاراتها للقريبين ضمن المسافة اللي تحددها.<br><b>🔒 خاصة</b>: ما تظهر لأحد، ترسل رابطها بس للناس اللي تريدهم.'],
 ['🔔 لا يفوتك واجب','يوصلك إشعار بالمناسبات القريبة منك، أو بمحافظتك، أو لعشيرتك اللي تتابعها.'],
 ['📒 دفتر الفضل','سجّل كل من وقف وياك: الاسم والرقم والمبلغ و"قريب فلان". يبقى <b>بجهازك فقط</b>، وتطبعه أو تنقله لجهاز ثاني، حتى ترد الجميل بوقته.']];
function onb(i){const o=$('onb');if(i>=SLIDES.length){o.classList.remove('on');st().onb=1;save();if(!st().notif.province)go('settings');return}
  const s=SLIDES[i];o.innerHTML=`<img src="icon.png"><h2>${s[0]}</h2><p>${s[1]}</p><div class="dots">${SLIDES.map((_,j)=>`<i class="${j===i?'on':''}"></i>`).join('')}</div>
   <div style="display:flex;gap:8px"><button class="btn" onclick="DIR.onb(${i+1})" style="min-width:140px">${i===SLIDES.length-1?'ابدأ ✔':'التالي ←'}</button>${i<SLIDES.length-1?`<button class="btn sec" onclick="DIR.onb(${SLIDES.length})">تخطي</button>`:''}</div>`;
  o.classList.add('on')}

/* ---------- واجهة عامة ---------- */
let qT=null;
window.DIR={
  open:u=>openLink(u),share,edit:editEv,del:delEv,report,myLoc,submit,
  cancelEdit:()=>{EDIT_ID=null;renderPost()},
  pk:k=>{$('pkKind').value=k;document.querySelectorAll('#pkChips .chip').forEach(c=>c.classList.toggle('on',c.dataset.k===k));$('pkTitleL').textContent=TITLE_LABEL[k]+' *';$('pkTitle').placeholder=TITLE_PH[k];$('pkVT').value=(SORROW(k)||k==='religious')?(k==='religious'?'mosque':'husseiniya'):'hall'},
  q:v=>{st().filter.q=v;clearTimeout(qT);qT=setTimeout(()=>{DIR._focus=true;renderDir();DIR._focus=false},200)},
  setF:(k,v)=>{st().filter[k]=v;save();renderDir()},
  sort:async v=>{st().filter.sort=v;save();if(v==='near'&&st().notif.lat==null)await refreshMyLoc();renderDir()},
  reload:()=>{loadEvents();loadConfig()},
  ntog:async()=>{const n=st().notif;n.on=!n.on;if(n.on)await notifPerm();save();renderSettings()},
  nset:(k,v)=>{st().notif[k]=v;save();renderSettings()},
  myPos:()=>refreshMyLoc(),
  testN:async()=>{if(!(await notifPerm()))return toast('اسمح للتطبيق بالإشعارات من إعدادات الجهاز');notify([{id:'t',kind:'fatiha',title:'تجربة إشعار',province:st().notif.province||'بغداد',date_from:tday(),date_to:tday()}]);toast('أرسلت إشعار تجربة')},
  upd:()=>checkUpdate(true),support,onb,adSave,adAct,
  vis:v=>{$('pkVis').value=v;document.querySelectorAll('#pkVisSeg button').forEach((b,i)=>b.classList.toggle('on',(i===0)===(v==='public')));$('pkReachBox').style.display=v==='public'?'':'none';
    $('pkVisHint').textContent=v==='private'?'ما تظهر بالدليل. بعد النشر ترسل رابطها بس للناس اللي تريدهم.':'تظهر لكل المستخدمين بالبحث، وتوصل إشعاراتها للقريبين.'},
  prof:(k,v)=>{st().profile[k]=v;save();toast('تم الحفظ ✔')},
  openLinkBox:()=>{const u=prompt('الصق رابط المناسبة:');const id=idFromUrl(u)||(u&&u.trim());if(id)openById(id)},
  copyLink:id=>copyText(evLink(id)).then(()=>toast('تم نسخ الرابط ✔')),
  mapPick:()=>MapPick.pick($('pkLoc').value,(a,b)=>{$('pkLoc').value=a+','+b;toast('تم تحديد المكان ✔')}),
  viewMap:id=>{const e=EVENTS.find(x=>x.id===id)||st().privCache[id];if(!e)return;MapPick.view(e.lat,e.lng,(KINDS[e.kind]||KINDS.other)[1]+' — '+e.title,popHtml(e))},
  mapAll:()=>MapPick.many(visible().map(e=>({lat:e.lat,lng:e.lng,emoji:(KINDS[e.kind]||KINDS.other)[0],html:popHtml(e)})),'خريطة المناسبات ('+visible().filter(e=>e.lat!=null).length+')')
};
function popHtml(e){const k=KINDS[e.kind]||KINDS.other,v=VENUES[e.venue_type];
  return `<div class="mpEv"><b>${k[0]} ${esc(e.title)}</b>${e.tribe?`<small>${esc(e.tribe)}</small><br>`:''}<small>${v?v[1]:''}${e.venue?' — '+esc(e.venue):''}</small><br><small>📅 ${rangeTxt(e)}${e.time_text?' · '+esc(e.time_text):''}</small><br>
   <a href="https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}" target="_blank" style="display:inline-block;margin-top:6px;background:#3fae7a;color:#fff;padding:4px 10px;border-radius:8px;text-decoration:none;font-weight:700">🧭 الاتجاهات</a></div>`}
window.onTab=t=>{if(t==='dir')renderDir();if(t==='post'&&!EDIT_ID)renderPost();if(t==='settings')renderSettings()};

/* ---------- تشغيل ---------- */
function boot(){const d=st();EVENTS=d.cache||[];REMOTE=d.remote||{};window.REMOTE_LINK=REMOTE.download_link||'';
  renderDir();renderPost();renderSettings();
  loadEvents(true);loadConfig();setTimeout(()=>checkUpdate(false),3000);
  if(!d.onb&&!idFromUrl(location.href))onb(0);
  if(d.notif.on){setTimeout(notifPerm,4000);if(d.notif.lat!=null&&Date.now()-(d.notif.locAt||0)>3600e3)setTimeout(()=>refreshMyLoc(true),6000)}
  setInterval(()=>loadEvents(true),10*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-(st().cacheAt||0)>60000)loadEvents(true)});
  if(isNative&&Plug('App'))Plug('App').addListener('resume',()=>loadEvents(true));
  if(LN())LN().addListener('localNotificationActionPerformed',()=>go('dir'));
  const eid=idFromUrl(location.href);if(eid)setTimeout(()=>openById(eid),600);
  if(isNative&&Plug('App'))Plug('App').addListener('appUrlOpen',ev=>{const id=idFromUrl(ev&&ev.url);if(id)openById(id)})}
boot();
})();
