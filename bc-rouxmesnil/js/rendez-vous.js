/* Espace dirigeants, bloc « Publications du week-end » (démonstration). Lié uniquement depuis dirigeants.html.
   Tout se prépare tout seul à partir de la date du jour (paramètre facultatif ?aujourdhui=AAAA-MM-JJ pour en essayer une autre)
   et de js/donnees-ffbb.js (calendrier et résultats relevés sur le site de la fédération) :
     « Les rendez-vous du week-end » : le prochain week-end de matchs (samedi et dimanche), texte Facebook dans le style de la page du club
        (sections par jour, puis à domicile / à l'extérieur) et affiches 1080 x 1350 (couverture, puis une par jour et par lieu) ;
     « Les résultats du week-end » : le dernier week-end passé qui compte au moins un score, même style, une affiche par jour.
   Salles : js/salles-ffbb.js (salle relevée pour le match, sinon salle du club à domicile ; à l'extérieur, salles connues seulement). Une salle inconnue
   n'est jamais devinée : la ligne « salle » est omise. Un horaire non fixé s'écrit avec le jour seul.
   Thème du mois (mois de la date du jour) : octobre rose, novembre bleu (Movember), sinon vert et noir du club.
   Les émojis sont réservés au texte destiné à Facebook (style réel du club) ; aucun émoji sur les affiches.
   Texte modifiable, Copier, Valider et Publier (simulés) passent par les cartes de js/publications.js. Rien n'est envoyé ni publié. */
