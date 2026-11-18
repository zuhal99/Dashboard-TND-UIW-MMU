/* Rincian KPI penurunan gangguan penyulang (OP05) di tab Ophardist; sheet PENURUNAN GANGGUAN spreadsheet Gangguan Distribusi APKT.
   UP3: capaian 2 − R/T terhadap target kumulatif. UIW mengikuti sheet: penurunan terhadap realisasi 2025 ÷ target 5%.
   Dimuat oleh files/index.html lewat <script src="penurunan-gangguan.js">, sesudah skrip kinerja (memakai TD.selKpi, TD.mkTip, TD.span). 18 Nov 2026. */
(function(){
const P=()=>TD.params();
const KODE='OP05';
const JENIS=['Permanen','Sementara','Cleansing','Logsheet'];
const JCOL={Permanen:'#286396',Sementara:'#FFC000',Cleansing:'#77899C',Logsheet:'#B740DC'};
const STT={ok:'#13693B',warn:'#FFC000',bad:'#B3261E'};
const fI=v=>TD.loc.format(",.0f")(v);
const f1=v=>TD.loc.format(",.1f")(v);
const aktif=()=>P().sb==='Ophardist'&&TD.selKpi&&TD.selKpi()===KODE;
const capOf=()=>{const c=dash.data('capaian_kpi');return c.status==='ok'&&c.data?c.data.filter(d=>d.kode_kpi===KODE):[];};
const lastPer=()=>{const a=capOf();return a.length?a[0].periode:null;};
const blnPanjang=p=>p?TD.bulan[+p.slice(5,7)-1]:'';
const mon=p=>TD.bulan[+p.slice(5,7)-1].slice(0,3);
const lingkup=()=>P().up3==='Semua'?'UIW':'UP3 '+P().up3;
const rinci=()=>{const g=dash.data('penurunan_gangguan_bulan');if(g.status!=='ok'||!g.data)return null;const p=lastPer();return g.data.filter(d=>!p||d.periode<=p);};

dash.calc('penurunan_gangguan_bulan',{
inputs:['penurunan_gangguan'],
title:'Gangguan penyulang per UP3 per bulan menurut jenis',
description:'Jumlah gangguan penyulang per UP3 per bulan (bukan kumulatif) menurut jenis: permanen, sementara, cleansing dan logsheet (tidak terinput APKT), dari sheet PENURUNAN GANGGUAN spreadsheet Gangguan Distribusi APKT. Baris UIW berjenis "Realisasi 2025 kumulatif" adalah pembanding tahun lalu untuk target UIW.',
fn:(g)=>g.map(d=>({periode:d.periode,up3:d.up3,jenis:d.jenis,jumlah:+d.jumlah}))
});

dash.onData(()=>{const k=aktif()?KODE:null;document.querySelectorAll('[data-kpi-only]').forEach(e=>{e.hidden=!(k&&e.getAttribute('data-kpi-only').split(' ').includes(k));});});

dash.draw('pg-judul',el=>{const p=aktif()&&lastPer();el.textContent=p?'· s.d. '+TD.periodeLabel(p):'';});
dash.draw('pg-up3-title',el=>{const p=aktif()&&lastPer();el.textContent=aktif()?'Gangguan per UP3 terhadap target'+(p?' s.d. '+blnPanjang(p):''):'—';});

dash.draw('pg-up3',el=>{
el.replaceChildren();if(!aktif())return;
const all=capOf();if(!all.length){el.textContent='—';return;}
const bars=all.filter(d=>d.up3!=='UIW').sort((a,z)=>z.capaian-a.capaian);
const sel=P().up3;
const W=Math.max(300,el.clientWidth||420),bh=22,gap=10,m={t:4,r:58,b:4,l:72};
const H=m.t+bars.length*(bh+gap)+m.b;
const mx=d3.max(bars,d=>Math.max(d.realisasi,d.target))*1.04||1;
const x=d3.scaleLinear().domain([0,mx]).range([m.l,W-m.r-34]);
const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`).attr('role','img')
.attr('aria-label','Realisasi kumulatif dan target gangguan penyulang per UP3');
const tip=TD.mkTip(el);
const g=svg.append('g').selectAll('g').data(bars).join('g').attr('transform',(d,i)=>`translate(0,${m.t+i*(bh+gap)})`).style('cursor','pointer')
.on('click',(ev,d)=>TD.setUp3(sel===d.up3?'Semua':d.up3))
.on('pointerenter',(ev,d)=>{const sc=el.clientWidth/W;tip.show(d.up3+' · realisasi '+fI(d.realisasi)+' kali · target '+fI(d.target)+' kali · capaian '+TD.pct(d.capaian),x(Math.min(d.realisasi,mx))*sc-150,(m.t+bars.indexOf(d)*(bh+gap))*sc);})
.on('pointerleave',tip.hide);
g.append('rect').attr('x',0).attr('y',-gap/2+1).attr('width',W).attr('height',bh+gap-2).attr('rx',6).style('fill',d=>d.up3===sel?'#DDEAF6':'transparent');
g.append('text').attr('x',m.l-8).attr('y',bh/2+4).attr('text-anchor','end').style('font-weight',d=>d.up3===sel?'700':'400').text(d=>d.up3);
g.append('rect').attr('x',m.l).attr('y',3).attr('height',bh-6).attr('rx',3).attr('width',d=>Math.max(1,x(d.realisasi)-m.l)).style('fill',TD.COL[0]);
g.append('text').attr('x',d=>x(d.realisasi)+5).attr('y',bh/2+4).style('fill','var(--color-fg-muted)').style('font-size','11px').text(d=>fI(d.realisasi));
g.append('line').attr('x1',d=>x(d.target)).attr('x2',d=>x(d.target)).attr('y1',0).attr('y2',bh).style('stroke','#C9A000').attr('stroke-width',3).attr('stroke-linecap','round');
g.append('text').attr('x',W-4).attr('y',bh/2+4).attr('text-anchor','end').style('font-weight','700').style('fill',d=>STT[TD.status(d.capaian)]||'var(--color-fg)').text(d=>TD.pct(d.capaian));
});

// UIW: penurunan terhadap realisasi 2025 ÷ target % (mengikuti sheet, keputusan Zuhal 18 Nov 2026).
dash.draw('pg-uiw',el=>{el.replaceChildren();if(!aktif())return;
const d=capOf().find(q=>q.up3==='UIW');if(!d){el.textContent='—';return;}
const w=TD.where({kode_kpi:KODE,up3:'UIW'});
const rows=rinci()||[];const p=d.periode;
const r26=d3.sum(rows.filter(q=>q.up3!=='UIW'&&q.periode<=p),q=>q.jumlah);
const r25=(rows.find(q=>q.up3==='UIW'&&q.periode===p&&q.jenis==='Realisasi 2025 kumulatif')||{}).jumlah;
const b=document.createElement('b');b.style.color=STT[TD.status(d.capaian)]||'';b.append(TD.span('capaian_kpi','capaian',w,TD.pct(d.capaian)));
el.append(document.createTextNode('UIW: '+(r25?fI(r26)+' kali s.d. '+blnPanjang(p)+', dibanding '+fI(r25)+' kali pada periode yang sama 2025, turun ':'turun ')),
TD.span('capaian_kpi','realisasi',w,f1(d.realisasi)+'%'),document.createTextNode(' dari target penurunan '),TD.span('capaian_kpi','target',w,f1(d.target)+'%'),
document.createTextNode('. Capaian UIW = penurunan ÷ target, sesuai sheet: '),b,document.createTextNode('.'));});

const seri=()=>{const rows=rinci();if(!rows)return null;const u=P().up3;
const f=rows.filter(d=>JENIS.includes(d.jenis)&&(u==='Semua'||d.up3===u));
const per=[...new Set(f.map(d=>d.periode))].sort();
return per.map(p=>{const o={periode:p};JENIS.forEach(j=>{o[j]=d3.sum(f.filter(d=>d.periode===p&&d.jenis===j),d=>d.jumlah);});o.total=d3.sum(JENIS,j=>o[j]);return o;});};

dash.draw('pg-bulan-title',el=>{el.textContent=aktif()?'Gangguan per bulan menurut jenis, '+lingkup():'—';});
dash.draw('pg-legend',el=>{el.replaceChildren();if(!aktif())return;
JENIS.forEach(j=>{const s=document.createElement('span');const i=document.createElement('i');i.className='pg-sw';i.style.background=JCOL[j];s.append(i,document.createTextNode(j==='Logsheet'?'Logsheet (tidak terinput APKT)':j));el.append(s);});});
dash.draw('pg-bulan',el=>{
el.replaceChildren();if(!aktif())return;
const s=seri();if(!s){el.textContent='Memuat…';return;}if(!s.length){el.textContent='Belum ada data.';return;}
const y0=s[0].periode.slice(0,4);const ms=d3.range(1,13).map(m=>y0+'-'+String(m).padStart(2,'0'));
const W=Math.max(300,el.clientWidth||420),H=210,m={t:18,r:6,b:24,l:34};
const y=d3.scaleLinear().domain([0,(d3.max(s,d=>d.total)||1)*1.1]).nice().range([H-m.b,m.t]);
const x=d3.scaleBand().domain(ms).range([m.l,W-m.r]).padding(0.24);
const svg=d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`).attr('role','img')
.attr('aria-label','Jumlah gangguan penyulang per bulan menurut jenis, '+lingkup());
svg.append('g').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(3).tickSize(-(W-m.l-m.r)).tickFormat(v=>fI(v)))
.call(g=>{g.select('.domain').remove();g.selectAll('line').style('stroke','var(--cds-chart-grid)');g.selectAll('text').style('font-size','10px').style('fill','var(--color-fg-muted)');});
svg.append('g').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickFormat(mon).tickSizeOuter(0))
.call(g=>{g.select('.domain').style('stroke','var(--cds-chart-axis)');g.selectAll('line').remove();g.selectAll('text').style('font-size',W<420?'9px':'11px').style('fill','var(--color-fg-muted)');});
const st=d3.stack().keys(JENIS)(s);
svg.append('g').selectAll('g').data(st).join('g').style('fill',d=>JCOL[d.key]).selectAll('rect').data(d=>d).join('rect')
.attr('x',d=>x(d.data.periode)).attr('width',x.bandwidth()).attr('y',d=>y(d[1])).attr('height',d=>Math.max(0,y(d[0])-y(d[1])));
svg.append('g').selectAll('text').data(s).join('text').attr('x',d=>x(d.periode)+x.bandwidth()/2).attr('y',d=>y(d.total)-4).attr('text-anchor','middle')
.style('font-size',W<420?'9px':'11px').style('fill','var(--color-fg-muted)').text(d=>fI(d.total));
const tip=TD.mkTip(el);
svg.append('g').selectAll('rect').data(s).join('rect').attr('x',d=>x(d.periode)-x.step()*x.paddingInner()/2).attr('width',x.step()).attr('y',m.t).attr('height',H-m.t-m.b).style('fill','transparent')
.on('pointerenter',(ev,d)=>{const sc=el.clientWidth/W;tip.show(TD.periodeLabel(d.periode)+' · '+fI(d.total)+' kali · '+JENIS.filter(j=>d[j]).map(j=>j.toLowerCase()+' '+fI(d[j])).join(', '),Math.min(x(d.periode),W-240)*sc,30);})
.on('pointerleave',tip.hide);
});

