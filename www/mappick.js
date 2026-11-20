/* فواتح ومناسبات IBRA — الخريطة المدمجة: اختيار المكان، عرض مناسبة، خريطة كل المناسبات */
(function(){
const BAGHDAD=[33.3152,44.3661];
const LAYERS={
  map:{url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',opt:{maxZoom:19,subdomains:'abc',attribution:'© OpenStreetMap'}},
  sat:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',opt:{maxZoom:19,attribution:'© Esri'}},
  lbl:{url:'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',opt:{maxZoom:19}}
};
let wrap,map,base,labels,mode='map',onDone=null,markers=[];
function el(){
  if(wrap)return;
  const css=document.createElement('style');css.textContent=`
  #mpWrap{position:fixed;inset:0;z-index:70;background:#06100a;display:none;flex-direction:column}
  #mpWrap.on{display:flex}
  #mpTop{display:flex;align-items:center;gap:8px;padding:10px 12px;padding-top:calc(10px + env(safe-area-inset-top));background:#0b120f;border-bottom:1px solid var(--line)}
  #mpTop b{flex:1;color:var(--gold);font-size:16px}
  #mpMap{flex:1;position:relative;direction:ltr}
  #mpPin{position:absolute;left:50%;top:50%;z-index:500;pointer-events:none;transform:translate(-50%,-100%);font-size:44px;line-height:1;filter:drop-shadow(0 4px 6px rgba(0,0,0,.6))}
  #mpPin::after{content:'';position:absolute;left:50%;bottom:-4px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:rgba(0,0,0,.45)}
  #mpBar{padding:10px 12px;padding-bottom:calc(10px + env(safe-area-inset-bottom));background:#0b120f;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
  #mpBar .row2{display:flex;gap:6px;flex-wrap:wrap}
  #mpCoord{font-size:12px;color:var(--muted);direction:ltr;text-align:center}
  .mpFab{position:absolute;z-index:600;right:12px;display:flex;flex-direction:column;gap:8px;top:12px}
  .mpFab button{width:46px;height:46px;border-radius:12px;border:1px solid var(--line);background:rgba(11,18,15,.92);color:#fff;font-size:20px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4)}
  .mpEv{font-family:Cairo,Tahoma,sans-serif;direction:rtl;text-align:right;min-width:170px}
  .mpEv b{display:block;font-size:14px;margin-bottom:2px}.mpEv small{color:#555}
  .leaflet-container{background:#1b2a22;font-family:Cairo,Tahoma,sans-serif}`;
  document.head.appendChild(css);
  wrap=document.createElement('div');wrap.id='mpWrap';
  wrap.innerHTML=`<div id="mpTop"><b id="mpTitle">اختار مكان المناسبة</b><button class="btn sec sm" onclick="MapPick.close()">✕ إغلاق</button></div>
   <div id="mpMap"><div id="mpPin">📍</div><div class="mpFab"><button title="مكاني" onclick="MapPick.me()">🎯</button><button title="قمر صناعي" id="mpLayerBtn" onclick="MapPick.layer()">🛰️</button></div></div>
   <div id="mpBar"><div id="mpHint" style="font-size:13px;text-align:center">حرّك الخريطة حتى يصير الدبوس 📍 فوق مكان المناسبة بالضبط</div><div id="mpCoord"></div>
     <div class="row2"><button class="btn" style="flex:1" id="mpOk" onclick="MapPick.ok()">✔ تأكيد المكان</button><button class="btn sec" onclick="MapPick.me()">📍 مكاني</button></div></div>`;
  document.body.appendChild(wrap);
}
function ensureMap(){
  if(map)return;
  map=L.map('mpMap',{zoomControl:true,attributionControl:true}).setView(BAGHDAD,12);
  setLayer('map');
  map.on('move',()=>{const c=map.getCenter();const t=document.getElementById('mpCoord');if(t)t.textContent=c.lat.toFixed(6)+', '+c.lng.toFixed(6)});
}
function setLayer(m){mode=m;if(base)map.removeLayer(base);if(labels){map.removeLayer(labels);labels=null}
  base=L.tileLayer(LAYERS[m].url,LAYERS[m].opt).addTo(map);
  if(m==='sat')labels=L.tileLayer(LAYERS.lbl.url,LAYERS.lbl.opt).addTo(map);
  const b=document.getElementById('mpLayerBtn');if(b)b.textContent=m==='sat'?'🗺️':'🛰️'}
function show(title,pick){el();wrap.classList.add('on');document.getElementById('mpTitle').textContent=title;
  document.getElementById('mpPin').style.display=pick?'':'none';
  document.getElementById('mpOk').parentElement.style.display=pick?'':'none';
  document.getElementById('mpHint').style.display=pick?'':'none';
  document.getElementById('mpCoord').style.display=pick?'':'none';
  ensureMap();setTimeout(()=>map.invalidateSize(),60);
  markers.forEach(m=>map.removeLayer(m));markers=[]}
function locate(fly){return new Promise(res=>{if(!navigator.geolocation){toast('الموقع غير متاح بهذا الجهاز');return res(null)}
  toast('جاري تحديد موقعك...');
  navigator.geolocation.getCurrentPosition(p=>{const ll=[p.coords.latitude,p.coords.longitude];if(fly)map.setView(ll,17);res(ll)},
    e=>{toast(e.code===1?'اسمح للتطبيق باستخدام الموقع':'تعذّر تحديد الموقع، حرّك الخريطة يدوياً');res(null)},{enableHighAccuracy:true,timeout:15000,maximumAge:60000})})}
const pinIcon=(emoji)=>L.divIcon({className:'',html:`<div style="font-size:32px;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 3px 4px rgba(0,0,0,.6))">${emoji||'📍'}</div>`,iconSize:[0,0]});

window.MapPick={
  /* اختيار مكان: initial = "lat,lng" أو {lat,lng}، cb(lat,lng) */
  pick(initial,cb){onDone=cb;show('اختار مكان المناسبة',true);
    let ll=null;if(initial){if(typeof initial==='string'){const m=initial.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);if(m)ll=[+m[1],+m[2]]}else if(initial.lat!=null)ll=[initial.lat,initial.lng]}
    if(ll)map.setView(ll,17);else{const n=(typeof db!=='undefined'&&db.dir&&db.dir.notif)||{};if(n.lat!=null)map.setView([n.lat,n.lng],15);else{map.setView(BAGHDAD,12);locate(true)}}},
  /* عرض مناسبة وحدة */
  view(lat,lng,title,html){show(title||'مكان المناسبة',false);map.setView([lat,lng],17);
    const m=L.marker([lat,lng],{icon:pinIcon('📍')}).addTo(map);if(html)m.bindPopup(html).openPopup();markers.push(m)},
  /* خريطة كل المناسبات */
  many(list,title){show(title||'خريطة المناسبات',false);
    const pts=[];list.forEach(e=>{if(e.lat==null||e.lng==null)return;const m=L.marker([e.lat,e.lng],{icon:pinIcon(e.emoji)}).addTo(map);if(e.html)m.bindPopup(e.html);markers.push(m);pts.push([e.lat,e.lng])});
    if(pts.length===1)map.setView(pts[0],15);else if(pts.length)map.fitBounds(pts,{padding:[40,40],maxZoom:15});else{map.setView(BAGHDAD,11);toast('ما اكو مناسبات بيها لوكيشن')}
    const n=(typeof db!=='undefined'&&db.dir&&db.dir.notif)||{};if(n.lat!=null){const me=L.circleMarker([n.lat,n.lng],{radius:8,color:'#fff',weight:2,fillColor:'#3fae7a',fillOpacity:1}).addTo(map);markers.push(me)}},
  me(){locate(true)},
  layer(){setLayer(mode==='sat'?'map':'sat')},
  ok(){const c=map.getCenter();const lat=+c.lat.toFixed(6),lng=+c.lng.toFixed(6);this.close();if(onDone)onDone(lat,lng)},
  close(){if(wrap)wrap.classList.remove('on')}
};
})();
