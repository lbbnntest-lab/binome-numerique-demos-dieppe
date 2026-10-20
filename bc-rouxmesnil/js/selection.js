/* Indisponibilités et convocations : données partagées entre l'espace licenciés et l'espace dirigeants
   le temps de la visite (sessionStorage de l'onglet). Lié depuis licencies.html, dirigeants.html et evenements.html
   (pour que les dates d'exemple restent à venir quel que soit le jour où la page est ouverte).
   Rien n'est envoyé : sur le vrai site, ces données seraient sur le serveur du club. */
(function () {
  'use strict';
  /* Prochain samedi (au moins demain), pour que les exemples de la démonstration restent à venir. */
  function isoJ(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function prochainSamedi(decalage) { var d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() !== 6) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + (decalage || 0)); return isoJ(d); }
  /* Indisponibilités d'exemple de Léa (U15 F) : de simples dates, sans match associé. */
  var EXEMPLES = [
    { id: 'ex1', du: prochainSamedi(), au: prochainSamedi(), motif: 'Vacances', ex: true },
    { id: 'ex2', du: prochainSamedi(14), au: prochainSamedi(15), motif: 'Examen', ex: true }
  ];
  /* Date du jour, en heure locale (AAAA-MM-JJ). */
  function aujourdhui() { return isoJ(new Date()); }
  /* Matchs amicaux d'exemple, communs à l'espace du coach (dirigeants.html) et à l'espace des familles : même date, même
     heure, même adversaire des deux côtés. Toujours à venir (prochain samedi, au moins demain). */
  var AMICAUX = [
    { equipe: 'u15', decalage: 0, heure: '14:00', dom: true },
    { equipe: 'u15', decalage: 7, heure: '11:00', dom: false },
    { equipe: 'u13', decalage: 0, heure: '10:30', dom: false },
    { equipe: 'u13m', decalage: 7, heure: '15:00', dom: false }
  ];
  function amicauxExemple(equipe) {
    return AMICAUX.filter(function (m) { return m.equipe === equipe; }).map(function (m) {
      return { equipe: m.equipe, date: prochainSamedi(m.decalage), heure: m.heure, dom: m.dom, adv: 'une équipe à confirmer', ex: true };
    });
  }
  /* Événement d'exemple de la billetterie : « Tournoi des jeunes (exemple) », publié, dans trois samedis. Il est écrit dans
     « bcr-evenements » (le même magasin que les événements créés par les dirigeants) quand il n'y est pas encore, pour que la
     page publique des événements puisse le réserver et que l'espace dirigeants voie les réservations. Appelé par
     js/billetterie.js et js/evenements.js. « Remettre la démonstration à zéro » l'efface : il revient au chargement suivant. */
  function amorcerEvenements() {
    try {
      var l = JSON.parse(sessionStorage.getItem('bcr-evenements') || '[]'); if (!Array.isArray(l)) l = [];
      if (l.some(function (e) { return e && e.id === 'ev-exemple-tournoi'; })) return;
      l.push({ id: 'ev-exemple-tournoi', titre: 'Tournoi des jeunes (exemple)', date: prochainSamedi(21), heure: '14 h',
        lieu: 'Salle Alexandre-Cheruel, Rouxmesnil-Bouteilles', prix: 2, places: 150,
        description: 'Événement d\'exemple pour montrer la billetterie : la date, le prix et le nombre de places seraient fixés par le club.',
        publie: true, reservations: [{ nom: 'Famille B.', nb: 3 }, { nom: 'Famille D.', nb: 2 }, { nom: 'Famille M.', nb: 4 }], ex: true });
      sessionStorage.setItem('bcr-evenements', JSON.stringify(l));
    } catch (e) {}
  }
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
    lire: lire, ecrire: ecrire, dateFr: dateFr, prochainSamedi: prochainSamedi, aujourdhui: aujourdhui, amicauxExemple: amicauxExemple, amorcerEvenements: amorcerEvenements,
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