(function () {
  'use strict';
  var zone = document.getElementById('rdv-zone');
  if (!zone) return;
  var D = window.BCR_FFBB, X = window.BCRExport, PUB = window.BCRPub, SAL = window.BCR_SALLES || { domicile: ['Salle Alexandre-Cheruel', 'Rouxmesnil-Bouteilles'], matchs: {} };
  if (!D || !D.equipes) { zone.innerHTML = '<p class="aide">Les données de la fédération ne sont pas chargées sur cette page.</p>'; return; }

  /* Les 19 équipes de championnat (codes de la fédération ; libellé court quand l'équipe n'a pas de code). */
  var EQ = [
    { id: 'rm3', code: 'RM3' }, { id: 'prm', code: 'PRM' }, { id: 'dm3', code: 'DM3' }, { id: 'dm6', code: 'DM6' },
    { id: 'rf2', code: 'RF2' }, { id: 'df2', code: 'DF2' }, { id: 'df3', code: 'DF3' }, { id: 'u21', code: 'RMU21' },
    { id: 'u18f1', code: 'RFU18' }, { id: 'dfu18', code: 'DFU18' }, { id: 'dmu18a', code: 'DMU18G1' }, { id: 'dmu18b', code: 'DMU18G2' },
    { id: 'dmu18c', code: '', lib: 'U18 masculins 3' }, { id: 'u15f', code: 'DFU15' }, { id: 'dmu15a', code: 'DMU15' }, { id: 'dmu15b', code: 'DMU15G2' },
    { id: 'u13f', code: 'DFU13' }, { id: 'dmu13', code: 'DMU13' }, { id: 'u11', code: '', lib: 'U11 mixte' }
  ];
  var PAR_AFFICHE = 8;                       /* lignes au plus par affiche */
  var SEP = '━━━━━━━━━━━━━━';
  var LOGO_BCR = 'img/logo-bcr-160.webp';

  /* ---------- Petits outils (dates toujours en heure locale) ---------- */
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function jour(s) { var a = s.slice(0, 10).split('-'); return new Date(+a[0], +a[1] - 1, +a[2], 12); }
  function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function plusJ(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); }
  function jm(d) { return (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + MOIS[d.getMonth()]; }
  function dateLongue(s) { var d = jour(s); return JOURS[d.getDay()] + ' ' + jm(d); }
  function maj1(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function maj(t) { return String(t).toUpperCase().replace(/(^|[^0-9A-Z])1ER(?![A-Z])/g, function (m, a) { return a + '1er'; }); }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pl(n, un, plus) { return n + ' ' + (n > 1 ? plus : un); }
  function liste(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1]; }

  var AUJ, testee = false;
  (function () {
    var m = /[?&]aujourdhui=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    if (m && iso(jour(m[1])) === m[1]) { AUJ = m[1]; testee = true; } else AUJ = iso(new Date());
  })();

  /* ---------- Thème du mois ---------- */
  function themeDe(auj) {
    var m = +auj.slice(5, 7);
    if (m === 10) return { id: 'rose', fond: '#d8186f', accent: '#ff8cc0', nom: 'Octobre rose', emb: 'ruban', coeur: '💗' };
    if (m === 11) return { id: 'bleu', fond: '#1f66c9', accent: '#7db8ff', nom: 'Movember', emb: 'moustache', coeur: '💙' };
    return { id: 'vert', fond: '#1f7a3f', accent: '#46c46f', nom: '', emb: 'ballon', coeur: '💚' };
  }
  var TH = themeDe(AUJ);

  /* ---------- Les matchs du samedi et du dimanche ---------- */
  function salleDe(m) {
    var s = (SAL.matchs || {})[m.id + '|' + m.j] || (m.dom ? SAL.domicile : null);   /* salle relevée pour ce match, sinon celle du club à domicile */
    return s ? [s[0], s[1].replace('-Bouteilles', '')] : null;
  }
  var brut = [];
  EQ.forEach(function (e, ord) {
    var src = D.equipes[e.id]; if (!src || !src.matchs) return;
    src.matchs.forEach(function (x) {
      if (x.adv === 'Exempt') return;                                  /* équipe exempte : pas de match */
      var j = x.d.slice(0, 10), g = jour(j).getDay();
      if (g !== 6 && g !== 0) return;                                  /* seuls le samedi et le dimanche */
      var der = /^BC Rouxmesnil (\d)/.exec(x.adv);
      brut.push({ id: e.id, ord: ord, lib: e.code || e.lib, j: j, g: g, t: x.d.length >= 16 ? x.d.slice(11, 16) : '', dom: !!x.dom,
        adv: der ? 'BCR équipe ' + der[1] + ' (derby du club)' : x.adv, sig: x.sig || '', logo: der ? LOGO_BCR : (x.logo || ''), s: x.s || null, der: !!der, cat: e.id.replace(/[abc]$/, '') });
    });
  });
  /* Un derby entre deux équipes du club apparaît dans les deux calendriers : on ne garde que le côté « à domicile ». */
  var TOUS = [], derbys = {};
  brut.forEach(function (m) {
    if (!m.der) { TOUS.push(m); return; }
    var k = m.j + '|' + m.cat, a = derbys[k];
    if (!a || (!a.dom && m.dom)) derbys[k] = m;
  });
  Object.keys(derbys).forEach(function (k) { TOUS.push(derbys[k]); });
  function parHeure(a, b) { var x = a.j + 'T' + (a.t || '99:99'), y = b.j + 'T' + (b.t || '99:99'); return x < y ? -1 : x > y ? 1 : a.ord - b.ord; }
  TOUS.sort(parHeure);
  function samediDe(j) { var d = jour(j); return d.getDay() === 6 ? j : iso(plusJ(d, -1)); }
  var WE = {};
  TOUS.forEach(function (m) { var s = samediDe(m.j); (WE[s] = WE[s] || { sam: s, dim: iso(plusJ(jour(s), 1)), ms: [] }).ms.push(m); });
  var WEL = Object.keys(WE).sort().map(function (k) { return WE[k]; });

  /* Le prochain week-end de matchs (à partir d'aujourd'hui) et le dernier week-end passé qui a au moins un score. */
  var t0 = jour(AUJ), g0 = t0.getDay(), debutCourant = g0 === 6 ? AUJ : g0 === 0 ? iso(plusJ(t0, -1)) : iso(plusJ(t0, 6 - g0));
  var prochain = null, passe = null, dernierPasse = null;
  WEL.forEach(function (w) {
    var avenir = w.ms.filter(function (m) { return m.j >= AUJ; });
    if (!prochain && w.dim >= AUJ && avenir.length) prochain = { sam: w.sam, dim: w.dim, ms: avenir };
    if (w.dim < AUJ) {
      dernierPasse = w;
      var sc = w.ms.filter(function (m) { return m.s && !m.der; });
      if (sc.length) passe = { sam: w.sam, dim: w.dim, ms: sc, total: w.ms.filter(function (m) { return !m.der; }).length };
    }
  });

  /* ---------- Libellés de dates ---------- */
  function datesTitre(w) {     /* « 7 et 8 novembre », « 31 octobre et 1er novembre » */
    var a = jour(w.sam), b = jour(w.dim);
    return a.getMonth() === b.getMonth() ? jm(a).replace(' ' + MOIS[a.getMonth()], '') + ' et ' + jm(b) : jm(a) + ' et ' + jm(b);
  }
  function joursDe(w) { var s = {}; w.ms.forEach(function (m) { s[m.j] = 1; }); return [w.sam, w.dim].filter(function (j) { return s[j]; }); }
  function datesTexte(w) {     /* « Samedi 17 & dimanche 18 octobre 2026 », « Samedi 7 novembre 2026 » */
    var js = joursDe(w), an = jour(js[0]).getFullYear();
    if (js.length === 1) return maj1(dateLongue(js[0])) + ' ' + an;
    var a = jour(js[0]), b = jour(js[1]);
    return maj1(JOURS[a.getDay()] + ' ' + (a.getMonth() === b.getMonth() ? (a.getDate() === 1 ? '1er' : a.getDate()) : jm(a)) + ' & ' + dateLongue(js[1])) + ' ' + an;
  }
  function heureTxt(m) { return m.t ? m.t.replace(':', 'h') : maj1(JOURS[m.g]); }          /* « 14h00 », ou le jour seul */
  function salleTxt(m) { var s = salleDe(m); return s ? s[0] + ' – ' + s[1] : ''; }

  /* ---------- Paragraphes communs ---------- */
  function paragrapheTheme() {
    if (TH.id === 'rose') return ['🎀 OCTOBRE ROSE – LE BCR SE MOBILISE ! 💗',
      'Durant tout le mois d\'octobre, le Basket Club de Rouxmesnil soutient la lutte contre le cancer du sein.',
      'Sur les terrains comme dans les tribunes, portons ensemble les couleurs d\'Octobre Rose ! 💗'];
    if (TH.id === 'bleu') {
      var l = ['💙 MOVEMBER – ON PORTE LA MOUSTACHE AVEC PANACHE ! 💙',
        'En novembre, le Basket Club de Rouxmesnil porte la moustache avec panache pour Movember !'];
      if (AUJ <= '2026-11-20') l.push('🏆 Rendez-vous le vendredi 20 novembre à partir de 19h à la salle Alexandre-Cheruel : tournoi masculin (U18 à seniors), animations, vente de t-shirts et d’objets du club, restauration sur place.');
      return l;
    }
    return [];
  }
  var FIN = '💚🖤 ENSEMBLE, PLUS FORTS ! ALLEZ LE BCR ! 🏀';
  function tete(titre, coeur, emoji) { return emoji + coeur + ' ' + titre + ' – BCR ' + coeur + emoji; }

  /* ---------- Rendez-vous du week-end ---------- */
  function groupes(w, j) {
    var jm_ = w.ms.filter(function (m) { return m.j === j; });
    return { dom: jm_.filter(function (m) { return m.dom; }), ext: jm_.filter(function (m) { return !m.dom; }) };
  }
  function texteRdv(w) {
    var js = joursDe(w), dom = w.ms.filter(function (m) { return m.dom; }).length, ext = w.ms.length - dom, L = [];
    L.push(tete('LES RENDEZ-VOUS DU WEEK-END', TH.coeur, '🏀'));
    L.push('🔥 Un nouveau week-end de compétition attend nos équipes du Basket Club de Rouxmesnil !');
    L.push('📅 ' + datesTexte(w) + ', nos équipes seront mobilisées ' + (dom && ext ? 'à domicile comme à l\'extérieur' : dom ? 'à domicile' : 'à l\'extérieur') + ' pour défendre les couleurs du BCR ! 💪');
    js.forEach(function (j) {
      var g = groupes(w, j);
      L.push(SEP); L.push('📅 ' + maj(dateLongue(j)));
      if (g.dom.length) {
        L.push('🏠 ' + (g.dom.length > 1 ? 'MATCHS' : 'MATCH') + ' À DOMICILE');
        var club = salleTxt({ dom: true, id: '', j: '' });
        L.push('📍 ' + club);
        g.dom.forEach(function (m) {
          var autre = salleTxt(m) !== club ? ' (' + salleDe(m)[0] + ')' : '';   /* match à domicile dans une autre salle : écrite sur la ligne du match */
          L.push('🏀 ' + heureTxt(m) + ' | ' + m.lib + autre); L.push('🆚 ' + m.adv);
        });
      }
      if (g.ext.length) {
        L.push('🚌 ' + (g.ext.length > 1 ? 'MATCHS' : 'MATCH') + ' À L\'EXTÉRIEUR');
        g.ext.forEach(function (m) {
          L.push('🏀 ' + heureTxt(m) + ' | ' + m.lib); L.push('🆚 ' + m.adv);
          var s = salleTxt(m); if (s) L.push('📍 ' + s);
        });
      }
    });
    L.push(SEP);
    var th = paragrapheTheme();
    if (th.length) L = L.concat(th, '');
    L.push('📣 SUPPORTERS, ON COMPTE SUR VOUS !');
    L.push(dom ? '🔥 Venez nombreux encourager nos équipes à domicile' + (ext ? ', et une grosse pensée pour toutes nos équipes en déplacement !' : ' !')
      : '🔥 Une grosse pensée pour toutes nos équipes en déplacement, que nous encourageons de tout cœur !');
    L.push(FIN);
    return L.join('\n');
  }

  /* ---------- Résultats du week-end ---------- */
  function issue(m) { return m.s[0] > m.s[1] ? true : m.s[0] < m.s[1] ? false : null; }
  function bilan(w) {
    var v = 0, d = 0, perdus = [];
    w.ms.forEach(function (m) { var i = issue(m); if (i === true) v++; else if (i === false) { d++; perdus.push(m.lib); } });
    return { v: v, d: d, n: v + d, perdus: perdus };
  }
  function ligneRes(m) { return '🏀 ' + m.lib + ' | BCR ' + m.s[0] + ' - ' + m.s[1] + ' ' + m.adv + (issue(m) === true ? ' ✅' : ''); }
  function texteRes(w) {
    var js = joursDe(w), b = bilan(w), L = [];
    L.push(tete('LES RÉSULTATS DU WEEK-END', TH.coeur, '🏆'));
    L.push('🔥 Retour sur le week-end de compétition de nos équipes du Basket Club de Rouxmesnil !');
    L.push('📅 ' + datesTexte(w) + ' : les ' + pl(w.ms.length, 'résultat', 'résultats') + ' de nos équipes, match par match.');
    js.forEach(function (j) {
      var g = groupes(w, j);
      L.push(SEP); L.push('📅 ' + maj(dateLongue(j)));
      if (g.dom.length) { L.push('🏠 ' + (g.dom.length > 1 ? 'MATCHS' : 'MATCH') + ' À DOMICILE'); g.dom.forEach(function (m) { L.push(ligneRes(m)); }); }
      if (g.ext.length) { L.push('🚌 ' + (g.ext.length > 1 ? 'MATCHS' : 'MATCH') + ' À L\'EXTÉRIEUR'); g.ext.forEach(function (m) { L.push(ligneRes(m)); }); }
    });
    L.push(SEP);
    if (b.n) {
      L.push('🔥 Bilan du week-end : ' + (b.d === 0 ? pl(b.v, 'victoire', 'victoires') + ' sur ' + pl(b.n, 'match', 'matchs') + ' !'
        : b.v === 0 ? pl(b.d, 'défaite', 'défaites') + '.' : pl(b.v, 'victoire', 'victoires') + ' et ' + pl(b.d, 'défaite', 'défaites') + '.'));
      if (b.d) L.push('💪 Courage à nos équipes ' + liste(b.perdus) + ' : on se relève ensemble et on prépare la suite !');
    }
    L.push('👏 Bravo à toutes nos équipes, et merci aux supporters et aux bénévoles !');
    var th = paragrapheTheme();
    if (th.length) { L.push(SEP); L = L.concat(th); }
    L.push('');
    L.push(FIN);
    return L.join('\n');
  }

  /* ---------- Affiches ---------- */
  function ligneAff(m, res) {
    var l = { heure: m.t ? m.t.replace(':', 'H') : '', jourCourt: m.g === 6 ? 'SAM.' : 'DIM.', code: m.lib, adv: m.adv, sig: m.sig, logo: m.logo,
      salle: res ? '' : m.dom && salleTxt(m) === salleTxt({ dom: true, id: '', j: '' }) ? '' : salleTxt(m) };   /* à domicile : la salle seulement si ce n'est pas celle du club */
    if (res) { l.bcr = m.s[0]; l.ad = m.s[1]; l.v = issue(m); l.lieuTxt = m.dom ? 'À domicile' : 'À l\'extérieur'; }
    return l;
  }
  function decoupe(lignes) {
    if (lignes.length <= PAR_AFFICHE) return [lignes];
    var k = Math.ceil(lignes.length / PAR_AFFICHE), t = Math.ceil(lignes.length / k), r = [];
    for (var i = 0; i < k; i++) r.push(lignes.slice(i * t, (i + 1) * t));
    return r;
  }
  function affiches(w, res) {
    var js = joursDe(w), dates = datesTexte(w), sal = salleDe({ dom: true, id: '', j: '' }), out = [], b = res ? bilan(w) : null;
    /* Mêmes comptes que le texte : par jour, après dédoublonnage des derbys et sans les exempts. */
    var dom = 0, ext = 0; js.forEach(function (j) { var g = groupes(w, j); dom += g.dom.length; ext += g.ext.length; });
    out.push({ type: 'affiche', modele: 'couverture', mode: res ? 'res' : 'rdv', theme: TH, dates: dates,
      compte: res ? { v: b.v, n: b.n } : { dom: dom, ext: ext },
      alt: (res ? 'Affiche de couverture : résultats du week-end, ' : 'Affiche de couverture : rendez-vous du week-end, ') + dates + '.', nom: 'couverture' });
    js.forEach(function (j) {
      var g = groupes(w, j), jt = maj1(dateLongue(j));
      if (res) {
        var tous = g.dom.concat(g.ext).sort(parHeure), bj = bilan({ ms: tous });
        decoupe(tous.map(function (m) { return ligneAff(m, true); })).forEach(function (ls, i, a) {
          out.push({ type: 'affiche', modele: 'resultats', theme: TH, titre: dateLongue(j), suite: a.length > 1 ? (i + 1) + '/' + a.length : '', lignes: ls,
            resume: bj.n ? pl(bj.v, 'victoire', 'victoires') + ' sur ' + bj.n : '',
            alt: 'Affiche : résultats du ' + dateLongue(j) + ', ' + pl(tous.length, 'match', 'matchs') + '.', nom: JOURS[jour(j).getDay()] + '-resultats' + (a.length > 1 ? '-' + (i + 1) : '') });
        });
      } else {
        [['dom', g.dom], ['ext', g.ext]].forEach(function (c) {
          if (!c[1].length) return;
          decoupe(c[1].map(function (m) { return ligneAff(m, false); })).forEach(function (ls, i, a) {
            out.push({ type: 'affiche', modele: 'jour', theme: TH, lieu: c[0], titre: dateLongue(j), suite: a.length > 1 ? (i + 1) + '/' + a.length : '',
              salleDom: sal ? sal[0] + ' – ' + sal[1] : '', lignes: ls,
              alt: 'Affiche : ' + jt + ', matchs ' + (c[0] === 'dom' ? 'à domicile' : 'à l\'extérieur') + ', ' + pl(c[1].length, 'match', 'matchs') + '.', nom: JOURS[jour(j).getDay()] + '-' + (c[0] === 'dom' ? 'domicile' : 'exterieur') + (a.length > 1 ? '-' + (i + 1) : '') });
          });
        });
      }
    });
    return out;
  }
  function legende(s, i) {
    if (s.modele === 'couverture') return 'Couverture';
    return maj1(s.titre) + (s.modele === 'jour' ? ', ' + (s.lieu === 'dom' ? 'à domicile' : 'à l\'extérieur') : '') + (s.suite ? ' (' + s.suite + ')' : '');
  }

  /* ---------- Page ---------- */
  var etatsPlace = {};   /* index d'affiche -> svg déjà prêt */
  var BLOCS = {};
  function bloc(cle, titreSection, w, texte, specs, note) {
    var id = cle + '-' + w.sam, resume = datesTitre(w);
    BLOCS[cle] = { w: w, texte: texte, specs: specs, id: id };
    var cover = '<div class="aff-fig" data-aff="' + cle + ':0" style="--r:' + 1350 / 1080 + '"></div>'
      + '<button type="button" class="bouton ligne petit aff-un" data-dl="' + cle + ':0">Télécharger cette affiche</button>';
    var carte = PUB.carte({ id: id, type: titreSection, titre: 'Week-end des ' + resume, visuel: '<div class="pub-cadre aff-cadre">' + cover + '</div>', texte: texte, lignes: 16 });
    var galerie = specs.slice(1).map(function (s, i) {
      return '<li><div class="aff-fig" data-aff="' + cle + ':' + (i + 1) + '"></div><p class="aff-leg">' + esc(legende(s, i + 1)) + '</p>'
        + '<button type="button" class="bouton ligne petit aff-un" data-dl="' + cle + ':' + (i + 1) + '">Télécharger cette affiche</button></li>';
    }).join('');
    return '<div class="rdv-bloc" id="' + cle + '-bloc" role="group" aria-labelledby="' + cle + '-t">'
      + '<h4 class="we-sous-titre" id="' + cle + '-t">' + esc(titreSection) + '</h4>'
      + '<p class="rdv-quand"><strong>Week-end des ' + esc(resume) + ' ' + jour(w.sam).getFullYear() + '</strong> · ' + esc(note) + '</p>'
      + carte
      + '<h5 class="rdv-affiches-t">Les affiches <span class="rdv-nb">(' + pl(specs.length, 'image', 'images') + ', 1080 x 1350 pixels)</span></h5>'
      + '<div class="exp-groupe rdv-dl"><div class="pub-boutons exp-boutons"><button type="button" class="bouton petit" data-dl="' + cle + ':tout">Télécharger les affiches (' + pl(specs.length, 'fichier', 'fichiers') + ')</button></div>'
      + '<div class="exp-etat" role="status" aria-live="polite" data-etat="' + cle + '"></div></div>'
      + (galerie ? '<ul class="aff-liste">' + galerie + '</ul>' : '')
      + '</div>';
  }
  function remplirAffiches() {
    var cles = Object.keys(BLOCS);
    cles.forEach(function (cle) {
      BLOCS[cle].specs.forEach(function (s, i) {
        var el = zone.querySelector('[data-aff="' + cle + ':' + i + '"]'); if (!el) return;
        X.affiches.svg(s, cle + i + '-').then(function (svg) { el.innerHTML = svg; el.classList.add('pret'); },
          function () { el.innerHTML = '<p class="aide">L\'aperçu de l\'affiche n\'a pas pu être dessiné.</p>'; });
      });
    });
  }
  function etatDl(cle, msg) {
    var z = zone.querySelector('[data-etat="' + cle + '"]'); if (!z) return;
    z.textContent = ''; setTimeout(function () { z.textContent = msg; }, 40);
  }
  function telecharger(cle, quoi, bouton) {
    var B = BLOCS[cle]; if (!B || !X) return;
    var liste_ = quoi === 'tout' ? B.specs.map(function (s, i) { return i; }) : [+quoi];
    bouton.disabled = true; bouton.setAttribute('aria-busy', 'true'); etatDl(cle, 'Préparation de ' + (liste_.length > 1 ? 'des affiches' : 'l\'affiche') + '…');
    var base = (cle === 'rdv' ? 'bcr-rendez-vous-' : 'bcr-resultats-') + B.w.sam, suite = Promise.resolve(), fait = 0;
    liste_.forEach(function (i, k) {
      suite = suite.then(function () { return new Promise(function (ok) { setTimeout(ok, k ? 450 : 0); }); })
        .then(function () { return X.telecharger(B.specs[i], base + '-' + (i + 1) + '-' + B.specs[i].nom); }).then(function () { fait++; });
    });
    suite.then(function () {
      etatDl(cle, fait > 1 ? fait + ' affiches téléchargées (1080 x 1350 pixels chacune) : elles sont dans vos téléchargements. Joignez-les à la publication Facebook, dans l\'ordre.'
        : 'Affiche téléchargée (1080 x 1350 pixels) : elle est dans vos téléchargements. Joignez-la à la publication Facebook.');
    }, function () {
      etatDl(cle, 'Une affiche n\'a pas pu être créée. Ouvrez la page depuis son adresse en ligne (et non depuis un fichier de l\'ordinateur), puis recommencez.');
    }).then(function () { bouton.disabled = false; bouton.removeAttribute('aria-busy'); });
  }
  zone.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-dl]') : null; if (!b) return;
    var p = b.getAttribute('data-dl').split(':'); telecharger(p[0], p[1], b);
  });

  /* ---------- Assemblage ---------- */
  var html = '';
  if (prochain) {
    var dom = prochain.ms.filter(function (m) { return m.dom; }).length, ext = prochain.ms.length - dom;
    var note = (dom && ext ? 'Matchs à domicile et à l\'extérieur' : dom ? 'Matchs à domicile' : 'Matchs à l\'extérieur') + ', d\'après le calendrier de la fédération.';
    var avertis = prochain.sam !== debutCourant ? '<p class="aide">Aucun match ce week-end : voici le prochain week-end de matchs.</p>' : '';
    html += avertis + bloc('rdv', 'Les rendez-vous du week-end', prochain, texteRdv(prochain), affiches(prochain, false), note);
  } else {
    html += '<div class="rdv-bloc"><h4 class="we-sous-titre">Les rendez-vous du week-end</h4><p class="vide-filtre">Aucun match au calendrier à partir de cette date.</p></div>';
  }
  if (passe) {
    var bb = bilan(passe), ancien = dernierPasse && dernierPasse.sam !== passe.sam;
    var n2 = (bb.d === 0 ? pl(bb.v, 'victoire', 'victoires') + ' sur ' + pl(bb.n, 'match', 'matchs') : bb.v === 0 ? pl(bb.d, 'défaite', 'défaites') : pl(bb.v, 'victoire', 'victoires') + ' et ' + pl(bb.d, 'défaite', 'défaites')) + (passe.ms.length < passe.total ? ' ; ' + pl(passe.ms.length, 'score reçu', 'scores reçus') + ' sur ' + pl(passe.total, 'match', 'matchs') : '') + '.';
    var avert = ancien ? '<p class="aide">Les scores du week-end des ' + esc(datesTitre(dernierPasse)) + ' ne sont pas encore reçus : voici le dernier week-end avec des résultats.</p>' : '';
    html += avert + bloc('res', 'Les résultats du week-end', passe, texteRes(passe), affiches(passe, true), n2);
  } else {
    html += '<div class="rdv-bloc"><h4 class="we-sous-titre">Les résultats du week-end</h4><p class="vide-filtre">Aucun résultat à publier pour le moment.</p></div>';
  }
  html += '<p class="aide rdv-source">Calendrier et résultats relevés sur le site de la fédération le ' + esc(D.releve || 'jour du relevé') + (testee ? ' ; date essayée : ' + esc(dateLongue(AUJ)) + ' ' + jour(AUJ).getFullYear() : '') + '.</p>';
  zone.innerHTML = html;
  if (X && X.affiches) remplirAffiches();

  window.BCRRdv = { decoupe: decoupe, aujourdhui: AUJ, theme: TH, blocs: BLOCS, tous: TOUS, prochain: prochain, passe: passe };
})();
