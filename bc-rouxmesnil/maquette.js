// Éléments communs de la maquette : bandeau, en-tête, pied de page, tracés du terrain.
(function(){
  document.documentElement.classList.add('js');
  var page = document.body.getAttribute('data-page') || '';

  var TERRAIN = '<svg class="terrain" viewBox="0 0 280 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" fill="none" stroke="#fff" stroke-width="1.2">'
    + '<rect x="4" y="4" width="272" height="142"/>'
    + '<line x1="140" y1="4" x2="140" y2="146"/>'
    + '<circle cx="140" cy="75" r="18"/>'
    + '<rect x="4" y="50" width="58" height="50"/><circle cx="62" cy="75" r="18"/>'
    + '<path d="M4 16 H22 A66 66 0 0 1 22 134 H4"/>'
    + '<rect x="218" y="50" width="58" height="50"/><circle cx="218" cy="75" r="18"/>'
    + '<path d="M276 16 H258 A66 66 0 0 0 258 134 H276"/>'
    + '</svg>';
  document.querySelectorAll('[data-terrain]').forEach(function(el){ el.insertAdjacentHTML('afterbegin', TERRAIN); });

  var BLASON = '<img src="img/logo-bcr.jpg" alt="" width="54" height="54">';

  var liens = [
    ['index.html','accueil','Le club'],
    ['inscription.html','inscription','Inscriptions'],
    ['boutique.html','boutique','Boutique'],
    ['videos.html','videos','Vidéos'],
    ['reseaux.html','reseaux','Réseaux'],
    ['u18f.html','u18f','U18F élite'],
    ['licencies.html','licencies','Licenciés'],
    ['dirigeants.html','dirigeants','Dirigeants']
  ];
  var menu = liens.map(function(l){
    return '<li><a href="'+l[0]+'"'+(l[1]===page?' aria-current="page"':'')+'>'+l[2]+'</a></li>';
  }).join('');

  var bandeau = '<div class="bandeau-maquette"><div class="wrap">'
    + '<span><strong>Maquette</strong> proposée au Basket Club de Rouxmesnil par Le Binôme Numérique. Logo, photos et matchs viennent de la page Facebook du club ; les noms de licenciés, les prix et les chiffres sont des exemples.</span>'
    + '<span><button type="button" id="basculer-notes"></button> &nbsp;<a href="proposition.html">Lire la proposition</a></span>'
    + '</div></div>';

  var entete = '<header class="entete"><div class="wrap">'
    + '<a class="logo" href="index.html">'+BLASON+'<span>Basket Club<br>de Rouxmesnil<small>Passion, esprit d\'équipe, respect</small></span></a>'
    + '<nav aria-label="Menu principal"><ul class="menu">'+menu+'</ul></nav>'
    + '</div></header>';

  var pied = '<footer class="pied"><div class="wrap">'
    + '<div><h3>Basket Club de Rouxmesnil</h3><p>Association loi 1901, affiliée à la Fédération française de basket-ball.<br>Salle Alexandre-Cheruel, Rouxmesnil-Bouteilles.</p></div>'
    + '<div><h3>Le club</h3><p><a href="inscription.html">S\'inscrire</a><br><a href="boutique.html">Boutique</a><br><a href="videos.html">Vidéos</a><br><a href="u18f.html">U18F élite</a><br><a href="index.html#partenaires">Devenir partenaire</a></p></div>'
    + '<div><h3>Contact</h3><p>Adresse email du club (à compléter)<br>Page Facebook : Basket Club Rouxmesnil</p></div>'
    + '<div class="bas"><span><a href="#">Mentions légales</a> &nbsp; <a href="#">Confidentialité</a></span>'
    + '<span>Site réalisé par <a href="https://lebinomenumerique.fr">Le Binôme Numérique</a>, partenaire du club</span></div>'
    + '</div></footer>';

  document.body.insertAdjacentHTML('afterbegin', bandeau + entete);
  document.body.insertAdjacentHTML('beforeend', pied);

  // Notes d'explication : affichées par défaut, le choix est retenu sur l'appareil.
  var actives = true;
  try { actives = localStorage.getItem('bcr-notes') !== 'non'; } catch(e) {}
  var bouton = document.getElementById('basculer-notes');
  function appliquer(){
    document.body.classList.toggle('explications', actives);
    bouton.textContent = actives ? 'Masquer les explications' : 'Afficher les explications';
    bouton.setAttribute('aria-pressed', actives ? 'true' : 'false');
  }
  bouton.addEventListener('click', function(){
    actives = !actives;
    try { localStorage.setItem('bcr-notes', actives ? 'oui' : 'non'); } catch(e) {}
    appliquer();
  });
  appliquer();

  // Apparition douce des blocs au défilement (désactivée si l'appareil demande moins d'animations).
  var blocs = document.querySelectorAll('.revele');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function(entrees){
      entrees.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('vu'); obs.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -8% 0px'});
    blocs.forEach(function(b){ obs.observe(b); });
  } else { blocs.forEach(function(b){ b.classList.add('vu'); }); }
})();
