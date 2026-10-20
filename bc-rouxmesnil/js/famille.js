/* Espace familles : un compte pour plusieurs enfants (vue « Toute la famille » par défaut, filtre sur un enfant),
   annonces des coachs, score en direct, covoiturage, créneaux de bénévoles, contacts d'urgence (option à valider avec le club).
   Lié uniquement depuis licencies.html, après js/selection.js.
   Tout reste dans l'onglet le temps de la visite (sessionStorage, clés « bcr- ») : rien n'est envoyé.
   Clés partagées (formats communs aux pages de la maquette) :
     bcr-annonces  [{id, equipe, texte, date:'AAAA-MM-JJ', auteur, ex}]                 lue ici (écrite par le coach)
     bcr-covoit    [{id, matchId, matchLib, date, equipe, conducteur, places, depart, reservations:[nom]}]  lue et écrite ici
     bcr-benevoles [{creneauId, nom}]                                                   écrite ici (lue par l'espace dirigeants)
   Clés propres à cette page : bcr-enfant ('tous' ou l'enfant affiché), bcr-urgence ({lea:{tel1, tel2}, elsa:…, tom:…}),
   bcr-indispos-elsa et bcr-indispos-tom (celles de Léa restent dans bcr-indispos).
   Tom (U13 masculins, DMU13) n'a pas d'espace coach dans la maquette : son équipe a le code « u13m », et tout ce qui
   le concerne est un exemple ou reste « à compléter ». */
