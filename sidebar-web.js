/* Sidebar menu versi web dashboard T&D (konsep 1 pilihan Zuhal, 14 Nov 2026).
   Menggantikan baris tab dan tombol Investasi/Operasi. Menu dibentuk dari tab yang ada di halaman,
   sehingga tab yang disembunyikan saat dirakit ikut tidak tampil. Di layar sempit, sidebar menjadi laci
   yang dibuka dari tombol menu di bilah atas. */
(function(){
  'use strict';
  if (window.__sidebarWeb) return; window.__sidebarWeb = true;
  var MQ = window.matchMedia('(max-width: 900px)');
  var IKON = {
    ai:'<path d="M3 7h18v12H3z M3 7l3-4h12l3 4 M16 13h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    ao:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-5v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    aset:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z M12 7.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    Rensisdist:'<path d="M4 20V10m6 10V4m6 16v-7m4 7H2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    EPM:'<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    Ophardist:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    Transmisi:'<path d="M12 2 7 22m5-20 5 20M8.5 9h7M6 15h12M9.8 4h4.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    tanya:'<path d="M4 4h16v12H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    menu:'<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    tutup:'<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  function ic(k){ return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' + (IKON[k] || IKON.Rensisdist) + '</svg>'; }
  function el(t, c, h){ var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  var LABEL = {ai:'Investasi (AI)', ao:'Operasi (AO)', aset:'Peta Aset'};
  var GRUP = {ai:'Anggaran', ao:'Anggaran', aset:'Aset'};

  function daftarMenu(){
    var out = [];
    document.querySelectorAll('#navigasi .td-tab').forEach(function(t){
      if (getComputedStyle(t).display === 'none') return;
      var hs = (t.getAttribute('data-hals') || t.getAttribute('data-hal')).split(' ');
      hs.forEach(function(h){ out.push({hal:h, label:LABEL[h] || (hs.length > 1 ? h : t.textContent.trim()), grup:GRUP[h] || 'Kinerja sub bidang'}); });
    });
    return out;
  }
  function halNow(){ var p = dash.params(); return p.hal || (location.hash || '').slice(1) || 'ai'; }
  function pergi(h){
    var o = {hal:h}; if (h === 'ai' || h === 'ao') o.jenis_ang = h;
    dash.setParams(o); dash.setLink(h);
    var root = document.getElementById('dash-root');
    if (root) { var top = root.getBoundingClientRect().top + window.scrollY; if (window.scrollY > top + 40) window.scrollTo({top:Math.max(0, top - (MQ.matches ? 60 : 0)), behavior:'smooth'}); }
    if (MQ.matches) laci(false);
  }

  var side, veil, topbar, btnMenu, items = {}, judulTop;
  function laci(on){
    document.body.classList.toggle('sb-laci', on);
    if (btnMenu) btnMenu.setAttribute('aria-expanded', String(on));
    if (on) { var a = side.querySelector('.sb-i[aria-current="page"]') || side.querySelector('.sb-i'); if (a) setTimeout(function(){ a.focus(); }, 30); }
  }
  function bukaTanya(){
    if (MQ.matches) laci(false);
    var f = document.querySelector('.tq-fab'); if (f) f.click();
  }
  function pasang(){
    var nav = document.getElementById('navigasi'); if (!nav) return;
    var menu = daftarMenu(); if (!menu.length) return;
    var logos = Array.prototype.map.call(document.querySelectorAll('.tw-brand .tw-logo img'), function(i){ return '<span class="sb-logo"><img src="' + i.getAttribute('src') + '" alt="' + (i.getAttribute('alt') || '') + '"></span>'; }).join('');
    var foot = ((document.querySelector('.web-foot') || {}).textContent || '').match(/Data kinerja (?:EPM )?terakhir diperbarui (.+? WIT)/);
    side = el('aside', 'sb-side');
    side.id = 'sb-side'; side.setAttribute('aria-label', 'Menu dashboard');
    side.innerHTML = '<div class="sb-head">' + (logos ? '<div class="sb-brand">' + logos + '</div>' : '') +
      '<div class="sb-name"><b>Monitoring T&amp;D</b><small>PLN UIW Maluku dan Maluku Utara</small></div>' +
      '<button type="button" class="sb-x" aria-label="Tutup menu">' + ic('tutup') + '</button></div>' +
      '<nav class="sb-nav" aria-label="Halaman"></nav>' +
      '<div class="sb-bot">' + (document.querySelector('.tq-fab') ? '<button type="button" class="sb-tanya">' + ic('tanya') + '<span>Tanya Data</span></button>' : '') +
      (foot ? '<div class="sb-upd">Data kinerja diperbarui ' + foot[1] + '</div>' : '') + '</div>';
    var nv = side.querySelector('.sb-nav'), g = null;
    menu.forEach(function(m){
      if (m.grup !== g) { g = m.grup; nv.appendChild(el('div', 'sb-g', g)); }
      var b = el('button', 'sb-i', ic(m.hal) + '<span class="sb-t">' + m.label + '</span><span class="sb-tag" hidden>contoh</span>');
      b.type = 'button'; b.setAttribute('data-hal', m.hal);
      b.addEventListener('click', function(){ pergi(m.hal); });
      nv.appendChild(b); items[m.hal] = b;
    });
    veil = el('div', 'sb-veil');
    veil.addEventListener('click', function(){ laci(false); });
    topbar = el('div', 'sb-top', '<button type="button" class="sb-menu" aria-label="Buka menu" aria-controls="sb-side" aria-expanded="false">' + ic('menu') + '</button><div class="sb-toptx"><b>Monitoring T&amp;D</b><small></small></div>');
    btnMenu = topbar.querySelector('.sb-menu'); judulTop = topbar.querySelector('small');
    btnMenu.addEventListener('click', function(){ laci(!document.body.classList.contains('sb-laci')); });
    side.querySelector('.sb-x').addEventListener('click', function(){ laci(false); btnMenu.focus(); });
    var tq = side.querySelector('.sb-tanya'); if (tq) tq.addEventListener('click', bukaTanya);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && document.body.classList.contains('sb-laci')) { laci(false); btnMenu.focus(); } });
    var mqf = function(){ if (!MQ.matches) laci(false); };
    if (MQ.addEventListener) MQ.addEventListener('change', mqf); else if (MQ.addListener) MQ.addListener(mqf);
    document.body.insertBefore(topbar, document.body.firstChild);
    document.body.appendChild(veil); document.body.appendChild(side);
    document.body.classList.add('sb-on');
    dash.onData(segarkan); segarkan();
    setTimeout(function(){ window.dispatchEvent(new Event('resize')); }, 50);
  }
  function segarkan(){
    var h = halNow();
    Object.keys(items).forEach(function(k){ if (k === h) items[k].setAttribute('aria-current', 'page'); else items[k].removeAttribute('aria-current'); });
    var a = items[h]; if (judulTop) judulTop.textContent = a ? ((GRUP[h] || 'Kinerja') + ' · ' + a.querySelector('.sb-t').textContent) : '';
    // label "contoh" untuk sub bidang yang datanya masih contoh
    var r; try { r = dash.data('capaian_kpi'); } catch (e) { r = null; }
    if (r && r.status === 'ok') {
      var c = {}; (r.data || []).forEach(function(d){ if (d.sumber === 'contoh') c[d.sub_bidang] = true; });
      Object.keys(items).forEach(function(k){ var t = items[k].querySelector('.sb-tag'); t.hidden = !c[k]; });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
})();
