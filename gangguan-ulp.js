/* Rincian gangguan penyulang per ULP di tab Ophardist (KPI OP03 permanen, OP04 sementara; sheet GANGGUAN ULP).
   Dimuat oleh files/index.html lewat <script src="gangguan-ulp.js">, sesudah skrip kinerja (memakai TD.selKpi, TD.mkTip, TD.span). 16 Nov 2026. */
(function(){
const P=()=>TD.params();
const GU={OP03:'permanen',OP04:'sementara'};
const LAWAN={OP03:'OP04',OP04:'OP03'};
const STT={ok:'#13693B',warn:'#8A6300',bad:'#B3261E'};
const fI=v=>TD.loc.format(",.0f")(v);
const f1=v=>TD.loc.format(",.1f")(v);
const sifatOf=k=>k==='OP03'?'Permanen':'Sementara';
const kodeGU=()=>{if(P().sb!=='Ophardist'||!TD.selKpi)return null;const k=TD.selKpi();return GU[k]?k:null;};
const capOf=k=>{const c=dash.data('capaian_kpi');return c.status==='ok'&&c.data?c.data.filter(d=>d.kode_kpi===k):[];};
const lastPer=k=>{const a=capOf(k);return a.length?a[0].periode:null;};
const blnPanjang=p=>p?TD.bulan[+p.slice(5,7)-1]:'';
const mon=p=>TD.bulan[+p.slice(5,7)-1].slice(0,3);
const ulpRows=k=>{const g=dash.data('gangguan_ulp_bulan');if(g.status!=='ok'||!g.data)return null;const p=lastPer(k);return g.data.filter(d=>d.sifat===sifatOf(k)&&(!p||d.periode<=p));};
const lingkup=()=>P().up3==='Semua'?'UIW':'UP3 '+P().up3;
// Membuka ULP di Peta Aset. Versi web memasang window.__keTab (Tanya Data) agar panel health index ikut terbuka.
const keAset=(u,l)=>{const p={hal:'aset',up3_aset:u,ulp_aset:l,pyl_aset:null};
if(typeof window.__keTab==='function'){window.__keTab(Object.assign({_hi:true},p));return;}
dash.setParams(p);dash.setLink('aset');};
TD.keAsetUlp=keAset;

dash.calc('gangguan_ulp_bulan',{
inputs:['gangguan_ulp'],
title:'Gangguan penyulang per ULP per bulan',
description:'Jumlah gangguan penyulang permanen dan sementara per ULP per bulan (bukan kumulatif) dari sheet GANGGUAN ULP spreadsheet Gangguan Distribusi APKT. Target hanya ada per UP3, jadi ULP tampil tanpa capaian.',
fn:(g)=>g.map(d=>({periode:d.periode,up3:d.up3,ulp:d.ulp,sifat:d.sifat,jumlah:+d.jumlah}))
});

dash.onData(()=>{const k=kodeGU();document.querySelectorAll('[data-kpi-only]').forEach(e=>{e.hidden=!(k&&e.getAttribute('data-kpi-only').split(' ').includes(k));});});

dash.draw('gu-judul',el=>{const k=kodeGU();const p=k&&lastPer(k);el.textContent=k?'· gangguan '+GU[k]+(p?' s.d. '+TD.periodeLabel(p):''):'';});
dash.draw('gu-up3-title',el=>{const k=kodeGU();const p=k&&lastPer(k);el.textContent=k?'Gangguan '+GU[k]+' per UP3'+(p?' s.d. '+blnPanjang(p):''):'—';});

dash.draw('gu-up3',el=>{
const k=kodeGU();el.replaceChildren();if(!k)return;
const all=capOf(k);if(!all.length){el.textContent='—';return;}
const bars=all.filter(d=>d.up3!=='UIW').sort((a,z)=>z.realisasi-a.realisasi);
const sel=P().up3;
const W=Math.max(300,el.clientWidth||420),bh=22,gap=10,m={t:4,r:58,b:4,l:72};
const H=m.t+bars.length*(bh+gap)+m.b;
const mx=d3.max(bars,d=>Math.max(d.realisasi,d.target))*1.04||1;
const x=d3.scaleLinear().domain([0,mx]).range([m.l,W-m.r-34]);
const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`).attr('role','img')
.attr('aria-label','Realisasi kumulatif dan target gangguan '+GU[k]+' per UP3');
const tip=TD.mkTip(el);
const g=svg.append('g').selectAll('g').data(bars).join('g').attr('transform',(d,i)=>`translate(0,${m.t+i*(bh+gap)})`).style('cursor','pointer')
.on('click',(ev,d)=>TD.setUp3(sel===d.up3?'Semua':d.up3))
.on('pointerenter',(ev,d)=>{const sc=el.clientWidth/W;tip.show(d.up3+' · realisasi '+fI(d.realisasi)+' · target '+fI(d.target)+' · capaian '+TD.pct(d.capaian),x(Math.min(d.realisasi,mx))*sc-150,(m.t+bars.indexOf(d)*(bh+gap))*sc);})
.on('pointerleave',tip.hide);
g.append('rect').attr('x',0).attr('y',-gap/2+1).attr('width',W).attr('height',bh+gap-2).attr('rx',6).style('fill',d=>d.up3===sel?'#DCEBF7':'transparent');
g.append('text').attr('x',m.l-8).attr('y',bh/2+4).attr('text-anchor','end').style('font-weight',d=>d.up3===sel?'700':'400').text(d=>d.up3);
g.append('rect').attr('x',m.l).attr('y',3).attr('height',bh-6).attr('rx',3).attr('width',d=>Math.max(1,x(d.realisasi)-m.l)).style('fill',TD.COL[0]);
g.append('text').attr('x',d=>x(d.realisasi)+5).attr('y',bh/2+4).style('fill','var(--color-fg-muted)').style('font-size','11px').text(d=>fI(d.realisasi));
g.append('line').attr('x1',d=>x(d.target)).attr('x2',d=>x(d.target)).attr('y1',0).attr('y2',bh).style('stroke','#C9A000').attr('stroke-width',3).attr('stroke-linecap','round');
g.append('text').attr('x',W-4).attr('y',bh/2+4).attr('text-anchor','end').style('font-weight','700').style('fill',d=>STT[TD.status(d.capaian)]||'var(--color-fg)').text(d=>TD.pct(d.capaian));
});

dash.draw('gu-uiw',el=>{const k=kodeGU();if(!k){el.textContent='';return;}
const d=capOf(k).find(q=>q.up3==='UIW');el.replaceChildren();if(!d){el.textContent='—';return;}
const w=TD.where({kode_kpi:k,up3:'UIW'});
const b=document.createElement('b');b.style.color=STT[TD.status(d.capaian)]||'';b.append(TD.span('capaian_kpi','capaian',w,TD.pct(d.capaian)));
el.append(document.createTextNode('UIW: '),TD.span('capaian_kpi','realisasi',w,fI(d.realisasi)),document.createTextNode(' kali dari target '),TD.span('capaian_kpi','target',w,fI(d.target)),document.createTextNode(', capaian '),b,document.createTextNode('.'));});

const ulpAgg=(k)=>{const rows=ulpRows(k);if(!rows)return null;const u=P().up3;
return d3.rollups(rows.filter(d=>u==='Semua'||d.up3===u),v=>d3.sum(v,d=>d.jumlah),d=>d.up3+'|'+d.ulp)
.map(([key,n])=>{const [up3,ulp]=key.split('|');return {up3,ulp,n};}).sort((a,z)=>z.n-a.n||d3.ascending(a.ulp,z.ulp));};

dash.draw('gu-ulp-title',el=>{const k=kodeGU();if(!k){el.textContent='—';return;}
el.textContent=P().up3==='Semua'?'ULP dengan gangguan '+GU[k]+' terbanyak · UIW':'ULP di UP3 '+P().up3+' · gangguan '+GU[k];});
dash.draw('gu-ulp-sub',el=>{const k=kodeGU();if(!k){el.textContent='';return;}
const p=lastPer(k),b='Januari s.d. '+blnPanjang(p);const a=ulpAgg(k)||[];
if(P().up3==='Semua'){el.textContent='Sepuluh ULP teratas dari '+a.length+' ULP, jumlah '+b+'. Pilih UP3 di kiri untuk melihat semua ULP-nya. Klik nama ULP untuk membukanya di Peta Aset.';return;}
const d=capOf(k).find(q=>q.up3===P().up3);
el.textContent='Jumlah '+b+'. Target hanya ada per UP3'+(d?': '+fI(d.realisasi)+' dari '+fI(d.target)+' ('+TD.pct(d.capaian)+')':'')+'. Klik nama ULP untuk membukanya di Peta Aset.';});

dash.draw('gu-ulp',el=>{
const k=kodeGU();el.replaceChildren();if(!k)return;
const a=ulpAgg(k);if(!a){el.textContent='Memuat data ULP…';return;}
const semua=P().up3==='Semua';const list=semua?a.slice(0,10):a;
if(!list.length){el.textContent='Belum ada data ULP untuk pilihan ini.';return;}
const W=Math.max(300,el.clientWidth||420),bh=20,gap=8,m={t:2,r:44,b:2,l:semua?150:96};
const H=m.t+list.length*(bh+gap)+m.b;
const x=d3.scaleLinear().domain([0,d3.max(list,d=>d.n)||1]).range([m.l,W-m.r]);
const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`).attr('role','img')
.attr('aria-label','Jumlah gangguan '+GU[k]+' per ULP, '+lingkup());
const tip=TD.mkTip(el);const p=lastPer(k);
const g=svg.append('g').selectAll('g').data(list).join('g').attr('transform',(d,i)=>`translate(0,${m.t+i*(bh+gap)})`).style('cursor','pointer')
.attr('tabindex',0).attr('role','link').attr('aria-label',d=>'ULP '+d.ulp+' UP3 '+d.up3+', '+fI(d.n)+' kali. Buka di Peta Aset')
.on('click',(ev,d)=>keAset(d.up3,d.ulp))
.on('keydown',(ev,d)=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();keAset(d.up3,d.ulp);}})
.on('pointerenter',(ev,d)=>{const sc=el.clientWidth/W;tip.show('ULP '+d.ulp+' (UP3 '+d.up3+') · '+fI(d.n)+' kali s.d. '+blnPanjang(p)+' · klik untuk membuka di Peta Aset',Math.min(x(d.n),W-260)*sc,(m.t+list.indexOf(d)*(bh+gap))*sc);})
.on('pointerleave',tip.hide);
g.append('rect').attr('x',0).attr('y',-gap/2+1).attr('width',W).attr('height',bh+gap-2).style('fill','transparent');
g.append('text').attr('x',m.l-8).attr('y',bh/2+4).attr('text-anchor','end').style('fill','var(--pln-blue-dark)').style('text-decoration','underline').style('text-decoration-color','rgba(10,110,180,.35)')
.text(d=>semua?d.ulp+' · '+d.up3:d.ulp);
g.append('rect').attr('x',m.l).attr('y',2).attr('height',bh-4).attr('rx',3).attr('width',d=>Math.max(1,x(d.n)-m.l)).style('fill',TD.COL[0]);
g.append('text').attr('x',d=>x(d.n)+5).attr('y',bh/2+4).style('font-weight','600').text(d=>fI(d.n));
});

