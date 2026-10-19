/* Indisponibilités et convocations : données partagées entre l'espace licenciés et l'espace dirigeants
   le temps de la visite (sessionStorage de l'onglet). Lié uniquement depuis licencies.html et dirigeants.html.
   Rien n'est envoyé : sur le vrai site, ces données seraient sur le serveur du club. */
(function () {
  'use strict';
  /* Prochain samedi (au moins demain), pour que les exemples de la démonstration restent à venir. */
  function isoJ(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function prochainSamedi(decalage) { var d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() !== 6) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + (decalage || 0)); return isoJ(d); }
  /* Indisponibilités d'exemple de Léa (U15 F) : de simples dates, sans match associé. */
  var EXEMPLES = [
    { id: 'ex1', du: prochainSamedi(), au: prochainSamedi(), motif: 'Vacances', ex: true },
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
    lire: lire, ecrire: ecrire, dateFr: dateFr, prochainSamedi: prochainSamedi,
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
    /* Changement signalé par le coach pour un match (même identifiant que la convocation), ou null. */
    changement: function (id) { return lire('bcr-changements', []).filter(function (c) { return c.id === id; })[0] || null; },
    /* Avis aux familles, construit uniquement à partir de ce que le coach a saisi. */
    avisChangement: function (c) {
      var h = function (x) { return x ? x.replace(/^0/, '').replace(':00', ' h').replace(':', ' h ') : ''; };
      var m = 'Le match' + (c.amical ? ' amical' : '') + ' du ' + dateFr(c.date).toLowerCase() + ' contre ' + (c.adv || 'l\'adversaire');
      var p = c.statut === 'reporte' ? m + (c.nouvelleDate ? ' est reporté au ' + dateFr(c.nouvelleDate).toLowerCase() + (c.nouvelleHeure ? ', ' + h(c.nouvelleHeure) : '') + '.' : ' est reporté ; la nouvelle date reste à fixer.')
        : c.statut === 'annule' ? m + ' est annulé.'
        : c.statut === 'forfait' ? m + ' n\'aura pas lieu (forfait).'
        : c.statut === 'horaire' ? m + ' change d\'horaire : début à ' + h(c.nouvelleHeure) + '.'
        : c.statut === 'salle' ? m + ' se jouera à : ' + c.salle + '.'
        : m + ' : ' + c.autre + '.';
      return p + (c.motif ? ' Motif : ' + c.motif + '.' : '');
    },
    convocations: function () { return lire('bcr-convocations', []); },
    ajouterConvocation: function (c) { var l = lire('bcr-convocations', []).filter(function (x) { return x.id !== c.id; }); l.push(c); ecrire('bcr-convocations', l); },
    reponses: function () { return lire('bcr-reponses', {}); },
    repondre: function (id, valeur) { var r = lire('bcr-reponses', {}); r[id] = valeur; ecrire('bcr-reponses', r); }
  };
})();
