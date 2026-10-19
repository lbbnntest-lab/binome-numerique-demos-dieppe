/* Score en direct de la maquette BCR.
   - table-de-marque.html : un membre connecté du club (licencié, parent, coach ou dirigeant) « prend la table »
     et saisit le score ; chaque geste écrit « bcr-direct » dans localStorage. Un seul marqueur par match ;
     le coach ou un dirigeant peut reprendre la main.
   - direct.html : la page publique lit « bcr-direct » et se met à jour sans rechargement (événement « storage »,
     doublé d'une relecture toutes les 1,5 s au cas où le navigateur ne transmet pas l'événement entre fichiers locaux).
   Format partagé (contrat des clés communes), plus deux champs ajoutés (lus seulement par la table de marque,
   jamais par la page publique : le nom du marqueur n'est visible que des membres connectés du club) :
   {matchLib, equipe, dom, adv, scoreBcr, scoreAdv, periode, chrono, fautesBcr, fautesAdv, lienFacebook, termine, maj,
    marqueur:'famille B.', role:'parent'|'licencie'|'coach'|'dirigeant'}
   Adresse directe depuis l'espace licencié : table-de-marque.html?match=<id>&equipe=<u13|u15|u18|rf2>
   (facultatif : &adv=<nom adverse>&lieu=dom|ext pour un match qui n'est pas dans la liste).
   Sur le vrai site, la table enverrait le score par le serveur du club (temps réel) au lieu du stockage du navigateur. */
