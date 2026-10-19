/* Espace familles : un compte pour plusieurs enfants, annonces du coach, covoiturage, créneaux de bénévoles,
   contacts d'urgence (option à valider avec le club). Lié uniquement depuis licencies.html, après js/selection.js.
   Tout reste dans l'onglet le temps de la visite (sessionStorage, clés « bcr- ») : rien n'est envoyé.
   Clés partagées (formats communs aux pages de la maquette) :
     bcr-annonces  [{id, equipe, texte, date:'AAAA-MM-JJ', auteur, ex}]                 lue ici (écrite par le coach)
     bcr-covoit    [{id, matchId, matchLib, date, equipe, conducteur, places, depart, reservations:[nom]}]  lue et écrite ici
     bcr-benevoles [{creneauId, nom}]                                                   écrite ici (lue par l'espace dirigeants)
   Clés propres à cette page : bcr-enfant (enfant affiché), bcr-urgence (numéros par enfant),
   bcr-indispos-elsa (indisponibilités du second enfant ; celles de Léa restent dans bcr-indispos). */
(function () {
  'use strict';
  var S = window.BCRSel;
  function lire(cle, defaut) { try { var v = sessionStorage.getItem(cle); return v ? JSON.parse(v) : defaut; } catch (e) { return defaut; } }
  function ecrire(cle, v) { try { sessionStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dateFr(iso) { return S ? S.dateFr(iso) : iso; }
  function auj() { return new Date().toISOString().slice(0, 10); }
  function $(id) { return document.getElementById(id); }

  /* ---------- Les enfants de la famille B. (exemple) ---------- */
  var ENFANTS = [
    { id: 'lea', prenom: 'Léa', nom: 'Léa B.', equipe: 'u15', equipeNom: 'U15 féminines', lib: 'U15 féminines, départementale (DFU15)', court: 'U15 F', ancre: 'u15f', ex: false,
      dernier: '<strong>Samedi 17 octobre, 16 h</strong> · U15 féminines contre BC Offranville, à domicile' },
    { id: 'elsa', prenom: 'Elsa', nom: 'Elsa B.', equipe: 'u13', equipeNom: 'U13 féminines', lib: 'U13 féminines, départementale (DFU13)', court: 'U13 F', ancre: 'u13f', ex: true,
      dernier: '<strong>Samedi 17 octobre, 14 h</strong> · U13 féminines contre CEP Saint-Nicolas-d\'Aliermont, à domicile' }
  ];
  function parId(id) { for (var i = 0; i < ENFANTS.length; i++) if (ENFANTS[i].id === id) return ENFANTS[i]; return null; }
  var courant = parId(lire('bcr-enfant', 'lea')) || ENFANTS[0];
  var abonnes = [];
  /* « de Léa », « d'Elsa » */
  function de(p) { return (/^[aeiouyàâéèêëîïôûh]/i.test(p) ? 'd\'' : 'de ') + p; }

  /* Annonce d'exemple de chaque équipe (jamais écrite dans bcr-annonces). */
  var ANNONCES_EX = {
    u15: { id: 'ann-ex-u15', equipe: 'u15', texte: 'Pour chaque match, prévoyez une gourde et soyez là à l\'heure du rendez-vous indiquée dans la convocation. Merci à tous !', date: '2026-10-14', auteur: 'Coach U15', ex: true },
    u13: { id: 'ann-ex-u13', equipe: 'u13', texte: 'Pensez à indiquer dans votre espace les jours d\'absence des vacances : cela m\'aide à préparer les prochains matchs.', date: '2026-10-15', auteur: 'Coach U13', ex: true }
  };
  /* Offre de covoiturage d'exemple de chaque équipe : elle n'est écrite dans bcr-covoit qu'à la première réservation. */
  var COVOIT_EX = {
    u15: { conducteur: 'Parent de Camille T.', places: 3, depart: 'Parking de la salle Alexandre-Cheruel', reservations: ['Lina P.'] },
    u13: { conducteur: 'Parent de Zoé D.', places: 3, depart: 'Parking de la salle Alexandre-Cheruel', reservations: [] }
  };
  /* Créneaux de table de marque d'exemple, sur les vrais matchs à domicile à venir (élite régionale U18 F, horaires non fixés).
     Les identifiants sont ceux que l'espace dirigeants lirait dans bcr-benevoles. */
  var CRENEAUX = [
    { id: 'tm-2026-11-07-marqueur', date: '2026-11-07', match: 'U18 féminines (RFU18) contre Cherbourg Basket Ball', poste: 'Marqueur', pris: 'Sophie D.' },
    { id: 'tm-2026-11-07-chrono', date: '2026-11-07', match: 'U18 féminines (RFU18) contre Cherbourg Basket Ball', poste: 'Chronométreur', pris: null },
    { id: 'tm-2026-11-21-marqueur', date: '2026-11-21', match: 'U18 féminines (RFU18) contre USO Mondeville Basket 2', poste: 'Marqueur', pris: null },
    { id: 'tm-2026-11-21-chrono', date: '2026-11-21', match: 'U18 féminines (RFU18) contre USO Mondeville Basket 2', poste: 'Chronométreur', pris: 'Thomas R.' }
  ];
  var NOM_FAMILLE = 'Famille B.';

  /* ---------- Sélecteur d'enfant et textes qui dépendent de l'enfant ---------- */
  function appliquer() {
    var e = courant;
    document.querySelectorAll('[data-fam="prenom"]').forEach(function (n) { n.textContent = e.prenom; });
    document.querySelectorAll('[data-fam="de-prenom"]').forEach(function (n) { n.textContent = de(e.prenom); });
    document.querySelectorAll('[data-fam="equipe-court"]').forEach(function (n) { n.textContent = e.court; });
    document.querySelectorAll('[data-enfant]').forEach(function (n) { n.hidden = n.getAttribute('data-enfant') !== e.id; });
    var l = $('fam-equipe-lib'); if (l) l.innerHTML = esc(e.prenom) + ' · ' + esc(e.lib) + ' · saison 2026-2027' + (e.ex ? ' <span class="etiquette-ex">exemple</span>' : '');
    var d = $('fam-dernier'); if (d) d.innerHTML = e.dernier;
    var c = $('fam-calendrier'); if (c) c.setAttribute('href', 'equipes.html#' + e.ancre);
    document.querySelectorAll('.fam-enfants [data-choisir]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-choisir') === e.id)); });
    var sel = $('md-match');
    if (sel) {
      Array.prototype.forEach.call(sel.options, function (o) {
        var base = o.getAttribute('data-base') || o.text.replace(/ \(match d[e'] ?[^)]*\)$/, '');
        o.setAttribute('data-base', base);
        o.text = base + (o.value === e.equipe ? ' (match ' + de(e.prenom) + ')' : '');
      });
      if (sel.querySelector('option[value="' + e.equipe + '"]')) sel.value = e.equipe;
    }
  }
  function choisir(id, sansFocus) {
    var e = parId(id); if (!e) return;
    courant = e; ecrire('bcr-enfant', id);
    appliquer();
    rendreTout();
    abonnes.forEach(function (f) { try { f(e); } catch (x) { if (window.console) console.error(x); } });
    var et = $('fam-enfant-etat'); if (et && !sansFocus) et.textContent = 'Espace affiché pour ' + e.prenom + ', ' + e.lib + '.';
  }

  /* ---------- Annonces de l'équipe ---------- */
  function annoncesDe(equipe) {
    var l = lire('bcr-annonces', []).filter(function (a) { return a && a.equipe === equipe; });
    if (ANNONCES_EX[equipe]) l.push(ANNONCES_EX[equipe]);
    return l.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }
  function rendreAnnonces() {
    var ul = $('fam-annonces'); if (!ul) return;
    var l = annoncesDe(courant.equipe);
    ul.innerHTML = l.map(function (a) {
      return '<li><div class="dm-tete"><span class="dm-type">' + esc(a.auteur || 'Coach') + (a.ex ? ' <span class="etiquette-ex">exemple</span>' : '') + '</span>'
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

  /* ---------- Covoiturage ---------- */
  function annule(id) { var c = S && S.changement(id); return !!(c && (c.statut === 'annule' || c.statut === 'forfait')); }
  /* Matchs à l'extérieur de l'équipe : amicaux ajoutés par le coach, convocations reçues pour un match à l'extérieur,
     sinon le prochain match à l'extérieur, à compléter (aucun match à l'extérieur publié pour cette équipe). */
  function matchsExterieur(e) {
    var a = auj(), l = [], vus = {};
    (S ? S.lire('bcr-amicaux', []) : []).forEach(function (m) {
      if (m.equipe !== e.equipe || m.dom || !m.date || m.date < a) return;
      var id = e.equipe + '|' + m.date + '|' + m.id; if (annule(id)) return;
      vus[id] = 1;
      l.push({ id: id, date: m.date, lib: dateFr(m.date) + (m.heure ? ', ' + m.heure.replace(/^0/, '').replace(':00', ' h').replace(':', ' h ') : '') + ' · match amical contre ' + m.adv + (m.lieu && !/ext[ée]rieur/.test(m.lieu) ? ', ' + m.lieu : ', à l\'extérieur') });
    });
    (S ? S.convocations() : []).forEach(function (c) {
      if (vus[c.id] || c.equipe !== e.equipe || c.joueuses.indexOf(e.nom) < 0 || !c.date || c.date < a) return;
      if (!c.lieu || /domicile/i.test(c.lieu) || annule(c.id)) return;
      vus[c.id] = 1;
      l.push({ id: c.id, date: c.date, lib: dateFr(c.date) + ' · contre ' + (c.adv || 'adversaire à compléter') + ', ' + c.lieu });
    });
    l.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    if (!l.length) l.push({ id: e.equipe + '|a-completer', date: '', lib: 'Prochain match à l\'extérieur · date et adversaire à compléter par le coach' });
    return l;
  }
  function offres() { return lire('bcr-covoit', []); }
  function conducteurDe(e) { return 'Parent ' + de(e.nom); }
  function estMienne(o) { return ENFANTS.some(function (e) { return o.conducteur === conducteurDe(e); }); }
  function exempleDe(e, m) {
    var x = COVOIT_EX[e.equipe]; if (!x) return null;
    /* Format commun de bcr-covoit ; l'offre d'exemple se reconnaît à son identifiant « cv-ex-… ». */
    return { id: 'cv-ex-' + e.equipe, matchId: m.id, matchLib: m.lib, date: m.date, equipe: e.equipe, conducteur: x.conducteur, places: x.places, depart: x.depart, reservations: x.reservations.slice() };
  }
  function rendreCovoit() {
    var zone = $('cv-matchs'); if (!zone) return;
    var e = courant, ms = matchsExterieur(e), toutes = offres().filter(function (o) { return o.equipe === e.equipe; });
    /* Matchs dont une offre existe encore mais qui ne sont plus dans la liste (amical retiré, par exemple). */
    toutes.forEach(function (o) { if (!ms.some(function (m) { return m.id === o.matchId; })) ms.push({ id: o.matchId, date: o.date, lib: o.matchLib, ancien: true }); });
    if (!toutes.some(function (o) { return o.id === 'cv-ex-' + e.equipe; })) { var ex = exempleDe(e, ms[0]); if (ex) toutes.push(ex); }
    zone.innerHTML = ms.map(function (m) {
      var os = toutes.filter(function (o) { return o.matchId === m.id; });
      var dejaPlace = os.some(function (o) { return (o.reservations || []).indexOf(e.nom) >= 0; });
      return '<div class="cv-match"><h3>' + esc(m.lib) + '</h3>'
        + (os.length ? '<ul class="demandes">' + os.map(function (o) {
          var res = o.reservations || [], libres = Math.max(0, o.places - res.length), mienne = estMienne(o), moi = res.indexOf(e.nom) >= 0;
          var geste = mienne
            ? (suppr === o.id
              ? '<span class="cv-confirme" role="group" aria-label="Confirmer le retrait de votre offre"><button type="button" class="bouton petit" data-cv-retirer-oui="' + esc(o.id) + '">Oui, retirer mon offre</button> <button type="button" class="bouton ligne petit" data-cv-retirer-non>Garder</button></span>'
              : '<button type="button" class="retirer-ligne" data-cv-retirer="' + esc(o.id) + '">Retirer mon offre</button>')
            : moi ? '<button type="button" class="retirer-ligne" data-cv-annuler="' + esc(o.id) + '">Annuler la réservation<span class="visuellement-cache"> dans la voiture : ' + esc(o.conducteur) + '</span></button>'
            : libres && !dejaPlace ? '<button type="button" class="bouton petit" data-cv-reserver="' + esc(o.id) + '">Je réserve une place pour ' + esc(e.prenom) + '<span class="visuellement-cache"> dans la voiture : ' + esc(o.conducteur) + '</span></button>'
            : libres ? '<span class="aide">' + esc(e.prenom) + ' a déjà une place pour ce match</span>' : '';
          return '<li data-offre="' + esc(o.id) + '"><div class="dm-tete"><span class="dm-type">' + (mienne ? 'Votre offre' : esc(o.conducteur)) + (o.id.indexOf('cv-ex-') === 0 ? ' <span class="etiquette-ex">exemple</span>' : '') + '</span>'
            + '<span class="etat pastille ' + (moi ? 'ok">Place réservée pour ' + esc(e.prenom) : libres ? 'ok">' + libres + (libres > 1 ? ' places libres' : ' place libre') + ' sur ' + o.places : 'manque">Complet') + '</span></div>'
            + '<p class="dm-date">Départ : ' + esc(o.depart) + (mienne ? ' · ' + res.length + (res.length > 1 ? ' places réservées' : ' place réservée') + ' sur ' + o.places : '') + '</p>'
            + '<div class="cv-geste">' + geste + '</div></li>';
        }).join('') + '</ul>' : '<p class="aide">Aucune offre pour ce match pour le moment.</p>')
        + '</div>';
    }).join('');
    /* Liste des matchs du formulaire */
    var sel = $('cv-match'), avant = sel.value;
    var dispo = ms.filter(function (m) { return !m.ancien; });
    sel.innerHTML = dispo.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.lib) + '</option>'; }).join('');
    if (dispo.some(function (m) { return m.id === avant; })) sel.value = avant;
  }
  var suppr = null;
  function majOffre(id, f) {
    var l = offres(), o = l.filter(function (x) { return x.id === id; })[0];
    if (!o && id.indexOf('cv-ex-') === 0) {
      var e = courant, m = matchsExterieur(e)[0]; o = exempleDe(e, m); l.push(o);
    }
    if (!o) return null;
    f(o); ecrire('bcr-covoit', l); return o;
  }
  function brancherCovoit() {
    var zone = $('cv-matchs'), etat = $('cv-etat'); if (!zone) return;
    function dire(t) { etat.hidden = false; etat.textContent = t; }
    zone.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      var e = courant, id;
      if ((id = b.getAttribute('data-cv-reserver'))) {
        var o = majOffre(id, function (x) { x.reservations = x.reservations || []; if (x.reservations.indexOf(e.nom) < 0 && x.reservations.length < x.places) x.reservations.push(e.nom); });
        rendreCovoit(); focusOffre(id);
        dire('Simulation : place réservée pour ' + e.prenom + ' (départ : ' + (o ? o.depart : '') + '). Le conducteur et le coach le voient dans leur espace. Rien n\'est envoyé dans cette maquette.');
      } else if ((id = b.getAttribute('data-cv-annuler'))) {
        majOffre(id, function (x) { x.reservations = (x.reservations || []).filter(function (n) { return n !== e.nom; }); });
        rendreCovoit(); focusOffre(id);
        dire('Simulation : réservation annulée, la place est de nouveau libre.');
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
    function focusOffre(id) { var li = zone.querySelector('[data-offre="' + id + '"] button') || zone.querySelector('[data-offre="' + id + '"]'); if (li) { if (!li.hasAttribute('tabindex') && li.tagName === 'LI') li.setAttribute('tabindex', '-1'); li.focus(); } }
    $('cv-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var e = courant, pl = $('cv-places'), dep = $('cv-depart'), err = $('cv-erreur'), sel = $('cv-match');
      [pl, dep].forEach(function (x) { x.removeAttribute('aria-invalid'); });
      var n = parseInt(pl.value, 10);
      if (!(n >= 1 && n <= 8) || String(n) !== pl.value.trim()) { pl.setAttribute('aria-invalid', 'true'); err.textContent = 'Indiquez un nombre de places entre 1 et 8.'; etat.hidden = true; pl.focus(); return; }
      if (dep.value.trim().length < 3) { dep.setAttribute('aria-invalid', 'true'); err.textContent = 'Indiquez le lieu de départ, par exemple le parking de la salle.'; etat.hidden = true; dep.focus(); return; }
      err.textContent = '';
      var m = matchsExterieur(e).filter(function (x) { return x.id === sel.value; })[0] || matchsExterieur(e)[0];
      var l = offres();
      var o = { id: 'cv' + Date.now(), matchId: m.id, matchLib: m.lib, date: m.date, equipe: e.equipe, conducteur: conducteurDe(e), places: n, depart: dep.value.trim(), reservations: [] };
      l.push(o); ecrire('bcr-covoit', l);
      rendreCovoit();
      pl.value = ''; dep.value = '';
      dire('Simulation : votre offre de ' + n + (n > 1 ? ' places' : ' place') + ' est visible par les familles de l\'équipe ' + e.court + ' et par le coach. Rien n\'est envoyé dans cette maquette.');
      focusOffre(o.id);
    });
  }

  /* ---------- Score en direct ---------- */
  /* Matchs à venir de l'équipe, à domicile comme à l'extérieur : amicaux ajoutés par le coach, matchs des convocations,
     sinon le prochain match, à compléter. Identifiant : celui des convocations (« u15|AAAA-MM-JJ » ou « u15|AAAA-MM-JJ|am… »). */
  function heureFr(h) { return h ? ', ' + h.replace(/^0/, '').replace(':00', ' h').replace(':', ' h ') : ''; }
  function matchsAVenir(e) {
    var a = auj(), l = [], vus = {};
    (S ? S.lire('bcr-amicaux', []) : []).forEach(function (m) {
      if (m.equipe !== e.equipe || !m.date || m.date < a) return;
      var id = e.equipe + '|' + m.date + '|' + m.id; if (annule(id)) return;
      vus[id] = 1;
      l.push({ id: id, date: m.date, lib: dateFr(m.date) + heureFr(m.heure) + ' · match amical contre ' + m.adv + ', ' + (m.lieu || (m.dom ? 'à domicile' : 'à l\'extérieur')) });
    });
    (S ? S.convocations() : []).forEach(function (c) {
      if (vus[c.id] || c.equipe !== e.equipe || !c.date || c.date < a || annule(c.id)) return;
      vus[c.id] = 1;
      l.push({ id: c.id, date: c.date, lib: dateFr(c.date) + ' · contre ' + (c.adv || 'adversaire à compléter') + (c.lieu ? ', ' + c.lieu : '') });
    });
    l.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    if (!l.length) l.push({ id: e.equipe + '|a-completer', date: '', lib: 'Prochain match · date et adversaire à compléter par le coach' });
    return l;
  }
  function rendreDirect() {
    var ul = $('fam-direct'); if (!ul) return;
    var e = courant;
    ul.innerHTML = matchsAVenir(e).map(function (m) {
      return '<li><p class="dm-texte"><strong>' + esc(m.lib) + '</strong></p><div class="actions fam-direct-actions">'
        + '<a class="bouton petit" href="table-de-marque.html?match=' + encodeURIComponent(m.id) + '&amp;equipe=' + encodeURIComponent(e.equipe) + '">Tenir le score en direct<span class="visuellement-cache"> : ' + esc(m.lib) + '</span></a>'
        + '<a href="direct.html">Voir le score en direct</a></div></li>';
    }).join('');
  }

  /* ---------- Créneaux de bénévoles ---------- */
  function rendreBenevoles() {
    var zone = $('bv-creneaux'); if (!zone) return;
    var pris = lire('bcr-benevoles', []), a = auj();
    var dates = [];
    CRENEAUX.forEach(function (c) { if (c.date >= a && dates.indexOf(c.date) < 0) dates.push(c.date); });
    zone.innerHTML = dates.map(function (d) {
      var cs = CRENEAUX.filter(function (c) { return c.date === d; });
      return '<div class="creneau"><h3>' + esc(dateFr(d)) + ' · horaire à fixer<br>' + esc(cs[0].match) + '</h3><p class="bv-ex"><span class="etiquette-ex">exemple</span> postes et noms</p><ul>' + cs.map(function (c) {
        var moi = pris.some(function (p) { return p.creneauId === c.id && p.nom === NOM_FAMILLE; });
        var autre = pris.filter(function (p) { return p.creneauId === c.id && p.nom !== NOM_FAMILLE; })[0];
        var droite = c.pris ? '<span>' + esc(c.pris) + '</span>'
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
        lib = CRENEAUX.filter(function (c) { return c.id === id; })[0];
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
  function rendreUrgence() {
    var u = lire('bcr-urgence', {})[courant.id] || {};
    $('ur-tel1').value = u.tel1 || ''; $('ur-tel2').value = u.tel2 || '';
    $('ur-erreur').textContent = ''; $('ur-tel1').removeAttribute('aria-invalid'); $('ur-tel2').removeAttribute('aria-invalid');
    var r = $('ur-resume');
    r.innerHTML = u.tel1 ? '<li><span>Premier numéro</span><span class="etat ok">' + esc(u.tel1) + '</span></li>' + (u.tel2 ? '<li><span>Second numéro</span><span class="etat ok">' + esc(u.tel2) + '</span></li>' : '')
      : '<li><span>Aucun numéro enregistré pour ' + esc(courant.prenom) + ' dans cette visite.</span></li>';
    $('ur-etat').hidden = true;
  }
  function brancherUrgence() {
    var f = $('ur-form'); if (!f) return;
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var t1 = $('ur-tel1'), t2 = $('ur-tel2'), err = $('ur-erreur'), etat = $('ur-etat');
      t1.removeAttribute('aria-invalid'); t2.removeAttribute('aria-invalid');
      if (!telValide(t1.value)) { t1.setAttribute('aria-invalid', 'true'); err.textContent = 'Indiquez un numéro de téléphone à 10 chiffres, par exemple 06 puis 8 chiffres.'; etat.hidden = true; t1.focus(); return; }
      if (t2.value.trim() && !telValide(t2.value)) { t2.setAttribute('aria-invalid', 'true'); err.textContent = 'Le second numéro n\'est pas complet : 10 chiffres, ou laissez le champ vide.'; etat.hidden = true; t2.focus(); return; }
      err.textContent = '';
      var u = lire('bcr-urgence', {}); u[courant.id] = { tel1: telJoli(t1.value), tel2: t2.value.trim() ? telJoli(t2.value) : '' }; ecrire('bcr-urgence', u);
      rendreUrgence();
      etat.hidden = false;
      etat.textContent = 'Simulation : numéros enregistrés pour ' + courant.prenom + '. Seul le coach ' + courant.court + ' les verrait, le jour du match. Rien n\'est envoyé dans cette maquette.';
    });
  }

  function rendreTout() { rendreDirect(); rendreAnnonces(); rendreCovoit(); rendreBenevoles(); rendreUrgence(); }

  window.BCRFam = {
    enfants: function () { return ENFANTS.slice(); },
    courant: function () { return courant; },
    parId: parId,
    choisir: choisir,
    de: de,
    surChangement: function (f) { abonnes.push(f); },
    notifsAnnonces: notifsAnnonces,
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
