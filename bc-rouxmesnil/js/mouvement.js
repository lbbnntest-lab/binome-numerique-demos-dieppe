/* Mouvement : boîte à outils d'animations au défilement, commune aux trois réalisations sur mesure.

   Principe de sécurité (à ne pas casser) :
   - le HTML est complet et lisible SANS ce script ; le script n'ajoute que du mouvement ;
   - rien ne bouge si le visiteur a demandé à réduire les animations (réglage du système) ;
   - rien ne bouge si GSAP n'a pas pu se charger (réseau lent, bloqueur) ;
   - on n'anime que transform et opacity (pas de largeur, hauteur, marge : ce sont elles qui saccadent).

   Comportements déclarés dans le HTML par l'attribut data-mv :
     mots      le texte se compose mot par mot (chaque mot monte derrière un cache)
     lettres   idem lettre par lettre (réservé aux titres courts ; le titre garde son aria-label)
     devoile   une image se découvre derrière un rideau de la couleur du fond
     parallaxe l'image bouge un peu moins vite que son cadre (grand écran seulement)
     trait     un filet se trace de gauche à droite
     suite     les enfants arrivent l'un après l'autre
     eclaire   les mots s'allument au rythme de la lecture (défilement) ; au repos ils restent à 55 %
               d'opacité, ce qui garde un contraste d'au moins 3:1 sur ces grands textes

   La classe mv-actif est posée dès le <head> par un court script en ligne (pour éviter que la page
   saute quand les scènes épinglées se mettent en place) ; ce fichier la retire si GSAP est absent.
*/
(function () {
  'use strict';
  var M = {};
  window.Mouvement = M;

  M.reduit = function () {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /* Découpe en mots en gardant les balises internes (em, strong, a, br). */
  M.decouperMots = function (el) {
    if (el.getAttribute('data-decoupe') === 'mots') return el.querySelectorAll('.mv-mi');
    (function parcourir(noeud) {
      Array.prototype.slice.call(noeud.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var morceaux = n.textContent.split(/(\s+)/);
          if (morceaux.length === 1 && !morceaux[0].trim()) return;
          var frag = document.createDocumentFragment();
          morceaux.forEach(function (m) {
            if (!m) return;
            if (/^\s+$/.test(m)) { frag.appendChild(document.createTextNode(m)); return; }
            var ext = document.createElement('span'); ext.className = 'mv-m';
            var int = document.createElement('span'); int.className = 'mv-mi';
            int.textContent = m; ext.appendChild(int); frag.appendChild(ext);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          parcourir(n);
        }
      });
    })(el);
    el.setAttribute('data-decoupe', 'mots');
    return el.querySelectorAll('.mv-mi');
  };

  /* Découpe en lettres : le titre garde son nom accessible (aria-label), les lettres sont masquées aux lecteurs d'écran. */
  M.decouperLettres = function (el) {
    if (el.getAttribute('data-decoupe') === 'lettres') return el.querySelectorAll('.mv-li');
    var texte = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', texte);
    var enveloppe = document.createElement('span');
    enveloppe.setAttribute('aria-hidden', 'true');
    enveloppe.className = 'mv-lettres';
    Array.prototype.forEach.call(texte, function (c) {
      if (c === ' ') { enveloppe.appendChild(document.createTextNode(' ')); return; }
      var ext = document.createElement('span'); ext.className = 'mv-l';
      var int = document.createElement('span'); int.className = 'mv-li'; int.textContent = c;
      ext.appendChild(int); enveloppe.appendChild(ext);
    });
    el.textContent = '';
    el.appendChild(enveloppe);
    el.setAttribute('data-decoupe', 'lettres');
    return el.querySelectorAll('.mv-li');
  };

  /* Menu plein écran : ouverture/fermeture accessibles (aria-expanded, Échap, retour du focus).
     L'animation d'ouverture est fournie par chaque site (fonction animer(ouvrir) qui renvoie une timeline). */
  M.menu = function (bouton, panneau, animer) {
    if (!bouton || !panneau) return;
    var ouvert = false, tl = null;
    var libelle = bouton.querySelector('.menu-libelle');
    function basculer(etat, rendreFocus) {
      ouvert = etat;
      bouton.setAttribute('aria-expanded', String(etat));
      if (libelle) libelle.textContent = etat ? 'Fermer' : 'Menu';
      document.documentElement.classList.toggle('menu-ouvert', etat);
      if (etat) {
        panneau.hidden = false;
        if (tl) tl.kill();
        if (window.gsap && !M.reduit() && animer) tl = animer(true);
        var premier = panneau.querySelector('a'); if (premier) premier.focus({ preventScroll: true });
      } else {
        var fin = function () { if (!ouvert) panneau.hidden = true; };
        if (tl) tl.kill();
        if (window.gsap && !M.reduit() && animer) { tl = animer(false); tl.eventCallback('onComplete', fin); } else fin();
        if (rendreFocus) bouton.focus({ preventScroll: true });
      }
    }
    bouton.addEventListener('click', function () { basculer(!ouvert, true); });
    panneau.addEventListener('click', function (e) { if (e.target.closest('a')) basculer(false, false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ouvert) basculer(false, true); });
    /* Garde le focus dans le menu ouvert (Tab / Maj+Tab bouclent entre le bouton et les liens). */
    document.addEventListener('keydown', function (e) {
      if (!ouvert || e.key !== 'Tab') return;
      var cibles = [bouton].concat(Array.prototype.slice.call(panneau.querySelectorAll('a, button')));
      var i = cibles.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); cibles[cibles.length - 1].focus(); }
      else if (!e.shiftKey && i === cibles.length - 1) { e.preventDefault(); cibles[0].focus(); }
    });
  };

  /* Formulaires de démonstration : rien n'est envoyé, on le dit clairement. */
  M.formulairesDemo = function () {
    Array.prototype.forEach.call(document.querySelectorAll('form[data-demo]'), function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var s = f.querySelector('[role="status"]');
        if (s) s.textContent = 'Site de démonstration : aucune demande n’est envoyée. Sur un vrai site, ce formulaire arriverait directement dans la boîte du commerce.';
      });
    });
  };

  /* Comportements génériques. Renvoie l'objet gsap.matchMedia pour que chaque site y ajoute ses séquences. */
  M.demarrer = function () {
    M.formulairesDemo();
    if (!window.gsap || !window.ScrollTrigger) { document.documentElement.classList.remove('mv-actif'); return null; }
    gsap.registerPlugin(ScrollTrigger);
    var mm = gsap.matchMedia();
    mm.add({
      grand: '(min-width: 800px)',
      anime: '(prefers-reduced-motion: no-preference)'
    }, function (ctx) {
      if (!ctx.conditions.anime) return;
      var grand = ctx.conditions.grand;
      var racine = document.documentElement;
      racine.classList.add('mv-actif');

      gsap.utils.toArray('[data-mv="mots"]').forEach(function (el) {
        var mots = M.decouperMots(el);
        gsap.from(mots, {
          yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: grand ? 0.035 : 0.02,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      });

      gsap.utils.toArray('[data-mv="devoile"]').forEach(function (cadre) {
        var rideau = cadre.querySelector(':scope > .mv-rideau');
        if (!rideau) {
          rideau = document.createElement('span');
          rideau.className = 'mv-rideau';
          rideau.setAttribute('aria-hidden', 'true');
          cadre.appendChild(rideau);
        }
        var media = cadre.querySelector('img, svg');
        var sens = cadre.getAttribute('data-sens') || 'bas';
        var tl = gsap.timeline({ scrollTrigger: { trigger: cadre, start: 'top 82%', once: true } });
        tl.fromTo(rideau, { scaleY: 1 }, {
          scaleY: 0, transformOrigin: sens === 'bas' ? '50% 0%' : '50% 100%',
          duration: grand ? 1.15 : 0.8, ease: 'power4.inOut'
        });
        if (media) tl.from(media, { scale: grand ? 1.16 : 1.08, duration: 1.6, ease: 'power3.out' }, 0);
      });

      if (grand) {
        gsap.utils.toArray('[data-mv="parallaxe"]').forEach(function (img) {
          var amp = parseFloat(img.getAttribute('data-amplitude') || '6');
          gsap.fromTo(img, { yPercent: -amp }, {
            yPercent: amp, ease: 'none',
            scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
          });
        });
      }

      gsap.utils.toArray('[data-mv="trait"]').forEach(function (el) {
        gsap.from(el, {
          scaleX: 0, transformOrigin: '0% 50%', duration: 1.2, ease: 'power3.inOut',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        });
      });

      gsap.utils.toArray('[data-mv="suite"]').forEach(function (el) {
        gsap.from(el.children, {
          y: grand ? 28 : 16, opacity: 0, duration: 0.8, ease: 'power2.out', stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        });
      });

      gsap.utils.toArray('[data-mv="eclaire"]').forEach(function (el) {
        var mots = M.decouperMots(el);
        gsap.fromTo(mots, { opacity: 0.55 }, {
          opacity: 1, ease: 'none', stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 52%', scrub: 0.4 }
        });
      });

      return function () { racine.classList.remove('mv-actif'); };
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    return mm;
  };
})();