(function () {
  'use strict';
  var CLE = 'bcr-direct', PILE = 'bcr-direct-pile', COMPTE = 'bcr-tdm-compte';
  var FB_CLUB = 'https://www.facebook.com/BCRouxmesnil';
  var FFBB_CLUB = 'https://competitions.ffbb.com/ligues/nor/comites/0076/clubs/nor0076080';
  var PERIME = 6 * 3600e3; /* au-delà de 6 h sans saisie, le match n'est plus affiché comme en cours */
  var page = document.body.getAttribute('data-page');

  /* Matchs à venir connus (calendrier FFBB des U18 féminines, poule élite ; horaires non fixés). */
  var MATCHS = [
    { id: 'u18f-j1', d: '2026-11-07', eq: 'u18', equipe: 'U18 féminines élite', adv: 'Cherbourg Basket Ball', logo: 'cherbourg.png', dom: true },
    { id: 'u18f-j2', d: '2026-11-14', eq: 'u18', equipe: 'U18 féminines élite', adv: 'Aplemont Le Havre Basket 2', logo: 'aplemont.png', dom: false },
    { id: 'u18f-j3', d: '2026-11-21', eq: 'u18', equipe: 'U18 féminines élite', adv: 'USO Mondeville Basket 2', logo: 'mondeville.png', dom: true },
    { id: 'u18f-j4', d: '2026-11-28', eq: 'u18', equipe: 'U18 féminines élite', adv: 'Élan sportif Carpiquet Basket', logo: 'carpiquet.png', dom: false },
    { id: 'u18f-j5', d: '2026-12-05', eq: 'u18', equipe: 'U18 féminines élite', adv: "Club Basket d'Ifs 1", logo: 'ifs.png', dom: false }
  ];
  var EQUIPES = { u13: 'U13 féminines', u15: 'U15 féminines', u18: 'U18 féminines élite', rf2: 'Seniors féminines RF2' };
  /* Comptes de démonstration (exemples) : sur le vrai site, ce serait la connexion à l'espace du club. */
  var COMPTES = {
    'famille-b': { nom: 'famille B.', detail: 'parent de Léa, U15 F', role: 'parent' },
    'coach-u15': { nom: 'coach U15', detail: 'coach des U15 féminines', role: 'coach' },
    'president': { nom: 'président', detail: 'dirigeant du club', role: 'dirigeant' }
  };
  var AUTRE = { nom: 'famille M.', role: 'parent' };
  var JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function dateFr(s) { var d = new Date(s + 'T12:00'); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lire() { try { var v = JSON.parse(localStorage.getItem(CLE) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
  function brut() { try { return localStorage.getItem(CLE) || ''; } catch (e) { return ''; } }
  function ecrire(s) { s.maj = Date.now(); try { localStorage.setItem(CLE, JSON.stringify(s)); } catch (e) {} }
  function actif(s) { return !!s && typeof s.maj === 'number' && Date.now() - s.maj < PERIME; }
  function periodeLib(p) { p = +p || 1; return p <= 4 ? 'QT ' + p : (p === 5 ? 'Prol.' : 'Prol. ' + (p - 4)); }
  function periodeLong(p) { p = +p || 1; return p <= 4 ? 'Quart-temps ' + p : (p === 5 ? 'Prolongation' : 'Prolongation ' + (p - 4)); }
  function lieuLib(s) { return s.dom === false ? 'À l\'extérieur' + (s.adv ? ', chez ' + s.adv : '') : 'À domicile'; }
  function sigle(nom) {
    var m = String(nom || '').replace(/[^A-Za-zÀ-ÿ' -]/g, ' ').split(/[\s'-]+/).filter(function (w) { return w.length > 2 || /^[A-Z]{2,}$/.test(w); });
    return (m.map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 4)) || 'ADV';
  }
  function logoAdv(s) {
    var m = MATCHS.filter(function (x) { return x.adv === s.adv; })[0];
    return m ? '<img src="img/logos/' + m.logo + '" alt="" style="background:#fff">' : '<span class="sigle" aria-hidden="true">' + esc(sigle(s.adv)) + '</span>';
  }
  function heureFr(t) { var d = new Date(t); return d.getHours() + ' h ' + String(d.getMinutes()).padStart(2, '0'); }

  /* « Remettre la démonstration à zéro » (bandeau, mode présentation) : efface aussi le score en direct. */
  var raz = document.getElementById('raz-demo');
  if (raz) raz.addEventListener('click', function () { try { localStorage.removeItem(CLE); sessionStorage.removeItem(PILE); sessionStorage.removeItem(COMPTE); } catch (e) {} });

  /* ================= Page publique ================= */
  if (page === 'direct') {
    var zone = document.getElementById('direct-tableau'), etat = document.getElementById('direct-etat'), lib = document.getElementById('direct-lib');
    var suivi = document.getElementById('direct-suivi');
    var fb = document.getElementById('direct-fb'), majEl = document.getElementById('direct-maj'), fin = document.getElementById('direct-fin');
    var dernier = '', avant = null;
    var rendre = function () {
      var r = brut(); if (r === dernier) return; dernier = r;
      var s = lire();
      if (!actif(s)) {
        etat.className = 'etat-direct'; etat.querySelector('span:last-child').textContent = 'Pas de match en direct pour le moment';
        lib.textContent = 'Le tableau s\'affichera ici dès que la saisie commencera.'; suivi.textContent = '';
        zone.innerHTML = '<div class="sans-direct"><strong>En attente du prochain match</strong>Le score apparaîtra ici dès le premier panier saisi.</div>';
        fb.href = FB_CLUB; fb.textContent = 'Les directs sur la page Facebook du club';
        majEl.textContent = ''; fin.hidden = true; avant = null; return;
      }
      etat.className = 'etat-direct ' + (s.termine ? 'fini' : 'en-direct');
      etat.querySelector('span:last-child').textContent = s.termine ? 'Match terminé · score final' : 'En direct · ' + periodeLong(s.periode);
      lib.textContent = s.matchLib || '';
      /* La page publique ne lit jamais le champ « marqueur » : le nom de la personne à la table reste réservé au club. */
      suivi.textContent = lieuLib(s) + ' · Score suivi par un membre du club';
      var bcr = { nom: 'BCR', pts: +s.scoreBcr || 0, f: +s.fautesBcr || 0, logo: '<img src="img/logo-bcr.jpg" alt="">', k: 'bcr' };
      var adv = { nom: s.adv || 'Adversaire', pts: +s.scoreAdv || 0, f: +s.fautesAdv || 0, logo: logoAdv(s), k: 'adv' };
      var g = s.dom === false ? adv : bcr, d = s.dom === false ? bcr : adv;
      var bloc = function (e, cote) {
        return '<div class="td-eq ' + cote + '" data-eq="' + e.k + '"><div class="haut">' + e.logo + '<span class="nom">' + esc(e.nom) + '</span></div>'
          + '<span class="pts" data-pts="' + e.k + '">' + e.pts + '</span>'
          + (s.termine ? '' : '<span class="fautes">Fautes d\'équipe ' + e.f + '</span>') + '</div>';
      };
      zone.innerHTML = '<div class="tableau-direct" role="group" aria-label="Tableau de score">' + bloc(g, 'gauche')
        + '<div class="td-centre' + (s.termine ? ' fini' : '') + '"><small>' + (s.termine ? 'Score' : 'Période') + '</small><strong>' + (s.termine ? 'Final' : periodeLib(s.periode)) + '</strong></div>'
        + bloc(d, 'droite') + '</div>'
        + '<p class="visuellement-cache" aria-live="polite">' + esc('BCR ' + bcr.pts + ', ' + adv.nom + ' ' + adv.pts) + '</p>';
      if (avant) ['bcr', 'adv'].forEach(function (k) {
        var v = k === 'bcr' ? bcr.pts : adv.pts;
        if (v !== avant[k]) { var el = zone.querySelector('[data-pts="' + k + '"]'); if (el) el.classList.add('flash'); }
      });
      avant = { bcr: bcr.pts, adv: adv.pts };
      var lien = /^https:\/\//.test(s.lienFacebook || '') ? s.lienFacebook : '';
      fb.href = lien || FB_CLUB;
      fb.textContent = lien ? 'Regarder le direct sur Facebook' : 'La page Facebook du club';
      majEl.textContent = 'Dernière mise à jour à ' + heureFr(s.maj) + '.';
      fin.hidden = !s.termine;
    };
    window.addEventListener('storage', function (e) { if (e.key === CLE || e.key === null) rendre(); });
    setInterval(rendre, 1500);
    document.getElementById('direct-ffbb').href = FFBB_CLUB;
    rendre();
    return;
  }

  /* ================= Table de marque ================= */
  if (page !== 'table-de-marque') return;
  var $ = function (id) { return document.getElementById(id); };
  var etape1 = $('tdm-etape-match'), etape2 = $('tdm-etape-score');
  var sel = $('tdm-match'), libre = $('tdm-libre');
  var pile = [];
  try { pile = JSON.parse(sessionStorage.getItem(PILE) || '[]'); if (!Array.isArray(pile)) pile = []; } catch (e) { pile = []; }
  function garderPile() { try { sessionStorage.setItem(PILE, JSON.stringify(pile.slice(-60))); } catch (e) {} }
  function moi() { var id = null; try { id = sessionStorage.getItem(COMPTE); } catch (e) {} return COMPTES[id] ? { id: id, nom: COMPTES[id].nom, detail: COMPTES[id].detail, role: COMPTES[id].role } : null; }
  function connecter(id) { try { if (id) sessionStorage.setItem(COMPTE, id); else sessionStorage.removeItem(COMPTE); } catch (e) {} }
  /* Nom de la personne à la table : affiché seulement ici, aux membres connectés (jamais sur la page publique). */
  function qui(n) { return !n ? 'un autre membre du club' : (/^famille/.test(n) ? 'la ' : 'le ') + n; }
  function marqueurEstMoi(s, m) { return !!m && !!s && s.marqueur === m.nom; }

  /* Liste des matchs : domicile et extérieur, le lieu en tête de chaque ligne. */
  var aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);
  var avenir = MATCHS.filter(function (m) { return new Date(m.d + 'T23:59').getTime() >= aujourdhui.getTime(); });
  sel.innerHTML = avenir.map(function (m) {
    return '<option value="' + m.id + '">' + (m.dom ? 'Domicile' : 'EXTÉRIEUR') + ' · ' + dateFr(m.d) + ' · ' + m.equipe + ' ' + (m.dom ? 'contre ' : 'à ') + esc(m.adv) + '</option>';
  }).join('') + '<option value="libre">Autre match : saisie libre</option>';

  /* Ouverture directe depuis l'espace licencié : ?match=<id>&equipe=<code>[&adv=...&lieu=dom|ext] */
  var q = new URLSearchParams(location.search), qm = q.get('match'), qe = q.get('equipe'), qa = q.get('adv'), ql = q.get('lieu');
  var connu = avenir.filter(function (m) { return m.id === qm; })[0];
  if (connu) sel.value = connu.id;
  else if (qm || qe || qa) {
    sel.value = 'libre';
    if (qe && EQUIPES[qe]) $('tdm-eq').value = EQUIPES[qe];
    if (qa) $('tdm-adv').value = qa.slice(0, 60);
    if (ql === 'ext' || ql === 'dom') $('tdm-dom').value = ql;
  }
  function majLibre() {
    libre.hidden = sel.value !== 'libre';
    var m = MATCHS.filter(function (x) { return x.id === sel.value; })[0], ext = m ? !m.dom : $('tdm-dom').value === 'ext';
    var b = $('tdm-lieu'); b.textContent = ext ? 'Match à l\'extérieur' : 'Match à domicile'; b.className = 'tdm-lieu' + (ext ? ' ext' : '');
  }
  sel.addEventListener('change', majLibre); $('tdm-dom').addEventListener('change', majLibre); majLibre();

  function validerLien(v) {
    v = (v || '').trim(); if (!v) return { ok: true, v: '' };
    var u; try { u = new URL(v); } catch (e) { return { ok: false }; }
    var h = u.hostname.replace(/^www\.|^m\.|^web\./, '');
    if (u.protocol !== 'https:' || !/^(facebook\.com|fb\.watch|fb\.com)$/.test(h)) return { ok: false };
    return { ok: true, v: u.href };
  }
  var MSG_LIEN = 'Collez le lien copié depuis Facebook : il commence par https://www.facebook.com/ ou https://fb.watch/.';

  function matchChoisi(err) {
    if (sel.value === 'libre') {
      var adv = $('tdm-adv').value.trim(), eq = $('tdm-eq').value.trim(), dom = $('tdm-dom').value === 'dom';
      if (!adv) { err('Indiquez le nom de l\'équipe adverse.'); $('tdm-adv').focus(); return null; }
      return { matchLib: (eq || 'BCR') + (dom ? ' contre ' : ' à ') + adv, equipe: eq || 'BCR', dom: dom, adv: adv };
    }
    var m = MATCHS.filter(function (x) { return x.id === sel.value; })[0];
    return { matchLib: m.equipe + ' ' + (m.dom ? 'contre ' : 'à ') + m.adv + ', ' + dateFr(m.d), equipe: m.equipe, dom: m.dom, adv: m.adv };
  }
  function nouveauMatch(s, lienFb, pers) {
    s.scoreBcr = 0; s.scoreAdv = 0; s.periode = 1; s.chrono = null; s.fautesBcr = 0; s.fautesAdv = 0;
    s.lienFacebook = lienFb; s.termine = false; s.marqueur = pers.nom; s.role = pers.role;
    return s;
  }

  $('tdm-commencer').addEventListener('click', function () {
    var errEl = $('tdm-err-match'), err = function (t) { errEl.textContent = t; errEl.hidden = false; };
    errEl.hidden = true;
    var m = moi(); if (!m) { err('Connectez-vous à votre espace du club pour prendre la table.'); return; }
    var deja = lire();
    if (actif(deja) && !deja.termine && !marqueurEstMoi(deja, m)) { afficher(); return; }
    var l = validerLien($('tdm-fb').value); if (!l.ok) { err(MSG_LIEN); return; }
    var s = matchChoisi(err); if (!s) return;
    pile = []; garderPile(); ecrire(nouveauMatch(s, l.v, m)); derniere('vous avez pris la table : 0 à 0, quart-temps 1.'); afficher();
  });
  /* Démonstration du cas « un autre parent a déjà pris la table ». */
  $('tdm-simuler').addEventListener('click', function () {
    var s = lire();
    if (actif(s) && !s.termine) { s.marqueur = AUTRE.nom; s.role = AUTRE.role; ecrire(s); }
    else {
      var errEl = $('tdm-err-match'); errEl.hidden = true;
      var n = matchChoisi(function (t) { errEl.textContent = t; errEl.hidden = false; }); if (!n) return;
      ecrire(nouveauMatch(n, '', AUTRE));
    }
    pile = []; garderPile(); derniere(''); afficher();
  });
  $('tdm-reprendre').addEventListener('click', function () {
    var m = moi(), s = lire(); if (!m || !s || (m.role !== 'coach' && m.role !== 'dirigeant')) return;
    s.marqueur = m.nom; s.role = m.role; ecrire(s); pile = []; garderPile();
    derniere('vous avez repris la main sur la saisie.'); afficher();
  });
  $('tdm-connexion').addEventListener('click', function () { connecter($('tdm-compte').value || 'famille-b'); afficher(); });
  $('tdm-compte').addEventListener('change', function () { if (moi()) { connecter(this.value); afficher(); } });
  $('tdm-deconnexion').addEventListener('click', function () { connecter(null); afficher(); });

  function action(modif, texte) {
    var s = lire(); if (!s || !peutSaisir(s)) { afficher(); return; }
    pile.push(JSON.stringify(s)); garderPile();
    modif(s); ecrire(s); derniere(texte); afficher();
  }
  function peutSaisir(s) { var m = moi(); return !!m && actif(s) && marqueurEstMoi(s, m); }
  function derniere(t) { $('tdm-derniere').textContent = t ? 'Dernière action : ' + t : ''; }
  function nomAdv() { var s = lire(); return (s && s.adv) || 'adversaire'; }

  Array.prototype.forEach.call(document.querySelectorAll('[data-pts]'), function (b) {
    b.addEventListener('click', function () {
      var n = +b.getAttribute('data-pts'), k = b.getAttribute('data-eq');
      action(function (s) { if (k === 'bcr') s.scoreBcr += n; else s.scoreAdv += n; }, '+' + n + ' ' + (k === 'bcr' ? 'BCR' : nomAdv()) + '.');
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-faute]'), function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-faute');
      action(function (s) { if (k === 'bcr') s.fautesBcr += 1; else s.fautesAdv += 1; }, 'faute d\'équipe ' + (k === 'bcr' ? 'BCR' : nomAdv()) + '.');
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-periode]'), function (b) {
    b.addEventListener('click', function () {
      var s = lire(); if (!s) return;
      var p = b.getAttribute('data-periode'), np = p === 'P' ? (s.periode >= 5 ? s.periode + 1 : 5) : +p;
      if (np === s.periode) return;
      /* Les fautes d'équipe repartent de zéro à chaque quart-temps ; en prolongation, elles continuent celles du 4e. */
      action(function (x) { x.periode = np; if (np <= 4) { x.fautesBcr = 0; x.fautesAdv = 0; } }, periodeLong(np).toLowerCase() + '.');
    });
  });
  $('tdm-annuler').addEventListener('click', function () {
    var s = lire(); if (!pile.length || !peutSaisir(s)) return;
    var prec = JSON.parse(pile.pop()); garderPile();
    prec.marqueur = s.marqueur; prec.role = s.role; ecrire(prec);
    derniere('annulation, retour à ' + prec.scoreBcr + ' à ' + prec.scoreAdv + '.'); afficher();
  });
  var btFin = $('tdm-fin'), attenteFin = null;
  btFin.addEventListener('click', function () {
    if (!btFin.classList.contains('confirmer')) {
      btFin.classList.add('confirmer'); btFin.textContent = 'Confirmer la fin du match';
      clearTimeout(attenteFin); attenteFin = setTimeout(remettreFin, 5000); return;
    }
    remettreFin();
    action(function (s) { s.termine = true; }, 'fin du match.');
  });
  function remettreFin() { clearTimeout(attenteFin); btFin.classList.remove('confirmer'); btFin.textContent = 'Fin du match'; }
  $('tdm-lien-ok').addEventListener('click', function () {
    var l = validerLien($('tdm-fb2').value), m = $('tdm-lien-msg');
    if (!l.ok) { m.className = 'msg erreur'; m.textContent = MSG_LIEN; m.hidden = false; return; }
    action(function (s) { s.lienFacebook = l.v; }, l.v ? 'lien du direct Facebook enregistré.' : 'lien du direct retiré.');
    m.className = 'msg'; m.textContent = l.v ? 'Lien enregistré : le bouton « Regarder le direct sur Facebook » apparaît sur la page publique.' : 'Lien retiré : la page publique renvoie vers la page Facebook du club.'; m.hidden = false;
  });
  $('tdm-nouveau').addEventListener('click', function () {
    try { localStorage.removeItem(CLE); } catch (e) {}
    pile = []; garderPile(); derniere(''); afficher();
  });

  function afficher() {
    var s = lire(), en = actif(s), m = moi();
    /* Accès */
    $('tdm-deconnecte').hidden = !!m; $('tdm-connecte').hidden = !m;
    if (m) { $('tdm-qui').textContent = m.nom.charAt(0).toUpperCase() + m.nom.slice(1) + ' (' + m.detail + ')'; $('tdm-compte').value = m.id; }
    $('tdm-commencer').disabled = !m;
    $('tdm-commencer').textContent = m ? 'Prendre la table et commencer' : 'Prendre la table (connexion nécessaire)';
    etape1.hidden = en; etape2.hidden = !en;
    if (!en) return;
    var advNom = s.adv || 'Adversaire', ok = peutSaisir(s);
    $('tdm-lib').textContent = s.matchLib || '';
    $('tdm-lieu-jeu').textContent = s.dom === false ? 'Match à l\'extérieur' : 'Match à domicile';
    $('tdm-lieu-jeu').className = 'tdm-lieu' + (s.dom === false ? ' ext' : '');
    $('tdm-n-adv').textContent = advNom;
    $('tdm-p-bcr').textContent = s.scoreBcr;
    $('tdm-p-adv').textContent = s.scoreAdv;
    $('tdm-per').textContent = s.termine ? 'Final' : periodeLib(s.periode);
    $('tdm-h-adv').textContent = advNom;
    $('tdm-f-bcr').textContent = 'Fautes d\'équipe : ' + s.fautesBcr;
    $('tdm-f-adv').textContent = 'Fautes d\'équipe : ' + s.fautesAdv;
    Array.prototype.forEach.call(document.querySelectorAll('[data-periode]'), function (b) {
      var p = b.getAttribute('data-periode');
      b.setAttribute('aria-pressed', String(p === 'P' ? s.periode >= 5 : +p === s.periode));
      if (p === 'P') b.textContent = s.periode > 5 ? 'Prol. ' + (s.periode - 4) : 'Prol.';
    });
    /* Qui tient la table */
    var info = $('tdm-marqueur'), rep = $('tdm-reprendre');
    if (!m) info.innerHTML = '<strong>Connectez-vous pour saisir le score.</strong> Sans connexion, les boutons restent inactifs ; le score se suit sur la <a href="direct.html">page publique</a>.';
    else if (ok) info.innerHTML = '<strong>Vous tenez la table</strong> : vous êtes le seul à pouvoir saisir le score de ce match.';
    else info.innerHTML = '<strong>Score suivi par ' + esc(qui(s.marqueur)) + '.</strong> Un seul marqueur par match : vous voyez le score ici sans pouvoir le modifier.';
    info.className = 'tdm-marqueur' + (ok ? ' moi' : '');
    rep.hidden = !(m && !ok && !s.termine && (m.role === 'coach' || m.role === 'dirigeant'));
    $('tdm-simuler2').hidden = !(ok && !s.termine);
    Array.prototype.forEach.call(etape2.querySelectorAll('#tdm-jeu button, #tdm-fin, #tdm-lien-ok, #tdm-fb2'), function (b) { b.disabled = !ok; });
    $('tdm-annuler').disabled = !ok || !pile.length;
    var jeu = $('tdm-jeu'), finZone = $('tdm-termine');
    jeu.hidden = !!s.termine; finZone.hidden = !s.termine;
    btFin.hidden = !!s.termine;
    $('tdm-nouveau').hidden = !m;
    if (s.termine) $('tdm-final').textContent = 'BCR ' + s.scoreBcr + ' - ' + s.scoreAdv + ' ' + advNom;
    var fb2 = $('tdm-fb2'); if (document.activeElement !== fb2) fb2.value = s.lienFacebook || '';
  }
  $('tdm-simuler2').addEventListener('click', function () { $('tdm-simuler').click(); });
  /* Un autre téléphone peut prendre ou reprendre la table : on suit ses changements. */
  window.addEventListener('storage', function (e) { if (e.key === CLE || e.key === null) afficher(); });
  afficher();
})();
