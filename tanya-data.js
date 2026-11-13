/* Asisten "Tanya Data" untuk versi web dashboard T&D (uji coba, tanpa AI).
   Mengenali pertanyaan dengan kata kunci, lalu menjawab dari data yang sama dengan yang tampil di dashboard
   (dash.data: ai_unit, ai_kontrak, ao_unit, epm_unit, epm_rinci, aset_gis, beban_gis, gis_titik, capaian_kpi,
   serta window.__KAPASITAS). Tidak ada data yang dikirim ke luar halaman. */
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
  function tabel(head, rows, hi){
    var h = '<div class="tq-tblwrap"><table class="tq-tbl"><thead><tr>' + head.map(function(x, i){ return '<th' + (i ? ' class="n"' : '') + '>' + x + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function(r){ h += '<tr' + (hi && hi(r) ? ' class="hi"' : '') + '>' + r.cells.map(function(x, i){ return '<td' + (i ? ' class="n"' : '') + '>' + x + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table></div>';
  }
  function jawab(o){ return o; } // {judul, isi(html), sumber, tautan:[{label, params}]}

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
  function keTab(params){
    var hal = params.hal;
    var o = Object.assign({}, params);
    if (hal === 'ai' || hal === 'ao') o.jenis_ang = hal;
    dash.setParams(o);
    dash.setLink(hal);
    setTimeout(function(){ try {
      var pn = Array.prototype.find.call(document.querySelectorAll('.td-panel'), function(x){ return !x.closest('[hidden]'); });
      var bar = document.querySelector('.td-controls'), off = bar ? bar.getBoundingClientRect().height + 8 : 8;
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
    var kontrakQ = /\s(kontrak|belum (di)?bayar|selesai|lewat|meluncur|fisik)\s/.test(t);
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
    if (pick.length === 1 && pick[0] === 'Semua' && !kontrakQ) {
      isi += tabel(['Unit', 'Pagu', '% kontrak', '% bayar'], unitRows.map(function(r){ return {cells:[esc(r.unit), nf(r.pagu_miliar, 2), pc(r.pct_kontrak), pc(r.pct_bayar)]}; }));
    }
    return jawab({judul: lab + (kontrakQ ? ': kontrak' : ''), isi:isi, sumber:src + '.', tautan:taut.slice(0, 3)});
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

  /* ---------- C. Kinerja EPM ---------- */
  function epmUnitList(units){ var u = units.filter(function(x){ return UP3.indexOf(x) >= 0 || x === 'UIW'; }); return u; }
  function jwbSusut(t, units, rank, low){
    var d = need('epm_unit').filter(function(r){ return r.kode_kpi === 'EPM-SUSUT'; });
    if (!d.length) return jawab({judul:'Susut distribusi', isi:'<p>Data susut belum tersedia.</p>'});
    var p = per(d[0].periode), us = epmUnitList(units);
    var src = 'Sheet Kinerja EPM, kumulatif s.d. ' + p + '. Capaian susut = 2 − realisasi ÷ target; hijau ≥ 100%, kuning 95% s.d. < 100%, merah < 95%';
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
    var d = need('epm_unit').filter(function(r){ return r.kode_kpi === 'EPM-GM'; });
    if (!d.length) return jawab({judul:'Penggantian meter', isi:'<p>Data penggantian meter belum tersedia.</p>'});
    var p = per(d[0].periode), us = epmUnitList(units);
    var src = 'Sheet Kinerja EPM, kumulatif s.d. ' + p + '. Target bulanan = target tahunan × bulan ÷ 12';
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
  function jwbP2TL(t, units, rank, low){
    var d = need('epm_rinci').filter(function(r){ return r.kode_kpi === 'EPM-P2TL'; });
    var by = new Map(), last = '';
    d.forEach(function(r){
      var o = by.get(r.up3) || {up3:r.up3, kel:0, pel:0, ann:null, bln:''}; by.set(r.up3, o);
      var v = r.nilai === '' || r.nilai == null ? null : +r.nilai;
      if (r.ukuran === 'target_tahunan') o.ann = v;
      else if (v != null && (r.ukuran === 'kelainan' || r.ukuran === 'pelanggaran')) {
        if (r.ukuran === 'kelainan') o.kel += v; else o.pel += v;
        if (r.periode > o.bln) o.bln = r.periode; if (r.periode > last) last = r.periode;
      }
    });
    var rows = UP3.map(function(u){ return by.get(u); }).filter(Boolean);
    if (!rows.length) return jawab({judul:'P2TL', isi:'<p>Data P2TL belum tersedia.</p>'});
    var b = +last.slice(5, 7);
    rows.forEach(function(o){ o.tot = o.kel + o.pel; o.tk = o.ann ? o.ann * b / 12 : null; o.cap = o.tk ? Math.round(o.tot / o.tk * 1000) / 10 : null; o.pt = o.ann ? Math.round(o.tot / o.ann * 1000) / 10 : null; });
    var U = {up3:'UIW', kel:sum(rows, function(o){ return o.kel; }), pel:sum(rows, function(o){ return o.pel; }), ann:sum(rows, function(o){ return o.ann; })};
    U.tot = U.kel + U.pel; U.tk = U.ann * b / 12; U.cap = U.tk ? Math.round(U.tot / U.tk * 1000) / 10 : null; U.pt = U.ann ? Math.round(U.tot / U.ann * 1000) / 10 : null;
    var p = per(last), us = epmUnitList(units);
    var src = 'Sheet Kinerja EPM (P2TL), kumulatif Januari s.d. ' + p + ', dalam kWh. Realisasi = pelanggaran + kelainan; capaian = realisasi ÷ (target tahunan × bulan ÷ 12)';
    if (!us.length || rank) {
      var s = rows.slice().sort(function(a, x){ return low ? a.cap - x.cap : x.cap - a.cap; }), top = s[0];
      var kal = rank ? (low ? 'Capaian terendah' : 'Capaian tertinggi') + ': <b>' + esc(top.up3) + '</b> (' + pc(top.cap) + ').'
                     : 'UIW: pelanggaran ' + nf(U.pel) + ' kWh dan kelainan ' + nf(U.kel) + ' kWh, total <b>' + nf(U.tot) + ' kWh</b> atau <b>' + pc(U.pt) + '</b> dari target tahunan ' + nf(U.ann) + ' kWh.';
      return jawab({judul:'P2TL per UP3, s.d. ' + p,
        isi:'<p>' + kal + '</p>' + tabel(['UP3', 'Pelanggaran', 'Kelainan', 'Capaian'], s.map(function(o){ return {u:o.up3, cells:[dot(stat(o.cap)) + esc(o.up3), nf(o.pel), nf(o.kel), pc(o.cap)]}; }), function(r){ return rank && r.u === top.up3; }),
        sumber:src + '.', tautan:[{label:'Lihat di tab EPM', params:{hal:'EPM', up3_epm:null}}]});
    }
    var isi = '', taut = [];
    us.forEach(function(u){
      var o = u === 'UIW' ? U : by.get(u);
      if (!o) { isi += '<p><b>' + esc(u) + '</b>: tidak ada data P2TL.</p>'; return; }
      isi += '<p>' + dot(stat(o.cap)) + '<b>' + esc(u) + '</b>: pelanggaran ' + nf(o.pel) + ' kWh, kelainan ' + nf(o.kel) + ' kWh, total <b>' + nf(o.tot) + ' kWh</b>. Target tahunan ' + (o.ann ? nf(o.ann) + ' kWh, tercapai <b>' + pc(o.pt) + '</b>; capaian terhadap target s.d. ' + p + ' <b>' + pc(o.cap) + '</b>.' : 'belum diisi.') + '</p>';
      taut.push({label:'Lihat di tab EPM (' + u + ')', params:{hal:'EPM', up3_epm:u === 'UIW' ? null : u}});
    });
    return jawab({judul:'P2TL, s.d. ' + p, isi:isi, sumber:src + '.', tautan:taut.slice(0, 3)});
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
  function jwbTanggal(){
    var ai = need('ai_unit'), ao = need('ao_unit'), ep = need('epm_unit'), rin = need('epm_rinci');
    var p2 = rin.filter(function(r){ return r.kode_kpi === 'EPM-P2TL' && /^\d{4}-\d{2}$/.test(r.periode) && r.nilai !== '' && r.nilai != null; }).reduce(function(m, r){ return r.periode > m ? r.periode : m; }, '');
    var f = (document.querySelector('.web-foot') || {}).textContent || '';
    var m = /Data kinerja EPM terakhir diperbarui (.+? WIT)/.exec(f);
    var sus = ep.find(function(r){ return r.kode_kpi === 'EPM-SUSUT'; }), gm = ep.find(function(r){ return r.kode_kpi === 'EPM-GM'; });
    var X = indeksAset(), dimuat = Array.from(new Set(Array.from(X.U2U.values())));
    var li = [
      'Anggaran Investasi (LKAI 2026): posisi <b>' + tgl((ai[0] || {}).posisi) + '</b>',
      'Anggaran Operasi (Monitoring AO): posisi <b>' + tgl((ao[0] || {}).posisi) + '</b>',
      'Kinerja EPM: ' + (m ? 'diperbarui <b>' + esc(m[1]) + '</b>; ' : '') + (sus ? 'susut s.d. ' + per(sus.periode) : '') + (gm ? ', penggantian meter s.d. ' + per(gm.periode) : '') + (p2 ? ', P2TL s.d. ' + per(p2) : ''),
      'Peta Aset: data GIS UP3 ' + dimuat.join(', ') + '; UP3 lain belum dimuat',
      'Rensisdist, Ophardist dan Transmisi: masih data contoh'
    ];
    return jawab({judul:'Tanggal data di dashboard', isi:'<ul class="tq-ul">' + li.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul><p>Kinerja EPM diperiksa otomatis setiap pagi pukul 06.34 WIT.</p>'});
  }
  function jwbContoh(sb){
    return jawab({judul:'Kinerja ' + sb, isi:'<p>Data kinerja ' + esc(sb) + ' di dashboard masih <b>data contoh</b>, belum data asli, sehingga belum dapat dijawab. Data asli akan dimuat setelah spreadsheet kinerja ' + esc(sb) + ' diterima.</p>',
      tautan:[{label:'Lihat tab ' + sb, params:{hal:sb}}]});
  }
  function jwbRingkasUnit(u){
    var isi = '', ai = need('ai_unit'), ao = need('ao_unit'), ep = need('epm_unit');
    var a = ai.find(function(r){ return r.jenis === 'Semua' && r.unit === (AIU[u] || u); });
    var o = ao.find(function(r){ return r.kelompok === 'Semua' && r.unit === (AOU[u] || u); });
    var s = ep.find(function(r){ return r.kode_kpi === 'EPM-SUSUT' && r.up3 === u; });
    var g = ep.find(function(r){ return r.kode_kpi === 'EPM-GM' && r.up3 === u; });
    var li = [];
    if (a) li.push('AI: pagu ' + rp(a.pagu_miliar) + ', terkontrak ' + pc(a.pct_kontrak) + ', terbayar ' + pc(a.pct_bayar));
    if (o) li.push('AO: pagu ' + rp(o.pagu_miliar) + ', terkontrak ' + pc(o.pct_kontrak) + ', terbayar ' + pc(o.pct_bayar));
    if (s) li.push(dot(s.status) + 'Susut s.d. ' + per(s.periode) + ': ' + pc2(s.realisasi) + ' (target ' + pc2(s.target) + ', capaian ' + pc(s.capaian) + ')');
    if (g) li.push(dot(g.status) + 'Penggantian meter s.d. ' + per(g.periode) + ': ' + nf(g.realisasi) + ' meter, ' + pc(g.pct_tahunan) + ' dari target tahunan');
    isi = '<ul class="tq-ul">' + li.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul>';
    return jawab({judul:'Ringkasan ' + (u === 'UIW' ? 'UIW' : u === 'UP3B' ? 'UP3B Maluku' : u === 'UP2K' ? 'UP2K Maluku' : 'UP3 ' + u), isi:isi,
      sumber:'LKAI 2026, Monitoring AO dan sheet Kinerja EPM.',
      tautan:[{label:'Anggaran', params:{hal:'ai', up3_ai:AIU[u] || u}}].concat(UP3.indexOf(u) >= 0 ? [{label:'EPM', params:{hal:'EPM', up3_epm:u}}] : [])});
  }
  var CONTOH = ['Berapa serapan AI Ambon?', 'Unit dengan penyerapan AI terendah', 'Kontrak AI Sofifi yang belum dibayar', 'Sisa AO terbesar', 'Susut Masohi', 'Penggantian meter per UP3', 'P2TL Ternate', 'Panjang JTM ULP Weda', 'Penyulang dengan beban tertinggi', 'Gardu SFF001', 'Kapan data diperbarui?'];
  function jwbBantuan(awal){
    return jawab({judul:awal ? 'Halo, saya asisten data dashboard.' : 'Maaf, pertanyaan itu belum saya kenali.',
      isi:'<p>' + (awal ? 'Saya menjawab dari data yang tampil di dashboard ini, tanpa AI, dengan mengenali kata kunci. ' : 'Coba sebut topik dan unitnya, misalnya "serapan AI Ambon" atau "susut Masohi". ') + 'Topik yang bisa ditanyakan:</p><ul class="tq-ul">' +
        '<li>Anggaran Investasi (AI): pagu, terkontrak, terbayar, kontrak belum dibayar, peringkat unit</li>' +
        '<li>Anggaran Operasi (AO): pagu, terbayar, prognosa, sisa</li>' +
        '<li>Kinerja EPM: susut, penggantian meter, P2TL</li>' +
        '<li>Aset: JTM, gardu, kVA, switching, tiang per UP3, ULP atau penyulang; beban penyulang; info gardu menurut kodenya</li>' +
        '<li>Tanggal pembaruan data</li></ul>',
      chips:CONTOH});
  }

  /* ---------- mesin: kenali maksud pertanyaan ---------- */
  function jawabPertanyaan(raw){
    var t = norm(raw);
    var units = cariUnit(t);
    var rank = /(tertinggi|terbesar|terendah|terkecil|terburuk|terbaik|terbanyak|tersedikit|terpanjang|terpendek|paling|peringkat|ranking|urutan|rendah|tinggi)/.test(t);
    var low = /(terendah|terkecil|terburuk|tersedikit|terpendek|paling (rendah|kecil|sedikit|lambat|pendek|buruk)|\srendah\s)/.test(t);
    if (/^\s*(halo|hai|hi|selamat \w+|bantuan|tolong|help|menu|bisa apa|apa saja)\b/.test(t.trim()) && t.trim().split(' ').length <= 4) return jwbBantuan(true);
    if (/(kapan|diperbarui|pembaruan|update|tanggal data|posisi data|data terakhir)/.test(t)) return jwbTanggal();
    var sb = /rensisdist/.test(t) ? 'Rensisdist' : /ophardist|operasi pemeliharaan/.test(t) ? 'Ophardist' : /transmisi/.test(t) ? 'Transmisi' : null;
    if (sb) return jwbContoh(sb);
    var g = (/(gardu|\sgd|\sgh\s|trafo|kva)/.test(t) || /\b[a-z]{3}\s?\d{2,3}\b/i.test(raw)) ? cariGardu(raw) : null;
    if (g) return jwbGardu(g);
    if (/(beban|puncak|\smw\s|\sarus\s|ampere|kw per gardu)/.test(t)) return jwbBeban(t, units, rank, low);
    if (/(p2tl|pelanggaran|kelainan)/.test(t)) return jwbP2TL(t, units, rank, low);
    if (/(ganti meter|penggantian meter|pergantian meter|\sgm\s|\smeter\s)/.test(t)) return jwbGM(t, units, rank, low);
    if (/(susut|losses)/.test(t)) return jwbSusut(t, units, rank, low);
    var isAI = /(\sai\s|investasi|lkai|\skontrak\s|belum (di)?bayar|meluncur|luncuran)/.test(t);
    var isAO = /(\sao\s|operasi|prognosa|hutang usaha)/.test(t);
    if (isAI && !isAO) return jwbAI(t, units, rank, low);
    if (isAO && !isAI) return jwbAO(t, units, rank, low);
    if (isAI || /(anggaran|pagu|serapan|penyerapan|terbayar|terkontrak|realisasi bayar|\sbayar\s)/.test(t)) {
      var a = jwbAI(t, units, rank, low), o = jwbAO(t, units, rank, low);
      return {judul:'Anggaran Investasi dan Operasi', isi:'<h4 class="tq-h">' + esc(a.judul) + '</h4>' + a.isi + '<h4 class="tq-h">' + esc(o.judul) + '</h4>' + o.isi,
        sumber:a.sumber + ' ' + o.sumber, tautan:[].concat(a.tautan && a.tautan[0] ? [{label:'Lihat AI', params:a.tautan[0].params}] : [], o.tautan && o.tautan[0] ? [{label:'Lihat AO', params:o.tautan[0].params}] : [])};
    }
    if (/(\sepm\s|kinerja)/.test(t)) {
      var s = jwbSusut(t, units, rank, low), m = jwbGM(t, units, rank, low);
      return {judul:'Kinerja EPM', isi:'<h4 class="tq-h">' + esc(s.judul) + '</h4>' + s.isi + '<h4 class="tq-h">' + esc(m.judul) + '</h4>' + m.isi, sumber:s.sumber, tautan:s.tautan};
    }
    var X = indeksAset();
    if (/(jtm|jaringan|gardu|trafo|kva|kapasitas|switching|\slbs\s|pmcb|recloser|\sfco\s|tiang|aset|penyulang|\sulp\s|merk|pabrikan|panjang)/.test(t) || cariPenyulang(t, X) || cariUlp(t, X))
      return jwbAset(t, units, rank, low, raw);
    if (units.length === 1) return jwbRingkasUnit(units[0]);
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
