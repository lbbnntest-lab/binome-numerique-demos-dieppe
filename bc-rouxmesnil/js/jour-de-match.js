/* Accueil, mode « jour de match » : le jour d'un match à domicile, un bandeau s'ajoute en tête de l'accueil
   (le match, le lien vers le score en direct, l'accès à la salle). Matchs à domicile réels (élite régionale U18 F,
   calendrier FFBB, horaires non fixés). Pour le montrer avant la date : ?jour-de-match (prend le prochain match). */
(function () {
  'use strict';
  var MATCHS = [
    { date: '2026-11-07', match: 'U18 féminines contre Cherbourg Basket Ball' },
    { date: '2026-11-21', match: 'U18 féminines contre USO Mondeville Basket 2' }
  ];
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dateFr(s) { var t = new Date(s + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); return t; }
  var auj = iso(new Date()), demo = /[?&]jour-de-match\b/.test(location.search);
  var m = MATCHS.filter(function (x) { return x.date === auj; })[0];
  if (!m && demo) m = MATCHS.filter(function (x) { return x.date >= auj; })[0] || MATCHS[MATCHS.length - 1];
  if (!m) return;
  var tete = demo && m.date !== auj ? 'Démonstration : l\'accueil le ' + dateFr(m.date) : 'Aujourd\'hui à la salle Alexandre-Cheruel';
  var html = '<div class="jdm" role="region" aria-label="Jour de match"><div class="wrap">'
    + '<span class="jdm-badge">Jour de match</span>'
    + '<p><b>' + tete + '</b> : ' + m.match + ' · horaire à confirmer</p>'
    + '<span class="jdm-liens"><a class="s-bouton" href="direct.html">Suivre le score en direct</a><a class="s-bouton creux" href="#venir">Venir à la salle</a></span>'
    + '</div></div>';
  var main = document.querySelector('main');
  if (main) main.insertAdjacentHTML('afterbegin', html);
  document.documentElement.classList.add('jour-de-match');
})();
