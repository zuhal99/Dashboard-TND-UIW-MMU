/* Tab Anggaran Operasi versi web: gaya "Tiga Gauge" seperti tab Anggaran Investasi (permintaan Zuhal 27 Nov 2026).
   Menyembunyikan isi lama tab AO lewat ao-web.css, lalu menyisipkan #aow setelah bilah filter. Memakai gaya .aiw-* dari ai-web.css.
   Angka dibaca dari calc halaman (ao_unit, ao_kegiatan) lewat dash.data dan mengikuti filter unit (up3_ao) serta kelompok (ao_kel).
   Tabel rincian per PRK lama dipindah ke <details id="aow-rincian">. */
(function () {
  'use strict';
  var sec = document.getElementById('anggaran-ao');
  var bar = document.getElementById('filter-ao');
  if (!sec || !bar || !window.dash) return;
  document.documentElement.classList.add('aow-on');

  var C = { biru: '#2E75B6', tosca: '#0C9CB4', petrol: '#216279', kuning: '#FFC000', salmon: '#F4625E', muda: '#9CD3E2', abu: '#DCE5EE' };
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var KEL = [['MURNI', 'AO murni 2026'], ['HUTANG USAHA', 'Hutang usaha 2025']];

  function E(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fx(v, d) { return (+v || 0).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function RP(v, d) { return 'Rp ' + fx(v, d == null ? 1 : d) + ' M'; }
  function PC(v) { return v == null || !isFinite(v) ? '—' : fx(v, 1) + '%'; }
  function tgl(s) { var p = String(s || '').split('-'); return p.length === 3 ? +p[2] + ' ' + BLN[+p[1] - 1] + ' ' + p[0] : '—'; }
  function nama(u) { return u === 'Semua' ? 'Semua unit' : (u === 'UIW' || /^UP/.test(u) ? u : 'UP3 ' + u); }
  function prm() { var p = dash.params(); return { u: p.up3_ao || 'Semua', k: p.ao_kel || 'Semua' }; }
  function data(id) { var r = dash.data(id); return r && r.status === 'ok' ? r.data : null; }

  /* ---------- kerangka ---------- */
  var root = E('div', 'aiw aow'); root.id = 'aow';
  root.innerHTML =
    '<div class="aiw-head"><h2 class="aiw-title" data-aow="judul">Anggaran Operasi Pos 53 Distribusi</h2><p class="aiw-meta" data-aow="meta"></p></div>' +
    '<section class="aiw-gauges" data-aow="gauges"></section>' +
    '<section class="aiw-row">' +
    '<div class="aiw-card"><h3>Per unit</h3><p class="aiw-q">Urut dari terbayar terendah. Klik baris untuk memfilter unit.</p>' +
    '<div class="aiw-lg"><span><b style="background:' + C.muda + '"></b>Terkontrak</span><span><b style="background:' + C.petrol + '"></b>Terbayar (angka kanan)</span><span><b style="background:' + C.salmon + '"></b>Melebihi pagu</span></div>' +
    '<div class="aiw-units" data-aow="units"></div></div>' +
    '<div class="aiw-card"><h3>Per kegiatan</h3><p class="aiw-q">Persen terhadap pagu, urut dari pagu terbesar.</p>' +
    '<div class="aiw-lg"><span><b style="background:' + C.muda + '"></b>Terkontrak</span><span><b style="background:' + C.petrol + '"></b>Terbayar (angka kanan)</span></div>' +
    '<div class="aiw-units" data-aow="keg"></div></div></section>' +
    '<section class="aiw-row">' +
    '<div class="aiw-card"><h3>Murni dan hutang usaha</h3><p class="aiw-q">Rp miliar, batang = pagu kelompok. Klik baris untuk memfilter kelompok.</p><div data-aow="kel"></div></div>' +
    '<div class="aiw-card"><h3>Pergeseran pagu</h3><p class="aiw-q">Rp miliar, pagu awal ke Rekomposisi II. Positif: unit menerima tambahan pagu.</p><div data-aow="rekomp"></div></div></section>';
  bar.insertAdjacentElement('afterend', root);
  var Q = function (k) { return root.querySelector('[data-aow="' + k + '"]'); };

  /* tabel rincian per PRK masuk ke details */
  var rinc = document.getElementById('ao-rincian'), det = null;
  if (rinc) {
    det = E('details', 'aiw-det'); det.id = 'aow-rincian';
    det.appendChild(E('summary', null, 'Rincian per PRK <span data-aow="nprk"></span>'));
    rinc.parentNode.insertBefore(det, rinc); det.appendChild(rinc);
    det.addEventListener('toggle', function () { if (det.open) dash.draw(); });
  }
  root.addEventListener('click', function (ev) {
    var r = ev.target.closest('[data-unit]');
    if (r) { var u = r.getAttribute('data-unit'); dash.setParams({ up3_ao: prm().u === u ? 'Semua' : u }); return; }
    var k = ev.target.closest('[data-kel]');
    if (k) { var v = k.getAttribute('data-kel'); dash.setParams({ ao_kel: prm().k === v ? 'Semua' : v }); }
  });
  root.addEventListener('keydown', function (ev) {
    var r = ev.target.closest('[data-unit],[data-kel]');
    if (r && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); r.click(); }
  });

  /* ---------- gauge (sama dengan tab AI) ---------- */
  var GC = 100, GY = 96, GR = 80;
  function busur(v) { var a = Math.PI * (1 - Math.max(0, Math.min(v, 100)) / 100); return 'M20 ' + GY + ' A80 80 0 0 1 ' + (GC + GR * Math.cos(a)).toFixed(2) + ' ' + (GY - GR * Math.sin(a)).toFixed(2); }
  function gauge(v, col, label, sub) {
    return '<div class="aiw-card aiw-gauge" data-v="' + (+v || 0) + '"><svg viewBox="0 0 200 112" role="img" aria-label="' + label + ' ' + PC(v) + '">' +
      '<path d="M20 ' + GY + ' A80 80 0 0 1 180 ' + GY + '" fill="none" stroke="' + C.abu + '" stroke-width="18" stroke-linecap="round"/>' +
      '<path class="g-arc" d="' + busur(0.01) + '" fill="none" stroke="' + col + '" stroke-width="18" stroke-linecap="round"/>' +
      '<text class="g-num" x="100" y="90" text-anchor="middle" font-size="34" font-weight="700" fill="#132C42">' + PC(0) + '</text></svg>' +
      '<div class="aiw-gl">' + label + '</div><div class="aiw-gs">' + sub + '</div></div>';
  }
  var gaugeLast = {}, gaugeKey = '', animId = 0;
  var diam = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setGauge(el, v) {
    el.querySelector('.g-arc').setAttribute('d', busur(Math.max(0.01, v)));
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
  var tadiTersembunyi = true;
  if (window.IntersectionObserver) new IntersectionObserver(function (en) {
    en.forEach(function (x) {
      if (!x.isIntersecting) { if (!root.offsetParent) tadiTersembunyi = true; return; }
      if (tadiTersembunyi && Q('gauges').querySelector('.aiw-gauge')) { tadiTersembunyi = false; animasiGauge(true); }
    });
  }).observe(root);

  /* batang persen terhadap pagu: terkontrak (muda), terbayar (petrol), bagian di atas 100% (salmon), garis 100% */
  function batang(kontrak, bayar, mx) {
    var s = function (v) { return (Math.max(0, v) / mx * 100).toFixed(2) + '%'; };
    return '<span class="aiw-ub"><i class="f" style="width:' + s(Math.min(100, kontrak)) + '"></i>' +
      (kontrak > 100 ? '<i class="x" style="left:' + s(100) + ';width:' + s(kontrak - 100) + '"></i>' : '') +
      '<i class="b" style="width:' + s(Math.min(bayar, mx)) + '"></i>' +
      (mx > 100 ? '<em style="left:' + s(100) + '"></em>' : '') + '</span>';
  }

  function render() {
    if (root.closest('[hidden]')) return;
    var U = data('ao_unit'); if (!U) return;
    var KG = data('ao_kegiatan') || [];
    var p = prm();
    var row = function (u, k) { for (var i = 0; i < U.length; i++) if (U[i].unit === u && U[i].kelompok === k) return U[i]; return null; };
    var t = row(p.u, p.k);
    var kn = p.k === 'MURNI' ? ' · AO murni' : p.k === 'HUTANG USAHA' ? ' · Hutang usaha' : '';
    Q('judul').textContent = 'Anggaran Operasi Pos 53 Distribusi 2026 · ' + (t ? RP(t.pagu_miliar, 2) : '—');
    Q('meta').innerHTML = esc(nama(p.u)) + kn + ' · posisi ' + (t ? tgl(t.posisi) : '—') + ' · pagu setelah Rekomposisi II' +
      (t && t.prk_melebihi_pagu ? ' · <span class="aow-over">' + t.prk_melebihi_pagu + ' PRK terkontrak melebihi pagu</span>' : '');
    if (!t) {
      gaugeKey = '';
      Q('gauges').innerHTML = '<p class="aiw-q">Tidak ada PRK untuk pilihan ini.</p>';
    } else {
      var pkb = t.terkontrak_miliar ? t.terbayar_miliar / t.terkontrak_miliar * 100 : 0;
      var gk = [p.u, p.k, t.pct_kontrak, t.pct_bayar, pkb.toFixed(1)].join('|');
      if (gk !== gaugeKey || !Q('gauges').querySelector('.aiw-gauge')) {
        var pertama = !gaugeKey; gaugeKey = gk;
        Q('gauges').innerHTML = gauge(t.pct_kontrak, C.biru, 'Terkontrak', RP(t.terkontrak_miliar) + ' · sisa ' + RP(t.sisa_miliar)) +
          gauge(t.pct_bayar, C.petrol, 'Terbayar', RP(t.terbayar_miliar) + ' dari pagu') +
          gauge(pkb, C.tosca, 'Kontrak sudah dibayar', 'belum dibayar ' + RP(Math.max(0, t.terkontrak_miliar - t.terbayar_miliar)));
        animasiGauge(pertama);
      }
    }

    /* per unit */
    var us = U.filter(function (d) { return d.kelompok === p.k && d.unit !== 'Semua' && d.pagu_miliar > 0; }).sort(function (a, b) { return a.pct_bayar - b.pct_bayar; });
    var mxu = Math.max(100, Math.max.apply(null, us.map(function (d) { return d.pct_kontrak; }).concat([0])));
    Q('units').innerHTML = us.map(function (d) {
      var on = p.u === d.unit;
      return '<div class="aiw-ur' + (on ? ' on' : '') + '" data-unit="' + esc(d.unit) + '" tabindex="0" role="button" aria-pressed="' + on + '" title="' + esc(nama(d.unit)) + ': pagu ' + RP(d.pagu_miliar, 2) + ', terkontrak ' + PC(d.pct_kontrak) + ', terbayar ' + PC(d.pct_bayar) + '">' +
        '<span class="aiw-un">' + esc(d.unit === 'UP3B Maluku' ? 'UP3B' : d.unit) + '</span>' + batang(d.pct_kontrak, d.pct_bayar, mxu) +
        '<b>' + PC(d.pct_bayar) + '</b></div>';
    }).join('') || '<p class="aiw-q">Tidak ada data.</p>';

    /* per kegiatan */
    var kg = KG.filter(function (d) { return d.up3 === p.u && d.kelompok === p.k && d.pagu_miliar > 0; }).sort(function (a, b) { return b.pagu_miliar - a.pagu_miliar; });
    var mxk = Math.max(100, Math.max.apply(null, kg.map(function (d) { return d.pct_kontrak; }).concat([0])));
    Q('keg').innerHTML = kg.map(function (d) {
      return '<div class="aiw-ur aow-kr" title="' + esc(d.kegiatan) + ': pagu ' + RP(d.pagu_miliar, 2) + ', terkontrak ' + PC(d.pct_kontrak) + ', terbayar ' + PC(d.pct_bayar) + '">' +
        '<span class="aiw-un">' + esc(d.kegiatan) + '<small>' + RP(d.pagu_miliar) + '</small></span>' + batang(d.pct_kontrak, d.pct_bayar, mxk) +
        '<b' + (d.pct_kontrak > 100 ? ' class="aow-merah"' : '') + '>' + PC(d.pct_bayar) + '</b></div>';
    }).join('') || '<p class="aiw-q">Tidak ada kegiatan untuk pilihan ini.</p>';

    /* murni dan hutang usaha: batang bertumpuk terbayar / terkontrak belum dibayar / sisa pagu */
    var ks = KEL.map(function (k) { return { k: k[0], l: k[1], d: row(p.u, k[0]) }; }).filter(function (x) { return x.d && x.d.pagu_miliar > 0; });
    Q('kel').innerHTML = ks.length ? '<div class="aiw-lg"><span><b style="background:' + C.petrol + '"></b>Terbayar</span><span><b style="background:' + C.muda + '"></b>Terkontrak, belum dibayar</span><span><b style="background:' + C.abu + '"></b>Sisa pagu</span></div>' +
      ks.map(function (x) {
        var d = x.d, on = p.k === x.k, sk = Math.max(d.pagu_miliar, d.terkontrak_miliar), w = function (v) { return (Math.max(0, v) / sk * 100).toFixed(2) + '%'; };
        return '<div class="aow-kel' + (on ? ' on' : '') + '" data-kel="' + x.k + '" tabindex="0" role="button" aria-pressed="' + on + '">' +
          '<div class="aow-kh"><b>' + x.l + '</b><span>pagu ' + RP(d.pagu_miliar) + ' · terbayar ' + PC(d.pct_bayar) + '</span></div>' +
          '<div class="aow-kb"><i style="width:' + w(d.terbayar_miliar) + ';background:' + C.petrol + '"></i><i style="width:' + w(d.terkontrak_miliar - d.terbayar_miliar) + ';background:' + C.muda + '"></i><i style="width:' + w(d.sisa_miliar) + ';background:' + C.abu + '"></i></div>' +
          '<div class="aow-kv"><span>Terbayar <b>' + fx(d.terbayar_miliar, 1) + '</b></span><span>Belum dibayar <b>' + fx(d.terkontrak_miliar - d.terbayar_miliar, 1) + '</b></span><span>Sisa <b' + (d.sisa_miliar < -0.05 ? ' class="aow-merah"' : '') + '>' + fx(Math.abs(d.sisa_miliar) < 0.05 ? 0 : d.sisa_miliar, 1) + '</b></span></div></div>';
      }).join('') : '<p class="aiw-q">Tidak ada data.</p>';

    /* pergeseran pagu per unit (diverging) */
    var rk = U.filter(function (d) { return d.kelompok === p.k && d.unit !== 'Semua' && (d.pagu_miliar > 0 || d.pagu_awal_miliar > 0); }).sort(function (a, b) { return a.rekomposisi_miliar - b.rekomposisi_miliar; });
    var mxr = Math.max.apply(null, rk.map(function (d) { return Math.abs(d.rekomposisi_miliar); }).concat([0.001]));
    Q('rekomp').innerHTML = rk.map(function (d) {
      var v = d.rekomposisi_miliar, w = (Math.abs(v) / mxr * 50).toFixed(2);
      return '<div class="aow-rr' + (p.u === d.unit ? ' on' : '') + '" data-unit="' + esc(d.unit) + '" tabindex="0" role="button" title="' + esc(nama(d.unit)) + ': pagu awal ' + RP(d.pagu_awal_miliar, 2) + ', Rekomposisi II ' + RP(d.pagu_miliar, 2) + '">' +
        '<span class="aiw-un">' + esc(d.unit === 'UP3B Maluku' ? 'UP3B' : d.unit) + '</span>' +
        '<span class="aow-rt"><i style="' + (v < 0 ? 'right:50%' : 'left:50%') + ';width:' + w + '%;background:' + (v < 0 ? C.salmon : C.biru) + '"></i></span>' +
        '<b>' + (v > 0 ? '+' : v < 0 ? '−' : '') + fx(Math.abs(v), 2) + '</b></div>';
    }).join('') || '<p class="aiw-q">Tidak ada data.</p>';

    var R = data('ao_rincian') || [];
    var np = R.filter(function (d) { return (p.u === 'Semua' || d.unit === p.u) && (p.k === 'Semua' || d.kelompok === p.k); }).length;
    var nd = Q('nprk') || document.querySelector('[data-aow="nprk"]'); if (nd) nd.textContent = '(' + np + ' PRK, Rp juta)';
  }
  dash.onData(function () { try { render(); } catch (e) { console.error('ao-web: ' + (e.stack || e)); } });
})();
