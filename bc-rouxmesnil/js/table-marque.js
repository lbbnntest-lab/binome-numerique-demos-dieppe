/* Table de marque : liste commune des postes des prochains matchs à domicile, lue par l'espace dirigeants
   (js/evenements.js, où le président organise qui tient la table) et par l'espace des familles (js/famille.js, où une
   famille prend un poste libre). Vrais matchs à domicile à venir (élite régionale U18 F, horaires non fixés) ;
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
    { id: 'tm-2026-11-07-marqueur', date: '2026-11-07', match: 'U18 féminines (RFU18) contre Cherbourg Basket Ball', poste: 'Marqueur', pris: 'Sophie D.' },
    { id: 'tm-2026-11-07-chrono', date: '2026-11-07', match: 'U18 féminines (RFU18) contre Cherbourg Basket Ball', poste: 'Chronométreur', pris: null },
    { id: 'tm-2026-11-21-marqueur', date: '2026-11-21', match: 'U18 féminines (RFU18) contre USO Mondeville Basket 2', poste: 'Marqueur', pris: null },
    { id: 'tm-2026-11-21-chrono', date: '2026-11-21', match: 'U18 féminines (RFU18) contre USO Mondeville Basket 2', poste: 'Chronométreur', pris: 'Thomas R.' }
  ];
  /* Personnes qui ont déjà tenu la table (noms d'exemple). */
  var BENEVOLES = ['Sophie D.', 'Thomas R.', 'Julie M.', 'Nadia B.', 'Famille B.'];
  var SUGGESTIONS = ['Aide-marqueur', 'Opérateur des 24 secondes', 'Responsable de salle'];

  function postes() {
    var extra = lire('bcr-table-postes', []);
    return CRENEAUX.concat(Array.isArray(extra) ? extra.filter(function (c) { return c && c.id && c.date && c.poste; }) : []);
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
    ajouterPoste: ajouterPoste, retirerPoste: retirerPoste, BENEVOLES: BENEVOLES, SUGGESTIONS: SUGGESTIONS };
})();
