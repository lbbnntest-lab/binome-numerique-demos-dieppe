/* Espace dirigeants, bloc « Le score arrive tout seul » (démonstration). Lié uniquement depuis dirigeants.html.
   - Personne ne tape le score : le résultat officiel (celui de la feuille de marque, publié par la fédération) « arrive ».
     Le bouton de démonstration simule cette arrivée.
   - Tout se calcule à partir de la date du jour (paramètre facultatif ?aujourdhui=AAAA-MM-JJ pour essayer une autre date) et de
     js/donnees-ffbb.js (calendrier, résultats et classements relevés sur le site de la fédération) :
       « Ce week-end » : les matchs à domicile du prochain week-end de matchs (jusqu'à 6, dans l'ordre des horaires) ; le match
         n'est pas joué, un petit champ de démonstration règle le score que le fondateur veut montrer ;
       « Déjà joué » : le dernier week-end passé qui a des scores : 2 cartes au score officiel connu, et le visuel
         « Résultats du week-end » avec tous les résultats de ce week-end-là.
   - Dès l'arrivée : score sur le site (page de l'équipe et accueil, qui lisent la clé « bcr-score-auto » pour le seul match
     dfu18-2026-10-31), visuel de fin de match avec les logos de TROIS partenaires à tour de rôle, texte prêt. Il reste un
     seul geste : « Publier sur Facebook » (simulé).
   - Solution de secours : si la fédération ne donne pas son accord, un bénévole tape le score (premier match « Ce week-end »).
   Textes : uniquement des faits tirés des données (équipe, niveau, adversaire, lieu, date, score, bilan, rang, match suivant).
   Rien n'est envoyé ni publié. Clés de l'onglet (sessionStorage) toutes préfixées « bcr- » : « Remettre la démonstration à zéro » les efface. */
