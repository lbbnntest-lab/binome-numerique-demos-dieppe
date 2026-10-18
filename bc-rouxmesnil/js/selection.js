/* Indisponibilités et convocations : données partagées entre l'espace licenciés et l'espace dirigeants
   le temps de la visite (sessionStorage de l'onglet). Lié uniquement depuis licencies.html et dirigeants.html.
   Rien n'est envoyé : sur le vrai site, ces données seraient sur le serveur du club. */
(function () {
  'use strict';
  /* Indisponibilités d'exemple de Léa (U15 F) : de simples dates, sans match associé. */
  var EXEMPLES = [
    { id: 'ex1', du: '2026-10-24', au: '2026-10-24', motif: 'Vacances', ex: true },
    { id: 'ex2', du: '2026-11-14', au: '2026-11-15', motif: 'Examen', ex: true }
  ];
  function lire(cle, defaut) { try { var v = sessionStorage.getItem(cle); return v ? JSON.parse(v) : defaut; } catch (e) { return defaut; } }
  function ecrire(cle, v) { try { sessionStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} }
  function dateFr(iso, sansJour) {
    if (!iso) return '';
    var d = new Date(iso.slice(0, 10) + 'T12:00');
    if (isNaN(d)) return iso;
    var t = d.toLocaleDateString('fr-FR', sansJour ? { day: 'numeric', month: 'long' } : { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  window.BCRSel = {
    lire: lire, ecrire: ecrire, dateFr: dateFr,
    plage: function (x) {
      if (!x.au || x.au === x.du) return dateFr(x.du);
      return 'Du ' + dateFr(x.du).toLowerCase() + ' au ' + dateFr(x.au).toLowerCase();
    },
    /* Liste des indisponibilités de Léa : les exemples tant que la famille ne les a pas retirés. */
    indispos: function () { var l = lire('bcr-indispos', null); if (!l) { l = EXEMPLES.slice(); ecrire('bcr-indispos', l); } return l; },
    enregistrerIndispos: function (l) { ecrire('bcr-indispos', l); },
    /* Indisponibilité qui couvre une date (AAAA-MM-JJ), ou null. */
    couvre: function (liste, date) {
      if (!date) return null;
      for (var i = 0; i < liste.length; i++) { var x = liste[i]; if (date >= x.du && date <= (x.au || x.du)) return x; }
      return null;
    },
    convocations: function () { return lire('bcr-convocations', []); },
    ajouterConvocation: function (c) { var l = lire('bcr-convocations', []).filter(function (x) { return x.id !== c.id; }); l.push(c); ecrire('bcr-convocations', l); },
    reponses: function () { return lire('bcr-reponses', {}); },
    repondre: function (id, valeur) { var r = lire('bcr-reponses', {}); r[id] = valeur; ecrire('bcr-reponses', r); }
  };
})();
