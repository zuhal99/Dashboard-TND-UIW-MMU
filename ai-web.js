/* Tab Anggaran Investasi versi web: tampilan "Ringkasan Tenang" (Konsep 1), pilihan Zuhal 27 Nov 2026.
   Konsep: /mnt/project-files/anggaran/ai/konsep-minimalis/.
   Menyembunyikan isi lama (#kartu-ai, #ai-r2, #ai-r3, #ai-r4, kp-intro) lewat ai-web.css, lalu menyisipkan #aiw tepat setelah
   bilah filter. Angka dibaca dari calc halaman yang sama (ai_unit, ai_luncur) lewat dash.data, mengikuti filter unit
   (up3_ai) dan status (ai_jenis). Daftar kontrak lama dipindah ke dalam <details id="aiw-daftar">. */
(function () {
  'use strict';
  var sec = document.getElementById('anggaran');
  var bar = document.getElementById('filter-ai');
  if (!sec || !bar || !window.dash) return;
  document.documentElement.classList.add('aiw-on');

  function E(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fx(v, d) { return (+v || 0).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function RP(v) { return 'Rp ' + fx(v, 1) + ' M'; }
  function PC(v) { return v == null || !isFinite(v) ? '—' : fx(v, 1) + '%'; }
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function tgl(s) { var p = String(s || '').split('-'); return p.length === 3 ? +p[2] + ' ' + BLN[+p[1] - 1] + ' ' + p[0] : '—'; }
  function nama(u) { return u === 'Semua' ? 'semua unit' : (window.TD && TD.unitNama ? TD.unitNama(u) : u); }
  function prm() { var p = dash.params(); return { u: p.up3_ai || 'Semua', j: p.ai_jenis || 'Semua' }; }
  function data(id) { var r = dash.data(id); return r && r.status === 'ok' ? r.data : null; }

  /* ---------- kerangka ---------- */
  var root = E('div', 'aiw'); root.id = 'aiw';
  root.innerHTML =
    '<section class="aiw-hero"><div><div class="aiw-eyebrow" data-aiw="judul">Anggaran Investasi Distribusi 2026</div>' +
    '<div class="aiw-big" data-aiw="pagu">—</div><div class="aiw-sub" data-aiw="pagu-sub"></div></div>' +
    '<div><div class="aiw-sbar" data-aiw="sbar" role="img"></div><div class="aiw-slab" data-aiw="slab"></div></div></section>' +
    '<section class="aiw-stats" data-aiw="stats"></section>' +
    '<section class="aiw-two"><div class="aiw-blk"><h2>Per unit</h2>' +
    '<p class="aiw-note">Urut dari persen terbayar terendah. Terkontrak dan terbayar terhadap pagu; fisik selesai terhadap jumlah kontrak. Klik baris untuk memfilter unit.</p>' +
    '<div class="aiw-tw"><table class="aiw-t"><thead><tr><th>Unit</th><th class="r">Pagu (Rp M)</th><th>Terkontrak</th><th>Terbayar</th><th>Fisik selesai</th><th class="c">Perhatian</th></tr></thead>' +
    '<tbody data-aiw="rows"></tbody></table></div></div>' +
    '<aside class="aiw-act"><h2>Perlu tindakan</h2><p class="aiw-note" data-aiw="act-sub"></p><ol data-aiw="act"></ol>' +
    '<button type="button" class="aiw-more" data-kat="Semua">Lihat daftar kontrak →</button></aside></section>';
  var akt = sec.querySelector('.ai-aktif');
  (akt || bar).insertAdjacentElement('afterend', root);
  var Q = function (k) { return root.querySelector('[data-aiw="' + k + '"]'); };

  /* daftar kontrak lama masuk ke details agar halaman tetap ringkas */
  var daftar = document.getElementById('ai-daftar');
  var det = null;
  if (daftar) {
    det = E('details', 'aiw-det'); det.id = 'aiw-daftar';
    var sm = E('summary', null, 'Daftar kontrak <span data-aiw="ndaftar"></span>');
    det.appendChild(sm); daftar.parentNode.insertBefore(det, daftar); det.appendChild(daftar);
    det.addEventListener('toggle', function () { if (det.open) dash.draw(); });
  }
  function bukaDaftar(kat) {
    dash.setParams({ ai_kat: kat === 'Semua' ? null : kat, ai_all: null });
    if (det) { det.open = true; setTimeout(function () { det.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }
  }
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-kat]'); if (b) { bukaDaftar(b.getAttribute('data-kat')); return; }
    var tr = ev.target.closest('tr[data-unit]');
    if (tr) { var u = tr.getAttribute('data-unit'); dash.setParams({ up3_ai: prm().u === u ? 'Semua' : u }); }
  });
  root.addEventListener('keydown', function (ev) {
    var tr = ev.target.closest('tr[data-unit]');
    if (tr && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); tr.click(); }
  });

  function mini(v, cls) { return '<span class="aiw-mini"><i class="' + cls + '" style="width:' + Math.max(0, Math.min(100, v || 0)) + '%"></i></span><em>' + PC(v) + '</em>'; }
  function badge(n) { return n ? '<span class="aiw-pill ' + (n >= 10 ? 'bad' : 'warn') + '"><i></i>' + n + '</span>' : '<span class="aiw-pill nol">–</span>'; }

  function render() {
    if (root.closest('[hidden]')) return;
    var U = data('ai_unit'); if (!U) return;
    var L = data('ai_luncur') || [];
    var p = prm();
    var row = function (j, u) { for (var i = 0; i < U.length; i++) if (U[i].jenis === j && U[i].unit === u) return U[i]; return null; };
    var t = row(p.j, p.u);
    if (!t) { Q('pagu').textContent = '—'; Q('pagu-sub').textContent = 'Tidak ada PRK ' + (p.j === 'Luncuran' ? 'lanjutan' : p.j.toLowerCase()) + ' untuk ' + nama(p.u) + '.'; Q('sbar').innerHTML = ''; Q('slab').innerHTML = ''; Q('stats').innerHTML = ''; }
    else {
      Q('judul').textContent = 'Anggaran Investasi Distribusi 2026';
      Q('pagu').textContent = RP(t.pagu_miliar);
      var m = row('Murni', p.u), l = row('Luncuran', p.u);
      Q('pagu-sub').innerHTML = '<b>' + esc(p.u === 'Semua' ? 'Semua unit' : nama(p.u)) + '</b>' + (p.j === 'Semua' ? '' : ' · ' + (p.j === 'Murni' ? 'Murni' : 'Lanjutan')) + ' · posisi ' + tgl(t.posisi) + (p.j === 'Semua' ? '<br>Pagu murni ' + RP(m ? m.pagu_miliar : 0) + ' · lanjutan ' + RP(l ? l.pagu_miliar : 0) : '');
      var by = t.terbayar_miliar, bb = Math.max(0, t.terkontrak_miliar - t.terbayar_miliar), sisa = Math.max(0, t.sisa_miliar), tot = by + bb + sisa || 1;
      var w = function (v) { return (v / tot * 100).toFixed(2) + '%'; };
      Q('sbar').innerHTML = '<i class="k1" style="width:' + w(by) + '" title="Terbayar ' + RP(by) + '"></i><i class="k2" style="width:' + w(bb) + '" title="Terkontrak, belum dibayar ' + RP(bb) + '"></i><i class="k3" style="width:' + w(sisa) + '" title="Belum terkontrak ' + RP(sisa) + '"></i>';
      Q('sbar').setAttribute('aria-label', 'Terbayar ' + RP(by) + ', terkontrak belum dibayar ' + RP(bb) + ', belum terkontrak ' + RP(sisa));
      Q('slab').innerHTML = '<div><b>' + RP(by) + '</b><span><i class="k1"></i>Terbayar · ' + PC(t.pct_bayar) + '</span></div>' +
        '<div><b>' + RP(bb) + '</b><span><i class="k2"></i>Terkontrak, belum dibayar</span></div>' +
        '<div class="r"><b>' + RP(sisa) + '</b><span><i class="k3"></i>Belum terkontrak</span></div>' +
        (t.prk_melebihi_pagu ? '<p class="aiw-warn">' + t.prk_melebihi_pagu + ' PRK mencatat terkontrak melebihi pagu (lihat rincian per PRK).</p>' : '');
      Q('stats').innerHTML =
        '<div><span>Terkontrak</span><b>' + PC(t.pct_kontrak) + '</b><small>' + RP(t.terkontrak_miliar) + ' dari pagu</small></div>' +
        '<div><span>Terbayar</span><b>' + PC(t.pct_bayar) + '</b><small>' + PC(t.pct_bayar_kontrak) + ' dari nilai terkontrak</small></div>' +
        '<div><span>Fisik selesai</span><b>' + PC(t.pct_selesai_n) + '</b><small>' + t.n_selesai + ' dari ' + t.n_kontrak + ' kontrak</small></div>' +
        '<div><span>Selesai, belum dibayar</span><b>' + RP(t.selesai_belum_bayar_miliar) + '</b><small>' + t.n_selesai_belum_bayar + ' kontrak siap ditagih</small></div>';
    }
    /* tabel per unit, untuk status terpilih */
    var rows = U.filter(function (d) { return d.jenis === p.j && d.unit !== 'Semua'; }).sort(function (a, b) { return a.pct_bayar - b.pct_bayar; });
    Q('rows').innerHTML = rows.map(function (d) {
      return '<tr data-unit="' + esc(d.unit) + '" tabindex="0" class="' + (p.u === d.unit ? 'on' : '') + '" aria-selected="' + (p.u === d.unit) + '"><td class="u">' + esc(nama(d.unit)) + '</td><td class="r">' + fx(d.pagu_miliar, 1) + '</td>' +
        '<td>' + mini(d.pct_kontrak, 'k2') + '</td><td>' + mini(d.pct_bayar, 'k1') + '</td><td>' + (d.n_kontrak ? mini(d.pct_selesai_n, 'kf') : '<em class="aiw-na">tidak ada kontrak</em>') + '</td><td class="c">' + badge(d.n_perhatian) + '</td></tr>';
    }).join('');
    /* perlu tindakan */
    var act = [];
    if (t) {
      Q('act-sub').textContent = t.n_perhatian + ' kontrak memerlukan perhatian' + (p.u === 'Semua' ? '.' : ' di ' + nama(p.u) + '.');
      if (t.n_fisik0) act.push(['bad', 'Fisik 0%', t.n_fisik0 + ' kontrak', RP(t.nilai_fisik0_miliar) + (t.n_fisik0_meluncur ? '; ' + t.n_fisik0_meluncur + ' di antaranya rencana bayar meluncur.' : '.'), 'g:Fisik 0%']);
      if (t.n_lewat) act.push(['warn', 'Lewat tanggal selesai', t.n_lewat + ' kontrak', RP(t.nilai_lewat_miliar) + '; fisik belum selesai padahal tanggal selesai kontrak sudah lewat.', 'lewat']);
      if (p.j !== 'Luncuran') {
        var lu = null; for (var i = 0; i < L.length; i++) if (L[i].unit === p.u) lu = L[i];
        if (lu && lu.n_meluncur) act.push(['warn', 'Meluncur ke 2027', lu.n_meluncur + ' kontrak murni', RP(lu.nilai_meluncur_miliar) + ' (' + PC(lu.pct_meluncur) + ' nilai kontrak murni); bayar murni 2026 paling tinggi ' + PC(lu.batas_bayar_pct) + ' pagu.', 'luncur']);
      }
      if (t.n_selesai_belum_bayar) act.push(['ok', 'Siap ditagih', t.n_selesai_belum_bayar + ' kontrak', RP(t.selesai_belum_bayar_miliar) + ' sudah selesai fisik; percepat pemberkasan.', 'g:Selesai, belum terbayar']);
      if (t.n_belum_isi) act.push(['nol', 'Progres belum diisi', t.n_belum_isi + ' kontrak', 'Lengkapi progres fisik di spreadsheet.', 'g:Belum diisi']);
    } else Q('act-sub').textContent = '';
    Q('act').innerHTML = act.length ? act.map(function (a) {
      return '<li><span class="aiw-pill ' + a[0] + '"><i></i>' + a[1] + '</span><b>' + a[2] + '</b><span>' + a[3] + '</span><button type="button" class="aiw-go" data-kat="' + esc(a[4]) + '">Lihat ' + a[2] + ' →</button></li>';
    }).join('') : '<li><span>Tidak ada kontrak yang memerlukan perhatian.</span></li>';
    var nk = t ? t.n_kontrak : 0;
    root.querySelector('.aiw-more').textContent = 'Lihat daftar kontrak (' + nk + ') →';
    var nd = document.querySelector('[data-aiw="ndaftar"]'); if (nd) nd.textContent = '(' + nk + ' kontrak)';
  }
  dash.onData(function () { try { render(); } catch (e) { console.error('ai-web: ' + (e.stack || e)); } });
})();
