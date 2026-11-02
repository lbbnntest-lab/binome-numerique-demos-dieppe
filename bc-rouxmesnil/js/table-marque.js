/* Table de marque : liste commune des postes des prochains matchs à domicile, lue par l'espace dirigeants
   (js/evenements.js, où le président organise qui tient la table) et par l'espace des familles (js/famille.js, où une
   famille prend un poste libre). Vrais matchs à domicile à venir (week-end des 7 et 8 novembre, horaires de la FFBB) ;
   postes et noms d'exemple. Tout est simulé : rien n'est envoyé.
   Clés de la visite (sessionStorage) :
   - bcr-benevoles : [{creneauId, nom}] postes pris par une famille depuis son espace ;
   - bcr-table-orga : {creneauId: nom} affectations du président ("" = poste remis à pourvoir) ;
   - bcr-table-postes : [{id, date, match, poste}] postes ajoutés par le président.
   Ordre de lecture : une réservation de famille, sinon l'affectation du président, sinon le nom d'exemple. */
(function () {
  'use strict';
  function lire(cle, d) { try { var v = sessionStorage.getItem(cle); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrire(cle, v) { try { sessionStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} }

  var CRENEAUX = [
    { id: 'tm-2026-11-07-dmu15-marqueur', date: '2026-11-07', heure: '13:30', match: 'U15 masculins (équipe 1) contre BC Offranville 2', poste: 'Marqueur', pris: null },
    { id: 'tm-2026-11-07-dmu15-chrono', date: '2026-11-07', heure: '13:30', match: 'U15 masculins (équipe 1) contre BC Offranville 2', poste: 'Chronométreur', pris: null },
    { id: 'tm-2026-11-07-dfu13-marqueur', date: '2026-11-07', heure: '14:00', match: 'U13 féminines contre AS Dieppe', poste: 'Marqueur', pris: null },
    { id: 'tm-2026-11-07-dfu13-chrono', date: '2026-11-07', heure: '14:00', match: 'U13 féminines contre AS Dieppe', poste: 'Chronométreur', pris: null },
    { id: 'tm-2026-11-07-rfu18-marqueur', date: '2026-11-07', heure: '15:15', match: 'U18 féminines (élite régionale) contre Cherbourg', poste: 'Marqueur', pris: 'Sophie D.' },
    { id: 'tm-2026-11-07-rfu18-chrono', date: '2026-11-07', heure: '15:15', match: 'U18 féminines (élite régionale) contre Cherbourg', poste: 'Chronométreur', pris: null },
    { id: 'tm-2026-11-07-dfu15-marqueur', date: '2026-11-07', heure: '17:00', match: 'U15 féminines contre US Bacqueville', poste: 'Marqueur', pris: null },
    { id: 'tm-2026-11-07-dfu15-chrono', date: '2026-11-07', heure: '17:00', match: 'U15 féminines contre US Bacqueville', poste: 'Chronométreur', pris: 'Nadia B.' },
    { id: 'tm-2026-11-08-dm6-marqueur', date: '2026-11-08', heure: '08:00', match: 'Seniors masculins (D6) contre CEP Saint-Nicolas-d\'Aliermont', poste: 'Marqueur', pris: null },
    { id: 'tm-2026-11-08-dm6-chrono', date: '2026-11-08', heure: '08:00', match: 'Seniors masculins (D6) contre CEP Saint-Nicolas-d\'Aliermont', poste: 'Chronométreur', pris: null },
    { id: 'tm-2026-11-08-prm-marqueur', date: '2026-11-08', heure: '09:45', match: 'Seniors masculins (pré-régionale) contre AS Couronne', poste: 'Marqueur', pris: 'Thomas R.' },
    { id: 'tm-2026-11-08-prm-chrono', date: '2026-11-08', heure: '09:45', match: 'Seniors masculins (pré-régionale) contre AS Couronne', poste: 'Chronométreur', pris: null },
    { id: 'tm-2026-11-08-dm3-marqueur', date: '2026-11-08', heure: '11:15', match: 'Seniors masculins (D3) contre CBPQ', poste: 'Marqueur', pris: null },
    { id: 'tm-2026-11-08-dm3-chrono', date: '2026-11-08', heure: '11:15', match: 'Seniors masculins (D3) contre CBPQ', poste: 'Chronométreur', pris: null },
    { id: 'tm-2026-11-08-rm3-marqueur', date: '2026-11-08', heure: '14:00', match: 'Seniors masculins (régionale 3) contre Rouen Métropole 5', poste: 'Marqueur', pris: null },
    { id: 'tm-2026-11-08-rm3-chrono', date: '2026-11-08', heure: '14:00', match: 'Seniors masculins (régionale 3) contre Rouen Métropole 5', poste: 'Chronométreur', pris: 'Thomas R.' },
    { id: 'tm-2026-11-08-rf2-marqueur', date: '2026-11-08', heure: '16:00', match: 'Seniors féminines (régionale 2) contre Évreux AC', poste: 'Marqueur', pris: 'Julie M.' },
    { id: 'tm-2026-11-08-rf2-chrono', date: '2026-11-08', heure: '16:00', match: 'Seniors féminines (régionale 2) contre Évreux AC', poste: 'Chronométreur', pris: null }
  ];
  /* Licenciés inscrits pour tenir la table (noms d'exemple) : leur équipe et les postes qu'ils savent tenir.
     Le président, ou une personne qu'il autorise, coche qui tient chaque poste parmi eux. */
  var INSCRITS = [
    { nom: 'Sophie D.', equipe: 'Seniors féminines', postes: ['Marqueur', 'Chronométreur'] },
    { nom: 'Thomas R.', equipe: 'Seniors masculins', postes: ['Marqueur', 'Chronométreur', 'Opérateur des 24 secondes'] },
    { nom: 'Julie M.', equipe: 'Seniors féminines', postes: ['Marqueur'] },
    { nom: 'Nadia B.', equipe: 'U18 féminines', postes: ['Chronométreur', 'Aide-marqueur'] },
    { nom: 'Léa B.', equipe: 'U15 féminines', postes: ['Chronométreur', 'Aide-marqueur'] },
    { nom: 'Hugo L.', equipe: 'U18 masculins', postes: ['Chronométreur', 'Opérateur des 24 secondes'] },
    { nom: 'Inès K.', equipe: 'U18 féminines', postes: ['Marqueur', 'Aide-marqueur'] },
    { nom: 'Maxime P.', equipe: 'Seniors masculins', postes: ['Marqueur', 'Chronométreur'] }
  ];
  var BENEVOLES = INSCRITS.map(function (p) { return p.nom; });
  /* Qui peut tenir ce poste : ceux qui l'ont dans leur liste ; un poste ajouté par le président est ouvert à tous. */
  function peutTenir(p, poste) { return p.postes.indexOf(poste) >= 0 || ['Marqueur', 'Chronométreur', 'Aide-marqueur', 'Opérateur des 24 secondes'].indexOf(poste) < 0; }
  var SUGGESTIONS = ['Aide-marqueur', 'Opérateur des 24 secondes', 'Responsable de salle'];

  /* Créneaux du prochain week-end de matchs, calculés chaque jour à partir du calendrier FFBB (js/donnees-ffbb.js) :
     tous les matchs à domicile du samedi et du dimanche qui suivent la date du jour (?aujourdhui=AAAA-MM-JJ pour tester).
     Sans ces données, la liste ci-dessus sert de secours. Noms déjà placés : exemples, toujours aux mêmes postes. */
  var LIBELLES = { rm3: 'Seniors masculins (régionale 3)', prm: 'Seniors masculins (pré-régionale)', dm3: 'Seniors masculins (D3)', dm6: 'Seniors masculins (D6)',
    rf2: 'Seniors féminines (régionale 2)', df2: 'Seniors féminines (D2)', df3: 'Seniors féminines (D3)', u21: 'U21 masculins', u18f1: 'U18 féminines (élite régionale)',
    dfu18: 'U18 féminines (départementale)', dmu18a: 'U18 masculins (équipe 1)', dmu18b: 'U18 masculins (équipe 2)', dmu18c: 'U18 masculins (équipe 3)',
    u15f: 'U15 féminines', dmu15a: 'U15 masculins (équipe 1)', dmu15b: 'U15 masculins (équipe 2)', u13f: 'U13 féminines', dmu13: 'U13 masculins', u11: 'U11 mixte' };
  function aujourdhui() {
    var q = /[?&]aujourdhui=(\d{4}-\d{2}-\d{2})/.exec(location.search); if (q) return q[1];
    var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  var calcules = null;
  function creneauxDuWeekEnd() {
    if (calcules) return calcules;
    var F = window.BCR_FFBB && window.BCR_FFBB.equipes; if (!F) return CRENEAUX;
    var auj = aujourdhui(), tous = [];
    Object.keys(F).forEach(function (id) { (F[id].matchs || []).forEach(function (m) {
      if (m.dom && !m.s && m.adv !== 'Exempt' && m.d.slice(0, 10) >= auj) tous.push({ id: id, m: m });
    }); });
    if (!tous.length) return (calcules = []);
    tous.sort(function (a, b) { return a.m.d.localeCompare(b.m.d); });
    /* Le week-end du premier match à domicile à venir : ce jour et le lendemain s'il s'agit d'un samedi. */
    var j0 = tous[0].m.d.slice(0, 10), d0 = new Date(j0 + 'T12:00'), d1 = new Date(d0.getTime() + (d0.getDay() === 6 ? 864e5 : 0));
    var fin = d1.getFullYear() + '-' + String(d1.getMonth() + 1).padStart(2, '0') + '-' + String(d1.getDate()).padStart(2, '0');
    var vus = {}, PRIS = ['Sophie D.', 'Thomas R.', 'Julie M.', 'Nadia B.', 'Maxime P.'], k = 0, out = [];
    tous.filter(function (x) { return x.m.d.slice(0, 10) <= fin; }).forEach(function (x) {
      var date = x.m.d.slice(0, 10), heure = x.m.d.length > 10 ? x.m.d.slice(11, 16) : '';
      var cle = date + x.m.adv; if (vus[cle]) return; vus[cle] = 1; /* un derby du club n'apparaît qu'une fois */
      var match = (LIBELLES[x.id] || x.id) + ' contre ' + x.m.adv;
      [['Marqueur', 'marqueur'], ['Chronométreur', 'chrono']].forEach(function (p) {
        out.push({ id: 'tm-' + date + '-' + x.id + '-' + p[1], date: date, heure: heure, match: match, poste: p[0], pris: (k++ % 3 === 0) ? PRIS[(k / 3 | 0) % PRIS.length] : null });
      });
    });
    return (calcules = out);
  }
  function postes() {
    var extra = lire('bcr-table-postes', []);
    return creneauxDuWeekEnd().concat(Array.isArray(extra) ? extra.filter(function (c) { return c && c.id && c.date && c.poste; }) : []);
  }
  /* Qui tient le poste : { nom, source: 'famille' | 'president' | 'exemple' } ou null s'il est à pourvoir. */
  function tenu(c) {
    var r = lire('bcr-benevoles', []).filter(function (x) { return x && x.creneauId === c.id; })[0];
    if (r) return { nom: r.nom, source: 'famille' };
    var o = lire('bcr-table-orga', {});
    if (Object.prototype.hasOwnProperty.call(o, c.id)) return o[c.id] ? { nom: o[c.id], source: 'president' } : null;
    return c.pris ? { nom: c.pris, source: 'exemple' } : null;
  }
  function affecter(id, nom) {
    var o = lire('bcr-table-orga', {}); o[id] = nom || ''; ecrire('bcr-table-orga', o);
    ecrire('bcr-benevoles', lire('bcr-benevoles', []).filter(function (x) { return x && x.creneauId !== id; }));
  }
  /* Une famille prend un poste : sa réservation remplace l'affectation du président. */
  function oublierAffectation(id) { var o = lire('bcr-table-orga', {}); delete o[id]; ecrire('bcr-table-orga', o); }
  function ajouterPoste(date, match, poste) {
    var l = lire('bcr-table-postes', []), id = 'tm-' + date + '-ajout-' + Date.now().toString(36);
    l.push({ id: id, date: date, match: match, poste: poste, ajoute: true }); ecrire('bcr-table-postes', l); return id;
  }
  function retirerPoste(id) {
    ecrire('bcr-table-postes', lire('bcr-table-postes', []).filter(function (c) { return c && c.id !== id; }));
    oublierAffectation(id);
    ecrire('bcr-benevoles', lire('bcr-benevoles', []).filter(function (x) { return x && x.creneauId !== id; }));
  }

  window.BCRTable = { postes: postes, tenu: tenu, affecter: affecter, oublierAffectation: oublierAffectation,
    ajouterPoste: ajouterPoste, retirerPoste: retirerPoste, BENEVOLES: BENEVOLES, INSCRITS: INSCRITS, peutTenir: peutTenir, SUGGESTIONS: SUGGESTIONS };
})();
