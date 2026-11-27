/* Sub-tab MDU di tab Rensisdist (versi web), permintaan Zuhal 27 Nov 2026, Konsep 4.
   Data: window.__MDU dari mdu-data.js (dibuat mdu_extract.py dari file SPBJ MDU MMU, sheet USER WILAYAH dan UP3 VIEW).
   Menambah dua section data-hal="Rensisdist" tepat sebelum #kinerja:
   1. #rs-subnav: pilihan isi tab Rensisdist (Kinerja | MDU). Sub-tab lain (mis. Konstruksi) cukup ditambah ke RS_SUB.
   2. #mdu: isi monitoring MDU.
   Saat sub-tab bukan Kinerja, #kinerja disembunyikan lewat kelas html.rs-v-<kode> (lihat mdu-web.css). */
(function () {
  'use strict';
  var D = window.__MDU; var kin = document.getElementById('kinerja');
  if (!D || !kin) return;

  var RS_SUB = [{ k: 'kinerja', t: 'Kinerja' }, { k: 'mdu', t: 'MDU' }];
  var ST = ['Pabrikasi', 'Delivery', 'Onsite', 'Invoice', 'Terbayar'];
  var S3 = { T: ['Terbayar', 'var(--mdu-hijau)'], A: ['Menunggu AKI', 'var(--mdu-kuning)'], B: ['Belum terbayar (progres fisik)', 'var(--mdu-merah)'] };
  var UP3 = ['Ambon', 'Masohi', 'Saumlaki', 'Tual', 'Ternate', 'Tobelo', 'Sofifi'];
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var GR = [['JTM', 'JTM (SUTM + SKTM)', 'kms'], ['JTR', 'JTR', 'kms'], ['Trafo', 'Trafo distribusi', 'kVA']];
  var st = { v: 'kinerja', user: 'Semua', up3: 'Semua', semua: false };
  try { var sv = JSON.parse(localStorage.getItem('rs-sub') || '{}'); if (sv && RS_SUB.some(function (x) { return x.k === sv.v; })) st.v = sv.v; } catch (e) {}
  function simpan() { try { localStorage.setItem('rs-sub', JSON.stringify({ v: st.v })); } catch (e) {} }

  /* ---------- util ---------- */
  function E(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fx(v, d) { return v.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function M(v) { return fx(v / 1e9, 1); }
  function RP(v) { return 'Rp ' + M(v) + ' M'; }
  function PC(v) { return v == null || !isFinite(v) ? '—' : fx(v * 100, 1) + '%'; }
  function N(v) { return v.toLocaleString('id-ID'); }
  function sum(a, f) { var s = 0; for (var i = 0; i < a.length; i++) s += f(a[i]); return s; }
  function tgl(s) { var p = s.split('-'); return +p[2] + ' ' + BLN[+p[1] - 1] + ' ' + p[0]; }
  function s3k(t) { return t === 'Terbayar' ? 'T' : (t === 'Onsite' || t === 'Invoice') ? 'A' : 'B'; }
  function bar3(o, t, m) {
    return '<div class="mdu-stack" style="width:' + Math.max(3, t / m * 100) + '%">' + ['T', 'A', 'B'].map(function (k) {
      return o[k] ? '<i style="width:' + (o[k] / t * 100) + '%;background:' + S3[k][1] + '" title="' + S3[k][0] + ': ' + RP(o[k]) + '"></i>' : ''; }).join('') + '</div>'; }
  function pbar(t, k) { return '<div class="mdu-stack mdu-pbar"><i style="width:' + (k ? Math.min(100, t / k * 100) : 0) + '%;background:var(--mdu-hijau)"></i></div>'; }
  var leg3 = '<div class="mdu-leg">' + ['T', 'A', 'B'].map(function (k) { return '<span style="--c:' + S3[k][1] + '">' + S3[k][0] + '</span>'; }).join('') + '</div>';

  /* ---------- kerangka ---------- */
  var nav = E('section', 'td-panel rs-subnav'); nav.id = 'rs-subnav'; nav.setAttribute('data-hal', 'Rensisdist'); nav.hidden = true;
  var tl = E('div', 'rs-subtabs'); tl.setAttribute('role', 'tablist'); tl.setAttribute('aria-label', 'Pilih isi tab Rensisdist');
  RS_SUB.forEach(function (s) {
    var b = E('button', 'rs-subtab', esc(s.t)); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('data-v', s.k);
    b.addEventListener('click', function () { st.v = s.k; simpan(); terap(); }); tl.append(b); });
  nav.append(tl);
  var sec = E('section', 'td-panel mdu'); sec.id = 'mdu'; sec.setAttribute('data-hal', 'Rensisdist'); sec.hidden = true;
  kin.parentNode.insertBefore(nav, kin); kin.parentNode.insertBefore(sec, kin);

  function terap() {
    RS_SUB.forEach(function (s) { document.documentElement.classList.toggle('rs-v-' + s.k, s.k === st.v); });
    tl.querySelectorAll('.rs-subtab').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-v') === st.v)); });
    if (st.v === 'mdu') render();
  }

  sec.innerHTML = '<div class="kp-intro"><h2 class="kp-title">Monitoring MDU ' + esc(D.posisi.slice(0, 4)) + ' · Rendis dan EPM</h2>' +
    '<p class="td-note">Material Distribusi Utama (MDU) yang dipesan lewat SPBJ terpusat untuk user Rendis (PRK AI Keandalan) dan EPM (PRK AI Efisiensi). Posisi <b>' + tgl(D.posisi) + '</b>. Sumber: ' + esc(D.sumber) + '.</p></div>' +
    '<div class="td-filterbar mdu-fbar"><span class="td-flabel" id="mdu-ul">User</span><div class="kp-seg" role="group" aria-labelledby="mdu-ul">' +
    ['Semua', 'Rendis', 'EPM'].map(function (u) { return '<button type="button" class="kp-segbtn" data-user="' + u + '" aria-pressed="' + (u === 'Semua') + '">' + u + '</button>'; }).join('') + '</div>' +
    '<label class="td-flabel" for="mdu-up3">UP3</label><select class="dash-select" id="mdu-up3"><option value="Semua">Semua UP3</option>' + UP3.map(function (u) { return '<option>' + u + '</option>'; }).join('') + '</select></div>' +
    '<div id="mdu-isi"></div>';
  sec.querySelectorAll('[data-user]').forEach(function (b) { b.addEventListener('click', function () { st.user = b.getAttribute('data-user'); sec.querySelectorAll('[data-user]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); render(); }); });
  sec.querySelector('#mdu-up3').addEventListener('change', function (e) { st.up3 = e.target.value; render(); });
  var isi = sec.querySelector('#mdu-isi');

  /* ---------- data tersaring ---------- */
  var PO = D.po;
  function rows() {
    return D.baris.filter(function (b) { var p = PO[b.i]; return (st.user === 'Semua' || p.user === st.user) && (st.up3 === 'Semua' || b.u === st.up3); })
      .map(function (b) { var p = PO[b.i]; return { b: b, p: p, n: b.n, k: s3k(p.tahap), vr: D.varian[b.v] }; });
  }
  function s3(a) { var o = { T: 0, A: 0, B: 0 }; a.forEach(function (r) { o[r.k] += r.n; }); return o; }
  function byPo(a) { var m = {}, l = []; a.forEach(function (r) { var k = r.p.po; if (!m[k]) { m[k] = { p: r.p, r: [] }; l.push(m[k]); } m[k].r.push(r); }); return l; }
  function card(l, v, n, c) { return '<div class="mdu-card" style="--c:' + c + '"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="n">' + n + '</div></div>'; }

  function render() {
    var R = rows();
    if (!R.length) { isi.innerHTML = '<div class="td-card mdu-kosong">Tidak ada PO MDU untuk saringan ini.</div>'; return; }
    var P = byPo(R), tot = sum(R, function (r) { return r.n; }), o3 = s3(R);
    var cnt = function (k) { return P.filter(function (x) { return s3k(x.p.tahap) === k; }).length; };
    var tibaOk = function (x) { return x.r.every(function (r) { return r.b.t >= r.b.q; }); };
    var tibaAll = P.filter(tibaOk), belum = P.filter(function (x) { return !tibaOk(x); });
    var cu = function (a, u) { return a.filter(function (x) { return x.p.user === u; }).length; };
    var vk = sum(R, function (r) { return r.b.q; }), vt = sum(R, function (r) { return r.b.t; });
    var le = P.filter(function (x) { return x.p.le && !tibaOk(x); }), ls = P.filter(function (x) { return x.p.ls; });
    var sP = function (a) { return sum(a, function (x) { return sum(x.r, function (r) { return r.n; }); }); };
    var h = '';
    h += '<div class="mdu-cards mdu-c6">' +
      card('Jumlah PO', P.length + ' PO', 'Rendis ' + cu(P, 'Rendis') + ' · EPM ' + cu(P, 'EPM'), 'var(--pln-blue-dark)') +
      card('Nilai kontrak', RP(tot), P.filter(function (x) { return x.p.tahap === 'Terbayar' || x.p.tahap === 'Invoice'; }).length + ' PO sudah BASTP', 'var(--pln-blue)') +
      card('Terbayar', RP(o3.T), PC(o3.T / tot) + ' · ' + cnt('T') + ' PO', S3.T[1]) +
      card('Menunggu AKI', RP(o3.A), PC(o3.A / tot) + ' · ' + cnt('A') + ' PO, tiba atau BASTP', S3.A[1]) +
      card('Belum terbayar', RP(o3.B), PC(o3.B / tot) + ' · ' + cnt('B') + ' PO, progres fisik', S3.B[1]) +
      card('Realisasi tiba (volume)', PC(vt / vk), belum.length + ' PO belum tiba penuh', 'var(--mdu-ungu)') + '</div>';

    /* status bayar per user + top varian | per UP3 + analisis */
    var users = ['Rendis', 'EPM'].map(function (u) { var a = R.filter(function (r) { return r.p.user === u; }); return { u: u, a: a, t: sum(a, function (r) { return r.n; }) }; }).filter(function (x) { return x.t; });
    var mU = Math.max.apply(null, users.map(function (x) { return x.t; }));
    var vg = {}; R.forEach(function (r) { (vg[r.vr] = vg[r.vr] || []).push(r); });
    var top = Object.keys(vg).map(function (v) { return { v: v, a: vg[v], t: sum(vg[v], function (r) { return r.n; }) }; }).sort(function (a, b) { return b.t - a.t; }).slice(0, 10);
    var upA = UP3.map(function (u) { var a = R.filter(function (r) { return r.b.u === u; }); var t = sum(a, function (r) { return r.n; }); var o = s3(a); return { u: u, o: o, t: t, pb: t ? o.T / t : 0 }; }).filter(function (x) { return x.t; }).sort(function (a, b) { return a.pb - b.pb; });
    var mUp = Math.max.apply(null, upA.map(function (x) { return x.t; }));
    h += '<div class="mdu-row"><div class="td-card mdu-box"><h3>Status pembayaran per user</h3>' + leg3 +
      users.map(function (x) { var o = s3(x.a); return '<div class="mdu-hrow mdu-hu"><b>' + x.u + '</b>' + bar3(o, x.t, mU) + '<span class="r">' + M(o.T) + ' · ' + M(o.A) + ' · ' + M(o.B) + ' <small>Rp M</small></span></div>'; }).join('') +
      '<h3 class="mdu-h3b">Top 10 varian MDU menurut nilai kontrak</h3>' +
      top.map(function (x) { return '<div class="mdu-hrow mdu-hv"><span class="mdu-var">' + esc(x.v) + '</span>' + bar3(s3(x.a), x.t, top[0].t) + '<span class="r">' + RP(x.t) + '</span></div>'; }).join('') + '</div>' +
      '<div class="td-card mdu-box"><h3>Per UP3 tujuan pengiriman</h3><p class="td-note mdu-sub">Urut dari persentase terbayar terendah. Panjang batang = nilai PO untuk UP3 tersebut.</p>' + leg3 +
      upA.map(function (x) { return '<div class="mdu-hrow mdu-hp"><span>' + x.u + '</span>' + bar3(x.o, x.t, mUp) + '<span class="r"><b>' + PC(x.pb) + '</b> dari ' + RP(x.t) + '</span></div>'; }).join('');
    var cub = R.filter(function (r) { return /^CUB/.test(r.vr); }), cubT = sum(cub, function (r) { return r.n; });
    var an = ['Terbayar <b>' + PC(o3.T / tot) + '</b> dari ' + RP(tot) + '. Menunggu AKI <b>' + RP(o3.A) + '</b>: material sudah tiba atau ber-BASTP, tinggal pemberkasan dan pembayaran.'];
    if (upA.length > 1) an.push('Persentase terbayar terendah: ' + upA.slice(0, 3).map(function (x) { return 'UP3 ' + x.u + ' ' + PC(x.pb); }).join(', ') + '.');
    if (cubT) an.push('Kubikel 20 kV (CUB) baru terbayar ' + PC(s3(cub).T / cubT) + ' dari ' + RP(cubT) + '.');
    if (le.length) an.push(le.length + ' PO lewat tanggal akhir kontrak dengan material belum tiba penuh (' + RP(sP(le)) + ').');
    if (ls.length) an.push(ls.length + ' PO lewat SLA pembayaran dan belum VIP (' + RP(sP(ls)) + ').');
    h += '<div class="mdu-ana"><h3>Analisis</h3><ol>' + an.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></div></div></div>';

    /* volume jaringan dan trafo */
    var VR = R.filter(function (r) { return r.b.g; });
    var gs = function (g, f) { var a = VR.filter(function (r) { return r.b.g === g && (!f || f(r)); }); return { k: sum(a, function (r) { return r.b.q * r.b.f; }), t: sum(a, function (r) { return r.b.t * r.b.f; }), u: sum(a, function (r) { return r.b.q; }), ut: sum(a, function (r) { return r.b.t; }), a: a }; };
    var F = function (v, u) { return u === 'kVA' ? N(Math.round(v)) : fx(v, 1); };
    var subs = function (x, g) { var m = {}; x.a.forEach(function (r) { m[r.b.s] = (m[r.b.s] || 0) + (g === 'Trafo' ? r.b.q : r.b.q * r.b.f); });
      return Object.keys(m).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); }).map(function (k) { return g === 'Trafo' ? m[k] + ' × ' + k : k + ' ' + fx(m[k], 1); }).join(' · '); };
    h += '<h2 class="kp-title mdu-h2">Volume jaringan dan trafo</h2><p class="td-note">Volume MDU yang dikontrakkan dibanding yang sudah tiba, dalam kms untuk jaringan dan kVA untuk trafo.</p>' +
      '<div class="mdu-cards mdu-c3">' + GR.map(function (g) { var x = gs(g[0]); if (!x.k) return card(g[1], '—', 'tidak ada PO untuk saringan ini', 'var(--pln-blue)');
        return card(g[1], F(x.k, g[2]) + ' <small>' + g[2] + '</small>', pbar(x.t, x.k) + '<b>' + F(x.t, g[2]) + ' ' + g[2] + '</b> sudah tiba (' + PC(x.t / x.k) + ')' + (g[0] === 'Trafo' ? ' · ' + x.ut + ' dari ' + x.u + ' unit' : '') + '<br>' + subs(x, g[0]), 'var(--pln-blue)'); }).join('') + '</div>';
    var upV = UP3.filter(function (u) { return st.up3 === 'Semua' || u === st.up3; });
    h += '<div class="td-card mdu-box"><h3>Per UP3 · tiba / kontrak</h3><p class="td-note mdu-sub">Batang hijau = bagian yang sudah tiba. Tanda – berarti UP3 tersebut tidak mendapat material itu.</p><div class="mdu-scroll"><table class="mdu-t"><thead><tr><th>UP3</th>' +
      GR.map(function (g) { return '<th>' + g[1] + ' (' + g[2] + ')</th>'; }).join('') + '</tr></thead><tbody>' +
      upV.map(function (u) { return '<tr><td><b>' + u + '</b></td>' + GR.map(function (g) { var x = gs(g[0], function (r) { return r.b.u === u; });
        return x.k ? '<td><div class="mdu-tv"><span><b>' + F(x.t, g[2]) + '</b> / ' + F(x.k, g[2]) + '</span><span class="' + (x.t < x.k ? 'mdu-merah' : '') + '">' + PC(x.t / x.k) + '</span></div>' + pbar(x.t, x.k) + '</td>' : '<td class="mdu-nil">–</td>'; }).join('') + '</tr>'; }).join('') +
      (upV.length > 1 ? '<tr class="mdu-tot"><td><b>Jumlah</b></td>' + GR.map(function (g) { var x = gs(g[0]); return x.k ? '<td><b>' + F(x.t, g[2]) + '</b> / ' + F(x.k, g[2]) + ' · ' + PC(x.t / x.k) + '</td>' : '<td class="mdu-nil">–</td>'; }).join('') + '</tr>' : '') +
      '</tbody></table></div><p class="mdu-note">JTM = SUTM (AAAC-S dan MVTIC) + SKTM (NA2XSEYBY). JTR = semua kabel NFA2X (LVTC dan kabel SR). AAAC-S dipesan per meter penghantar, dibagi 3 (tiga fasa) menjadi kms; MVTIC, NA2XSEYBY dan NFA2X adalah kabel berpilin, sehingga meter = meter sirkuit. kVA trafo = jumlah unit × kapasitas pada varian.</p></div>';

    /* volume kedatangan fisik */
    var vv = {}; R.forEach(function (r) { var x = vv[r.vr] = vv[r.vr] || { v: r.vr, q: 0, t: 0, bb: 0 }; x.q += r.b.q; x.t += r.b.t; if (r.p.tahap !== 'Terbayar') x.bb += r.n; });
    var vl = Object.keys(vv).map(function (k) { var x = vv[k]; x.s = x.q - x.t; x.pt = x.q ? x.t / x.q : 1; return x; });
    var kurang = vl.filter(function (x) { return x.s > 0; }).sort(function (a, b) { return a.pt - b.pt || b.bb - a.bb; });
    var ru = function (u) { var a = R.filter(function (r) { return r.p.user === u; }); var q = sum(a, function (r) { return r.b.q; }); return q ? PC(sum(a, function (r) { return r.b.t; }) / q) : '—'; };
    h += '<h2 class="kp-title mdu-h2">Volume kedatangan fisik</h2><div class="mdu-cards mdu-c4">' +
      card('PO tiba semua', tibaAll.length + ' PO', 'Rendis ' + cu(tibaAll, 'Rendis') + ' · EPM ' + cu(tibaAll, 'EPM'), S3.T[1]) +
      card('PO belum tiba penuh', belum.length + ' PO', 'Rendis ' + cu(belum, 'Rendis') + ' · EPM ' + cu(belum, 'EPM'), S3.B[1]) +
      card('Realisasi tiba (volume)', PC(vt / vk), 'Rendis ' + ru('Rendis') + ' · EPM ' + ru('EPM'), 'var(--mdu-ungu)') +
      card('Varian belum tiba lengkap', kurang.length + ' varian', 'dari ' + vl.length + ' varian MDU', S3.A[1]) + '</div>';
    if (kurang.length) h += '<div class="td-card mdu-box"><h3>Varian MDU yang belum tiba lengkap <span class="mdu-muted">· urut % tiba terendah</span></h3><div class="mdu-scroll"><table class="mdu-t"><thead><tr><th>No</th><th>Varian MDU</th><th class="num">Volume KR</th><th class="num">Tiba</th><th class="num">Sisa</th><th class="mdu-wpt">% tiba</th><th class="num">Belum terbayar</th></tr></thead><tbody>' +
      kurang.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td class="mdu-var">' + esc(x.v) + '</td><td class="num">' + N(x.q) + '</td><td class="num">' + (x.t ? N(x.t) : '–') + '</td><td class="num mdu-merah"><b>' + N(x.s) + '</b></td><td><div class="mdu-pt">' + pbar(x.t, x.q) + '<span>' + PC(x.pt) + '</span></div></td><td class="num">' + RP(x.bb) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="mdu-note">Realisasi tiba volume = jumlah volume tiba (dibatasi volume kontrak) ÷ jumlah volume kontrak. Satuannya campuran (meter, unit, batang), sehingga angka ini didominasi konduktor dan kabel; persentase per baris dihitung per varian.</p></div>';

    /* PO perlu perhatian */
    var perh = P.filter(function (x) { return (x.p.le && !tibaOk(x)) || x.p.ls; }).sort(function (a, b) { return sum(b.r, function (r) { return r.n; }) - sum(a.r, function (r) { return r.n; }); });
    if (perh.length) {
      var L = st.semua ? perh : perh.slice(0, 8);
      h += '<div class="td-card mdu-box"><h3>PO perlu perhatian <span class="mdu-muted">· ' + perh.length + ' PO, urut nilai</span></h3><div class="mdu-scroll"><table class="mdu-t"><thead><tr><th>No PO</th><th>User</th><th>Varian MDU</th><th>Penyedia</th><th class="num">Volume / tiba</th><th class="num">Nilai</th><th>Catatan</th></tr></thead><tbody>' +
        L.map(function (x) { var q = sum(x.r, function (r) { return r.b.q; }), t = sum(x.r, function (r) { return r.b.t; });
          return '<tr><td>' + esc(x.p.po) + '</td><td>' + x.p.user + '</td><td class="mdu-var">' + esc(x.p.var) + '</td><td>' + esc(x.p.penyedia) + '</td><td class="num">' + N(q) + ' / ' + N(t) + '</td><td class="num">' + RP(sum(x.r, function (r) { return r.n; })) + '</td><td>' +
            (x.p.le && !tibaOk(x) ? '<span class="mdu-tag">lewat akhir KR ' + x.p.end.slice(8, 10) + '/' + x.p.end.slice(5, 7) + '</span>' : '') + (x.p.ls ? '<span class="mdu-tag w">lewat SLA bayar</span>' : '') + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + (perh.length > 8 ? '<button type="button" class="mdu-more">' + (st.semua ? 'Tampilkan 8 teratas' : 'Tampilkan semua ' + perh.length + ' PO') + '</button>' : '') + '</div>';
    }
    h += '<details class="mdu-def"><summary>Definisi</summary><ol>' +
      '<li>Terbayar: kolom VIP bernilai TRUE di sheet USER WILAYAH.</li>' +
      '<li>Menunggu AKI: material sudah tiba penuh atau sudah BASTP, tetapi VIP belum TRUE.</li>' +
      '<li>Belum terbayar (progres fisik): masih pabrikasi (belum ada DO) atau masih dalam pengiriman.</li>' +
      '<li>Lewat akhir KR: tanggal akhir kontrak sudah lewat, volume tiba belum penuh. Lewat SLA bayar: SLA pembayaran sudah lewat, VIP belum TRUE.</li>' +
      '<li>Sebaran per UP3 dan per varian dari sheet UP3 VIEW (satu PO dapat berisi beberapa varian); nilai diskalakan agar jumlah per PO sama dengan nilai PO di USER WILAYAH. Kolom Varian di daftar PO memakai varian di USER WILAYAH.</li></ol></details>';
    isi.innerHTML = h;
    var mb = isi.querySelector('.mdu-more'); if (mb) mb.addEventListener('click', function () { st.semua = !st.semua; render(); });
  }

  terap();
})();
