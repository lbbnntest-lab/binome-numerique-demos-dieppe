/* Espace dirigeants, vie du club : créneaux de bénévoles (table de marque) et événements avec billetterie.
   Lié uniquement depuis dirigeants.html. Tout est simulé : rien n'est publié ni envoyé.
   Clés de la visite (sessionStorage, contrat commun) :
   - bcr-benevoles : [{creneauId, nom}] écrit par l'espace des familles ; chaque poste de la table de marque porte data-creneau.
   - bcr-evenements : [{id, titre, date, heure, lieu, prix, places, description, publie, reservations:[{nom, nb}], ex}]
     créé ici, lu par la page publique des événements (js/billetterie.js). prix : 0 = gratuit ; places : null = sans limite.
   La journée d'arbitrage (vraie publication du club, sans billetterie) est affichée d'office sans être écrite dans bcr-evenements ;
   le « Tournoi des jeunes (exemple) » y est écrit par js/selection.js (amorcerEvenements), publié, pour que la page publique
   puisse le réserver. */
(function () {
  'use strict';
  function lire(cle, d) { try { var v = sessionStorage.getItem(cle); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrire(cle, v) { try { sessionStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dateFr(iso) {
    if (!iso) return '';
    var d = new Date(iso.slice(0, 10) + 'T12:00'); if (isNaN(d)) return iso;
    var t = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function euros(n) { return (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'; }
  function annoncer(id, t) { var p = document.getElementById(id); if (!p) return; p.hidden = false; p.textContent = t; }
  var R = window.BCRRole;
  function role() { return R ? R.role() : 'president'; }

  /* ---------- Table de marque : le président organise qui tient chaque poste (js/table-marque.js) ---------- */
  var T = window.BCRTable;
  function aujourdhui() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function avenir() { return T ? T.postes().filter(function (c) { return c.date >= aujourdhui(); }) : []; }
  function rendreBenevoles() {
    var zone = document.getElementById('tm-planning'); if (!zone || !T) return;
    var liste = avenir(), dates = [];
    liste.forEach(function (c) { if (dates.indexOf(c.date) < 0) dates.push(c.date); });
    dates.sort();
    zone.innerHTML = dates.map(function (d) {
      var cs = liste.filter(function (c) { return c.date === d; }), match = cs[0].match;
      return '<div class="creneau tm-match"><h3>' + esc(dateFr(d)) + ' · horaire à fixer<br>' + esc(match) + '</h3><ul>' + cs.map(function (c) {
        var t = T.tenu(c), noms = T.BENEVOLES.slice();
        if (t && noms.indexOf(t.nom) < 0) noms.push(t.nom);
        var choix = '<select data-tm-poste="' + esc(c.id) + '" aria-label="' + esc(c.poste + ', ' + dateFr(d).toLowerCase()) + '">'
          + '<option value="">À pourvoir</option>' + noms.map(function (n) { return '<option' + (t && t.nom === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select>';
        var info = t && t.source === 'famille' ? '<small class="tm-source">réservé depuis l\'espace des familles</small>' : '';
        var retirer = c.ajoute ? '<button type="button" class="retirer-ligne" data-tm-retirer="' + esc(c.id) + '">Retirer<span class="visuellement-cache"> le poste ' + esc(c.poste) + '</span></button>' : '';
        return '<li data-creneau="' + esc(c.id) + '" class="' + (t ? 'tm-pourvu' : 'tm-libre') + '"><span>' + esc(c.poste) + (t ? '' : ' <span class="libre">à pourvoir</span>') + info + '</span><span class="tm-choix">' + choix + retirer + '</span></li>';
      }).join('') + '</ul>'
        + '<form class="tm-ajout" data-tm-date="' + esc(d) + '" data-tm-match="' + esc(match) + '"><label class="visuellement-cache" for="tm-n-' + esc(d) + '">Nouveau poste pour ce match</label>'
        + '<input id="tm-n-' + esc(d) + '" list="tm-suggestions" placeholder="Nouveau poste" maxlength="40" autocomplete="off"><button type="submit" class="bouton ligne petit">Ajouter</button></form></div>';
    }).join('') + '<datalist id="tm-suggestions">' + T.SUGGESTIONS.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>';
    /* Ce qui manque, match par match. */
    var manque = [];
    dates.forEach(function (d) {
      var l = liste.filter(function (c) { return c.date === d && !T.tenu(c); }).map(function (c) { return c.poste.toLowerCase(); });
      if (l.length) manque.push('<li><b>' + esc(dateFr(d)) + '</b> : ' + esc(l.join(', ')) + '</li>');
    });
    var nb = liste.filter(function (c) { return !T.tenu(c); }).length;
    var m = document.getElementById('tm-manque');
    if (m) m.innerHTML = nb ? '<p><b>Il manque ' + nb + (nb > 1 ? ' personnes' : ' personne') + '</b> pour les prochains matchs à domicile :</p><ul>' + manque.join('') + '</ul>'
      : '<p class="etat ok">Tous les postes des prochains matchs à domicile sont pourvus.</p>';
    var e = document.getElementById('benevoles-etat');
    if (e) e.textContent = nb ? nb + (nb > 1 ? ' postes restent à pourvoir' : ' poste reste à pourvoir') + ' sur ' + liste.length + ' pour les prochains matchs.' : 'Tous les postes des prochains matchs sont pourvus.';
    var bt = document.getElementById('tm-appel'); if (bt) bt.disabled = !nb;
  }
  (function brancherTable() {
    var zone = document.getElementById('tm-planning'); if (!zone || !T) return;
    zone.addEventListener('change', function (ev) {
      var sel = ev.target.closest('[data-tm-poste]'); if (!sel) return;
      var id = sel.getAttribute('data-tm-poste'), c = T.postes().filter(function (x) { return x.id === id; })[0];
      T.affecter(id, sel.value); rendreBenevoles();
      annoncer('tm-etat', sel.value ? 'Simulation : ' + sel.value + ' tiendra le poste de ' + c.poste.toLowerCase() + ' (' + dateFr(c.date).toLowerCase() + '). Rien n\'est envoyé dans cette maquette.'
        : 'Simulation : le poste de ' + c.poste.toLowerCase() + ' (' + dateFr(c.date).toLowerCase() + ') est de nouveau à pourvoir ; les familles peuvent le prendre depuis leur espace.');
      var n = zone.querySelector('[data-tm-poste="' + id + '"]'); if (n) n.focus();
    });
    zone.addEventListener('submit', function (ev) {
      var f = ev.target.closest('.tm-ajout'); if (!f) return; ev.preventDefault();
      var champ = f.querySelector('input'), poste = champ.value.trim().replace(/\s+/g, ' ');
      if (!poste) { champ.focus(); return; }
      poste = poste.charAt(0).toUpperCase() + poste.slice(1);
      var id = T.ajouterPoste(f.getAttribute('data-tm-date'), f.getAttribute('data-tm-match'), poste);
      rendreBenevoles();
      annoncer('tm-etat', 'Simulation : poste « ' + poste + ' » ajouté, à pourvoir.');
      var n = zone.querySelector('[data-tm-poste="' + id + '"]'); if (n) n.focus();
    });
    zone.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tm-retirer]'); if (!b) return;
      T.retirerPoste(b.getAttribute('data-tm-retirer')); rendreBenevoles();
      annoncer('tm-etat', 'Simulation : poste retiré du match.');
      var a = document.getElementById('tm-appel'); if (a) a.focus();
    });
    var bt = document.getElementById('tm-appel');
    if (bt) bt.addEventListener('click', function () {
      var nb = avenir().filter(function (c) { return !T.tenu(c); }).length;
      annoncer('tm-etat', 'Simulation : un message aux familles listerait les ' + nb + (nb > 1 ? ' postes libres' : ' poste libre') + ', avec un lien pour le prendre depuis leur espace. Le président le relirait avant l\'envoi ; rien n\'est envoyé dans cette maquette.');
    });
  })();

  /* ---------- Événements ---------- */
  var FIXES = [
    { id: 'ev-arbitrage-2026-10-21', titre: 'Journée d\'initiation à l\'arbitrage', date: '2026-10-21', heure: '10 h-16 h 30',
      lieu: 'Salle Alexandre-Cheruel, Rouxmesnil-Bouteilles', prix: null, places: null,
      description: 'Proposée par la Ligue de Normandie et le CD76, accueillie par le BCR. Pour les licenciés U13 à seniors, filles et garçons ; ouverte aux autres clubs. Inscription auprès de Bertrand.',
      publie: true, reservations: [], ex: false, club: true }
  ];
  /* Événements créés pendant la visite (bcr-evenements) ; les fixes s'y ajoutent seulement à l'affichage. */
  function evenements() { var l = lire('bcr-evenements', []); return Array.isArray(l) ? l.filter(function (e) { return e && e.id; }) : []; }
  function reserve(ev) { return (ev.reservations || []).reduce(function (s, r) { return s + (parseInt(r.nb, 10) || 0); }, 0); }
  function billetterie(ev) { return typeof ev.prix === 'number'; }
  function libPrix(ev) { return !billetterie(ev) ? 'Pas de billetterie' : ev.prix === 0 ? 'Gratuit, sur réservation' : euros(ev.prix) + ' la place'; }
  function libPlaces(ev) {
    var n = reserve(ev);
    if (!billetterie(ev)) return 'Places : non communiqué';
    return n + (n > 1 ? ' places réservées' : ' place réservée') + (typeof ev.places === 'number' ? ' sur ' + ev.places : ', sans limite de places');
  }
  var liste = document.getElementById('ev-liste');
  if (window.BCRSel) window.BCRSel.amorcerEvenements();
  if (!liste) { rendreBenevoles(); return; }
  function rendreEvenements() {
    var l = FIXES.concat(evenements()).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var tres = role() === 'tresorier', gere = role() === 'president' || role() === 'secretaire';
    document.getElementById('ev-intro').textContent = tres
      ? 'Côté trésorerie : les places réservées et le montant de chaque billetterie. Les noms et les réglages des événements restent au président et au secrétaire.'
      : 'Un événement ajouté ici apparaîtrait sur la page Événements du site une fois publié, avec la réservation en ligne si une billetterie est ouverte.';
    var places = 0, montant = 0;
    l.forEach(function (ev) { if (billetterie(ev)) { places += reserve(ev); montant += reserve(ev) * ev.prix; } });
    var ex = l.filter(function (e) { return e.ex && billetterie(e); }), exN = ex.reduce(function (t, e) { return t + reserve(e); }, 0), exM = ex.reduce(function (t, e) { return t + reserve(e) * e.prix; }, 0);
    document.getElementById('ev-total-aide').textContent = 'Chiffres d\'exemple inclus : le tournoi des jeunes compte pour ' + exN + ' places et ' + euros(exM) + '.';
    document.getElementById('ev-total').innerHTML = '<div><b>' + l.length + '</b><span>' + (l.length > 1 ? 'événements' : 'événement') + '</span></div>'
      + '<div><b>' + places + '</b><span>places réservées</span></div><div><b>' + euros(montant) + '</b><span>montant des réservations</span></div>';
    liste.innerHTML = l.map(function (ev) {
      var n = reserve(ev), m = billetterie(ev) ? n * ev.prix : 0;
      return '<li id="ev-' + esc(ev.id) + '"><div class="ev-corps">'
        + '<p class="ev-quand">' + esc(dateFr(ev.date)) + (ev.heure ? ' · ' + esc(ev.heure) : '') + '</p>'
        + '<h3>' + esc(ev.titre) + (ev.ex ? ' <span class="etiquette-ex">exemple</span>' : '') + '</h3>'
        + (tres ? '' : '<p class="ev-lieu">' + esc(ev.lieu || 'Lieu à préciser') + '</p>' + (ev.description ? '<p class="ev-desc">' + esc(ev.description) + '</p>' : ''))
        + '<ul class="ev-chiffres"><li>' + esc(libPrix(ev)) + '</li><li>' + esc(libPlaces(ev)) + '</li>' + (billetterie(ev) ? '<li>Montant : <b>' + euros(m) + '</b></li>' : '') + '</ul>'
        + (gere && n ? '<details><summary>Réservations (' + n + ')</summary><ul class="ev-resa">' + ev.reservations.map(function (r) { return '<li>' + esc(r.nom) + ' · ' + (parseInt(r.nb, 10) || 0) + ' place' + (r.nb > 1 ? 's' : '') + '</li>'; }).join('') + '</ul></details>' : '')
        + '</div><div class="geste"><span class="etat pastille ' + (ev.club ? 'ok">Publié par le club sur Facebook' : ev.ex ? 'ok">Exemple, publié sur le site' : ev.publie ? 'ok">Publié sur le site' : 'attente">Brouillon, non publié') + '</span>'
        + (gere && !ev.club && !ev.ex ? '<button type="button" class="bouton ' + (ev.publie ? 'ligne ' : '') + 'petit" data-publier-ev="' + esc(ev.id) + '">' + (ev.publie ? 'Dépublier' : 'Publier') + '<span class="visuellement-cache"> : ' + esc(ev.titre) + '</span></button>' : '')
        + '</div></li>';
    }).join('') || '<li><div class="ev-corps"><p>Aucun événement pour l\'instant.</p></div></li>';
  }
  liste.addEventListener('click', function (e) {
    var b = e.target.closest('[data-publier-ev]'); if (!b) return;
    var id = b.getAttribute('data-publier-ev'), l = evenements(), ev = l.filter(function (x) { return x.id === id; })[0]; if (!ev) return;
    ev.publie = !ev.publie; ecrire('bcr-evenements', l); rendreEvenements();
    annoncer('ev-etat', 'Simulation : « ' + ev.titre + ' » ' + (ev.publie ? 'publié : il apparaît sur la page Événements du site.' : 'dépublié : il n\'apparaît plus sur la page Événements du site.'));
    var nb = liste.querySelector('[data-publier-ev="' + id + '"]'); if (nb) nb.focus();
  });

  /* Formulaire « Ajouter un événement » (président et secrétaire). */
  var f = document.getElementById('form-ev'), bt = document.getElementById('ajouter-ev');
  function champ(i) { return document.getElementById(i); }
  function majCases() {
    champ('ev-prix').disabled = champ('ev-gratuit').checked;
    champ('ev-places').disabled = champ('ev-illimite').checked;
  }
  function ouvrir(o) {
    f.hidden = !o; bt.setAttribute('aria-expanded', String(o));
    if (o) { f.reset(); majCases(); champ('ev-erreur').textContent = ''; champ('ev-form-titre').focus(); }
  }
  bt.addEventListener('click', function () { ouvrir(f.hidden); });
  champ('ev-annuler').addEventListener('click', function () { ouvrir(false); bt.focus(); });
  champ('ev-gratuit').addEventListener('change', majCases);
  champ('ev-illimite').addEventListener('change', majCases);
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = champ('ev-erreur'), v = function (i) { return champ(i).value.trim(); };
    ['ev-titre', 'ev-date', 'ev-prix', 'ev-places'].forEach(function (i) { champ(i).removeAttribute('aria-invalid'); });
    function refus(i, t) { champ(i).setAttribute('aria-invalid', 'true'); err.textContent = t; champ(i).focus(); }
    if (!v('ev-titre')) return refus('ev-titre', 'Indiquez le titre de l\'événement.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v('ev-date'))) return refus('ev-date', 'Choisissez la date de l\'événement.');
    var prix = 0, places = null;
    if (!champ('ev-gratuit').checked) {
      prix = parseFloat(v('ev-prix').replace(',', '.'));
      if (!(prix > 0) || prix > 1000) return refus('ev-prix', 'Indiquez le prix d\'une place en euros, ou cochez « Gratuit ».');
      prix = Math.round(prix * 100) / 100;
    }
    if (!champ('ev-illimite').checked) {
      places = parseInt(v('ev-places'), 10);
      if (!(places >= 1) || places > 100000 || String(places) !== v('ev-places')) return refus('ev-places', 'Indiquez le nombre de places (un nombre entier), ou cochez « Sans limite de places ».');
    }
    err.textContent = '';
    var ev = { id: 'ev' + Date.now(), titre: v('ev-titre'), date: v('ev-date'), heure: v('ev-heure'), lieu: v('ev-lieu'), prix: prix, places: places,
      description: v('ev-desc'), publie: champ('ev-publier').checked, reservations: [], ex: false };
    var l = evenements(); l.push(ev); ecrire('bcr-evenements', l);
    ouvrir(false); rendreEvenements();
    annoncer('ev-etat', 'Simulation : événement « ' + ev.titre + ' » ajouté pour le ' + dateFr(ev.date).toLowerCase() + (ev.publie ? ', publié sur la page Événements du site.' : ', en brouillon : il sera visible sur le site une fois publié.'));
    var li = document.getElementById('ev-' + ev.id); if (li) { li.classList.add('nouvelle'); li.setAttribute('tabindex', '-1'); li.focus(); }
  });

  document.addEventListener('bcr:role', function () { champ('ev-etat').hidden = true; if (!f.hidden) ouvrir(false); rendreEvenements(); rendreBenevoles(); });
  window.addEventListener('pageshow', function () { rendreEvenements(); rendreBenevoles(); });
  rendreEvenements(); rendreBenevoles();
})();
