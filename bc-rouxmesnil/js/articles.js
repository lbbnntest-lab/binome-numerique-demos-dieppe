/* Articles sur la vie du club (démonstration). Lié depuis vie-du-club.html, index.html (bloc « dernier article ») et dirigeants.html (formulaire).
   - Un dirigeant met une photo (facultative) et trois lignes ; un texte propre est préparé À PARTIR DE CES LIGNES (aucun appel extérieur,
     aucun outil de rédaction dans la maquette) ; il le corrige et le publie : l'article paraît tout de suite sur le site (simulé).
   - Les articles publiés pendant la visite sont gardés dans l'onglet (sessionStorage, clé « bcr-articles ») : un rechargement les garde,
     « Remettre la démonstration à zéro » les efface. La photo reste dans la page (réduite, jamais envoyée).
   - L'article de départ est une vraie annonce du club (journée d'initiation à l'arbitrage du 21 octobre) : faits de faits_verifies_bcr.md seulement. */
(function () {
  'use strict';
  function lire(c, d) { try { var v = sessionStorage.getItem(c); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrire(c, v) { try { sessionStorage.setItem(c, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dateFr(iso) {
    var d = new Date(iso + 'T12:00'); if (isNaN(d)) return '';
    var t = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function aujourdhui() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /* Article réel de départ : ce que la publication du club annonçait, rien de plus (ni bilan, ni nombre de participants, ni citation). */
  var REEL = {
    id: 'arbitrage', reel: true, date: '2026-10-21',
    titre: 'Une journée d\'initiation à l\'arbitrage à la salle Alexandre-Cheruel',
    image: 'img/salle-cheruel-vert.webp', imageAlt: 'La salle Alexandre-Cheruel, à Rouxmesnil-Bouteilles',
    corps: 'Le mercredi 21 octobre, de 10 h à 16 h 30, la salle Alexandre-Cheruel accueillait une journée d\'initiation à l\'arbitrage.\n\n'
      + 'Elle était proposée par la Ligue de Normandie et le comité de Seine-Maritime, et accueillie par le Basket Club de Rouxmesnil.\n\n'
      + 'Elle s\'adressait aux licenciés de U13 à seniors, filles et garçons, et elle était ouverte aux autres clubs.'
  };

  function liste() { var l = lire('bcr-articles', []); return (Array.isArray(l) ? l : []).slice().reverse().concat([REEL]); }
  function paragraphes(t) {
    return String(t).split(/\n{2,}/).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function carte(a, titreNiveau) {
    var h = titreNiveau || 2;
    return '<article class="art" id="art-' + esc(a.id) + '" aria-labelledby="art-' + esc(a.id) + '-t">'
      + '<p class="art-meta"><time datetime="' + esc(a.date) + '">' + esc(dateFr(a.date)) + '</time>'
      + (a.reel ? ' <span class="art-etiq">Texte préparé d\'après l\'annonce du club, à relire par le club</span>' : ' <span class="art-etiq">Publié pendant la démonstration</span>') + '</p>'
      + '<h' + h + ' id="art-' + esc(a.id) + '-t">' + esc(a.titre) + '</h' + h + '>'
      + (a.photo ? '<figure class="art-photo"><img src="' + a.photo + '" alt="Photo jointe à l\'article"></figure>'
        : a.image ? '<figure class="art-photo"><img src="' + esc(a.image) + '" alt="' + esc(a.imageAlt || '') + '" loading="lazy"></figure>' : '')
      + '<div class="art-corps">' + paragraphes(a.corps) + '</div></article>';
  }

  /* ---------- Page « Vie du club » ---------- */
  var page = document.getElementById('vie-articles');
  if (page) page.innerHTML = liste().map(function (a) { return carte(a, 2); }).join('');

  /* ---------- Accueil : dernier article ---------- */
  var dernier = document.getElementById('dernier-article');
  if (dernier) {
    var a = liste()[0], premier = String(a.corps).split(/\n{2,}/)[0];
    if (premier.length > 230) premier = premier.slice(0, 230).replace(/\s+\S*$/, '') + '…';
    dernier.innerHTML = '<p class="art-meta">Dernier article · <time datetime="' + esc(a.date) + '">' + esc(dateFr(a.date)) + '</time></p>'
      + '<h3>' + esc(a.titre) + '</h3><p>' + esc(premier) + '</p><a class="s-bouton creux" href="vie-du-club.html#art-' + esc(a.id) + '">Lire l\'article</a>';
  }

  /* ---------- Espace dirigeants : « Publier un article » ---------- */
  var form = document.getElementById('pa-form');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var l1 = $('pa-l1'), l2 = $('pa-l2'), l3 = $('pa-l3'), fichier = $('pa-photo'), accord = $('pa-accord'), accordBloc = $('pa-accord-bloc');
  var erreur = $('pa-erreur'), apercu = $('pa-apercu'), propose = $('pa-propose'), titre = $('pa-titre'), corps = $('pa-corps'), etat = $('pa-etat'), btnPublier = $('pa-publier');
  var photo = '';
  function annoncer(t) { etat.hidden = false; etat.textContent = ''; setTimeout(function () { etat.textContent = t; }, 60); }
  function marquerFaux(champs, msg) {
    [l1, l2, l3, fichier, accord, titre, corps].forEach(function (c) { c.removeAttribute('aria-invalid'); });
    champs.forEach(function (c) { c.setAttribute('aria-invalid', 'true'); });
    erreur.textContent = msg; if (champs[0]) champs[0].focus();
  }
  function effacerErreur() { erreur.textContent = ''; [l1, l2, l3, fichier, accord, titre, corps].forEach(function (c) { c.removeAttribute('aria-invalid'); }); }

  /* Texte propre à partir des lignes saisies : majuscule, point final, espaces nettoyés. Rien n'est ajouté qui ne soit dans les lignes. */
  function phrase(t) {
    t = t.replace(/\s+/g, ' ').trim(); if (!t) return '';
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return /[.!?…]$/.test(t) ? t : t + '.';
  }
  function titreDe(t) {
    t = t.replace(/\s+/g, ' ').trim().replace(/[.!?…:;,\s]+$/, ''); t = t.charAt(0).toUpperCase() + t.slice(1);
    if (t.length <= 70) return t;
    return t.slice(0, 70).replace(/\s+\S*$/, '').replace(/[.,;:\s]+$/, '');
  }
  /* Exemples à essayer d'un clic (faits de faits_verifies_bcr.md). Sur le vrai site, l'outil de rédaction écrit l'article à partir
     des trois lignes ; ici rien n'est envoyé, donc le texte de ces exemples est déjà rédigé comme le fera l'outil. Si une ligne est
     modifiée, on revient au texte simple ci-dessous. */
  var EXEMPLES = {
    stage: { l1: 'Stage des vacances d\'octobre pour les U11, les U13 et les U15', l2: 'Lundi 19, mardi 20 et jeudi 22 octobre, de 10 h à 16 h 30', l3: 'Merci aux coachs et aux bénévoles',
      titre: 'Trois journées de stage pendant les vacances d\'octobre',
      corps: 'Pendant les vacances d\'octobre, le club a ouvert ses portes pour trois journées de stage : le lundi 19 pour les U11, le mardi 20 pour les U13 et le jeudi 22 pour les U15, de 10 h à 16 h 30.\n\n'
        + 'Une journée entière de basket, avec le pique-nique le midi et le goûter offert en fin de journée.\n\n'
        + 'Merci aux coachs et aux bénévoles qui ont rendu ces journées possibles. Le prochain stage sera annoncé ici, sur la page Vie du club.' },
    rose: { l1: 'Le club soutient Octobre rose', l2: 'Tout le mois d\'octobre, le logo du club passe en rose', l3: 'Merci à toutes celles et ceux qui portent le rose avec nous',
      titre: 'En octobre, le BCR voit la vie en rose',
      corps: 'Tout le mois d\'octobre, le Basket Club de Rouxmesnil soutient Octobre rose, la campagne de sensibilisation au dépistage du cancer du sein : le logo du club passe en rose.\n\n'
        + 'Merci à toutes celles et ceux qui portent le rose avec nous, à la salle comme en dehors.' }
  };
  var exempleEnCours = null;
  Array.prototype.forEach.call(document.querySelectorAll('[data-exemple]'), function (b) {
    b.addEventListener('click', function () {
      var ex = EXEMPLES[b.getAttribute('data-exemple')]; if (!ex) return;
      exempleEnCours = ex; l1.value = ex.l1; l2.value = ex.l2; l3.value = ex.l3; effacerErreur(); sauverBrouillon(false); l1.focus();
    });
  });
  function minusc(t) { return t ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
  function preparer() {
    var ex = exempleEnCours;
    if (ex && l1.value === ex.l1 && l2.value === ex.l2 && l3.value === ex.l3) { titre.value = ex.titre; corps.value = ex.corps; }
    else {
      var a = l1.value.replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/, ''), b = l2.value.replace(/\s+/g, ' ').trim();
      titre.value = titreDe(l1.value);
      corps.value = phrase(a + ' : ' + minusc(b)) + (l3.value.trim() ? '\n\n' + phrase(l3.value) : '') + '\n\nToute la vie du club est à retrouver sur cette page.';
    }
    propose.hidden = false; btnPublier.disabled = false;
    sauverBrouillon(true);
  }
  function sauverBrouillon(propose_) {
    ecrire('bcr-article-brouillon', { l1: l1.value, l2: l2.value, l3: l3.value, titre: titre.value, corps: corps.value, propose: !!propose_ });
  }
  var br = lire('bcr-article-brouillon', null);
  if (br) {
    l1.value = br.l1 || ''; l2.value = br.l2 || ''; l3.value = br.l3 || '';
    if (br.propose) { titre.value = br.titre || ''; corps.value = br.corps || ''; propose.hidden = false; btnPublier.disabled = false; }
  }
  [l1, l2, l3, titre, corps].forEach(function (c) { c.addEventListener('input', function () { sauverBrouillon(!propose.hidden); }); });

  /* Photo : réduite dans la page (largeur 900 px au plus), jamais envoyée. */
  function majAccord() { accordBloc.hidden = !photo; if (!photo) accord.checked = false; }
  fichier.addEventListener('change', function () {
    var f = fichier.files && fichier.files[0]; effacerErreur();
    if (!f) { photo = ''; apercu.hidden = true; majAccord(); return; }
    if (!/^image\//.test(f.type)) { fichier.value = ''; photo = ''; apercu.hidden = true; majAccord(); marquerFaux([fichier], 'Ce fichier n\'est pas une image. Choisissez une photo (JPEG, PNG ou WebP).'); return; }
    var lecteur = new FileReader();
    lecteur.onerror = function () { fichier.value = ''; marquerFaux([fichier], 'La photo n\'a pas pu être lue. Essayez-en une autre, ou publiez sans photo.'); };
    lecteur.onload = function () {
      var im = new Image();
      im.onerror = function () { fichier.value = ''; photo = ''; apercu.hidden = true; majAccord(); marquerFaux([fichier], 'La photo n\'a pas pu être ouverte. Essayez-en une autre, ou publiez sans photo.'); };
      im.onload = function () {
        var k = Math.min(1, 900 / im.width), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        photo = c.toDataURL('image/jpeg', 0.72);
        apercu.querySelector('img').src = photo; apercu.hidden = false; majAccord();
      };
      im.src = lecteur.result;
    };
    lecteur.readAsDataURL(f);
  });
  $('pa-retirer-photo').addEventListener('click', function () { fichier.value = ''; photo = ''; apercu.hidden = true; majAccord(); fichier.focus(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault(); effacerErreur();
    if (!l1.value.trim() && !l2.value.trim()) { marquerFaux([l1, l2], 'Écrivez au moins les deux premières lignes : ce qui s\'est passé, puis quand et où.'); return; }
    if (!l1.value.trim()) { marquerFaux([l1], 'Écrivez la première ligne : ce qui s\'est passé.'); return; }
    if (!l2.value.trim()) { marquerFaux([l2], 'Écrivez la deuxième ligne : quand et où.'); return; }
    if (photo && !accord.checked) { marquerFaux([accord], 'Cochez l\'accord des personnes photographiées (ou de leurs parents) pour joindre la photo, ou retirez la photo.'); return; }
    preparer();
    annoncer('Texte proposé. Relisez-le, corrigez-le si vous voulez, puis publiez.');
    titre.focus();
  });
  $('pa-modifier').addEventListener('click', function () { propose.hidden = true; btnPublier.disabled = true; sauverBrouillon(false); l1.focus(); });

  btnPublier.addEventListener('click', function () {
    effacerErreur();
    if (!titre.value.trim()) { marquerFaux([titre], 'Le titre est vide : écrivez-le avant de publier.'); return; }
    if (!corps.value.trim()) { marquerFaux([corps], 'Le texte est vide : écrivez-le avant de publier.'); return; }
    if (photo && !accord.checked) { marquerFaux([accord], 'Cochez l\'accord des personnes photographiées (ou de leurs parents), ou retirez la photo.'); return; }
    btnPublier.disabled = true;
    var l = lire('bcr-articles', []); if (!Array.isArray(l)) l = [];
    var art = { id: 'a' + Date.now(), titre: titre.value.trim(), corps: corps.value.trim(), photo: photo, date: aujourdhui() };
    l.push(art);
    var ok = ecrire('bcr-articles', l), sansPhoto = false;
    if (!ok && photo) { art.photo = ''; sansPhoto = true; ok = ecrire('bcr-articles', l); }
    if (!ok) {
      l.pop(); btnPublier.disabled = false;
      marquerFaux([titre], 'L\'article n\'a pas pu être gardé par cet appareil (la démonstration en a besoin). Rien n\'est publié ; essayez dans un onglet normal.'); return;
    }
    l1.value = ''; l2.value = ''; l3.value = ''; fichier.value = ''; photo = ''; apercu.hidden = true; majAccord();
    propose.hidden = true; ecrire('bcr-article-brouillon', null);
    etat.hidden = false; etat.textContent = '';
    setTimeout(function () {
      etat.innerHTML = 'Simulation : l\'article « ' + esc(art.titre) + ' » est publié sur le site' + (sansPhoto ? ', sans sa photo (trop lourde pour cette démonstration)' : '') + '. Rien n\'est envoyé. '
        + '<a href="vie-du-club.html#art-' + esc(art.id) + '">Voir la page Vie du club</a> · <a href="index.html#titre-vie">Voir l\'accueil</a>';
    }, 60);
    etat.setAttribute('tabindex', '-1'); etat.focus();
  });
  majAccord();
  if (/[?&]demo=article/.test(location.search)) setTimeout(function () { var s = document.getElementById('publier-article'); if (s) s.scrollIntoView({ block: 'start' }); }, 120);
})();
