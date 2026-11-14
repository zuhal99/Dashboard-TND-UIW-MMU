/* Health index penyulang di Peta Aset (versi web), permintaan Zuhal 14 Nov 2026.
   Sumber: dataset health_index (sheet HEALTH INDEX, spreadsheet Gangguan Distribusi APKT).
   Status per bulan dari jumlah gangguan penyulang: 0 Sempurna, 1-3 Sehat, 4-9 Sakit, >=10 Kronis.
   Dipanggil dari peta-web.js (warna jaringan, legenda, kartu) dan memasang: tombol warna "Health index",
   tab panel kanan "Health index", kolom tabel rekap. */
(function(){
'use strict';
if(!window.dash)return;
var SHEET='https://docs.google.com/spreadsheets/d/1rzEIhx2K2B3JArbKAz4K7GpCdYYBlkwqAtHXSMYgvuc/edit#gid=2030371538';
var ST=[
  {k:'Sempurna',c:'#1B8A3A',bg:'#E3F4E8',fg:'#14662C',ket:'0 gangguan'},
  {k:'Sehat',c:'#7DC243',bg:'#EEF7E4',fg:'#3F6E17',ket:'1–3 gangguan'},
  {k:'Sakit',c:'#F59E0B',bg:'#FEF3DC',fg:'#8A5400',ket:'4–9 gangguan'},
  {k:'Kronis',c:'#DC2626',bg:'#FDE4E4',fg:'#9B1C1C',ket:'≥ 10 gangguan'}];
var NA={k:'Tanpa data',c:'#9AA7B3',bg:'#EEF1F4',fg:'#4A5866',ket:'tidak ada di sheet'};
var SC={};ST.concat([NA]).forEach(function(s){SC[s.k]=s;});
var FADE='rgba(150,160,172,.28)';
var BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
var BS=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
var off={};            /* status yang disembunyikan lewat legenda */
var pilihBulan=null;   /* bulan pilihan pengguna (1-12); null = bawaan */
var tab='profil';
var semua=false;       /* daftar perlu perhatian: tampilkan semua */
var cache={src:null};

function stat(n){return n==null?null:n===0?'Sempurna':n<=3?'Sehat':n<=9?'Sakit':'Kronis';}
function key(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
function judul(s){return String(s||'').toLowerCase().split(' ').map(function(w){return /\d/.test(w)?w.toUpperCase():w.charAt(0).toUpperCase()+w.slice(1);}).join(' ');}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
function fmt(n){return (window.TD&&TD.loc?TD.loc.format(',.0f')(n):String(n));}

function model(){
  var r=dash.data('health_index');
  if(r.status!=='ok'||!r.data)return null;
  if(cache.src===r.data)return cache;
  var rows=r.data.map(function(d){var v=[];for(var m=1;m<=12;m++){var x=d['b'+(m<10?'0':'')+m];v.push(x===''||x==null?null:+x);}
    return {up3:d.up3,ulp:d.ulp,nama:d.peta_penyulang||judul(d.penyulang),peta:!!d.peta_penyulang,pu:d.peta_ulp||d.ulp,v:v,tahun:+d.tahun||null};});
  var aktif=rows.filter(function(x){return x.v.some(function(n){return n!=null;});});
  var last=0;for(var m=1;m<=12;m++){if(aktif.length&&aktif.every(function(x){return x.v[m-1]!=null;}))last=m;}
  var th=rows.length?rows[0].tahun:null;
  var now=new Date(Date.now()+9*3600e3);  /* WIT */
  var jalan=th===now.getUTCFullYear()&&last===now.getUTCMonth()+1;
  /* indeks peta: ULP|penyulang (nama di peta); bila ada dua baris, ambil gangguan terbanyak */
  var idx={};
  rows.forEach(function(x){if(!x.peta)return;var k=key(x.pu)+'|'+key(x.nama);var o=idx[k];
    if(!o){idx[k]={up3:x.up3,ulp:x.pu,nama:x.nama,peta:true,v:x.v.slice(),tahun:x.tahun};return;}
    o.v=o.v.map(function(a,i){var b=x.v[i];return a==null?b:b==null?a:Math.max(a,b);});});
  cache={src:r.data,rows:rows,idx:idx,last:last,jalan:jalan,tahun:th};
  return cache;
}
function bulan(M){if(!M||!M.last)return 0;if(pilihBulan&&pilihBulan<=M.last)return pilihBulan;return M.jalan&&M.last>1?M.last-1:M.last;}
function namaBulan(M,m){return BLN[m-1]+' '+(M.tahun||'')+(M.jalan&&m===M.last?' (berjalan)':'');}
function cari(d){var M=model();if(!M)return null;return M.idx[key(d.ulp)+'|'+key(d.penyulang)]||null;}
function statusPeta(d){var r=cari(d);if(!r)return 'Tanpa data';var s=stat(r.v[bulan(model())-1]);return s||'Tanpa data';}
function chip(s,n){var e=el('span','hi-chip');var o=SC[s]||NA;e.style.background=o.bg;e.style.color=o.fg;var i=el('i');i.style.background=o.c;e.append(i,document.createTextNode(s+(n!=null?' · '+n:'')));return e;}
function repaint(){dash.draw();}
function selBulan(M){
  var s=el('select','hi-bln');s.setAttribute('aria-label','Bulan health index');
  for(var m=M.last;m>=1;m--){var o=el('option',null,BS[m-1]+' '+M.tahun+(M.jalan&&m===M.last?' (berjalan)':''));o.value=m;if(m===bulan(M))o.selected=true;s.append(o);}
  s.onchange=function(){pilihBulan=+s.value;repaint();};return s;
}

/* ---------- dipanggil dari peta-web.js ---------- */
var HIW=window.HIW={
  aktif:function(){var b=document.querySelector('.pa-warna[aria-pressed="true"]');return !!b&&b.getAttribute('data-warna')==='hi';},
  col:function(d){if(d.penyulang==='(tanpa penyulang)'||d.penyulang==='(tanpa kode)')return off['Tanpa data']?FADE:NA.c;var s=statusPeta(d);return off[s]?FADE:SC[s].c;},
  legend:function(box,rows){
    var M=model();var kids=[];
    var hd=el('span','hi-lghd');hd.append(el('b','pa-lgtt','Health index penyulang'));
    if(!M){hd.append(el('small',null,'memuat…'));box.replaceChildren(hd);return;}
    if(M.last)hd.append(selBulan(M));kids.push(hd);
    var n={};rows.forEach(function(d){if(d.penyulang==='(tanpa penyulang)'||d.penyulang==='(tanpa kode)')return;var s=statusPeta(d);n[s]=(n[s]||0)+1;});
    var r=el('span','hi-lgrow');
    ST.concat([NA]).forEach(function(o){if(o===NA&&!n[o.k])return;var b=el('button','hi-lgbtn');b.type='button';b.setAttribute('aria-pressed',String(!off[o.k]));
      b.title=(off[o.k]?'Tampilkan ':'Sembunyikan ')+o.k.toLowerCase()+' ('+o.ket+')';var i=el('i');i.style.background=o.c;
      b.append(i,document.createTextNode(o.k+' '),el('small',null,String(n[o.k]||0)));
      b.onclick=function(){off[o.k]=!off[o.k];repaint();};r.append(b);});
    kids.push(r);kids.push(el('span','hi-lgnote','Gangguan per bulan: 0 Sempurna, 1–3 Sehat, 4–9 Sakit, ≥ 10 Kronis. Klik status untuk menyembunyikan atau menampilkannya.'));
    box.replaceChildren.apply(box,kids);
  },
  txt:function(pyl,ulp){var r=cari({penyulang:pyl,ulp:ulp});if(!r)return '';var M=model(),m=bulan(M),n=r.v[m-1];if(n==null)return '';
    return 'Health index '+BS[m-1]+' '+M.tahun+': '+stat(n)+' ('+n+' gangguan)';},
  mini:function(pyl,ulp){var r=cari({penyulang:pyl,ulp:ulp});if(!r)return null;return grafik(r,model());}
};

/* grafik batang gangguan per bulan untuk satu penyulang */
function grafik(r,M){
  var w=el('div','hi-mini');var sel=bulan(M);var mx=Math.max(10,d3.max(r.v,function(x){return x||0;}));
  var g=el('div','hi-mbars');
  for(var m=1;m<=12;m++){var n=r.v[m-1];var c=el('div','hi-mcol'+(m===sel?' on':'')+(M.jalan&&m===M.last?' jalan':''));
    var b=el('i');if(n!=null){b.style.height=Math.max(2,n/mx*100)+'%';b.style.background=SC[stat(n)].c;}
    c.title=BLN[m-1]+': '+(n==null?'belum ada data':n+' gangguan ('+stat(n)+')');
    var v=el('em',null,n==null?'':String(n));c.append(v,b,el('small','vl',BLN[m-1]));g.append(c);}
  w.append(el('b',null,'Gangguan per bulan '+M.tahun),g);return w;
}

/* ---------- tombol warna, tab panel ---------- */
function pasang(){
  var seg=document.querySelector('.pa-warnaseg');
  if(seg&&!seg.querySelector('[data-warna="hi"]')){
    var b=el('button','kp-segbtn pa-warna','Health index');b.type='button';b.setAttribute('data-warna','hi');b.setAttribute('aria-pressed','false');
    b.onclick=function(){document.querySelectorAll('.pa-warna').forEach(function(o){o.setAttribute('aria-pressed',String(o===b));});setTab('hi');};
    seg.append(b);
  }
  var col=document.querySelector('.pa-bcol#profil-ulp')||document.querySelector('.pa-bcol');
  if(col&&!col.querySelector('.hi-tabs')){
    var hd=col.querySelector('.pa-colhead');var t=el('div','hi-tabs');t.setAttribute('role','tablist');
    [['profil','Profil aset'],['hi','Health index penyulang']].forEach(function(x){var bt=el('button','hi-tab',x[1]);bt.type='button';bt.setAttribute('role','tab');bt.setAttribute('data-tab',x[0]);bt.onclick=function(){setTab(x[0]);};t.append(bt);});
    if(hd){hd.classList.add('hi-colhead');hd.prepend(t);}
    var pp=col.querySelector('[data-draw="pa-profil-ulp"]');
    var hp=el('div','pa-bpanel hi-pan');hp.setAttribute('data-draw','hi-panel');hp.hidden=true;
    if(pp)pp.after(hp);else col.append(hp);
    setTab(tab,true);
  }
  var tb=document.getElementById('tabel-aset');if(tb&&!tb.getAttribute('data-draw'))tb.setAttribute('data-draw','hi-tabel');
}
function setTab(t,diam){
  tab=t;var col=document.querySelector('.pa-bcol#profil-ulp')||document.querySelector('.pa-bcol');if(!col)return;
  col.querySelectorAll('.hi-tab').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-tab')===t));});
  var pp=col.querySelector('[data-draw="pa-profil-ulp"]'),hp=col.querySelector('.hi-pan');
  if(pp)pp.hidden=t!=='profil';if(hp)hp.hidden=t!=='hi';
  if(!diam)repaint();
}

/* ---------- panel health index ---------- */
function pilih(p){var sel=document.getElementById('up3-aset');if(p.up3_aset&&sel)sel.value=p.up3_aset;dash.setParams(p);}
dash.draw('hi-panel',function(host){
  var M=model();var r=dash.data('health_index');
  if(!M){host.textContent=r.status==='error'?'Gagal memuat data health index':'Memuat…';return;}
  var s=TD.asetScope(),perUp3=s.up3==='Semua',m=bulan(M),prev=m-1;
  var rows=M.rows.filter(function(x){return (perUp3||x.up3===s.up3)&&(s.ulp==='Semua'||key(x.pu)===key(s.ulp)||key(x.ulp)===key(s.ulp));});
  var kids=[];
  var hd=el('div','hi-phd');var ht=el('div');
  ht.append(el('b',null,'Health index penyulang '+(s.ulp!=='Semua'?'ULP '+s.ulp:perUp3?'UIW MMU':'UP3 '+s.up3)),
    el('small',null,rows.length+' penyulang · status '+namaBulan(M,m)));
  hd.append(ht);if(M.last)hd.append(selBulan(M));kids.push(hd);
  if(M.jalan&&m===M.last)kids.push(el('p','hi-warn','Bulan '+BLN[m-1]+' masih berjalan, jumlah gangguan akan bertambah sampai akhir bulan.'));
  /* kotak status */
  var cnt={};rows.forEach(function(x){var k=stat(x.v[m-1])||'Tanpa data';cnt[k]=(cnt[k]||0)+1;});
  var ada=rows.length-(cnt['Tanpa data']||0);
  var sum=el('div','hi-sum');
  ST.forEach(function(o){var b=el('div','hi-box');b.style.background=o.bg;b.style.color=o.fg;var t=el('div','t');var i=el('i');i.style.background=o.c;t.append(i,document.createTextNode(o.k));
    b.append(t,el('div','n',fmt(cnt[o.k]||0)),el('div','s',(ada?Math.round((cnt[o.k]||0)/ada*100):0)+'% penyulang'));sum.append(b);});
  kids.push(sum);
  if(cnt['Tanpa data'])kids.push(el('p','hi-cat',cnt['Tanpa data']+' penyulang belum punya angka di sheet untuk bulan ini.'));
  /* sebaran per UP3 atau ULP */
  if(s.ulp==='Semua'){
    var gk=function(x){return perUp3?x.up3:x.ulp;};var grp={};rows.forEach(function(x){var k=gk(x);(grp[k]=grp[k]||[]).push(x);});
    var sec=el('div');sec.append(el('p','hi-h3','Sebaran status per '+(perUp3?'UP3':'ULP')));var bars=el('div','hi-bars');
    Object.keys(grp).sort(function(a,b){return a.localeCompare(b,'id');}).forEach(function(k){var v=grp[k],c={};v.forEach(function(x){var t=stat(x.v[m-1])||'Tanpa data';c[t]=(c[t]||0)+1;});
      var row=el('div','hi-brow');var nm=el('span','nm',k);var stk=el('span','hi-stack');
      ST.concat([NA]).forEach(function(o){if(!c[o.k])return;var sp=el('span');sp.style.width=(c[o.k]/v.length*100)+'%';sp.style.background=o.c;sp.title=o.k+': '+c[o.k];stk.append(sp);});
      var bur=(c.Sakit||0)+(c.Kronis||0);row.append(nm,stk,el('small',null,v.length+(bur?' · '+bur+' perlu perhatian':'')));
      var bisa=perUp3||v.some(function(x){return x.peta;});
      if(bisa){row.tabIndex=0;row.classList.add('klik');row.title='Pilih '+(perUp3?'UP3 ':'ULP ')+k;
        var go=function(){if(perUp3)pilih({up3_aset:k,ulp_aset:null,pyl_aset:null});else{var p=v.filter(function(x){return x.peta;})[0];pilih({ulp_aset:p.pu,pyl_aset:null});}};
        row.onclick=go;row.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}};}
      bars.append(row);});
    sec.append(bars);kids.push(sec);
  }
  /* tren jumlah penyulang sakit dan kronis */
  var tr=el('div');tr.append(el('p','hi-h3','Penyulang sakit dan kronis per bulan'));var tg=el('div','hi-tren');
  var mxT=1;for(var q=1;q<=M.last;q++){var tt=0;rows.forEach(function(x){var t=stat(x.v[q-1]);if(t==='Sakit'||t==='Kronis')tt++;});mxT=Math.max(mxT,tt);}
  for(q=1;q<=12;q++){var ks=0,kk=0;rows.forEach(function(x){var t=stat(x.v[q-1]);if(t==='Sakit')ks++;if(t==='Kronis')kk++;});
    var c=el('button','hi-tcol'+(q===m?' on':'')+(M.jalan&&q===M.last?' jalan':''));c.type='button';c.disabled=q>M.last;
    var bx=el('span','bx');var a=el('i');a.style.height=(kk/mxT*100)+'%';a.style.background=SC.Kronis.c;var b2=el('i');b2.style.height=(ks/mxT*100)+'%';b2.style.background=SC.Sakit.c;bx.append(b2,a);
    c.title=BLN[q-1]+': '+kk+' kronis, '+ks+' sakit';c.append(el('em',null,q<=M.last?String(ks+kk):''),bx,el('small','vl',BLN[q-1]));
    (function(qq){c.onclick=function(){pilihBulan=qq;repaint();};})(q);tg.append(c);}
  tr.append(tg);kids.push(tr);
  /* perlu perhatian */
  var bur=rows.filter(function(x){var t=stat(x.v[m-1]);return t==='Sakit'||t==='Kronis';}).sort(function(a,b){return b.v[m-1]-a.v[m-1]||a.nama.localeCompare(b.nama,'id');});
  var sec2=el('div');sec2.append(el('p','hi-h3','Perlu perhatian: kronis dan sakit, '+BLN[m-1]+' ('+bur.length+')'));
  if(!bur.length)sec2.append(el('p','hi-cat','Tidak ada penyulang berstatus sakit atau kronis.'));
  else{var ls=el('div','hi-list');var LIM=8;
    bur.forEach(function(x,i){if(!semua&&i>=LIM)return;var n=x.v[m-1],p=prev>0?x.v[prev-1]:null;
      var beruntun=0;for(var j=m;j>=1;j--){var t=stat(x.v[j-1]);if(t==='Sakit'||t==='Kronis')beruntun++;else break;}
      var li=el('div','hi-li');var a=el('span','a');a.append(el('b',null,x.nama));
      var info=(perUp3?'UP3 '+x.up3+' · ':'')+'ULP '+x.ulp+(beruntun>=2?' · '+beruntun+' bulan beruntun sakit/kronis':'')+(x.peta?'':' · belum ada di peta');
      a.append(el('small',null,info));
      var z=el('span','z');z.append(chip(stat(n)));
      var tn=el('span','hi-tr');tn.append(el('b',null,n+' gangguan'));
      if(p!=null){var d=n-p;var sp=el('span',d>0?'dn':d<0?'up':'eq',d>0?'▲ '+d+' dari '+BS[prev-1]:d<0?'▼ '+(-d)+' dari '+BS[prev-1]:'sama dengan '+BS[prev-1]);tn.append(el('br'),sp);}
      li.append(a,z,tn);
      if(x.peta){li.tabIndex=0;li.classList.add('klik');li.title='Sorot penyulang '+x.nama+' di peta';
        var go=function(){pilih({up3_aset:x.up3,ulp_aset:x.pu,pyl_aset:x.nama});var mp=document.getElementById('peta');if(mp&&mp.scrollIntoView)mp.scrollIntoView({behavior:'smooth',block:'start'});};
        li.onclick=go;li.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}};}
      ls.append(li);});
    sec2.append(ls);
    if(bur.length>LIM){var mb=el('button','pa-more',semua?'Tampilkan '+LIM+' teratas saja':'Tampilkan semua ('+bur.length+' penyulang)');mb.type='button';mb.onclick=function(){semua=!semua;repaint();};sec2.append(mb);}
  }
  kids.push(sec2);
  /* rincian penyulang terpilih */
  if(s.pyl!=='Semua'){var rp=M.idx[key(s.ulp!=='Semua'?s.ulp:'')+'|'+key(s.pyl)]||Object.keys(M.idx).map(function(k){return M.idx[k];}).filter(function(x){return key(x.nama)===key(s.pyl)&&(perUp3||x.up3===s.up3);})[0];
    var sec3=el('div','hi-sel');sec3.append(el('p','hi-h3','Penyulang '+s.pyl));
    if(rp)sec3.append(grafik(rp,M));else sec3.append(el('p','hi-cat','Penyulang ini belum ada di sheet health index.'));
    kids.splice(1,0,sec3);}
  var ft=el('div','hi-foot');ft.append(el('span',null,'Sumber: sheet HEALTH INDEX, spreadsheet Gangguan Distribusi APKT. Baris "FEEDER …" dijumlahkan dengan penyulang yang sama namanya.'));
  var lk=el('a',null,'Buka spreadsheet ↗');lk.href=SHEET;lk.target='_blank';lk.rel='noopener noreferrer';ft.append(lk);kids.push(ft);
  host.replaceChildren.apply(host,kids);
});

/* ---------- kolom health index di tabel rekap ---------- */
dash.draw('hi-tabel',function(tb){
  var M=model();var hr=tb.querySelector('thead tr');if(!hr)return;
  var th=hr.querySelector('.hi-th');
  if(!th){th=el('th','hi-th');hr.insertBefore(th,hr.children[2]||null);}
  th.textContent=M&&M.last?'Health index '+BS[bulan(M)-1]:'Health index';
  tb.querySelectorAll('tbody tr').forEach(function(tr){var t=tr.cells;if(t.length<3||tr.querySelector('.hi-td'))return;
    var td=el('td','hi-td');var r=M&&cari({penyulang:t[0].textContent.trim(),ulp:t[1].textContent.trim()});var n=r?r.v[bulan(M)-1]:null;
    if(n==null)td.textContent='—';else{td.append(chip(stat(n),n));td.title=n+' gangguan';}
    tr.insertBefore(td,t[2]);});
});

pasang();
dash.draw();
})();
