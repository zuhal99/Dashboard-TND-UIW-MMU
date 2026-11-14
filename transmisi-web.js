/* Tab Transmisi (versi web), permintaan Zuhal 14 Nov 2026.
   Isi: tiga kinerja (Transmisi, Prosis, Scadatel) dan anggaran Transmisi sendiri (AI dan AO),
   terpisah dari tab Anggaran (Distribusi). Data dari window.__TRS (transmisi-data.js, dibuat trs_extract.py).
   Dipasang build_web.py sebelum __mulai(): menambah <section id="transmisi" data-hal="Transmisi">
   dan melepas Transmisi dari section #kinerja. */
(function(){
'use strict';
var D=window.__TRS; if(!D)return;
var SRC={
  ao:'https://docs.google.com/spreadsheets/d/17pCTW7S7Ua7azhSci-X3NzWWWbvqi_LC/edit?gid=1477443203#gid=1477443203',
  ai:'https://docs.google.com/spreadsheets/d/1G_Wspp-EKb7E2XOGRaBjZMmxAuZlqqAQ/edit?gid=56154097#gid=56154097',
  scada:'https://docs.google.com/spreadsheets/d/1txdrftRIr5zLWs8Ayj2LfvkpyYegT8cm/edit?gid=1132446219#gid=1132446219',
  trs:'https://ptpln365-my.sharepoint.com/:f:/g/personal/pradipta_widya_ptpln365_onmicrosoft_com/IgAKUBII7J_EQq1ML8iN5QweAUxMCpqOhQVt9kTk9SfJ5os?e=pd0GrR',
  prosis:'https://ptpln365-my.sharepoint.com/:x:/g/personal/aditia_akurniawan_ptpln365_onmicrosoft_com/IQDn1-7wDrEHQ7gTBRGgHpRrAcRzFK413du7xFK-CX5HAgU?e=Heh9w3'};
var BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
var BS=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
var VIEWS=[
  {k:'k-trs',g:'Kinerja',t:'Transmisi'},{k:'k-prosis',g:'Kinerja',t:'Prosis'},{k:'k-scada',g:'Kinerja',t:'Scadatel'},
  {k:'a-ai',g:'Anggaran',t:'Investasi (AI)'},{k:'a-ao',g:'Anggaran',t:'Operasi (AO)'}];
var st={v:'k-scada',ai:'Semua',aiu:'Semua',sp:'Avail SCADA (%)'};
try{var sv=JSON.parse(localStorage.getItem('trs-web')||'{}');if(sv&&sv.v&&VIEWS.some(function(x){return x.k===sv.v;}))st.v=sv.v;}catch(e){}
function simpan(){try{localStorage.setItem('trs-web',JSON.stringify({v:st.v}));}catch(e){}}

/* ---------- util ---------- */
function E(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function fx(v,d){return v.toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});}
function rp(v){if(v==null||isNaN(v))return '—';var a=Math.abs(v);
  if(a>=1e9)return 'Rp '+fx(v/1e9,2)+' M';if(a>=1e6)return 'Rp '+fx(v/1e6,1)+' jt';if(a===0)return 'Rp 0';return 'Rp '+fx(v,0);}
function rpPenuh(v){return v==null?'—':'Rp '+Math.round(v).toLocaleString('id-ID');}
function pc(v,d){return v==null||!isFinite(v)?'—':fx(v,d==null?1:d)+'%';}
function link(href,txt){return '<a class="kp-upbtn trs-upbtn" href="'+href+'" target="_blank" rel="noopener noreferrer">'+txt+' <span aria-hidden="true">↗</span></a>';}
var SVGNS='http://www.w3.org/2000/svg';
function S(tag,at){var e=document.createElementNS(SVGNS,tag);for(var k in at)e.setAttribute(k,at[k]);return e;}

/* ---------- section ---------- */
var kin=document.getElementById('kinerja');
if(kin){kin.setAttribute('data-hal',(kin.getAttribute('data-hal')||'').split(' ').filter(function(h){return h!=='Transmisi';}).join(' '));}
window.__SB_ASLI=(window.__SB_ASLI||[]).concat(['Transmisi']);
var sec=E('section','td-panel trs');sec.id='transmisi';sec.setAttribute('data-hal','Transmisi');sec.hidden=true;
sec.innerHTML='<div class="kp-intro"><h2 class="kp-title">Sub Bidang Transmisi</h2>'+
  '<p class="td-note">Tiga kinerja (Transmisi, Prosis, Scadatel) dan anggaran Transmisi. Anggaran di sini khusus fungsi Transmisi dan tidak digabung ke tab Anggaran (Distribusi).</p></div>';
var nav=E('div','trs-nav');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Pilih isi tab Transmisi');
['Kinerja','Anggaran'].forEach(function(g){
  var grp=E('div','trs-grp');grp.append(E('span','trs-glab',g));
  VIEWS.filter(function(v){return v.g===g;}).forEach(function(v){
    var b=E('button','trs-tab',esc(v.t));b.type='button';b.setAttribute('role','tab');b.setAttribute('data-v',v.k);
    if(v.k==='k-trs'||v.k==='k-prosis')b.innerHTML+=' <span class="trs-wait">menunggu</span>';
    b.addEventListener('click',function(){st.v=v.k;simpan();render();});grp.append(b);});
  nav.append(grp);});
sec.append(nav);
var isi=E('div','trs-isi');isi.id='trs-isi';sec.append(isi);
var cat=document.getElementById('catatan');
if(cat&&cat.parentNode)cat.parentNode.insertBefore(sec,cat);else document.getElementById('dash-root').append(sec);

/* ---------- tooltip ---------- */
function tipFor(box){var t=box.querySelector(':scope>.trs-tip');if(!t){t=E('div','trs-tip');t.hidden=true;box.append(t);}
  return{show:function(h,x,y){t.innerHTML=h;t.hidden=false;var w=t.offsetWidth;t.style.left=Math.max(0,Math.min(x+12,box.clientWidth-w-4))+'px';t.style.top=Math.max(0,y-t.offsetHeight-10)+'px';},hide:function(){t.hidden=true;}};}

/* ---------- Kinerja menunggu file ---------- */
function vMenunggu(nama,href){
  var c=E('div','td-card trs-empty');
  c.innerHTML='<h3>Kinerja '+nama+' belum dimuat</h3>'+
   '<p>File kinerja '+nama+' tersimpan di SharePoint/OneDrive PLN, yang tidak dapat dibuka dari sistem pengolah dashboard. Data akan tampil di sini setelah file diunggah ke proyek atau disalin ke Google Drive.</p>'+
   '<p>'+link(href,'Buka sumber di SharePoint')+'</p>';
  return c;}

/* ---------- Scadatel ---------- */
function vScada(){
  var sc=D.scada,n=sc.bulan_akhir,w=E('div','trs-view');
  var hd=E('div','trs-head');
  hd.innerHTML='<p class="td-note">Posisi s.d. <b>'+BLN[n-1]+' 2026</b>, tingkat UIW MMU. Sumber: '+esc(sc.judul)+' (sheet 0 MMU AVAIL_SCADA dan Kumulatif). Nilai dalam persen.</p>'+link(SRC.scada,'Update di spreadsheet');
  w.append(hd);
  var byB={},byK={};sc.bulanan.forEach(function(p){byB[p.nama]=p.nilai;});sc.kumulatif.forEach(function(p){byK[p.nama]=p.nilai;});
  var cards=E('div','trs-cards');cards.setAttribute('role','list');
  sc.kumulatif.forEach(function(p){
    var kv=p.nilai[n-1],bv=(byB[p.nama]||[])[n-1];
    var c=E('button','trs-card trs-card-btn'+(p.nama===st.sp?' on':''));c.type='button';c.setAttribute('role','listitem');
    c.setAttribute('aria-pressed',String(p.nama===st.sp));
    var nm=p.nama.replace(' (%)','');
    c.innerHTML='<span class="trs-cl">'+esc(nm)+'</span><span class="trs-cv">'+pc(kv,2)+'</span>'+
      '<span class="trs-cs">Kumulatif s.d. '+BS[n-1]+'</span><span class="trs-cs">Bulan '+BS[n-1]+': '+(bv!=null?pc(bv,2):'—')+'</span>'+
      '<span class="trs-ct">Target KM belum ada</span>';
    c.append(spark(p.nilai.slice(0,n)));
    c.addEventListener('click',function(){st.sp=p.nama;render();});
    cards.append(c);});
  w.append(cards);
  /* grafik tren */
  var g=E('div','td-card trs-chartcard');
  var nm=st.sp.replace(' (%)','');
  g.innerHTML='<h3>'+esc(nm)+': bulanan dan kumulatif 2026</h3>';
  var kum=byK[st.sp]||[],bul=byB[st.sp]||[];
  if(st.sp==='Akurasi TID'){bul=byB['Akurasi Telemetering']||[];}
  g.append(lineChart([{nama:'Kumulatif',v:kum.slice(0,n),cls:'k'},{nama:'Bulanan',v:bul.slice(0,n),cls:'b'}],n));
  g.append(E('div','td-legend trs-legend','<span><i class="trs-lg k"></i>Kumulatif</span><span><i class="trs-lg b"></i>Bulanan'+(st.sp==='Akurasi TID'?' (Akurasi Telemetering)':'')+'</span><span>Sumbu tegak dipersempit agar selisih kecil terlihat.</span>'));
  w.append(g);
  /* tabel bulanan */
  var t=E('div','td-sec');
  var h='<h3 class="trs-h3">Nilai bulanan per parameter (%)</h3><div class="td-scroll"><table class="td-table trs-table"><thead><tr><th class="l">Parameter</th>';
  for(var i=0;i<n;i++)h+='<th>'+BS[i]+'</th>';
  h+='</tr></thead><tbody>';
  sc.bulanan.forEach(function(p){h+='<tr><td class="l">'+esc(p.nama.replace(' (%)',''))+'</td>';
    for(var i=0;i<n;i++){var v=p.nilai[i];h+='<td'+(v!=null&&v<100?' class="trs-dip"':'')+'>'+(v==null?'—':fx(v,2))+'</td>';}h+='</tr>';});
  h+='</tbody></table></div><p class="td-note">Sel bertanda menunjukkan nilai di bawah 100%. Lembar bulanan memuat Akurasi Telemetering dan Validasi TSD, sedangkan lembar kumulatif memuat Akurasi TID. Status warna belum ditampilkan karena target kontrak manajemen Scadatel belum diterima.</p>';
  t.innerHTML=h;w.append(t);
  return w;}
function spark(v){var W=120,H=28,s=S('svg',{viewBox:'0 0 '+W+' '+H,class:'trs-spark','aria-hidden':'true'});
  var xs=v.map(function(_,i){return v.length<2?W/2:4+i*(W-8)/(v.length-1);});
  var vals=v.filter(function(x){return x!=null;});if(!vals.length)return s;
  var lo=Math.min.apply(null,vals),hi=Math.max.apply(null,vals);if(hi-lo<0.5){lo=hi-0.5;}
  var y=function(x){return H-4-(x-lo)/(hi-lo)*(H-8);};
  var d='';v.forEach(function(x,i){if(x==null)return;d+=(d?'L':'M')+xs[i].toFixed(1)+' '+y(x).toFixed(1);});
  s.append(S('path',{d:d,fill:'none',stroke:'currentColor','stroke-width':1.6,'stroke-linejoin':'round'}));
  var li=v.length-1;if(v[li]!=null)s.append(S('circle',{cx:xs[li],cy:y(v[li]),r:2.4,fill:'currentColor'}));
  return s;}
function lineChart(series,n){
  var box=E('div','trs-chart');var W=Math.max(320,Math.min(960,(isi.clientWidth||900)-40)),H=240,m={l:46,r:16,t:14,b:28};
  var all=[];series.forEach(function(s){s.v.forEach(function(x){if(x!=null)all.push(x);});});
  var lo=Math.min.apply(null,all.concat([100])),hi=100;lo=Math.floor((lo-0.05)*10)/10;if(hi-lo<0.5)lo=hi-0.5;hi=hi+(hi-lo)*0.08;
  var svg=S('svg',{viewBox:'0 0 '+W+' '+H,width:'100%',role:'img','aria-label':'Grafik tren'});
  var x=function(i){return m.l+(n<2?0:i*(W-m.l-m.r)/(n-1));},y=function(v){return m.t+(hi-v)/(hi-lo)*(H-m.t-m.b);};
  var stp=(100-lo)<=1?0.2:(100-lo)<=2.5?0.5:1;
  for(var g=100;g>=lo-1e-9;g-=stp){g=Math.round(g*10)/10;svg.append(S('line',{x1:m.l,x2:W-m.r,y1:y(g),y2:y(g),class:'trs-grid'}));
    var tx=S('text',{x:m.l-6,y:y(g)+4,'text-anchor':'end',class:'trs-ax'});tx.textContent=fx(g,1);svg.append(tx);}
  for(var i=0;i<n;i++){var t=S('text',{x:x(i),y:H-8,'text-anchor':'middle',class:'trs-ax'});t.textContent=BS[i];svg.append(t);}
  series.forEach(function(s){var d='';s.v.forEach(function(v,i){if(v==null)return;d+=(d?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);});
    svg.append(S('path',{d:d,class:'trs-ln '+s.cls}));
    s.v.forEach(function(v,i){if(v==null)return;svg.append(S('circle',{cx:x(i),cy:y(v),r:3.2,class:'trs-pt '+s.cls}));});});
  var tip=null;box.append(svg);
  var hov=S('rect',{x:m.l-10,y:m.t,width:W-m.l-m.r+20,height:H-m.t-m.b,fill:'transparent'});svg.append(hov);
  function at(ev){var r=svg.getBoundingClientRect(),sx=(ev.clientX-r.left)*W/r.width,i=Math.round((sx-m.l)/((W-m.l-m.r)/Math.max(1,n-1)));i=Math.max(0,Math.min(n-1,i));
    var h='<b>'+BLN[i]+'</b>';series.forEach(function(s){h+='<br>'+s.nama+': '+(s.v[i]==null?'—':fx(s.v[i],2)+'%');});
    tip=tip||tipFor(box);tip.show(h,(ev.clientX-box.getBoundingClientRect().left),(ev.clientY-box.getBoundingClientRect().top));}
  hov.addEventListener('mousemove',at);hov.addEventListener('mouseleave',function(){tip&&tip.hide();});
  return box;}

/* ---------- Anggaran Investasi ---------- */
var TAHAP=[{k:'User',l:'Di user'},{k:'Rendan',l:'Rendan'},{k:'Laksdan',l:'Laksdan'},{k:'Proses Pekerjaan/Konstruksi',l:'Konstruksi'},{k:'COD',l:'COD'}];
function tahapL(t){for(var i=0;i<TAHAP.length;i++)if(TAHAP[i].k===t)return TAHAP[i].l;return t||'—';}
function vAI(){
  var A=D.ai,w=E('div','trs-view');
  var rows=A.baris.filter(function(r){return(st.ai==='Semua'||r.status===st.ai)&&(st.aiu==='Semua'||r.unit===st.aiu);});
  var hd=E('div','trs-head');
  hd.innerHTML='<div class="trs-filt"><span class="td-flabel">Status</span>'+seg('ai',['Semua','Murni','Lanjutan'])+
    '<label class="td-flabel" for="trs-aiu">Unit</label><select class="dash-select" id="trs-aiu"><option>Semua</option><option>UIW</option><option>UP3B Maluku</option></select></div>'+
    link(SRC.ai,'Update di spreadsheet');
  w.append(hd);
  hd.querySelector('#trs-aiu').value=st.aiu;
  hd.querySelector('#trs-aiu').addEventListener('change',function(e){st.aiu=e.target.value;render();});
  bindSeg(hd);
  var sum=function(k){return rows.reduce(function(a,r){return a+(r[k]||0);},0);};
  var ai=sum('ai'),aki=sum('aki'),kon=sum('kontrak'),ren=sum('rencana');
  var nPrk={};rows.forEach(function(r){nPrk[r.prk]=1;});
  var nK=rows.filter(function(r){return r.kontrak>0;}).length;
  var cards=E('div','trs-cards');
  cards.append(card('Pagu AI',rp(ai),Object.keys(nPrk).length+' PRK, '+rows.length+' paket pekerjaan'));
  cards.append(card('AKI',rp(aki),aki&&ai?pc(aki/ai*100)+' dari pagu AI':''));
  cards.append(card('Terkontrak',rp(kon),(aki?pc(kon/aki*100)+' dari AKI · ':'')+nK+' kontrak','ok'));
  cards.append(card('Rencana kontrak belum terkontrak',rp(ren),rows.filter(function(r){return !r.kontrak&&r.rencana>0;}).length+' paket dalam proses'));
  w.append(cards);
  /* tahap */
  var g=E('div','td-grid2');
  var c1=E('div','td-card');c1.innerHTML='<h3>Tahap pengadaan per paket</h3>';
  var mx=0,T=TAHAP.map(function(t){var xs=rows.filter(function(r){return r.tahap===t.k;});var v=xs.reduce(function(a,r){return a+(r.kontrak||r.rencana||r.ai||0);},0);if(v>mx)mx=v;return{t:t,n:xs.length,v:v};});
  var fb=E('div','trs-funnel');
  T.forEach(function(o){var r=E('div','trs-fr');r.innerHTML='<span class="trs-fl">'+o.t.l+'</span><span class="trs-fbar"><i style="width:'+(mx?Math.max(o.v?2:0,o.v/mx*100):0)+'%"></i></span><span class="trs-fv"><b>'+o.n+'</b> paket · '+rp(o.v)+'</span>';fb.append(r);});
  c1.append(fb);c1.append(E('p','td-note','Nilai = nilai kontrak bila sudah terkontrak, selain itu rencana kontrak (atau pagu AI bila rencana kosong).'));
  var c2=E('div','td-card');c2.innerHTML='<h3>Perlu perhatian</h3>';
  var ul=E('ul','trs-list');
  rows.forEach(function(r){var k=(r.ket||'').toLowerCase();
    if(/gagal|ulang/.test(k))ul.append(E('li','trs-li-bad','<b>'+esc(r.spk)+'</b>: '+esc(r.ket)+' ('+rp(r.rencana||r.ai)+').'));});
  rows.filter(function(r){return r.induk&&r.aki&&r.rencana>r.aki;}).forEach(function(r){ul.append(E('li','trs-li-warn','<b>'+esc(r.spk)+'</b>: rencana kontrak '+rp(r.rencana)+' melebihi AKI '+rp(r.aki)+'.'));});
  rows.filter(function(r){return r.induk&&r.status==='Murni'&&!r.aki;}).forEach(function(r){ul.append(E('li','trs-li-warn','<b>'+esc(r.pekerjaan)+'</b>: AKI belum diisi (pagu AI '+rp(r.ai)+').'));});
  var blm=rows.filter(function(r){return r.status==='Murni'&&!r.kontrak&&(r.tahap==='User'||r.tahap==='Rendan');});
  if(blm.length)ul.append(E('li','','<b>'+blm.length+' paket Murni</b> masih di user atau rendan, senilai '+rp(blm.reduce(function(a,r){return a+(r.rencana||r.ai||0);},0))+', sementara tahun anggaran tinggal ±1,5 bulan.'));
  if(!ul.children.length)ul.append(E('li','','Tidak ada catatan untuk pilihan ini.'));
  c2.append(ul);
  g.append(c1);g.append(c2);w.append(g);
  /* tabel */
  var t=E('div','td-sec');
  var h='<h3 class="trs-h3">Rincian paket pekerjaan</h3><div class="td-scroll"><table class="td-table trs-table"><thead><tr><th class="l">Pekerjaan</th><th class="l">Status</th><th class="l">Unit</th><th>Pagu AI</th><th>AKI</th><th>Rencana kontrak</th><th>Nilai kontrak</th><th class="l">Tahap</th><th class="l">Keterangan</th></tr></thead><tbody>';
  var last='';
  rows.forEach(function(r){
    if(r.prk!==last){last=r.prk;h+='<tr class="trs-grp-row"><td class="l" colspan="9"><b>'+esc(r.prk||'(tanpa PRK)')+'</b> · '+esc(r.pekerjaan)+'</td></tr>';}
    h+='<tr><td class="l trs-wrap">'+esc(r.spk)+'</td><td class="l">'+r.status+'</td><td class="l">'+esc(r.unit)+'</td><td>'+(r.ai?rp(r.ai):'')+'</td><td>'+(r.induk?(r.aki?rp(r.aki):'—'):'')+'</td><td>'+(r.rencana?rp(r.rencana):'')+'</td><td>'+(r.kontrak?rp(r.kontrak):'')+'</td><td class="l"><span class="trs-badge t'+TAHAP.findIndex(function(x){return x.k===r.tahap;})+'">'+esc(tahapL(r.tahap))+'</span></td><td class="l trs-wrap">'+esc([r.ket,r.bayar?'Rencana bayar: '+r.bayar:''].filter(Boolean).join(' · '))+'</td></tr>';});
  h+='</tbody></table></div><p class="td-note">Sumber: '+esc(A.judul)+' (sheet Timeline (2) dan AKI). Pagu AI dan AKI dicatat per PRK pada baris paket pertama. Nilai terbayar AI belum tersedia di file sumber, sehingga serapan belum dapat dihitung.</p>';
  t.innerHTML=h;w.append(t);
  return w;}

/* ---------- Anggaran Operasi ---------- */
function vAO(){
  var A=D.ao,w=E('div','trs-view');
  var hd=E('div','trs-head');
  hd.innerHTML='<p class="td-note">AO fungsi Transmisi UIW MMU, SKKO '+esc(A.skko)+'. Sumber: '+esc(A.judul)+' (sheet 53 TRS).</p>'+link(SRC.ao,'Update di spreadsheet');
  w.append(hd);
  var cards=E('div','trs-cards');
  cards.append(card('AO terbit',rp(A.ao_terbit),'Total murni AO terbit di Kanwil'));
  cards.append(card('ND / rencana pengadaan',rp(A.rencana),pc(A.rencana/A.ao_terbit*100)+' dari AO terbit'));
  cards.append(card('Terkontrak',rp(A.terkontrak),'Termasuk hutang usaha 2025 '+rp(A.hutang_terkontrak)));
  cards.append(card('Terbayar',rp(A.terbayar),pc(A.terbayar/A.ao_terbit*100)+' dari AO terbit · murni 2026 '+rp(A.terbayar_murni),'ok'));
  w.append(cards);
  /* bar per kategori */
  var kat=A.kategori.filter(function(k){return k.ao||k.rencana||k.terkontrak||k.terbayar;});
  var c=E('div','td-card');c.innerHTML='<h3>AO per kelompok program</h3>';
  var mx=Math.max.apply(null,kat.map(function(k){return Math.max(k.ao,k.rencana,k.terkontrak,k.terbayar);}));
  var KS=[['ao','AO terbit'],['rencana','ND/rencana'],['terkontrak','Terkontrak'],['terbayar','Terbayar']];
  var bx=E('div','trs-bars');
  kat.forEach(function(k){var r=E('div','trs-br');r.append(E('div','trs-bl',esc(k.nama)));
    var bs=E('div','trs-bb');KS.forEach(function(s){var v=k[s[0]];bs.append(E('div','trs-bi','<span class="trs-bk">'+s[1]+'</span><span class="trs-bt"><i class="'+s[0]+'" style="width:'+(mx?Math.max(v?1:0,v/mx*100):0)+'%"></i></span><span class="trs-bv">'+rp(v)+'</span>'));});
    r.append(bs);bx.append(r);});
  c.append(bx);
  c.append(E('p','td-note','Kelompok Periodik, Rutin, Korektif dan Khusus belum memiliki nilai di sheet, sehingga tidak ditampilkan. Hutang usaha 2025 tidak memiliki pagu AO 2026 tersendiri.'));
  w.append(c);
  /* tabel */
  var t=E('div','td-sec');
  var h='<h3 class="trs-h3">Rincian pekerjaan</h3><div class="td-scroll"><table class="td-table trs-table"><thead><tr><th class="l">Pekerjaan</th><th class="l">Status</th><th>Nilai AO</th><th>ND/rencana</th><th>Terkontrak</th><th>Terbayar</th><th class="l">Pelaksana</th></tr></thead><tbody>';
  var nm={};A.kategori.forEach(function(k){nm[k.kode]=k.nama;});
  var last='';
  A.baris.forEach(function(r){if(r.kat!==last){last=r.kat;h+='<tr class="trs-grp-row"><td class="l" colspan="7"><b>'+esc(nm[r.kat]||r.kat)+'</b></td></tr>';}
    var over=r.ao&&r.rencana>r.ao+1000;
    h+='<tr'+(r.anak?' class="trs-child"':'')+'><td class="l trs-wrap">'+esc(r.uraian||'—')+(r.prk?'<span class="trs-prk">'+esc(r.prk)+'</span>':'')+'</td><td class="l">'+esc(r.status||'')+'</td><td>'+(r.ao?rp(r.ao):'')+'</td><td'+(over?' class="trs-over" title="ND/rencana melebihi nilai AO"':'')+'>'+(r.rencana?rp(r.rencana):'')+'</td><td>'+(r.terkontrak?rp(r.terkontrak):'')+'</td><td>'+(r.terbayar?rp(r.terbayar):'')+'</td><td class="l">'+esc(r.vendor||'')+'</td></tr>';});
  h+='</tbody></table></div><p class="td-note">Baris menjorok adalah pekerjaan di bawah PRK di atasnya. Angka merah: ND/rencana melebihi nilai AO pekerjaan. Hutang usaha 2025 (OPGI dan GP Transmisi bulan Nov–Des 2025) dibayar dari AO 2026 dan ikut dihitung dalam total terbayar, sesuai sheet.</p>';
  t.innerHTML=h;w.append(t);
  return w;}

function card(l,v,s,cls){var c=E('div','trs-card'+(cls?' '+cls:''));c.setAttribute('role','listitem');c.innerHTML='<span class="trs-cl">'+esc(l)+'</span><span class="trs-cv">'+v+'</span>'+(s?'<span class="trs-cs">'+s+'</span>':'');return c;}
function seg(key,opts){return '<span class="trs-seg" data-k="'+key+'">'+opts.map(function(o){return '<button type="button" data-o="'+o+'" aria-pressed="'+(st[key]===o)+'">'+o+'</button>';}).join('')+'</span>';}
function bindSeg(root){root.querySelectorAll('.trs-seg').forEach(function(sg){var k=sg.getAttribute('data-k');sg.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){st[k]=b.getAttribute('data-o');render();});});});}

/* ---------- render ---------- */
function render(){
  nav.querySelectorAll('.trs-tab').forEach(function(b){var on=b.getAttribute('data-v')===st.v;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  isi.innerHTML='';
  var v=st.v==='k-trs'?vMenunggu('Transmisi',SRC.trs):st.v==='k-prosis'?vMenunggu('Prosis',SRC.prosis):st.v==='k-scada'?vScada():st.v==='a-ai'?vAI():vAO();
  isi.append(v);}
render();
var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){if(!sec.hidden&&st.v==='k-scada')render();},200);});
new MutationObserver(function(){if(!sec.hidden&&st.v==='k-scada')render();}).observe(sec,{attributes:true,attributeFilter:['hidden']});
window.__trsRender=render;
})();
