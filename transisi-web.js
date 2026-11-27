/* Animasi pindah tab dan sub-tab (permintaan Zuhal 27 Nov 2026).
   1. Tab utama dan menu sidebar: perubahan parameter hal (dash.setParams) dianimasikan setelah dash selesai menggambar (dash.onData).
   2. Sub-tab EPM (epm_kpi): panel #epm-panel.
   3. Sub-tab lokal (Transmisi, Rensisdist/MDU, Profil aset/Health index): lewat klik.
   Animasi hanya opacity + geser kecil, jadi ukuran peta dan grafik tidak berubah. Dimatikan bila prefers-reduced-motion. */
(function(){
  if (!window.dash) return;
  var MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  var KUNCI = {hal:'utama', epm_kpi:'epm'};
  var tunda = {};

  function tampak(e){ return e && !e.hidden && e.getClientRects().length > 0; }
  function animasi(els, kls){
    if (MQ.matches) return;
    els.forEach(function(e){
      if (!tampak(e)) return;
      e.classList.remove('tx-in', 'tx-in-sub');
      void e.offsetWidth;
      e.classList.add(kls);
      var lepas = function(){ e.classList.remove(kls); e.removeEventListener('animationend', lepas); };
      e.addEventListener('animationend', lepas);
      setTimeout(lepas, 600);
    });
  }
  function panelUtama(){ return Array.prototype.slice.call(document.querySelectorAll('#dash-root section[data-hal]')); }

  var asli = dash.setParams;
  dash.setParams = function(o){
    var lama = dash.params();
    Object.keys(KUNCI).forEach(function(k){ if (o && k in o && o[k] !== lama[k]) tunda[KUNCI[k]] = true; });
    return asli.apply(this, arguments);
  };
  dash.onData(function(){
    if (tunda.utama) animasi(panelUtama(), 'tx-in');
    else if (tunda.epm) animasi([document.getElementById('epm-panel')], 'tx-in-sub');
    tunda = {};
  });

  var SUB = [
    ['.trs-tab', function(){ return [document.getElementById('trs-isi')]; }],
    ['.rs-subtab', function(){ return panelUtama().filter(function(s){ return s.id !== 'rs-subnav' && s.getAttribute('data-hal').split(' ').indexOf('Rensisdist') >= 0; }); }],
    ['.hi-tab', function(b){ var c = b.closest('.pa-bcol'); return c ? Array.prototype.slice.call(c.querySelectorAll('.pa-bpanel')) : []; }]
  ];
  document.addEventListener('click', function(ev){
    var t = ev.target;
    SUB.forEach(function(s){
      var b = t.closest && t.closest(s[0]);
      if (!b || b.getAttribute('aria-selected') === 'true') return;
      setTimeout(function(){ requestAnimationFrame(function(){ animasi(s[1](b), 'tx-in-sub'); }); }, 0);
    });
  }, true);
})();
