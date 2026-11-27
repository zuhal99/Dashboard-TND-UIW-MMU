/* Tab Anggaran Operasi versi web: Konsep 3 "Kartu Unit" (pilihan Zuhal 27 Nov 2026; istilah Rekomposisi dan Per PRK).
   Konsep: /mnt/project-files/anggaran/ao/konsep/ (ao-k3.js). Menyembunyikan isi lama tab AO lewat ao-web.css, memakai gaya .aiw-* dari ai-web.css.
   Angka dari calc ao_unit dan ao_kegiatan; mengikuti filter unit (up3_ao) dan kelompok (ao_kel). Tabel rincian per PRK dilipat dalam details. */
(function () {
  'use strict';
  var sec = document.getElementById('anggaran-ao'), bar = document.getElementById('filter-ao');
  if (!sec || !bar || !window.dash) return;
  document.documentElement.classList.add('aow-on');
  var C = { biru: '#2E75B6', tosca: '#0C9CB4', petrol: '#216279', kuning: '#FFC000', salmon: '#F4625E', muda: '#9CD3E2', abu: '#DCE5EE' };
  var BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var KEL = [['MURNI', 'AO murni 2026'], ['HUTANG USAHA', 'Hutang usaha 2025']];
  function E(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fx(v, d) { return (+v || 0).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function RP(v, d) { return 'Rp ' + fx(v, d == null ? 1 : d) + ' M'; }
  function PC(v) { return v == null || !isFinite(v) ? '—' : fx(v, 1) + '%'; }
  function tgl(s) { var p = String(s || '').split('-'); return p.length === 3 ? +p[2] + ' ' + BLN[+p[1] - 1] + ' ' + p[0] : '—'; }
  function nama(u) { return u === 'Semua' ? 'Semua unit' : (u === 'UIW' || /^UP/.test(u) ? u : 'UP3 ' + u); }
  function pendek(u) { return u === 'UP3B Maluku' ? 'UP3B' : u; }
  function prm() { var p = dash.params(); return { u: p.up3_ao || 'Semua', k: p.ao_kel || 'Semua' }; }
  function data(id) { var r = dash.data(id); return r && r.status === 'ok' ? r.data : null; }
  function tumpuk(d) { var sk = Math.max(d.pagu_miliar, d.terkontrak_miliar) || 1, w = function (v) { return (Math.max(0, v) / sk * 100).toFixed(2) + '%'; };
    return '<span class="k-st"><i style="width:' + w(d.terbayar_miliar) + ';background:' + C.petrol + '"></i><i style="width:' + w(d.terkontrak_miliar - d.terbayar_miliar) + ';background:' + C.muda + '"></i><i style="width:' + w(d.sisa_miliar) + ';background:' + C.abu + '"></i>' +
      (d.terkontrak_miliar > d.pagu_miliar ? '<em style="left:' + w(d.pagu_miliar) + '"></em>' : '') + '</span>'; }
  var LG = '<div class="aiw-lg"><span><b style="background:' + C.petrol + '"></b>Terbayar</span><span><b style="background:' + C.muda + '"></b>Terkontrak, belum dibayar</span><span><b style="background:' + C.abu + '"></b>Sisa pagu</span></div>';
  var root = E('div', 'aiw aow'); root.id = 'aow';
  bar.insertAdjacentElement('afterend', root);
  var rinc = document.getElementById('ao-rincian');
  if (rinc) { var det = E('details', 'aiw-det'); det.id = 'aow-rincian'; det.appendChild(E('summary', null, 'Rincian per PRK <span>(Rp juta)</span>')); det.addEventListener('toggle', function () { if (det.open) dash.draw(); }); rinc.parentNode.insertBefore(det, rinc); det.appendChild(rinc); }
  root.addEventListener('click', function (ev) {
    var r = ev.target.closest('[data-unit]'); if (r) { var u = r.getAttribute('data-unit'); dash.setParams({ up3_ao: prm().u === u ? 'Semua' : u }); return; }
    var k = ev.target.closest('[data-kel]'); if (k) { var v = k.getAttribute('data-kel'); dash.setParams({ ao_kel: prm().k === v ? 'Semua' : v }); }
  });
  root.addEventListener('keydown', function (ev) { var r = ev.target.closest('[data-unit],[data-kel]'); if (r && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); r.click(); } });
  function ambil() {
    var U = data('ao_unit'); if (!U) return null; var p = prm();
    var row = function (u, k) { for (var i = 0; i < U.length; i++) if (U[i].unit === u && U[i].kelompok === k) return U[i]; return null; };
    var t = row(p.u, p.k);
    var us = U.filter(function (d) { return d.kelompok === p.k && d.unit !== 'Semua' && d.pagu_miliar > 0; });
    var kg = (data('ao_kegiatan') || []).filter(function (d) { return d.up3 === p.u && d.kelompok === p.k && d.pagu_miliar > 0; }).sort(function (a, b) { return b.pagu_miliar - a.pagu_miliar; });
    var ks = KEL.map(function (k) { return { k: k[0], l: k[1], d: row(p.u, k[0]) }; }).filter(function (x) { return x.d && x.d.pagu_miliar > 0; });
    var kn = p.k === 'MURNI' ? ' · AO murni' : p.k === 'HUTANG USAHA' ? ' · Hutang usaha' : '';
    return { p: p, t: t, us: us, kg: kg, ks: ks, U: U, meta: esc(nama(p.u)) + kn + ' · posisi ' + (t ? tgl(t.posisi) : '—') + ' · pagu setelah Rekomposisi II' + (t && t.prk_melebihi_pagu ? ' · <span class="aow-over">' + t.prk_melebihi_pagu + ' PRK terkontrak melebihi pagu</span>' : '') };
  }
  /* KONSEP 3: Kartu Unit — strip angka ringkas, lalu kartu per unit dengan cincin terbayar */
  function cincin(v, col, sz) { var R = 30, Cc = 2 * Math.PI * R, l = Math.max(0, Math.min(v, 100)) / 100 * Cc;
    return '<svg viewBox="0 0 80 80" width="' + sz + '" height="' + sz + '"><circle cx="40" cy="40" r="' + R + '" fill="none" stroke="#E8EEF4" stroke-width="9"/>' +
      '<circle cx="40" cy="40" r="' + R + '" fill="none" stroke="' + col + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + l.toFixed(1) + ' ' + Cc.toFixed(1) + '" transform="rotate(-90 40 40)"/>' +
      '<text x="40" y="45" text-anchor="middle" font-size="15" font-weight="700" fill="#132C42">' + Math.round(v) + '%</text></svg>'; }
  function render() {
    if (root.closest('[hidden]')) return; var a = ambil(); if (!a || !a.t) return; var t = a.t, p = a.p;
    var tile = function (l, v, s, pct, col) { return '<div class="aiw-card k3-t"><small>' + l + '</small><b>' + v + '</b><span>' + s + '</span>' + (pct != null ? '<i class="k3-ln"><i style="width:' + Math.min(100, pct) + '%;background:' + col + '"></i></i>' : '') + '</div>'; };
    root.innerHTML =
      '<div class="aiw-head"><h2 class="aiw-title">Anggaran Operasi Pos 53 Distribusi 2026</h2><p class="aiw-meta">' + a.meta + '</p></div>' +
      '<section class="k3-tiles">' + tile('Pagu', RP(t.pagu_miliar, 2), 'awal ' + RP(t.pagu_awal_miliar, 2)) +
      tile('Terkontrak', PC(t.pct_kontrak), RP(t.terkontrak_miliar), t.pct_kontrak, C.biru) + tile('Terbayar', PC(t.pct_bayar), RP(t.terbayar_miliar), t.pct_bayar, C.petrol) +
      tile('Sisa pagu', RP(t.sisa_miliar), 'belum terkontrak') + '</section>' +
      '<section><div class="k3-sh"><h3>Unit</h3><span>Cincin = terbayar terhadap pagu. Rekomposisi = pagu Rekomposisi II dikurangi pagu awal. Klik kartu untuk memfilter unit.</span></div><div class="k3-grid">' +
      a.us.sort(function (x, y) { return y.pagu_miliar - x.pagu_miliar; }).map(function (d) { var g = d.rekomposisi_miliar, over = d.pct_kontrak > 100;
        return '<div tabindex="0" role="button" class="aiw-card k3-u' + (p.u === d.unit ? ' on' : '') + (over ? ' over' : '') + '" data-unit="' + esc(d.unit) + '">' + cincin(d.pct_bayar, d.pct_bayar < 50 ? C.salmon : d.pct_bayar < 80 ? C.kuning : C.petrol, 74) +
          '<div><b>' + esc(nama(d.unit)) + '</b><span>Pagu ' + RP(d.pagu_miliar, 2) + '</span><span' + (over ? ' class="aow-merah"' : '') + '>Terkontrak ' + PC(d.pct_kontrak) + (over ? ' (melebihi pagu)' : '') + '</span>' +
          '<span class="' + (g < 0 ? 'k-neg' : 'k-pos') + '">Rekomposisi ' + (g > 0 ? '+' : g < 0 ? '−' : '') + fx(Math.abs(g), 2) + ' M</span></div></div>'; }).join('') + '</div></section>' +
      '<section class="aiw-row"><div class="aiw-card"><h3>Per PRK</h3><p class="aiw-q">Terbayar terhadap pagu, PRK sejenis digabung, urut dari pagu terbesar.</p>' +
      a.kg.map(function (d) { return '<div class="k3-kr"><span>' + esc(d.kegiatan) + '<small>' + RP(d.pagu_miliar) + ' · kontrak ' + PC(d.pct_kontrak) + '</small></span><i class="k3-ln"><i style="width:' + Math.min(100, d.pct_bayar) + '%;background:' + C.petrol + '"></i></i><b>' + PC(d.pct_bayar) + '</b></div>'; }).join('') + '</div>' +
      '<div class="aiw-card"><h3>Murni dan hutang usaha</h3><p class="aiw-q">Klik untuk memfilter kelompok.</p><div class="k3-kel">' +
      a.ks.map(function (x) { var d = x.d; return '<div tabindex="0" role="button" class="k3-kc' + (p.k === x.k ? ' on' : '') + '" data-kel="' + x.k + '">' + cincin(d.pct_bayar, C.petrol, 110) + '<b>' + x.l + '</b><span>Pagu ' + RP(d.pagu_miliar) + '</span><span>Terkontrak ' + PC(d.pct_kontrak) + '</span></div>'; }).join('') + '</div></div></section>';
  }
  dash.onData(function () { try { render(); } catch (e) { console.error('k3: ' + e.stack); } });
})();