dash.draw('pg-poin',el=>{
el.replaceChildren();if(!aktif())return;
const s=seri(),rows=rinci();if(!s||!s.length||!rows)return;
const semua=P().up3==='Semua',p=lastPer(),bl=blnPanjang(p);
const li=t=>{const x=document.createElement('li');x.textContent=t;el.append(x);};
const tot=d3.sum(s,d=>d.total);
if(tot>0){const komp=JENIS.map(j=>({j,n:d3.sum(s,d=>d[j])})).filter(o=>o.n>0).sort((a,z)=>z.n-a.n);
li('Komposisi Januari s.d. '+bl+' '+lingkup()+': '+komp.map(o=>o.j.toLowerCase()+' '+fI(o.n)+' kali ('+f1(o.n/tot*100)+'%)').join(', ')+'.');}
if(s.length>=4){const akhir=s[s.length-1],sb=s.slice(0,-1),rata=d3.mean(sb,d=>d.total);
if(akhir.total>=2*Math.max(rata,1)){const jt=JENIS.map(j=>({j,d:akhir[j]-d3.mean(sb,d=>d[j])})).sort((a,z)=>z.d-a.d)[0];
li('Gangguan '+bl+' melonjak: '+fI(akhir.total)+' kali, rata-rata bulan sebelumnya '+f1(rata)+'. Kenaikan terbesar dari gangguan '+jt.j.toLowerCase()+' (+'+fI(jt.d)+' kali dari rata-rata).');}
else li('Gangguan '+bl+' '+fI(akhir.total)+' kali, rata-rata bulan sebelumnya '+f1(rata)+'.');}
if(semua){const c=capOf().filter(d=>d.up3!=='UIW').sort((a,z)=>a.capaian-z.capaian);
if(c.length)li('Capaian UP3 terendah: '+c.slice(0,2).map(d=>d.up3+' '+TD.pct(d.capaian)+' ('+fI(d.realisasi)+' dari target '+fI(d.target)+' kali)').join('; ')+'.');}
else{const d=capOf().find(q=>q.up3===P().up3);
if(d){const sisa=d.target-d.realisasi;li(sisa>=0?'Masih '+fI(sisa)+' kali di bawah target kumulatif s.d. '+bl+'.':'Melampaui target kumulatif s.d. '+bl+' sebanyak '+fI(-sisa)+' kali.');}}
});
})();
