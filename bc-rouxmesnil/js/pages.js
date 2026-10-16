/* Pages intérieures : animations communes (en-tête de page, compteurs, montée des U18F). Génériques : mouvement.js. */
(function () {
  'use strict';
  var M = window.Mouvement;
  if (!M) return;
  var mm = M.demarrer();
  if (!mm) return;
  mm.add({ grand: '(min-width: 900px)', anime: '(prefers-reduced-motion: no-preference)' }, function (ctx) {
    if (!ctx.conditions.anime) return;
    var grand = ctx.conditions.grand;

    /* En-tête de page : le titre monte ligne par ligne, le filigrane glisse, le chapeau suit. */
    if (document.querySelector('.p-tete')) {
      gsap.timeline({ delay: 0.15 })
        .from('.p-tete .s-titre', { yPercent: 40, opacity: 0, duration: 0.9, ease: 'power3.out' })
        .from('.p-tete .s-surtitre, .p-tete .s-chapo, .p-tete .s-actions', { opacity: 0, y: 14, duration: 0.6, stagger: 0.1 }, 0.25)
        .from('.p-filigrane', { xPercent: 12, opacity: 0, duration: 1.4, ease: 'power3.out' }, 0);
      gsap.to('.p-filigrane', { xPercent: -10, ease: 'none', scrollTrigger: { trigger: '.p-tete', start: 'top top', end: 'bottom top', scrub: true } });
    }

    /* Chiffres qui comptent jusqu'à leur valeur quand ils arrivent à l'écran. */
    gsap.utils.toArray('[data-compte]').forEach(function (el) {
      var fin = parseFloat(el.getAttribute('data-compte')), o = { v: 0 };
      gsap.to(o, { v: fin, duration: 1.4, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v); },
        scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    /* Montée des U18F : le ballon grimpe palier par palier au rythme du défilement. */
    var b = document.getElementById('ballon-montee');
    if (b) {
      var barre = document.getElementById('barre-v'), etages = document.querySelectorAll('.etages li'), pos = { y: 400 }, paliers = [360, 220, 80];
      var maj = function () {
        b.setAttribute('transform', 'translate(70 ' + pos.y + ')'); barre.setAttribute('y2', pos.y);
        etages.forEach(function (li, i) { li.classList.toggle('allume', pos.y <= paliers[i] + 2); });
      };
      gsap.to(pos, { y: 80, ease: 'none', onUpdate: maj, scrollTrigger: grand
        ? { trigger: '.s-montee', start: 'top top', end: '+=1100', scrub: 0.6, pin: true }
        : { trigger: '.s-montee .echelle', start: 'top 80%', end: 'bottom 30%', scrub: 0.6 } });
      maj();
    }

    /* Arches de la charpente dessinées pendant la lecture. */
    gsap.utils.toArray('.arches .arc').forEach(function (p, i) {
      var l = p.getTotalLength();
      gsap.fromTo(p, { strokeDasharray: l, strokeDashoffset: l }, { strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: p.closest('section'), start: 'top 85%', end: 'bottom 40%', scrub: 0.5 } });
    });

    /* Étapes reliées par un trait qui se trace au défilement. */
    gsap.utils.toArray('.chemin').forEach(function (el) {
      gsap.fromTo(el, { '--avance': 0 }, { '--avance': 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 55%', scrub: 0.4 } });
    });
  });
})();
