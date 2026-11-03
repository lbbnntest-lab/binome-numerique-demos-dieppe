/* Aperçu du résumé vidéo d'un match (démonstration), commun à medias.html (espace dirigeants) et photos.html (page publique).
   Pose le lecteur dans chaque élément [data-resume-video]. Options, en attributs data- de cet élément :
     data-texte="ouvert"   le texte de la voix off est déplié (sinon replié)
     data-voix="non"       pas de bouton d'essai de voix off
     data-formats="non"    pas de choix horizontal / vertical
   Six cartons plein cadre enchaînés avec GSAP (déjà chargé sur ces pages), balayage de deux bandes obliques entre les cartons,
   sous-titres synchronisés avec le texte de la voix off, barre de progression. Aucun appel au réseau. Aucune personne à l'image :
   fond = photo de la salle vide, logos des clubs et des partenaires (images du dépôt).
   Sans GSAP : le premier carton et le texte de la voix off restent affichés. Mouvement réduit : coupes franches, score affiché
   d'emblée, le bouton Pause reste disponible. Tout est cherché à l'intérieur de l'élément racine (pas de sélecteur global). */
(function () {
  'use strict';

  var REPLIQUES = [
    'Samedi 10 octobre, play-off élite des U18 féminines.',
    'Le Basket Club de Rouxmesnil reçoit Alençon-Damigny Basket.',
    'Au coup de sifflet final, le tableau affiche 78 à 57.',
    'Victoire de 21 points.',
    'Les meilleurs moments, filmés par les familles du club.',
    'Après deux tours de qualification, elles gagnent leur place en élite régionale : une première.',
    'Premier rendez-vous le samedi 7 novembre, à domicile, face à Cherbourg Basket Ball.',
    'Merci à nos partenaires.',
    'Basket Club de Rouxmesnil : passion, esprit d\'équipe, respect.'
  ];
  var DEBUTS = [0, 3.2, 6.5, 10, 12.6, 17.7, 21.7, 25.3, 28.7];   /* début de chaque phrase, en secondes */
  var PLANS_T = [0, 6.5, 12, 17.5, 25, 28.5];                      /* début de chaque carton */
  var FIN = 32.5;
  var PARTENAIRES = ['auchan', 'stadium', 'brico-depot', 'leader', 'etria', 'commune-rouxmesnil'];

  function mmss(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

  function gabarit(o) {
    var fond = 'img/salle-tribunes.webp';
    var logos = PARTENAIRES.map(function (p) { return '<li><img src="img/partenaires/' + p + '.jpg" alt="" loading="lazy" decoding="async"></li>'; }).join('');
    return ''
      + '<div class="rv-ecran" data-etat="arret" role="img" aria-label="Aperçu du résumé vidéo du play-off élite des U18 féminines, en six cartons : titre du match, score 78 à 57, temps forts, qualification pour l\'élite régionale, partenaires du club, logo du club. Le texte de la voix off est écrit sous le lecteur.">'
      +   '<div class="rv-scene" aria-hidden="true">'
      /* 1. Ouverture */
      +     '<div class="rv-plan rv-ouv rv-actif">'
      +       '<div class="rv-fond flou"><img src="' + fond + '" alt="" decoding="async"></div>'
      +       '<div class="rv-bandes"><i></i><i></i></div>'
      +       '<div class="rv-club"><img src="img/logo-bcr-160.webp" alt=""><span>Basket Club de Rouxmesnil</span></div>'
      +       '<div class="rv-titre"><span class="rv-ligne"><span class="rv-gros rv-l1">Play-off élite</span></span><span class="rv-ligne"><span class="rv-gros rv-l2">U18 féminines</span></span></div>'
      +       '<div class="rv-duel"><div class="rv-duel-ligne"><span class="rv-eq"><img class="noir" src="img/logo-bcr-160.webp" alt=""><span>BCR</span></span><em>contre</em><span class="rv-eq"><img src="img/logos/alencon.webp" alt=""><span>Alençon-Damigny Basket</span></span></div><p class="rv-quand">Samedi 10 octobre · à domicile</p></div>'
      +     '</div>'
      /* 2. Score */
      +     '<div class="rv-plan rv-score">'
      +       '<p class="rv-sur">Score final</p>'
      +       '<div class="rv-tableau">'
      +         '<div class="rv-cote gagne"><b class="rv-nombre rv-n1">78</b><span class="rv-nom"><img class="noir" src="img/logo-bcr-160.webp" alt=""><span>BCR</span></span></div>'
      +         '<div class="rv-trait"><span>Fin</span></div>'
      +         '<div class="rv-cote"><b class="rv-nombre rv-n2">57</b><span class="rv-nom"><img src="img/logos/alencon.webp" alt=""><span>Alençon</span></span></div>'
      +       '</div>'
      +       '<div class="rv-ecart"><span class="rv-ecart-fond"><span>+21 points</span></span></div>'
      +     '</div>'
      /* 3. Temps forts */
      +     '<div class="rv-plan rv-forts">'
      +       [1, 2, 3].map(function (k) { return '<div class="rv-coupe"><img src="' + fond + '" alt="" decoding="async"><span class="rv-extrait">Extrait ' + k + ' sur 3</span></div>'; }).join('')
      +       '<div class="rv-viseur"><i></i><i></i><i></i><i></i></div>'
      +       '<div class="rv-tiers"><b>Temps forts</b><span>Les meilleurs moments, choisis parmi les vidéos des familles</span></div>'
      +     '</div>'
      /* 4. Qualification */
      +     '<div class="rv-plan rv-elite">'
      +       '<span class="rv-fili">Élite</span>'
      +       '<p class="rv-saison">Saison 2026-2027</p>'
      +       '<div class="rv-q"><span class="rv-ligne"><span class="rv-gros rv-ql">Qualifiées pour</span></span><span class="rv-ligne"><span class="rv-gros rv-ql">l\'élite régionale</span></span></div>'
      +       '<div class="rv-prochain"><img src="img/logos/cherbourg.webp" alt=""><p>Prochain match, samedi 7 novembre, à domicile<strong>Cherbourg Basket Ball</strong></p></div>'
      +     '</div>'
      /* 5. Partenaires */
      +     '<div class="rv-plan rv-parts">'
      +       '<div class="rv-bandes"><i></i><i></i></div>'
      +       '<div class="rv-merci"><span class="rv-ligne"><span class="rv-gros">Merci à nos partenaires</span></span></div>'
      +       '<ul class="rv-logos">' + logos + '</ul>'
      +     '</div>'
      /* 6. Fin */
      +     '<div class="rv-plan rv-fin">'
      +       '<div class="rv-fond tres-sombre"><img src="' + fond + '" alt="" decoding="async"></div>'
      +       '<img src="img/logo-bcr-240.webp" alt="">'
      +       '<div class="rv-fin-nom"><span class="rv-ligne"><span class="rv-gros">Basket Club de Rouxmesnil</span></span></div>'
      +       '<div class="rv-fin-trait"></div>'
      +       '<p class="rv-devise">Passion, esprit d\'équipe, respect</p>'
      +       '<div class="rv-bandes"><i></i><i></i></div>'
      +     '</div>'
      +     '<div class="rv-balai"><div><i></i><i></i><i></i></div></div>'
      +     '<p class="rv-st"></p>'
      +     '<span class="rv-marque">Aperçu de démonstration</span>'
      +     '<span class="rv-jouer"></span>'
      +   '</div>'
      + '</div>'
      + '<div class="rv-temps-ligne"><div class="rv-progression" aria-hidden="true"><i></i></div><span class="rv-temps" aria-hidden="true">0:00 / ' + mmss(FIN) + '</span></div>'
      + '<div class="rv-commandes">'
      +   '<button type="button" class="rv-btn rv-lancer">Lancer l\'aperçu</button>'
      +   (o.formats ? '<div class="rv-formats" role="group" aria-label="Format de la vidéo"><button type="button" aria-pressed="true" data-rv-format="horizontal">Horizontal · site</button><button type="button" aria-pressed="false" data-rv-format="vertical">Vertical · réseaux</button></div>' : '')
      +   (o.voix ? '<button type="button" class="rv-btn creux rv-voix">Écouter un essai de voix off</button>' : '')
      + '</div>'
      + '<p class="rv-etat" role="status" aria-live="polite"></p>'
      + '<p class="rv-demo"><strong>Aperçu de démonstration</strong> : la version réelle est montée avec les vidéos des familles, sans dessin.</p>'
      + '<details class="rv-texte"' + (o.ouvert ? ' open' : '') + '><summary>Texte de la voix off · environ 30 secondes</summary><p>'
      +   REPLIQUES.map(function (t, i) { return '<span data-i="' + i + '">' + t + '</span>'; }).join(' ')
      + '</p></details>';
  }

  function monter(racine) {
    if (racine.getAttribute('data-rv-monte')) return;
    racine.setAttribute('data-rv-monte', '1');
    var o = { formats: racine.getAttribute('data-formats') !== 'non', voix: racine.getAttribute('data-voix') !== 'non', ouvert: racine.getAttribute('data-texte') === 'ouvert' };
    racine.className = (racine.className ? racine.className + ' ' : '') + 'rv';
    racine.setAttribute('data-format', 'horizontal');
    racine.innerHTML = gabarit(o);

    var $ = function (s, r) { return (r || racine).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || racine).querySelectorAll(s)); };
    var ecran = $('.rv-ecran'), btn = $('.rv-lancer'), btVoix = $('.rv-voix'), etat = $('.rv-etat'), st = $('.rv-st'),
        barre = $('.rv-progression i'), horloge = $('.rv-temps'), spans = $$('.rv-texte span[data-i]');

    function surligner(i) { spans.forEach(function (s, k) { s.classList.toggle('lu', k === i); }); }

    /* ---------- Format ---------- */
    $$('[data-rv-format]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-rv-format]').forEach(function (y) { y.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        racine.setAttribute('data-format', b.getAttribute('data-rv-format'));
        etat.textContent = b.getAttribute('data-rv-format') === 'vertical' ? 'Format vertical, pour les réseaux.' : 'Format horizontal, pour le site.';
      });
    });

    /* ---------- Lecteur ---------- */
    var tl = null, lance = false;
    function reglerEtat(e) { ecran.setAttribute('data-etat', e); }
    if (window.gsap) {
      var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches, d = reduit ? 0 : 1;
      var D = function (x) { return Math.max(0.001, x * d); };
      var plans = $$('.rv-plan'), courant = -1;
      plans.forEach(function (p) { p.classList.remove('rv-actif'); });
      var sc = { a: 0, b: 0 }, n1 = $('.rv-n1'), n2 = $('.rv-n2');
      tl = gsap.timeline({
        paused: true,
        onUpdate: function () {
          var t = tl.time(), i = -1;
          for (var k = 0; k < DEBUTS.length; k++) if (t >= DEBUTS[k]) i = k;
          if (i !== courant) { courant = i; st.innerHTML = i < 0 || t >= FIN - 0.05 ? '' : '<span>' + REPLIQUES[i] + '</span>'; }
          barre.style.transform = 'scaleX(' + Math.min(1, t / FIN).toFixed(4) + ')';
          horloge.textContent = mmss(t) + ' / ' + mmss(FIN);
        },
        onComplete: function () {
          btn.textContent = 'Revoir l\'aperçu'; etat.textContent = 'Aperçu terminé : 32 secondes, six cartons.';
          st.innerHTML = ''; courant = -1; reglerEtat('fin');
        }
      });
      /* Cartons : un seul visible à la fois ; le balayage couvre le changement. */
      tl.set(plans, { autoAlpha: 0 }, 0).set(plans[0], { autoAlpha: 1 }, 0);
      PLANS_T.forEach(function (t, i) { if (i > 0) { tl.set(plans[i - 1], { autoAlpha: 0 }, t); tl.set(plans[i], { autoAlpha: 1 }, t); } });
      if (!reduit) {
        var balai = $('.rv-balai > div');
        gsap.set(balai, { x: 0, xPercent: -100, skewX: -14 });
        racine.classList.add('rv-gsap');
        PLANS_T.forEach(function (t, i) {
          if (i > 0) tl.fromTo(balai, { xPercent: -100 }, { xPercent: 43.5, duration: 0.8, ease: 'power1.inOut' }, t - 0.4);
        });
      }
      /* Poses en fin d'animation : les images de fond zooment lentement. */
      var zoom = function (cible, de, a, debut, duree) { if (reduit) return; tl.fromTo(cible, { scale: de }, { scale: a, duration: Math.max(0.001, duree), ease: 'none' }, debut); };
      var ent = function (cible, vars, debut) { tl.from(cible, Object.assign({ ease: 'power3.out' }, vars), debut); };

      /* 1. Ouverture */
      var p1 = plans[0];
      zoom($('.rv-fond img', p1), 1.12, 1.24, 0, 6.5);
      ent($('.rv-bandes', p1), { xPercent: 60, autoAlpha: 0, duration: D(0.9) }, 0.2);
      ent($('.rv-club', p1), { y: -12, autoAlpha: 0, duration: D(0.6) }, 0.3);
      ent($$('.rv-ligne > .rv-gros', p1), { yPercent: 115, duration: D(0.8), stagger: D(0.14) }, 0.5);
      ent($('.rv-duel', p1), { y: 16, autoAlpha: 0, duration: D(0.6) }, 3.2);

      /* 2. Score : les deux chiffres montent, puis l'écart arrive */
      var p2 = plans[1];
      ent($('.rv-sur', p2), { y: -10, autoAlpha: 0, duration: D(0.5) }, 6.6);
      ent($$('.rv-cote', p2)[0], { x: -30, autoAlpha: 0, duration: D(0.7) }, 6.7);
      ent($$('.rv-cote', p2)[1], { x: 30, autoAlpha: 0, duration: D(0.7) }, 6.7);
      ent($('.rv-trait', p2), { scaleY: 0, autoAlpha: 0, duration: D(0.6) }, 6.8);
      tl.call(function () { n1.textContent = '0'; n2.textContent = '0'; }, null, 6.65)
        .fromTo(sc, { a: 0, b: 0 }, { a: 78, b: 57, duration: D(2.4), ease: 'power2.out',
          onUpdate: function () { n1.textContent = Math.round(sc.a); n2.textContent = Math.round(sc.b); } }, 6.9)
        .fromTo(n1, { scale: 1 }, { scale: 1.06, duration: D(0.18), yoyo: true, repeat: 1, ease: 'power1.inOut', transformOrigin: '50% 100%' }, 9.35);
      ent($('.rv-ecart', p2), { xPercent: -110, autoAlpha: 0, duration: D(0.6), ease: 'power3.out' }, 10);

      /* 3. Temps forts : trois coupes rapides dans la photo de la salle */
      var p3 = plans[2], coupes = $$('.rv-coupe', p3), CT = [12, 13.8, 15.6];
      tl.set(coupes, { autoAlpha: 0 }, 0);
      coupes.forEach(function (c, i) {
        tl.set(c, { autoAlpha: 1 }, CT[i]);
        if (i > 0) tl.set(coupes[i - 1], { autoAlpha: 0 }, CT[i]);
        zoom($('img', c), 1.4, 1.62, CT[i], i < 2 ? 1.8 : 1.9);
      });
      ent($('.rv-viseur', p3), { autoAlpha: 0, scale: 1.08, duration: D(0.5) }, 12.1);
      ent($('.rv-tiers', p3), { xPercent: -105, duration: D(0.7) }, 12.4);

      /* 4. Qualification */
      var p4 = plans[3];
      ent($('.rv-fili', p4), { xPercent: 18, autoAlpha: 0, duration: D(1.2) }, 17.6);
      ent($('.rv-saison', p4), { x: -20, autoAlpha: 0, duration: D(0.6) }, 17.9);
      ent($$('.rv-ql', p4), { yPercent: 115, duration: D(0.8), stagger: D(0.16) }, 18.1);
      ent($('.rv-prochain', p4), { xPercent: -105, duration: D(0.7) }, 21.7);

      /* 5. Partenaires */
      var p5 = plans[4];
      ent($('.rv-bandes', p5), { xPercent: 50, autoAlpha: 0, duration: D(0.7) }, 25.0);
      ent($('.rv-merci .rv-gros', p5), { yPercent: 115, duration: D(0.7) }, 25.1);
      ent($$('.rv-logos li', p5), { scale: 0.9, autoAlpha: 0, duration: D(0.5), stagger: D(0.12), ease: 'power2.out' }, 25.4);

      /* 6. Fin */
      var p6 = plans[5];
      zoom($('.rv-fond img', p6), 1.12, 1.2, 28.5, 4);
      ent(p6.querySelector(':scope > img'), { scale: 0.8, autoAlpha: 0, duration: D(0.7), ease: 'back.out(1.5)' }, 28.7);
      ent($('.rv-fin-nom .rv-gros', p6), { yPercent: 115, duration: D(0.7) }, 29.0);
      ent($('.rv-fin-trait', p6), { scaleX: 0, duration: D(0.5), transformOrigin: 'left center' }, 29.4);
      ent($('.rv-devise', p6), { y: 10, autoAlpha: 0, duration: D(0.6) }, 29.6);
      ent($('.rv-bandes', p6), { xPercent: -100, duration: D(0.8) }, 28.8);

      tl.set({}, {}, FIN);
      /* Affiche de départ : le premier carton installé, sans sous-titre. */
      tl.seek(4.2, true); st.innerHTML = ''; courant = -1; barre.style.transform = 'scaleX(0)'; horloge.textContent = '0:00 / ' + mmss(FIN);

      var basculer = function () {
        if (!lance || tl.progress() === 1) {
          lance = true; tl.restart(); btn.textContent = 'Pause'; etat.textContent = 'Aperçu en cours : 32 secondes, sous-titré.'; reglerEtat('lecture'); return;
        }
        if (tl.paused()) { tl.play(); btn.textContent = 'Pause'; etat.textContent = 'Lecture reprise.'; reglerEtat('lecture'); }
        else { tl.pause(); btn.textContent = 'Reprendre'; etat.textContent = 'Aperçu en pause.'; reglerEtat('pause'); }
      };
      btn.addEventListener('click', basculer);
      ecran.addEventListener('click', basculer);
      /* Pour les essais : aller à un instant donné de l'aperçu. */
      racine.rvAller = function (t) { lance = true; tl.pause(); tl.seek(t, false); btn.textContent = 'Reprendre'; reglerEtat('pause'); };
    } else {
      var rien = function () { etat.textContent = 'L\'animation n\'a pas pu se charger. Le texte de la voix off reste lisible ci-dessous.'; };
      btn.addEventListener('click', rien); ecran.addEventListener('click', rien);
    }

    /* ---------- Essai de voix off (synthèse vocale du navigateur) ---------- */
    if (btVoix) {
      var enCours = false, garde = null;
      var finVoix = function (message) { enCours = false; clearTimeout(garde); surligner(-1); btVoix.textContent = 'Écouter un essai de voix off'; if (message) etat.textContent = message; };
      var parler = function (voix) {
        var demarre = false;
        REPLIQUES.forEach(function (texte, i) {
          var u = new SpeechSynthesisUtterance(texte);
          u.lang = 'fr-FR'; if (voix) u.voice = voix; u.rate = 1;
          u.onstart = function () { demarre = true; clearTimeout(garde); surligner(i); };
          u.onerror = function (e) { if (enCours && e.error !== 'interrupted' && e.error !== 'canceled') { speechSynthesis.cancel(); finVoix('La lecture n\'a pas pu se faire sur cet appareil. Le texte de la voix off reste lisible ci-dessous.'); } };
          if (i === REPLIQUES.length - 1) u.onend = function () { if (enCours) finVoix('Essai de voix off terminé.'); };
          speechSynthesis.speak(u);
        });
        garde = setTimeout(function () { if (!demarre && enCours) { speechSynthesis.cancel(); finVoix('La synthèse vocale ne répond pas sur cet appareil. Le texte de la voix off reste lisible ci-dessous.'); } }, 4000);
      };
      btVoix.addEventListener('click', function () {
        if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
          etat.textContent = 'La synthèse vocale n\'est pas disponible dans ce navigateur. Le texte de la voix off reste lisible ci-dessous.'; return;
        }
        if (enCours) { speechSynthesis.cancel(); finVoix('Voix off arrêtée.'); return; }
        enCours = true; btVoix.textContent = 'Arrêter la voix off';
        speechSynthesis.cancel();
        var choisir = function () {
          var voix = speechSynthesis.getVoices(), v = null, i, j;
          for (i = 0; i < voix.length && !v; i++) if (/^fr[-_]FR/i.test(voix[i].lang)) v = voix[i];
          for (j = 0; j < voix.length && !v; j++) if (/^fr/i.test(voix[j].lang)) v = voix[j];
          etat.textContent = v ? 'Essai de voix off avec la voix française du navigateur (' + v.name + ').' : 'Aucune voix française trouvée sur cet appareil : le navigateur lit avec sa voix par défaut.';
          parler(v);
        };
        if (speechSynthesis.getVoices().length) choisir();
        else {
          var fait = false, une = function () { if (fait) return; fait = true; if (speechSynthesis.removeEventListener) speechSynthesis.removeEventListener('voiceschanged', une); choisir(); };
          if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', une);
          setTimeout(une, 800);
        }
      });
      window.addEventListener('pagehide', function () { if (enCours && window.speechSynthesis) speechSynthesis.cancel(); });
    }
  }

  window.ResumeVideo = { monter: monter };
  Array.prototype.forEach.call(document.querySelectorAll('[data-resume-video]'), monter);
})();
