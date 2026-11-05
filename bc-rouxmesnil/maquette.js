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

  var BLASON = '<img src="img/logo-bcr-160.webp" alt="" width="54" height="54">';

  var liens = [
    ['index.html','accueil','Le club'],
    ['equipes.html','equipes','Équipes et résultats'],
    ['inscription.html','inscription','Inscriptions et stages'],
    ['boutique.html','boutique','Boutique'],
    ['videos.html','videos','Matchs en direct'],
    ['photos.html','photos','Photos et vidéos'],
    ['u18f.html','u18f','U18F élite'],
    ['licencies.html','licencies','Espace licenciés'],
    ['dirigeants.html','dirigeants','Espace dirigeants'],
    ['medias.html','medias','Photos reçues (dirigeants)'],
    ['evenements.html','evenements','Événements'],
    ['vie-du-club.html','vie-du-club','Vie du club'],
    ['rejoindre.html','rejoindre','Rejoindre le club'],
    ['direct.html','direct','Score en direct (2e étape)'],
    ['partenaires.html','partenaires','Nos partenaires']
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
      ? '<span><strong>Présentation</strong> : les encadrés jaunes expliquent ce que chaque page apporterait au club. Matchs et résultats sont réels ; ce qui est marqué « exemple » sert à montrer une fonction. Rien n’est enregistré ni envoyé.</span><span><button type="button" id="basculer-notes"></button> &nbsp;<button type="button" id="raz-demo">Remettre la démonstration à zéro</button> &nbsp;<a href="presentation/bureau.html" style="white-space:nowrap">Présentation au bureau</a> &nbsp;<a href="presentation/explications.html" style="white-space:nowrap">Voir la présentation</a></span>'
      : '<span><strong>Maquette</strong> du futur site du Basket Club de Rouxmesnil, réalisée par Le Binôme Numérique. Matchs, résultats, stage et arbitrage : publiés par le club et la FFBB. Noms, chiffres, vidéos et articles marqués « exemple » servent à montrer les fonctions ; aucun paiement ni message n\'est envoyé.</span><span><a href="presentation/index.html">Voir la présentation</a></span>')
    + '</div></div>';

  var entete = '<header class="entete sig"><div class="wrap">'
    + '<a class="logo" href="index.html">'+BLASON+'<span>Basket Club<br>de Rouxmesnil<small>Passion, esprit d\'équipe, respect</small></span></a>'
    + '<div class="entete-actions"><a class="entete-insc" href="index.html#week-end">Venir au match</a>'
    + '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu-plein"><span class="menu-libelle">Menu</span><span class="menu-traits" aria-hidden="true"><span></span><span></span></span></button></div>'
    + '</div>'
    + '<nav id="menu-plein" class="menu-plein" aria-label="Menu principal" hidden><div class="wrap menu-grille">'
    + '<ul class="menu-liens">'+menu+'</ul>'
    + '<div class="menu-infos"><img src="img/logo-bcr-240.webp" alt="" width="120" height="120" loading="lazy"><p>Salle Alexandre-Cheruel<br>Rouxmesnil-Bouteilles</p><p>Passion, esprit d\'équipe, respect</p></div>'
    + '</div></nav></header>';

  var pied = '<footer class="pied"><div class="wrap">'
    + '<div><p class="pied-marque"><img src="img/logo-bcr-160.webp" alt="" width="56" height="56" loading="lazy"><strong>Basket Club<br>de Rouxmesnil</strong></p><p>Club affilié à la Fédération française de basket-ball.<br>Salle Alexandre-Cheruel, Rouxmesnil-Bouteilles ; salle Charles-Lefebvre quand deux matchs ont lieu en même temps.</p></div>'
    + '<div><h3>Le club</h3><p><a href="equipes.html">Équipes et résultats</a><br><a href="vie-du-club.html">Vie du club</a><br><a href="inscription.html">S\'inscrire</a><br><a href="boutique.html">Boutique</a><br><a href="videos.html">Matchs en direct</a><br><a href="photos.html">Photos et vidéos</a><br><a href="u18f.html">U18F élite</a><br><a href="partenaires.html">Nos partenaires</a><br><a href="rejoindre.html">Rejoindre le club</a></p></div>'
    + '<div><h3>Contact</h3><p class="pied-contact"><a href="mailto:basketclubrouxmesnil@gmail.com"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>basketclubrouxmesnil@gmail.com</a><br>Page Facebook : Basket Club Rouxmesnil</p>'
    + '<h3 style="margin-top:18px">La salle</h3><p>Salle Alexandre-Cheruel<br>1200 rue des Salines, Rouxmesnil-Bouteilles<br><a href="index.html#venir">Venir à la salle</a></p></div>'
    + '<div class="bas"><span>© Basket Club de Rouxmesnil · <button type="button" class="pied-haut">Revenir en haut de la page</button></span>'
    + '<span class="signe-lbn">Maquette réalisée par <a href="https://lebinomenumerique.fr"><img src="img/lbn-clair.png" alt="" width="46" height="24">Le Binôme Numérique</a></span></div>'
    + '</div></footer>';

  var principal = document.querySelector('main');
  if (principal && !principal.id) principal.id = 'contenu';
  if (principal) principal.setAttribute('tabindex', '-1');
  document.body.insertAdjacentHTML('afterbegin', '<a class="evitement" href="#contenu">Aller au contenu</a>' + bandeau + entete);
  document.body.classList.add('haut-pose');   /* le contenu apparaît une fois le haut de page posé : rien ne saute (voir style.css) */
  // Remise à zéro de la démonstration : efface ce que la visite a saisi (convocations, demandes, scores…),
  // garde le mode présentation, puis recharge la page.
  var raz = document.getElementById('raz-demo');
  if (raz) raz.addEventListener('click', function(){
    try {
      for (var i = sessionStorage.length - 1; i >= 0; i--) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf('bcr-') === 0 && k !== 'bcr-expl') sessionStorage.removeItem(k);
      }
      localStorage.removeItem('bcr-direct');
      localStorage.removeItem('bcr-tableau');
    } catch (e) {}
    location.reload();
  });
  document.body.insertAdjacentHTML('beforeend', pied);

  // Menu plein écran : ouverture, fermeture par Échap, focus gardé dans le menu.
  var mb = document.querySelector('.menu-btn'), mp = document.getElementById('menu-plein');
  function ouvrirMenu(o){
    mb.setAttribute('aria-expanded', String(o));
    mb.querySelector('.menu-libelle').textContent = o ? 'Fermer' : 'Menu';
    document.documentElement.classList.toggle('menu-ouvert', o);
    if (o) { mp.hidden = false; requestAnimationFrame(function(){ mp.classList.add('ouvert'); }); var p = mp.querySelector('a'); if (p) p.focus({preventScroll:true}); }
    else { mp.classList.remove('ouvert'); setTimeout(function(){ if (mb.getAttribute('aria-expanded')==='false') mp.hidden = true; }, 500); }
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

  // Confort de visite : barre de lecture, en-tête qui se détache du contenu, bouton « haut de page »,
  // barre d'accès rapide sur téléphone (pages publiques). Tout est facultatif : sans script, la page reste complète.
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function enHaut(){
    window.scrollTo({ top: 0, behavior: reduit ? 'auto' : 'smooth' });
    var cible = document.querySelector('.entete .logo');
    if (cible) cible.focus({ preventScroll: true });
  }
  var tete = document.querySelector('.entete.sig');
  var prog = null;
  if (tete) { tete.insertAdjacentHTML('beforeend', '<span class="lecture-prog" aria-hidden="true"></span>'); prog = tete.querySelector('.lecture-prog'); }
  document.body.insertAdjacentHTML('beforeend', '<button type="button" class="haut-page" aria-label="Revenir en haut de la page" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>');
  var hp = document.querySelector('.haut-page');
  hp.addEventListener('click', enHaut);
  var ph = document.querySelector('.pied-haut'); if (ph) ph.addEventListener('click', enHaut);

  var PUBLIQUES = ['accueil','equipes','inscription','videos','photos','u18f','evenements','vie-du-club','rejoindre','partenaires'];
  var barre = null;
  if (PUBLIQUES.indexOf(page) >= 0) {
    var ic = {
      matchs: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
      salle: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
      res: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
      insc: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="8" r="4"/><path d="M2 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5M19 8v6M16 11h6"/></svg>'
    };
    var R = [['index.html#week-end','Matchs',ic.matchs,''],['index.html#venir','La salle',ic.salle,''],['equipes.html','Résultats',ic.res,'equipes'],['inscription.html',"S'inscrire",ic.insc,'inscription']];
    document.body.insertAdjacentHTML('beforeend', '<nav class="barre-rapide" aria-label="Accès rapide">' + R.map(function(r){
      return '<a href="' + r[0] + '"' + (r[3] && r[3] === page ? ' aria-current="page"' : '') + '>' + r[2] + '<span>' + r[1] + '</span></a>';
    }).join('') + '</nav>');
    barre = document.querySelector('.barre-rapide');
    document.body.classList.add('avec-barre');
    // La barre s'efface quand le pied de page arrive (il porte déjà tous les liens).
    var pf = document.querySelector('footer.pied');
    if (pf && 'IntersectionObserver' in window) new IntersectionObserver(function(e){ barre.classList.toggle('cachee', e[0].isIntersecting); }).observe(pf);
  }

  var attente = false;
  function surDefilement(){
    attente = false;
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    if (prog) prog.style.setProperty('--p', h > 0 ? Math.min(1, y / h).toFixed(4) : 0);
    if (tete) tete.classList.toggle('defile', y > 8);
    var montrer = y > window.innerHeight * 1.5;
    if (hp.classList.contains('visible') !== montrer) { hp.classList.toggle('visible', montrer); hp.tabIndex = montrer ? 0 : -1; }
  }
  window.addEventListener('scroll', function(){ if (!attente) { attente = true; requestAnimationFrame(surDefilement); } }, { passive: true });
  window.addEventListener('resize', surDefilement);
  surDefilement();
})();
