/* Tab Kinerja Ophardist versi web: Konsep 3 "Analisis Gangguan" (pilihan Zuhal 28 Nov 2026).
   Konsep: /mnt/project-files/kinerja/ophardist/konsep/. Dipasang build_web.py.
   Menambah <section id="ophardist" data-hal="Ophardist"> dan melepas Ophardist dari section #kinerja (pola sama dengan transmisi-web.js).
   Angka dari dataset kinerja (OP01 SAIDI, OP02 SAIFI, OP05 penurunan gangguan penyulang; capaian sama dengan tabel kinerja)
   dan penurunan_gangguan (jumlah gangguan per jenis per bulan, target UIW). Filter unit grafik memakai param up3_oph. */
(function () {
  'use strict';
  var kin = document.getElementById('kinerja');
  if (!kin || !window.dash) return;
  kin.setAttribute('data-hal', (kin.getAttribute('data-hal') || '').split(' ').filter(function (h) { return h !== 'Ophardist'; }).join(' '));
  var sec = document.createElement('section'); sec.className = 'td-panel'; sec.id = 'ophardist'; sec.setAttribute('data-hal', 'Ophardist'); sec.hidden = true;
  kin.parentNode.insertBefore(sec, kin.nextSibling);
  var root = document.createElement('div'); root.className = 'kb o3'; sec.appendChild(root);
  var SAIDI = 'https://docs.google.com/spreadsheets/d/17_MtAtqcKHfNLopKtUFaxWnqSHwUdM-o-fsfp08ZhmM/edit#gid=1970518530';
  var APKT = 'https://docs.google.com/spreadsheets/d/1rzEIhx2K2B3JArbKAz4K7GpCdYYBlkwqAtHXSMYgvuc/edit';
  var UNIT = ['Ambon', 'Masohi', 'Saumlaki', 'Sofifi', 'Ternate', 'Tobelo', 'Tual', 'UIW'], JNS = ['Permanen', 'Sementara', 'Cleansing', 'Logsheet'];
  function raw(id) { var r = dash.data(id); return r && r.status === 'ok' ? r.data : null; }

  /* susun data seperti konsep (skrip/prep.py): per KPI x unit kum, tgt, bul, tbul, cap (indeks bulan 0..11) */
  var cache = null;
  function susun() {
    var kr = raw('kinerja'), pr = raw('penurunan_gangguan'); if (!kr || !pr) return null; if (cache && cache.kr === kr && cache.pr === pr) return cache.D;
    var KK = { OP01: 'saidi', OP02: 'saifi', OP05: 'gg' }, D = { unit: UNIT, bln: 0, jenis: {}, r25: [] }, i, m;
    for (i = 0; i < 12; i++) D.r25[i] = null;
    function kos() { var a = []; for (var j = 0; j < 12; j++) a[j] = null; return a; }
    ['saidi', 'saifi', 'gg'].forEach(function (k) { D[k] = {}; UNIT.forEach(function (u) { D[k][u] = { kum: kos(), tgt: kos(), bul: kos(), tbul: kos(), cap: kos(), pct: kos() }; }); });
    kr.forEach(function (r) { var k = KK[r.kode_kpi]; if (!k || r.sub_bidang !== 'Ophardist' || !D[k][r.up3] || !/^2026-\d\d$/.test(r.periode) || r.realisasi === '' || r.target === '') return;
      var m = +r.periode.slice(5) - 1, d = D[k][r.up3]; d.kum[m] = +r.realisasi; d.tgt[m] = +r.target; if (k === 'gg' && r.up3 === 'UIW') d.pct[m] = +r.realisasi; if (m + 1 > D.bln) D.bln = m + 1; });
    if (!D.bln) return null;
    var M = D.bln;
    UNIT.forEach(function (u) { D.jenis[u] = {}; JNS.forEach(function (j) { D.jenis[u][j] = kos(); }); });
    pr.forEach(function (r) { if (!/^2026-\d\d$/.test(r.periode)) return; var m = +r.periode.slice(5) - 1, v = +r.jumlah;
      if (r.up3 === 'UIW') { if (r.jenis === 'Realisasi 2025 kumulatif') D.r25[m] = v; return; }
      if (m >= M || !D.jenis[r.up3] || !D.jenis[r.up3][r.jenis]) return;
      [r.up3, 'UIW'].forEach(function (u) { var a = D.jenis[u][r.jenis]; a[m] = (a[m] || 0) + v; }); });
    /* UIW penurunan gangguan: realisasi = jumlah gangguan ketujuh UP3 (kali), target = jumlah target UP3; capaian tetap dari sheet (penurunan % / 5%) */
    var g = D.gg.UIW, s = 0;
    for (m = 0; m < M; m++) { s += JNS.reduce(function (a, j) { return a + (D.jenis.UIW[j][m] || 0); }, 0); g.kum[m] = s;
      g.tgt[m] = UNIT.slice(0, 7).reduce(function (a, u) { return a + (D.gg[u].tgt[m] || 0); }, 0); }
    ['saidi', 'saifi', 'gg'].forEach(function (k) { UNIT.forEach(function (u) { var d = D[k][u];
      for (var m = 0; m < M; m++) { if (d.kum[m] == null || !d.tgt[m]) continue; var p = m ? d.kum[m - 1] : 0, pt = m ? d.tgt[m - 1] : 0;
        d.bul[m] = d.kum[m] - (p || 0); d.tbul[m] = d.tgt[m] - (pt || 0);
        d.cap[m] = Math.round(((k === 'gg' && u === 'UIW') ? (d.pct[m] == null ? null : d.pct[m] / 5) : 2 - d.kum[m] / d.tgt[m]) * 1000) / 10; } }); });
    cache = { kr: kr, pr: pr, D: D, B: null }; return D; }

  function mkB(D) {
  var BL = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  var BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var C = { biru: '#2E75B6', tosca: '#0C9CB4', petrol: '#216279', kuning: '#FFC000', salmon: '#F4625E', muda: '#9CD3E2', abu: '#E6EDF3', hijau: '#2E9D5B', ungu: '#B740DC' };
  var K = {
    saidi: { n: 'SAIDI', s: 'menit/plg', w: C.biru, d: 2, ket: 'Lama padam rata-rata per pelanggan' },
    saifi: { n: 'SAIFI', s: 'kali/plg', w: C.tosca, d: 3, ket: 'Frekuensi padam rata-rata per pelanggan' },
    gg: { n: 'Penurunan gangguan', s: 'kali', w: C.petrol, d: 0, ket: 'Gangguan penyulang (kumulatif)' } };
  var ORD = ['saidi', 'saifi', 'gg'], JN = ['Permanen', 'Sementara', 'Cleansing', 'Logsheet'], JW = [C.salmon, C.kuning, C.tosca, C.ungu];
  function fx(v, d) { return v == null ? '—' : (+v).toLocaleString('id-ID', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function val(k, v) { return fx(v, K[k].d) + ' ' + K[k].s; }
  function pc(v) { return v == null ? '—' : fx(v, 1) + '%'; }
  function st(v) { return v == null ? C.abu : v >= 100 ? C.hijau : v >= 95 ? C.kuning : C.salmon; }
  function nama(u) { return u === 'UIW' ? 'UIW MMU' : 'UP3 ' + u; }
  var M = D.bln - 1, UP = D.unit.filter(function (u) { return u !== 'UIW'; });
  function g(k, u) { return D[k][u]; }
  function capNow(k, u) { return g(k, u).cap[M]; }
  /* teks realisasi vs target; UIW penurunan gangguan mengikuti sheet (% turun terhadap 2025) */
  function rt(k, u, m) { m = m == null ? M : m; var d = g(k, u);
    if (k === 'gg' && u === 'UIW') return 'turun ' + fx(d.pct[m], 2) + '% dari 2025 · target turun 5%';
    return val(k, d.kum[m]) + ' · target ' + val(k, d.tgt[m]); }

  function gauge(v, col, sz) {
    var R = 80, L = Math.PI * R, f = Math.max(0, Math.min(v || 0, 100)) / 100 * L;
    return '<svg viewBox="0 0 200 118" class="kb-gauge"' + (sz ? ' style="max-width:' + sz + 'px"' : '') + '><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="' + C.abu + '" stroke-width="20" stroke-linecap="round"/>' +
      '<path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="' + col + '" stroke-width="20" stroke-linecap="round" class="kb-arc" style="--l:' + L.toFixed(1) + ';--f:' + f.toFixed(1) + '" stroke-dasharray="0 ' + L.toFixed(1) + '"/>' +
      '<text x="100" y="96" text-anchor="middle" font-size="31" font-weight="700" fill="#132C42" class="kb-num" data-n="' + (v || 0) + '">' + pc(v) + '</text></svg>'; }
  function ring(v, col, sz, fs) {
    var R = 34, L = 2 * Math.PI * R, f = Math.max(0, Math.min(v || 0, 100)) / 100 * L;
    return '<svg viewBox="0 0 88 88" width="' + sz + '" height="' + sz + '" class="kb-ring"><circle cx="44" cy="44" r="' + R + '" fill="none" stroke="' + C.abu + '" stroke-width="10"/>' +
      '<circle cx="44" cy="44" r="' + R + '" fill="none" stroke="' + col + '" stroke-width="10" stroke-linecap="round" transform="rotate(-90 44 44)" class="kb-arc" style="--l:' + L.toFixed(1) + ';--f:' + f.toFixed(1) + '" stroke-dasharray="0 ' + L.toFixed(1) + '"/>' +
      '<text x="44" y="' + (44 + (fs || 16) * .35) + '" text-anchor="middle" font-size="' + (fs || 16) + '" font-weight="700" fill="#132C42" class="kb-num" data-n="' + (v || 0) + '">' + pc(v) + '</text></svg>'; }
  /* skala sumbu Y: langkah 1/2/2,5/5 x 10^n untuk sekitar 4 garis, puncak = kelipatan langkah terdekat di atas nilai tertinggi */
  function nice(mx) { if (!(mx > 0)) return { mx: 1, n: 4 }; var rs = mx / 4, e = Math.pow(10, Math.floor(Math.log10(rs))), q = rs / e, st = (q <= 1 ? 1 : q <= 2 ? 2 : q <= 2.5 ? 2.5 : q <= 5 ? 5 : 10) * e, n = Math.ceil(mx / st - 1e-9); return { mx: n * st, n: n }; }
  function ylab(k, v) { return k === 'saifi' ? fx(v, v < 1 && v ? 2 : 1) : fx(v, v % 1 ? 1 : 0); }

  /* grafik: o.mode 'kum' = garis kumulatif + target; 'bul' = kolom per bulan + target bulanan; 'jenis' = kolom bertumpuk per jenis gangguan */
  function chart(k, u, o) {
    o = o || {}; var mode = o.mode || 'kum', hp = window.innerWidth < 700, d = g(k, u), W = hp ? 380 : 640, H = hp ? 250 : (o.h || 280), P = { l: hp ? 40 : 46, r: 10, t: 26, b: 30 }, w = W - P.l - P.r, h = H - P.t - P.b, bw = w / 12;
    var ys = mode === 'kum' ? d.kum : d.bul, tg = mode === 'kum' ? d.tgt : d.tbul;
    if (k === 'gg' && u === 'UIW' && mode !== 'kum') tg = D.r25.map(function (x, i) { return x == null ? null : x - (i ? D.r25[i - 1] : 0); });
    var mx = 0; ys.concat(tg).forEach(function (x) { if (x != null && x > mx) mx = x; }); var sk = nice(mx * 1.06); mx = sk.mx;
    var Y = function (v) { return P.t + h - v / mx * h; }, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="kb-chart">';
    for (var i = 0; i <= sk.n; i++) { var gv = mx * i / sk.n; s += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + Y(gv) + '" y2="' + Y(gv) + '" stroke="#EEF2F6"/><text x="' + (P.l - 8) + '" y="' + (Y(gv) + 4) + '" text-anchor="end" font-size="12" fill="#7D8FA0">' + ylab(k, gv) + '</text>'; }
    if (mode === 'jenis') { var J = D.jenis[u];
      for (var m = 0; m <= M; m++) { var y0 = P.t + h, x = P.l + m * bw + bw * .18;
        JN.forEach(function (j, ji) { var v = J[j][m] || 0; if (!v) return; var hh = v / mx * h; y0 -= hh;
          s += '<rect class="kb-col" data-m="' + m + '" x="' + x + '" y="' + y0 + '" width="' + bw * .64 + '" height="' + hh + '" fill="' + JW[ji] + '" style="--d:' + m * 40 + 'ms"/>'; }); }
      /* area klik satu bulan penuh (kolom + label bulan): membuka rincian per UP3 per jenis gangguan */
      for (m = 0; m <= M; m++) s += '<rect class="kb-click opw-hit" data-m="' + m + '" data-jenis="1" x="' + (P.l + m * bw) + '" y="' + P.t + '" width="' + bw + '" height="' + (h + P.b) + '" rx="6"><title>' + BLN[m] + ': rincian per UP3</title></rect>'; }
    else if (mode === 'bul') ys.forEach(function (v, i) { if (v == null) return; var x = P.l + i * bw + bw * .18, y = Y(v);
      s += '<rect class="kb-col kb-click" data-m="' + i + '" x="' + x + '" y="' + y + '" width="' + bw * .64 + '" height="' + (P.t + h - y) + '" rx="5" fill="' + (tg[i] != null && v > tg[i] ? C.salmon : K[k].w) + '" style="--d:' + i * 40 + 'ms"/>'; });
    else { var pt = []; ys.forEach(function (v, i) { if (v != null) pt.push([P.l + i * bw + bw / 2, Y(v), i]); });
      s += '<path class="kb-line" d="M' + pt.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + '" fill="none" stroke="' + K[k].w + '" stroke-width="4" stroke-linejoin="round" pathLength="1"/>';
      pt.forEach(function (p) { s += '<circle class="kb-dot kb-click" data-m="' + p[2] + '" cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="#fff" stroke="' + K[k].w + '" stroke-width="3"/>'; }); }
    var tp = tg.map(function (v, i) { return v == null ? null : (P.l + i * bw + bw / 2).toFixed(1) + ' ' + Y(v).toFixed(1); }).filter(Boolean);
    s += '<path d="M' + tp.join(' L') + '" fill="none" stroke="' + C.kuning + '" stroke-width="3" stroke-dasharray="7 6"/>';
    BL.forEach(function (b, i) { s += '<text x="' + (P.l + i * bw + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="' + (hp ? 11 : 12.5) + '" fill="' + (i <= M ? '#4A5F73' : '#B4C1CD') + '">' + b + '</text>'; });
    var lv = mode === 'jenis' ? d.bul[M] : ys[M]; if (lv != null) s += '<text x="' + (P.l + M * bw + bw / 2) + '" y="' + (Y(lv) - 12) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#132C42">' + fx(lv, mode === 'kum' || k === 'gg' ? K[k].d : K[k].d) + '</text>';
    return s + '</svg>'; }
  function legend(k, mode, u) {
    if (mode === 'jenis') return '<div class="kb-lg">' + JN.map(function (j, i) { return '<span><b style="background:' + JW[i] + '"></b>' + j + '</span>'; }).join('') + '<span><b class="t"></b>' + 'Target' + '</span></div>';
    return '<div class="kb-lg"><span><b style="background:' + K[k].w + '"></b>' + (mode === 'bul' ? 'Realisasi per bulan' : 'Realisasi kumulatif') + '</span>' + (mode === 'bul' ? '<span><b style="background:' + C.salmon + '"></b>Melebihi target bulan itu</span>' : '') + '<span><b class="t"></b>' + 'Target' + '</span></div>'; }

  function laci(judul, sub, html) {
    var o = document.getElementById('kb-laci'); if (!o) { o = document.createElement('div'); o.id = 'kb-laci'; document.body.appendChild(o);
      o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('.kb-x')) o.classList.remove('on'); }); }
    o.innerHTML = '<div class="kb-lc"><div class="kb-lh"><div><h3>' + judul + '</h3><p>' + sub + '</p></div><button class="kb-x" type="button" aria-label="Tutup">×</button></div><div class="kb-lb">' + html + '</div></div>';
    requestAnimationFrame(function () { o.classList.add('on'); animasi(o); }); }
  function komposisi(u) { var J = D.jenis[u], t = JN.map(function (j) { var s = 0; for (var i = 0; i <= M; i++) s += J[j][i] || 0; return s; }), tot = t.reduce(function (a, b) { return a + b; }, 0);
    return '<p class="kb-sm">Jenis gangguan Januari s.d. ' + BLN[M] + ' (' + fx(tot) + ' kali)</p><div class="kb-split">' + t.map(function (v, i) { return v ? '<span style="flex:' + v + ';background:' + JW[i] + '"></span>' : ''; }).join('') + '</div><div class="kb-lg">' +
      t.map(function (v, i) { return '<span><b style="background:' + JW[i] + '"></b>' + JN[i] + ' ' + fx(v) + '</span>'; }).join('') + '</div>'; }
  function tabelUnit(k, u) { var d = g(k, u), dd = K[k].d, ui = k === 'gg' && u === 'UIW';
    var r = '<table class="kb-t"><thead><tr><th>Bulan</th><th>Per bulan</th><th>Kumulatif</th><th>' + (ui ? 'Turun dari 2025' : 'Target') + '</th><th>Capaian</th></tr></thead><tbody>';
    for (var i = 0; i <= M; i++) r += '<tr><td>' + BLN[i] + '</td><td>' + fx(d.bul[i], dd) + '</td><td>' + fx(d.kum[i], dd) + '</td><td>' + (ui ? fx(d.pct[i], 2) + '%' : fx(d.tgt[i], dd)) + '</td><td><i class="kb-pil" style="background:' + st(d.cap[i]) + '">' + pc(d.cap[i]) + '</i></td></tr>';
    return r + '</tbody></table>'; }
  function tabelBulan(k, m) { var dd = K[k].d;
    var r = '<table class="kb-t"><thead><tr><th>Unit</th><th>Per bulan</th><th>Kumulatif</th><th>Target</th><th>Capaian</th></tr></thead><tbody>';
    D.unit.forEach(function (u) { var d = g(k, u); r += '<tr' + (u === 'UIW' ? ' class="kb-tot"' : '') + '><td>' + nama(u) + '</td><td>' + fx(d.bul[m], dd) + '</td><td>' + fx(d.kum[m], dd) + '</td><td>' + (k === 'gg' && u === 'UIW' ? 'turun 5%' : fx(d.tgt[m], dd)) + '</td><td><i class="kb-pil" style="background:' + st(d.cap[m]) + '">' + pc(d.cap[m]) + '</i></td></tr>'; });
    return r + '</tbody></table>'; }
  function bukaUnit(k, u) { var d = g(k, u); laci(K[k].n + ' · ' + nama(u), rt(k, u) + ' · capaian ' + pc(d.cap[M]),
    (k === 'gg' ? komposisi(u) : '') + '<div class="kb-lchart">' + chart(k, u, { h: 220, mode: 'bul' }) + '</div>' + legend(k, 'bul', u) + tabelUnit(k, u)); }
  /* rincian satu bulan: gangguan per UP3 per jenis, dibanding target bulan itu (UIW: target UIW bulan itu) */
  function bukaJenis(m) { var J = D.jenis, r25 = D.r25[m] - (m ? D.r25[m - 1] : 0);
    var r = '<div class="opw-sc"><table class="kb-t opw-jt"><thead><tr><th>Unit</th>' + JN.map(function (j, i) { return '<th><i class="opw-dt" style="background:' + JW[i] + '"></i><span class="opw-pj">' + j + '</span><span class="opw-pk">' + ['Perm', 'Smtr', 'Clns', 'Logs'][i] + '</span></th>'; }).join('') + '<th>Total</th><th>Target</th></tr></thead><tbody>';
    var rows = UP.map(function (u) { var t = JN.reduce(function (a, j) { return a + (J[u][j][m] || 0); }, 0); return { u: u, t: t, tg: D.gg[u].tbul[m] }; }).sort(function (a, b) { return b.t - a.t; });
    rows.push({ u: 'UIW', t: JN.reduce(function (a, j) { return a + (J.UIW[j][m] || 0); }, 0), tg: r25 });
    rows.forEach(function (x) { var lebih = x.tg != null && x.t > x.tg;
      r += '<tr' + (x.u === 'UIW' ? ' class="kb-tot"' : '') + '><td>' + (x.u === 'UIW' ? 'UIW MMU' : x.u) + '<span class="opw-mb">' + JN.map(function (j, i) { var v = J[x.u][j][m] || 0; return v ? '<i style="flex:' + v + ';background:' + JW[i] + '"></i>' : ''; }).join('') + '</span></td>' +
        JN.map(function (j) { var v = J[x.u][j][m] || 0; return '<td' + (v ? '' : ' class="opw-0"') + '>' + fx(v) + '</td>'; }).join('') +
        '<td><b' + (lebih ? ' class="opw-up"' : '') + '>' + fx(x.t) + '</b></td><td class="opw-tg">' + (x.tg == null ? '—' : fx(x.tg)) + '' + '</td></tr>'; });
    r += '</tbody></table></div>';
    var nav = '<div class="opw-nav">' + (m > 0 ? '<button type="button" class="opw-jm" data-jm="' + (m - 1) + '">‹ ' + BLN[m - 1] + '</button>' : '<span></span>') + (m < M ? '<button type="button" class="opw-jm" data-jm="' + (m + 1) + '">' + BLN[m + 1] + ' ›</button>' : '<span></span>') + '</div>';
    laci('Gangguan penyulang · ' + BLN[m] + ' 2026', '', nav + r); }
  function bukaBulan(k, m) { laci(K[k].n + ' · ' + BLN[m] + ' 2026', 'Nilai per unit pada bulan ini', tabelBulan(k, m)); }

  function animasi(root) {
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      root.querySelectorAll('.kb-arc').forEach(function (a) { a.setAttribute('stroke-dasharray', a.style.getPropertyValue('--f') + ' ' + a.style.getPropertyValue('--l')); });
      root.querySelectorAll('[data-w]').forEach(function (b) { b.style.width = b.getAttribute('data-w'); });
      root.classList.add('kb-go');
      root.querySelectorAll('.kb-num').forEach(function (t) { var n = +t.getAttribute('data-n'), t0 = performance.now(), dur = 900;
        (function f(now) { var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); t.textContent = pc(n * e); if (p < 1) requestAnimationFrame(f); })(t0); });
    }); }); }
  function chips(sel) { return '<div class="kb-chips" role="group" aria-label="Pilih unit">' + ['UIW'].concat(UP).map(function (u) { return '<button type="button" class="kb-chip' + (u === sel ? ' on' : '') + '" data-u="' + u + '" aria-pressed="' + (u === sel) + '">' + (u === 'UIW' ? 'Semua UP3' : u) + '</button>'; }).join('') + '</div>'; }
      return { D: D, K: K, C: C, ORD: ORD, JN: JN, JW: JW, BL: BL, BLN: BLN, M: M, UP: UP, fx: fx, val: val, pc: pc, st: st, nama: nama, g: g, capNow: capNow, rt: rt, gauge: gauge, ring: ring, chart: chart, legend: legend, laci: laci, bukaUnit: bukaUnit, bukaBulan: bukaBulan, bukaJenis: bukaJenis, animasi: animasi, chips: chips, komposisi: komposisi };
  }
  function kepala(sub) { return '<div class="kb-head"><div><h2>Kinerja Ophardist 2026</h2><p>' + sub + '</p></div><div class="kb-ups"><a class="kp-upbtn" href="' + SAIDI + '" target="_blank" rel="noopener noreferrer">SAIDI SAIFI <span aria-hidden="true">↗</span></a><a class="kp-upbtn" href="' + APKT + '" target="_blank" rel="noopener noreferrer">Gangguan APKT <span aria-hidden="true">↗</span></a></div></div>'; }

  var B = null, s = { u: 'UIW' }, jejak = '';
  function render() {
    var M = B.M, u = s.u, J = B.D.jenis; if (!J[u]) u = s.u = 'UIW';
    root.dataset.k = 'gg';
    var tiles = B.ORD.map(function (k) { var c = B.capNow(k, 'UIW'); return '<button type="button" class="kb-card o3-t kb-click" data-unit="UIW" data-kk="' + k + '" aria-label="' + B.K[k].n + ' UIW, capaian ' + B.pc(c) + '">' + B.gauge(c, B.st(c), 220) + '<b>' + B.K[k].n + '</b><span>' + B.rt(k, 'UIW') + '</span></button>'; }).join('');
    var mat = '<table class="o3-m"><thead><tr><th>Unit</th>' + B.ORD.map(function (k) { return '<th>' + B.K[k].n.replace('Penurunan gangguan', 'Gangguan') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      B.D.unit.map(function (x) { return '<tr' + (x === 'UIW' ? ' class="kb-tot"' : '') + '><td>' + (x === 'UIW' ? 'UIW MMU' : x) + '</td>' + B.ORD.map(function (k) { var c = B.capNow(k, x);
        return '<td><button type="button" class="o3-cell kb-click" data-unit="' + x + '" data-kk="' + k + '" style="--c:' + B.st(c) + '">' + B.pc(c) + '</button></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    var lonj = B.UP.map(function (x) { var b = B.g('gg', x).bul, av = 0; for (var i = 0; i < M; i++) av += b[i]; av /= M; return { u: x, b: b[M], av: av, r: b[M] / av, se: J[x].Sementara[M] || 0 }; }).sort(function (a, b) { return b.r - a.r; });
    var jt = B.UP.map(function (x) { var t = B.JN.map(function (j) { var a = 0; for (var i = 0; i <= M; i++) a += J[x][j][i] || 0; return a; }); return { u: x, t: t, n: t.reduce(function (a, b) { return a + b; }, 0) }; }).sort(function (a, b) { return b.n - a.n; }), mxn = jt[0].n;
    root.innerHTML = kepala('Data s.d. ' + B.BLN[M] + ' 2026 · analisis gangguan penyulang') +
      '<div class="o3-ts">' + tiles + '</div>' +
      '<div class="o3-row"><div class="kb-card"><h3>Matriks capaian</h3><p class="kb-q">Unit × KPI s.d. ' + B.BLN[M] + '. Klik sel untuk rincian bulanan.</p>' + mat +
        '<div class="kb-lg"><span><b style="background:#2E9D5B"></b>≥ 100%</span><span><b style="background:#FFC000"></b>95 s.d. &lt; 100%</span><span><b style="background:#F4625E"></b>&lt; 95%</span></div></div>' +
      '<div class="kb-card" data-k="gg"><h3>Gangguan penyulang per bulan</h3><p class="kb-q">Menurut jenis. Garis putus = target per bulan. Klik bulan untuk rincian per UP3.</p>' + B.chips(u) + B.chart('gg', u, { h: 270, mode: 'jenis' }) + B.legend('gg', 'jenis', u) + '</div></div>' +
      '<div class="o3-row"><div class="kb-card"><h3>Gangguan ' + B.BLN[M] + ' dibanding rata-rata Jan–' + B.BL[M - 1] + '</h3><p class="kb-q">Diurutkan dari kenaikan terbesar.</p>' +
        lonj.map(function (r) { var up = r.r > 1.5; return '<div class="o3-l kb-click" data-unit="' + r.u + '" data-kk="gg"><span>' + r.u + '</span><div><b>' + B.fx(r.b) + '</b> kali <small>rata-rata ' + B.fx(r.av, 1) + ' · sementara ' + r.se + '</small></div><i class="o3-ch' + (up ? ' up' : '') + '">' + (r.r >= 1 ? '+' : '') + B.fx((r.r - 1) * 100) + '%</i></div>'; }).join('') + '</div>' +
      '<div class="kb-card"><h3>Jenis gangguan per UP3</h3><p class="kb-q">Jumlah Januari s.d. ' + B.BLN[M] + '.</p>' +
        jt.map(function (r) { return '<div class="o3-j kb-click" data-unit="' + r.u + '" data-kk="gg"><span>' + r.u + '</span><div class="o3-st" style="width:' + (r.n / mxn * 100) + '%">' + r.t.map(function (v, i) { return v ? '<i style="flex:' + v + ';background:' + B.JW[i] + '"></i>' : ''; }).join('') + '</div><b>' + B.fx(r.n) + '</b></div>'; }).join('') +
        '<div class="kb-lg">' + B.JN.map(function (j, i) { return '<span><b style="background:' + B.JW[i] + '"></b>' + j + '</span>'; }).join('') + '</div></div></div>';
    B.animasi(root);
  }

  function gambar() {
    if (sec.hidden) return; var D = susun(); if (!D) return; if (!cache.B) cache.B = mkB(D); B = cache.B;
    var u = dash.params().up3_oph || 'UIW'; s.u = UNIT.indexOf(u) >= 0 ? u : 'UIW';
    var kunci = s.u + '|' + cache.kr.length + '|' + cache.pr.length + '|' + (window.innerWidth < 700); if (kunci === jejak && root.firstChild) return; jejak = kunci;
    render(); }
  root.addEventListener('click', function (e) {
    if (!B) return;
    var c = e.target.closest('.kb-chip'); if (c) { dash.setParams({ up3_oph: c.getAttribute('data-u') }); return; }
    var k = e.target.closest('.kb-click'); if (!k) return;
    if (k.dataset.jenis) { B.bukaJenis(+k.dataset.m); return; }
    if (k.dataset.m != null && k.closest('[data-k]')) B.bukaBulan(k.closest('[data-k]').dataset.k, +k.dataset.m);
    else if (k.dataset.unit) B.bukaUnit(k.dataset.kk || 'gg', k.dataset.unit); });
  document.addEventListener('click', function (e) { var b = e.target.closest('.opw-jm'); if (b && B) B.bukaJenis(+b.getAttribute('data-jm')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var o = document.getElementById('kb-laci'); if (o) o.classList.remove('on'); } });
  window.addEventListener('resize', function () { gambar(); });
  dash.onData(function () { try { gambar(); } catch (e) { console.error('ophardist-web: ' + (e.stack || e)); } });
  new MutationObserver(function () { if (!sec.hidden) { jejak = ''; gambar(); } }).observe(sec, { attributes: true, attributeFilter: ['hidden'] });
})();
