/* Asisten "Tanya Data" untuk versi web dashboard T&D (uji coba, tanpa AI).
   Mengenali pertanyaan dengan kata kunci, lalu menjawab dari data yang sama dengan yang tampil di dashboard
   (dash.data: ai_unit, ai_kontrak, ai_program, ai_rincian, ao_unit, ao_kegiatan, ao_rincian, epm_unit, epm_bulan,
   epm_rinci, epm_kategori, capaian_kpi, capaian_bulanan, aset_gis, beban_gis, gis_titik, health_index,
   gangguan_penyulang, gangguan_ulp_bulan, serta window.__KAPASITAS dan window.__TRS). Tidak ada data yang dikirim ke luar halaman.
   16 Nov 2026: daftar pertanyaan diperluas ke semua aspek dashboard (health index, gangguan, program AI, kegiatan AO,
   PRK melebihi pagu, nilai per bulan dan tren, Scadatel per parameter, sumber data, arti warna, hal yang perlu perhatian).
   16 Nov 2026: KPI gangguan penyulang permanen (OP03) dan sementara (OP04) dari sheet GANGGUAN ULP, termasuk rincian per ULP. */
(function(){
  'use strict';
  if (window.__tanyaData) return; window.__tanyaData = true;

  /* ---------- alat bantu ---------- */
  var BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var UP3 = ['Ambon','Masohi','Saumlaki','Tual','Ternate','Tobelo','Sofifi'];
  var LOADING = {loading:true};
  function need(id){
    var r; try { r = dash.data(id); } catch (e) { r = {status:'error'}; }
    if (r && r.status === 'ok') return r.data || [];
    if (r && r.status === 'error') throw new Error('Data ' + id + ' gagal dimuat.');
    throw LOADING;
  }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function nf(v, d){ if (v == null || v === '' || isNaN(v)) return '–'; d = d || 0; return Number(v).toLocaleString('id-ID', {minimumFractionDigits:d, maximumFractionDigits:d}); }
  function rp(v){ return v != null && v < 0 ? '−Rp' + nf(-v, 2) + ' miliar' : 'Rp' + nf(v, 2) + ' miliar'; }
  function nd(v){ return v == null || v === '' ? 'belum ada di data' : nf(v); }
  function pc(v){ return v == null ? '–' : nf(v, 1) + '%'; }
  function tgl(s){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? (+m[3]) + ' ' + BLN[+m[2]-1] + ' ' + m[1] : (s || '–'); }
  function per(s){ var m = /^(\d{4})-(\d{2})/.exec(s || ''); return m ? BLN[+m[2]-1] + ' ' + m[1] : (s || '–'); }
  function sum(a, f){ return a.reduce(function(t, d){ var v = f(d); return t + (v == null || isNaN(v) ? 0 : +v); }, 0); }
  function norm(s){ return (' ' + String(s || '').toLowerCase().replace(/[^a-z0-9%\.\s-]/g, ' ').replace(/\s+/g, ' ') + ' '); }
  function has(t, re){ return re.test(t); }
  var STW = {hijau:'#1E9E5A', kuning:'#D9A400', merah:'#D64541'};
  function stat(c){ return c == null ? '' : (c >= 100 ? 'hijau' : c >= 95 ? 'kuning' : 'merah'); }
  function dot(st){ return st ? '<i class="tq-dot" style="background:' + (STW[st] || '#999') + '" title="' + esc(st) + '"></i>' : ''; }
  function tabel(head, rows, hi, wrap, kiri){
    var K = kiri || [], kl = function(i, td){ return i === 0 ? (td && wrap ? ' class="w"' : '') : K.indexOf(i) >= 0 ? '' : ' class="n"'; };
    var h = '<div class="tq-tblwrap"><table class="tq-tbl"><thead><tr>' + head.map(function(x, i){ return '<th' + kl(i) + '>' + x + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function(r){ h += '<tr' + (hi && hi(r) ? ' class="hi"' : '') + '>' + r.cells.map(function(x, i){ return '<td' + kl(i, true) + '>' + x + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table></div>';
  }
  function jawab(o){ return o; } // {judul, isi(html), sumber, tautan:[{label, params}]}
  function ul(li){ return '<ul class="tq-ul">' + li.filter(Boolean).map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function potong(s, n){ s = String(s || ''); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }
  function key(s){ return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function judulN(s){ return String(s || '').toLowerCase().split(' ').map(function(w){ return /\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); }
  // data pilihan: kosong bila gagal dimuat, tetapi tetap menunggu bila masih dimuat
  function opt(id){ try { return need(id); } catch (e) { if (e === LOADING) throw e; return null; } }
  /* nama bulan dalam pertanyaan, misalnya "susut Oktober" atau "SAIDI sep" */
  var BLNK = [['januari','jan'],['februari','pebruari','feb','peb'],['maret','mar'],['april','apr'],['mei'],['juni','jun'],['juli','jul'],['agustus','agu','ags','agt','agst'],['september','sep','sept'],['oktober','okt','oct'],['november','nop','nov'],['desember','des','dec']];
  function cariBulan(t){
    for (var i = 0; i < 12; i++) for (var j = 0; j < BLNK[i].length; j++) if (t.indexOf(' ' + BLNK[i][j] + ' ') >= 0) return i + 1;
    return 0;
  }
  function trenQ(t){ return /(tren|per bulan|perbulan|bulanan|setiap bulan|tiap bulan|perkembangan|bulan ke bulan|grafik|riwayat)/.test(t); }

  /* ---------- pengenal unit, ULP, penyulang, gardu ---------- */
  function cariUnit(t){
    var out = [];
    UP3.forEach(function(u){
      var re = new RegExp('(^|\\s)(ulp\\s+)?' + u.toLowerCase() + '(\\s|$)');
      var m = re.exec(t); if (m && !m[2]) out.push(u);
    });
    if (/\s(uiw|induk|kantor induk)\s/.test(t)) out.push('UIW');
    if (/\sup3b\s|\spengatur beban\s/.test(t)) out.push('UP3B');
    if (/\sup2k\s/.test(t)) out.push('UP2K');
    return out;
  }
  var IDX = null;
  function indeksAset(){
    if (IDX) return IDX;
    var a = need('aset_gis');
    var U2U = new Map(), pyl = [], seen = new Set();
    a.forEach(function(r){
      if (r.ulp !== 'Semua') U2U.set(r.ulp, r.up3);
      if (r.ulp !== 'Semua' && r.penyulang !== 'Semua' && !/^\(|^\d+$/.test(r.penyulang)) {
        var k = r.up3 + '|' + r.ulp + '|' + r.penyulang;
        if (!seen.has(k)) { seen.add(k); pyl.push(r); }
      }
    });
    pyl.sort(function(x, y){ return y.penyulang.length - x.penyulang.length || (+y.tiang_tm || 0) - (+x.tiang_tm || 0); });
    IDX = {a:a, U2U:U2U, pyl:pyl};
    return IDX;
  }
  function cariUlp(t, X){
    var hit = null;
    X.U2U.forEach(function(up3, ulp){
      var l = ulp.toLowerCase();
      if (UP3.indexOf(ulp) >= 0) { if (new RegExp('\\sulp\\s+' + l + '(\\s|$)').test(t)) hit = ulp; }
      else if (new RegExp('\\s' + l + '(\\s|$)').test(t)) hit = hit || ulp;
    });
    return hit;
  }
  function cariPenyulang(t, X){
    for (var i = 0; i < X.pyl.length; i++) {
      var r = X.pyl[i], l = r.penyulang.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (l.length < 4 && !/\spenyulang\s/.test(t)) continue;
      if (t.indexOf(' ' + l + ' ') >= 0) {
        // nama penyulang yang sama dengan nama ULP/UP3 hanya dipakai bila disebut "penyulang"
        if ((UP3.indexOf(r.penyulang) >= 0 || X.U2U.has(r.penyulang)) && !/\spenyulang\s/.test(t)) continue;
        return r;
      }
    }
    return null;
  }
  var GIDX = null;
  function indeksGardu(){
    if (GIDX) return GIDX;
    var g = need('gis_titik'); var m = new Map();
    g.forEach(function(r){
      if (!/gardu/i.test(r.lapis)) return;
      var k = r.nama.toLowerCase().replace(/^gd dist\s*/, '').replace(/[^a-z0-9]/g, '');
      if (!m.has(k)) m.set(k, r);
    });
    GIDX = m; return m;
  }
  function cariGardu(raw){
    var t = String(raw).toLowerCase(), m = indeksGardu(), re = /([a-z]{2,4})\s?-?\s?(\d{1,4}[a-z]?)\b/g, x;
    while ((x = re.exec(t))) {
      var k = x[1] + x[2]; if (m.has(k)) return m.get(k);
      var d = /^(\d+)([a-z]?)$/.exec(x[2]);
      if (d) { var k3 = x[1] + ('000' + d[1]).slice(-3) + d[2]; if (m.has(k3)) return m.get(k3); }
    }
    // gardu hubung dan gardu lain bernama, misalnya "GH Bandara"
    var best = null, gh = /(^|\s)gh\s|gardu hubung|gd kit|gardu kit/.test(t);
    m.forEach(function(r, k){
      var nm = r.nama.toLowerCase().replace(/^(gh|gd kit tr|gd)\s+/, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (gh && nm.length >= 4 && /^(gh|gd kit)/i.test(r.nama) && (' ' + t.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ').indexOf(' ' + nm + ' ') >= 0) {
        if (!best || nm.length > best.n) best = {r:r, n:nm.length};
      }
    });
    return best ? best.r : null;
  }

  /* ---------- tautan ke tab ---------- */
  window.__keTab = keTab; // dipakai panel Rincian per ULP di tab Ophardist untuk membuka health index ULP di Peta Aset
  function keTab(params){
    var hal = params.hal, o = {};
    // parameter berawalan _ khusus untuk Tanya Data (membuka panel health index), tidak dikirim ke dash.setParams
    Object.keys(params).forEach(function(k){ if (k.charAt(0) !== '_') o[k] = params[k]; });
    if (hal === 'ai' || hal === 'ao') o.jenis_ang = hal;
    dash.setParams(o);
    dash.setLink(hal);
    if (params._hi) {
      var n = 0;
      (function bukaHI(){
        var b = document.querySelector('.pa-warna[data-warna="hi"]'), tb = document.querySelector('.hi-tab[data-tab="hi"]');
        if ((!b || !tb) && n++ < 15) { setTimeout(bukaHI, 150); return; }
        try {
          if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
          if (tb && tb.getAttribute('aria-selected') !== 'true') tb.click();
          if (params._hiPyl && window.HIW && HIW.buka) HIW.buka(params._hiPyl, params._hiUlp);
          var col = document.querySelector('.pa-bcol#profil-ulp') || document.querySelector('.pa-bcol');
          if (col && !params._hiPyl) col.scrollIntoView({behavior:'smooth', block:'start'});
        } catch (e) {}
      })();
      return;
    }
    setTimeout(function(){ try {
      var pn = Array.prototype.find.call(document.querySelectorAll('.td-panel'), function(x){ return !x.closest('[hidden]'); });
      var bar = Array.prototype.find.call(document.querySelectorAll('.sb-top, .td-controls'), function(x){ return x.getBoundingClientRect().height > 0; }), off = bar ? bar.getBoundingClientRect().height + 8 : 8;
      if (pn) window.scrollTo({top:Math.max(0, pn.getBoundingClientRect().top + window.scrollY - off), behavior:'smooth'});
    } catch (e) {} }, 60);
  }

  /* ---------- A. Anggaran Investasi ---------- */
  var AIU = {UP3B:'UP3B', UP2K:'UP2K Maluku'};
  function jenisAI(t){ return /\smurni\s/.test(t) ? 'Murni' : /\s(luncuran|lanjutan)\s/.test(t) ? 'Luncuran' : 'Semua'; }
  function jwbAI(t, units, rank, low){
    var d = need('ai_unit'), j = jenisAI(t);
    var rows = d.filter(function(r){ return r.jenis === j; });
    var tot = rows.find(function(r){ return r.unit === 'Semua'; }) || {};
    var lab = j === 'Semua' ? 'AI Distribusi' : 'AI Distribusi ' + j.toLowerCase();
    var src = 'LKAI 2026, posisi ' + tgl(tot.posisi);
    var us = units.map(function(u){ return AIU[u] || u; });
    var kontrakQ = /\s(kontrak|belum (di)?bayar|selesai|lewat|terlambat|meluncur|fisik)\s/.test(t);
    var unitRows = rows.filter(function(r){ return r.unit !== 'Semua'; });
    if (rank && !us.length) {
      var key = kontrakQ ? 'selesai_belum_bayar_miliar' : (/terkontrak/.test(t) ? 'pct_kontrak' : 'pct_bayar');
      var lbl = key === 'pct_kontrak' ? '% terkontrak' : key === 'pct_bayar' ? '% terbayar' : 'selesai belum dibayar';
      var s = unitRows.filter(function(r){ return r.pagu_miliar > 0; }).slice().sort(function(a, b){ return low ? a[key] - b[key] : b[key] - a[key]; });
      var top = s[0], bot = s[s.length - 1];
      var fmt = function(r){ return key === 'selesai_belum_bayar_miliar' ? rp(r[key]) : pc(r[key]); };
      return jawab({judul: lab + ': peringkat unit menurut ' + lbl,
        isi: '<p>' + (low ? 'Terendah' : 'Tertinggi') + ': <b>' + esc(top.unit) + '</b> (' + fmt(top) + '). ' + (low ? 'Tertinggi' : 'Terendah') + ': <b>' + esc(bot.unit) + '</b> (' + fmt(bot) + '). Seluruh unit ' + (key === 'selesai_belum_bayar_miliar' ? rp(tot[key]) + ' (total)' : pc(tot[key])) + '.</p>' +
          tabel(['Unit', 'Pagu', lbl], s.map(function(r){ return {u:r.unit, cells:[esc(r.unit), nf(r.pagu_miliar, 2), fmt(r)]}; }), function(r){ return r.u === top.unit; }),
        sumber: src + '. Nilai dalam miliar rupiah.',
        tautan: [{label:'Lihat di tab Anggaran', params:{hal:'ai', up3_ai:null, ai_jenis:j === 'Semua' ? null : j}}]});
    }
    var pick = us.length ? us : ['Semua'];
    var isi = '', taut = [];
    pick.forEach(function(u){
      var r = rows.find(function(x){ return x.unit === u; });
      var nm = u === 'Semua' ? 'Seluruh unit' : (u === 'UIW' ? 'UIW (kantor induk)' : u);
      if (!r) { isi += '<p><b>' + esc(nm) + '</b>: tidak ada pagu ' + esc(lab) + ' untuk unit ini.</p>'; return; }
      if (kontrakQ) {
        isi += '<p><b>' + esc(nm) + '</b>: ' + nf(r.n_kontrak) + ' kontrak senilai ' + rp(r.nilai_kontrak_miliar) + '. Fisik selesai ' + nf(r.n_selesai) + ' kontrak (' + pc(r.pct_selesai_n) + '), berjalan ' + nf(r.n_berjalan) + '.</p><ul class="tq-ul">' +
          '<li>Selesai tetapi belum dibayar: <b>' + nf(r.n_selesai_belum_bayar) + ' kontrak, ' + rp(r.selesai_belum_bayar_miliar) + '</b></li>' +
          '<li>Lewat tanggal selesai: ' + nf(r.n_lewat) + ' kontrak, ' + rp(r.nilai_lewat_miliar) + '</li>' +
          '<li>Rencana meluncur ke 2027: ' + nf(r.n_meluncur) + ' kontrak, ' + rp(r.nilai_meluncur_miliar) + '</li>' +
          '<li>Fisik masih 0%: ' + nf(r.n_fisik0) + ' kontrak, ' + rp(r.nilai_fisik0_miliar) + '</li></ul>';
      } else {
        isi += '<p><b>' + esc(nm) + '</b>: pagu ' + rp(r.pagu_miliar) + ', terkontrak ' + rp(r.terkontrak_miliar) + ' (<b>' + pc(r.pct_kontrak) + '</b>), terbayar ' + rp(r.terbayar_miliar) + ' (<b>' + pc(r.pct_bayar) + '</b>), sisa pagu belum terkontrak ' + rp(r.sisa_miliar) + '.</p>';
      }
      taut.push({label:'Lihat di tab Anggaran' + (u === 'Semua' ? '' : ' (' + (u === 'UP3B' ? 'UP3B Maluku' : u) + ')'), params:{hal:'ai', up3_ai:u === 'Semua' ? null : u, ai_jenis:j === 'Semua' ? null : j}});
    });
    var kat = kontrakQ && pick.length === 1 ? katKontrak(t) : null;
    if (kat) isi += daftarKontrak(kat, pick[0], j);
    if (pick.length === 1 && pick[0] === 'Semua' && !kontrakQ) {
      isi += tabel(['Unit', 'Pagu', '% kontrak', '% bayar'], unitRows.map(function(r){ return {cells:[esc(r.unit), nf(r.pagu_miliar, 2), pc(r.pct_kontrak), pc(r.pct_bayar)]}; }));
    }
    return jawab({judul: lab + (kontrakQ ? ': kontrak' + (kat ? ' ' + kat.nama : '') : ''), isi:isi, sumber:src + '.' + (kat ? ' Daftar diurutkan dari nilai kontrak terbesar.' : ''), tautan:taut.slice(0, 3)});
  }
  /* daftar kontrak menurut kategori yang ditanyakan */
  var KATK = [
    {re:/\s(lewat|terlambat|melewati|melampaui)\s/, nama:'lewat tanggal selesai', f:function(r){ return r.lewat_tgl_selesai === 'ya'; }},
    {re:/belum (di)?bayar|belum terbayar/, nama:'selesai tetapi belum dibayar', f:function(r){ return r.kelompok === 'Selesai, belum terbayar'; }},
    {re:/meluncur|luncur 2027|ke 2027/, nama:'rencana meluncur ke 2027', f:function(r){ return r.meluncur === 'ya'; }},
    {re:/fisik 0|belum mulai|\s0%\s/, nama:'fisik 0%', f:function(r){ return r.kelompok === 'Fisik 0%'; }},
    {re:/belum diisi|progres kosong/, nama:'progres belum diisi', f:function(r){ return r.kelompok === 'Belum diisi'; }}
  ];
  function katKontrak(t){ for (var i = 0; i < KATK.length; i++) if (KATK[i].re.test(t)) return KATK[i]; return null; }
  function daftarKontrak(k, u, j){
    var d = need('ai_kontrak').filter(function(r){ return r.jenis === j && (u === 'Semua' || r.unit === u) && k.f(r); })
      .sort(function(a, b){ return (b.nilai_jt || 0) - (a.nilai_jt || 0); });
    if (!d.length) return '<p>Tidak ada kontrak ' + k.nama + (u === 'Semua' ? '' : ' di ' + esc(u)) + '.</p>';
    var top = d.slice(0, 5);
    return '<h4 class="tq-h">Kontrak ' + k.nama + ' dengan nilai terbesar (' + top.length + ' dari ' + d.length + ')</h4>' +
      tabel(['Pekerjaan', 'Rp juta', 'Progres'], top.map(function(r){
        return {cells:[esc(potong(r.pekerjaan, 90)) + '<small>' + esc((u === 'Semua' ? r.unit + ' · ' : '') + (r.pelaksana || '–') + (r.tgl_selesai ? ' · selesai ' + tgl(r.tgl_selesai) : '')) + '</small>', nf(r.nilai_jt), esc(r.progres || '–')]};
      }), null, true);
  }
  /* program AI */
  var PROGK = [[/rekonduktor/, 'rekonduktoring'], [/uprating/, 'uprating'], [/kwh meter|peremajaan meter|meter kwh/, 'kwh meter'], [/\sslo\s|laik operasi/, 'laik operasi'],
    [/dedieselisasi/, 'dedieselisasi'], [/otomatisasi/, 'otomatisasi'], [/manajemen trafo/, 'manajemen trafo'], [/\sjtr\s/, 'perluasan jtr'], [/sirimau|hative/, 'sirimau'],
    [/evakuasi daya/, 'evakuasi daya gi dan'], [/scadatel/, 'scadatel'], [/digitalisasi distribusi|\sscada\s/, 'distribusi scada'], [/proteksi/, 'proteksi'],
    [/mutu tegangan/, 'mutu tegangan'], [/rekonfigurasi/, 'rekonfigurasi'], [/registrasi aset/, 'registrasi aset'], [/aset register/, 'aset register'],
    [/pecah beban|pembebanan/, 'pecah beban'], [/perkuatan gi/, 'perkuatan gi'], [/sarana penunjang|peralatan kerja distribusi/, 'sarana penunjang'],
    [/vvip|catu daya back/, 'vvip'], [/pemberatan/, 'pemberatan'], [/komponen jaringan/, 'komponen jaringan']];
  function cariProgram(t){
    var list = Array.from(new Set(need('ai_program').map(function(r){ return r.program; }))), best = null;
    list.forEach(function(p){ var l = norm(p).trim(); if (t.indexOf(' ' + l + ' ') >= 0 && (!best || l.length > norm(best).length)) best = p; });
    if (best) return best;
    for (var i = 0; i < PROGK.length; i++) if (PROGK[i][0].test(t)) {
      var s = PROGK[i][1], p = list.find(function(x){ return x.toLowerCase().indexOf(s) >= 0; });
      if (p) return p;
    }
    return null;
  }
  function lebih(r){ return !!r.melebihi_pagu && r.melebihi_pagu !== 'tidak'; }
  function namaAI(u){ return u === 'UP3B' ? 'UP3B Maluku' : u; }
  function jwbAIProgram(t, units, rank, low, prog){
    var j = jenisAI(t), d = need('ai_program').filter(function(r){ return r.jenis === j; });
    var lab = j === 'Semua' ? 'AI Distribusi' : 'AI Distribusi ' + j.toLowerCase();
    var src = 'LKAI 2026, posisi ' + tgl((need('ai_unit')[0] || {}).posisi) + '. Nilai dalam miliar rupiah.';
    var us = units.map(function(u){ return AIU[u] || u; });
    var k2 = /terkontrak|\skontrak\s/.test(t) && !/bayar|serapan|penyerapan/.test(t) ? 'pct_kontrak' : 'pct_bayar';
    var lbl = k2 === 'pct_kontrak' ? '% terkontrak' : '% terbayar';
    var link = {label:'Lihat di tab Anggaran', params:{hal:'ai', up3_ai:us.length === 1 ? us[0] : null, ai_jenis:j === 'Semua' ? null : j}};
    if (prog) {
      var rs = d.filter(function(r){ return r.program === prog; }), tot = rs.find(function(r){ return r.unit === 'Semua'; });
      if (!rs.length) return jawab({judul:'Program ' + prog, isi:'<p>Program ini tidak ada di ' + esc(lab) + '.</p>', tautan:[link]});
      var ur = rs.filter(function(r){ return r.unit !== 'Semua' && (!us.length || us.indexOf(r.unit) >= 0); }).sort(function(a, b){ return b.pagu_miliar - a.pagu_miliar; });
      var isi = tot ? '<p>Seluruh unit: pagu ' + rp(tot.pagu_miliar) + ', terkontrak ' + rp(tot.terkontrak_miliar) + ' (<b>' + pc(tot.pct_kontrak) + '</b>), terbayar ' + rp(tot.terbayar_miliar) + ' (<b>' + pc(tot.pct_bayar) + '</b>), ' + nf(tot.n_prk) + ' PRK' + (lebih(tot) ? '; <b>ada PRK yang terkontrak melebihi pagu</b>' : '') + '.</p>' : '';
      isi += ur.length ? tabel(['Unit', 'Pagu', '% kontrak', '% bayar'], ur.map(function(r){ return {cells:[esc(namaAI(r.unit)), nf(r.pagu_miliar, 2), pc(r.pct_kontrak), pc(r.pct_bayar)]}; })) : '<p>Unit yang ditanyakan tidak memiliki pagu program ini.</p>';
      return jawab({judul:lab + ': ' + prog, isi:isi, sumber:src, tautan:[link]});
    }
    var u = us[0] || 'Semua', rs2 = d.filter(function(r){ return r.unit === u && r.pagu_miliar > 0; });
    if (!rs2.length) return jawab({judul:lab + ' per program', isi:'<p>Tidak ada pagu ' + esc(lab) + ' untuk ' + esc(namaAI(u)) + '.</p>', tautan:[link]});
    var s = rs2.slice().sort(rank ? function(a, b){ return low ? a[k2] - b[k2] : b[k2] - a[k2]; } : function(a, b){ return b.pagu_miliar - a.pagu_miliar; });
    var top = s[0], lim = 10;
    var kal = rank ? (low ? 'Terendah' : 'Tertinggi') + ' menurut ' + lbl + ': <b>' + esc(top.program) + '</b> (' + pc(top[k2]) + ', pagu ' + rp(top.pagu_miliar) + ').'
                   : 'Pagu terbesar: <b>' + esc(top.program) + '</b> (' + rp(top.pagu_miliar) + ').';
    return jawab({judul:lab + ' per program' + (u === 'Semua' ? '' : ', ' + namaAI(u)),
      isi:'<p>' + nf(rs2.length) + ' program. ' + kal + '</p>' +
        tabel(['Program', 'Pagu', '% kontrak', '% bayar'], s.slice(0, lim).map(function(r){ return {p:r.program, cells:[esc(r.program) + (lebih(r) ? '<small>ada PRK melebihi pagu</small>' : ''), nf(r.pagu_miliar, 2), pc(r.pct_kontrak), pc(r.pct_bayar)]}; }), function(r){ return rank && r.p === top.program; }, true) +
        (s.length > lim ? '<p>Ditampilkan ' + lim + ' dari ' + s.length + ' program, urut ' + (rank ? lbl + (low ? ' terendah' : ' tertinggi') : 'pagu terbesar') + '.</p>' : ''),
      sumber:src, tautan:[link]});
  }
  /* PRK yang terkontrak melebihi pagu */
  function jwbMelebihi(t, units, ai, ao){
    var isi = '', taut = [], src = [];
    if (ai) {
      var ua = units.map(function(u){ return AIU[u] || u; });
      var seen = {}, ra = need('ai_rincian').filter(function(x){
        if (!lebih(x) || x.unit === 'Semua' || x.jenis === 'Semua' || (ua.length && ua.indexOf(x.unit) < 0)) return false;
        var k = x.jenis + '|' + x.unit + '|' + x.prk; if (seen[k]) return false; seen[k] = 1; return true; });
      isi += '<h4 class="tq-h">Anggaran Investasi (AI Distribusi)</h4>' + (ra.length ?
        tabel(['PRK', 'Pagu', 'Terkontrak', 'Lebih'], ra.map(function(x){ var l = x.terkontrak_jt - x.pagu_jt; return {cells:[esc(x.prk) + '<small>' + esc(namaAI(x.unit) + ' · ' + x.program + ' · ' + x.jenis.toLowerCase()) + '</small>', nf(x.pagu_jt, 1), nf(x.terkontrak_jt, 1), nf(l, 1)]}; }), null, true)
        : '<p>Tidak ada PRK AI yang terkontrak melebihi pagu' + (ua.length ? ' di unit ini' : '') + '.</p>');
      src.push('LKAI 2026'); taut.push({label:'Lihat AI', params:{hal:'ai', up3_ai:ua.length === 1 ? ua[0] : null, ai_jenis:null}});
    }
    if (ao) {
      var uo = units.map(function(u){ return AOU[u] || u; });
      var ro = need('ao_rincian').filter(function(x){ return lebih(x) && (!uo.length || uo.indexOf(x.unit) >= 0); });
      isi += '<h4 class="tq-h">Anggaran Operasi (AO Distribusi)</h4>' + (ro.length ?
        tabel(['PRK', 'Pagu', 'Terkontrak', 'Lebih'], ro.map(function(x){ var l = x.terkontrak_jt - x.pagu_jt; return {cells:[esc(x.deskripsi || x.kode) + '<small>' + esc(x.unit + ' · ' + x.kode + (x.kelompok === 'HUTANG USAHA' ? ' · hutang usaha' : '')) + '</small>', nf(x.pagu_jt, 1), nf(x.terkontrak_jt, 1), nf(l, 1)]}; }), null, true)
        : '<p>Tidak ada PRK AO yang terkontrak melebihi pagu' + (uo.length ? ' di unit ini' : '') + '.</p>');
      src.push('Monitoring AO (pagu Rekomposisi II)'); taut.push({label:'Lihat AO', params:{hal:'ao', up3_ao:uo.length === 1 ? uo[0] : null, ao_kel:null}});
    }
    return jawab({judul:'PRK yang terkontrak melebihi pagu', isi:isi, sumber:src.join(' dan ') + '. Nilai dalam juta rupiah.', tautan:taut});
  }

  /* ---------- B. Anggaran Operasi ---------- */
  var AOU = {UP3B:'UP3B Maluku'};
  function jwbAO(t, units, rank, low){
    var d = need('ao_unit');
    var k = /\smurni\s/.test(t) ? 'MURNI' : /\shutang/.test(t) ? 'HUTANG USAHA' : 'Semua';
    var rows = d.filter(function(r){ return r.kelompok === k; });
    var tot = rows.find(function(r){ return r.unit === 'Semua'; }) || {};
    var lab = 'AO Distribusi' + (k === 'Semua' ? '' : ' (' + (k === 'MURNI' ? 'murni' : 'hutang usaha') + ')');
    var src = 'Monitoring AO (pagu Rekomposisi II), posisi ' + tgl(tot.posisi);
    var unitRows = rows.filter(function(r){ return r.unit !== 'Semua'; });
    var us = units.map(function(u){ return AOU[u] || u; }).filter(function(u){ return u !== 'UP2K'; });
    if (rank && !us.length) {
      var key = /\ssisa\s/.test(t) ? 'sisa_miliar' : (/terkontrak/.test(t) ? 'pct_kontrak' : 'pct_bayar');
      var lbl = key === 'sisa_miliar' ? 'sisa pagu' : key === 'pct_kontrak' ? '% terkontrak' : '% terbayar';
      var lo = key === 'sisa_miliar' ? /terkecil|tersedikit|paling kecil/.test(t) : low; // untuk sisa, yang terbesar paling perlu perhatian
      var s = unitRows.filter(function(r){ return r.pagu_miliar > 0; }).slice().sort(function(a, b){ return lo ? a[key] - b[key] : b[key] - a[key]; });
      var top = s[0], bot = s[s.length - 1];
      var fmt = function(r){ return key === 'sisa_miliar' ? rp(r[key]) : pc(r[key]); };
      return jawab({judul: lab + ': peringkat unit menurut ' + lbl,
        isi: '<p>' + (lo ? 'Terendah' : 'Tertinggi') + ': <b>' + esc(top.unit) + '</b> (' + fmt(top) + '). ' + (lo ? 'Tertinggi' : 'Terendah') + ': <b>' + esc(bot.unit) + '</b> (' + fmt(bot) + ').</p>' +
          tabel(['Unit', 'Pagu', 'Sisa', '% bayar'], s.map(function(r){ return {u:r.unit, cells:[esc(r.unit), nf(r.pagu_miliar, 2), nf(r.sisa_miliar, 2), pc(r.pct_bayar)]}; }), function(r){ return r.u === top.unit; }),
        sumber: src + '. Nilai dalam miliar rupiah.',
        tautan: [{label:'Lihat di tab Anggaran', params:{hal:'ao', up3_ao:null, ao_kel:k === 'Semua' ? null : k}}]});
    }
    var pick = us.length ? us : (units.length ? [] : ['Semua']), isi = '', taut = [];
    if (units.indexOf('UP2K') >= 0) isi += '<p>UP2K Maluku tidak memiliki pagu AO Distribusi.</p>';
    pick.forEach(function(u){
      var r = rows.find(function(x){ return x.unit === u; });
      var nm = u === 'Semua' ? 'Seluruh unit' : (u === 'UIW' ? 'UIW (kantor induk)' : u);
      if (!r) { isi += '<p><b>' + esc(nm) + '</b>: tidak ada pagu ' + esc(lab) + ' untuk unit ini.</p>'; return; }
      isi += '<p><b>' + esc(nm) + '</b>: pagu ' + rp(r.pagu_miliar) + ', terkontrak ' + rp(r.terkontrak_miliar) + ' (<b>' + pc(r.pct_kontrak) + '</b>), terbayar ' + rp(r.terbayar_miliar) + ' (<b>' + pc(r.pct_bayar) + '</b>), prognosa ' + rp(r.prognosa_miliar) + ', ' + (r.sisa_miliar < 0 ? 'terkontrak melebihi pagu ' + rp(-r.sisa_miliar) : 'sisa pagu ' + rp(r.sisa_miliar)) + '.</p>';
      taut.push({label:'Lihat di tab Anggaran' + (u === 'Semua' ? '' : ' (' + u + ')'), params:{hal:'ao', up3_ao:u === 'Semua' ? null : u, ao_kel:k === 'Semua' ? null : k}});
    });
    if (pick.length === 1 && pick[0] === 'Semua') {
      isi += tabel(['Unit', 'Pagu', '% kontrak', '% bayar'], unitRows.map(function(r){ return {cells:[esc(r.unit), nf(r.pagu_miliar, 2), pc(r.pct_kontrak), pc(r.pct_bayar)]}; }));
    }
    return jawab({judul:lab, isi:isi, sumber:src + '.', tautan:taut.slice(0, 3)});
  }
  /* kegiatan AO */
  var KEG = [[/\sjtm\s|preventif/, 'Pemeliharaan JTM preventif'], [/keypoint|\sscada\s/, 'Keypoint dan SCADA'], [/yantek|borong/, 'Jasa borong yantek'],
    [/mapping|pengolahan data/, 'Pengolahan data mapping'], [/\sapp\s|\ssr\s|sambungan rumah/, 'Pemeliharaan APP/SR'], [/sppd|perjalanan dinas/, 'SPPD operasi dan pemeliharaan'],
    [/hutang usaha 2025/, 'Hutang usaha 2025']];
  function cariKegiatan(t){ for (var i = 0; i < KEG.length; i++) if (KEG[i][0].test(t)) return KEG[i][1]; return null; }
  function jwbAOKegiatan(t, units, rank, low, keg){
    var k = /\smurni\s/.test(t) ? 'MURNI' : /\shutang/.test(t) && keg !== 'Hutang usaha 2025' ? 'HUTANG USAHA' : 'Semua';
    var d = need('ao_kegiatan').filter(function(r){ return r.kelompok === k; });
    var posisi = (need('ao_unit')[0] || {}).posisi, src = 'Monitoring AO (pagu Rekomposisi II), posisi ' + tgl(posisi) + '. Nilai dalam miliar rupiah.';
    var us = units.map(function(u){ return AOU[u] || u; }).filter(function(u){ return u !== 'UP2K'; });
    var link = {label:'Lihat di tab Anggaran', params:{hal:'ao', up3_ao:us.length === 1 ? us[0] : null, ao_kel:k === 'Semua' ? null : k}};
    if (keg) {
      var rs = d.filter(function(r){ return r.kegiatan === keg; }), tot = rs.find(function(r){ return r.up3 === 'Semua'; });
      var ur = rs.filter(function(r){ return r.up3 !== 'Semua' && (!us.length || us.indexOf(r.up3) >= 0); })
        .sort(rank ? function(a, b){ return low ? a.pct_bayar - b.pct_bayar : b.pct_bayar - a.pct_bayar; } : function(a, b){ return b.pagu_miliar - a.pagu_miliar; });
      if (!rs.length) return jawab({judul:'AO ' + keg, isi:'<p>Kegiatan ini tidak ada di AO Distribusi' + (k === 'Semua' ? '' : ' kelompok ' + k.toLowerCase()) + '.</p>', tautan:[link]});
      var isi = tot ? '<p>Seluruh unit: pagu ' + rp(tot.pagu_miliar) + ', terkontrak <b>' + pc(tot.pct_kontrak) + '</b>, terbayar <b>' + pc(tot.pct_bayar) + '</b> dari pagu' + (tot.pct_kontrak > 100 ? '; nilai terkontrak sudah melebihi pagu' : '') + '.</p>' : '';
      isi += ur.length ? tabel(['Unit', 'Pagu', '% kontrak', '% bayar'], ur.map(function(r){ return {cells:[esc(r.up3), nf(r.pagu_miliar, 2), pc(r.pct_kontrak), pc(r.pct_bayar)]}; })) : '<p>Unit yang ditanyakan tidak memiliki pagu kegiatan ini.</p>';
      return jawab({judul:'AO Distribusi: ' + keg, isi:isi, sumber:src, tautan:[link]});
    }
    var u = us[0] || 'Semua', rs2 = d.filter(function(r){ return r.up3 === u && r.pagu_miliar > 0; }).sort(function(a, b){ return b.pagu_miliar - a.pagu_miliar; });
    if (!rs2.length) return jawab({judul:'AO per kegiatan', isi:'<p>Tidak ada pagu AO Distribusi untuk ' + esc(u) + '.</p>', tautan:[link]});
    var nl = need('ao_rincian').filter(function(x){ return lebih(x) && (u === 'Semua' || x.unit === u); }).length;
    return jawab({judul:'AO Distribusi per kegiatan' + (u === 'Semua' ? '' : ', ' + u),
      isi:'<p>Pagu terbesar: <b>' + esc(rs2[0].kegiatan) + '</b> (' + rp(rs2[0].pagu_miliar) + ').' + (nl ? ' Ada ' + nl + ' PRK yang terkontrak melebihi pagu; tanyakan "PRK AO yang melebihi pagu" untuk rinciannya.' : '') + '</p>' +
        tabel(['Kegiatan', 'Pagu', '% kontrak', '% bayar'], rs2.map(function(r){ return {cells:[esc(r.kegiatan), nf(r.pagu_miliar, 2), pc(r.pct_kontrak), pc(r.pct_bayar)]}; }), null, true),
      sumber:src, tautan:[link]});
  }

  /* ---------- C. Kinerja EPM ---------- */
  function epmUnitList(units){ var u = units.filter(function(x){ return UP3.indexOf(x) >= 0 || x === 'UIW'; }); return u; }
  function jwbSusut(t, units, rank, low){
    var bq = cariBulan(t), tq = trenQ(t);
    if (bq || tq) return jwbEpmBulan('EPM-SUSUT', t, units, bq, tq, rank, low);
    var d = need('epm_unit').filter(function(r){ return r.kode_kpi === 'EPM-SUSUT'; });
    if (!d.length) return jawab({judul:'Susut distribusi', isi:'<p>Data susut belum tersedia.</p>'});
    var p = per(d[0].periode), us = epmUnitList(units);
    var src = 'Spreadsheet Laporan Kinerja EPM 2026, kumulatif s.d. ' + p + '. Capaian susut = 2 − realisasi ÷ target; hijau ≥ 100%, kuning 95% s.d. < 100%, merah < 95%';
    var up = d.filter(function(r){ return r.up3 !== 'UIW'; });
    if (!us.length || rank) {
      var worst = /susut (tertinggi|terbesar|paling (tinggi|besar))/.test(t);
      var s = up.slice().sort(function(a, b){ return worst ? b.realisasi - a.realisasi : (low ? a.capaian - b.capaian : b.capaian - a.capaian); });
      var uiw = d.find(function(r){ return r.up3 === 'UIW'; });
      var top = s[0];
      var kal = rank ? (worst ? 'Susut tertinggi: <b>' + esc(top.up3) + '</b> (' + pc2(top.realisasi) + ' terhadap target ' + pc2(top.target) + ', capaian ' + pc(top.capaian) + ').'
                              : (low ? 'Capaian terendah' : 'Capaian tertinggi') + ': <b>' + esc(top.up3) + '</b> (' + pc(top.capaian) + ', realisasi ' + pc2(top.realisasi) + ' terhadap target ' + pc2(top.target) + ').')
                     : (uiw ? 'UIW: realisasi susut <b>' + pc2(uiw.realisasi) + '</b> terhadap target ' + pc2(uiw.target) + ', capaian <b>' + pc(uiw.capaian) + '</b>.' : '');
      return jawab({judul:'Susut distribusi per UP3, s.d. ' + p,
        isi:'<p>' + kal + '</p>' + tabel(['UP3', 'Realisasi', 'Target', 'Capaian'], s.map(function(r){ return {u:r.up3, cells:[dot(r.status) + esc(r.up3), pc2(r.realisasi), pc2(r.target), pc(r.capaian)]}; }), function(r){ return rank && r.u === top.up3; }),
        sumber:src + '.', tautan:[{label:'Lihat di tab EPM', params:{hal:'EPM', up3_epm:null, epm_kpi:'EPM-SUSUT'}}]});
    }
    var isi = '', taut = [];
    us.forEach(function(u){
      var r = d.find(function(x){ return x.up3 === u; });
      if (!r) { isi += '<p><b>' + esc(u) + '</b>: tidak ada data susut.</p>'; return; }
      isi += '<p>' + dot(r.status) + '<b>' + esc(u) + '</b>: realisasi susut kumulatif <b>' + pc2(r.realisasi) + '</b> terhadap target ' + pc2(r.target) + ', capaian <b>' + pc(r.capaian) + '</b> (' + r.status + ')' +
        (r.perubahan != null ? ', ' + (r.perubahan >= 0 ? 'naik ' : 'turun ') + nf(Math.abs(r.perubahan), 1) + ' poin dari bulan lalu' : '') +
        (r.peringkat ? '; peringkat ' + r.peringkat + ' dari 7 UP3' : '') + '. Susut bulan ' + p + ' saja ' + pc2(r.bulanan) + '.</p>';
      taut.push({label:'Lihat di tab EPM (' + u + ')', params:{hal:'EPM', up3_epm:u === 'UIW' ? null : u, epm_kpi:'EPM-SUSUT'}});
    });
    return jawab({judul:'Susut distribusi, s.d. ' + p, isi:isi, sumber:src + '.', tautan:taut.slice(0, 3)});
  }
  function pc2(v){ return v == null ? '–' : nf(v, 2) + '%'; }
  function jwbGM(t, units, rank, low){
    if (/(alasan|kategori|jenis|penyebab|rusak|\stua\s|prabayar|pascabayar)/.test(t)) return jwbGMKategori();
    var bq = cariBulan(t), tq = trenQ(t);
    if (bq || tq) return jwbEpmBulan('EPM-GM', t, units, bq, tq, rank, low);
    var d = need('epm_unit').filter(function(r){ return r.kode_kpi === 'EPM-GM'; });
    if (!d.length) return jawab({judul:'Penggantian meter', isi:'<p>Data penggantian meter belum tersedia.</p>'});
    var p = per(d[0].periode), us = epmUnitList(units);
    var src = 'Spreadsheet Laporan Kinerja EPM 2026, kumulatif s.d. ' + p + '. Target bulanan = target tahunan × bulan ÷ 12';
    var ket = d[0].keterangan ? ' ' + d[0].keterangan + '.' : '';
    if (!us.length || rank) {
      var s = d.filter(function(r){ return r.up3 !== 'UIW'; }).sort(function(a, b){ return low ? a.pct_tahunan - b.pct_tahunan : b.pct_tahunan - a.pct_tahunan; });
      var uiw = d.find(function(r){ return r.up3 === 'UIW'; }), top = s[0];
      var kal = rank ? (low ? 'Terendah' : 'Tertinggi') + ' terhadap target tahunan: <b>' + esc(top.up3) + '</b> (' + pc(top.pct_tahunan) + ').'
                     : (uiw ? 'UIW: ' + nf(uiw.realisasi) + ' meter dari target tahunan ' + nf(uiw.target_tahunan) + ' (<b>' + pc(uiw.pct_tahunan) + '</b>); capaian terhadap target s.d. ' + p + ' <b>' + pc(uiw.capaian) + '</b>.' : '');
      return jawab({judul:'Penggantian meter per UP3, s.d. ' + p,
        isi:'<p>' + kal + '</p>' + tabel(['UP3', 'Realisasi', 'Target tahun', '% tahun'], s.map(function(r){ return {u:r.up3, cells:[dot(r.status) + esc(r.up3), nf(r.realisasi), nf(r.target_tahunan), pc(r.pct_tahunan)]}; }), function(r){ return rank && r.u === top.up3; }),
        sumber:src + '.' + ket, tautan:[{label:'Lihat di tab EPM', params:{hal:'EPM', up3_epm:null, epm_kpi:'EPM-GM'}}]});
    }
    var isi = '', taut = [];
    us.forEach(function(u){
      var r = d.find(function(x){ return x.up3 === u; });
      if (!r) { isi += '<p><b>' + esc(u) + '</b>: tidak ada data penggantian meter.</p>'; return; }
      isi += '<p>' + dot(r.status) + '<b>' + esc(u) + '</b>: ' + nf(r.realisasi) + ' meter terganti s.d. ' + p + ' dari target tahunan ' + nf(r.target_tahunan) + ' (<b>' + pc(r.pct_tahunan) + '</b>). Capaian terhadap target s.d. ' + p + ' (' + nf(r.target) + ' meter) <b>' + pc(r.capaian) + '</b>. ' +
        (r.kurang_tahunan > 0 ? 'Kurang ' + nf(r.kurang_tahunan) + ' meter untuk target tahunan.' : 'Target tahunan sudah tercapai' + (r.bulan_tercapai ? ' sejak ' + BLN[r.bulan_tercapai - 1] : '') + '.') + '</p>';
      taut.push({label:'Lihat di tab EPM (' + u + ')', params:{hal:'EPM', up3_epm:u === 'UIW' ? null : u, epm_kpi:'EPM-GM'}});
    });
    return jawab({judul:'Penggantian meter, s.d. ' + p, isi:isi, sumber:src + '.' + ket, tautan:taut.slice(0, 3)});
  }
  /* P2TL: dihitung dari epm_rinci (pelanggaran + kelainan per bulan, target tahunan) */
  function p2tlModel(){
    var d = need('epm_rinci').filter(function(r){ return r.kode_kpi === 'EPM-P2TL'; });
    var by = new Map(), last = 0;
    d.forEach(function(r){
      var o = by.get(r.up3) || {up3:r.up3, ann:null, m:{}}; by.set(r.up3, o);
      var v = r.nilai === '' || r.nilai == null ? null : +r.nilai;
      if (r.ukuran === 'target_tahunan') { o.ann = v; return; }
      if (v == null || (r.ukuran !== 'kelainan' && r.ukuran !== 'pelanggaran')) return;
      var b = +String(r.periode).slice(5, 7); if (!b) return;
      var mm = o.m[b] || (o.m[b] = {pel:0, kel:0}); mm[r.ukuran === 'kelainan' ? 'kel' : 'pel'] += v;
      if (b > last) last = b;
    });
    var U = {up3:'UIW', ann:0, m:{}};
    UP3.forEach(function(u){ var x = by.get(u); if (!x) return; U.ann += x.ann || 0;
      Object.keys(x.m).forEach(function(k){ var a = U.m[k] || (U.m[k] = {pel:0, kel:0}); a.pel += x.m[k].pel; a.kel += x.m[k].kel; }); });
    return {by:by, U:U, last:last};
  }
  function p2tlSd(o, b){
    var pel = 0, kel = 0; for (var q = 1; q <= b; q++) if (o.m[q]) { pel += o.m[q].pel; kel += o.m[q].kel; }
    var tot = pel + kel, tk = o.ann ? o.ann * b / 12 : null, bl = o.m[b] || {pel:0, kel:0};
    return {up3:o.up3, pel:pel, kel:kel, tot:tot, ann:o.ann, tk:tk, cap:tk ? Math.round(tot / tk * 1000) / 10 : null, pt:o.ann ? Math.round(tot / o.ann * 1000) / 10 : null, bln:bl.pel + bl.kel, bpel:bl.pel, bkel:bl.kel};
  }
  function jwbP2TL(t, units, rank, low){
    var P = p2tlModel(), rows0 = UP3.map(function(u){ return P.by.get(u); }).filter(Boolean);
    if (!rows0.length || !P.last) return jawab({judul:'P2TL', isi:'<p>Data P2TL belum tersedia.</p>'});
    var b = cariBulan(t), tr = trenQ(t), cat = '';
    if (b > P.last) { cat = '<p>Data P2TL bulan ' + BLN[b-1] + ' belum ada; data terakhir s.d. ' + BLN[P.last-1] + '.</p>'; b = P.last; }
    var bb = b || P.last, p = BLN[bb-1] + ' 2026', us = epmUnitList(units);
    var rows = rows0.map(function(o){ return p2tlSd(o, bb); }), U = p2tlSd(P.U, bb);
    var src = 'Spreadsheet Laporan Kinerja EPM 2026 (sheet P2TL Maluku), dalam kWh. Realisasi = pelanggaran + kelainan, kumulatif sejak Januari; capaian = realisasi ÷ (target tahunan × bulan ÷ 12)';
    var link = function(u){ return {label:'Lihat di tab EPM' + (u && u !== 'UIW' ? ' (' + u + ')' : ''), params:{hal:'EPM', up3_epm:u && u !== 'UIW' ? u : null}}; };
    if (tr) {
      var u = us[0] || 'UIW', o = u === 'UIW' ? P.U : P.by.get(u);
      if (!o) return jawab({judul:'P2TL per bulan', isi:'<p>Tidak ada data P2TL untuk ' + esc(u) + '.</p>'});
      var rs = []; for (var q = 1; q <= P.last; q++) rs.push(p2tlSd(o, q));
      var mx = rs.reduce(function(m, r, i){ return !m || r.bln > m.r.bln ? {r:r, i:i} : m; }, null);
      return jawab({judul:'P2TL per bulan, ' + (u === 'UIW' ? 'UIW' : 'UP3 ' + u) + ' 2026',
        isi:cat + '<p>Bulan dengan kWh P2TL terbesar: <b>' + BLN[mx.i] + '</b> (' + nf(mx.r.bln) + ' kWh). Kumulatif s.d. ' + BLN[P.last-1] + ' <b>' + nf(rs[rs.length-1].tot) + ' kWh</b>' + (o.ann ? ', capaian <b>' + pc(rs[rs.length-1].cap) + '</b>' : '') + '.</p>' +
          tabel(['Bulan', 'Pelanggaran', 'Kelainan', 'Kumulatif', 'Capaian'], rs.map(function(r, i){ return {b:i + 1, cells:[dot(stat(r.cap)) + BLN[i].slice(0, 3), nf(r.bpel), nf(r.bkel), nf(r.tot), pc(r.cap)]}; }), function(r){ return r.b === b; }),
        sumber:src + '.', tautan:[link(u)]});
    }
    if (!us.length || rank) {
      var s = rows.slice().sort(function(a, x){ return low ? a.cap - x.cap : x.cap - a.cap; }), top = s[0];
      var kal = rank ? (low ? 'Capaian terendah' : 'Capaian tertinggi') + ': <b>' + esc(top.up3) + '</b> (' + pc(top.cap) + ').'
                     : 'UIW: pelanggaran ' + nf(U.pel) + ' kWh dan kelainan ' + nf(U.kel) + ' kWh, total <b>' + nf(U.tot) + ' kWh</b> atau <b>' + pc(U.pt) + '</b> dari target tahunan ' + nf(U.ann) + ' kWh' + (b ? '; bulan ' + BLN[b-1] + ' saja ' + nf(U.bln) + ' kWh' : '') + '.';
      return jawab({judul:'P2TL per UP3, ' + (b ? 'Januari s.d. ' : 's.d. ') + p,
        isi:cat + '<p>' + kal + '</p>' + (b ? tabel(['UP3', BLN[b-1].slice(0, 3) + ' saja', 'Kumulatif', 'Capaian'], s.map(function(o){ return {u:o.up3, cells:[dot(stat(o.cap)) + esc(o.up3), nf(o.bln), nf(o.tot), pc(o.cap)]}; }), function(r){ return rank && r.u === top.up3; })
          : tabel(['UP3', 'Pelanggaran', 'Kelainan', 'Capaian'], s.map(function(o){ return {u:o.up3, cells:[dot(stat(o.cap)) + esc(o.up3), nf(o.pel), nf(o.kel), pc(o.cap)]}; }), function(r){ return rank && r.u === top.up3; })),
        sumber:src + '.', tautan:[link(null)]});
    }
    var isi = cat, taut = [];
    us.forEach(function(u){
      var o = u === 'UIW' ? U : rows.find(function(x){ return x.up3 === u; });
      if (!o) { isi += '<p><b>' + esc(u) + '</b>: tidak ada data P2TL.</p>'; return; }
      isi += '<p>' + dot(stat(o.cap)) + '<b>' + esc(u) + '</b>: ' + (b ? 'bulan ' + BLN[b-1] + ' saja ' + nf(o.bln) + ' kWh (pelanggaran ' + nf(o.bpel) + ', kelainan ' + nf(o.bkel) + '); kumulatif ' : '') + 'pelanggaran ' + nf(o.pel) + ' kWh, kelainan ' + nf(o.kel) + ' kWh, total <b>' + nf(o.tot) + ' kWh</b> s.d. ' + p + '. Target tahunan ' + (o.ann ? nf(o.ann) + ' kWh, tercapai <b>' + pc(o.pt) + '</b>; capaian terhadap target s.d. ' + p + ' <b>' + pc(o.cap) + '</b>.' : 'belum diisi.') + '</p>';
      taut.push(link(u));
    });
    return jawab({judul:'P2TL, s.d. ' + p, isi:isi, sumber:src + '.', tautan:taut.slice(0, 3)});
  }
  /* susut dan penggantian meter per bulan (epm_bulan) */
  function jwbEpmBulan(kode, t, units, b, tr, rank, low){
    var su = kode === 'EPM-SUSUT', nm = su ? 'Susut distribusi' : 'Penggantian meter';
    var eu = need('epm_unit').find(function(r){ return r.kode_kpi === kode; }), last = eu ? eu.bulan : 0;
    var d = need('epm_bulan').filter(function(r){ return r.kode_kpi === kode && r.bulan <= last; });
    if (!last || !d.length) return jawab({judul:nm, isi:'<p>Data ' + nm.toLowerCase() + ' per bulan belum tersedia.</p>'});
    var fv = su ? pc2 : function(v){ return nf(v); }, cat = '';
    if (b > last) { cat = '<p>Data ' + nm.toLowerCase() + ' bulan ' + BLN[b-1] + ' belum ada; data terakhir s.d. ' + BLN[last-1] + '.</p>'; b = last; }
    var us = epmUnitList(units);
    var src = 'Spreadsheet Laporan Kinerja EPM 2026. ' + (su ? 'Capaian susut = 2 − realisasi kumulatif ÷ target' : 'Target bulanan = target tahunan × bulan ÷ 12; realisasi dan target kumulatif sejak Januari');
    var link = function(u){ return {label:'Lihat di tab EPM' + (u && u !== 'UIW' ? ' (' + u + ')' : ''), params:{hal:'EPM', up3_epm:u && u !== 'UIW' ? u : null, epm_kpi:kode}}; };
    if (tr) {
      var u = us[0] || 'UIW', rs = d.filter(function(r){ return r.up3 === u; }).sort(function(a, x){ return a.bulan - x.bulan; });
      var mx = null, mn = null;
      rs.forEach(function(r){ if (r.bulanan == null) return; if (!mx || r.bulanan > mx.bulanan) mx = r; if (!mn || r.bulanan < mn.bulanan) mn = r; });
      return jawab({judul:nm + ' per bulan, ' + (u === 'UIW' ? 'UIW' : 'UP3 ' + u) + ' 2026',
        isi:cat + (mx ? '<p>' + (su ? 'Susut bulanan tertinggi ' : 'Penggantian terbanyak ') + '<b>' + BLN[mx.bulan-1] + '</b> (' + fv(mx.bulanan) + '), ' + (su ? 'terendah ' : 'tersedikit ') + '<b>' + BLN[mn.bulan-1] + '</b> (' + fv(mn.bulanan) + ').</p>' : '') +
          tabel(['Bulan', 'Bulan itu', 'Kumulatif', 'Target', 'Capaian'], rs.map(function(r){ return {b:r.bulan, cells:[dot(stat(r.capaian)) + BLN[r.bulan-1].slice(0, 3), fv(r.bulanan), fv(r.realisasi), fv(r.target), pc(r.capaian)]}; }), function(r){ return r.b === b; }),
        sumber:src + '.', tautan:[link(u)]});
    }
    if (us.length && !rank) {
      var isi = cat;
      us.forEach(function(u){ var r = d.find(function(x){ return x.up3 === u && x.bulan === b; });
        if (!r) { isi += '<p><b>' + esc(u) + '</b>: tidak ada data.</p>'; return; }
        isi += '<p>' + dot(stat(r.capaian)) + '<b>' + esc(u) + '</b>, ' + BLN[b-1] + ' 2026: ' +
          (su ? 'susut bulan itu saja <b>' + pc2(r.bulanan) + '</b>; kumulatif Januari s.d. ' + BLN[b-1] + ' <b>' + pc2(r.realisasi) + '</b> terhadap target ' + pc2(r.target)
              : '<b>' + nf(r.bulanan) + ' meter</b> diganti pada bulan itu; kumulatif s.d. ' + BLN[b-1] + ' <b>' + nf(r.realisasi) + ' meter</b> terhadap target ' + nf(r.target)) +
          ', capaian <b>' + pc(r.capaian) + '</b>.</p>'; });
      return jawab({judul:nm + ', ' + BLN[b-1] + ' 2026', isi:isi, sumber:src + '.', tautan:[link(us[0])]});
    }
    var s = d.filter(function(r){ return r.bulan === b && r.up3 !== 'UIW'; });
    var worst = su && /(tertinggi|terbesar|paling (tinggi|besar))/.test(t);
    s.sort(function(a, x){ return worst ? x.bulanan - a.bulanan : (low ? a.capaian - x.capaian : x.capaian - a.capaian); });
    var uiw = d.find(function(r){ return r.up3 === 'UIW' && r.bulan === b; }), top = s[0];
    var kal = rank && top ? (worst ? 'Susut bulan ' + BLN[b-1] + ' tertinggi: <b>' + esc(top.up3) + '</b> (' + pc2(top.bulanan) + ').' : (low ? 'Capaian terendah' : 'Capaian tertinggi') + ': <b>' + esc(top.up3) + '</b> (' + pc(top.capaian) + ').')
      : uiw ? 'UIW: ' + (su ? 'susut bulan itu ' + pc2(uiw.bulanan) + ', kumulatif <b>' + pc2(uiw.realisasi) + '</b>' : nf(uiw.bulanan) + ' meter pada bulan itu, kumulatif <b>' + nf(uiw.realisasi) + '</b>') + ', capaian <b>' + pc(uiw.capaian) + '</b>.' : '';
    return jawab({judul:nm + ' per UP3, ' + BLN[b-1] + ' 2026', isi:cat + '<p>' + kal + '</p>' +
      tabel(['UP3', 'Bulan itu', 'Kumulatif', 'Capaian'], s.map(function(r){ return {u:r.up3, cells:[dot(stat(r.capaian)) + esc(r.up3), fv(r.bulanan), fv(r.realisasi), pc(r.capaian)]}; }), function(r){ return rank && top && r.u === top.up3; }),
      sumber:src + '.', tautan:[link(null)]});
  }
  function jwbGMKategori(){
    var d = need('epm_kategori');
    if (!d.length) return jawab({judul:'Alasan penggantian meter', isi:'<p>Data kategori penggantian meter belum tersedia.</p>'});
    var s = d.slice().sort(function(a, b){ return b.nilai - a.nilai; }), tot = sum(d, function(r){ return r.nilai; });
    return jawab({judul:'Penggantian meter menurut alasan, ' + (d[0].up3 === 'UIW' ? 'UIW' : d[0].up3) + ' s.d. ' + per(d[0].periode),
      isi:'<p>Total ' + nf(tot) + ' meter. Terbanyak: <b>' + esc(s[0].kategori) + '</b> (' + nf(s[0].nilai) + ' meter, ' + pc(s[0].persen) + ').</p>' +
        tabel(['Kategori', 'Meter', 'Porsi'], s.map(function(r){ return {cells:[esc(r.kategori), nf(r.nilai), pc(r.persen)]}; })) +
        '<p>Rincian alasan baru tersedia untuk tingkat UIW, belum per UP3.</p>',
      sumber:'Spreadsheet Laporan Kinerja EPM 2026 (sheet GAMET, rekap pascabayar/prabayar rusak dan tua).', tautan:[{label:'Lihat di tab EPM', params:{hal:'EPM', up3_epm:null, epm_kpi:'EPM-GM'}}]});
  }

  /* ---------- D. Aset jaringan ---------- */
  var CATATAN = {Tual:'UP3 Tual belum memuat JTM, gardu dan trafo.', Masohi:'UP3 Masohi belum memuat gardu dan trafo, serta JTM ULP Piru dan Kairatu.'};
  function kvaLingkup(sc, X){
    var K = window.__KAPASITAS; if (!K || !K.ulp) return null;
    if (sc.pyl) {
      var g = need('gis_titik'), tot = 0, n = 0;
      g.forEach(function(r){ if (r.lapis === 'Gardu distribusi' && r.penyulang === sc.pyl && r.ulp === sc.ulp && K.gardu && K.gardu[r.nama] != null) { tot += +K.gardu[r.nama]; n++; } });
      return n ? tot : null;
    }
    var t = 0, ada = false;
    Object.keys(K.ulp).forEach(function(u){ var v = K.ulp[u]; if ((sc.ulp && u === sc.ulp) || (!sc.ulp && (sc.up3 === 'Semua' || v.up3 === sc.up3))) { t += +v.kva || 0; ada = true; } });
    return ada ? t : null;
  }
  function merkLingkup(sc){
    var K = window.__KAPASITAS; if (!K || !K.merk_gardu) return [];
    var g = need('gis_titik'), c = new Map(), X = indeksAset();
    g.forEach(function(r){
      if (r.lapis !== 'Gardu distribusi') return;
      if (sc.pyl && r.penyulang !== sc.pyl) return;
      if (sc.ulp && r.ulp !== sc.ulp) return;
      if (!sc.ulp && sc.up3 !== 'Semua' && X.U2U.get(r.ulp) !== sc.up3) return;
      var m = K.merk_gardu[r.nama]; if (!m) return;
      m.split(' / ').forEach(function(x){ c.set(x, (c.get(x) || 0) + 1); });
    });
    return Array.from(c).sort(function(a, b){ return b[1] - a[1]; });
  }
  function jwbAset(t, units, rank, low, raw){
    var X = indeksAset(), pyl = cariPenyulang(t, X), ulp = pyl ? pyl.ulp : cariUlp(t, X);
    var up3 = pyl ? pyl.up3 : ulp ? X.U2U.get(ulp) : (units.filter(function(u){ return UP3.indexOf(u) >= 0; })[0] || 'Semua');
    var dimuat = Array.from(new Set(Array.from(X.U2U.values())));
    if (up3 !== 'Semua' && dimuat.indexOf(up3) < 0)
      return jawab({judul:'Aset jaringan UP3 ' + up3, isi:'<p>Data aset UP3 ' + esc(up3) + ' belum dimuat ke dashboard. UP3 yang sudah ada: ' + dimuat.join(', ') + '.</p>',
        tautan:[{label:'Lihat Peta Aset', params:{hal:'aset', up3_aset:null, ulp_aset:null, pyl_aset:null}}]});
    var sc = {up3:up3, ulp:ulp || null, pyl:pyl ? pyl.penyulang : null};
    var nama = sc.pyl ? 'penyulang ' + sc.pyl + ' (ULP ' + sc.ulp + ', UP3 ' + up3 + ')' : sc.ulp ? 'ULP ' + sc.ulp + ' (UP3 ' + up3 + ')' : up3 === 'Semua' ? 'seluruh UP3 yang sudah dimuat (' + dimuat.join(', ') + ')' : 'UP3 ' + up3;
    var link = {label:'Lihat di Peta Aset', params:{hal:'aset', up3_aset:up3 === 'Semua' ? null : up3, ulp_aset:sc.ulp, pyl_aset:sc.pyl}};
    var src = 'Data GIS unit (SHP/GDB) yang dimuat ke Peta Aset';
    // peringkat penyulang atau ULP
    if (rank) {
      var met = /\s(gardu)\s/.test(t) ? ['gardu_distribusi', 'gardu distribusi', 0] : /\stiang\s/.test(t) ? ['tiang_tm', 'tiang TM', 0] : /\strafo\s/.test(t) ? ['trafo_distribusi', 'trafo', 0] : /\s(recloser|lbs|fco|pmcb|switching)\s/.test(t) ? ['switching', 'switching', 0] : ['jtm_km', 'panjang JTM (kms)', 1];
      var lvl = /\sulp\s/.test(t) && !/\spenyulang\s/.test(t) ? 'ulp' : 'penyulang';
      var rs = X.a.filter(function(r){
        if (lvl === 'ulp') return r.ulp !== 'Semua' && r.penyulang === 'Semua' && (up3 === 'Semua' || r.up3 === up3);
        return r.ulp !== 'Semua' && r.penyulang !== 'Semua' && !/^\(/.test(r.penyulang) && (up3 === 'Semua' || r.up3 === up3) && (!sc.ulp || r.ulp === sc.ulp);
      }).filter(function(r){ return r[met[0]] != null && r[met[0]] !== ''; }).sort(function(a, b){ return low ? a[met[0]] - b[met[0]] : b[met[0]] - a[met[0]]; }).slice(0, 8);
      return jawab({judul:(lvl === 'ulp' ? 'ULP' : 'Penyulang') + ' dengan ' + met[1] + ' ' + (low ? 'terkecil' : 'terbesar') + (up3 === 'Semua' ? '' : ' di ' + (sc.ulp ? 'ULP ' + sc.ulp : 'UP3 ' + up3)),
        isi:tabel([lvl === 'ulp' ? 'ULP' : 'Penyulang', lvl === 'ulp' ? 'UP3' : 'ULP', met[1]], rs.map(function(r){ return {cells:[esc(lvl === 'ulp' ? r.ulp : r.penyulang), esc(lvl === 'ulp' ? r.up3 : r.ulp), nf(r[met[0]], met[2])]}; })),
        sumber:src + '.' + (CATATAN[up3] ? ' ' + CATATAN[up3] : ''), tautan:[link]});
    }
    var r = X.a.find(function(x){ return x.up3 === up3 && x.ulp === (sc.ulp || 'Semua') && x.penyulang === (sc.pyl || 'Semua'); });
    if (!r) return jawab({judul:'Aset ' + nama, isi:'<p>Tidak ada rekap aset untuk ' + esc(nama) + '.</p>', tautan:[link]});
    if (/\smerk\s|\spabrikan\s|\smanufaktur/.test(t)) {
      var mk = merkLingkup(sc);
      return jawab({judul:'Merk trafo gardu, ' + nama,
        isi: mk.length ? '<p>' + nf(sum(mk, function(x){ return x[1]; })) + ' gardu dengan merk tercatat; terbanyak <b>' + esc(mk[0][0]) + '</b> (' + nf(mk[0][1]) + ' gardu).</p>' + tabel(['Merk', 'Gardu'], mk.slice(0, 8).map(function(x){ return {cells:[esc(x[0]), nf(x[1])]}; })) : '<p>Belum ada data merk trafo untuk lingkup ini.</p>',
        sumber:'Tabel trafo distribusi (kolom MANUFACTUR) dari data unit.', tautan:[link]});
    }
    var kva = kvaLingkup(sc, X);
    var li = [
      ['Panjang JTM', r.jtm_km ? nf(r.jtm_km, 1) + ' kms' : 'belum ada di data'],
      ['Gardu distribusi', nd(r.gardu_distribusi) + (kva ? ', kapasitas trafo ' + nf(kva) + ' kVA' : '')],
      ['Trafo distribusi', nd(r.trafo_distribusi)],
      ['Switching', nf(r.switching) + ' (LBS ' + nf(r.lbs) + ', PMCB ' + nf(r.pmcb) + ', recloser ' + nf(r.recloser) + ', FCO ' + nf(r.fco) + ')'],
      ['Gardu hubung', nd(r.gardu_hubung)],
      ['Tiang TM', nd(r.tiang_tm)]
    ];
    return jawab({judul:'Aset jaringan ' + nama,
      isi:'<ul class="tq-ul">' + li.map(function(x){ return '<li>' + x[0] + ': <b>' + x[1] + '</b></li>'; }).join('') + '</ul>',
      sumber:src + '.' + (CATATAN[up3] ? ' ' + CATATAN[up3] : up3 === 'Semua' ? ' ' + CATATAN.Tual + ' ' + CATATAN.Masohi : ''), tautan:[link]});
  }
  function jwbBeban(t, units, rank, low){
    var b = need('beban_gis'), X = indeksAset();
    var pyl = cariPenyulang(t, X), ulp = pyl ? pyl.ulp : cariUlp(t, X);
    var up3 = pyl ? pyl.up3 : ulp ? X.U2U.get(ulp) : (units.filter(function(u){ return UP3.indexOf(u) >= 0; })[0] || null);
    var ada = Array.from(new Set(b.map(function(r){ return r.up3; }).filter(function(x){ return x && x !== 'Semua'; })));
    if (up3 && ada.indexOf(up3) < 0) return jawab({judul:'Beban penyulang', isi:'<p>Data beban penyulang baru tersedia untuk UP3 ' + ada.join(', ') + '. UP3 ' + esc(up3) + ' belum ada.</p>'});
    up3 = up3 || ada[0];
    var py = b.filter(function(r){ return r.tingkat === 'penyulang' && r.up3 === up3 && (!ulp || r.ulp === ulp); });
    var p = per((py[0] || b[0] || {}).periode);
    var src = 'Beban puncak penyulang ' + p + ' dari unit, dicocokkan ke data GIS';
    var link = {label:'Lihat di Peta Aset', params:{hal:'aset', up3_aset:up3, ulp_aset:ulp || null, pyl_aset:pyl ? pyl.penyulang : null}};
    if (pyl) {
      var r = py.find(function(x){ return x.penyulang === pyl.penyulang; });
      if (!r) return jawab({judul:'Beban penyulang ' + pyl.penyulang, isi:'<p>Beban penyulang ini belum tercatat.</p>', tautan:[link]});
      return jawab({judul:'Beban penyulang ' + r.penyulang + ' (ULP ' + r.ulp + ')',
        isi:'<p>Beban puncak ' + p + ': <b>' + nf(r.beban_mw, 2) + ' MW</b> (arus ' + nf(r.arus_a, 1) + ' A). Panjang JTM ' + nf(r.jtm_km, 1) + ' kms, ' + nf(r.gardu_distribusi) + ' gardu, rata-rata ' + nf(r.kw_per_gardu, 1) + ' kW per gardu.</p>',
        sumber:src + '.', tautan:[link]});
    }
    var agg = b.find(function(r){ return ulp ? (r.tingkat === 'ulp' && r.ulp === ulp) : (r.tingkat === 'up3' && r.up3 === up3); });
    var s = py.slice().sort(function(a, x){ return low ? a.beban_mw - x.beban_mw : x.beban_mw - a.beban_mw; }).slice(0, 6);
    var top = s[0];
    return jawab({judul:'Beban penyulang ' + (ulp ? 'ULP ' + ulp : 'UP3 ' + up3) + ', ' + p,
      isi:'<p>' + (agg ? 'Jumlah beban puncak penyulang: <b>' + nf(agg.beban_mw, 2) + ' MW</b>. ' : '') + (top ? 'Beban ' + (low ? 'terendah' : 'tertinggi') + ': <b>' + esc(top.penyulang) + '</b> (' + nf(top.beban_mw, 2) + ' MW, ' + nf(top.arus_a, 1) + ' A).' : '') + '</p>' +
        tabel(['Penyulang', 'ULP', 'MW', 'Arus (A)'], s.map(function(r){ return {cells:[esc(r.penyulang), esc(r.ulp), nf(r.beban_mw, 2), nf(r.arus_a, 1)]}; })),
      sumber:src + '.', tautan:[link]});
  }
  function jwbGardu(g){
    var X = indeksAset(), K = window.__KAPASITAS || {};
    var up3 = X.U2U.get(g.ulp) || '–', kva = K.gardu ? K.gardu[g.nama] : null, mk = K.merk_gardu ? K.merk_gardu[g.nama] : null;
    var li = [['Jenis', g.jenis], ['UP3 / ULP', up3 + ' / ' + (g.ulp || '–')], ['Penyulang', g.penyulang || '–'], ['Tahun dibangun', g.th_buat || '–'],
      ['Kapasitas trafo', kva != null ? nf(kva) + ' kVA' : 'belum tercatat'], ['Merk trafo', mk || 'belum tercatat']];
    var maps = 'https://www.google.com/maps/search/?api=1&query=' + g.lat + ',' + g.lon;
    return jawab({judul:g.nama,
      isi:'<ul class="tq-ul">' + li.map(function(x){ return '<li>' + x[0] + ': <b>' + esc(x[1]) + '</b></li>'; }).join('') + '</ul><p>Koordinat ' + nf(g.lat, 5) + ', ' + nf(g.lon, 5) + ' (<a href="' + maps + '" target="_blank" rel="noopener">buka di Google Maps</a>).</p>',
      sumber:'Data GIS UP3 ' + up3 + ' (gardu, trafo dan kode kapasitas).',
      tautan:[{label:'Lihat penyulangnya di Peta Aset', params:{hal:'aset', up3_aset:up3, ulp_aset:g.ulp || null, pyl_aset:g.penyulang || null}}]});
  }

  /* ---------- E. Umum ---------- */
  var BS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  function tglPendek(s){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? (+m[3]) + ' ' + BS[+m[2]-1] : (s || '–'); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function tautan(h, x){ return '<a href="' + h + '" target="_blank" rel="noopener noreferrer">' + x + '</a>'; }
  // tautan spreadsheet yang sudah tampil terbuka di halaman ini (tab Anggaran, EPM, Transmisi dan panel health index)
  var SRC = {
    ai:'https://bit.ly/LKAI2026-UIWMMU',
    epm:'https://docs.google.com/spreadsheets/d/1re__zyinNAx9BbftnwtvtZp6OqrrxwNSHK_6eVHQP0c/edit',
    hi:'https://docs.google.com/spreadsheets/d/1rzEIhx2K2B3JArbKAz4K7GpCdYYBlkwqAtHXSMYgvuc/edit#gid=2030371538',
    gu:'https://docs.google.com/spreadsheets/d/1rzEIhx2K2B3JArbKAz4K7GpCdYYBlkwqAtHXSMYgvuc/edit',
    trs_ao:'https://docs.google.com/spreadsheets/d/17pCTW7S7Ua7azhSci-X3NzWWWbvqi_LC/edit?gid=1477443203#gid=1477443203',
    trs_ai:'https://docs.google.com/spreadsheets/d/1G_Wspp-EKb7E2XOGRaBjZMmxAuZlqqAQ/edit?gid=56154097#gid=56154097',
    trs_scada:'https://docs.google.com/spreadsheets/d/1txdrftRIr5zLWs8Ayj2LfvkpyYegT8cm/edit?gid=1132446219#gid=1132446219'
  };
  var OTOMATIS = 'Health index dan daftar gangguan penyulang diperiksa otomatis setiap pagi pukul 06.34 WIT. Kinerja EPM (susut, penggantian meter, P2TL), SAIDI SAIFI dan KPI gangguan penyulang per ULP (sheet GANGGUAN ULP) diperiksa otomatis sebulan sekali, setiap tanggal 10 pukul 07.04 WIT. Data divalidasi lebih dulu; bila ada perubahan, data di dashboard Claude dan web ini diperbarui. Anggaran AI dan AO, Peta Aset dan Transmisi diperbarui saat ada data atau permintaan baru.';
  function jwbTanggal(){
    var ai = need('ai_unit'), ao = need('ao_unit'), ep = need('epm_unit'), P = p2tlModel();
    var f = (document.querySelector('.web-foot') || {}).textContent || '';
    var m = /Data kinerja (?:EPM )?terakhir diperbarui (.+? WIT)/.exec(f);
    var ck = need('capaian_kpi'), sd = ck.find(function(r){ return r.kode_kpi === 'OP01'; }), gk = ck.find(function(r){ return r.kode_kpi === 'OP03'; });
    var contohSb = Array.from(new Set(ck.filter(function(r){ return r.sumber !== 'asli'; }).map(function(r){ return r.sub_bidang; })));
    var sus = ep.find(function(r){ return r.kode_kpi === 'EPM-SUSUT'; }), gm = ep.find(function(r){ return r.kode_kpi === 'EPM-GM'; });
    var X = indeksAset(), dimuat = Array.from(new Set(Array.from(X.U2U.values())));
    var bb = opt('beban_gis'), bper = bb && bb.length ? per(bb[0].periode) : '';
    var M = null; try { M = hiModel(); } catch (e) { if (e === LOADING) throw e; }
    var G = opt('gangguan_penyulang'), gmax = G ? G.reduce(function(a, d){ return d.tanggal > a ? d.tanggal : a; }, '') : '';
    var D = window.__TRS;
    var li = [
      'Anggaran Investasi Distribusi (LKAI 2026): posisi <b>' + tgl((ai[0] || {}).posisi) + '</b>',
      'Anggaran Operasi Distribusi (Monitoring AO): posisi <b>' + tgl((ao[0] || {}).posisi) + '</b>',
      'Kinerja EPM dan Ophardist: ' + (m ? 'diperbarui <b>' + esc(m[1]) + '</b>; ' : '') + (sus ? 'susut s.d. ' + per(sus.periode) : '') + (gm ? ', penggantian meter s.d. ' + per(gm.periode) : '') + (P.last ? ', P2TL s.d. ' + BLN[P.last-1] + ' 2026' : '') + (sd ? ', SAIDI dan SAIFI s.d. ' + per(sd.periode) : '') + (gk ? ', gangguan penyulang permanen dan sementara s.d. ' + per(gk.periode) : ''),
      M && M.last ? 'Health index penyulang: jumlah gangguan s.d. <b>' + BLN[M.last-1] + ' ' + M.th + '</b>' + (M.jalan ? ' (bulan berjalan; status bawaan memakai ' + BLN[M.def-1] + ')' : '') : '',
      gmax ? 'Daftar gangguan penyulang: laporan terakhir <b>' + tgl(gmax) + '</b>' : '',
      'Peta Aset: data GIS UP3 ' + dimuat.join(', ') + ', UP3 lain belum dimuat' + (bper ? '; beban penyulang ' + bper : ''),
      D ? 'Transmisi: anggaran AO dan AI serta kinerja Scadatel dimuat <b>' + tgl(D.dibuat) + '</b>' + (D.scada ? ' (Scadatel s.d. ' + BLN[D.scada.bulan_akhir-1] + ')' : '') : '',
      contohSb.length ? 'Masih data contoh: KPI ' + contohSb.join(' dan ') : ''
    ];
    return jawab({judul:'Tanggal data di dashboard', isi:ul(li) + '<p><b>Pembaruan otomatis.</b> ' + OTOMATIS + '</p>'});
  }
  function jwbSumber(){
    var li = [
      '<b>Anggaran Investasi Distribusi</b>: spreadsheet LKAI 2026 UIW MMU (' + tautan(SRC.ai, 'buka') + '). Dimuat ulang atas permintaan.',
      '<b>Anggaran Operasi Distribusi</b>: Google Sheet Monitoring AO, sheet REKAP DETAIL (pagu Rekomposisi II). Dimuat ulang atas permintaan.',
      '<b>Kinerja EPM</b> (susut, penggantian meter, P2TL): spreadsheet Laporan Kinerja EPM 2026, sheet Susut UP3 MMU, GAMET dan P2TL Maluku (' + tautan(SRC.epm, 'buka') + '). Diperiksa otomatis setiap tanggal 10.',
      '<b>Kinerja Ophardist</b>: SAIDI dan SAIFI dari spreadsheet SAIDI SAIFI 2026, sheet REAL VS TARGET 2026; gangguan penyulang permanen dan sementara dari spreadsheet Gangguan Distribusi APKT, sheet GANGGUAN ULP (' + tautan(SRC.gu, 'buka') + '). Diperiksa otomatis setiap tanggal 10.',
      '<b>Health index dan gangguan penyulang</b>: spreadsheet Gangguan Distribusi APKT, sheet HEALTH INDEX dan sheet bulanan (' + tautan(SRC.hi, 'buka') + '). Diperiksa otomatis setiap pagi.',
      '<b>Peta Aset</b>: data GIS (SHP/GDB) per UP3 dan data beban penyulang dari unit. Dimuat saat file baru dikirim.',
      '<b>Transmisi</b>: MON AO OPGI DAN GP DLL 2026 (' + tautan(SRC.trs_ao, 'buka') + '), Monitoring AI 2026 Fungsi Transmisi MMU (' + tautan(SRC.trs_ai, 'buka') + ') dan KINERJA SCADA UP3B MALUKU 2026 (' + tautan(SRC.trs_scada, 'buka') + '). Dimuat ulang atas permintaan; kinerja Transmisi dan Prosis menunggu file.',
      '<b>Rensisdist</b>: belum ada data asli, masih data contoh.'
    ];
    return jawab({judul:'Sumber data dan cara memperbarui',
      isi:ul(li) + '<p><b>Cara memperbarui.</b> Ubah angka di spreadsheet sumbernya (perlu akses edit dari pemilik spreadsheet; tombol "Update di spreadsheet" di tab Anggaran Investasi dan EPM membuka spreadsheet itu). Untuk health index dan gangguan, perubahan masuk otomatis pada pemeriksaan pagi berikutnya (06.34 WIT); untuk EPM, SAIDI SAIFI dan gangguan penyulang per ULP, pada pemeriksaan bulanan tanggal 10 berikutnya (07.04 WIT). Keduanya setelah lolos validasi. Untuk sumber lain, sampaikan ke pengelola dashboard agar data dimuat ulang. Halaman ini dan Tanya Data tidak dapat mengubah data.</p>'});
  }
  function jwbWarna(){
    var li = [
      'Status KPI: ' + dot('hijau') + 'hijau bila capaian ≥ 100%, ' + dot('kuning') + 'kuning 95% s.d. < 100%, ' + dot('merah') + 'merah < 95%.',
      'KPI yang makin besar makin baik (penggantian meter, P2TL, serapan anggaran): capaian = realisasi ÷ target × 100%.',
      'KPI yang makin kecil makin baik (susut, SAIDI, SAIFI, gangguan penyulang permanen dan sementara): capaian = (2 − realisasi ÷ target) × 100%. Contoh: susut 7% terhadap target 8% memberi capaian 112,5%.',
      'Target penggantian meter dan P2TL s.d. bulan tertentu = target tahunan × bulan ÷ 12. Susut, SAIDI, SAIFI dan gangguan penyulang memakai target kumulatif dari sheet; gangguan permanen dan sementara memakai target yang sama. Capaian tidak dibatasi atas, mengikuti sheet.',
      'Anggaran: % terkontrak = nilai terkontrak ÷ pagu; % terbayar = nilai terbayar ÷ pagu.',
      'Health index penyulang per bulan: ' + hdot('Sempurna') + 'Sempurna 0 gangguan, ' + hdot('Sehat') + 'Sehat 1–3, ' + hdot('Sakit') + 'Sakit 4–9, ' + hdot('Kronis') + 'Kronis ≥ 10.',
      'Peta Aset: warna jaringan per ULP, per penyulang atau per status health index, dipilih dengan tombol warna di atas peta.',
      'Kinerja Scadatel belum diberi warna status karena target kontrak manajemennya belum diterima.'
    ];
    return jawab({judul:'Arti warna dan rumus capaian', isi:ul(li)});
  }
  function jwbTentang(){
    return jawab({judul:'Tentang dashboard ini',
      isi:'<p>Dashboard monitoring Bidang Transmisi dan Distribusi PLN UIW Maluku dan Maluku Utara: anggaran investasi dan operasi Distribusi, Peta Aset (jaringan, gardu, beban dan health index penyulang), kinerja Rensisdist, EPM, Ophardist, serta Transmisi (anggaran Transmisi dan kinerja Scadatel).</p>' +
        ul(['Ada dua versi dengan data yang sama: dashboard di Claude dan web ini (GitHub Pages, dibuka tanpa login). Tab Transmisi, health index penyulang dan Tanya Data hanya ada di versi web.',
            'Pindah halaman lewat menu di kiri; di layar kecil, menu dibuka dengan tombol menu. Setiap tab punya filter unit sendiri.',
            'Tanya Data menjawab dengan mengenali kata kunci dari data yang tampil di halaman ini, tanpa AI. Pertanyaan tidak dikirim ke luar halaman.',
            'Tanggal data ada di kaki halaman; tanyakan "kapan data diperbarui?" untuk rinciannya, atau "sumber data" untuk asal datanya.'])});
  }

  /* ---------- F. Kinerja sub bidang (Ophardist, Rensisdist) ---------- */
  function jwbSubBidang(sb, t, units, rank, low){
    if (sb === 'Ophardist' && /gangguan/.test(t)) return jwbGangguanKpi(t, units, rank, low);
    if (sb === 'Ophardist') { var bq = cariBulan(t), tq = trenQ(t); if (bq || tq) return jwbOpBulan(t, units, bq, tq, rank, low); }
    var ck = need('capaian_kpi').filter(function(r){ return r.sub_bidang === sb; });
    var asli = ck.filter(function(r){ return r.sumber === 'asli'; });
    if (!asli.length) {
      var nmk = Array.from(new Set(ck.map(function(r){ return r.nama_kpi; })));
      return jawab({judul:'Kinerja ' + sb, isi:'<p>Data kinerja ' + esc(sb) + ' di dashboard masih <b>data contoh</b>, belum data asli, sehingga angkanya belum dapat dipakai. Data asli akan dimuat setelah spreadsheet kinerja ' + esc(sb) + ' diterima.</p>' +
        (nmk.length ? '<p>KPI yang sudah disiapkan tempatnya:</p>' + ul(nmk.map(esc)) : ''),
        tautan:[{label:'Lihat tab ' + sb, params:{hal:sb}}]});
    }
    var kodes = Array.from(new Set(asli.map(function(r){ return r.kode_kpi; })));
    var pilih = kodes.filter(function(k){ var n = (asli.find(function(r){ return r.kode_kpi === k; }) || {}).nama_kpi || ''; return t.indexOf(' ' + n.toLowerCase() + ' ') >= 0; });
    if (pilih.length) kodes = pilih;
    var us = units.filter(function(u){ return UP3.indexOf(u) >= 0 || u === 'UIW'; });
    var dg = function(v, s){ return s === 'kali' ? nf(v) : s && /kali/.test(s) ? nf(v, 3) : nf(v, 2); };
    var isi = '', per0 = '';
    kodes.forEach(function(k){
      var rs = asli.filter(function(r){ return r.kode_kpi === k; }), m = rs[0];
      per0 = per(m.periode);
      var nm = '<h4 class="tq-h">' + esc(m.nama_kpi) + ' (' + esc(m.satuan) + '), kumulatif s.d. ' + per0 + '</h4>';
      if (us.length && !rank) {
        isi += nm + us.map(function(u){ var r = rs.find(function(x){ return x.up3 === u; });
          return r ? '<p>' + dot(r.status) + '<b>' + esc(u) + '</b>: realisasi <b>' + dg(r.realisasi, r.satuan) + '</b> terhadap target ' + dg(r.target, r.satuan) + ', capaian <b>' + pc(r.capaian) + '</b> (' + r.status + ').</p>' : '<p><b>' + esc(u) + '</b>: tidak ada data.</p>'; }).join('');
      } else {
        var worst = /(saidi|saifi) (tertinggi|terbesar|paling (tinggi|besar))/.test(t);
        var s = rs.filter(function(r){ return r.up3 !== 'UIW'; }).sort(function(a, b){ return worst ? b.realisasi - a.realisasi : (low ? a.capaian - b.capaian : b.capaian - a.capaian); });
        var uiw = rs.find(function(r){ return r.up3 === 'UIW'; }), top = s[0];
        isi += nm + '<p>' + (rank ? (worst ? esc(m.nama_kpi) + ' tertinggi: <b>' + esc(top.up3) + '</b> (' + dg(top.realisasi, top.satuan) + ' ' + esc(top.satuan) + ', capaian ' + pc(top.capaian) + ').' : (low ? 'Capaian terendah' : 'Capaian tertinggi') + ': <b>' + esc(top.up3) + '</b> (' + pc(top.capaian) + ').') : (uiw ? 'UIW: realisasi <b>' + dg(uiw.realisasi, uiw.satuan) + '</b> terhadap target ' + dg(uiw.target, uiw.satuan) + ', capaian <b>' + pc(uiw.capaian) + '</b>.' : '')) + '</p>' +
          tabel(['UP3', 'Realisasi', 'Target', 'Capaian'], s.map(function(r){ return {u:r.up3, cells:[dot(r.status) + esc(r.up3), dg(r.realisasi, r.satuan), dg(r.target, r.satuan), pc(r.capaian)]}; }), function(r){ return rank && r.u === top.up3; });
      }
    });
    var lain = ck.some(function(r){ return r.sumber !== 'asli'; });
    return jawab({judul:'Kinerja ' + sb + (per0 ? ', s.d. ' + per0 : ''), isi:isi,
      sumber:(sb === 'Ophardist' ? 'Spreadsheet SAIDI SAIFI 2026 (sheet REAL VS TARGET 2026) dan spreadsheet Gangguan Distribusi APKT (sheet GANGGUAN ULP), nilai kumulatif' : 'Spreadsheet kinerja ' + sb) + '. Capaian = 2 − realisasi ÷ target; hijau ≥ 100%, kuning 95% s.d. < 100%, merah < 95%.' + (lain ? ' KPI ' + sb + ' lainnya masih data contoh.' : '') + (sb === 'Ophardist' ? ' Tambahkan nama bulan (misalnya "SAIDI Ambon September") atau kata "per bulan" untuk melihat nilai per bulan. Untuk gangguan per ULP, tanyakan misalnya "gangguan permanen Masohi per ULP".' : ''),
      tautan:[{label:'Lihat tab ' + sb + (us.length === 1 && us[0] !== 'UIW' ? ' (' + us[0] + ')' : ''), params:{hal:sb, up3_kin:us.length === 1 && us[0] !== 'UIW' ? us[0] : null}}]});
  }
  /* SAIDI dan SAIFI per bulan (capaian_bulanan, kumulatif sejak Januari) */
  function jwbOpBulan(t, units, b, tr, rank, low){
    var cb = need('capaian_bulanan').filter(function(r){ return r.kode_kpi === 'OP01' || r.kode_kpi === 'OP02'; });
    var bln = function(r){ return +String(r.periode).slice(5, 7); };
    var kodes = /saidi/.test(t) && !/saifi/.test(t) ? ['OP01'] : /saifi/.test(t) && !/saidi/.test(t) ? ['OP02'] : ['OP01', 'OP02'];
    var last = cb.reduce(function(m, r){ var q = bln(r); return r.realisasi != null && r.realisasi !== '' && q > m ? q : m; }, 0);
    if (!last) return jawab({judul:'SAIDI dan SAIFI', isi:'<p>Data SAIDI dan SAIFI per bulan belum tersedia.</p>'});
    var cat = '';
    if (b > last) { cat = '<p>Data bulan ' + BLN[b-1] + ' belum ada; data terakhir s.d. ' + BLN[last-1] + '.</p>'; b = last; }
    var us = units.filter(function(u){ return UP3.indexOf(u) >= 0 || u === 'UIW'; });
    var dg = function(v, k){ return v == null || v === '' ? '–' : k === 'OP02' ? nf(v, 3) : nf(v, 2); };
    var src = 'Spreadsheet SAIDI SAIFI 2026, sheet REAL VS TARGET 2026; nilai kumulatif sejak Januari. Capaian = 2 − realisasi ÷ target.';
    var isi = cat, judul = kodes.length === 2 ? 'SAIDI dan SAIFI' : kodes[0] === 'OP01' ? 'SAIDI' : 'SAIFI';
    var link = {label:'Lihat tab Ophardist' + (us.length === 1 && us[0] !== 'UIW' ? ' (' + us[0] + ')' : ''), params:{hal:'Ophardist', up3_kin:us.length === 1 && us[0] !== 'UIW' ? us[0] : null}};
    if (tr) {
      var u = us[0] || 'UIW';
      kodes.forEach(function(k){
        var rs = cb.filter(function(r){ return r.kode_kpi === k && r.up3 === u && bln(r) <= last; }).sort(function(a, x){ return bln(a) - bln(x); });
        if (!rs.length) return;
        isi += '<h4 class="tq-h">' + esc(rs[0].nama_kpi) + ' (' + esc(rs[0].satuan) + '), ' + (u === 'UIW' ? 'UIW' : 'UP3 ' + u) + '</h4>' +
          tabel(['Bulan', 'Realisasi', 'Target', 'Capaian'], rs.map(function(r){ return {b:bln(r), cells:[dot(stat(r.capaian)) + BLN[bln(r)-1].slice(0, 3), dg(r.realisasi, k), dg(r.target, k), pc(r.capaian)]}; }), function(r){ return r.b === b; });
      });
      return jawab({judul:judul + ' per bulan (kumulatif), ' + (u === 'UIW' ? 'UIW' : 'UP3 ' + u) + ' 2026', isi:isi, sumber:src, tautan:[link]});
    }
    kodes.forEach(function(k){
      var rs = cb.filter(function(r){ return r.kode_kpi === k && bln(r) === b; });
      if (!rs.length) return;
      isi += '<h4 class="tq-h">' + esc(rs[0].nama_kpi) + ' (' + esc(rs[0].satuan) + '), kumulatif Januari s.d. ' + BLN[b-1] + ' 2026</h4>';
      if (us.length && !rank) {
        isi += us.map(function(u){ var r = rs.find(function(x){ return x.up3 === u; });
          return r ? '<p>' + dot(stat(r.capaian)) + '<b>' + esc(u) + '</b>: realisasi <b>' + dg(r.realisasi, k) + '</b> terhadap target ' + dg(r.target, k) + ', capaian <b>' + pc(r.capaian) + '</b>.</p>' : '<p><b>' + esc(u) + '</b>: tidak ada data.</p>'; }).join('');
      } else {
        var worst = /(saidi|saifi) (tertinggi|terbesar|paling (tinggi|besar))/.test(t);
        var s = rs.filter(function(r){ return r.up3 !== 'UIW'; }).sort(function(a, x){ return worst ? x.realisasi - a.realisasi : (low ? a.capaian - x.capaian : x.capaian - a.capaian); });
        var uiw = rs.find(function(r){ return r.up3 === 'UIW'; });
        isi += (uiw ? '<p>UIW: realisasi <b>' + dg(uiw.realisasi, k) + '</b> terhadap target ' + dg(uiw.target, k) + ', capaian <b>' + pc(uiw.capaian) + '</b>.</p>' : '') +
          tabel(['UP3', 'Realisasi', 'Target', 'Capaian'], s.map(function(r){ return {u:r.up3, cells:[dot(stat(r.capaian)) + esc(r.up3), dg(r.realisasi, k), dg(r.target, k), pc(r.capaian)]}; }), function(r){ return rank && s[0] && r.u === s[0].up3; });
      }
    });
    return jawab({judul:judul + ', ' + BLN[b-1] + ' 2026', isi:isi, sumber:src, tautan:[link]});
  }

  /* Gangguan penyulang permanen (OP03) dan sementara (OP04): KPI per UP3 dari sheet GANGGUAN ULP (capaian_bulanan),
     rincian per ULP dari gangguan_ulp_bulan (nilai bulanan, tanpa target). Sejak 16 Nov 2026. */
  function jwbGangguanKpi(t, units, rank, low){
    var cb = need('capaian_bulanan').filter(function(r){ return r.kode_kpi === 'OP03' || r.kode_kpi === 'OP04'; });
    var G = need('gangguan_ulp_bulan');
    var bln = function(r){ return +String(r.periode).slice(5, 7); };
    var last = cb.reduce(function(m, r){ var q = bln(r); return q > m ? q : m; }, 0);
    if (!last) return jawab({judul:'Gangguan penyulang', isi:'<p>Data KPI gangguan penyulang belum tersedia.</p>'});
    var SF = {OP03:'Permanen', OP04:'Sementara'};
    var kodes = /permanen/.test(t) && !/sementara/.test(t) ? ['OP03'] : /sementara/.test(t) && !/permanen/.test(t) ? ['OP04'] : ['OP03', 'OP04'];
    var b = cariBulan(t), cat = '';
    if (b > last) { cat = '<p>Data bulan ' + BLN[b-1] + ' belum ada; data terakhir s.d. ' + BLN[last-1] + '.</p>'; b = last; }
    b = b || last;
    var us = units.filter(function(u){ return UP3.indexOf(u) >= 0 || u === 'UIW'; });
    var jml = function(f){ return sum(G.filter(f), function(d){ return d.jumlah; }); };
    var src = 'Sheet GANGGUAN ULP, spreadsheet Gangguan Distribusi APKT. Permanen dan sementara adalah dua KPI terpisah dengan target yang sama di sheet; realisasi kumulatif sejak Januari, capaian = 2 − realisasi ÷ target. Target hanya per UP3, UIW = jumlah ketujuh UP3, ULP tanpa target.';
    var link = function(u, k){ return {label:'Lihat tab Ophardist' + (u && u !== 'UIW' ? ' (' + u + ')' : ''), params:{hal:'Ophardist', up3_kin:u && u !== 'UIW' ? u : null, kpi:k}}; };
    // ULP yang disebut (nama ULP yang sama dengan nama UP3 harus diawali "ULP")
    var uh = null, seen = {};
    G.forEach(function(d){
      var kk = d.up3 + '|' + d.ulp; if (seen[kk]) return; seen[kk] = 1;
      var l = norm(d.ulp).trim();
      var ok = UP3.some(function(p){ return p.toLowerCase() === l; }) ? t.indexOf(' ulp ' + l + ' ') >= 0 : t.indexOf(' ' + l + ' ') >= 0;
      if (ok && (!uh || l.length > norm(uh.ulp).trim().length)) uh = {up3:d.up3, ulp:d.ulp};
    });
    if (uh) {
      var isiU = cat + '<p>ULP ' + esc(uh.ulp) + ' (UP3 ' + esc(uh.up3) + '), Januari s.d. ' + BLN[b-1] + ' 2026: ' + kodes.map(function(k){
        var n = jml(function(d){ return d.up3 === uh.up3 && d.ulp === uh.ulp && d.sifat === SF[k] && bln(d) <= b; });
        var tot = jml(function(d){ return d.up3 === uh.up3 && d.sifat === SF[k] && bln(d) <= b; });
        return 'gangguan ' + SF[k].toLowerCase() + ' <b>' + nf(n) + ' kali</b> (' + pc(tot ? n / tot * 100 : null) + ' dari UP3 ' + esc(uh.up3) + ')'; }).join(', ') +
        '. Target hanya ada per UP3, jadi ULP tidak punya capaian.</p>';
      var rsU = [];
      for (var q = 1; q <= last; q++) (function(q){ rsU.push({b:q, cells:[BLN[q-1].slice(0, 3)].concat(kodes.map(function(k){
        return nf(jml(function(d){ return d.up3 === uh.up3 && d.ulp === uh.ulp && d.sifat === SF[k] && bln(d) === q; })); }))}); })(q);
      isiU += '<h4 class="tq-h">Gangguan per bulan (bukan kumulatif)</h4>' + tabel(['Bulan'].concat(kodes.map(function(k){ return SF[k]; })), rsU, function(r){ return r.b === b; });
      return jawab({judul:'Gangguan penyulang ULP ' + uh.ulp + ', 2026', isi:isiU,
        sumber:src + ' Untuk penyebab dan daftar laporannya, tanyakan "penyebab gangguan ULP ' + uh.ulp + '".',
        tautan:[link(uh.up3, kodes[0]), hiLink(uh.up3, uh.ulp, null)]});
    }
    if (/(\sulp\s|per ulp|tiap ulp|setiap ulp)/.test(t)) {
      var up = us.filter(function(u){ return u !== 'UIW'; })[0] || null, isiL = cat;
      var sedikit = /(tersedikit|paling sedikit|terendah|terkecil)/.test(t);
      kodes.forEach(function(k){
        var agg = {};
        G.forEach(function(d){ if (d.sifat === SF[k] && bln(d) <= b && (!up || d.up3 === up)) { var kk = d.up3 + '|' + d.ulp; agg[kk] = (agg[kk] || 0) + d.jumlah; } });
        var ks = Object.keys(agg).sort(function(a, c){ return sedikit ? agg[a] - agg[c] : agg[c] - agg[a]; });
        var tot = sum(ks, function(kk){ return agg[kk]; }), top = up ? ks : ks.slice(0, 10);
        isiL += '<h4 class="tq-h">Gangguan ' + SF[k].toLowerCase() + ' per ULP, Januari s.d. ' + BLN[b-1] + ' 2026' + (up ? ', UP3 ' + esc(up) : sedikit ? ', sepuluh paling sedikit' : ', sepuluh terbanyak') + '</h4>' +
          tabel(['ULP', 'Gangguan', 'Porsi'], top.map(function(kk){ var p = kk.split('|'); return {cells:[esc(p[1]) + (up ? '' : '<small>UP3 ' + esc(p[0]) + '</small>'), nf(agg[kk]), pc(tot ? agg[kk] / tot * 100 : null)]}; }), null, true);
      });
      return jawab({judul:'Gangguan penyulang per ULP, ' + (up ? 'UP3 ' + up : 'UIW'), isi:isiL + '<p>Target hanya ada per UP3, jadi ULP ditampilkan tanpa capaian. Porsi = bagian dari ' + (up ? 'UP3 ' + esc(up) : 'UIW') + '.</p>',
        sumber:src, tautan:[link(up, kodes[0])]});
    }
    if (trenQ(t)) {
      var u = us[0] || 'UIW', isiT = cat;
      kodes.forEach(function(k){
        var rs = cb.filter(function(r){ return r.kode_kpi === k && r.up3 === u; }).sort(function(a, x){ return bln(a) - bln(x); });
        if (!rs.length) return;
        isiT += '<h4 class="tq-h">' + esc(rs[0].nama_kpi) + ', ' + (u === 'UIW' ? 'UIW' : 'UP3 ' + esc(u)) + ' (kumulatif)</h4>' +
          tabel(['Bulan', 'Realisasi', 'Target', 'Capaian'], rs.map(function(r){ return {b:bln(r), cells:[dot(stat(r.capaian)) + BLN[bln(r)-1].slice(0, 3), nf(r.realisasi), nf(r.target), pc(r.capaian)]}; }), function(r){ return r.b === b; });
      });
      return jawab({judul:'Gangguan penyulang per bulan, ' + (u === 'UIW' ? 'UIW' : 'UP3 ' + u) + ' 2026', isi:isiT, sumber:src, tautan:[link(u, kodes[0])]});
    }
    var isi = cat;
    kodes.forEach(function(k){
      var rs = cb.filter(function(r){ return r.kode_kpi === k && bln(r) === b; });
      if (!rs.length) return;
      isi += '<h4 class="tq-h">' + esc(rs[0].nama_kpi) + ' (kali), kumulatif Januari s.d. ' + BLN[b-1] + ' 2026</h4>';
      if (us.length && !rank) {
        isi += us.map(function(u){
          var r = rs.find(function(x){ return x.up3 === u; });
          if (!r) return '<p><b>' + esc(u) + '</b>: tidak ada data.</p>';
          var tops = '';
          if (u !== 'UIW') {
            var agg = {}; G.forEach(function(d){ if (d.up3 === u && d.sifat === SF[k] && bln(d) <= b) agg[d.ulp] = (agg[d.ulp] || 0) + d.jumlah; });
            tops = ' ULP terbanyak: ' + Object.keys(agg).sort(function(a, c){ return agg[c] - agg[a]; }).slice(0, 3).map(function(x){ return esc(x) + ' ' + nf(agg[x]); }).join(', ') + '.';
          }
          return '<p>' + dot(stat(r.capaian)) + '<b>' + esc(u) + '</b>: realisasi <b>' + nf(r.realisasi) + ' kali</b> terhadap target ' + nf(r.target) + ', capaian <b>' + pc(r.capaian) + '</b>.' + tops + '</p>';
        }).join('');
      } else {
        var banyak = /(terbanyak|paling (banyak|sering))/.test(t), sedikit2 = /(tersedikit|paling sedikit)/.test(t);
        var s = rs.filter(function(r){ return r.up3 !== 'UIW'; }).sort(function(a, x){ return banyak ? x.realisasi - a.realisasi : sedikit2 ? a.realisasi - x.realisasi : (low ? a.capaian - x.capaian : x.capaian - a.capaian); });
        var uiw = rs.find(function(r){ return r.up3 === 'UIW'; });
        isi += (uiw ? '<p>UIW: realisasi <b>' + nf(uiw.realisasi) + ' kali</b> terhadap target ' + nf(uiw.target) + ', capaian <b>' + pc(uiw.capaian) + '</b>.</p>' : '') +
          tabel(['UP3', 'Realisasi', 'Target', 'Capaian'], s.map(function(r){ return {u:r.up3, cells:[dot(stat(r.capaian)) + esc(r.up3), nf(r.realisasi), nf(r.target), pc(r.capaian)]}; }), function(r){ return rank && s[0] && r.u === s[0].up3; });
      }
      // lonjakan bulan itu dibanding rata-rata bulan sebelumnya
      var sk = us.length === 1 ? us[0] : 'UIW', v = [];
      for (var q2 = 1; q2 <= b; q2++) (function(q2){ v.push(jml(function(d){ return d.sifat === SF[k] && bln(d) === q2 && (sk === 'UIW' || d.up3 === sk); })); })(q2);
      if (v.length >= 4) {
        var a = v[v.length-1], r0 = sum(v.slice(0, -1), function(x){ return x; }) / (v.length - 1);
        if (a >= 2 * Math.max(r0, 1) && a - r0 >= 15) isi += '<p>Catatan: gangguan ' + SF[k].toLowerCase() + ' ' + (sk === 'UIW' ? 'UIW' : 'UP3 ' + esc(sk)) + ' pada ' + BLN[b-1] + ' melonjak menjadi ' + nf(a) + ' kali (rata-rata bulan sebelumnya ' + nf(r0, 1) + ').</p>';
      }
    });
    return jawab({judul:'Gangguan penyulang' + (kodes.length === 1 ? ' ' + SF[kodes[0]].toLowerCase() : '') + ', ' + BLN[b-1] + ' 2026',
      isi:isi + '<p>Untuk rincian per ULP, tanyakan misalnya "gangguan permanen Masohi per ULP" atau sebut nama ULP-nya.</p>',
      sumber:src, tautan:[link(us.length === 1 ? us[0] : null, kodes[0])]});
  }

  /* ---------- G. Health index dan gangguan penyulang (Peta Aset web) ---------- */
  var HIC = {Sempurna:'#1B8A3A', Sehat:'#7DC243', Sakit:'#F59E0B', Kronis:'#DC2626'};
  function hiStat(n){ return n == null ? null : n === 0 ? 'Sempurna' : n <= 3 ? 'Sehat' : n <= 9 ? 'Sakit' : 'Kronis'; }
  function hdot(s){ return '<i class="tq-dot" style="background:' + (HIC[s] || '#9AA7B3') + '" title="' + (s || 'tanpa data') + '"></i>'; }
  var HM = null;
  function hiModel(){
    var d = need('health_index');
    if (HM && HM.src === d) return HM;
    var rows = d.map(function(r){
      var v = []; for (var m = 1; m <= 12; m++) { var x = r['b' + pad(m)]; v.push(x === '' || x == null ? null : +x); }
      return {up3:r.up3, ulp:r.ulp, sheet:r.penyulang, nama:r.peta_penyulang || judulN(r.penyulang), peta:!!r.peta_penyulang, pu:r.peta_ulp || r.ulp, v:v, th:+r.tahun || null};
    });
    var aktif = rows.filter(function(x){ return x.v.some(function(n){ return n != null; }); });
    var last = 0; for (var q = 1; q <= 12; q++) if (aktif.length && aktif.every(function(x){ return x.v[q-1] != null; })) last = q;
    var th = rows.length ? rows[0].th : null, now = new Date(Date.now() + 9 * 3600e3); // WIT, sama dengan panel health index
    var jalan = th === now.getUTCFullYear() && last === now.getUTCMonth() + 1;
    var ulps = {}; rows.forEach(function(x){ ulps[norm(x.ulp).trim()] = 1; ulps[norm(x.pu).trim()] = 1; });
    HM = {src:d, rows:rows, last:last, jalan:jalan, th:th, def:jalan && last > 1 ? last - 1 : last, ulps:ulps};
    return HM;
  }
  function cariUlpHI(t, M){
    var hit = null;
    M.rows.forEach(function(x){
      [x.ulp, x.pu].forEach(function(u){
        var l = norm(u).trim(); if (!l) return;
        var ok = UP3.some(function(p){ return p.toLowerCase() === l; }) ? t.indexOf(' ulp ' + l + ' ') >= 0 : t.indexOf(' ' + l + ' ') >= 0;
        if (ok && (!hit || l.length > hit.l)) hit = {ulp:x.ulp, up3:x.up3, l:l.length};
      });
    });
    if (!hit) return null;
    var pp = M.rows.find(function(x){ return x.up3 === hit.up3 && x.ulp === hit.ulp && x.peta; });
    hit.peta = pp ? pp.pu : null;
    return hit;
  }
  function cariPylHI(t, M, uh, up){
    var best = null;
    M.rows.forEach(function(x){
      [x.sheet, x.nama].forEach(function(n){
        var l = norm(n).trim(); if (!l) return;
        var vs = [l, l.replace(/([a-z])(\d)/g, '$1 $2'), l.replace(/\s+/g, '')];
        // nama pendek, nama yang sama dengan ULP/UP3 atau bulan hanya dipakai bila didahului kata "penyulang"
        var umum = l.replace(/\s/g, '').length < 5 || M.ulps[l] || UP3.some(function(p){ return p.toLowerCase() === l; }) || BLNK.some(function(a){ return a.indexOf(l) >= 0; });
        var hit = vs.some(function(v){ return umum ? (t.indexOf(' penyulang ' + v + ' ') >= 0 || t.indexOf(' feeder ' + v + ' ') >= 0) : t.indexOf(' ' + v + ' ') >= 0; });
        if (!hit) return;
        var sc = l.length * 10 + (uh && x.ulp === uh.ulp ? 5 : 0) + (up && x.up3 === up ? 3 : 0) + (x.v.some(function(v){ return v != null; }) ? 1 : 0);
        if (!best || sc > best.s) best = {x:x, s:sc, l:vs.find(function(v){ return t.indexOf(' ' + v + ' ') >= 0; }) || l};
      });
    });
    return best;
  }
  function hiLink(up3, ulp, x, label){
    return {label:label || 'Lihat di Peta Aset (health index)', params:{hal:'aset', up3_aset:up3 || null, ulp_aset:ulp || null, pyl_aset:null, _hi:true, _hiPyl:x && x.peta ? x.nama : null, _hiUlp:x ? x.pu : null}};
  }
  function jwbHIPyl(x, M, b){
    var m = b && b <= M.last ? b : M.def, n = x.v[m-1], st = hiStat(n), q;
    var tot = 0, ada = false; for (q = 0; q < M.last; q++) if (x.v[q] != null) { tot += x.v[q]; ada = true; }
    var ber = 0; for (q = m; q >= 1; q--) { var s2 = hiStat(x.v[q-1]); if (s2 === 'Sakit' || s2 === 'Kronis') ber++; else break; }
    var jl = M.jalan && m === M.last ? ' (bulan berjalan)' : '';
    var isi = (b > M.last ? '<p>Data bulan ' + BLN[b-1] + ' belum ada; ditampilkan ' + BLN[m-1] + '.</p>' : '') +
      '<p>' + hdot(st) + 'Penyulang <b>' + esc(x.nama) + '</b> (ULP ' + esc(x.ulp) + ', UP3 ' + esc(x.up3) + '): ' +
      (n == null ? 'belum ada angka untuk ' + BLN[m-1] : '<b>' + n + ' gangguan</b> pada ' + BLN[m-1] + jl + ', status <b>' + st + '</b>') + '. ' +
      (ada ? 'Total ' + nf(tot) + ' gangguan Januari s.d. ' + BLN[M.last-1] + '.' : '') + (ber >= 2 ? ' Sudah ' + ber + ' bulan beruntun sakit atau kronis.' : '') + (x.peta ? '' : ' Penyulang ini belum ada di peta.') + '</p>';
    var ser = []; for (q = 1; q <= M.last; q++) ser.push('<span>' + hdot(hiStat(x.v[q-1])) + BS[q-1] + ' <b>' + (x.v[q-1] == null ? '–' : x.v[q-1]) + '</b></span>');
    isi += '<p class="tq-sers">' + ser.join('') + '</p>';
    var G = opt('gangguan_penyulang'), src2 = '';
    if (G) {
      var kk = key(x.up3) + '|' + key(x.ulp) + '|' + key(x.sheet);
      var inc = G.filter(function(d){ return key(d.up3) + '|' + key(d.ulp) + '|' + key(d.penyulang) === kk; });
      if (inc.length) {
        var sc = {}; inc.forEach(function(d){ sc[d.penyebab] = (sc[d.penyebab] || 0) + 1; });
        var top = Object.keys(sc).sort(function(a, c){ return sc[c] - sc[a]; }).slice(0, 4);
        var ur = inc.slice().sort(function(a, c){ return (c.tanggal || '').localeCompare(a.tanggal || '') || (c.no_laporan || '').localeCompare(a.no_laporan || ''); }).slice(0, 5);
        isi += '<p>Penyebab terbanyak tahun ini: ' + top.map(function(k){ return esc(k) + ' (' + sc[k] + ')'; }).join(', ') + '.</p>' +
          '<h4 class="tq-h">Lima gangguan terakhir</h4>' + tabel(['Tanggal', 'Penyebab', 'Durasi', 'Sifat'], ur.map(function(d){ return {cells:[tglPendek(d.tanggal), esc(d.penyebab), d.durasi_menit !== '' && d.durasi_menit != null ? nf(+d.durasi_menit, 0) + ' mnt' : '–', esc(d.sifat || '–')]}; }), null, false, [1, 3]);
        src2 = ' Penyebab dan daftar gangguan dari sheet bulanan (kolom CAUSE), dihitung per nomor laporan.';
      } else isi += '<p>Belum ada rincian penyebab untuk penyulang ini di sheet bulanan.</p>';
    }
    return jawab({judul:'Health index penyulang ' + x.nama, isi:isi,
      sumber:'Sheet HEALTH INDEX, spreadsheet Gangguan Distribusi APKT. Status per bulan: 0 Sempurna, 1–3 Sehat, 4–9 Sakit, ≥ 10 Kronis.' + src2,
      tautan:[hiLink(x.up3, x.peta ? x.pu : null, x, 'Lihat penyulang ini di Peta Aset')]});
  }
  function jwbHI(t, units, rank, low){
    var M = hiModel();
    if (!M.last) return jawab({judul:'Health index penyulang', isi:'<p>Data health index belum tersedia.</p>'});
    var uh = cariUlpHI(t, M), up = uh ? uh.up3 : (units.filter(function(u){ return UP3.indexOf(u) >= 0; })[0] || null);
    var ph = cariPylHI(t, M, uh, up);
    var b = cariBulan(ph ? t.replace(' ' + ph.l + ' ', ' ') : t);
    if (ph) return jwbHIPyl(ph.x, M, b);
    var m = b && b <= M.last ? b : M.def, cat = b > M.last ? '<p>Data bulan ' + BLN[b-1] + ' belum ada; ditampilkan ' + BLN[m-1] + '.</p>' : '';
    var rows = M.rows.filter(function(x){ return (!up || x.up3 === up) && (!uh || x.ulp === uh.ulp); });
    var lingkup = uh ? 'ULP ' + uh.ulp : up ? 'UP3 ' + up : 'UIW MMU', per0 = BLN[m-1] + ' ' + M.th;
    var jl = M.jalan && m === M.last ? ' (bulan berjalan, jumlah gangguan masih bertambah)' : '';
    var src = 'Sheet HEALTH INDEX, spreadsheet Gangguan Distribusi APKT: jumlah gangguan per penyulang per bulan. Status: 0 Sempurna, 1–3 Sehat, 4–9 Sakit, ≥ 10 Kronis.' + (b ? '' : ' Bulan bawaan = bulan lengkap terakhir; sebut nama bulan untuk bulan lain.');
    var link = hiLink(up, uh ? uh.peta : null, null);
    var want = [];
    if (/\skronis\s/.test(t)) want.push('Kronis');
    if (/\ssakit\s/.test(t)) want.push('Sakit');
    if (/\ssehat\s/.test(t)) want.push('Sehat');
    if (/\ssempurna\s/.test(t)) want.push('Sempurna');
    if (!want.length && /(perhatian|bermasalah|buruk|rawan|kritis)/.test(t)) want = ['Kronis', 'Sakit'];
    var beruntun = function(x){ var c = 0; for (var j = m; j >= 1; j--) { var s = hiStat(x.v[j-1]); if (s === 'Sakit' || s === 'Kronis') c++; else break; } return c; };
    var ytd = function(x){ var s = 0; for (var q = 0; q < m; q++) s += x.v[q] || 0; return s; };
    var lokasi = function(x){ return up ? 'ULP ' + x.ulp : x.up3 + ' · ULP ' + x.ulp; };
    if (want.length) {
      var ls = rows.filter(function(x){ return want.indexOf(hiStat(x.v[m-1])) >= 0; }).sort(function(a, c){ return c.v[m-1] - a.v[m-1] || a.nama.localeCompare(c.nama, 'id'); });
      var lim = 12, buruk = want.indexOf('Sakit') >= 0 || want.indexOf('Kronis') >= 0;
      return jawab({judul:'Penyulang ' + want.join(' dan ').toLowerCase() + ', ' + lingkup + ', ' + per0,
        isi:cat + '<p><b>' + ls.length + ' penyulang</b> berstatus ' + want.join(' atau ').toLowerCase() + ' pada ' + per0 + jl + ', dari ' + rows.length + ' penyulang di ' + lingkup + '.</p>' +
          (ls.length ? tabel(['Penyulang', 'Gangguan'].concat(buruk ? ['Beruntun'] : []), ls.slice(0, lim).map(function(x){ var br = beruntun(x); return {cells:[hdot(hiStat(x.v[m-1])) + esc(x.nama) + '<small>' + esc(lokasi(x)) + '</small>', nf(x.v[m-1])].concat(buruk ? [br >= 2 ? br + ' bln' : '–'] : [])}; }), null, true) : '') +
          (ls.length > lim ? '<p>Ditampilkan ' + lim + ' dari ' + ls.length + ' penyulang; daftar lengkap ada di panel health index Peta Aset.</p>' : '') +
          (buruk && ls.length ? '<p>Beruntun = jumlah bulan berturut-turut sampai ' + BLN[m-1] + ' dengan status sakit atau kronis.</p>' : ''),
        sumber:src, tautan:[link]});
    }
    if (rank) {
      var tp = rows.filter(function(x){ return x.v[m-1] != null; }).sort(function(a, c){ return low ? a.v[m-1] - c.v[m-1] : (c.v[m-1] - a.v[m-1] || ytd(c) - ytd(a)); }).slice(0, 10);
      return jawab({judul:'Penyulang dengan gangguan ' + (low ? 'paling sedikit' : 'terbanyak') + ', ' + lingkup + ', ' + per0,
        isi:cat + tabel(['Penyulang', BS[m-1], 'Jan s.d. ' + BS[m-1]], tp.map(function(x){ return {cells:[hdot(hiStat(x.v[m-1])) + esc(x.nama) + '<small>' + esc(lokasi(x)) + '</small>', nf(x.v[m-1]), nf(ytd(x))]}; }), null, true) + (jl ? '<p>' + BLN[m-1] + jl + '.</p>' : ''),
        sumber:src, tautan:[link]});
    }
    var cnt = function(rs, q){ var c = {}; rs.forEach(function(x){ var s = hiStat(x.v[q-1]) || 'Tanpa data'; c[s] = (c[s] || 0) + 1; }); return c; };
    var c = cnt(rows, m), ST4 = ['Sempurna', 'Sehat', 'Sakit', 'Kronis'];
    var isi = cat + '<p>' + rows.length + ' penyulang di ' + lingkup + ', status ' + per0 + jl + ':</p><p>' +
      ST4.map(function(s){ return hdot(s) + s + ' <b>' + (c[s] || 0) + '</b>'; }).join(' · ') + (c['Tanpa data'] ? ' · ' + hdot(null) + 'tanpa data ' + c['Tanpa data'] : '') + '</p>';
    if (m > 1) {
      var cp = cnt(rows, m - 1), nb = (c.Sakit || 0) + (c.Kronis || 0), pb = (cp.Sakit || 0) + (cp.Kronis || 0);
      isi += '<p>Sakit dan kronis: <b>' + nb + ' penyulang</b>, ' + (nb > pb ? 'naik ' + (nb - pb) + ' dibanding ' : nb < pb ? 'turun ' + (pb - nb) + ' dibanding ' : 'sama dengan ') + BLN[m-2] + ' (' + pb + ').</p>';
    }
    if (!uh) {
      var gk = function(x){ return up ? x.ulp : x.up3; }, grp = {};
      rows.forEach(function(x){ (grp[gk(x)] = grp[gk(x)] || []).push(x); });
      isi += tabel([up ? 'ULP' : 'UP3', 'Kronis', 'Sakit', 'Sehat', 'Sempurna'], Object.keys(grp).sort(function(a, z){ return a.localeCompare(z, 'id'); }).map(function(k){
        var cc = cnt(grp[k], m); return {cells:[esc(k), nf(cc.Kronis || 0), nf(cc.Sakit || 0), nf(cc.Sehat || 0), nf(cc.Sempurna || 0)]}; }));
    }
    var tp2 = rows.filter(function(x){ return x.v[m-1] > 0; }).sort(function(a, z){ return z.v[m-1] - a.v[m-1]; }).slice(0, 3);
    if (tp2.length) isi += '<p>Gangguan terbanyak: ' + tp2.map(function(x){ return '<b>' + esc(x.nama) + '</b> (' + x.v[m-1] + ')'; }).join(', ') + '. Tanyakan "penyulang kronis" atau nama penyulangnya untuk rincian.</p>';
    return jawab({judul:'Health index penyulang ' + lingkup + ', ' + per0, isi:isi, sumber:src, tautan:[link]});
  }
  var GRUP = ['Pohon', 'Benda Asing', 'Binatang', 'Layangan / Kawat', 'Lainnya', 'Dalam investigasi'];
  function grupSebab(c){ return c === 'Dalam Investigasi' ? 'Dalam investigasi' : GRUP.indexOf(c) >= 0 ? c : 'Lainnya'; }
  function durasi(d){ return d.durasi_menit !== '' && d.durasi_menit != null && !isNaN(+d.durasi_menit) ? nf(+d.durasi_menit, 0) + ' mnt' : '–'; }
  function jwbGangguan(t, units){
    var M = hiModel(), G = need('gangguan_penyulang');
    var uh = cariUlpHI(t, M), up = uh ? uh.up3 : (units.filter(function(u){ return UP3.indexOf(u) >= 0; })[0] || null);
    var ph = cariPylHI(t, M, uh, up);
    var b = cariBulan(ph ? t.replace(' ' + ph.l + ' ', ' ') : t);
    if (ph) return jwbHIPyl(ph.x, M, b);
    var gmax = G.reduce(function(a, d){ return d.tanggal > a ? d.tanggal : a; }, '');
    var rows = G.filter(function(d){ return (!up || d.up3 === up) && (!uh || key(d.ulp) === key(uh.ulp)) && (!b || +d.bulan === b); });
    var lingkup = uh ? 'ULP ' + uh.ulp : up ? 'UP3 ' + up : 'UIW MMU';
    var periode = b ? BLN[b-1] + ' 2026' + (+gmax.slice(5, 7) === b ? ' (s.d. ' + tgl(gmax) + ')' : '') : 'Januari s.d. ' + tgl(gmax);
    var src = 'Sheet bulanan spreadsheet Gangguan Distribusi APKT (kolom CAUSE), dihitung per nomor laporan; laporan terakhir ' + tgl(gmax) + '. Jumlahnya bisa sedikit berbeda dari sheet HEALTH INDEX.';
    var link = hiLink(up, uh ? uh.peta : null, null);
    if (!rows.length) return jawab({judul:'Gangguan penyulang ' + lingkup, isi:'<p>Tidak ada laporan gangguan penyulang untuk ' + esc(lingkup) + ' pada ' + periode + '.</p>', sumber:src, tautan:[link]});
    var n = rows.length, perm = rows.filter(function(d){ return d.sifat === 'Permanen'; }).length, sem = rows.filter(function(d){ return d.sifat === 'Sementara'; }).length;
    var durs = rows.map(function(d){ return d.durasi_menit === '' || d.durasi_menit == null ? NaN : +d.durasi_menit; }).filter(function(v){ return !isNaN(v); });
    var avg = durs.length ? sum(durs, function(v){ return v; }) / durs.length : null;
    var isi = '<p><b>' + nf(n) + ' gangguan</b> penyulang di ' + lingkup + ', ' + periode + ': permanen ' + nf(perm) + ', sementara ' + nf(sem) + (avg != null ? '; rata-rata durasi ' + nf(avg, 0) + ' menit' : '') + '.</p>';
    var urutTgl = function(a, c){ return (c.tanggal || '').localeCompare(a.tanggal || '') || (c.no_laporan || '').localeCompare(a.no_laporan || ''); };
    var nmP = function(d){ return esc(judulN(d.penyulang)) + '<small>' + esc((up ? '' : d.up3 + ' · ') + 'ULP ' + d.ulp) + '</small>'; };
    if (/(terakhir|terbaru|baru saja|hari ini|kemarin)/.test(t)) {
      isi += '<h4 class="tq-h">Gangguan terakhir</h4>' + tabel(['Penyulang', 'Tanggal', 'Penyebab', 'Durasi'], rows.slice().sort(urutTgl).slice(0, 8).map(function(d){ return {cells:[nmP(d), tglPendek(d.tanggal), esc(d.penyebab), durasi(d)]}; }), null, true, [2]);
    } else if (/(durasi|terlama|paling lama|lama padam)/.test(t)) {
      isi += '<h4 class="tq-h">Gangguan dengan durasi terlama</h4>' + tabel(['Penyulang', 'Tanggal', 'Penyebab', 'Durasi'], rows.filter(function(d){ return !isNaN(+d.durasi_menit) && d.durasi_menit !== ''; }).sort(function(a, c){ return +c.durasi_menit - +a.durasi_menit; }).slice(0, 5).map(function(d){ return {cells:[nmP(d), tglPendek(d.tanggal), esc(d.penyebab), durasi(d)]}; }), null, true, [2]);
    } else {
      var gs = {}, lain = {};
      rows.forEach(function(d){ var g = grupSebab(d.penyebab); gs[g] = (gs[g] || 0) + 1; if (g === 'Lainnya') lain[d.penyebab] = (lain[d.penyebab] || 0) + 1; });
      var sg = GRUP.filter(function(g){ return gs[g]; }).sort(function(a, c){ return gs[c] - gs[a]; });
      var tk = sg.filter(function(g){ return g !== 'Dalam investigasi' && g !== 'Lainnya'; })[0];
      isi += (tk ? '<p>Penyebab terbanyak yang sudah diketahui: <b>' + tk + '</b> (' + nf(gs[tk]) + ' gangguan, ' + pc(gs[tk] / n * 100) + ').' + (gs['Dalam investigasi'] ? ' ' + nf(gs['Dalam investigasi']) + ' gangguan masih dalam investigasi.' : '') + '</p>' : '') +
        tabel(['Penyebab', 'Gangguan', 'Porsi'], sg.map(function(g){ return {cells:[esc(g) + (g === 'Lainnya' ? '<small>' + esc(Object.keys(lain).sort(function(a, c){ return lain[c] - lain[a]; }).slice(0, 3).join(', ')) + '</small>' : ''), nf(gs[g]), pc(gs[g] / n * 100)]}; }), null, true);
      var pp = {}; rows.forEach(function(d){ var k = d.up3 + '|' + d.ulp + '|' + d.penyulang; pp[k] = (pp[k] || 0) + 1; });
      var tp = Object.keys(pp).sort(function(a, c){ return pp[c] - pp[a]; }).slice(0, 3);
      isi += '<p>Penyulang paling sering terganggu: ' + tp.map(function(k){ var p = k.split('|'); return '<b>' + esc(judulN(p[2])) + '</b> (' + esc((up ? '' : p[0] + ', ') + 'ULP ' + p[1]) + ', ' + pp[k] + ')'; }).join('; ') + '.</p>';
      if (!up && !uh) {
        var by = {}; rows.forEach(function(d){ (by[d.up3] = by[d.up3] || []).push(d); });
        isi += tabel(['UP3', 'Gangguan', 'Permanen', 'Penyebab utama'], UP3.filter(function(u){ return by[u]; }).map(function(u){
          var r = by[u], c = {}; r.forEach(function(d){ var g = grupSebab(d.penyebab); if (g !== 'Dalam investigasi') c[g] = (c[g] || 0) + 1; });
          var tg = Object.keys(c).sort(function(a, z){ return c[z] - c[a]; })[0];
          return {cells:[esc(u), nf(r.length), nf(r.filter(function(d){ return d.sifat === 'Permanen'; }).length), esc(tg || '–')]}; }), null, false, [3]);
      }
    }
    return jawab({judul:'Gangguan penyulang ' + lingkup + ', ' + periode, isi:isi, sumber:src, tautan:[link]});
  }

  /* ---------- H. Ringkasan dan hal yang perlu perhatian ---------- */
  function jwbPerhatian(t, units){
    var u = units.length === 1 ? units[0] : null, isUp3 = !!u && UP3.indexOf(u) >= 0, isi = '', taut = [];
    var nmU = !u ? 'seluruh unit' : u === 'UIW' ? 'UIW' : u === 'UP3B' ? 'UP3B Maluku' : u === 'UP2K' ? 'UP2K Maluku' : 'UP3 ' + u;
    if (!u || isUp3 || u === 'UIW') {
      var k = [];
      need('epm_unit').forEach(function(r){ if ((!u || r.up3 === u) && (r.status === 'merah' || r.status === 'kuning')) k.push({st:r.status, up3:r.up3, nm:r.nama_kpi, cap:r.capaian, p:per(r.periode)}); });
      need('capaian_kpi').forEach(function(r){ if (r.sumber === 'asli' && r.sub_bidang !== 'EPM' && (!u || r.up3 === u) && (r.status === 'merah' || r.status === 'kuning')) k.push({st:r.status, up3:r.up3, nm:r.nama_kpi, cap:r.capaian, p:per(r.periode)}); });
      var P = p2tlModel();
      if (P.last) UP3.concat(['UIW']).forEach(function(x){ if (u && x !== u) return; var o = x === 'UIW' ? P.U : P.by.get(x); if (!o) return;
        var r = p2tlSd(o, P.last), s = stat(r.cap); if (s === 'merah' || s === 'kuning') k.push({st:s, up3:x, nm:'P2TL', cap:r.cap, p:BLN[P.last-1] + ' 2026'}); });
      var seen = {}; k = k.filter(function(x){ var kk = x.nm + '|' + x.up3; if (seen[kk]) return false; seen[kk] = 1; return true; });
      k.sort(function(a, b){ return (a.st === 'merah' ? 0 : 1) - (b.st === 'merah' ? 0 : 1) || a.cap - b.cap; });
      isi += '<h4 class="tq-h">KPI di bawah target (data asli)</h4>' + (k.length ? ul(k.map(function(x){ return dot(x.st) + '<b>' + esc(x.nm) + '</b> ' + esc(x.up3) + ': capaian ' + pc(x.cap) + ' (s.d. ' + x.p + ')'; }))
        : '<p>Semua KPI dengan data asli (susut, penggantian meter, P2TL, SAIDI, SAIFI, gangguan penyulang) berstatus hijau' + (u ? ' untuk ' + esc(nmU) : '') + '.</p>');
      taut.push({label:'EPM', params:{hal:'EPM', up3_epm:isUp3 ? u : null}});
    }
    var aiAll = need('ai_unit').filter(function(r){ return r.jenis === 'Semua'; });
    var ai = aiAll.find(function(r){ return r.unit === (u ? (AIU[u] || u) : 'Semua'); });
    if (ai) {
      var li = [];
      if (ai.n_selesai_belum_bayar) li.push('Fisik selesai tetapi belum dibayar: <b>' + nf(ai.n_selesai_belum_bayar) + ' kontrak, ' + rp(ai.selesai_belum_bayar_miliar) + '</b>');
      if (ai.n_lewat) li.push('Lewat tanggal selesai: ' + nf(ai.n_lewat) + ' kontrak, ' + rp(ai.nilai_lewat_miliar));
      if (ai.n_fisik0) li.push('Fisik masih 0%: ' + nf(ai.n_fisik0) + ' kontrak, ' + rp(ai.nilai_fisik0_miliar));
      if (ai.prk_melebihi_pagu) li.push(nf(ai.prk_melebihi_pagu) + ' PRK terkontrak melebihi pagu');
      if (!u) { var lo = aiAll.filter(function(r){ return r.unit !== 'Semua' && r.pagu_miliar > 0; }).sort(function(a, b){ return a.pct_bayar - b.pct_bayar; })[0];
        if (lo) li.push('Terbayar terendah: ' + esc(namaAI(lo.unit)) + ' ' + pc(lo.pct_bayar) + ' (seluruh unit ' + pc(ai.pct_bayar) + ')'); }
      else li.push('Terbayar ' + pc(ai.pct_bayar) + ' dari pagu');
      isi += '<h4 class="tq-h">Anggaran Investasi Distribusi (posisi ' + tgl(ai.posisi) + ')</h4>' + ul(li);
      taut.push({label:'Anggaran', params:{hal:'ai', up3_ai:u ? (AIU[u] || u) : null}});
    }
    var ao = need('ao_unit').find(function(r){ return r.kelompok === 'Semua' && r.unit === (u ? (AOU[u] || u) : 'Semua'); });
    if (ao) {
      var lo2 = [];
      if (ao.sisa_miliar < 0) lo2.push('Terkontrak melebihi pagu ' + rp(-ao.sisa_miliar));
      if (ao.prk_melebihi_pagu) lo2.push(nf(ao.prk_melebihi_pagu) + ' PRK terkontrak melebihi pagu');
      lo2.push('Terbayar ' + pc(ao.pct_bayar) + ' dari pagu' + (ao.sisa_miliar >= 0 ? ', sisa pagu belum terkontrak ' + rp(ao.sisa_miliar) : ''));
      isi += '<h4 class="tq-h">Anggaran Operasi Distribusi (posisi ' + tgl(ao.posisi) + ')</h4>' + ul(lo2);
    }
    if (!u || isUp3) {
      var M = hiModel();
      if (M.last) {
        var m = M.def, rs = M.rows.filter(function(x){ return !u || x.up3 === u; });
        var kr = rs.filter(function(x){ return hiStat(x.v[m-1]) === 'Kronis'; }).sort(function(a, b){ return b.v[m-1] - a.v[m-1]; });
        var sk = rs.filter(function(x){ return hiStat(x.v[m-1]) === 'Sakit'; }).length;
        isi += '<h4 class="tq-h">Health index penyulang (' + BLN[m-1] + ' ' + M.th + ')</h4><p>' + hdot('Kronis') + '<b>' + kr.length + ' kronis</b>, ' + hdot('Sakit') + sk + ' sakit dari ' + rs.length + ' penyulang' +
          (kr.length ? '. Gangguan terbanyak: ' + kr.slice(0, 3).map(function(x){ return esc(x.nama) + ' (' + x.v[m-1] + ')'; }).join(', ') : '') + '.</p>';
        taut.push(hiLink(isUp3 ? u : null, null, null, 'Health index'));
      }
    }
    if (!u) isi += '<p>Catatan data: KPI Rensisdist dan KPI Transmisi masih data contoh; kinerja Transmisi dan Prosis menunggu file.</p>';
    return jawab({judul:'Yang perlu perhatian, ' + nmU, isi:isi,
      sumber:'Data yang tampil di dashboard: kinerja EPM, SAIDI SAIFI, gangguan penyulang (sheet GANGGUAN ULP), LKAI 2026, Monitoring AO dan sheet HEALTH INDEX. Status hijau ≥ 100%, kuning 95% s.d. < 100%, merah < 95%.',
      tautan:taut.slice(0, 4)});
  }
  function jwbRingkasUnit(u){
    var ai = need('ai_unit'), ao = need('ao_unit'), ep = need('epm_unit');
    var a = ai.find(function(r){ return r.jenis === 'Semua' && r.unit === (AIU[u] || u); });
    var o = ao.find(function(r){ return r.kelompok === 'Semua' && r.unit === (AOU[u] || u); });
    var s = ep.find(function(r){ return r.kode_kpi === 'EPM-SUSUT' && r.up3 === u; });
    var g = ep.find(function(r){ return r.kode_kpi === 'EPM-GM' && r.up3 === u; });
    var op = need('capaian_kpi').filter(function(r){ return r.sumber === 'asli' && r.sub_bidang === 'Ophardist' && r.up3 === u; });
    var P = p2tlModel(), po = u === 'UIW' ? P.U : P.by.get(u), pr = po && P.last ? p2tlSd(po, P.last) : null;
    var li = [];
    if (a) li.push('AI: pagu ' + rp(a.pagu_miliar) + ', terkontrak ' + pc(a.pct_kontrak) + ', terbayar ' + pc(a.pct_bayar) + (a.n_selesai_belum_bayar ? '; ' + nf(a.n_selesai_belum_bayar) + ' kontrak selesai belum dibayar' : ''));
    if (o) li.push('AO: pagu ' + rp(o.pagu_miliar) + ', terkontrak ' + pc(o.pct_kontrak) + ', terbayar ' + pc(o.pct_bayar));
    if (s) li.push(dot(s.status) + 'Susut s.d. ' + per(s.periode) + ': ' + pc2(s.realisasi) + ' (target ' + pc2(s.target) + ', capaian ' + pc(s.capaian) + ')');
    if (g) li.push(dot(g.status) + 'Penggantian meter s.d. ' + per(g.periode) + ': ' + nf(g.realisasi) + ' meter, ' + pc(g.pct_tahunan) + ' dari target tahunan');
    if (pr && (UP3.indexOf(u) >= 0 || u === 'UIW')) li.push(dot(stat(pr.cap)) + 'P2TL s.d. ' + BLN[P.last-1] + ' 2026: ' + nf(pr.tot) + ' kWh, capaian ' + pc(pr.cap));
    op.forEach(function(r){ li.push(dot(r.status) + esc(r.nama_kpi) + ' s.d. ' + per(r.periode) + ': ' + nf(r.realisasi, /kali/.test(r.satuan) ? 3 : 2) + ' ' + esc(r.satuan) + ' (target ' + nf(r.target, /kali/.test(r.satuan) ? 3 : 2) + ', capaian ' + pc(r.capaian) + ')'); });
    var M = null; try { M = hiModel(); } catch (e) { if (e === LOADING) throw e; }
    if (M && M.last && (UP3.indexOf(u) >= 0 || u === 'UIW')) {
      var rs = M.rows.filter(function(x){ return u === 'UIW' || x.up3 === u; }), m = M.def;
      var nk = rs.filter(function(x){ return hiStat(x.v[m-1]) === 'Kronis'; }).length, ns = rs.filter(function(x){ return hiStat(x.v[m-1]) === 'Sakit'; }).length;
      li.push('Health index ' + BLN[m-1] + ': ' + hdot('Kronis') + nk + ' penyulang kronis, ' + hdot('Sakit') + ns + ' sakit dari ' + rs.length + (u === 'UIW' ? ' (seluruh UP3)' : ''));
    }
    var nm = u === 'UIW' ? 'UIW' : u === 'UP3B' ? 'UP3B Maluku' : u === 'UP2K' ? 'UP2K Maluku' : 'UP3 ' + u;
    return jawab({judul:'Ringkasan ' + nm, isi:ul(li) + (u === 'UIW' ? '<p>Angka anggaran UIW di atas untuk kantor induk; kinerja dan health index untuk seluruh UP3.</p>' : ''),
      sumber:'LKAI 2026, Monitoring AO, spreadsheet Laporan Kinerja EPM 2026, spreadsheet SAIDI SAIFI 2026, sheet GANGGUAN ULP dan sheet HEALTH INDEX.',
      tautan:[{label:'Anggaran', params:{hal:'ai', up3_ai:AIU[u] || u}}].concat(UP3.indexOf(u) >= 0 ? [{label:'EPM', params:{hal:'EPM', up3_epm:u}}, {label:'Ophardist', params:{hal:'Ophardist', up3_kin:u}}, hiLink(u, null, null, 'Health index')] : [])});
  }
  var CONTOH = ['Berapa serapan AI Ambon?', 'Program AI dengan serapan terendah', 'Kontrak AI yang lewat tanggal selesai', 'AO pemeliharaan JTM', 'Anggaran Transmisi',
    'Susut Tobelo Oktober', 'P2TL Ternate per bulan', 'SAIDI Ambon September', 'Gangguan permanen Masohi per ULP', 'Kinerja Scadatel', 'Penyulang kronis', 'Penyebab gangguan Sofifi',
    'Panjang JTM ULP Weda', 'Apa yang perlu perhatian?', 'Sumber data dan cara update', 'Kapan data diperbarui?'];
  function jwbBantuan(awal){
    return jawab({judul:awal ? 'Halo, saya asisten data dashboard.' : 'Maaf, pertanyaan itu belum saya kenali.',
      isi:'<p>' + (awal ? 'Saya menjawab dari data yang tampil di dashboard ini, tanpa AI, dengan mengenali kata kunci. ' : 'Coba sebut topik dan unitnya, misalnya "serapan AI Ambon" atau "susut Masohi Oktober". ') + 'Topik yang bisa ditanyakan:</p>' +
        ul(['<b>Anggaran Investasi</b> (AI Distribusi): pagu, terkontrak, terbayar per unit; per program; daftar kontrak belum dibayar, lewat tanggal, meluncur atau fisik 0%',
            '<b>Anggaran Operasi</b> (AO Distribusi): per unit atau per kegiatan, sisa, prognosa; PRK yang melebihi pagu (AI dan AO)',
            '<b>Anggaran Transmisi</b> (AO dan AI)',
            '<b>EPM</b>: susut, penggantian meter (termasuk alasannya), P2TL; sebut nama bulan atau "per bulan"',
            '<b>Ophardist</b>: SAIDI, SAIFI, gangguan penyulang permanen dan sementara per UP3 atau per ULP, per bulan atau tren; <b>Rensisdist</b>: status data',
            '<b>Transmisi</b>: kinerja Scadatel per parameter atau per bulan; status kinerja Transmisi dan Prosis',
            '<b>Peta Aset</b>: JTM, gardu, kVA, merk trafo, switching, tiang per UP3, ULP atau penyulang; beban penyulang; info gardu dari kodenya',
            '<b>Health index dan gangguan penyulang</b>: status per bulan, penyulang kronis atau sakit, penyebab gangguan, gangguan terakhir sebuah penyulang',
            '<b>Umum</b>: hal yang perlu perhatian, ringkasan per UP3, tanggal dan pembaruan otomatis, sumber data dan cara update, arti warna dan rumus capaian, tentang dashboard ini']),
      chips:CONTOH});
  }

  /* ---------- I. Transmisi (transmisi-web.js, data window.__TRS) ---------- */
  var SCPAR = [[/master station/, 'Avail Master Station'], [/remote station/, 'Avail Remote Station'], [/telemeter|akurasi|\stid\s/, 'Akurasi Telemetering'],
    [/\stsd\s|validasi/, 'Validasi TSD'], [/remote control|\src\s|keberhasilan/, 'Keberhasilan RC'], [/catu daya/, 'Avail Catu Daya'], [/avail(ability)? scada|ketersediaan scada/, 'Avail SCADA (%)']];
  function jwbTransmisi(t){
    var D = window.__TRS;
    var pr = function(v){ return v == null ? '—' : nf(v, 2) + '%'; }, m = function(v){ return rp(v / 1e9); };
    var tz = [{label:'Lihat tab Transmisi', params:{hal:'Transmisi'}}];
    if (/prosis/.test(t) || (/transmisi/.test(t) && /(kinerja|gangguan|availability|pemeliharaan|\skpi\s)/.test(t) && !/scada/.test(t)))
      return jawab({judul:'Kinerja Transmisi dan Prosis', isi:'<p>Kinerja Transmisi dan Prosis <b>belum dimuat</b>: file sumbernya ada di SharePoint PLN dan menunggu diunggah ke proyek. Kinerja Scadatel sudah tersedia di tab Transmisi; tanyakan "kinerja Scadatel".</p>', sumber:'Tab Transmisi.', tautan:tz});
    if (/(anggaran|\sai\s|investasi|\sao\s|operasi|pagu|terbayar|terkontrak|serapan|kontrak)/.test(t)) {
      var A = D.ao, I = D.ai;
      return jawab({judul:'Anggaran Transmisi', isi:'<h4 class="tq-h">Anggaran Operasi Transmisi</h4><p>AO terbit <b>' + m(A.ao_terbit) + '</b>, terkontrak ' + m(A.terkontrak) + ', terbayar <b>' + m(A.terbayar) + '</b> (' + nf(A.terbayar / A.ao_terbit * 100, 1) + '% dari AO terbit, termasuk hutang usaha 2025 ' + m(A.hutang_terbayar) + ').</p>' +
        '<h4 class="tq-h">Anggaran Investasi Transmisi</h4><p>Pagu AI Murni <b>' + m(I.murni.ai) + '</b> (AKI ' + m(I.murni.aki) + '), terkontrak ' + m(I.murni.kontrak) + '. Lanjutan ' + m(I.lanjutan.ai) + ', terkontrak ' + m(I.lanjutan.kontrak) + '. Nilai terbayar AI belum tersedia di file sumber.</p>',
        sumber:'MON AO OPGI DAN GP DLL 2026 (sheet 53 TRS) dan Monitoring AI 2026 Fungsi Transmisi MMU (sheet Timeline dan AKI). Anggaran Transmisi terpisah dari tab Anggaran (Distribusi).', tautan:tz});
    }
    var S = D.scada, n = S.bulan_akhir, b = cariBulan(t), cat = '';
    if (b > n) { cat = '<p>Data Scadatel bulan ' + BLN[b-1] + ' belum ada; data terakhir s.d. ' + BLN[n-1] + '.</p>'; b = n; }
    var src = 'KINERJA SCADA UP3B MALUKU 2026 (tingkat UIW), sheet bulanan dan Kumulatif 0 MMU AVAIL_SCADA.';
    var catat = '<p>Target kontrak manajemen Scadatel belum diterima, jadi status warna belum ditampilkan. Kinerja Transmisi dan Prosis menunggu file dari SharePoint.</p>';
    // lembar bulanan memuat Akurasi Telemetering dan Validasi TSD; lembar kumulatif memuat Akurasi TID (sama dengan transmisi-web.js)
    var AL = {'Akurasi Telemetering':'Akurasi TID'}, PR = S.bulanan.map(function(p){ var k = S.kumulatif.find(function(x){ return x.nama === (AL[p.nama] || p.nama); });
      return {nama:p.nama, lab:p.nama.replace(' (%)', '') + (AL[p.nama] ? ' (kumulatif: ' + AL[p.nama].replace('Akurasi ', '') + ')' : ''), b:p.nilai, k:k ? k.nilai : []}; });
    S.kumulatif.forEach(function(k){ if (!S.bulanan.some(function(p){ return (AL[p.nama] || p.nama) === k.nama; })) PR.push({nama:k.nama, lab:k.nama.replace(' (%)', ''), b:[], k:k.nilai}); });
    var par = null; for (var i = 0; i < SCPAR.length; i++) if (SCPAR[i][0].test(t)) { par = PR.find(function(p){ return p.nama === SCPAR[i][1]; }); break; }
    if (par) {
      var rs = [];
      for (var q = 1; q <= n; q++) rs.push({b:q, cells:[BLN[q-1].slice(0, 3), pr(par.b[q-1]), pr(par.k[q-1])]});
      return jawab({judul:par.lab + ' per bulan, 2026', isi:cat + tabel(['Bulan', 'Bulan itu', 'Kumulatif'], rs, function(r){ return r.b === b; }) + catat, sumber:src, tautan:tz});
    }
    var bb = b || n;
    var bawah = PR.filter(function(p){ var v = p.b[bb-1]; return v != null && v < 100; });
    return jawab({judul:'Kinerja Scadatel, ' + BLN[bb-1] + ' 2026', isi:cat + tabel(['Parameter', BS[bb-1], 'Kumulatif'], PR.map(function(p){ return {cells:[esc(p.lab), pr(p.b[bb-1]), pr(p.k[bb-1])]}; }), null, true) +
      '<p>' + (bawah.length ? 'Di bawah 100% pada ' + BLN[bb-1] + ': ' + bawah.map(function(p){ return esc(p.lab) + ' (' + pr(p.b[bb-1]) + ')'; }).join(', ') + '.' : 'Semua parameter 100% pada ' + BLN[bb-1] + '.') + ' Kumulatif = Januari s.d. ' + BLN[bb-1] + '. Tanyakan nama parameternya, misalnya "keberhasilan RC per bulan", untuk melihat tiap bulan.</p>' + catat,
      sumber:src, tautan:tz});
  }

  /* ---------- mesin: kenali maksud pertanyaan ---------- */
  function jawabPertanyaan(raw){
    var t = norm(raw);
    var units = cariUnit(t);
    var rank = /(tertinggi|terbesar|terendah|terkecil|terburuk|terbaik|terbanyak|tersedikit|terpanjang|terpendek|paling|peringkat|ranking|urutan|rendah|tinggi)/.test(t);
    var low = /(terendah|terkecil|terburuk|tersedikit|terpendek|paling (rendah|kecil|sedikit|lambat|pendek|buruk)|\srendah\s)/.test(t);
    if (/^\s*(halo|hai|hi|selamat \w+|bantuan|tolong|help|menu|bisa apa|apa saja)\b/.test(t.trim()) && t.trim().split(' ').length <= 4) return jwbBantuan(true);
    // umum
    if (/(tentang dashboard|dashboard apa|apa itu dashboard|isi dashboard|versi web|versi claude|web ini|website|situs ini|github|login|apa itu tanya data|cara (pakai|memakai|menggunakan)|siapa yang (membuat|mengelola))/.test(t)) return jwbTentang();
    if (/(sumber data|sumber datanya|dari mana|asal data|cara (update|mengupdate|memperbarui|mengubah|mengisi|memasukkan|input)|bagaimana (update|mengupdate|memperbarui|mengubah|mengisi)|siapa yang (update|mengupdate|mengisi|memperbarui)|link (sheet|spreadsheet)|tautan (sheet|spreadsheet)|spreadsheet)/.test(t)) return jwbSumber();
    if (/(arti warna|arti status|maksud warna|warna (hijau|kuning|merah|status|garis|peta)|apa arti|artinya|rumus|cara (hitung|menghitung)|dihitung|perhitungan|polaritas|legenda)/.test(t)) return jwbWarna();
    if (/(kapan|diperbarui|pembaruan|update|tanggal data|posisi data|data terakhir|otomatis|terjadwal)/.test(t)) return jwbTanggal();
    // anggaran dan program (dipakai juga untuk memisahkan "SCADA" Transmisi dari kegiatan/program Distribusi)
    var ai = /(\sai\s|investasi|lkai|\skontrak\s|belum (di)?bayar|meluncur|luncuran|program|\sprk\s)/.test(t);
    var ao = /(\sao\s|operasi|prognosa|hutang usaha|kegiatan|yantek|sppd|keypoint)/.test(t) && !/operasi pemeliharaan/.test(t);
    if (window.__TRS && (/(transmisi|prosis)/.test(t) || (/(scada|keberhasilan rc|remote control|master station|remote station|telemeter|validasi tsd|catu daya)/.test(t) && !ai && !ao))) return jwbTransmisi(t);
    var sb = /rensisdist/.test(t) ? 'Rensisdist' : /(ophardist|operasi pemeliharaan|saidi|saifi)/.test(t) ? 'Ophardist' : /transmisi/.test(t) ? 'Transmisi' : null;
    if (sb) return jwbSubBidang(sb, t, units, rank, low);
    // health index dan gangguan penyulang
    var isHI = /(health index|healt index|indeks kesehatan|kesehatan penyulang|\skronis\s|\ssakit\s|\ssempurna\s|status penyulang|penyulang (yang )?(sehat|bermasalah|perlu perhatian|rawan))/.test(t) || (/\ssehat\s/.test(t) && /penyulang/.test(t));
    var isGG = /(gangguan|\strip\s|padam|penyebab|\scause\s)/.test(t) && !/(meter|susut)/.test(t);
    // KPI gangguan permanen/sementara (sheet GANGGUAN ULP); penyebab, gangguan terakhir dan penyulang tertentu tetap ke daftar gangguan
    var isGK = isGG && !/(penyebab|\scause\s|terakhir|terbaru|durasi|terlama|\strip\s|padam|penyulang (dengan|yang))/.test(t) &&
      /(permanen|sementara|per ulp|tiap ulp|setiap ulp|capaian|target|\skpi\s|kinerja)/.test(t);
    if (isGK) { var Mk = null; try { Mk = hiModel(); } catch (e) { if (e === LOADING) throw e; }
      if (!(Mk && cariPylHI(t, Mk, cariUlpHI(t, Mk), null))) return jwbGangguanKpi(t, units, rank, low); }
    if (isGG && /penyulang/.test(t) && rank && !/penyebab/.test(t)) return jwbHI(t, units, rank, low);
    if (isHI) return jwbHI(t, units, rank && !/(penyebab|terakhir)/.test(t), low);
    if (isGG) return jwbGangguan(t, units);
    // aset dan beban
    var g = (/(gardu|\sgd|\sgh\s|trafo|kva)/.test(t) || /\b[a-z]{3}\s?\d{2,3}\b/i.test(raw)) ? cariGardu(raw) : null;
    if (g) return jwbGardu(g);
    if (/(beban|puncak|\smw\s|\sarus\s|ampere|kw per gardu)/.test(t)) return jwbBeban(t, units, rank, low);
    // EPM
    if (/(p2tl|pelanggaran|kelainan)/.test(t)) return jwbP2TL(t, units, rank, low);
    if (!ai && /(ganti meter|penggantian meter|pergantian meter|\sgm\s|\smeter\s)/.test(t)) return jwbGM(t, units, rank, low);
    if (/(susut|losses)/.test(t)) return jwbSusut(t, units, rank, low);
    // anggaran
    if (/(melebihi pagu|lebih dari pagu|melampaui pagu|over pagu|di atas pagu|lewat pagu|melebihi anggaran)/.test(t)) {
      var mAI = /(\sai\s|investasi|lkai)/.test(t), mAO = /(\sao\s|operasi)/.test(t);
      return jwbMelebihi(t, units, mAI || !mAO, mAO || !mAI);
    }
    if (ai && !ao) {
      var prog = cariProgram(t);
      if (prog || /(program|\sprk\s)/.test(t)) return jwbAIProgram(t, units, rank, low, prog);
      return jwbAI(t, units, rank, low);
    }
    if (ao && !ai) {
      var keg = cariKegiatan(t);
      if (keg || /(kegiatan|\sprk\s|rincian)/.test(t)) return jwbAOKegiatan(t, units, rank, low, keg);
      return jwbAO(t, units, rank, low);
    }
    if (ai || /(anggaran|pagu|serapan|penyerapan|terbayar|terkontrak|realisasi bayar|\sbayar\s)/.test(t)) {
      var keg2 = cariKegiatan(t);
      if (keg2 && !ai && /(pemeliharaan|yantek|mapping|sppd|keypoint)/.test(t)) return jwbAOKegiatan(t, units, rank, low, keg2);
      var a = jwbAI(t, units, rank, low), o = jwbAO(t, units, rank, low);
      return {judul:'Anggaran Investasi dan Operasi', isi:'<h4 class="tq-h">' + esc(a.judul) + '</h4>' + a.isi + '<h4 class="tq-h">' + esc(o.judul) + '</h4>' + o.isi + '<p>Anggaran Transmisi terpisah; tanyakan "anggaran Transmisi".</p>',
        sumber:a.sumber + ' ' + o.sumber, tautan:[].concat(a.tautan && a.tautan[0] ? [{label:'Lihat AI', params:a.tautan[0].params}] : [], o.tautan && o.tautan[0] ? [{label:'Lihat AO', params:o.tautan[0].params}] : [])};
    }
    // hal yang perlu perhatian
    if (/(perlu perhatian|perhatian|bermasalah|masalah|kritis|\smerah\s|\skuning\s|waspada|di bawah target|belum tercapai|tidak tercapai|tertinggal|prioritas|rawan)/.test(t)) return jwbPerhatian(t, units);
    if (/(\sepm\s|kinerja)/.test(t)) {
      var s = jwbSusut(t, units, rank, low), m = jwbGM(t, units, rank, low);
      return {judul:'Kinerja EPM', isi:'<h4 class="tq-h">' + esc(s.judul) + '</h4>' + s.isi + '<h4 class="tq-h">' + esc(m.judul) + '</h4>' + m.isi, sumber:s.sumber, tautan:s.tautan};
    }
    var X = indeksAset();
    if (/(jtm|jaringan|gardu|trafo|kva|kapasitas|switching|\slbs\s|pmcb|recloser|\sfco\s|tiang|aset|penyulang|\sulp\s|merk|pabrikan|panjang)/.test(t) || cariPenyulang(t, X) || cariUlp(t, X))
      return jwbAset(t, units, rank, low, raw);
    if (units.length === 1) return jwbRingkasUnit(units[0]);
    if (/(ringkasan|rangkuman|ikhtisar|gambaran umum)/.test(t)) return jwbPerhatian(t, units);
    return jwbBantuan(false);
  }

  /* ---------- tampilan ---------- */
  var IKON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-4.6 3.7A.9.9 0 0 1 3 21V6a2 2 0 0 1 1-2zm3 5.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm5 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm5 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z"/></svg>';
  var root, log, inp, btn, panel;
  function el(tag, cls, html){ var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function tambahTanya(q){ var m = el('div', 'tq-msg tq-q'); m.textContent = q; log.appendChild(m); gulir(); }
  function gulir(){ log.scrollTop = log.scrollHeight; }
  function render(o, box){
    box.innerHTML = '';
    box.appendChild(el('div', 'tq-judul', esc(o.judul)));
    if (o.isi) box.appendChild(el('div', 'tq-isi', o.isi));
    if (o.sumber) box.appendChild(el('div', 'tq-src', 'Sumber: ' + esc(o.sumber)));
    var acts = el('div', 'tq-acts');
    (o.tautan || []).forEach(function(l){
      var b = el('button', 'tq-go'); b.type = 'button'; b.textContent = l.label + ' →';
      b.addEventListener('click', function(){ keTab(l.params); if (window.matchMedia('(max-width: 640px)').matches) buka(false); });
      acts.appendChild(b);
    });
    (o.chips || []).forEach(function(c){
      var b = el('button', 'tq-chip'); b.type = 'button'; b.textContent = c;
      b.addEventListener('click', function(){ tanya(c); });
      acts.appendChild(b);
    });
    if (acts.childNodes.length) box.appendChild(acts);
  }
  function tanya(q){
    q = String(q || '').trim(); if (!q) return;
    tambahTanya(q);
    var box = el('div', 'tq-msg tq-a', '<div class="tq-tunggu">Mencari di data…</div>'); log.appendChild(box); gulir();
    var mulai = Date.now();
    (function coba(){
      try { render(jawabPertanyaan(q), box); gulir(); }
      catch (e) {
        if (e === LOADING && Date.now() - mulai < 20000) { setTimeout(coba, 300); return; }
        box.innerHTML = '<div class="tq-isi"><p>' + (e === LOADING ? 'Data belum selesai dimuat. Coba tanyakan lagi sebentar lagi.' : 'Maaf, terjadi kesalahan saat membaca data.') + '</p></div>';
        if (e !== LOADING) console.error(e);
        gulir();
      }
    })();
  }
  function buka(on){
    root.classList.toggle('tq-open', on);
    btn.setAttribute('aria-expanded', String(on));
    panel.hidden = !on;
    if (on) { if (!log.childNodes.length) { var b = el('div', 'tq-msg tq-a'); render(jwbBantuan(true), b); log.appendChild(b); } setTimeout(function(){ inp.focus(); }, 30); }
  }
  function pasang(){
    root = el('div', 'tq-root');
    btn = el('button', 'tq-fab', IKON + '<span>Tanya Data</span>'); btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'tq-panel');
    panel = el('section', 'tq-panel'); panel.id = 'tq-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Tanya Data');
    panel.innerHTML = '<header class="tq-head"><div><b>Tanya Data</b><span>Asisten data dashboard, uji coba tanpa AI</span></div><button type="button" class="tq-x" aria-label="Tutup">×</button></header>' +
      '<div class="tq-log" aria-live="polite"></div>' +
      '<form class="tq-form"><input type="text" class="tq-in" placeholder="Contoh: susut Masohi" aria-label="Pertanyaan" autocomplete="off" maxlength="200"><button type="submit" class="tq-send" aria-label="Kirim"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/></svg></button></form>';
    root.appendChild(panel); root.appendChild(btn); document.body.appendChild(root);
    log = panel.querySelector('.tq-log'); inp = panel.querySelector('.tq-in');
    btn.addEventListener('click', function(){ buka(panel.hidden); });
    panel.querySelector('.tq-x').addEventListener('click', function(){ buka(false); btn.focus(); });
    panel.querySelector('.tq-form').addEventListener('submit', function(ev){ ev.preventDefault(); var q = inp.value; inp.value = ''; tanya(q); });
    document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape' && !panel.hidden) { buka(false); btn.focus(); } });
  }
  window.__tanyaJawab = function(q){ try { return jawabPertanyaan(q); } catch (e) { return e === LOADING ? 'memuat' : 'galat: ' + e.message; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
})();
