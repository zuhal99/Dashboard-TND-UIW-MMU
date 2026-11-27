/* Tab Kinerja EPM versi web: Konsep 1 "Tiga Gauge" (pilihan Zuhal 27 Nov 2026).
   Konsep: /mnt/project-files/kinerja/epm/konsep-redesain-2026-11-27/. Menyembunyikan isi lama tab EPM lewat epm-web.css.
   Angka dari dataset kinerja (Susut, Ganti meter: kumulatif + target) dan epm_rinci (bulanan, target 12 bulan, P2TL, kategori GM).
   Filter unit memakai param up3_epm, KPI terpilih memakai param epm_kpi. P2TL berlabel "usulan" sampai dimuat ke tabel kinerja. */
(function () {
  'use strict';
  var sec = document.getElementById('epm');
  if (!sec || !window.dash) return;
  document.documentElement.classList.add('epmw-on');
  var BL = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  var BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var C = { biru: '#2E75B6', tosca: '#0C9CB4', petrol: '#216279', kuning: '#FFC000', salmon: '#F4625E', muda: '#9CD3E2', abu: '#E6EDF3', hijau: '#2E9D5B' };
  var K = { susut: { kode: 'EPM-SUSUT', n: 'Susut distribusi', w: C.biru }, p2tl: { kode: 'EPM-P2TL', n: 'P2TL', w: C.tosca, usul: 1 }, gm: { kode: 'EPM-GM', n: 'Penggantian meter', w: C.petrol } };
  var ORD = ['susut', 'p2tl', 'gm'], UP = ['Ambon', 'Masohi', 'Saumlaki', 'Sofifi', 'Ternate', 'Tobelo', 'Tual'], U = UP.concat('UIW');
  var SHEET = 'https://docs.google.com/spreadsheets/d/1re__zyinNAx9BbftnwtvtZp6OqrrxwNSHK_6eVHQP0c/edit';
  function fx(v, d) { return v == null || !isFinite(v) ? '—' : (+v).toLocaleString('id-ID', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function val(k, v) { return v == null ? '—' : k === 'susut' ? fx(v, 2) + '%' : k === 'p2tl' ? (v >= 1e6 ? fx(v / 1e6, 2) + ' juta kWh' : fx(v) + ' kWh') : fx(v) + ' meter'; }
  function num(k, v) { return v == null ? '—' : k === 'susut' ? fx(v, 2) + '%' : fx(v); }
  function pc(v) { return v == null || !isFinite(v) ? '—' : fx(v, 1) + '%'; }
  function st(v) { return v == null ? C.abu : v >= 100 ? C.hijau : v >= 95 ? C.kuning : C.salmon; }
  function nama(u) { return u === 'UIW' ? 'UIW MMU' : 'UP3 ' + u; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function raw(id) { var r = dash.data(id); return r && r.status === 'ok' ? r.data : null; }
  function prm() { var p = dash.params(), u = p.up3_epm || 'Semua', k = 'susut'; ORD.forEach(function (x) { if (K[x].kode === p.epm_kpi) k = x; }); return { u: U.indexOf(u) >= 0 ? u : 'UIW', k: k }; }

  /* susun data per KPI × unit: kum, tgt, bul, cap (indeks bulan 0..11), M = bulan terakhir berisi */
  var cache = null;
  function susun() {
    var kin = raw('kinerja'), rin = raw('epm_rinci'); if (!kin || !rin) return null; if (cache && cache.kin === kin && cache.rin === rin) return cache.D;
    var D = { kat: {}, katbln: null };
    ORD.forEach(function (k) { D[k] = {}; U.forEach(function (u) { D[k][u] = { kum: [], tgt: [], bul: [], t12: [], cap: [], pel: [], kel: [], tahun: null }; for (var i = 0; i < 12; i++) ['kum','tgt','bul','t12','cap','pel','kel'].forEach(function (f) { D[k][u][f][i] = null; }); }); });
    var kk = { 'EPM-SUSUT': 'susut', 'EPM-GM': 'gm', 'EPM-P2TL': 'p2tl' };
    kin.forEach(function (r) { var k = kk[r.kode_kpi]; if (!k || k === 'p2tl' || !D[k][r.up3] || !/^2026-\d\d$/.test(r.periode)) return; var m = +r.periode.slice(5) - 1, d = D[k][r.up3];
      if (r.realisasi !== '') d.kum[m] = +r.realisasi; if (r.target !== '') d.tgt[m] = +r.target; });
    rin.forEach(function (r) { var k = kk[r.kode_kpi]; if (!k) return; var v = +r.nilai;
      if (r.ukuran === 'kategori') { D.kat[r.label] = v; D.katbln = +r.periode.slice(5); return; }
      var d = D[k][r.up3]; if (!d) return; if (r.ukuran === 'target_tahunan') { d.tahun = v; return; } var m = +r.periode.slice(5) - 1; if (!(m >= 0)) return;
      if (r.ukuran === 'bulanan') d.bul[m] = v; else if (r.ukuran === 'target') d.t12[m] = v; else if (r.ukuran === 'pelanggaran') d.pel[m] = v; else if (r.ukuran === 'kelainan') d.kel[m] = v; });
    U.forEach(function (u) { var d = D.p2tl[u], s = 0; if (!d.tahun) return; for (var m = 0; m < 12; m++) { if (d.pel[m] == null && d.kel[m] == null) break; d.bul[m] = (d.pel[m] || 0) + (d.kel[m] || 0); s += d.bul[m]; d.kum[m] = s; d.tgt[m] = Math.round(d.tahun * (m + 1) / 12); } });
    ORD.forEach(function (k) { var Mk = -1; U.forEach(function (u) { var d = D[k][u];
      for (var m = 0; m < 12; m++) { if (d.kum[m] != null && d.tgt[m]) d.cap[m] = Math.round(((k === 'susut' ? 2 - d.kum[m] / d.tgt[m] : d.kum[m] / d.tgt[m]) * 100) * 10) / 10; }
      if (k === 'gm' && d.tahun) for (var j = 0; j < 12; j++) d.t12[j] = d.tahun / 12; });
      for (var m = 0; m < 12; m++) if (D[k].UIW.kum[m] != null) Mk = m; D[k].M = Mk; });
    D.ada = ORD.filter(function (k) { return D[k].M >= 0; });
    cache = { kin: kin, rin: rin, D: D }; return D; }

  /* gambar */
  function gauge(v, col) { var L = Math.PI * 80, f = Math.max(0, Math.min(v || 0, 100)) / 100 * L;
    return '<svg viewBox="0 0 200 118" class="epmw-gauge" role="img" aria-label="Capaian ' + pc(v) + '"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="' + C.abu + '" stroke-width="20" stroke-linecap="round"/>' +
      '<path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="' + col + '" stroke-width="20" stroke-linecap="round" class="epmw-arc" data-f="' + f.toFixed(1) + '" data-l="' + L.toFixed(1) + '" stroke-dasharray="0 ' + L.toFixed(1) + '"/>' +
      '<text x="100" y="96" text-anchor="middle" font-size="31" font-weight="700" fill="#132C42" class="epmw-num" data-n="' + (v || 0) + '">' + pc(v) + '</text></svg>'; }
  function chart(D, k, u, kecil) {
    var hp = window.innerWidth < 700, d = D[k][u], M = D[k].M, W = hp ? 380 : 640, H = hp ? 250 : (kecil ? 230 : 300), P = { l: hp ? 40 : 46, r: 10, t: 26, b: 30 }, w = W - P.l - P.r, h = H - P.t - P.b, bw = w / 12;
    var ys = k === 'susut' ? d.kum : d.bul, tg = k === 'susut' ? (d.t12.some(function (x) { return x != null; }) ? d.t12 : d.tgt) : (d.tahun ? d.t12.map(function () { return d.tahun / 12; }) : []);
    var all = ys.concat(tg).filter(function (x) { return x != null; }); if (kecil && k === 'susut') all = all.concat(d.bul.filter(function (x) { return x != null; }));
    if (!all.length) return '<p class="epmw-q">Belum ada data.</p>';
    var mx = Math.max.apply(null, all) * 1.08, mn = 0;
    if (k === 'susut') { mn = Math.max(0, Math.floor(Math.min.apply(null, all) - .6)); mx = Math.ceil(mx); }
    else { var rs = mx / 3, e = Math.pow(10, Math.floor(Math.log10(rs))), q = rs / e; rs = (q <= 1 ? 1 : q <= 2 ? 2 : q <= 2.5 ? 2.5 : q <= 5 ? 5 : 10) * e; mx = rs * 3; }
    var Y = function (v) { return P.t + h - (v - mn) / (mx - mn) * h; }, X = function (i) { return P.l + i * bw + bw / 2; }, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="epmw-chart">';
    for (var i = 0; i <= 3; i++) { var gv = mn + (mx - mn) * i / 3; s += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + Y(gv) + '" y2="' + Y(gv) + '" stroke="#EEF2F6"/><text x="' + (P.l - 8) + '" y="' + (Y(gv) + 4) + '" text-anchor="end" font-size="12" fill="#7D8FA0">' + (k === 'susut' ? fx(gv, 0) + '%' : gv >= 1e6 ? fx(gv / 1e6, gv % 1e6 ? 1 : 0) + ' jt' : gv >= 1e3 ? fx(gv / 1e3, 0) + ' rb' : fx(gv)) + '</text>'; }
    if (k !== 'susut') ys.forEach(function (v, i) { if (v == null) return; var y = Y(v);
      s += '<rect class="epmw-col' + (kecil ? '' : ' epmw-klik') + '" data-m="' + i + '" x="' + (P.l + i * bw + bw * .18) + '" y="' + y + '" width="' + bw * .64 + '" height="' + (P.t + h - y) + '" rx="5" fill="' + K[k].w + '" style="transition-delay:' + i * 40 + 'ms"><title>' + BLN[i] + ': ' + val(k, v) + '</title></rect>'; });
    else { if (kecil) { var pb = []; d.bul.forEach(function (v, i) { if (v != null) pb.push(X(i).toFixed(1) + ' ' + Y(v).toFixed(1)); }); if (pb.length) s += '<path d="M' + pb.join(' L') + '" fill="none" stroke="' + C.muda + '" stroke-width="2.5"/>'; }
      var pt = []; ys.forEach(function (v, i) { if (v != null) pt.push([X(i), Y(v), i]); });
      if (pt.length) s += '<path class="epmw-line" d="M' + pt.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + '" fill="none" stroke="' + K[k].w + '" stroke-width="4" stroke-linejoin="round" pathLength="1"/>';
      pt.forEach(function (p) { s += '<circle class="epmw-dot' + (kecil ? '' : ' epmw-klik') + '" data-m="' + p[2] + '" cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="#fff" stroke="' + K[k].w + '" stroke-width="3"><title>' + BLN[p[2]] + ': ' + val(k, ys[p[2]]) + '</title></circle>'; }); }
    var tp = []; tg.forEach(function (v, i) { if (v != null) tp.push(X(i).toFixed(1) + ' ' + Y(v).toFixed(1)); });
    if (tp.length) s += '<path d="M' + tp.join(' L') + '" fill="none" stroke="' + C.kuning + '" stroke-width="3" stroke-dasharray="7 6"/>';
    BL.forEach(function (b, i) { s += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="' + (hp ? 11 : 12.5) + '" fill="' + (i <= M ? '#4A5F73' : '#B4C1CD') + '">' + b + '</text>'; });
    var lv = ys[M]; if (lv != null) s += '<text x="' + X(M) + '" y="' + (Y(lv) - 12) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#132C42">' + (k === 'susut' ? fx(lv, 2) + '%' : lv >= 1e6 ? fx(lv / 1e6, 2) + ' jt' : fx(lv)) + '</text>';
    return s + '</svg>'; }
  function legend(k, kecil) { return '<div class="epmw-lg"><span><b style="background:' + K[k].w + '"></b>' + (k === 'susut' ? 'Susut kumulatif' : 'Realisasi per bulan') + '</span>' + (kecil && k === 'susut' ? '<span><b style="background:' + C.muda + '"></b>Susut bulanan</span>' : '') + '<span><b class="t"></b>Target</span></div>'; }

  /* laci rincian */
  function laci(judul, sub, html) {
    var o = document.getElementById('epmw-laci');
    if (!o) { o = document.createElement('div'); o.id = 'epmw-laci'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); document.body.appendChild(o);
      o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('.epmw-x')) tutup(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && o.classList.contains('on')) tutup(); }); }
    o.innerHTML = '<div class="epmw-lc"><div class="epmw-lh"><div><h3>' + judul + '</h3><p>' + sub + '</p></div><button class="epmw-x" type="button" aria-label="Tutup">×</button></div><div>' + html + '</div></div>';
    o.style.display = 'flex'; requestAnimationFrame(function () { o.classList.add('on'); animasi(o); o.querySelector('.epmw-x').focus(); }); }
  function tutup() { var o = document.getElementById('epmw-laci'); if (!o) return; o.classList.remove('on'); setTimeout(function () { if (!o.classList.contains('on')) o.style.display = 'none'; }, 260); }
  function pil(v) { return '<i class="epmw-pil" style="background:' + st(v) + '">' + pc(v) + '</i>'; }
  function bukaUnit(D, k, u) {
    var d = D[k][u], M = D[k].M, x = '';
    if (k === 'p2tl') { var p = 0, ke = 0; for (var i = 0; i <= M; i++) { p += d.pel[i] || 0; ke += d.kel[i] || 0; }
      x = '<div class="epmw-split"><span style="flex:' + p + ';background:' + C.tosca + '"></span><span style="flex:' + ke + ';background:' + C.kuning + '"></span></div><div class="epmw-lg"><span><b style="background:' + C.tosca + '"></b>Pelanggaran ' + val(k, p) + '</span><span><b style="background:' + C.kuning + '"></b>Kelainan ' + val(k, ke) + '</span></div>'; }
    if (k === 'gm' && u === 'UIW' && D.katbln) { var ks = Object.keys(D.kat), cs = [C.petrol, C.biru, C.tosca, C.muda];
      x = '<p class="epmw-sm">Alasan penggantian s.d. ' + BLN[D.katbln - 1] + '</p><div class="epmw-split">' + ks.map(function (n, i) { return '<span style="flex:' + D.kat[n] + ';background:' + cs[i % 4] + '"></span>'; }).join('') + '</div><div class="epmw-lg">' + ks.map(function (n, i) { return '<span><b style="background:' + cs[i % 4] + '"></b>' + esc(n) + ' ' + fx(D.kat[n]) + '</span>'; }).join('') + '</div>'; }
    var t = '<table class="epmw-t"><thead><tr><th>Bulan</th><th>' + (k === 'susut' ? 'Bulanan' : 'Per bulan') + '</th><th>Kumulatif</th><th>Target</th><th>Capaian</th></tr></thead><tbody>';
    for (var m = 0; m <= M; m++) t += '<tr><td>' + BLN[m] + '</td><td>' + num(k, d.bul[m]) + '</td><td>' + num(k, d.kum[m]) + '</td><td>' + num(k, d.tgt[m]) + '</td><td>' + pil(d.cap[m]) + '</td></tr>';
    laci(K[k].n + ' · ' + nama(u), 'Realisasi ' + val(k, d.kum[M]) + ' · target ' + val(k, d.tgt[M]) + ' · capaian ' + pc(d.cap[M]) + (K[k].usul ? ' (usulan)' : ''), x + '<div class="epmw-lchart">' + chart(D, k, u, 1) + '</div>' + legend(k, 1) + t + '</tbody></table>'); }
  function bukaBulan(D, k, m) {
    var t = '<table class="epmw-t"><thead><tr><th>Unit</th><th>' + (k === 'susut' ? 'Susut bulanan' : 'Per bulan') + '</th><th>Kumulatif</th><th>Capaian</th></tr></thead><tbody>';
    U.forEach(function (u) { var d = D[k][u]; t += '<tr' + (u === 'UIW' ? ' class="epmw-tot"' : '') + '><td>' + nama(u) + '</td><td>' + num(k, d.bul[m]) + '</td><td>' + num(k, d.kum[m]) + '</td><td>' + pil(d.cap[m]) + '</td></tr>'; });
    laci(K[k].n + ' · ' + BLN[m] + ' 2026', 'Nilai per unit pada bulan ini. Klik unit pada daftar per unit untuk rincian bulanannya.', t + '</tbody></table>'); }

  function animasi(el) { requestAnimationFrame(function () { requestAnimationFrame(function () {
    el.querySelectorAll('.epmw-arc').forEach(function (a) { a.setAttribute('stroke-dasharray', a.getAttribute('data-f') + ' ' + a.getAttribute('data-l')); });
    el.querySelectorAll('[data-w]').forEach(function (b) { b.style.width = b.getAttribute('data-w'); });
    el.classList.add('epmw-go');
    el.querySelectorAll('.epmw-num').forEach(function (t) { var n = +t.getAttribute('data-n'), t0 = performance.now();
      (function f() { var p = Math.max(0, Math.min(1, (performance.now() - t0) / 900)), e = 1 - Math.pow(1 - p, 3); t.textContent = pc(n * e); if (p < 1) requestAnimationFrame(f); })(); setTimeout(function () { t.textContent = pc(n); }, 1000); }); }); }); }

  /* susun halaman */
  var root = document.createElement('div'); root.className = 'epmw'; root.id = 'epmw';
  var intro = sec.querySelector('.kp-intro'); (intro || sec.firstChild) && sec.insertBefore(root, intro ? intro.nextSibling : sec.firstChild);
  var rinc = document.getElementById('rincian-epm');
  if (rinc) { var det = document.createElement('details'); det.className = 'epmw-det'; det.innerHTML = '<summary>Rincian KPI EPM <span>(tabel)</span></summary>'; det.addEventListener('toggle', function () { if (det.open) dash.draw(); }); rinc.parentNode.insertBefore(det, rinc); det.appendChild(rinc); }
  var jejak = '';
  function render() {
    if (root.closest('[hidden]')) return; var D = susun(); if (!D) return; var p = prm(), u = p.u, k = D.ada.indexOf(p.k) >= 0 ? p.k : D.ada[0]; if (!k) return;
    var kunci = u + k + (cache && cache.kin.length) + (cache && cache.rin.length); if (kunci === jejak && root.firstChild) return; jejak = kunci;
    var M = D[k].M, Mx = Math.max.apply(null, D.ada.map(function (x) { return D[x].M; }));
    root.innerHTML = '<div class="epmw-head"><div><h2>Kinerja EPM 2026</h2><p>' + esc(nama(u)) + ' · data s.d. ' + BLN[Mx] + ' 2026</p></div><a class="kp-upbtn" href="' + SHEET + '" target="_blank" rel="noopener noreferrer">Update di spreadsheet <span aria-hidden="true">↗</span></a></div>' +
      '<div class="epmw-chips" role="group" aria-label="Pilih unit">' + ['UIW'].concat(UP).map(function (x) { return '<button type="button" class="epmw-chip' + (x === u ? ' on' : '') + '" data-u="' + x + '" aria-pressed="' + (x === u) + '">' + (x === 'UIW' ? 'Semua UP3' : x) + '</button>'; }).join('') + '</div>' +
      '<div class="epmw-g" role="tablist" aria-label="Pilih kinerja">' + D.ada.map(function (x) { var d = D[x][u], Mk = D[x].M, c = d.cap[Mk];
        return '<button type="button" role="tab" aria-selected="' + (x === k) + '" class="epmw-gc' + (x === k ? ' on' : '') + '" data-kpi="' + x + '">' + gauge(c, st(c)) +
          '<b>' + K[x].n + (K[x].usul ? '<span class="epmw-usul">usulan</span>' : '') + '</b><span>' + val(x, d.kum[Mk]) + ' · target ' + val(x, d.tgt[Mk]) + '</span>' + (Mk !== Mx ? '<span class="epmw-lama">s.d. ' + BLN[Mk] + '</span>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="epmw-row"><div class="epmw-card"><h3>Capaian per unit</h3><p class="epmw-q">' + K[k].n + ' s.d. ' + BLN[M] + '. Garis putus = 100%. Klik baris untuk rincian bulanan.</p>' +
        UP.map(function (x) { return { u: x, c: D[k][x].cap[M] }; }).filter(function (r) { return r.c != null; }).sort(function (a, b) { return a.c - b.c; }).map(function (r) {
          return '<button type="button" class="epmw-ur' + (r.u === u ? ' on' : '') + '" data-unit="' + r.u + '"><span>' + r.u + '</span><span class="epmw-bar"><i data-w="' + (Math.min(r.c, 150) / 1.5).toFixed(1) + '%" style="background:' + st(r.c) + '"></i><em></em></span><b>' + pc(r.c) + '</b></button>'; }).join('') + '</div>' +
      '<div class="epmw-card"><h3>Tren 2026 · ' + esc(nama(u)) + '</h3><p class="epmw-q">' + (k === 'susut' ? 'Susut kumulatif terhadap target. Klik titik' : 'Realisasi per bulan terhadap target bulanan. Klik kolom') + ' untuk nilai per unit.</p><div class="epmw-tren">' + chart(D, k, u) + '</div>' + legend(k) + '</div></div>' +
      (K[k].usul ? '<p class="epmw-note">P2TL: capaian usulan = realisasi kumulatif (pelanggaran + kelainan) ÷ (target tahunan × bulan ÷ 12). Belum masuk tabel kinerja resmi.</p>' : '');
    animasi(root); }
  root.addEventListener('click', function (e) {
    var D = susun(); if (!D) return; var p = prm();
    var c = e.target.closest('.epmw-chip'); if (c) { var v = c.getAttribute('data-u'); dash.setParams({ up3_epm: v === 'UIW' ? 'Semua' : v }); return; }
    var g = e.target.closest('.epmw-gc'); if (g) { dash.setParams({ epm_kpi: K[g.getAttribute('data-kpi')].kode }); return; }
    var k = D.ada.indexOf(p.k) >= 0 ? p.k : D.ada[0];
    var r = e.target.closest('.epmw-ur'); if (r) { bukaUnit(D, k, r.getAttribute('data-unit')); return; }
    var m = e.target.closest('.epmw-klik'); if (m) bukaBulan(D, k, +m.getAttribute('data-m')); });
  var lebar = window.innerWidth < 700; window.addEventListener('resize', function () { if ((window.innerWidth < 700) !== lebar) { lebar = !lebar; jejak = ''; render(); } });
  dash.onData(function () { try { render(); } catch (e) { console.error('epm-web: ' + (e.stack || e)); } });
  /* render ulang saat tab EPM dibuka (hidden dilepas) */
  new MutationObserver(function () { if (!sec.hidden) { jejak = ''; render(); } }).observe(sec, { attributes: true, attributeFilter: ['hidden'] });
})();