const seriBulan=(k)=>{const rows=ulpRows(k);if(!rows)return null;const u=P().up3;
const r=d3.rollup(rows.filter(d=>u==='Semua'||d.up3===u),v=>d3.sum(v,d=>d.jumlah),d=>d.periode);
return [...r].map(([periode,n])=>({periode,n})).sort((a,z)=>d3.ascending(a.periode,z.periode));};

dash.draw('gu-bulan-title',el=>{const k=kodeGU();el.textContent=k?'Gangguan '+GU[k]+' per bulan, '+lingkup():'';});
dash.draw('gu-bulan',el=>{
const k=kodeGU();el.replaceChildren();if(!k)return;
const s=seriBulan(k);if(!s){el.textContent='Memuat…';return;}if(!s.length){el.textContent='Belum ada data.';return;}
const y0=s[0].periode.slice(0,4);const ms=d3.range(1,13).map(m=>y0+'-'+String(m).padStart(2,'0'));
const W=Math.max(300,el.clientWidth||420),H=190,m={t:18,r:6,b:24,l:34};
const hi=d3.max(s,d=>d.n)||1;
const y=d3.scaleLinear().domain([0,hi*1.1]).nice().range([H-m.b,m.t]);
const x=d3.scaleBand().domain(ms).range([m.l,W-m.r]).padding(0.24);
const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`).attr('role','img')
.attr('aria-label','Jumlah gangguan '+GU[k]+' per bulan, '+lingkup());
svg.append('g').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(3).tickSize(-(W-m.l-m.r)).tickFormat(v=>fI(v)))
.call(g=>{g.select('.domain').remove();g.selectAll('line').style('stroke','var(--cds-chart-grid)');g.selectAll('text').style('font-size','10px').style('fill','var(--color-fg-muted)');});
svg.append('g').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickFormat(mon).tickSizeOuter(0))
.call(g=>{g.select('.domain').style('stroke','var(--cds-chart-axis)');g.selectAll('line').remove();g.selectAll('text').style('font-size',W<420?'9px':'11px').style('fill','var(--color-fg-muted)');});
const last=s[s.length-1].periode;
svg.append('g').selectAll('rect').data(s).join('rect').attr('x',d=>x(d.periode)).attr('width',x.bandwidth())
.attr('y',d=>y(d.n)).attr('height',d=>Math.max(0,y(0)-y(d.n))).attr('rx',3).style('fill',TD.COL[0]).style('opacity',d=>d.periode===last?1:.72);
svg.append('g').selectAll('text').data(s).join('text').attr('x',d=>x(d.periode)+x.bandwidth()/2).attr('y',d=>y(d.n)-4).attr('text-anchor','middle')
.style('font-size',W<420?'9px':'11px').style('fill','var(--color-fg-muted)').text(d=>fI(d.n));
const tip=TD.mkTip(el);
svg.append('g').selectAll('rect').data(s).join('rect').attr('x',d=>x(d.periode)-x.step()*x.paddingInner()/2).attr('width',x.step()).attr('y',m.t).attr('height',H-m.t-m.b).style('fill','transparent')
.on('pointerenter',(ev,d)=>{const sc=el.clientWidth/W;tip.show(TD.periodeLabel(d.periode)+' · '+fI(d.n)+' kali',Math.min(x(d.periode),W-170)*sc,30);})
.on('pointerleave',tip.hide);
});

dash.draw('gu-poin',el=>{
const k=kodeGU();el.replaceChildren();if(!k)return;
const a=ulpAgg(k),rows=ulpRows(k);if(!a||!rows||!a.length)return;
const semua=P().up3==='Semua',p=lastPer(k),bl=blnPanjang(p);
const li=t=>{const x=document.createElement('li');x.textContent=t;el.append(x);};
const tot=d3.sum(a,d=>d.n),t0=a[0];
if(tot>0)li((semua?'ULP '+t0.ulp+' (UP3 '+t0.up3+')':t0.ulp)+' menyumbang '+f1(t0.n/tot*100)+'% gangguan '+GU[k]+' '+lingkup()+' ('+fI(t0.n)+' dari '+fI(tot)+').');
const ms=[...new Set(rows.map(d=>d.periode))].sort();
if(ms.length>=4){
const lon=[];
for(const u of a){const v=ms.map(m=>d3.sum(rows.filter(d=>d.up3===u.up3&&d.ulp===u.ulp&&d.periode===m),d=>d.jumlah));
const akhir=v[v.length-1],rata=d3.mean(v.slice(0,-1));
if(akhir>=2*Math.max(rata,1)&&akhir-rata>=10)lon.push({u,akhir,rata});}
lon.sort((x,z)=>(z.akhir-z.rata)-(x.akhir-x.rata));
if(lon.length)li('Lonjakan '+bl+': '+lon.slice(0,3).map(o=>(semua?o.u.ulp+' ('+o.u.up3+')':o.u.ulp)+' '+fI(o.akhir)+' kali, rata-rata bulan sebelumnya '+f1(o.rata)).join('; ')+(lon.length>3?'; dan '+(lon.length-3)+' ULP lain':'')+'.');
else li('Tidak ada ULP dengan lonjakan '+bl+' yang menonjol.');
}
const o=capOf(LAWAN[k]).find(d=>d.up3===(semua?'UIW':P().up3));
if(o)li('Pembanding: gangguan '+GU[LAWAN[k]]+' '+lingkup()+' s.d. '+blnPanjang(o.periode)+' '+fI(o.realisasi)+' kali dari target '+fI(o.target)+', capaian '+TD.pct(o.capaian)+'.');
});
})();
