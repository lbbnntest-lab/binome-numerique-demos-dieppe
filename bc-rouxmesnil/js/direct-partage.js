/* Partage du score en direct entre appareils, pour la démonstration au bureau (05/11/2026).
   Sans « ?partage=1 » dans l'adresse, ce fichier ne fait rien : la maquette garde son fonctionnement
   d'origine (score dans le navigateur, deux onglets).
   Avec « ?partage=1 » (retenu pour l'onglet, même après navigation, avec la page d'entrée) :
   - table-de-marque.html (ordinateur du présentateur) envoie le score « bcr-direct » à chaque changement,
     et toutes les 5 s, sur un canal de diffusion Supabase (aucune écriture en base, aucune donnée gardée) ;
   - direct.html (téléphones, via le QR code) reçoit ce score et l'écrit dans son propre navigateur ;
     direct.js le relit toutes les 1,5 s et affiche le changement.
   Seules la page publique et la table de marque chargent ce fichier. */
(function () {
  'use strict';
  var CLE = 'bcr-direct', DRAPEAU = 'bcr-partage';
  var CANAL = 'bcr-demo-direct-bureau-0511';
  var SB_URL = 'https://byosduzwxhudjjsdexgb.supabase.co';
  var SB_CLE = 'sb_publishable_41277wV5dt7I560_voV0og_s33YZuDc'; /* clé publique (la même que sur le site) */
  var SB_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.min.js';

  var page = document.body.getAttribute('data-page');
  if (page !== 'table-de-marque' && page !== 'direct') return;

  /* Le drapeau retient la page par laquelle l'onglet est entré avec « ?partage=1 ».
     Seul un onglet entré par la table de marque envoie : un téléphone arrivé par le QR code (page publique)
     qui ouvre ensuite la table de marque n'envoie jamais rien, donc ne peut pas écraser le score du présentateur. */
  var entree = '';
  try {
    if (/[?&]partage=1\b/.test(location.search)) sessionStorage.setItem(DRAPEAU, page);
    entree = sessionStorage.getItem(DRAPEAU) || '';
  } catch (e) { entree = /[?&]partage=1\b/.test(location.search) ? page : ''; }
  if (!entree) return;
  if (page === 'table-de-marque' && entree !== 'table-de-marque') return;

  function brut() { try { return localStorage.getItem(CLE) || ''; } catch (e) { return ''; } }

  var s = document.createElement('script');
  s.src = SB_JS;
  s.onload = demarrer;
  document.head.appendChild(s);

  function demarrer() {
    if (!window.supabase || !window.supabase.createClient) return;
    var sb = window.supabase.createClient(SB_URL, SB_CLE, { auth: { persistSession: false, autoRefreshToken: false } });
    var ch = sb.channel(CANAL, { config: { broadcast: { self: false } } });

    if (page === 'table-de-marque') {
      var dernier = null;
      var envoyer = function () {
        var v = brut();
        dernier = v;
        ch.send({ type: 'broadcast', event: 'score', payload: { v: v } });
      };
      ch.on('broadcast', { event: 'demande' }, envoyer);
      ch.subscribe(function (etat) {
        if (etat !== 'SUBSCRIBED') return;
        envoyer();
        setInterval(function () { if (brut() !== dernier) envoyer(); }, 300);
        setInterval(envoyer, 5000);
      });
    } else {
      ch.on('broadcast', { event: 'score' }, function (m) {
        var v = m && m.payload ? m.payload.v : null;
        if (typeof v !== 'string' || v === brut()) return;
        try { if (v) localStorage.setItem(CLE, v); else localStorage.removeItem(CLE); } catch (e) {}
      });
      ch.subscribe(function (etat) {
        if (etat === 'SUBSCRIBED') ch.send({ type: 'broadcast', event: 'demande', payload: {} });
      });
    }
  }
})();
