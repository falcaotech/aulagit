/*
 * Captura first-party de origem (UTMs + click IDs) e repasse ao checkout da Kiwify.
 * Colocar no <head> das paginas de inscricao e de vendas (ou via GTM, tag HTML personalizada).
 * Formato do sck: vid~fbp~fbc~gclid  (o webhook em ../webhook/server.js le este formato)
 */
(function () {
  var KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','fbclid','gclid','ttclid'];
  var STORE = 'trk_v1', DAYS = 90;

  function getCookie(n){var m=document.cookie.match('(?:^|; )'+n+'=([^;]*)');return m?decodeURIComponent(m[1]):'';}
  function setCookie(n,v,d){document.cookie=n+'='+encodeURIComponent(v)+';max-age='+d*86400+';path=/;domain=.'+location.hostname.replace(/^www\./,'')+';SameSite=Lax;Secure';}

  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) || getCookie(STORE) || '{}'); } catch(e){}

  var p = new URLSearchParams(location.search), found = false, cur = {};
  KEYS.forEach(function(k){ if(p.get(k)){ cur[k]=p.get(k); found=true; } });

  if (found) {                              // visita com origem identificada
    if (!saved.first) saved.first = cur;    // first touch preservado
    saved.last = cur;                       // last touch
    saved.landing = location.href.split('#')[0];
    saved.referrer = document.referrer;
    saved.ts = Date.now();
  } else if (!saved.last && document.referrer) {   // organico sem UTM: registra referrer
    var host = ''; try { host = new URL(document.referrer).hostname; } catch(e){}
    if (host && host !== location.hostname) {
      saved.last = {utm_source: host, utm_medium: 'referral'};
      if (!saved.first) saved.first = saved.last;
    }
  }
  if (!saved.vid) saved.vid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now())+Math.random();

  var s = JSON.stringify(saved);
  try { localStorage.setItem(STORE, s); } catch(e){}
  setCookie(STORE, s, DAYS);

  // Preenche campos ocultos de formularios de inscricao: <input type="hidden" name="utm_source"> etc.
  function fillForms(){
    var o = saved.last || {}, f = saved.first || {};
    document.querySelectorAll('input[type="hidden"]').forEach(function(i){
      var n = i.name || '';
      if (o[n] !== undefined) i.value = o[n];
      else if (n === 'vid') i.value = saved.vid;
      else if (n === 'fbp') i.value = getCookie('_fbp');
      else if (n === 'fbc') i.value = getCookie('_fbc') || (o.fbclid ? 'fb.1.'+saved.ts+'.'+o.fbclid : '');
      else if (n.indexOf('first_') === 0 && f[n.slice(6)] !== undefined) i.value = f[n.slice(6)];
      else if (n === 'landing') i.value = saved.landing || location.href;
    });
  }

  // Decora links do checkout da Kiwify
  function decorate(){
    var o = saved.last || {};
    document.querySelectorAll('a[href*="kiwify.com"]').forEach(function(a){
      var u = new URL(a.href);
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id'].forEach(function(k){ if(o[k]) u.searchParams.set(k,o[k]); });
      u.searchParams.set('src', (o.utm_source||'direct')+'|'+(o.utm_medium||'none'));
      var sck = [saved.vid, getCookie('_fbp'), getCookie('_fbc') || (o.fbclid ? 'fb.1.'+saved.ts+'.'+o.fbclid : ''), o.gclid||''].join('~');
      u.searchParams.set('sck', sck);
      a.href = u.toString();
    });
  }

  function run(){ fillForms(); decorate(); }
  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
})();
