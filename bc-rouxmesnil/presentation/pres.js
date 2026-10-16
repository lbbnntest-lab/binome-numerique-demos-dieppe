// Présentation au président : en-tête et pied propres à la proposition (distincts du site du club).
(function(){
  document.documentElement.classList.add('js');
  var page = document.body.getAttribute('data-page') || '';
  var TERRAIN = '<svg class="terrain" viewBox="0 0 280 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" fill="none" stroke="#fff" stroke-width="1.2">'
    + '<rect x="4" y="4" width="272" height="142"/><line x1="140" y1="4" x2="140" y2="146"/><circle cx="140" cy="75" r="18"/>'
    + '<rect x="4" y="50" width="58" height="50"/><circle cx="62" cy="75" r="18"/><path d="M4 16 H22 A66 66 0 0 1 22 134 H4"/>'
    + '<rect x="218" y="50" width="58" height="50"/><circle cx="218" cy="75" r="18"/><path d="M276 16 H258 A66 66 0 0 0 258 134 H276"/></svg>';
  document.querySelectorAll('[data-terrain]').forEach(function(el){ el.insertAdjacentHTML('afterbegin', TERRAIN); });
  var liens = [['index.html','p-proposition','La proposition'],['explications.html','p-explications','Page par page'],['boutique.html','p-boutique','Boutique et JAKO'],['reseaux.html','p-reseaux','Réseaux sociaux']];
  var nav = liens.map(function(l){ return '<a href="'+l[0]+'"'+(l[1]===page?' aria-current="page"':'')+'>'+l[2]+'</a>'; }).join('');
  var tete = '<header class="pres-tete"><div class="wrap">'
    + '<div class="pres-marque"><strong>Le Binôme Numérique</strong><span>Proposition au Basket Club de Rouxmesnil</span></div>'
    + '<nav aria-label="Présentation">'+nav+'<a class="pres-site" href="../index.html">Voir le site du club</a></nav>'
    + '</div></header>';
  var pied = '<footer class="pied"><div class="wrap"><div><h3>Le Binôme Numérique</h3><p>SASU · SIREN 130 286 610 · RCS Paris<br>Kyllian Lepaul · <a href="https://lebinomenumerique.fr">lebinomenumerique.fr</a></p></div>'
    + '<div><h3>Cette présentation</h3><p>Document de travail remis au bureau du BCR. Les montants définitifs figureront dans la proposition écrite.</p></div>'
    + '<div><h3>Le site du club</h3><p><a href="../index.html">Ouvrir la maquette du site</a></p></div></div></footer>';
  document.body.insertAdjacentHTML('afterbegin', tete);
  document.body.insertAdjacentHTML('beforeend', pied);
})();