(function () {
  'use strict';
  var S = window.BCRSel;
  function lire(cle, defaut) { try { var v = sessionStorage.getItem(cle); return v ? JSON.parse(v) : defaut; } catch (e) { return defaut; } }
  function ecrire(cle, v) { try { sessionStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dateFr(iso) { return S ? S.dateFr(iso) : iso; }
  function auj() { return S ? S.aujourdhui() : new Date().toISOString().slice(0, 10); }
  function $(id) { return document.getElementById(id); }

  /* ---------- Les enfants de la famille B. (exemple) ---------- */
  var ENFANTS = [
    { id: 'lea', prenom: 'Léa', nom: 'Léa B.', initiale: 'L', accord: 'e', equipe: 'u15', lib: 'U15 féminines, départementale (DFU15)', court: 'U15 F', ex: false, coach: true,
      dernier: '<strong>Samedi 17 octobre, 16 h</strong> · U15 féminines contre BC Offranville, à domicile' },
    { id: 'elsa', prenom: 'Elsa', nom: 'Elsa B.', initiale: 'E', accord: 'e', equipe: 'u13', lib: 'U13 féminines, départementale (DFU13)', court: 'U13 F', ex: true, coach: true,
      dernier: '<strong>Samedi 17 octobre, 14 h</strong> · U13 féminines contre CEP Saint-Nicolas-d\'Aliermont, à domicile' },
    { id: 'tom', prenom: 'Tom', nom: 'Tom B.', initiale: 'T', accord: '', equipe: 'u13m', lib: 'U13 masculins, départementale 4, poule A (DMU13)', court: 'U13 M', ex: true, coach: false,
      dernier: 'Aucun résultat relevé pour cette équipe : à compléter' }
  ];
  function parId(id) { for (var i = 0; i < ENFANTS.length; i++) if (ENFANTS[i].id === id) return ENFANTS[i]; return null; }
  var mode = lire('bcr-enfant', 'tous');
  if (mode !== 'tous' && !parId(mode)) mode = 'tous';
  var abonnes = [];
  function tous() { return mode === 'tous'; }
  function visibles() { return tous() ? ENFANTS.slice() : [parId(mode)]; }
  /* « de Léa », « d'Elsa » */
  function de(p) { return (/^[aeiouyàâéèêëîïôûh]/i.test(p) ? 'd\'' : 'de ') + p; }
  /* Étiquette d'un enfant (initiale de couleur, prénom et équipe), seulement quand toute la famille est affichée. */
  function etiquette(e) {
    /* La mention « exemple » des enfants d'exemple figure sur le sélecteur et la liste des équipes, pas sur chaque ligne. */
    return '<span class="fam-tag"><span class="fam-pastille fam-p-' + e.id + '" aria-hidden="true">' + e.initiale + '</span>' + esc(e.prenom) + ' · ' + esc(e.court) + '</span>';
  }
  function tag(e) { return tous() && e ? etiquette(e) : ''; }
  function liste(noms) { return noms.length > 1 ? noms.slice(0, -1).join(', ') + ' et ' + noms[noms.length - 1] : noms[0]; }

  /* Annonce d'exemple de chaque équipe (jamais écrite dans bcr-annonces). */
  var ANNONCES_EX = {
    u15: { id: 'ann-ex-u15', equipe: 'u15', texte: 'Pour chaque match, prévoyez une gourde et soyez là à l\'heure du rendez-vous indiquée dans la convocation. Merci à tous !', date: '2026-10-14', auteur: 'Coach U15', ex: true },
    u13: { id: 'ann-ex-u13', equipe: 'u13', texte: 'Pensez à indiquer dans votre espace les jours d\'absence des vacances : cela m\'aide à préparer les prochains matchs.', date: '2026-10-15', auteur: 'Coach U13', ex: true },
    u13m: { id: 'ann-ex-u13m', equipe: 'u13m', texte: 'Merci de répondre aux convocations avant le jeudi soir : cela me laisse le temps de compléter l\'équipe si besoin.', date: '2026-10-13', auteur: 'Coach U13 M', ex: true }
  };
  /* Offre de covoiturage d'exemple de chaque équipe : elle n'est écrite dans bcr-covoit qu'à la première réservation. */
  var COVOIT_EX = {
    u15: { conducteur: 'Parent de Camille T.', places: 3, depart: 'Parking de la salle Alexandre-Cheruel', reservations: ['Lina P.'] },
    u13: { conducteur: 'Parent de Zoé D.', places: 3, depart: 'Parking de la salle Alexandre-Cheruel', reservations: [] }
  };
  /* Créneaux de table de marque d'exemple, sur les vrais matchs à domicile à venir (élite régionale U18 F, horaires non fixés).
     Les identifiants sont ceux que l'espace dirigeants lit dans bcr-benevoles (data-creneau). */
  var CRENEAUX = [
    { id: 'tm-2026-11-07-marqueur', date: '2026-11-07', match: 'U18 féminines (RFU18) contre Cherbourg Basket Ball', poste: 'Marqueur', pris: 'Sophie D.' },
    { id: 'tm-2026-11-07-chrono', date: '2026-11-07', match: 'U18 féminines (RFU18) contre Cherbourg Basket Ball', poste: 'Chronométreur', pris: null },
    { id: 'tm-2026-11-21-marqueur', date: '2026-11-21', match: 'U18 féminines (RFU18) contre USO Mondeville Basket 2', poste: 'Marqueur', pris: null },
    { id: 'tm-2026-11-21-chrono', date: '2026-11-21', match: 'U18 féminines (RFU18) contre USO Mondeville Basket 2', poste: 'Chronométreur', pris: 'Thomas R.' }
  ];
  var NOM_FAMILLE = 'Famille B.';

  /* ---------- Choix de l'affichage et textes qui en dépendent ---------- */
  function appliquer() {
    var vs = visibles(), e = vs[0], t = tous();
    var txt = {
      'titre-de': t ? 'de ' + liste(ENFANTS.map(function (x) { return x.prenom; })) : de(e.prenom),
      'prenom': t ? 'l\'un de vos enfants' : e.prenom,
      'de-prenom': t ? 'de vos enfants' : de(e.prenom),
      'annonces-qui': t ? 'des coachs de vos enfants' : 'du coach ' + e.court
    };
    document.querySelectorAll('[data-fam]').forEach(function (n) { var k = n.getAttribute('data-fam'); if (k in txt) n.textContent = txt[k]; });
    document.querySelectorAll('[data-enfant]').forEach(function (n) { n.hidden = !t && n.getAttribute('data-enfant') !== e.id; });
    document.querySelectorAll('[data-fam-tag]').forEach(function (n) { var x = parId(n.getAttribute('data-fam-tag')); n.innerHTML = t && x ? etiquette(x) : ''; n.hidden = !t; });
    document.querySelectorAll('[data-seul-tous]').forEach(function (n) { n.hidden = !t; });
    var dt = $('fam-dossier-titre'); if (dt) dt.textContent = t ? 'Dossiers' : 'Son dossier';
    var l = $('fam-equipe-lib');
    if (l) l.innerHTML = vs.map(function (x) {
      return '<li>' + (t ? '<span class="fam-pastille fam-p-' + x.id + '" aria-hidden="true">' + x.initiale + '</span>' : '') + esc(x.prenom) + ' · ' + esc(x.lib) + ' · saison 2026-2027' + (x.ex ? ' <span class="etiquette-ex">exemple</span>' : '') + '</li>';
    }).join('');
    var d = $('fam-dernier'); if (d) d.innerHTML = vs.map(function (x) { return '<li>' + tag(x) + x.dernier + '</li>'; }).join('');
    document.querySelectorAll('.fam-enfants [data-choisir]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-choisir') === mode)); });
    /* Listes « Pour quel enfant » : en vue famille, le parent choisit ; sinon l'enfant affiché. */
    document.querySelectorAll('select[data-pour-enfant]').forEach(function (s) {
      var avant = s.value;
      s.innerHTML = ENFANTS.map(function (x) { return '<option value="' + x.id + '">' + esc(x.prenom) + ' · ' + esc(x.court) + '</option>'; }).join('');
      s.value = t ? (parId(avant) ? avant : 'lea') : e.id;
    });
    var up = $('ur-pour'); if (up) up.value = t ? (up.value || 'tous') : e.id;
    var dm = $('dm-enfant'); if (dm) dm.value = t ? 'tous' : e.id;
    /* Partage de photos : le match de chaque enfant affiché est indiqué. */
    var sel = $('md-match');
    if (sel) {
      Array.prototype.forEach.call(sel.options, function (o) {
        var base = o.getAttribute('data-base') || o.text.replace(/ \(match d[e'] ?[^)]*\)$/, '');
        o.setAttribute('data-base', base);
        var qui = vs.filter(function (x) { return x.equipe === o.value; }).map(function (x) { return x.prenom; });
        o.text = base + (qui.length ? ' (match ' + de(liste(qui)) + ')' : '');
      });
      var cible = t ? 'u15' : e.equipe;
      if (sel.querySelector('option[value="' + cible + '"]')) sel.value = cible;
    }
  }
  function choisir(id, sansAnnonce) {
    if (id !== 'tous' && !parId(id)) return;
    mode = id; ecrire('bcr-enfant', id);
    appliquer();
    rendreTout();
    abonnes.forEach(function (f) { try { f(); } catch (x) { if (window.console) console.error(x); } });
    var et = $('fam-enfant-etat');
    if (et && !sansAnnonce) et.textContent = tous() ? 'Espace affiché pour toute la famille.' : 'Espace affiché pour ' + parId(id).prenom + ', ' + parId(id).lib + '.';
  }
  /* Enfant choisi dans une liste « Pour quel enfant », ou l'enfant affiché. */
  function enfantChoisi(select) { return !tous() ? parId(mode) : (select && parId(select.value)) || ENFANTS[0]; }

  /* ---------- Annonces des coachs ---------- */
  function annoncesDe(equipe) {
    var l = lire('bcr-annonces', []).filter(function (a) { return a && a.equipe === equipe; });
    if (ANNONCES_EX[equipe]) l.push(ANNONCES_EX[equipe]);
    return l;
  }
  function rendreAnnonces() {
    var ul = $('fam-annonces'); if (!ul) return;
    var l = [];
    visibles().forEach(function (e) { annoncesDe(e.equipe).forEach(function (a) { l.push({ a: a, e: e }); }); });
    l.sort(function (x, y) { return x.a.date < y.a.date ? 1 : x.a.date > y.a.date ? -1 : 0; });
    ul.innerHTML = l.map(function (o) {
      var a = o.a;
      return '<li>' + (tous() ? '<p class="fam-tag-ligne">' + etiquette(o.e) + '</p>' : '') + '<div class="dm-tete"><span class="dm-type">' + esc(a.auteur || 'Coach') + (a.ex ? ' <span class="etiquette-ex">exemple</span>' : '') + '</span>'
        + '<span class="dm-date">' + (a.date ? 'Publiée le ' + esc(dateFr(a.date).toLowerCase()) : '') + '</span></div>'
        + '<p class="dm-texte">' + esc(a.texte) + '</p></li>';
    }).join('');
  }
  /* Notifications des annonces publiées pendant la visite, pour tous les enfants de la famille (lues par la cloche). */
  function notifsAnnonces() {
    var r = [];
    lire('bcr-annonces', []).forEach(function (a) {
      if (!a || a.ex) return;
      ENFANTS.forEach(function (e) {
        if (a.equipe === e.equipe) r.push({ id: 'ann-' + a.id, quand: a.date ? dateFr(a.date) : 'Aujourd\'hui', texte: 'Annonce du coach (' + e.court + ', ' + e.prenom + ') : ' + a.texte, lien: '#annonces', enfant: e.id, date: a.date || '' });
      });
    });
    return r.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  /* ---------- Matchs à venir ---------- */
  function annule(id) { var c = S && S.changement(id); return !!(c && (c.statut === 'annule' || c.statut === 'forfait')); }
  function heureFr(h) { return h ? ', ' + h.replace(/^0/, '').replace(':00', ' h').replace(':', ' h ') : ''; }
  /* Matchs à venir de l'équipe d'un enfant : amicaux ajoutés par le coach, matchs des convocations ; sinon le prochain
     match, à compléter (aucun match à venir n'est publié pour ces équipes). Identifiant : celui des convocations
     (« u15|AAAA-MM-JJ » ou « u15|AAAA-MM-JJ|am… »). exterieurSeul : pour le covoiturage. */
  function matchsAVenir(e, exterieurSeul) {
    var a = auj(), l = [], vus = {};
    /* Match amical d'exemple de l'équipe : le même que dans l'espace du coach (js/selection.js), pour que chaque enfant
       ait un prochain match. Même identifiant que la convocation du coach, donc jamais en double. */
    (S ? S.amicauxExemple(e.equipe) : []).forEach(function (m) {
      var id = e.equipe + '|' + m.date; if ((exterieurSeul && m.dom) || annule(id)) return;
      vus[id] = 1;
      l.push({ id: id, date: m.date, adv: m.adv, dom: m.dom, exemple: true, lib: dateFr(m.date) + heureFr(m.heure) + ' · match amical (exemple) contre ' + m.adv + ', ' + (m.dom ? 'à domicile' : 'à l\'extérieur') });
    });
    (S ? S.lire('bcr-amicaux', []) : []).forEach(function (m) {
      if (m.equipe !== e.equipe || !m.date || m.date < a || (exterieurSeul && m.dom)) return;
      var id = e.equipe + '|' + m.date + '|' + m.id; if (annule(id)) return;
      vus[id] = 1;
      l.push({ id: id, date: m.date, adv: m.adv, dom: !!m.dom, lib: dateFr(m.date) + heureFr(m.heure) + ' · match amical contre ' + m.adv + ', '
        + (exterieurSeul ? (m.lieu && !/ext[ée]rieur/.test(m.lieu) ? m.lieu : 'à l\'extérieur') : (m.lieu || (m.dom ? 'à domicile' : 'à l\'extérieur'))) });
    });
    (S ? S.convocations() : []).forEach(function (c) {
      if (vus[c.id] || c.equipe !== e.equipe || !c.date || c.date < a || annule(c.id)) return;
      var dom = !c.lieu || /domicile/i.test(c.lieu);
      if (exterieurSeul && (dom || c.joueuses.indexOf(e.nom) < 0)) return;
      vus[c.id] = 1;
      l.push({ id: c.id, date: c.date, adv: c.adv || '', dom: dom, lib: dateFr(c.date) + ' · contre ' + (c.adv || 'adversaire à compléter') + (c.lieu ? ', ' + c.lieu : '') });
    });
    l.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    if (!l.length) l.push({ id: e.equipe + '|a-completer', date: '', aCompleter: true,
      lib: exterieurSeul ? 'Prochain match à l\'extérieur · date et adversaire à compléter par le coach' : 'Prochain match · date et adversaire à compléter par le coach' });
    return l;
  }

  /* ---------- Score en direct ---------- */
  function rendreDirect() {
    var ul = $('fam-direct'); if (!ul) return;
    var h = [];
    visibles().forEach(function (e) {
      matchsAVenir(e).forEach(function (m) {
        var q = 'match=' + encodeURIComponent(m.id) + '&amp;equipe=' + encodeURIComponent(e.equipe)
          + (m.adv ? '&amp;adv=' + encodeURIComponent(m.adv.replace(/ \(.*\)$/, '')) + '&amp;lieu=' + (m.dom ? 'dom' : 'ext') : '');
        h.push('<li>' + (tous() ? '<p class="fam-tag-ligne">' + etiquette(e) + '</p>' : '') + '<p class="dm-texte"><strong>' + esc(m.lib) + '</strong></p><div class="actions fam-direct-actions">'
          + '<a class="bouton petit" href="table-de-marque.html?' + q + '">Tenir le score en direct<span class="visuellement-cache"> : ' + esc(e.prenom) + ', ' + esc(m.lib) + '</span></a>'
          + '<a href="direct.html">Voir le score en direct</a></div></li>');
      });
    });
    ul.innerHTML = h.join('');
  }

  /* ---------- Covoiturage ---------- */
  function offres() { return lire('bcr-covoit', []); }
  function conducteurDe(e) { return 'Parent ' + de(e.nom); }
  function estMienne(o) { return ENFANTS.some(function (e) { return o.conducteur === conducteurDe(e); }); }
  function exempleDe(e, m) {
    var x = COVOIT_EX[e.equipe]; if (!x) return null;
    /* Format commun de bcr-covoit ; l'offre d'exemple se reconnaît à son identifiant « cv-ex-… ». */
    return { id: 'cv-ex-' + e.equipe, matchId: m.id, matchLib: m.lib, date: m.date, equipe: e.equipe, conducteur: x.conducteur, places: x.places, depart: x.depart, reservations: x.reservations.slice() };
  }
  var suppr = null;
  /* Matchs à l'extérieur d'un enfant, avec les offres de son équipe (y compris pour un match retiré depuis). */
  function covoitDe(e) {
    var ms = matchsAVenir(e, true), toutes = offres().filter(function (o) { return o.equipe === e.equipe; });
    toutes.forEach(function (o) { if (!ms.some(function (m) { return m.id === o.matchId; })) ms.push({ id: o.matchId, date: o.date, lib: o.matchLib, ancien: true }); });
    if (!toutes.some(function (o) { return o.id === 'cv-ex-' + e.equipe; })) { var ex = exempleDe(e, ms[0]); if (ex) toutes.push(ex); }
    return { ms: ms, toutes: toutes };
  }
  function rendreCovoit() {
    var zone = $('cv-matchs'); if (!zone) return;
    var h = [], options = [];
    visibles().forEach(function (e) {
      var c = covoitDe(e);
      c.ms.forEach(function (m) {
        if (!m.ancien) options.push('<option value="' + e.id + '§' + esc(m.id) + '">' + (tous() ? esc(e.prenom) + ' · ' : '') + esc(m.lib) + '</option>');
        var os = c.toutes.filter(function (o) { return o.matchId === m.id; });
        var dejaPlace = os.some(function (o) { return (o.reservations || []).indexOf(e.nom) >= 0; });
        h.push('<div class="cv-match">' + (tous() ? '<p class="fam-tag-ligne">' + etiquette(e) + '</p>' : '') + '<h3>' + esc(m.lib) + '</h3>'
          + (os.length ? '<ul class="demandes">' + os.map(function (o) {
            var res = o.reservations || [], libres = Math.max(0, o.places - res.length), mienne = estMienne(o), moi = res.indexOf(e.nom) >= 0;
            var geste = mienne
              ? (suppr === o.id
                ? '<span class="cv-confirme" role="group" aria-label="Confirmer le retrait de votre offre"><button type="button" class="bouton petit" data-cv-retirer-oui="' + esc(o.id) + '">Oui, retirer mon offre</button> <button type="button" class="bouton ligne petit" data-cv-retirer-non>Garder</button></span>'
                : '<button type="button" class="retirer-ligne" data-cv-retirer="' + esc(o.id) + '">Retirer mon offre</button>')
              : moi ? '<button type="button" class="retirer-ligne" data-cv-annuler="' + esc(o.id) + '" data-cv-enfant="' + e.id + '">Annuler la réservation<span class="visuellement-cache"> de ' + esc(e.prenom) + ' dans la voiture : ' + esc(o.conducteur) + '</span></button>'
              : libres && !dejaPlace ? '<button type="button" class="bouton petit" data-cv-reserver="' + esc(o.id) + '" data-cv-enfant="' + e.id + '">Je réserve une place pour ' + esc(e.prenom) + '<span class="visuellement-cache"> dans la voiture : ' + esc(o.conducteur) + '</span></button>'
              : libres ? '<span class="aide">' + esc(e.prenom) + ' a déjà une place pour ce match</span>' : '';
            return '<li data-offre="' + esc(o.id) + '"><div class="dm-tete"><span class="dm-type">' + (mienne ? 'Votre offre' : esc(o.conducteur)) + (o.id.indexOf('cv-ex-') === 0 ? ' <span class="etiquette-ex">exemple</span>' : '') + '</span>'
              + '<span class="etat pastille ' + (moi ? 'ok">Place réservée pour ' + esc(e.prenom) : libres ? 'ok">' + libres + (libres > 1 ? ' places libres' : ' place libre') + ' sur ' + o.places : 'manque">Complet') + '</span></div>'
              + '<p class="dm-date">Départ : ' + esc(o.depart) + (mienne ? ' · ' + res.length + (res.length > 1 ? ' places réservées' : ' place réservée') + ' sur ' + o.places : '') + '</p>'
              + '<div class="cv-geste">' + geste + '</div></li>';
          }).join('') + '</ul>' : '<p class="aide">Aucune offre pour ce match pour le moment.</p>')
          + '</div>');
      });
    });
    zone.innerHTML = h.join('');
    var sel = $('cv-match'), avant = sel.value;
    sel.innerHTML = options.join('');
    if (Array.prototype.some.call(sel.options, function (o) { return o.value === avant; })) sel.value = avant;
  }
  function trouverMatch(e, id) { return matchsAVenir(e, true).filter(function (m) { return m.id === id; })[0] || matchsAVenir(e, true)[0]; }
  function majOffre(id, e, f) {
    var l = offres(), o = l.filter(function (x) { return x.id === id; })[0];
    if (!o && id.indexOf('cv-ex-') === 0) { o = exempleDe(e, matchsAVenir(e, true)[0]); if (o) l.push(o); }
    if (!o) return null;
    f(o); ecrire('bcr-covoit', l); return o;
  }
  function brancherCovoit() {
    var zone = $('cv-matchs'), etat = $('cv-etat'); if (!zone) return;
    function dire(t) { etat.hidden = false; etat.textContent = t; }
    function focusOffre(id) { var li = zone.querySelector('[data-offre="' + id + '"] button') || zone.querySelector('[data-offre="' + id + '"]'); if (li) { if (li.tagName === 'LI') li.setAttribute('tabindex', '-1'); li.focus(); } }
    zone.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      var e = parId(b.getAttribute('data-cv-enfant')), id;
      if ((id = b.getAttribute('data-cv-reserver'))) {
        var o = majOffre(id, e, function (x) { x.reservations = x.reservations || []; if (x.reservations.indexOf(e.nom) < 0 && x.reservations.length < x.places) x.reservations.push(e.nom); });
        rendreCovoit(); focusOffre(id);
        dire('Simulation : place réservée pour ' + e.prenom + ' (départ : ' + (o ? o.depart : '') + '). Le conducteur et le coach le voient dans leur espace. Rien n\'est envoyé dans cette maquette.');
      } else if ((id = b.getAttribute('data-cv-annuler'))) {
        majOffre(id, e, function (x) { x.reservations = (x.reservations || []).filter(function (n) { return n !== e.nom; }); });
        rendreCovoit(); focusOffre(id);
        dire('Simulation : réservation de ' + e.prenom + ' annulée, la place est de nouveau libre.');
      } else if ((id = b.getAttribute('data-cv-retirer'))) {
        suppr = id; rendreCovoit(); var oui = zone.querySelector('[data-cv-retirer-oui]'); if (oui) oui.focus();
      } else if (b.hasAttribute('data-cv-retirer-non')) {
        var garde = suppr; suppr = null; rendreCovoit(); focusOffre(garde);
      } else if ((id = b.getAttribute('data-cv-retirer-oui'))) {
        suppr = null; ecrire('bcr-covoit', offres().filter(function (x) { return x.id !== id; }));
        rendreCovoit(); $('cv-places').focus();
        dire('Simulation : votre offre est retirée. Les familles qui avaient réservé seraient prévenues dans leur espace.');
      }
    });
    $('cv-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pl = $('cv-places'), dep = $('cv-depart'), err = $('cv-erreur'), sel = $('cv-match');
      [pl, dep].forEach(function (x) { x.removeAttribute('aria-invalid'); });
      var n = parseInt(pl.value, 10);
      if (!(n >= 1 && n <= 8) || String(n) !== pl.value.trim()) { pl.setAttribute('aria-invalid', 'true'); err.textContent = 'Indiquez un nombre de places entre 1 et 8.'; etat.hidden = true; pl.focus(); return; }
      if (dep.value.trim().length < 3) { dep.setAttribute('aria-invalid', 'true'); err.textContent = 'Indiquez le lieu de départ, par exemple le parking de la salle.'; etat.hidden = true; dep.focus(); return; }
      err.textContent = '';
      /* Le match choisi indique l'enfant (et donc l'équipe) concerné. */
      var v = (sel.value || '').split('§'), e = parId(v[0]) || visibles()[0], m = trouverMatch(e, v[1]);
      var l = offres();
      var o = { id: 'cv' + Date.now(), matchId: m.id, matchLib: m.lib, date: m.date, equipe: e.equipe, conducteur: conducteurDe(e), places: n, depart: dep.value.trim(), reservations: [] };
      l.push(o); ecrire('bcr-covoit', l);
      rendreCovoit();
      pl.value = ''; dep.value = '';
      dire('Simulation : votre offre de ' + n + (n > 1 ? ' places' : ' place') + ' est visible par les familles de l\'équipe ' + e.court + (e.coach ? ' et par le coach' : '') + '. Rien n\'est envoyé dans cette maquette.');
      focusOffre(o.id);
    });
  }

  /* ---------- Créneaux de bénévoles (pour toute la famille) ---------- */
  function rendreBenevoles() {
    var zone = $('bv-creneaux'); if (!zone) return;
    var pris = lire('bcr-benevoles', []), a = auj(), T = window.BCRTable, liste = T ? T.postes() : CRENEAUX;
    var dates = [];
    liste.forEach(function (c) { if (c.date >= a && dates.indexOf(c.date) < 0) dates.push(c.date); });
    dates.sort();
    zone.innerHTML = dates.map(function (d) {
      var cs = liste.filter(function (c) { return c.date === d; });
      return '<div class="creneau"><h3>' + esc(dateFr(d)) + ' · horaire à fixer<br>' + esc(cs[0].match) + '</h3><p class="bv-ex"><span class="etiquette-ex">exemple</span> postes et noms</p><ul>' + cs.map(function (c) {
        var moi = pris.some(function (p) { return p.creneauId === c.id && p.nom === NOM_FAMILLE; });
        var autre = pris.filter(function (p) { return p.creneauId === c.id && p.nom !== NOM_FAMILLE; })[0];
        /* Poste tenu selon le planning du président (js/table-marque.js), sinon nom d'exemple. */
        var t = T ? T.tenu(c) : (c.pris ? { nom: c.pris } : null), tient = t && !moi && !autre ? t.nom : null;
        var droite = tient ? (tient === NOM_FAMILLE ? '<span class="etat ok">Vous (' + NOM_FAMILLE + ')<small>placé par le président</small></span>' : '<span>' + esc(tient) + '</span>')
          : moi ? '<span class="bv-moi"><span class="etat ok">Vous (' + NOM_FAMILLE + ')</span> <button type="button" class="retirer-ligne" data-bv-liberer="' + c.id + '">Libérer<span class="visuellement-cache"> le créneau ' + esc(c.poste) + ' du ' + esc(dateFr(d).toLowerCase()) + '</span></button></span>'
          : autre ? '<span>' + esc(autre.nom) + '</span>'
          : '<span class="bv-libre"><span class="libre">À pourvoir</span> <button type="button" class="bouton petit" data-bv-prendre="' + c.id + '">Prendre ce créneau<span class="visuellement-cache"> : ' + esc(c.poste) + ', ' + esc(dateFr(d).toLowerCase()) + '</span></button></span>';
        return '<li data-creneau="' + c.id + '"><span>' + esc(c.poste) + '</span>' + droite + '</li>';
      }).join('') + '</ul></div>';
    }).join('') || '<p class="aide">Aucun créneau à venir pour le moment.</p>';
  }
  function brancherBenevoles() {
    var zone = $('bv-creneaux'), etat = $('bv-etat'); if (!zone) return;
    zone.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      var id = b.getAttribute('data-bv-prendre'), lib;
      if (id) {
        var l = lire('bcr-benevoles', []).filter(function (p) { return p.creneauId !== id; }); l.push({ creneauId: id, nom: NOM_FAMILLE }); ecrire('bcr-benevoles', l);
        if (window.BCRTable) window.BCRTable.oublierAffectation(id);
        lib = (window.BCRTable ? window.BCRTable.postes() : CRENEAUX).filter(function (c) { return c.id === id; })[0];
        rendreBenevoles();
        etat.hidden = false; etat.textContent = 'Simulation : créneau pris (' + lib.poste.toLowerCase() + ', ' + dateFr(lib.date).toLowerCase() + '). Les dirigeants le verraient dans leur planning. Rien n\'est envoyé dans cette maquette.';
        var bl = zone.querySelector('[data-bv-liberer="' + id + '"]'); if (bl) bl.focus();
      } else if ((id = b.getAttribute('data-bv-liberer'))) {
        ecrire('bcr-benevoles', lire('bcr-benevoles', []).filter(function (p) { return !(p.creneauId === id && p.nom === NOM_FAMILLE); }));
        rendreBenevoles();
        etat.hidden = false; etat.textContent = 'Simulation : créneau libéré, il redevient « à pourvoir » pour les autres familles.';
        var bp = zone.querySelector('[data-bv-prendre="' + id + '"]'); if (bp) bp.focus();
      }
    });
  }

  /* ---------- Contacts d'urgence (option à valider avec le club) ---------- */
  function telValide(t) { var c = t.replace(/[\s.\-]/g, ''); return /^0[1-9]\d{8}$/.test(c) || /^\+33[1-9]\d{8}$/.test(c); }
  function telJoli(t) { var c = t.replace(/[\s.\-]/g, ''); if (/^\+33/.test(c)) c = '0' + c.slice(3); return c.replace(/(\d{2})(?=\d)/g, '$1 '); }
  /* Enfants concernés par le formulaire : choix « Pour quel enfant » en vue famille, sinon l'enfant affiché. */
  function ciblesUrgence() {
    if (!tous()) return [parId(mode)];
    var v = $('ur-pour').value;
    return v === 'tous' ? ENFANTS.slice() : [parId(v)];
  }
  function remplirUrgence() {
    var u = lire('bcr-urgence', {}), c = ciblesUrgence(), x = u[c[0].id] || {};
    $('ur-tel1').value = x.tel1 || ''; $('ur-tel2').value = x.tel2 || '';
  }
  function rendreUrgence() {
    var u = lire('bcr-urgence', {});
    remplirUrgence();
    $('ur-erreur').textContent = ''; $('ur-tel1').removeAttribute('aria-invalid'); $('ur-tel2').removeAttribute('aria-invalid');
    $('ur-resume').innerHTML = visibles().map(function (e) {
      var x = u[e.id] || {};
      return '<li><span>' + (tous() ? etiquette(e) : 'Numéros') + '</span><span class="etat ' + (x.tel1 ? 'ok">' + esc(x.tel1) + (x.tel2 ? '<br>' + esc(x.tel2) : '') : 'attente">Aucun numéro enregistré') + '</span></li>';
    }).join('');
    $('ur-etat').hidden = true;
  }
  function brancherUrgence() {
    var f = $('ur-form'); if (!f) return;
    $('ur-pour').addEventListener('change', function () { remplirUrgence(); $('ur-etat').hidden = true; });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var t1 = $('ur-tel1'), t2 = $('ur-tel2'), err = $('ur-erreur'), etat = $('ur-etat');
      t1.removeAttribute('aria-invalid'); t2.removeAttribute('aria-invalid');
      if (!telValide(t1.value)) { t1.setAttribute('aria-invalid', 'true'); err.textContent = 'Indiquez un numéro de téléphone à 10 chiffres, par exemple 06 puis 8 chiffres.'; etat.hidden = true; t1.focus(); return; }
      if (t2.value.trim() && !telValide(t2.value)) { t2.setAttribute('aria-invalid', 'true'); err.textContent = 'Le second numéro n\'est pas complet : 10 chiffres, ou laissez le champ vide.'; etat.hidden = true; t2.focus(); return; }
      err.textContent = '';
      var u = lire('bcr-urgence', {}), c = ciblesUrgence(), val = { tel1: telJoli(t1.value), tel2: t2.value.trim() ? telJoli(t2.value) : '' };
      c.forEach(function (e) { u[e.id] = { tel1: val.tel1, tel2: val.tel2 }; });
      ecrire('bcr-urgence', u);
      var pour = $('ur-pour').value;
      rendreUrgence(); $('ur-pour').value = tous() ? pour : mode;
      etat.hidden = false;
      etat.textContent = 'Simulation : numéros enregistrés pour ' + liste(c.map(function (e) { return e.prenom; })) + '. Seul le coach de l\'équipe les verrait, le jour du match. Rien n\'est envoyé dans cette maquette.';
    });
  }

  function rendreTout() { rendreDirect(); rendreAnnonces(); rendreCovoit(); rendreBenevoles(); rendreUrgence(); }

  window.BCRFam = {
    enfants: function () { return ENFANTS.slice(); },
    visibles: visibles,
    tous: tous,
    courant: function () { return tous() ? null : parId(mode); },
    parId: parId,
    choisir: choisir,
    de: de,
    tag: tag,
    enfantChoisi: enfantChoisi,
    prochainMatch: function (e) { return matchsAVenir(e)[0]; },
    surChangement: function (f) { abonnes.push(f); },
    notifsAnnonces: notifsAnnonces,
    /* Libellé « enfant » d'une demande au bureau. */
    libDemande: function () {
      var v = tous() ? ($('dm-enfant') || {}).value : mode, e = parId(v);
      return e ? e.prenom + ', ' + e.court : 'Famille (' + liste(ENFANTS.map(function (x) { return x.prenom; })) + ')';
    },
    /* Enfant de la famille concerné par une convocation (même équipe et même nom), ou null. */
    enfantDe: function (c) { for (var i = 0; i < ENFANTS.length; i++) { var e = ENFANTS[i]; if (c.joueuses && c.joueuses.indexOf(e.nom) >= 0 && (!c.equipe || c.equipe === e.equipe)) return e; } return null; }
  };

  function demarrer() {
    document.querySelectorAll('.fam-enfants [data-choisir]').forEach(function (b) {
      b.addEventListener('click', function () { choisir(b.getAttribute('data-choisir')); });
    });
    brancherCovoit(); brancherBenevoles(); brancherUrgence();
    appliquer(); rendreTout();
  }
  /* Le script est chargé en fin de page : les blocs existent déjà. */
  demarrer();
})();
