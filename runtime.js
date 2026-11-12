/* Pengganti runtime dashboard Claude untuk versi web mandiri.
   Menyediakan dash.calc, dash.draw, dash.data, dash.params, dash.setParams, dash.onData, dash.setLink.
   Dataset dimuat dari folder data/ hanya saat pertama kali dibutuhkan. */
(function(){
  'use strict';
  var SRC = window.__SOURCES || {};
  var P = {}, calcs = {}, draws = {}, onData = [], mounted = new Map();
  var raw = {}, state = {};
  var queued = false;
  function schedule(){ if (queued) return; queued = true; setTimeout(function(){ queued = false; runAll(); }, 0); }
  function load(id){
    var s = SRC[id]; state[id] = 'loading';
    fetch(s.file + '?v=' + s.v).then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return s.format === 'csv' ? r.text() : r.json();
    }).then(function(d){
      raw[id] = s.format === 'csv' ? d3.csvParse(d) : d; state[id] = 'ok'; schedule();
    }).catch(function(e){ console.error('Gagal memuat data ' + id + ': ' + e.message); state[id] = 'error'; schedule(); });
  }
  function data(id){
    if (SRC[id]) {
      if (!state[id]) load(id);
      return state[id] === 'ok' ? {status:'ok', data:raw[id]} : {status:state[id]};
    }
    var c = calcs[id];
    if (!c) return {status:'error'};
    if (c.cache) return {status:'ok', data:c.cache};
    var ins = c.inputs.map(data);
    if (ins.some(function(x){ return x.status === 'error'; })) return {status:'error'};
    if (ins.some(function(x){ return x.status !== 'ok'; })) return {status:'loading'};
    try { c.cache = c.fn.apply(null, ins.map(function(x){ return x.data; })); }
    catch (e) { console.error('Hitungan ' + id + ' gagal: ' + (e.stack || e)); return {status:'error'}; }
    return {status:'ok', data:c.cache};
  }
  function visible(el){ return !el.closest('[hidden]'); }
  function runAll(){
    onData.forEach(function(f){ try { f(); } catch (e) { console.error(e); } });
    Object.keys(draws).forEach(function(name){
      var def = draws[name];
      document.querySelectorAll('[data-draw="' + name + '"]').forEach(function(el){
        if (!visible(el)) return;
        try {
          if (typeof def === 'function') def(el);
          else { var m = mounted.get(el); if (!m) { el.replaceChildren(); m = def.mount(el); mounted.set(el, m); } def.update(el, m); }
        } catch (e) { console.error('Gambar ' + name + ' gagal: ' + (e.stack || e)); }
      });
    });
  }
  window.dash = {
    calc: function(id, o){ calcs[id] = o; },
    draw: function(name, def){ if (def === undefined) { schedule(); return; } draws[name] = def; },
    data: data,
    params: function(){ return Object.assign({}, P); },
    setParams: function(o){ Object.keys(o).forEach(function(k){ var v = o[k]; if (v == null) delete P[k]; else P[k] = v; }); schedule(); },
    setLink: function(h){ try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch (e) {} },
    onData: function(f){ onData.push(f); },
    loader: function(){}, colors: {}
  };
  window.__mulai = function(){
    runAll();
    var root = document.getElementById('dash-root'), lastW = root ? root.clientWidth : 0, t = null;
    if (root && window.ResizeObserver) new ResizeObserver(function(){
      var w = root.clientWidth; if (Math.abs(w - lastW) < 2) return; lastW = w;
      clearTimeout(t); t = setTimeout(runAll, 150);
    }).observe(root);
  };
})();
