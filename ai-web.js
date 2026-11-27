/* Tab Anggaran Investasi versi web: konsep "Tiga Gauge" (pilihan Zuhal 27 Nov 2026, tanpa grafik bulanan, dengan per progres fisik).
   Konsep: /mnt/project-files/anggaran/ai/konsep-tata-letak/p3-konsep-1-tiga-gauge*.png (skrip gen3.js).
   Menyembunyikan isi lama tab AI lewat ai-web.css, lalu menyisipkan #aiw setelah bilah filter. Angka dibaca dari calc halaman
   (ai_unit, ai_progres, ai_kontrak) lewat dash.data dan mengikuti filter unit (up3_ai) serta status (ai_jenis).
   Daftar kontrak lama dipindah ke <details id="aiw-daftar">. Cadangan versi sebelumnya: ai-web_2026-11-27_sebelum-tiga-gauge.* */
(function () {
  'use strict';
  var sec = document.getElementById('anggaran');
  var bar = document.getElementById('filter-ai');
  if (!sec || !bar || !window.dash) return;
  document.documentElement.classList.add('aiw-on');

  var C = { biru: '#2E75B6', tosca: '#0C9CB4', petrol: '#216279', kuning: '#FFC000', salmon: '#F4625E', muda: '#9CD3E2', abu: '#DCE5EE' };
  var BL = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  /* tahap progres fisik: kelompok di calc ai_progres -> label, warna, kunci saringan daftar kontrak */
  var TAHAP = [
    ['Fisik 0%', 'Belum mulai (0%)', C.salmon],
    ['Fisik 1–50%', 'Berjalan 1–50%', C.muda],
    ['Fisik 51–99%', 'Berjalan 51–99%', C.tosca],
    ['Selesai, belum terbayar', 'Selesai, belum dibayar', C.biru],
    ['Terbayar', 'Terbayar', C.petrol],
    ['Belum diisi', 'Progres belum diisi', C.abu]
  ];

  function E(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fx(v, d) { return (+v || 0).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function RP(v) { return 'Rp ' + fx(v, 1) + ' M'; }
  function PC(v) { return v == null || !isFinite(v) ? '—' : fx(v, 1) + '%'; }
  function tgl(s) { var p = String(s || '').split('-'); return p.length === 3 ? +p[2] + ' ' + BLN[+p[1] - 1] + ' ' + p[0] : '—'; }
  function nama(u) { return u === 'Semua' ? 'Semua unit' : (window.TD && TD.unitNama ? TD.unitNama(u) : u); }
  function pendek(u) { return nama(u).replace(/^UP3 /, ''); }
  function prm() { var p = dash.params(); return { u: p.up3_ai || 'Semua', j: p.ai_jenis || 'Semua' }; }
  function data(id) { var r = dash.data(id); return r && r.status === 'ok' ? r.data : null; }

  /* ---------- kerangka ---------- */
  var root = E('div', 'aiw'); root.id = 'aiw';
  root.innerHTML =
    '<div class="aiw-head"><h2 class="aiw-title" data-aiw="judul">Anggaran Investasi Distribusi 2026</h2><p class="aiw-meta" data-aiw="meta"></p></div>' +
    '<section class="aiw-gauges" data-aiw="gauges"></section>' +
    '<section class="aiw-row">' +
    '<div class="aiw-card"><h3>Per unit</h3><p class="aiw-q">Urut dari terbayar terendah. Klik baris untuk memfilter unit.</p>' +
    '<div class="aiw-lg"><span><b style="background:' + C.muda + '"></b>Fisik selesai</span><span><b style="background:' + C.petrol + '"></b>Terbayar (angka kanan)</span></div>' +
    '<div class="aiw-units" data-aiw="units"></div></div>' +
    '<div class="aiw-card"><h3>Proyeksi pembayaran</h3><p class="aiw-q">Rp miliar, menurut rencana bayar tiap kontrak.</p>' +
    '<div class="aiw-cols" data-aiw="bayar"></div><p class="aiw-note" data-aiw="bayar-note"></p></div></section>' +
    '<section class="aiw-card aiw-pf"><h3>Per progres fisik</h3><p class="aiw-q">Jumlah dan nilai kontrak menurut tahap progres fisik. Klik baris untuk melihat daftar kontraknya.</p>' +
    '<div class="aiw-pfg"><div class="aiw-donut" data-aiw="donut"></div><div data-aiw="tahap"></div></div></section>';
  var akt = sec.querySelector('.ai-aktif');
  (akt || bar).insertAdjacentElement('afterend', root);
  var Q = function (k) { return root.querySelector('[data-aiw="' + k + '"]'); };

  /* daftar kontrak lama masuk ke details agar halaman tetap lega */
  var daftar = document.getElementById('ai-daftar'), det = null;
  if (daftar) {
    det = E('details', 'aiw-det'); det.id = 'aiw-daftar';
    det.appendChild(E('summary', null, 'Daftar kontrak <span data-aiw="ndaftar"></span>'));
    daftar.parentNode.insertBefore(det, daftar); det.appendChild(daftar);
    det.addEventListener('toggle', function () { if (det.open) dash.draw(); });
  }
  function bukaDaftar(kat) {
    dash.setParams({ ai_kat: kat === 'Semua' ? null : kat, ai_all: null });
    if (det) { det.open = true; setTimeout(function () { det.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }
  }
  root.addEventListener('click', function (ev) {
    var k = ev.target.closest('[data-kat]'); if (k) { bukaDaftar(k.getAttribute('data-kat')); return; }
    var r = ev.target.closest('[data-unit]');
    if (r) { var u = r.getAttribute('data-unit'); dash.setParams({ up3_ai: prm().u === u ? 'Semua' : u }); }
  });
  root.addEventListener('keydown', function (ev) {
    var r = ev.target.closest('[data-unit],[data-kat]');
    if (r && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); r.click(); }
  });

  /* ---------- komponen ---------- */
  /* gauge ala speedometer: busur dan jarum naik dari nilai sebelumnya (awal 0), angka ikut menghitung */
  var GC = 100, GY = 100, GR = 80;
  function titik(v, r) { var a = Math.PI * (1 - Math.max(0, Math.min(v, 100)) / 100); return [GC + r * Math.cos(a), GY - r * Math.sin(a)]; }
  function busur(v) { var q = titik(v, GR); return 'M20 ' + GY + ' A80 80 0 0 1 ' + q[0].toFixed(2) + ' ' + q[1].toFixed(2); }
  function gauge(v, col, label, sub) {
    var ticks = '';
    for (var k = 0; k <= 100; k += 10) { var a = titik(k, 60), b = titik(k, k % 50 ? 64 : 68); ticks += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="#B9C7D5" stroke-width="' + (k % 50 ? 1.2 : 2) + '"/>'; }
    return '<div class="aiw-card aiw-gauge" data-v="' + (+v || 0) + '"><svg viewBox="0 0 200 146" role="img" aria-label="' + label + ' ' + PC(v) + '">' +
      '<path d="M20 ' + GY + ' A80 80 0 0 1 180 ' + GY + '" fill="none" stroke="' + C.abu + '" stroke-width="16" stroke-linecap="round"/>' + ticks +
      '<path class="g-arc" d="' + busur(0.01) + '" fill="none" stroke="' + col + '" stroke-width="16" stroke-linecap="round"/>' +
      '<g class="g-ndl" transform="rotate(-90 ' + GC + ' ' + GY + ')"><path d="M' + (GC - 4) + ' ' + GY + ' L' + GC + ' ' + (GY - 62) + ' L' + (GC + 4) + ' ' + GY + ' Z" fill="#132C42"/></g>' +
      '<circle cx="' + GC + '" cy="' + GY + '" r="8" fill="#132C42"/><circle cx="' + GC + '" cy="' + GY + '" r="3" fill="#fff"/>' +
      '<text class="g-num" x="100" y="140" text-anchor="middle" font-size="30" font-weight="700" fill="#132C42">' + PC(0) + '</text></svg>' +
      '<div class="aiw-gl">' + label + '</div><div class="aiw-gs">' + sub + '</div></div>';
  }
  var gaugeLast = {}, gaugeKey = '', animId = 0;
  var diam = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setGauge(el, v) {
    el.querySelector('.g-arc').setAttribute('d', busur(Math.max(0.01, v)));
    el.querySelector('.g-ndl').setAttribute('transform', 'rotate(' + (-90 + 180 * Math.max(0, Math.min(v, 100)) / 100).toFixed(2) + ' ' + GC + ' ' + GY + ')');
    el.querySelector('.g-num').textContent = PC(v);
  }
  function animasiGauge(dari0) {
    var els = [].slice.call(Q('gauges').querySelectorAll('.aiw-gauge')), id = ++animId;
    var awal = els.map(function (el, i) { return dari0 ? 0 : (gaugeLast[i] != null ? gaugeLast[i] : 0); });
    var akhir = els.map(function (el) { return +el.getAttribute('data-v') || 0; });
    akhir.forEach(function (v, i) { gaugeLast[i] = v; });
    if (diam) { els.forEach(function (el, i) { setGauge(el, akhir[i]); }); return; }
    var t0 = null, dur = 1400;
    function step(ts) {
      if (id !== animId) return;
      if (t0 == null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      els.forEach(function (el, i) { setGauge(el, awal[i] + (akhir[i] - awal[i]) * e); });
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  /* jalankan ulang dari 0 setiap kali tab Anggaran dibuka kembali */
  var tadiTersembunyi = false;
  if (window.IntersectionObserver) new IntersectionObserver(function (en) {
    en.forEach(function (x) {
      if (!x.isIntersecting) { if (!root.offsetParent) tadiTersembunyi = true; return; }
      if (tadiTersembunyi) { tadiTersembunyi = false; animasiGauge(true); }
    });
  }).observe(root);
  function donut(rows, total) {
    var R = 70, Cc = 2 * Math.PI * R, off = 0, s = '<svg viewBox="0 0 180 180" role="img" aria-label="' + total + ' kontrak menurut progres fisik">';
    rows.forEach(function (r) {
      if (!r.n) return; var len = r.n / total * Cc;
      s += '<circle cx="90" cy="90" r="' + R + '" fill="none" stroke="' + r.c + '" stroke-width="26" stroke-dasharray="' + Math.max(0, len - 2).toFixed(2) + ' ' + Cc.toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 90 90)"><title>' + r.l + ': ' + r.n + '</title></circle>';
      off += len;
    });
    return s + '<text x="90" y="92" text-anchor="middle" font-size="34" font-weight="700" fill="#132C42">' + total + '</text><text x="90" y="114" text-anchor="middle" font-size="13" fill="#4A5F73">kontrak</text></svg>';
  }
  /* sisa bayar per kontrak menurut kolom rencana bayar/selesai */
  function proyeksi(K) {
    var o = { nov: [0, 0], des: [0, 0], lewat: [0, 0], l2027: [0, 0], lain: [0, 0] };
    K.forEach(function (d) {
      var sisa = ((+d.nilai_rp || 0) - (+d.terbayar_jt || 0) * 1e6) / 1e9; if (sisa <= 0.0005) return;
      var r = String(d.rencana || '').toLowerCase(), k = 'lain';
      if (r.indexOf('luncur') >= 0 || r.indexOf('2027') >= 0) k = 'l2027';
      else { for (var i = 0; i < BL.length; i++) if (r.indexOf(BL[i]) >= 0) { k = i < 10 ? 'lewat' : i === 10 ? 'nov' : 'des'; break; } }
      o[k][0] += sisa; o[k][1]++;
    });
    return o;
  }

  function render() {
    if (root.closest('[hidden]')) return;
    var U = data('ai_unit'); if (!U) return;
    var PG = data('ai_progres') || [], KT = data('ai_kontrak') || [];
    var p = prm();
    var row = function (j, u) { for (var i = 0; i < U.length; i++) if (U[i].jenis === j && U[i].unit === u) return U[i]; return null; };
    var t = row(p.j, p.u);
    var jn = p.j === 'Semua' ? '' : (p.j === 'Murni' ? ' · Murni' : ' · Lanjutan');
    Q('judul').textContent = 'Anggaran Investasi Distribusi 2026 · ' + (t ? RP(t.pagu_miliar) : '—');
    Q('meta').textContent = nama(p.u) + jn + ' · posisi ' + (t ? tgl(t.posisi) : '—') + (t && t.prk_melebihi_pagu ? ' · ' + t.prk_melebihi_pagu + ' PRK terkontrak melebihi pagu' : '');
    if (!t) {
      gaugeKey = '';
      Q('gauges').innerHTML = '<p class="aiw-q">Tidak ada PRK ' + (p.j === 'Luncuran' ? 'lanjutan' : p.j.toLowerCase()) + ' untuk ' + esc(nama(p.u)) + '.</p>';
      Q('bayar').innerHTML = ''; Q('bayar-note').textContent = ''; Q('donut').innerHTML = ''; Q('tahap').innerHTML = '';
    } else {
      var gk = [p.u, p.j, t.pct_kontrak, t.pct_selesai_n, t.pct_bayar].join('|');
      if (gk !== gaugeKey || !Q('gauges').querySelector('.aiw-gauge')) {
        var pertama = !gaugeKey; gaugeKey = gk;
        Q('gauges').innerHTML = gauge(t.pct_kontrak, C.biru, 'Terkontrak', RP(t.terkontrak_miliar) + ' · sisa ' + RP(t.sisa_miliar)) +
          gauge(t.pct_selesai_n, C.tosca, 'Fisik selesai', t.n_selesai + ' dari ' + t.n_kontrak + ' kontrak') +
          gauge(t.pct_bayar, C.petrol, 'Terbayar', RP(t.terbayar_miliar));
        animasiGauge(pertama);
      }

      /* proyeksi pembayaran */
      var K = KT.filter(function (d) { return d.jenis === p.j && (p.u === 'Semua' || d.unit === p.u); });
      var o = proyeksi(K);
      var cols = [['Terbayar', t.terbayar_miliar, C.petrol, 's.d. ' + tgl(t.posisi).replace(/ \d{4}$/, '')], ['Nov', o.nov[0], C.biru, o.nov[1] + ' kontrak'], ['Des', o.des[0], C.biru, o.des[1] + ' kontrak'],
        ['Terlambat', o.lewat[0], C.salmon, o.lewat[1] + ' kontrak'], ['2027', o.l2027[0], C.kuning, o.l2027[1] + ' kontrak']];
      var mx = Math.max.apply(null, cols.map(function (c) { return c[1]; })) || 1;
      Q('bayar').innerHTML = cols.map(function (c) {
        return '<div class="aiw-col" title="' + c[0] + ': ' + RP(c[1]) + '"><b>' + fx(c[1], 1) + '</b><i style="height:calc((100% - 72px) * ' + Math.max(0.01, c[1] / mx).toFixed(3) + ');background:' + c[2] + '"></i><span>' + c[0] + '</span><small>' + c[3] + '</small></div>';
      }).join('');
      var th = t.terbayar_miliar + o.nov[0] + o.des[0];
      Q('bayar-note').innerHTML = 'Bila rencana Nov–Des terealisasi, terbayar 2026 mencapai <b>' + RP(th) + '</b> (' + PC(th / t.pagu_miliar * 100) + ' pagu). ' +
        '<b>Terlambat</b>: rencana bayarnya Januari–Oktober tetapi belum dibayar. <b>2027</b>: rencana bayarnya meluncur.' + (o.lain[1] ? ' ' + o.lain[1] + ' kontrak (' + RP(o.lain[0]) + ') belum punya rencana bayar yang jelas.' : '');

      /* per progres fisik */
      var pr = PG.filter(function (d) { return d.jenis === p.j && d.unit === p.u; });
      var rows = TAHAP.map(function (s) {
        var n = 0, v = 0; pr.forEach(function (d) { if (d.kelompok === s[0]) { n += +d.n || 0; v += +d.nilai_miliar || 0; } });
        return { k: s[0], l: s[1], c: s[2], n: n, v: v };
      }).filter(function (r) { return r.n || r.k !== 'Belum diisi'; });
      var tot = rows.reduce(function (a, r) { return a + r.n; }, 0), mxn = Math.max.apply(null, rows.map(function (r) { return r.n; })) || 1;
      Q('donut').innerHTML = tot ? donut(rows, tot) : '';
      Q('tahap').innerHTML = rows.map(function (r) {
        return '<div class="aiw-tr" data-kat="g:' + esc(r.k) + '" tabindex="0" role="button" aria-label="Lihat ' + r.n + ' kontrak ' + esc(r.l) + '">' +
          '<span class="aiw-tl"><b style="background:' + r.c + '"></b>' + r.l + '</span>' +
          '<span class="aiw-tb"><i style="width:' + (r.n / mxn * 100).toFixed(1) + '%;background:' + r.c + '"></i></span>' +
          '<b class="aiw-tn">' + r.n + '</b><span class="aiw-tv">' + RP(r.v) + '</span></div>';
      }).join('');
    }

    /* per unit untuk status terpilih */
    var us = U.filter(function (d) { return d.jenis === p.j && d.unit !== 'Semua'; }).sort(function (a, b) { return a.pct_bayar - b.pct_bayar; });
    Q('units').innerHTML = us.map(function (d) {
      var on = p.u === d.unit;
      return '<div class="aiw-ur' + (on ? ' on' : '') + '" data-unit="' + esc(d.unit) + '" tabindex="0" role="button" aria-pressed="' + on + '" title="' + esc(nama(d.unit)) + ': fisik selesai ' + PC(d.pct_selesai_n) + ', terbayar ' + PC(d.pct_bayar) + '">' +
        '<span class="aiw-un">' + esc(pendek(d.unit)) + '</span>' +
        '<span class="aiw-ub"><i class="f" style="width:' + Math.min(100, d.n_kontrak ? d.pct_selesai_n : 0) + '%"></i><i class="b" style="width:' + Math.min(100, d.pct_bayar) + '%"></i></span>' +
        '<b>' + PC(d.pct_bayar) + '</b></div>';
    }).join('');

    var nk = t ? t.n_kontrak : 0;
    var nd = document.querySelector('[data-aiw="ndaftar"]'); if (nd) nd.textContent = '(' + nk + ' kontrak)';
  }
  dash.onData(function () { try { render(); } catch (e) { console.error('ai-web: ' + (e.stack || e)); } });
})();
