/* Peta Aset versi web: Leaflet + citra Esri, jaringan digambar di kanvas di atas peta dasar.
   Dipasang oleh tambalan build_web.py di dalam skrip Peta Aset (PetaWeb.pasang(C)).
   Bila Leaflet gagal dimuat, peta kanvas lama tetap dipakai. */
(function(){
'use strict';
var ESRI='https://server.arcgisonline.com/ArcGIS/rest/services/';
var LATAR={
  sat:{dasar:['World_Imagery',18],label:[['Reference/World_Transportation',18],['Reference/World_Boundaries_and_Places',18]],
    atr:'Citra &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, Maxar, Earthstar Geographics, dan komunitas pengguna GIS',bg:'#16304A'},
  jalan:{dasar:['World_Street_Map',18],label:[],
    atr:'Peta &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, HERE, Garmin, kontributor OpenStreetMap',bg:'#F2EFE9'},
  polos:{dasar:['Canvas/World_Light_Gray_Base',16],label:[['Canvas/World_Light_Gray_Reference',16]],
    atr:'Peta &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, HERE, Garmin',bg:'#E8EBEE'}
};
var MINZ={gardu:11,trafo:13,phb:13,fco:12,lbs:7,pmcb:7,rec:7,gh:7};
var NAMA={gardu:'Gardu distribusi',trafo:'Trafo distribusi',phb:'PHB TR',fco:'FCO',lbs:'LBS',pmcb:'PMCB',rec:'Recloser',gh:'Gardu hubung'};
var Z_TIANG=13;
var PALET=['#E6194B','#3CB44B','#FFE119','#4363D8','#F58231','#911EB4','#42D4F4','#F032E6','#BFEF45','#469990','#9A6324','#800000','#AAFFC3','#808000','#FABED4','#DCBEFF'];
var TANPA='#9AA7B3';
var modeWarna=function(){var b=document.querySelector('.pa-warna[aria-pressed="true"]');return b?b.getAttribute('data-warna'):'ulp';};
/* warna penyulang: pewarnaan rakus agar penyulang yang berdekatan berbeda warna */
function warnaPenyulang(st,sk){
  var box={},key=function(d){return d.ulp+'|'+d.penyulang;};
  var grow=function(k,x,y){var b=box[k]||(box[k]=[Infinity,Infinity,-Infinity,-Infinity]);if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y;};
  st.jtm.forEach(function(l){var k=key(l.d);grow(k,l.b[0],l.b[1]);grow(k,l.b[2],l.b[3]);});
  st.pts.forEach(function(q){grow(key(q.d),q.x,q.y);});
  sk.forEach(function(q){grow(key(q.d),q.x,q.y);});
  var ks=Object.keys(box).filter(function(k){return k.split('|')[1]!=='(tanpa kode)';});
  var gap=256/40075*3; /* ±3 km pada skala z0 */
  var dekat=function(a,b){return !(a[2]+gap<b[0]||b[2]+gap<a[0]||a[3]+gap<b[1]||b[3]+gap<a[1]);};
  var nb={};ks.forEach(function(a){nb[a]=ks.filter(function(b){return b!==a&&dekat(box[a],box[b]);});});
  ks.sort(function(a,b){return nb[b].length-nb[a].length||a.localeCompare(b);});
  /* per ULP: warna unik sebisa mungkin, dan berbeda dari penyulang tetangga (ULP mana pun) */
  var m={},pakai={};
  ks.forEach(function(k){var u=k.split('|')[0];var pu=pakai[u]||(pakai[u]=new Array(PALET.length).fill(0));
    var used={};nb[k].forEach(function(o){if(m[o]!=null)used[m[o]]=1;});
    var i=-1,best=Infinity;for(var c=0;c<PALET.length;c++)if(!used[c]&&pu[c]<best){best=pu[c];i=c;}
    if(i<0){best=Infinity;for(c=0;c<PALET.length;c++)if(pu[c]<best){best=pu[c];i=c;}}
    m[k]=i;pu[i]++;});
  return function(d){var i=m[key(d)];return i==null?TANPA:PALET[i];};
}

function px0(lon,lat){var s=Math.sin(Math.max(-85,Math.min(85,lat))*Math.PI/180);return [(lon+180)/360*256,(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*256];}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}

window.PetaWeb={pasang:function(C){
var parse=function(v){return typeof v==='string'?JSON.parse(v):v;};
var latar=function(){var b=document.querySelector('.pa-latar[aria-pressed="true"]');var k=b?b.getAttribute('data-latar'):'sat';return LATAR[k]?k:'sat';};
var inScope=function(d,s){var U=C.ref().U2U;return (s.up3==='Semua'||U.get(d.ulp)===s.up3)&&(s.ulp==='Semua'||d.ulp===s.ulp)&&(s.pyl==='Semua'||d.penyulang===s.pyl);};
var isSkel=function(d){var r=C.ref();return r.SKEL.has(r.U2U.get(d.ulp));};
var styleOf=function(d){return C.LAPIS[d.jenis]||C.LAPIS[d.lapis]||{k:'gardu',s:'o',f:'#fff',c:'#14263A',r:2.6};};
var f6=function(v){return (+v).toFixed(6);};

function tiangRows(st,skel){var out=[];(st.tIds||[]).forEach(function(id){var rows=st.tg[id];if(!rows)return;for(var i=0;i<rows.length;i++){var q=rows[i];if(!skel||isSkel(q.d))out.push(q);}});return out;}

function shape(ctx,s,x,y,r){
  ctx.beginPath();
  if(s==='o')ctx.arc(x,y,r,0,Math.PI*2);
  else if(s==='q')ctx.rect(x-r,y-r,2*r,2*r);
  else if(s==='d'){ctx.moveTo(x,y-r*1.25);ctx.lineTo(x+r*1.25,y);ctx.lineTo(x,y+r*1.25);ctx.lineTo(x-r*1.25,y);ctx.closePath();}
  else {ctx.moveTo(x,y-r*1.2);ctx.lineTo(x+r*1.05,y+r*0.8);ctx.lineTo(x-r*1.05,y+r*0.8);ctx.closePath();}
}

function describe(h){
  if(!h)return ['Lokasi dipilih','','',''];
  if(h.type==='pt'){var d=h.q.d;return [d.nama||d.lapis,(d.jenis&&d.jenis!==d.lapis?d.jenis+' ('+d.lapis.toLowerCase()+')':d.lapis)+(d.th_buat?', dibangun '+d.th_buat:''),'Penyulang '+d.penyulang+', ULP '+d.ulp,C.bebanTxt(d.penyulang,d.ulp)];}
  if(h.type==='tiang'){var t=h.q.d;return ['Tiang TM','Penyulang '+t.penyulang,'ULP '+t.ulp,C.bebanTxt(t.penyulang,t.ulp)];}
  var j=h.d;return ['JTM penyulang '+j.penyulang,(j.nama||'Ruas JTM')+', ±'+TD.loc.format(',.2f')(+j.panjang_km)+' km','ULP '+j.ulp,C.bebanTxt(j.penyulang,j.ulp)];
}

/* ---------- gambar jaringan ---------- */
function view(st){
  var m=st.map,z=m.getZoom(),S=Math.pow(2,z),po=m.getPixelOrigin(),off=m.containerPointToLayerPoint([0,0]);
  return {z:z,S:S,ox:po.x+off.x,oy:po.y+off.y,off:off};
}
function paint(st){
  st.raf=0;
  if(!st.ready||!st.map)return;
  var m=st.map,size=m.getSize(),W=size.x,H=size.y;if(!W||!H)return;
  var dpr=window.devicePixelRatio||1,cv=st.cv;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';}
  var v=view(st);L.DomUtil.setPosition(cv,v.off);st.v=v;
  var ctx=st.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  var S=v.S,ox=v.ox,oy=v.oy,z=v.z,s=st.s,sat=st.latar==='sat';
  var X=function(x){return x*S-ox;},Y=function(y){return y*S-oy;};
  var vis=function(x,y,p){return x>-p&&y>-p&&x<W+p&&y<H+p;};
  var filtered=s.up3!=='Semua'||s.ulp!=='Semua'||s.pyl!=='Semua';
  ctx.lineJoin='round';ctx.lineCap='round';
  var line=function(f){ctx.beginPath();ctx.moveTo(X(f[0]),Y(f[1]));for(var i=2;i<f.length;i+=2)ctx.lineTo(X(f[i]),Y(f[i+1]));ctx.stroke();};
  var lw=clamp(1.4+(z-9)*0.5,1.4,5)+(s.pyl!=='Semua'?1:0)+(st.pw?0.8:0);
  if(C.lapisOn('jtm')){
    if(filtered){ctx.strokeStyle=sat?'rgba(255,255,255,.45)':'rgba(91,107,125,.45)';ctx.lineWidth=Math.max(1,lw*0.5);st.jtm.forEach(function(l){if(!inScope(l.d,s))line(l.f);});}
    ctx.strokeStyle=sat?'rgba(255,255,255,.92)':'rgba(255,255,255,.95)';ctx.lineWidth=lw+(sat?2.6:2);
    st.jtm.forEach(function(l){if(inScope(l.d,s))line(l.f);});
    if(st.hover&&st.hover.type==='jtm'){ctx.strokeStyle='#FFD100';ctx.lineWidth=lw+7;line(st.hover.f);}
    ctx.lineWidth=lw;
    st.jtm.forEach(function(l){if(inScope(l.d,s)){ctx.strokeStyle=st.lc(l.d);line(l.f);}});
    /* jaringan dari titik tiang (UP3 tanpa data JTM) */
    var sk=tiangRows(st,true);
    if(sk.length){
      var r=clamp(1.2+(z-9)*0.32,1.2,3.4)+(s.pyl!=='Semua'?0.5:0);
      var dots=function(pred,fill,rad){ctx.beginPath();var n=0;for(var i=0;i<sk.length;i++){var q=sk[i];if(!pred(q))continue;var x=X(q.x),y=Y(q.y);if(!vis(x,y,4))continue;ctx.moveTo(x+rad,y);ctx.arc(x,y,rad,0,Math.PI*2);n++;}if(n){ctx.fillStyle=fill;ctx.fill();}};
      if(filtered)dots(function(q){return !inScope(q.d,s);},sat?'rgba(255,255,255,.4)':'rgba(91,107,125,.4)',Math.max(1,r-0.6));
      dots(function(q){return inScope(q.d,s);},'rgba(255,255,255,.95)',r+1.1);
      var cs={};sk.forEach(function(q){if(inScope(q.d,s))cs[st.lc(q.d)]=1;});
      Object.keys(cs).forEach(function(c){dots(function(q){return inScope(q.d,s)&&st.lc(q.d)===c;},c,r);});
    }
  }
  /* tiang TM */
  var adaT=!!(st.tIds&&st.tIds.length);
  if(C.lapisOn('tiang')&&adaT&&z>=Z_TIANG){
    var rt=z>=16?3.2:z>=15?2.6:2;ctx.beginPath();
    tiangRows(st,false).forEach(function(q){if(!inScope(q.d,s))return;var x=X(q.x),y=Y(q.y);if(!vis(x,y,4))return;ctx.moveTo(x+rt,y);ctx.arc(x,y,rt,0,Math.PI*2);});
    ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#33465A';ctx.lineWidth=1.2;ctx.stroke();
  }
  if(st.hover&&st.hover.type==='tiang'){ctx.beginPath();ctx.arc(X(st.hover.q.x),Y(st.hover.q.y),7,0,Math.PI*2);ctx.strokeStyle='#FFD100';ctx.lineWidth=3;ctx.stroke();}
  /* titik aset */
  var g=clamp(1+(z-10)*0.2,0.9,2.3);var tersembunyi=[];
  C.ORDER.forEach(function(k){
    if(!C.lapisOn(k))return;
    if(z<(MINZ[k]||0)){if(st.pts.some(function(q){return q.st.k===k&&inScope(q.d,s);}))tersembunyi.push(NAMA[k]||k);return;}
    st.pts.forEach(function(q){
      if(q.st.k!==k||!inScope(q.d,s))return;var x=X(q.x),y=Y(q.y);if(!vis(x,y,10))return;var r=q.st.r*g;
      shape(ctx,q.st.s,x,y,r+1.6);ctx.fillStyle='rgba(255,255,255,.9)';ctx.fill();
      shape(ctx,q.st.s,x,y,r);ctx.fillStyle=q.st.f;ctx.fill();if(q.st.c){ctx.strokeStyle=q.st.c;ctx.lineWidth=1.2;ctx.stroke();}
    });
  });
  if(st.hover&&st.hover.type==='pt'){var hq=st.hover.q;shape(ctx,hq.st.s,X(hq.x),Y(hq.y),hq.st.r*g+4);ctx.strokeStyle='#FFD100';ctx.lineWidth=3;ctx.stroke();}
  if(st.pin){var px=X(st.pin.x),py=Y(st.pin.y);ctx.beginPath();ctx.arc(px,py,7,0,Math.PI*2);ctx.fillStyle='#FFD100';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='#14263A';ctx.stroke();ctx.beginPath();ctx.arc(px,py,2.4,0,Math.PI*2);ctx.fillStyle='#14263A';ctx.fill();}
  /* label */
  ctx.font='600 12.5px system-ui, -apple-system, "Segoe UI", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  var label=function(t,x,y,c){if(!vis(x,y,60))return;ctx.lineWidth=4;ctx.strokeStyle='rgba(255,255,255,.95)';ctx.strokeText(t,x,y);ctx.fillStyle=c;ctx.fillText(t,x,y);};
  if(s.pyl==='Semua'&&s.up3==='Semua'&&z<8.5){
    var up={};(st.lbl||[]).forEach(function(b){var u=C.ref().U2U.get(b.ulp);if(!u||(s.up3!=='Semua'&&u!==s.up3))return;(up[u]=up[u]||[]).push(b);});
    Object.keys(up).forEach(function(u){var v=up[u];label('UP3 '+u,X(d3.mean(v,function(b){return b.x;})),Y(d3.mean(v,function(b){return b.y;}))-18,'#08508A');});
  } else if(s.pyl==='Semua'){
    if(z<=13.5)(st.lbl||[]).forEach(function(b){if(inScope({ulp:b.ulp,penyulang:''},{up3:s.up3,ulp:s.ulp,pyl:'Semua'}))label('ULP '+b.ulp,X(b.x),Y(b.y)-14,st.pw?'#14263A':st.col(b.ulp));});
    if(st.pw&&z>=11)labelPyl(st,ctx,X,Y,W,H);
  } else if(st.pylLbl){label(s.pyl,X(st.pylLbl[0]),Y(st.pylLbl[1])-16,'#08508A');}
  /* petunjuk zoom */
  var pesan=[];
  if(C.lapisOn('tiang')&&adaT&&z<Z_TIANG&&C.PETA_UP3.some(function(u){return !C.ref().SKEL.has(u)&&(s.up3==='Semua'||u===s.up3);}))tersembunyi.push('tiang TM');
  if(tersembunyi.length)pesan.push('Perbesar untuk melihat '+daf(tersembunyi.map(function(t){return t==='tiang TM'||t==='PHB TR'||t==='FCO'||t==='LBS'||t==='PMCB'?t:t.toLowerCase();})));
  st.zn.textContent=pesan.join('');st.zn.hidden=!pesan.length;
}
function daf(a){return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' dan '+a[a.length-1];}
function later(st){if(!st.raf)st.raf=requestAnimationFrame(function(){paint(st);});}

/* ---------- uji sentuh ---------- */
function hitAt(st,x,y){
  if(!st.ready||!st.v)return null;
  var v=st.v,S=v.S,ox=v.ox,oy=v.oy,z=v.z,s=st.s;var best=null,bd=Infinity;
  var g=clamp(1+(z-10)*0.2,0.9,2.3);
  C.ORDER.forEach(function(k){if(!C.lapisOn(k)||z<(MINZ[k]||0))return;
    st.pts.forEach(function(q){if(q.st.k!==k||!inScope(q.d,s))return;var dx=q.x*S-ox-x,dy=q.y*S-oy-y,dd=dx*dx+dy*dy,lim=Math.max(10,q.st.r*g+6);if(dd<lim*lim&&dd<=bd){bd=dd;best={type:'pt',q:q,penyulang:q.d.penyulang};}});});
  var tOk=C.lapisOn('tiang')&&z>=Z_TIANG,jOk=C.lapisOn('jtm');
  if(!best&&(tOk||jOk)){tiangRows(st,!tOk).forEach(function(q){if(!inScope(q.d,s))return;var dx=q.x*S-ox-x,dy=q.y*S-oy-y,dd=dx*dx+dy*dy;if(dd<64&&dd<bd){bd=dd;best={type:'tiang',q:q,penyulang:q.d.penyulang};}});}
  if(!best&&jOk){
    var bx=(x+ox)/S,by=(y+oy)/S,lim=8/S,bl=lim*lim;
    st.jtm.forEach(function(l){if(!inScope(l.d,s))return;var f=l.f;
      if(bx<l.b[0]-lim||bx>l.b[2]+lim||by<l.b[1]-lim||by>l.b[3]+lim)return;
      for(var i=0;i<f.length-2;i+=2){var ax=f[i],ay=f[i+1],cx=f[i+2],cy=f[i+3],vx=cx-ax,vy=cy-ay,LL=vx*vx+vy*vy,u=LL?((bx-ax)*vx+(by-ay)*vy)/LL:0;u=u<0?0:u>1?1:u;var ex=ax+u*vx-bx,ey=ay+u*vy-by,dd=ex*ex+ey*ey;if(dd<bl){bl=dd;best={type:'jtm',f:f,d:l.d,penyulang:l.d.penyulang};}}});
  }
  return best;
}
function showTip(st,h,x,y){
  if(!h){st.tip.hidden=true;return;}
  var t=describe(h);var kids=[el('b',null,t[0])];t.slice(1).forEach(function(s){if(s)kids.push(el('span',null,s));});
  kids.push(el('span','pa-tiphint','Klik untuk detail dan Street View'));
  st.tip.replaceChildren.apply(st.tip,kids);st.tip.hidden=false;
  var W=st.map.getSize().x,H=st.map.getSize().y,tw=Math.min(260,st.tip.offsetWidth||220),th=st.tip.offsetHeight||70;
  st.tip.style.left=Math.max(4,Math.min(x+16,W-tw-4))+'px';
  st.tip.style.top=Math.max(4,y+16+th>H?y-th-12:y+16)+'px';
}
function openPop(st,h,ll){
  var lat=ll.lat,lon=ll.lng,x,y;
  if(h&&(h.type==='pt'||h.type==='tiang')){lat=+h.q.d.lat;lon=+h.q.d.lon;x=h.q.x;y=h.q.y;}
  else {var p=px0(lon,lat);x=p[0];y=p[1];}
  st.pin={x:x,y:y};st.tip.hidden=true;
  var t=describe(h);var box=el('div','pa-pin pw-pin');
  box.append(el('b',null,t[0]));t.slice(1).forEach(function(s){if(s)box.append(el('span',null,s));});
  box.append(el('span','pa-koord',(h&&h.type==='jtm'?'Titik pada ruas: ':'Koordinat: ')+f6(lat)+', '+f6(lon)));
  var act=el('div','pa-pinact');var llt=f6(lat)+','+f6(lon);
  var ln=function(txt,href,cls){var a=el('a',cls,txt);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;};
  act.append(ln('Street View','https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+llt,'pri'),
    ln('Google Maps','https://www.google.com/maps/@?api=1&map_action=map&center='+llt+'&zoom=19&basemap=satellite'));
  var zb=el('button',null,'Perbesar ke sini');zb.type='button';zb.onclick=function(){st.map.flyTo([lat,lon],Math.max(st.map.getZoom(),17),{duration:0.8});};act.append(zb);
  if(h&&h.penyulang){var on=TD.asetScope().pyl===h.penyulang;var fb=el('button',null,on?'Lepas sorotan penyulang':'Sorot penyulang '+h.penyulang);fb.type='button';
    fb.onclick=function(){st.map.closePopup();dash.setParams({pyl_aset:on?null:h.penyulang});};act.append(fb);}
  box.append(act);
  box.append(el('span','pa-pinnote','Street View dan Google Maps dibuka di tab baru. Ketersediaan Street View bergantung pada cakupan Google di lokasi ini.'));
  L.popup({className:'pw-pop',maxWidth:290,minWidth:220,autoPanPadding:[48,48],closeButton:true}).setLatLng([lat,lon]).setContent(box).openOn(st.map);
  later(st);
}

/* ---------- jangkauan (fit) ---------- */
function fit(st,anim){
  var s=st.s,x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  var add=function(x,y){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;};
  st.jtm.forEach(function(l){if(inScope(l.d,s)){add(l.b[0],l.b[1]);add(l.b[2],l.b[3]);}});
  st.pts.forEach(function(q){if(inScope(q.d,s))add(q.x,q.y);});
  tiangRows(st,true).forEach(function(q){if(inScope(q.d,s))add(q.x,q.y);});
  if(!isFinite(x0))return;
  var un=function(x,y){var lon=x/256*360-180;var n=Math.PI-2*Math.PI*y/256;return [180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))),lon];};
  var b=L.latLngBounds([un(x0,y1),un(x1,y0)]);
  st.map.fitBounds(b,{padding:[30,30],maxZoom:17,animate:!!anim,duration:0.7});
}

/* ---------- peta dasar ---------- */
function setBase(st){
  var k=latar(),lab=C.lapisOn('label');var key=k+'|'+lab;if(st.baseKey===key)return;st.baseKey=key;
  (st.baseLayers||[]).forEach(function(l){st.map.removeLayer(l);});st.baseLayers=[];
  var o=LATAR[k];st.latar=k;
  var T=function(svc,pane,atr){return L.tileLayer(ESRI+svc[0]+'/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:svc[1],maxZoom:20,pane:pane,attribution:atr||'',keepBuffer:3,detectRetina:false});};
  st.baseLayers.push(T(o.dasar,'tilePane',o.atr));
  if(lab)o.label.forEach(function(sv){st.baseLayers.push(T(sv,'pwlabel'));});
  st.baseLayers.forEach(function(l){l.addTo(st.map);});
  st.map.getContainer().style.background=o.bg;
  st.map.getContainer().classList.toggle('pw-sat',k==='sat');
}

function legendSym(st){
  var box=st.lgsym;if(!box)return;var kids=[];
  var add=function(cls,t){var s=el('span');s.append(el('i','pa-sw '+cls),document.createTextNode(t));kids.push(s);};
  var ada={};st.pts.forEach(function(q){if(inScope(q.d,st.s))ada[q.st.k]=1;});
  ['gardu','lbs','pmcb','rec','fco','gh','trafo','phb'].forEach(function(k){if(C.lapisOn(k)&&ada[k])add(k,NAMA[k]);});
  if(C.lapisOn('tiang')&&st.tIds&&st.tIds.length)add('tiang','Tiang TM');
  box.replaceChildren.apply(box,kids);box.hidden=!kids.length;
}

function labelPyl(st,ctx,X,Y,W,H){
  var s=st.s,boxes=[];ctx.font='600 11.5px system-ui, -apple-system, "Segoe UI", sans-serif';
  (st.anchors||[]).forEach(function(a){if(!inScope(a.d,s))return;var x=X(a.x),y=Y(a.y)-12;if(x<-40||y<-20||x>W+40||y>H+20)return;
    var t=a.d.penyulang,w=ctx.measureText(t).width+8,r=[x-w/2,y-8,x+w/2,y+8];
    if(boxes.some(function(b){return !(r[2]<b[0]||b[2]<r[0]||r[3]<b[1]||b[3]<r[1]);}))return;boxes.push(r);
    ctx.lineWidth=4;ctx.strokeStyle='rgba(255,255,255,.95)';ctx.strokeText(t,x,y);ctx.fillStyle='#14263A';ctx.fillText(t,x,y);
    ctx.beginPath();ctx.arc(r[0]-1,y,4,0,Math.PI*2);ctx.fillStyle=st.pcol(a.d);ctx.fill();ctx.lineWidth=1.2;ctx.strokeStyle='#fff';ctx.stroke();});
}
function legendPyl(st){
  if(!st.pw)return;var box=st.host.closest('.pa-stage');var el0=box&&box.querySelector('.pa-lgu');if(!el0)return;
  var s=st.s,seen={},rows=[];
  st.jtm.concat(tiangRows(st,true)).forEach(function(o){var d=o.d;if(!inScope(d,s))return;var k=d.ulp+'|'+d.penyulang;if(seen[k])return;seen[k]=1;rows.push(d);});
  rows.sort(function(a,b){return a.ulp.localeCompare(b.ulp,'id')||a.penyulang.localeCompare(b.penyulang,'id',{numeric:true});});
  var kids=[el('b','pa-lgtt','Warna jaringan per penyulang')];
  if(rows.length<=24){var r=el('span','pa-lgrow pw-lgpyl');rows.forEach(function(d){var sp=el('span');var i=el('i');i.style.background=st.pcol(d);sp.append(i,document.createTextNode(d.penyulang));r.append(sp);});kids.push(r);}
  else kids.push(el('span','pa-lgrow',rows.length+' penyulang. Pilih ULP untuk melihat daftar warnanya; nama penyulang tampil di peta saat diperbesar.'));
  el0.replaceChildren.apply(el0,kids);
}
/* ---------- panel profil aset per ULP (pengganti analisis beban, permintaan Zuhal 12 Nov 2026) ---------- */
dash.draw('pa-profil-ulp',function(host){
  var g=C.rekap(),bb=dash.data('beban_penyulang');
  if(g.status!=='ok'||!g.data){host.textContent=g.status==='error'?'Gagal memuat data aset':'Memuat…';return;}
  var s=TD.asetScope(),perUp3=s.up3==='Semua';
  var hd=host.closest('.pa-bcol');var h2=hd&&hd.querySelector('.pa-bh2');if(h2)h2.textContent=perUp3?'Profil aset per UP3':'Profil aset per ULP UP3 '+s.up3;
  var num=function(v){return v===''||v==null||isNaN(+v)?null:+v;};
  var kunci=function(d){return perUp3?d.up3:d.ulp;};
  var by={};
  g.data.forEach(function(d){if(d.ulp==='Semua'||d.penyulang==='Semua')return;if(!perUp3&&d.up3!==s.up3)return;
    var k=kunci(d);var o=by[k]||(by[k]={nama:k,up3:d.up3,ulp:perUp3?null:d.ulp,jtm:null,gd:null,sw:0,mw:null,pyl:0,ulps:{}});o.pyl++;o.ulps[d.ulp]=1;
    var j=num(d.jtm_km);if(j!=null)o.jtm=(o.jtm||0)+j;
    var gd=num(d.gardu_distribusi);if(gd!=null)o.gd=(o.gd||0)+gd;
    ['lbs','pmcb','recloser','fco','switching_lain'].forEach(function(k){var v=num(d[k]);if(v)o.sw+=v;});});
  if(bb.status==='ok'&&bb.data)bb.data.forEach(function(d){if(!perUp3&&d.up3!==s.up3)return;var o=by[kunci(d)];if(!o)return;var i=+d.arus_a;if(!isFinite(i))return;
    o.mw=(o.mw||0)+Math.sqrt(3)*(+d.tegangan_kv||20)*i*(+d.faktor_daya||0.95)/1000;});
  var rows=Object.keys(by).map(function(u){return by[u];}).sort(function(a,b){return a.nama.localeCompare(b.nama,'id');});
  var M=[['jtm','Panjang JTM','km',TD.loc.format(',.1f')],['gd','Gardu distribusi','unit',TD.loc.format(',.0f')],['mw','Beban puncak','MW',TD.loc.format(',.2f')],['sw','Switching','unit',TD.loc.format(',.0f')]];
  var mx={};M.forEach(function(m){mx[m[0]]=d3.max(rows,function(r){return r[m[0]];})||1;});
  var tb=el('table','pw-prof');var th=el('tr');th.append(el('th',null,perUp3?'UP3':'ULP'));M.forEach(function(m){var h=el('th');h.append(document.createTextNode(m[1]),el('small',null,m[2]));th.append(h);});
  var thead=el('thead');thead.append(th);tb.append(thead);var tbody=el('tbody');
  var cell=function(r,m){var td=el('td');var v=r[m[0]];if(v==null){td.append(el('span','pw-na','—'));return td;}
    td.append(el('b',null,m[3](v)));var bar=el('i','pw-bar pw-'+m[0]);bar.style.width=Math.max(3,100*v/mx[m[0]])+'%';var tr=el('span','pw-track');tr.append(bar);td.append(tr);return td;};
  var tot={};
  rows.forEach(function(r){var tr=el('tr');var on=!perUp3&&s.ulp===r.ulp;if(on)tr.className='pw-on';tr.tabIndex=0;
    tr.title=perUp3?'Klik untuk memilih UP3 '+r.nama:'Klik untuk memilih ULP '+r.nama;
    var c0=el('td','pw-ulp');c0.append(el('b',null,r.nama));c0.append(el('small',null,(perUp3?Object.keys(r.ulps).length+' ULP · ':'')+r.pyl+' penyulang'));tr.append(c0);
    M.forEach(function(m){tr.append(cell(r,m));var v=r[m[0]];if(v!=null)tot[m[0]]=(tot[m[0]]||0)+v;});
    var pick=function(){var sel=document.getElementById('up3-aset');
      if(perUp3){dash.setParams({up3_aset:r.up3,ulp_aset:null,pyl_aset:null});if(sel)sel.value=r.up3;}
      else dash.setParams({ulp_aset:on?null:r.ulp,pyl_aset:null});};
    tr.onclick=pick;tr.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}};tbody.append(tr);});
  tb.append(tbody);
  if(rows.length>1){var tf=el('tfoot'),tr=el('tr');tr.append(el('td','pw-ulp','Total'));M.forEach(function(m){tr.append(el('td',null,tot[m[0]]==null?'—':m[3](tot[m[0]])));});tf.append(tr);tb.append(tf);}
  var catat=el('ol','td-note pw-profcat');
  var li=function(t){catat.append(el('li',null,t));};
  li(perUp3?'Pilih UP3 di filter atau klik barisnya untuk melihat profil per ULP.':'Klik baris ULP untuk memilihnya di peta; klik lagi untuk melepas.');
  li('Beban puncak adalah jumlah beban puncak penyulang pada Oktober 2026 (20 kV, faktor daya 0,95).');
  li('Switching mencakup LBS, PMCB, recloser dan FCO. Tanda — berarti data lapisan itu belum diterima (UP3 Tual baru berisi switching dan tiang).');
  host.replaceChildren(tb,catat);
});
dash.draw('peta-aset',{
mount:function(host){
  var wrap=el('div','pw-map');wrap.setAttribute('role','application');wrap.setAttribute('aria-label','Peta jaringan JTM dan aset distribusi');
  var msg=el('div','pa-msg','Memuat peta…');var tip=el('div','pa-tip');tip.hidden=true;
  var hint=el('div','pa-hint','Tekan Ctrl sambil menggulir untuk memperbesar peta');hint.hidden=true;
  var zn=el('div','pa-hint pa-zn');zn.hidden=true;
  host.replaceChildren(wrap,msg,tip,hint,zn);host.classList.add('pw-host');
  var map=L.map(wrap,{zoomControl:false,minZoom:4,maxZoom:20,zoomSnap:0.25,zoomDelta:1,wheelPxPerZoomLevel:90,worldCopyJump:false,center:[-2.5,129.5],zoom:6,attributionControl:true,tap:true});
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  L.control.scale({imperial:false,position:'bottomright',maxWidth:110}).addTo(map);
  map.createPane('pwlabel').style.zIndex=350;
  var pane=map.createPane('pwnet');pane.style.zIndex=450;pane.style.pointerEvents='none';
  var cv=L.DomUtil.create('canvas','pw-net',pane);
  var st={host:host,map:map,cv:cv,ctx:cv.getContext('2d'),msg:msg,tip:tip,hint:hint,zn:zn,tg:{},jtm:[],pts:[],ready:false,scopeKey:null,hover:null,pin:null,raf:0,hintT:0};
  /* gulir biasa menggulir halaman; Ctrl/⌘ + gulir memperbesar peta */
  host.addEventListener('wheel',function(e){if(e.ctrlKey||e.metaKey)return;e.stopPropagation();hint.hidden=false;clearTimeout(st.hintT);st.hintT=setTimeout(function(){hint.hidden=true;},1400);},true);
  map.on('move',function(){later(st);});
  map.on('zoomstart',function(){cv.style.visibility='hidden';st.tip.hidden=true;});
  map.on('zoomend moveend viewreset resize',function(){cv.style.visibility='';paint(st);});
  map.on('mousemove',function(e){var p=e.containerPoint;var h=hitAt(st,p.x,p.y);var prev=st.hover;st.hover=h;
    map.getContainer().style.cursor=h?'pointer':'';showTip(st,h,p.x,p.y);
    var key=function(o){return o?(o.q||o.f):null;};if(key(prev)!==key(h))later(st);});
  map.on('mouseout',function(){st.tip.hidden=true;if(st.hover){st.hover=null;later(st);}});
  map.on('click',function(e){var p=e.containerPoint;openPop(st,hitAt(st,p.x,p.y),e.latlng);});
  map.on('popupclose',function(){st.pin=null;later(st);});
  var box=host.closest('.pa-stage');
  if(box){
    box.querySelectorAll('.pa-zbtn').forEach(function(b){b.onclick=function(){var z=b.getAttribute('data-zoom');if(z==='in')map.zoomIn();else if(z==='out')map.zoomOut();else fit(st,true);};});
    var lg=box.querySelector('.pa-legend-in');if(lg){st.lgsym=el('span','pw-lgsym');st.lgsym.hidden=true;lg.appendChild(st.lgsym);}
  }
  return st;
},
update:function(host,st){
  var j=dash.data('gis_jtm'),p=dash.data('gis_titik'),g=C.rekap();var all=[j,p,g];
  if(all.some(function(x){return x.status==='error';})){st.msg.hidden=false;st.msg.textContent='Gagal memuat data peta';return;}
  if(all.some(function(x){return x.status!=='ok'||!x.data;})){st.msg.hidden=false;st.msg.textContent='Memuat peta…';return;}
  var s=TD.asetScope();st.s=s;
  var up3In=function(u){return s.up3==='Semua'||u===s.up3;};
  var SK=C.ref().SKEL;
  var tIds=C.PETA_UP3.filter(function(u){return C.TIANG[u]&&up3In(u)&&(C.lapisOn('tiang')||(C.lapisOn('jtm')&&SK.has(u)));}).map(function(u){return C.TIANG[u];});
  var tRes=tIds.map(function(id){return [id,dash.data(id)];});
  var tWait=tRes.some(function(r){return r[1].status!=='ok'&&r[1].status!=='error';}),tErr=tRes.some(function(r){return r[1].status==='error';});
  st.msg.hidden=!(tWait||tErr);st.msg.textContent=tErr?'Gagal memuat tiang TM':'Memuat tiang TM…';
  if(!st.ready||st.src!==j.data){
    st.src=j.data;
    st.jtm=j.data.map(function(d){var c=parse(d.coords);var f=new Float64Array(c.length*2),b=[Infinity,Infinity,-Infinity,-Infinity];
      c.forEach(function(q,i){var P=px0(q[0],q[1]);f[i*2]=P[0];f[i*2+1]=P[1];if(P[0]<b[0])b[0]=P[0];if(P[1]<b[1])b[1]=P[1];if(P[0]>b[2])b[2]=P[0];if(P[1]>b[3])b[3]=P[1];});return {d:d,f:f,b:b};});
    st.pts=p.data.map(function(d){var P=px0(+d.lon,+d.lat);return {d:d,x:P[0],y:P[1],st:styleOf(d)};});
    st.ready=true;st.scopeKey=null;
  }
  tRes.forEach(function(r){var id=r[0],res=r[1];if(res.status==='ok'&&res.data&&!st.tg[id]){st.tg[id]=res.data.filter(function(d){return isFinite(+d.lon)&&isFinite(+d.lat);}).map(function(d){var P=px0(+d.lon,+d.lat);return {d:d,x:P[0],y:P[1]};});st.lblKey=null;}});
  st.tIds=tIds.filter(function(id){return st.tg[id];});
  st.col=C.ulpColor(g.data);C.bebanIdx();st.pw=modeWarna()==='penyulang';
  st.lc=function(d){return st.pw?st.pcol(d):st.col(d.ulp);};
  /* posisi label ULP dan penyulang */
  var sk=s.up3+'|'+s.ulp+'|'+s.pyl;
  var lk=sk+'|'+st.tIds.join(',');
  var pk=st.tIds.join(',')+'|'+st.jtm.length;
  if(st.pcolKey!==pk){st.pcolKey=pk;st.pcol=warnaPenyulang(st,tiangRows(st,true));
    var an={};st.jtm.forEach(function(l){var k=l.d.ulp+'|'+l.d.penyulang;if(!an[k]||l.f.length>an[k].n){var mi=Math.floor(l.f.length/4)*2;an[k]={d:l.d,x:l.f[mi],y:l.f[mi+1],n:l.f.length};}});
    var sg2={};tiangRows(st,true).forEach(function(q){var k=q.d.ulp+'|'+q.d.penyulang;if(an[k]&&an[k].n)return;(sg2[k]=sg2[k]||[]).push(q);});
    Object.keys(sg2).forEach(function(k){var v=sg2[k];if(v[0].d.penyulang==='(tanpa kode)')return;an[k]={d:v[0].d,x:d3.median(v,function(q){return q.x;}),y:d3.median(v,function(q){return q.y;}),n:0};});
    st.anchors=Object.keys(an).map(function(k){return an[k];});}
  if(st.lblKey!==lk){st.lblKey=lk;
    var grp={};st.pts.forEach(function(q){if(q.st.k!=='gardu')return;(grp[q.d.ulp]=grp[q.d.ulp]||[]).push(q);});
    var sg={};tiangRows(st,true).forEach(function(q){(sg[q.d.ulp]=sg[q.d.ulp]||[]).push(q);});
    var med=function(v){return [d3.median(v,function(q){return q.x;}),d3.median(v,function(q){return q.y;})];};
    st.lbl=Object.keys(Object.assign({},grp,sg)).map(function(u){var v=grp[u]&&grp[u].length?grp[u]:sg[u];var m=med(v);return {ulp:u,x:m[0],y:m[1]};});
    st.pylLbl=null;
    if(s.pyl!=='Semua'){var best=null;st.jtm.forEach(function(l){if(inScope(l.d,s)&&(!best||l.f.length>best.f.length))best=l;});
      if(best){var mi=Math.floor(best.f.length/4)*2;st.pylLbl=[best.f[mi],best.f[mi+1]];}
      else{var w=tiangRows(st,true).filter(function(q){return inScope(q.d,s);});if(!w.length)w=st.pts.filter(function(q){return inScope(q.d,s);});if(w.length)st.pylLbl=med(w);}}
  }
  setBase(st);
  st.map.invalidateSize({pan:false});
  var skelWait=tRes.some(function(r){return r[1].status!=='ok'&&r[1].status!=='error'&&C.PETA_UP3.some(function(u){return C.TIANG[u]===r[0]&&SK.has(u);});});
  if(st.scopeKey!==sk&&!skelWait){var first=st.scopeKey===null;st.scopeKey=sk;st.map.closePopup();fit(st,!first);}
  legendSym(st);legendPyl(st);
  paint(st);
},
unmount:function(host,st){if(st){clearTimeout(st.hintT);if(st.raf)cancelAnimationFrame(st.raf);st.map.remove();}}
});
}};
})();