(function () {
  'use strict';
  var racine = document.getElementById('score-final');
  var zone = document.getElementById('sf-liste');
  if (!racine || !zone) return;
  var D = window.BCR_FFBB;
  if (!D || !D.equipes) { zone.innerHTML = '<p class="aide">Les données de la fédération ne sont pas chargées sur cette page.</p>'; return; }

  /* Les 31 partenaires du calendrier 2026 (même liste, même ordre que partenaires.html ; Le Binôme Numérique n'en fait pas partie). */
  var PART = [["commune-rouxmesnil","Commune de Rouxmesnil-Bouteilles"],["mekabulle","Mekabulle"],["chaumont","Michael Chaumont"],["demare","SAS Demare Luc"],["proxi","Proxi Super"],["salon-m","Le salon M"],["stadium","Sport Solidaire Stadium"],["abrafer","Abrafer"],["diamant","SAS Diamant Fermetures"],["auchan","Auchan Dieppe"],["ligny-gaspary","Ligny-Gaspary Immobilier"],["dequesne","SAS Dequesne"],["trianon","Le Trianon"],["atelier","L'atelier"],["bigmat","BigMat Roger"],["wlc","WLC Automobiles"],["art-mony","Art Mony Pub"],["ongles","Les Ongles en Gel in A."],["hysope","Hysope Fleurs"],["leader","Leader actual emploi"],["bayeux","EURL Bayeux Maçonnerie"],["boulangerie-prieure","Boulangerie du Prieuré"],["etria","Etria"],["eph","EPH publicité"],["bistrot-barrieres","Bistrot des Barrières"],["franck-provost","Franck Provost"],["brico-depot","Brico Dépôt"],["samp","SAMP Services"],["carbon","Carbon Decor · Carbon Meta"],["regates","Les Régates"],["feron","Boucherie charcuterie Feron"]];
  var NB_PART = 3;          /* logos de partenaires par visuel */
  var MAX_CARTES = 10;      /* cartes « Ce week-end » */
  var ECART_JEUNES = 30;    /* chez les jeunes, un écart de 30 points ou plus : score non affiché */

  /* Les 19 équipes de championnat (libellés repris de equipes.html), dans l'ordre d'affichage des listes.
     nom/niv/code : en-tête du visuel ; base/prec : « nos seniors garçons (régionale 3) » et « Seniors garçons (régionale 3) ». */
  var EQ = [
    { id: 'rm3', nom: 'Seniors masculins', niv: 'Régionale 3', code: 'RM3', base: 'seniors garçons', prec: 'régionale 3', senior: true },
    { id: 'prm', nom: 'Seniors masculins', niv: 'Pré-régionale', code: 'PRM', base: 'seniors garçons', prec: 'pré-régionale', senior: true },
    { id: 'dm3', nom: 'Seniors masculins', niv: 'Départementale 3', code: 'DM3', base: 'seniors garçons', prec: 'départementale 3', senior: true },
    { id: 'dm6', nom: 'Seniors masculins', niv: 'Départementale 6', code: 'DM6', base: 'seniors garçons', prec: 'départementale 6', senior: true },
    { id: 'rf2', nom: 'Seniors féminines', niv: 'Régionale 2', code: 'RF2', base: 'seniors filles', prec: 'régionale 2', fem: true, senior: true },
    { id: 'df2', nom: 'Seniors féminines', niv: 'Départementale 2', code: 'DF2', base: 'seniors filles', prec: 'départementale 2', fem: true, senior: true },
    { id: 'df3', nom: 'Seniors féminines', niv: 'Départementale 3', code: 'DF3', base: 'seniors filles', prec: 'départementale 3', fem: true, senior: true },
    { id: 'u21', nom: 'U21 masculins', niv: 'Régionale', code: 'RMU21', base: 'U21 garçons', prec: 'régionale' },
    { id: 'u18f1', nom: 'U18 féminines', niv: 'Élite régionale', code: 'RFU18', base: 'U18 filles', prec: 'élite', fem: true, jeune: true },
    { id: 'dfu18', nom: 'U18 féminines', niv: 'Départementale, équipe 2', code: 'DFU18', base: 'U18 filles', prec: 'équipe 2', fem: true, jeune: true },
    { id: 'dmu18a', nom: 'U18 masculins · équipe 1', niv: 'Départementale 4', code: 'DMU18G1', base: 'U18 garçons', prec: 'équipe 1', jeune: true },
    { id: 'dmu18b', nom: 'U18 masculins · équipe 2', niv: 'Départementale 4', code: 'DMU18G2', base: 'U18 garçons', prec: 'équipe 2', jeune: true },
    { id: 'dmu18c', nom: 'U18 masculins · équipe 3', niv: 'Départementale 4', code: '', base: 'U18 garçons', prec: 'équipe 3', jeune: true },
    { id: 'u15f', nom: 'U15 féminines', niv: 'Départementale', code: 'DFU15', base: 'U15 filles', prec: '', fem: true, jeune: true },
    { id: 'dmu15a', nom: 'U15 masculins · équipe 1', niv: 'Départementale 4', code: 'DMU15', base: 'U15 garçons', prec: 'équipe 1', jeune: true },
    { id: 'dmu15b', nom: 'U15 masculins · équipe 2', niv: 'Départementale 4', code: 'DMU15G2', base: 'U15 garçons', prec: 'équipe 2', jeune: true },
    { id: 'u13f', nom: 'U13 féminines', niv: 'Départementale', code: 'DFU13', base: 'U13 filles', prec: '', fem: true, jeune: true },
    { id: 'dmu13', nom: 'U13 masculins', niv: 'Départementale 4', code: 'DMU13', base: 'U13 garçons', prec: '', jeune: true },
    { id: 'u11', nom: 'U11 mixte', niv: 'Départementale', code: '', base: 'U11', prec: '', jeune: true }
  ];

  /* ---------- Petits outils ---------- */
  function lire(c, d) { try { var v = sessionStorage.getItem(c); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrire(c, v) { try { sessionStorage.setItem(c, JSON.stringify(v)); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function idSur(t) { return String(t).replace(/[^a-z0-9]+/gi, '-'); }
  function sigle(nom) {
    var m = nom.split(/[\s-]+/);
    if (/^[A-Z]{2,5}$/.test(m[0])) return m[0];
    return m.filter(function (x) { return /^[A-ZÉ]/.test(x); }).map(function (x) { return x.charAt(0); }).join('').slice(0, 4) || nom.slice(0, 3).toUpperCase();
  }
  function issue(b, a) { return b > a ? 'Victoire' : b === a ? 'Match nul' : 'Défaite'; }
  function maj1(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function min1(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }

  /* Dates : toujours en heure locale (jamais new Date('AAAA-MM-JJ') ni toISOString, qui passent par le temps universel). */
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function jour(s) { var a = s.slice(0, 10).split('-'); return new Date(+a[0], +a[1] - 1, +a[2], 12); }
  function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function plusJ(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); }
  function jm(d) { return (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + MOIS[d.getMonth()]; }
  function dateLongue(s) { var d = jour(s); return JOURS[d.getDay()] + ' ' + jm(d); }
  function heureDe(s) { if (s.length < 16) return ''; var h = +s.slice(11, 13), m = s.slice(14, 16); return h + ' h' + (m === '00' ? '' : ' ' + m); }
  /* Clé de tri : un match sans horaire passe après ceux du même jour qui en ont un. */
  function cle(d) { return d.length < 16 ? d + 'T99:99' : d; }
  function parDate(a, b) { return a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : 0; }
  function datesWE(sam) {
    var a = jour(sam), b = plusJ(a, 1);
    return a.getMonth() === b.getMonth() ? (a.getDate() === 1 ? '1er' : a.getDate()) + ' et ' + jm(b) : jm(a) + ' et ' + jm(b);
  }

  /* Date du jour (paramètre ?aujourdhui=AAAA-MM-JJ pour essayer une autre date). */
  var testee = false, AUJ;
  (function () {
    var m = /[?&]aujourdhui=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    if (m && iso(jour(m[1])) === m[1]) { AUJ = m[1]; testee = true; } else AUJ = iso(new Date());
  })();

  /* ---------- Les matchs, lus dans js/donnees-ffbb.js ---------- */
  var TOUS = [], PAR = {};
  EQ.forEach(function (e) {
    var src = D.equipes[e.id]; PAR[e.id] = [];
    if (!src || !src.matchs) return;
    e.nous = 'nos ' + e.base + (e.prec ? ' (' + e.prec + ')' : '');
    e.nousMaj = maj1(e.nous);
    e.liste = maj1(e.base) + (e.prec ? ' (' + e.prec + ')' : '');
    e.cl = src.cl || [];
    src.matchs.forEach(function (x) {
      var m = { tid: e.id, e: e, d: x.d, j: x.d.slice(0, 10), h: heureDe(x.d), cle: cle(x.d), dom: !!x.dom, adv: x.adv, sig: x.sig, s: x.s || null,
        exempt: x.adv === 'Exempt', derby: /^BC Rouxmesnil/.test(x.adv) };
      m.ok = !m.exempt && !m.derby;           /* un match « exempt » ou entre deux équipes du club n'a ni victoire ni défaite */
      PAR[e.id].push(m); TOUS.push(m);
    });
    PAR[e.id].sort(parDate);
  });
  function ecart(m) { return m.s ? m.s[0] - m.s[1] : 0; }
  function weekendDe(j) { var d = jour(j), g = d.getDay(); return g === 6 ? j : g === 0 ? iso(plusJ(d, -1)) : null; }   /* samedi du week-end, ou null si en semaine */

  /* « Ce week-end » : le premier week-end (samedi et dimanche, à partir d'aujourd'hui) qui compte au moins un match à domicile. */
  function chercherCeWeekend() {
    var t = jour(AUJ), g = t.getDay(), debut = g === 6 ? t : g === 0 ? plusJ(t, -1) : plusJ(t, 6 - g);
    for (var k = 0; k < 60; k++) {
      var sam = iso(plusJ(debut, 7 * k)), dim = iso(plusJ(debut, 7 * k + 1));
      var l = TOUS.filter(function (m) { return m.ok && m.dom && m.j >= AUJ && m.j >= sam && m.j <= dim; }).sort(parDate);
      if (l.length) return { sam: sam, dim: dim, total: l.length, liste: l.slice(0, MAX_CARTES), proche: k === 0 };
    }
    return null;
  }
  /* « Déjà joué » : le dernier week-end entièrement passé qui a au moins un score. */
  function chercherDejaJoue() {
    var res = TOUS.filter(function (m) { return m.ok && m.s && weekendDe(m.j); }), best = null;
    res.forEach(function (m) { var sam = weekendDe(m.j); if (iso(plusJ(jour(sam), 1)) < AUJ && (!best || sam > best)) best = sam; });
    if (!best) return null;
    var lignes = res.filter(function (m) { return weekendDe(m.j) === best; });
    lignes.sort(function (a, b) { return EQ.indexOf(a.e) - EQ.indexOf(b.e) || parDate(a, b); });
    /* Carte 1 : la plus belle victoire des seniors (à défaut, dans le dernier week-end passé où des seniors ont gagné) ;
       carte 2 : un résultat des jeunes sans grand écart. */
    var seniors = res.filter(function (m) { return m.e.senior && ecart(m) > 0 && iso(plusJ(jour(weekendDe(m.j)), 1)) < AUJ; }), c1 = null, c2 = null;
    if (seniors.length) {
      var samS = seniors.map(function (m) { return weekendDe(m.j); }).sort().pop();
      c1 = seniors.filter(function (m) { return weekendDe(m.j) === samS; }).sort(function (a, b) { return ecart(b) - ecart(a); })[0];
    }
    var jeunes = lignes.filter(function (m) { return m.e.jeune && ecart(m) > 0 && ecart(m) < ECART_JEUNES; }).sort(function (a, b) { return ecart(a) - ecart(b); });
    c2 = jeunes[0] || null;
    var choisis = [c1, c2].filter(Boolean);
    if (choisis.length < 2) {   /* complète avec un autre résultat du week-end, sans grand écart d'abord */
      lignes.filter(function (m) { return choisis.indexOf(m) < 0; })
        .sort(function (a, b) { return (m_g(b) - m_g(a)); }).slice(0, 2 - choisis.length).forEach(function (m) { choisis.push(m); });
    }
    choisis.sort(parDate);
    return { sam: best, dim: iso(plusJ(jour(best), 1)), lignes: lignes, cartes: choisis };
  }
  function m_g(m) { return (ecart(m) > 0 ? 2 : 0) + (m.e.jeune && Math.abs(ecart(m)) >= ECART_JEUNES ? 0 : 1); }

  /* ---------- Objets « match » prêts pour les cartes ---------- */
  var M = {};   /* id de carte -> description */
  function nomCourt(adv) { return adv.replace(/^(US|AS|BC|CEP|ES|CA|AL|USO) /, ''); }
  function faireMatch(x, lib, lien) {
    var e = x.e, id = e.id + '-' + x.j;
    var m = { id: id, tid: e.id, e: e, x: x, equipe: e.nom, niv: e.niv, code: e.code, adv: x.adv, sig: x.sig || sigle(x.adv), dom: x.dom,
      lieu: x.dom ? 'à domicile' : 'à l\'extérieur', quand: maj1(dateLongue(x.j)) + (x.h ? ', ' + x.h : ''), court: dateLongue(x.j),
      jeune: !!e.jeune, nous: e.nous, nousMaj: e.nousMaj, fem: !!e.fem, page: lien ? 'equipes.html#' + e.id : '',
      reel: x.s, releve: D.releve || '', lib: lib };
    M[id] = m; return m;
  }
  function etiqEquipe(m) { return m.equipe + (m.code ? ' (' + m.code + ')' : ''); }

  var CE = chercherCeWeekend(), DEJA = chercherDejaJoue();
  var CARTES_CE = CE ? CE.liste.map(function (x) { return faireMatch(x, CE.proche ? 'Ce week-end' : 'Prochain week-end', false); }) : [];
  var CARTES_DEJA = DEJA ? DEJA.cartes.map(function (x) { return faireMatch(x, 'Déjà joué', true); }) : [];
  var WE = null;
  if (DEJA) {
    WE = { id: 'we-' + DEJA.sam, dates: datesWE(DEJA.sam), lignes: DEJA.lignes.map(function (x) {
      return { equipe: x.e.liste, adv: x.adv, bcr: x.s[0], ad: x.s[1], jeune: !!x.e.jeune, nul: false };
    }) };
  }

  /* ---------- Mémoire de l'onglet ---------- */
  var recs = lire('bcr-score-auto', {});        /* id du match (ou « we-AAAA-MM-JJ ») -> { bcr, ad, parts, source, masque, texte, publie } */
  var rot = lire('bcr-rotation', { next: 0, app: {} });
  /* Enregistrements d'une version plus ancienne (un seul partenaire par visuel) : on les laisse de côté. */
  Object.keys(recs).forEach(function (k) { if (!recs[k] || !Array.isArray(recs[k].parts)) delete recs[k]; });
  var enCours = {};
  function sauver() { ecrire('bcr-score-auto', recs); ecrire('bcr-rotation', rot); }
  var annonce = document.getElementById('sf-annonce');
  function annoncer(t) { if (annonce) { annonce.textContent = ''; setTimeout(function () { annonce.textContent = t; }, 60); } }

  /* Rotation équitable : trois partenaires de suite dans la liste, puis les trois suivants (31 partenaires, chacun a son tour). */
  function prochainsPartenaires() {
    var a = [], i;
    for (i = 0; i < NB_PART; i++) a.push((rot.next + i) % PART.length);
    rot.next = rot.next + NB_PART; return a;
  }
  function apparitions(i) { return (rot.app && rot.app[i]) || 0; }

  /* ---------- Contexte d'un match : bilan avant le match, rang actuel, adversaire (tout vient des données) ---------- */
  function contexte(m) {
    var x = m.x, e = m.e, liste = PAR[e.id], c = { coh: false, v: 0, d: 0, rang: null, tete: false, sommet: false, choc: false };
    var lignes = e.cl.filter(function (r) { return r[7] === 1; });
    if (lignes.length !== 1) return c;                       /* poule où deux équipes du club figurent : on n'invente pas */
    var ligne = lignes[0], marques = liste.filter(function (y) { return y.s; });
    var avant = liste.filter(function (y) { return y.ok && y.cle < x.cle; });
    c.coh = ligne[3] === marques.length && avant.every(function (y) { return y.s; });   /* le classement et le calendrier se recoupent */
    if (!c.coh) return c;
    avant.forEach(function (y) { if (y.s[0] > y.s[1]) c.v++; else if (y.s[0] < y.s[1]) c.d++; });
    var dernier = x.s && marques.every(function (y) { return y.cle <= x.cle; });
    if (dernier) {
      c.rang = ligne[0];
      c.tete = ligne[0] === 1 && e.cl.length > 1 && e.cl[1][2] < ligne[2];
      var adv = e.cl.filter(function (r) { return r[1] === x.adv && r[7] !== 1; })[0];
      if (adv) {
        c.choc = c.d === 0 && c.v > 0 && x.s[0] > x.s[1] && adv[5] === 1 && adv[4] > 0;
        c.sommet = ligne[0] <= 2 && adv[0] <= 2;
      }
    }
    return c;
  }
  function rangPhrase(c) { return c.rang ? (c.rang === 1 ? 'l\'équipe est en tête de sa poule' : 'l\'équipe est ' + c.rang + 'e de sa poule') : ''; }
  function bilanApres(c, gagne) {
    var v = c.v + (gagne ? 1 : 0), n = c.v + c.d + 1, L = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
    var nl = L[n] || String(n);
    if (n === 1) return 'première victoire de la saison';
    return v === n ? nl + ' matchs, ' + (L[v] || v) + ' victoires' : (v === 1 ? 'première' : ['', '', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'septième', 'huitième', 'neuvième'][v] || v + 'e') + ' victoire en ' + nl + ' matchs';
  }
  function suiteTexte(m) {
    var apres = m.x.cle, n = PAR[m.tid].filter(function (y) { return !y.exempt && y.cle > apres && y.j >= AUJ; })[0];
    return n ? 'Prochain match ' + dateLongue(n.j) + (n.h ? ' à ' + n.h : '') + '.' : '';
  }

  /* « Merci à nos partenaires X, Y et Z. » avec le bon article devant chaque nom. */
  function avecArticle(nom) {
    if (/^Commune de /.test(nom)) return 'la commune de ' + nom.slice(11);
    if (/^Les /.test(nom)) return 'les ' + nom.slice(4);
    if (/^Le /.test(nom)) return 'le ' + nom.slice(3);
    if (/^L'/.test(nom)) return min1(nom);
    return nom;
  }
  function merci(parts) {
    var a = parts.map(function (i) { return avecArticle(PART[i][1]); });
    if (!a.length) return '';
    var l = a.length > 1 ? a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1] : a[0];
    return 'Merci à nos partenaires : ' + l + (/\.$/.test(l) ? '' : '.');
  }

  /* ---------- Textes : uniquement des faits ---------- */
  function ecartJeunes(m, r) { return m.jeune && Math.abs(r.bcr - r.ad) >= ECART_JEUNES; }
  function textePhrases(m, r) {
    var c = contexte(m), e = r.bcr - r.ad, adv = nomCourt(m.adv), s = r.bcr + ' à ' + r.ad, inv = r.bcr + '-' + r.ad;
    var nous = m.nous, nousMaj = m.nousMaj, salle = m.dom ? 'à domicile' : 'à l\'extérieur', rg = rangPhrase(c);
    var serie = c.coh ? bilanApres(c, true) : '';
    function fin(parts) { var p = parts.filter(Boolean).join(', '); return p ? ' : ' + p + '.' : '.'; }
    var t;
    if (e > 0) {
      if (ecartJeunes(m, r)) t = 'Belle victoire pour ' + nous + ' face à ' + adv + ' ' + salle + fin([serie]);
      else if (c.choc) t = 'Le choc des ' + (m.fem ? 'invaincues' : 'invaincus') + ' est pour nous' + (e <= 5 ? ', au bout du suspense' : '') + ' ! ' + nousMaj + ' battent ' + adv + ' ' + s + ' ' + salle + ' et restent sans défaite' + fin([serie, c.tete ? 'et ' + (m.fem ? 'seules' : 'seuls') + ' en tête de la poule' : '']);
      else if (r.bcr >= 100) t = 'Plus de 100 points ' + salle + ' ! ' + nousMaj + ' s\'imposent ' + s + fin([serie, rg]);
      else if (e <= 5) t = 'Victoire au bout du suspense pour ' + nous + ', ' + s + ' face à ' + adv + ' ' + salle + fin([serie, rg]);
      else if (e >= 20 && !m.jeune) t = 'Large victoire pour ' + nous + ' contre ' + adv + ', ' + s + ' ' + salle + fin([serie, rg]);
      else t = nousMaj + ' s\'imposent ' + s + ' face à ' + adv + ' ' + salle + fin([serie, rg]);
    } else if (e < 0) {
      if (ecartJeunes(m, r)) t = 'Match difficile pour ' + nous + ' face à ' + adv + '. On garde la tête haute et on se remet au travail.';
      else if (c.coh && c.d === 0 && c.v > 0) t = 'Première défaite de la saison pour ' + nous + ', face à ' + adv + ' (' + inv + ')' + (c.sommet ? ' dans le match au sommet de la poule' : '') + '.' + (rg ? ' ' + maj1(rg) + '.' : '');
      else if (e >= -5) t = 'Défaite de peu pour ' + nous + ' face à ' + adv + ' (' + inv + '). Rien n\'est perdu pour la suite.';
      else t = 'Défaite pour ' + nous + ' face à ' + adv + ' (' + inv + '). On se remet au travail pour le prochain match.';
    } else t = 'Match nul entre ' + nous + ' et ' + adv + ', ' + r.bcr + ' partout.';
    var su = suiteTexte(m), me = merci(r.parts);
    return t + (su ? '\n' + su : '') + (me ? '\n' + me : '');
  }
  /* Chez les jeunes, un écart de 30 points ou plus : l'issue seulement, sans le score (visuel et texte). */
  function ligneMasquee(l) { return l.jeune && Math.abs(l.bcr - l.ad) >= ECART_JEUNES; }
  function texteWeekend(r) {
    var me = merci(r.parts);
    return 'Le week-end des ' + WE.dates + ' en résultats :\n'
      + WE.lignes.map(function (l) { var e = l.bcr - l.ad, sc = ligneMasquee(l) ? '' : l.bcr + '-' + l.ad + ' '; return '- ' + l.equipe + ' : ' + (e > 0 ? (e >= 20 && !l.jeune ? 'large victoire ' : 'victoire ') + sc + 'contre ' : e === 0 ? 'match nul ' + sc + 'contre ' : 'défaite ' + sc + 'contre ') + l.adv; }).join('\n')
      + '\nBravo à nos équipes, et rendez-vous le week-end prochain.'
      + (me ? '\n' + me : '');
  }

  /* ---------- Visuels (cartes HTML aux couleurs du club ; styles de espaces.css et exemples.css) ---------- */
  function noms(parts) { var a = parts.map(function (i) { return PART[i][1]; }); return a.length > 1 ? a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1] : (a[0] || ''); }
  function emplacement(r) {
    if (!r.parts.length) return '<p class="pv-partenaire">Emplacement partenaire</p>';
    return '<div class="pv-part pv-part3"><span>Avec le soutien de</span><span class="pv-logos">' + r.parts.map(function (i) {
      return '<span class="pv-part-logo"><img src="img/partenaires/' + PART[i][0] + '.jpg" alt=""></span>'; }).join('') + '</span></div>';
  }
  function tete() { return '<span class="pv-biais" aria-hidden="true"></span><div class="pv-tete"><img class="pv-logo" src="img/logo-bcr-160.webp" alt=""><span>Basket Club<br>de Rouxmesnil</span></div>'; }
  function visuelMatch(m, r) {
    var iss = issue(r.bcr, r.ad);
    var etiq = m.equipe + ', ' + iss.toLowerCase() + (r.masque ? '' : ' ' + r.bcr + ' à ' + r.ad) + ' contre ' + m.adv + (r.parts.length ? ', avec le soutien de ' + noms(r.parts) : '');
    return '<div class="pub-cadre" data-visuel><div class="pub-visuel" role="img" aria-label="Visuel : ' + esc(etiq) + '">' + tete()
      + '<p class="pv-equipe">' + esc(m.equipe) + '</p><p class="pv-niv">' + esc(m.niv + (m.code ? ' (' + m.code + ')' : '')) + '</p>'
      + '<p class="pv-issue' + (r.bcr > r.ad ? ' v' : '') + '">' + iss + '</p>'
      + '<div class="pv-score"><div><img class="pv-logo" src="img/logo-bcr-160.webp" alt=""><span>BCR</span>' + (r.masque ? '' : '<b>' + r.bcr + '</b>') + '</div>'
      + '<div><span class="pv-sigle" aria-hidden="true">' + esc(m.sig) + '</span><span>' + esc(m.adv) + '</span>' + (r.masque ? '' : '<b>' + r.ad + '</b>') + '</div></div>'
      + '<p class="pv-quand">' + esc(m.quand) + ' · ' + esc(m.lieu) + (r.masque ? '<br>Le score est sur le site du club' : '') + '</p>'
      + emplacement(r) + '</div></div>';
  }
  function visuelWeekend(r) {
    return '<div class="pub-cadre" data-visuel><div class="pub-visuel general" role="img" aria-label="Visuel : résultats du week-end des ' + WE.dates + ', ' + WE.lignes.length + ' résultat' + (WE.lignes.length > 1 ? 's' : '') + (r.parts.length ? ', avec le soutien de ' + esc(noms(r.parts)) : '') + '">' + tete()
      + '<p class="pv-equipe">Résultats du week-end</p><p class="pv-issue">' + WE.dates + '</p>'
      + '<ul class="pv-liste">' + WE.lignes.map(function (l) {
        return '<li><span><b>' + esc(l.equipe) + '</b><small>contre ' + esc(l.adv) + '</small></span><strong class="' + (l.bcr > l.ad ? 'v' : 'd') + '">' + (ligneMasquee(l) ? issue(l.bcr, l.ad) : l.bcr + '-' + l.ad) + '</strong></li>';
      }).join('') + '</ul>' + emplacement(r) + '</div></div>';
  }

  /* ---------- Cartes : attente, puis résultat ---------- */
  function entete(titreId, type, titre, pastille) {
    return '<header class="sf-tete"><div><p class="pub-type">' + esc(type) + '</p><h4 id="' + titreId + '">' + esc(titre) + '</h4></div>' + pastille + '</header>';
  }
  function titreCarte(m) { return m.adv + ', ' + m.quand.toLowerCase() + ', ' + m.lieu; }
  function attenteMatch(m) {
    var f = idSur(m.id), pas = m.reel === null;
    return entete('sf-' + f + '-t', m.lib + ' · ' + etiqEquipe(m), titreCarte(m), '<span class="etat pastille attente">En attente du résultat officiel</span>')
      + '<div class="sf-attente">'
      + (pas
        ? '<details class="sf-reglage" open><summary>Régler le score de démonstration</summary>'
          + '<p class="aide" id="sf-' + f + '-aide">Démonstration : ce match n\'est pas encore joué. Tapez le score réel, à montrer au bureau, avant de cliquer. En vrai, personne ne le tape : il arrive de la fédération.</p>'
          + '<div class="score-champs"><div><label for="sf-b-' + f + '">BCR</label><input id="sf-b-' + f + '" type="text" inputmode="numeric" autocomplete="off" maxlength="3" data-sc="b" aria-describedby="sf-' + f + '-aide sf-e-' + f + '"></div>'
          + '<span class="score-tiret" aria-hidden="true">-</span>'
          + '<div><label for="sf-a-' + f + '">' + esc(m.adv) + '</label><input id="sf-a-' + f + '" type="text" inputmode="numeric" autocomplete="off" maxlength="3" data-sc="a" aria-describedby="sf-' + f + '-aide sf-e-' + f + '"></div></div></details>'
        : '<p class="aide">Ce match est déjà joué : le résultat officiel de la fédération (relevé du ' + esc(m.releve) + ') est connu, rien à régler. <span class="etiquette-ex">résultat réel</span></p>')
      + '<p class="erreur" id="sf-e-' + f + '" role="alert"></p>'
      + '<div class="actions"><button type="button" class="bouton" data-arrivee="' + esc(m.id) + '">Montrer l\'arrivée du score officiel</button> <span class="etiquette-ex">démonstration</span></div></div>';
  }
  function attenteWeekend() {
    var n = WE.lignes.length;
    return entete('sf-' + idSur(WE.id) + '-t', 'Chaque dimanche soir', 'Résultats du week-end des ' + WE.dates, '<span class="etat pastille attente">Dimanche soir, en attente</span>')
      + '<div class="sf-attente"><p class="aide">' + (n > 1 ? 'Les ' + n + ' résultats publiés' : 'Le résultat publié') + ' par la FFBB pour ce week-end-là (relevé du ' + esc(D.releve || '') + ') ; chaque dimanche, toutes les équipes dont le résultat est connu y seraient. <span class="etiquette-ex">démonstration</span></p>'
      + '<div class="actions"><button type="button" class="bouton" data-arrivee="' + esc(WE.id) + '">Montrer le dimanche soir</button></div></div>';
  }

  function apercuSite(m, r) {
    var date = m.court.replace(/^[a-zé]+ /, '');
    return '<div class="sf-site"><p class="sf-site-t">Sur le site, tout de suite <span class="etiquette-ex">aperçu</span></p>'
      + '<dl><div><dt>Page de l\'équipe</dt><dd>' + esc(etiqEquipe(m)) + ' · dernier résultat, ' + esc(m.court) + ' : <strong>BCR ' + r.bcr + ' - ' + r.ad + '</strong> contre ' + esc(m.adv) + (m.page ? ' · <a href="' + m.page + '">Voir la page de l\'équipe</a>' : '') + '</dd></div>'
      + '<div><dt>Accueil, résultats récents</dt><dd>' + esc(etiqEquipe(m)) + ' · ' + esc(date) + ' : <strong>' + r.bcr + ' - ' + r.ad + '</strong></dd></div></dl></div>';
  }
  function apercuWeekend() {
    return '<div class="sf-site"><p class="sf-site-t">Sur le site <span class="etiquette-ex">aperçu</span></p><dl><div><dt>Page de chaque équipe</dt><dd>Chaque résultat est déjà sur la page de son équipe ; le visuel les réunit pour les réseaux.</dd></div></dl></div>';
  }
  function etapes(libs, publie) {
    return '<ol class="sf-etapes">' + libs.map(function (l) { return '<li><span class="etat pastille ok">Fait</span> ' + esc(l) + '</li>'; }).join('')
      + '<li>' + (publie ? '<span class="etat pastille ok">Fait</span> Publié sur Facebook (simulation)' : '<span class="etat pastille attente">Votre geste</span> Un dirigeant relit et publie') + '</li></ol>';
  }
  function partenaireInfo(r) {
    if (!r.parts.length) return '<p class="aide">Aucun partenaire à afficher : l\'emplacement reste vide.</p>';
    var cptes = r.parts.map(function (i) { return '<strong>' + esc(PART[i][1]) + '</strong> ' + apparitions(i); }).join(', ');
    return '<p class="aide sf-part">Logos à l\'écran, à leur tour dans la rotation (partenaires du club, calendrier 2026) : <strong>' + esc(noms(r.parts)) + '</strong>. '
      + 'Apparitions comptées sur les visuels publiés de cette démonstration : ' + cptes + (r.publie ? '' : ' ; une de plus pour chacun une fois ce visuel publié') + '.</p>';
  }
  function resultat(id) {
    var r = recs[id], f = idSur(id);
    if (WE && id === WE.id) {
      return entete('sf-' + f + '-t', 'Chaque dimanche soir', 'Résultats du week-end des ' + WE.dates, '<span class="etat pastille ok">Préparé tout seul</span>')
        + '<div class="sf-resultat">' + etapes(['Résultats du week-end rassemblés', 'Visuel et texte préparés'], r.publie)
        + '<div class="pub">' + visuelWeekend(r) + '<div class="pub-corps">' + apercuWeekend()
        + corpsPublication(id, f, r, '', 'Exemple avec les ' + WE.lignes.length + ' résultats réels publiés par la FFBB pour ce week-end (relevé du ' + (D.releve || '') + '). Chez les jeunes, un écart de 30 points ou plus n\'est pas affiché.') + '</div></div></div>';
    }
    var m = M[id];
    var secours = r.source === 'saisi';
    return entete('sf-' + f + '-t', m.lib + ' · ' + etiqEquipe(m), titreCarte(m), '<span class="etat pastille ok">' + (secours ? 'Score tapé par un bénévole' : 'Préparé tout seul') + '</span>')
      + '<div class="sf-resultat">' + etapes([secours ? 'Score tapé par un bénévole (solution de secours)' : 'Résultat officiel reçu : BCR ' + r.bcr + ' - ' + r.ad, 'Score sur le site (page de l\'équipe et accueil)', 'Visuel et texte préparés'], r.publie)
      + (r.bcr === r.ad ? '<p class="avertissement" role="status">Les deux scores sont égaux : au basket, c\'est rare. Vérifiez avec la feuille de marque avant de publier.</p>' : '')
      + '<div class="pub">' + visuelMatch(m, r) + '<div class="pub-corps">' + apercuSite(m, r)
      + corpsPublication(id, f, r, ecartJeunes(m, r) ? '<label class="choix"><input type="checkbox" data-montrer-score' + (r.masque ? '' : ' checked') + (r.publie ? ' disabled' : '') + '> Montrer le score sur le visuel</label><p class="aide">Écart important chez les jeunes : par prudence, le score n\'est pas mis en avant sur le visuel ni dans le texte ; vous pouvez le montrer.</p>' : '', '') + '</div></div></div>';
  }
  function corpsPublication(id, f, r, extra, note) {
    return '<label for="sf-txt-' + f + '">Texte prêt (modifiable)</label>'
      + '<textarea id="sf-txt-' + f + '" rows="' + (WE && id === WE.id ? Math.min(14, WE.lignes.length + 5) : 5) + '" data-texte' + (r.publie ? ' readonly' : '') + '>' + esc(r.texte) + '</textarea>'
      + extra + partenaireInfo(r) + (note ? '<p class="aide">' + esc(note) + '</p>' : '')
      + '<div class="pub-boutons"><button type="button" class="bouton" data-publier="' + esc(id) + '"' + (r.publie ? ' disabled' : '') + '>' + (r.publie ? 'Publié (simulation)' : 'Publier sur Facebook') + '</button>'
      + '<button type="button" class="bouton ligne petit" data-rejouer="' + esc(id) + '">Rejouer la démonstration</button></div>'
      + '<p class="aide">Un dirigeant relit et publie : rien ne part sans ce geste, et c\'est ce que nous conseillons pour les réseaux. Le bureau peut aussi choisir de publier sans validation les seuls visuels de score, qui ne portent aucun nom ni aucune photo.</p>'
      + '<p class="pub-etat" role="status" aria-live="polite">' + (r.publie ? 'Simulation : publication faite. Rien n\'a été envoyé. Sur le vrai site, deux façons au choix du club : publier directement sur la page Facebook du club, ou télécharger le visuel et copier le texte pour le publier soi-même.' : '') + '</p>';
  }

  function carte(id) {
    var attend = !recs[id];
    if (WE && id === WE.id) return attend ? attenteWeekend() : resultat(id);
    return attend ? attenteMatch(M[id]) : resultat(id);
  }
  function emplacementCarte(id) { return document.getElementById('sf-carte-' + idSur(id)); }
  /* À l'arrivée du résultat : le focus va au titre de la carte (lecteur d'écran), et l'écran montre le visuel en entier,
     sous l'en-tête fixe, sans que l'assistance ait à faire défiler. */
  function dessiner(id, focus) {
    var el = emplacementCarte(id); if (!el) return;
    el.innerHTML = carte(id);
    if (focus) {
      var t = el.querySelector('h4'); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
      var v = el.querySelector('.pub') || t;
      if (v) {
        var doux = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
        window.scrollTo({ top: Math.max(0, v.getBoundingClientRect().top + window.pageYOffset - 104), behavior: doux ? 'smooth' : 'auto' });
      }
    }
  }

  /* ---------- Contrôle des deux nombres ---------- */
  function nombre(v) { v = String(v).trim(); return /^\d{1,3}$/.test(v) && +v <= 200 ? +v : null; }

  /* ---------- Arrivée du résultat ---------- */
  function arriver(id, bcr, ad, source) {
    if (enCours[id]) return;
    enCours[id] = true;
    var el = emplacementCarte(id), btn = el.querySelector('[data-arrivee]');
    if (btn) { btn.disabled = true; btn.textContent = 'Réception du résultat officiel…'; }
    annoncer('Réception du résultat officiel en cours.');
    setTimeout(function () {
      var r, avant = rot.next;
      if (WE && id === WE.id) { r = { parts: prochainsPartenaires(), rotDe: avant, publie: false }; r.texte = texteWeekend(r); }
      else {
        var m = M[id];
        r = { bcr: bcr, ad: ad, source: source || 'officiel', parts: prochainsPartenaires(), rotDe: avant, publie: false };
        r.masque = ecartJeunes(m, r); r.texte = textePhrases(m, r);
      }
      recs[id] = r; sauver(); enCours[id] = false;
      dessiner(id, true);
      annoncer(WE && id === WE.id ? 'Le visuel des résultats du week-end est prêt, avec son texte. Il ne reste qu\'à le publier.'
        : (source === 'saisi' ? 'Score enregistré' : 'Résultat officiel reçu') + ' : BCR ' + bcr + ' - ' + ad + '. Le site est à jour, le visuel et le texte sont prêts. Il ne reste qu\'à publier.');
    }, 700);
  }

  racine.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-arrivee')) {
      var id = b.getAttribute('data-arrivee'), art = emplacementCarte(id);
      if (WE && id === WE.id) { arriver(id); return; }
      var m = M[id], bcr, ad;
      if (m.reel) { bcr = m.reel[0]; ad = m.reel[1]; }
      else {
        var cb = art.querySelector('[data-sc="b"]'), ca = art.querySelector('[data-sc="a"]'), err = art.querySelector('.erreur');
        [cb, ca].forEach(function (c) { c.removeAttribute('aria-invalid'); });
        bcr = nombre(cb.value); ad = nombre(ca.value);
        var faux = [bcr === null ? cb : null, ad === null ? ca : null].filter(Boolean);
        if (faux.length) {
          faux.forEach(function (c) { c.setAttribute('aria-invalid', 'true'); });
          err.textContent = faux.length === 2 && !cb.value.trim() && !ca.value.trim()
            ? 'Réglez d\'abord le score de démonstration : tapez les deux nombres, puis cliquez.'
            : 'Le score doit être fait de deux nombres entiers, de 0 à 200.';
          faux[0].focus(); return;
        }
        err.textContent = '';
      }
      arriver(id, bcr, ad);
    }
    if (b.hasAttribute('data-publier')) {
      var pid = b.getAttribute('data-publier'), r = recs[pid]; if (!r || r.publie) return;
      r.publie = true;
      r.parts.forEach(function (i) { rot.app[i] = apparitions(i) + 1; });
      sauver(); dessiner(pid, false);
      var st = emplacementCarte(pid).querySelector('.pub-etat'); if (st) { st.setAttribute('tabindex', '-1'); st.focus(); }
      annoncer('Simulation : publication faite. Rien n\'a été envoyé.');
    }
    if (b.hasAttribute('data-rejouer')) {
      var rid = b.getAttribute('data-rejouer'), ancien = recs[rid];
      if (ancien && ancien.publie) ancien.parts.forEach(function (i) { if (rot.app[i]) rot.app[i] -= 1; });
      /* Rejouer redonne les mêmes partenaires au prochain passage (si c'étaient les derniers attribués) : la répétition ne décale pas la rotation. */
      if (ancien && typeof ancien.rotDe === 'number' && rot.next === ancien.rotDe + NB_PART) rot.next = ancien.rotDe;
      delete recs[rid]; sauver(); dessiner(rid, false);
      var bt = emplacementCarte(rid).querySelector('[data-arrivee]'); if (bt) bt.focus();
      annoncer('Démonstration remise en attente.');
    }
  });
  racine.addEventListener('change', function (e) {
    var c = e.target.closest('[data-montrer-score]'); if (!c) return;
    var art = c.closest('[data-carte]'), id = art.getAttribute('data-carte'), r = recs[id], m = M[id];
    r.masque = !c.checked; sauver();
    var cadre = art.querySelector('[data-visuel]'); cadre.outerHTML = visuelMatch(m, r);
    annoncer(r.masque ? 'Le score n\'apparaît plus sur le visuel.' : 'Le score apparaît sur le visuel.');
  });
  racine.addEventListener('input', function (e) {
    var t = e.target.closest('[data-texte]'); if (!t) return;
    var id = t.closest('[data-carte]').getAttribute('data-carte'); if (recs[id]) { recs[id].texte = t.value; sauver(); }
  });

  /* ---------- Solution de secours : un bénévole tape le score (premier match « Ce week-end », même circuit ensuite) ---------- */
  var sec = document.getElementById('sf-secours-form');
  var secBloc = document.getElementById('sf-secours');
  if (secBloc) {
    if (!CARTES_CE.length) secBloc.hidden = true;
    else {
      var m0 = CARTES_CE[0], leg = document.getElementById('sf-sec-leg'), aide = document.getElementById('sf-sec-aide');
      if (leg) leg.textContent = ' ' + etiqEquipe(m0) + ' contre ' + m0.adv;
      if (aide) aide.textContent = etiqEquipe(m0) + ' contre ' + m0.adv + ', ' + m0.quand.toLowerCase() + '.';
    }
  }
  if (sec) sec.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!CARTES_CE.length) return;
    var cb = sec.querySelector('[data-sc="b"]'), ca = sec.querySelector('[data-sc="a"]'), err = sec.querySelector('.erreur');
    [cb, ca].forEach(function (c) { c.removeAttribute('aria-invalid'); });
    var b = nombre(cb.value), a = nombre(ca.value), faux = [b === null ? cb : null, a === null ? ca : null].filter(Boolean);
    if (faux.length) { faux.forEach(function (c) { c.setAttribute('aria-invalid', 'true'); }); err.textContent = 'Saisissez deux nombres entiers, de 0 à 200.'; faux[0].focus(); return; }
    err.textContent = '';
    cb.value = ''; ca.value = '';
    arriver(CARTES_CE[0].id, b, a, 'saisi');
    emplacementCarte(CARTES_CE[0].id).scrollIntoView({ block: 'start' });
  });

  /* ---------- Mise en place (relit l'onglet : un rechargement garde les scores arrivés) ---------- */
  function groupe(titre, intro, ids) {
    return '<div class="sf-groupe"><h3 class="sf-groupe-t">' + esc(titre) + '</h3>' + (intro ? '<p class="aide sf-groupe-p">' + intro + '</p>' : '')
      + (ids.length ? '<div class="sf-cartes">' + ids.map(function (id) { return '<article class="sf-match" id="sf-carte-' + idSur(id) + '" data-carte="' + esc(id) + '"></article>'; }).join('') + '</div>' : '') + '</div>';
  }
  var sd = document.getElementById('sf-date');
  if (sd) {
    var dj = jour(AUJ);
    sd.textContent = (testee ? 'Date d\'essai : ' : 'Aujourd\'hui : ') + JOURS[dj.getDay()] + ' ' + jm(dj) + ' ' + dj.getFullYear() + '. Les matchs ci-dessous se calculent à partir de cette date ; le calendrier et les résultats viennent de la fédération (relevé du ' + (D.releve || '') + ').';
  }
  var html = '', ordre = [];
  if (CE) {
    var ids1 = CARTES_CE.map(function (m) { return m.id; });
    html += groupe(CE.proche ? 'Ce week-end : ' + JOURS[6] + ' ' + datesWE(CE.sam).replace(' et ', ' et ' + JOURS[0] + ' ') : 'Prochain week-end à domicile : ' + JOURS[6] + ' ' + datesWE(CE.sam).replace(' et ', ' et ' + JOURS[0] + ' '),
      (CE.total > CARTES_CE.length ? CE.total + ' matchs à domicile au calendrier ; la démonstration en montre les ' + CARTES_CE.length + ' premiers par l\'horaire. ' : (CE.total > 1 ? CE.total + ' matchs à domicile au calendrier. ' : '1 match à domicile au calendrier. '))
      + 'Ces matchs ne sont pas encore joués : avant de cliquer, réglez le score à montrer (démonstration).', ids1);
    ordre = ordre.concat(ids1);
  } else html += groupe('Ce week-end', 'Aucun match à domicile du club n\'est inscrit au calendrier relevé pour les prochains week-ends.', []);
  if (DEJA) {
    var ids2 = CARTES_DEJA.map(function (m) { return m.id; }).concat([WE.id]);
    html += groupe('Déjà joué : week-end des ' + WE.dates, 'Résultats officiels de la fédération : rien à régler, le bouton montre simplement l\'arrivée du score.', ids2);
    ordre = ordre.concat(ids2);
  } else html += groupe('Déjà joué', 'Aucun résultat de week-end n\'est encore connu dans les données relevées.', []);
  zone.innerHTML = html;
  ordre.forEach(function (id) { dessiner(id, false); });

  if (/[?&]demo=score/.test(location.search)) {
    setTimeout(function () { racine.scrollIntoView({ block: 'start' }); }, 120);
  }
})();
