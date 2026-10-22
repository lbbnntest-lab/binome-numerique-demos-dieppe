/* Espace dirigeants : « Qui s'occupe de quoi » et « Les accès » (démonstration).
   - Chaque bloc de la page porte data-domaine. Le président choisit pour chaque domaine « Le reprendre » ou « Je laisse à … » :
     un domaine laissé quitte sa page (blocs masqués) et reste listé ici, avec « Regarder quand même ».
   - Le président désigne au plus une personne qui gère les accès des autres ; cette personne voit alors la liste des accès.
   - Choix gardés dans l'onglet (sessionStorage), comme le reste de la démonstration. Rien n'est enregistré ni envoyé. */
(function () {
  'use strict';
  var DOMAINES = [
    ['equipes', 'Équipes et matchs', 'coach', 'les coachs', 'aux coachs', 'Convocations du week-end envoyées pour 3 équipes sur 4.'],
    ['secretariat', 'Inscriptions, licences et demandes', 'secretaire', 'Claire, secrétaire', 'à Claire', '39 licences en attente, 2 demandes de familles sans réponse.'],
    ['argent', 'Argent et comptabilité', 'tresorier', 'Marc, trésorier', 'à Marc', '24 cotisations en attente.'],
    ['evenements', 'Stages et événements', 'stages', 'Julie, responsable des stages', 'à Julie', 'Stage d\'octobre : 18 inscrits.'],
    ['benevoles', 'Table de marque et bénévoles', 'communication', 'Sophie, communication et bénévoles', 'à Sophie', '1 poste à pourvoir samedi.'],
    ['publications', 'Publications et photos', 'communication', 'Sophie, communication et bénévoles', 'à Sophie', '3 publications de fin de match prêtes.']
  ];
  var PERSONNES = [
    ['secretaire', 'Claire', 'Secrétaire'], ['tresorier', 'Marc', 'Trésorier'], ['stages', 'Julie', 'Responsable des stages'],
    ['communication', 'Sophie', 'Communication et bénévoles'], ['coach', 'Les coachs', 'Coachs des 4 équipes']
  ];
  function lire(cle, defaut) { try { var v = JSON.parse(sessionStorage.getItem(cle)); return v == null ? defaut : v; } catch (x) { return defaut; } }
  function ecrire(cle, v) { try { sessionStorage.setItem(cle, JSON.stringify(v)); } catch (x) {} }

  var laisses = lire('bcr-domaines-laisses', ['publications']);
  var regardes = [];
  var gestionnaire = lire('bcr-gere-acces', 'secretaire');
  var liste = document.getElementById('liste-domaines'), listeAcces = document.getElementById('liste-acces');
  var bloc = document.getElementById('domaines');
  if (!liste || !listeAcces) return;

  function info(id, texte) { var p = document.getElementById(id); p.textContent = texte; p.hidden = false; }
  function role() { return window.BCRRole ? window.BCRRole.role() : 'president'; }

  function rendreDomaines() {
    liste.innerHTML = DOMAINES.map(function (d) {
      var l = laisses.indexOf(d[0]) >= 0, r = regardes.indexOf(d[0]) >= 0;
      return '<li class="' + (l ? 'laisse' : 'suivi') + '"><div><strong>' + d[1] + '</strong><span>'
        + (l ? 'Laissé ' + d[4] + '. ' : 'Responsable : ' + d[3] + '. ') + d[5] + ' <span class="etiquette-ex">exemple</span></span></div>'
        + '<div class="geste">'
        + (l ? '<button type="button" class="bouton ligne petit" data-regarder="' + d[0] + '" aria-pressed="' + r + '">Regarder quand même</button>'
             + '<button type="button" class="bouton petit" data-suivre="' + d[0] + '">Le reprendre</button>'
           : '<a class="bouton ligne petit" href="#' + premier(d[0]) + '">Voir</a>'
             + '<button type="button" class="bouton ligne petit" data-laisser="' + d[0] + '">Je laisse ' + d[4] + '</button>')
        + '</div></li>';
    }).join('');
  }
  function premier(dom) { var s = document.querySelector('section[data-domaine="' + dom + '"]'); return s && s.id ? s.id : 'domaines'; }

  function rendreAcces() {
    var moi = role(), pres = moi === 'president';
    listeAcces.innerHTML = '<li><div><strong>' + (pres ? 'Vous, président' : 'Le président') + '</strong><span>Tout l\'espace, et les accès de chacun' + (pres ? '' : ' (modifiables par lui seul)') + '.</span></div></li>'
      + PERSONNES.map(function (p) {
        var g = p[0] === gestionnaire;
        return '<li><div><strong>' + p[1] + '</strong><span>' + p[2] + (g ? ' · gère les accès des autres' : '') + ' <span class="etiquette-ex">exemple</span></span></div>'
          + (pres ? '<div class="geste"><button type="button" class="bouton ' + (g ? 'petit' : 'ligne petit') + '" data-gere="' + p[0] + '">'
            + (g ? 'Retirer ce droit' : 'Lui confier les accès') + '</button></div>'
            : (p[0] === moi ? '' : '<div class="geste"><button type="button" class="bouton ligne petit" data-modifier="' + p[1] + '">Modifier son accès</button></div>'))
          + '</li>';
      }).join('')
      + (pres ? '' : '<li><div><strong>Ajouter une personne</strong><span>Un nouveau coach ou un bénévole, avec le rôle qui lui convient.</span></div><div class="geste"><button type="button" class="bouton petit" data-modifier="nouveau">Ajouter</button></div></li>');
  }

  /* Le président ne voit plus les blocs des domaines laissés (sauf « Regarder quand même ») ;
     la personne qui gère les accès voit le bloc, réduit à la liste des accès. */
  function appliquer() {
    var moi = role(), pres = moi === 'president';
    Array.prototype.forEach.call(document.querySelectorAll('section[data-domaine]'), function (s) {
      var d = s.getAttribute('data-domaine');
      if (pres) s.hidden = laisses.indexOf(d) >= 0 && regardes.indexOf(d) < 0;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.aller-a a'), function (a) {
      var cible = document.querySelector(a.getAttribute('href')), d = cible && cible.getAttribute('data-domaine');
      a.parentNode.hidden = !!(pres && d && laisses.indexOf(d) >= 0 && regardes.indexOf(d) < 0);
    });
    var gere = moi === gestionnaire;
    if (!pres) bloc.hidden = !gere;
    bloc.classList.toggle('vue-acces', !pres && gere);
    rendreDomaines(); rendreAcces();
    var main = document.querySelector('main[data-alterner]'), n = 0;
    if (main) Array.prototype.forEach.call(main.querySelectorAll(':scope > section.bloc'), function (s) {
      if (s.hidden) return; s.classList.toggle('clair', n % 2 === 1); n++;
    });
    if (window.ScrollTrigger) setTimeout(function () { window.ScrollTrigger.refresh(); }, 50);
  }

  /* Les listes sont recréées à chaque choix : le focus revient au bouton concerné (ou, s'il n'existe plus, à son voisin de la même ligne). */
  function refocaliser(conteneur, choix) {
    for (var i = 0; i < choix.length; i++) { var b = conteneur.querySelector(choix[i]); if (b) { b.focus({ preventScroll: true }); return; } }
    var p = conteneur.querySelector('button, a'); if (p) p.focus({ preventScroll: true });
  }
  var REDUIT = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function nomDomaine(id) { for (var i = 0; i < DOMAINES.length; i++) if (DOMAINES[i][0] === id) return DOMAINES[i]; return null; }

  liste.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var id, d;
    if ((id = b.getAttribute('data-laisser'))) {
      d = nomDomaine(id); laisses.push(id); ecrire('bcr-domaines-laisses', laisses); appliquer();
      refocaliser(liste, ['[data-regarder="' + id + '"]', '[data-suivre="' + id + '"]']);
      info('domaines-etat', '« ' + d[1] + ' » est laissé ' + d[4] + ' : ces blocs quittent votre page et restent ici.');
    } else if ((id = b.getAttribute('data-suivre'))) {
      d = nomDomaine(id); laisses = laisses.filter(function (x) { return x !== id; }); regardes = regardes.filter(function (x) { return x !== id; });
      ecrire('bcr-domaines-laisses', laisses); appliquer();
      refocaliser(liste, ['[data-laisser="' + id + '"]']);
      info('domaines-etat', 'Vous suivez de nouveau « ' + d[1] + ' » : ses blocs sont revenus dans votre page.');
    } else if ((id = b.getAttribute('data-regarder'))) {
      d = nomDomaine(id);
      if (regardes.indexOf(id) >= 0) { regardes = regardes.filter(function (x) { return x !== id; }); appliquer(); refocaliser(liste, ['[data-regarder="' + id + '"]']); info('domaines-etat', '« ' + d[1] + ' » est de nouveau rangé.'); return; }
      regardes.push(id); appliquer(); refocaliser(liste, ['[data-regarder="' + id + '"]']);
      info('domaines-etat', '« ' + d[1] + ' » est affiché pour cette visite, sans rien changer pour ' + d[3].split(',')[0] + '.');
      var s = document.getElementById(premier(id)); if (s) s.scrollIntoView({ behavior: REDUIT ? 'auto' : 'smooth', block: 'start' });
    }
  });
  listeAcces.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var id = b.getAttribute('data-gere');
    if (id) {
      gestionnaire = gestionnaire === id ? '' : id; ecrire('bcr-gere-acces', gestionnaire); appliquer(); refocaliser(listeAcces, ['[data-gere="' + id + '"]']);
      var p = PERSONNES.filter(function (x) { return x[0] === id; })[0];
      info('acces-etat', gestionnaire ? p[1] + ' peut maintenant ajouter ou retirer les accès des autres. Vos propres accès restent à vous seul.' : p[1] + ' ne gère plus les accès : vous seul les modifiez.');
    } else if (b.hasAttribute('data-modifier')) {
      info('acces-etat', 'Démonstration : ici, la personne choisirait le rôle et les équipes, puis l\'accès serait ouvert ou retiré. Rien n\'est modifié dans cette maquette.');
    }
  });

  document.addEventListener('bcr:role', appliquer);
  appliquer();
})();
