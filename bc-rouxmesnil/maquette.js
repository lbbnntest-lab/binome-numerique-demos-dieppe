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
    ['equipes.html','equipes','Équipes et résultats'],
    ['inscription.html','inscription','Inscriptions et stages'],
    ['boutique.html','boutique','Boutique'],
    ['videos.html','videos','Vidéos'],
    ['u18f.html','u18f','U18F élite'],
    ['licencies.html','licencies','Espace licenciés'],
    ['dirigeants.html','dirigeants','Espace dirigeants']
  ];
  var menu = liens.map(function(l, i){
    var n = (i < 9 ? '0' : '') + (i + 1);
    return '<li style="--i:'+i+'"><a href="'+l[0]+'"'+(l[1]===page?' aria-current="page"':'')+'><span class="num">'+n+'</span><span class="lib">'+l[2]+'</span></a></li>';
  }).join('');

  // Mode présentation : arrivé depuis la présentation (?explications), les encadrés d'explication s'affichent
  // et le restent pendant la visite ; sinon le site s'affiche tel que le verraient les familles.
  var expl = /[?&]explications/.test(location.search);
  try { if (expl) sessionStorage.setItem('bcr-expl', '1'); else expl = sessionStorage.getItem('bcr-expl') === '1'; } catch (e) {}
  var bandeau = '<div class="bandeau-maquette"><div class="wrap">'
    + (expl
      ? '<span><strong>Présentation</strong> : les encadrés jaunes expliquent ce que chaque page apporte au club.</span><span><button type="button" id="basculer-notes"></button> &nbsp;<a href="presentation/explications.html">Retour à la présentation</a></span>'
      : '<span><strong>Maquette</strong> du futur site du Basket Club de Rouxmesnil, réalisée par Le Binôme Numérique. Matchs, résultats, événements : informations publiées par le club et la FFBB. Les espaces licenciés et dirigeants montrent des données d\'exemple ; aucun paiement ni message n\'est envoyé.</span><span><a href="presentation/index.html">Voir la présentation</a></span>')
    + '</div></div>';

  var entete = '<header class="entete sig"><div class="wrap">'
    + '<a class="logo" href="index.html">'+BLASON+'<span>Basket Club<br>de Rouxmesnil<small>Passion, esprit d\'équipe, respect</small></span></a>'
    + '<div class="entete-actions"><a class="entete-insc" href="inscription.html">S\'inscrire</a>'
    + '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu-plein"><span class="menu-libelle">Menu</span><span class="menu-traits" aria-hidden="true"><span></span><span></span></span></button></div>'
    + '</div>'
    + '<nav id="menu-plein" class="menu-plein" aria-label="Menu principal" hidden><div class="wrap menu-grille">'
    + '<ul class="menu-liens">'+menu+'</ul>'
    + '<div class="menu-infos"><img src="img/logo-bcr.jpg" alt="" width="120" height="120"><p>Salle Alexandre-Cheruel<br>Rouxmesnil-Bouteilles</p><p>Passion, esprit d\'équipe, respect</p></div>'
    + '</div></nav></header>';

  var pied = '<footer class="pied"><div class="wrap">'
    + '<div><h3>Basket Club de Rouxmesnil</h3><p>Association loi 1901, affiliée à la Fédération française de basket-ball.<br>Salle Alexandre-Cheruel, Rouxmesnil-Bouteilles.</p></div>'
    + '<div><h3>Le club</h3><p><a href="equipes.html">Équipes et résultats</a><br><a href="inscription.html">S\'inscrire</a><br><a href="boutique.html">Boutique</a><br><a href="videos.html">Vidéos</a><br><a href="u18f.html">U18F élite</a><br><a href="index.html#partenaires">Devenir partenaire</a></p></div>'
    + '<div><h3>Contact</h3><p>Adresse email du club (à compléter)<br>Page Facebook : Basket Club Rouxmesnil</p></div>'
    + '<div class="bas"><span><a href="#">Mentions légales</a> &nbsp; <a href="#">Confidentialité</a></span>'
    + '<span class="signe-lbn">Site réalisé par <a href="https://lebinomenumerique.fr"><img src="img/lbn-clair.png" alt="" width="46" height="24">Le Binôme Numérique</a>, partenaire du club</span></div>'
    + '</div></footer>';

  document.body.insertAdjacentHTML('afterbegin', bandeau + entete);
  document.body.insertAdjacentHTML('beforeend', pied);

  // Menu plein écran : ouverture, fermeture par Échap, focus gardé dans le menu.
  var mb = document.querySelector('.menu-btn'), mp = document.getElementById('menu-plein');
  function ouvrirMenu(o){
    mb.setAttribute('aria-expanded', String(o));
    mb.querySelector('.menu-libelle').textContent = o ? 'Fermer' : 'Menu';
    document.documentElement.classList.toggle('menu-ouvert', o);
    if (o) { mp.hidden = false; requestAnimationFrame(function(){ mp.classList.add('ouvert'); }); var p = mp.querySelector('a'); if (p) p.focus({preventScroll:true}); }
    else { mp.classList.remove('ouvert'); setTimeout(function(){ if (mb.getAttribute('aria-expanded')==='false') mp.hidden = true; }, 450); }
  }
  mb.addEventListener('click', function(){ ouvrirMenu(mb.getAttribute('aria-expanded')!=='true'); });
  document.addEventListener('keydown', function(e){
    if (mb.getAttribute('aria-expanded')!=='true') return;
    if (e.key==='Escape') { ouvrirMenu(false); mb.focus(); }
    if (e.key==='Tab') {
      var c = [mb].concat(Array.prototype.slice.call(mp.querySelectorAll('a')));
      var i = c.indexOf(document.activeElement);
      if (e.shiftKey && i<=0) { e.preventDefault(); c[c.length-1].focus(); }
      else if (!e.shiftKey && i===c.length-1) { e.preventDefault(); c[0].focus(); }
    }
  });

  if (expl) {
    var bt = document.getElementById('basculer-notes'), vis = true;
    var maj = function(){ document.body.classList.toggle('explications', vis); bt.textContent = vis ? 'Masquer les explications' : 'Afficher les explications'; bt.setAttribute('aria-pressed', String(vis)); };
    bt.addEventListener('click', function(){ vis = !vis; maj(); });
    maj();
  }

  // Apparition douce des blocs au défilement (désactivée si l'appareil demande moins d'animations).
  var blocs = document.querySelectorAll('.revele');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function(entrees){
      entrees.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('vu'); obs.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -8% 0px'});
    blocs.forEach(function(b){ obs.observe(b); });
  } else { blocs.forEach(function(b){ b.classList.add('vu'); }); }
})();
