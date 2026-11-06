/* Page « Le TikTok du BCR » (presentation/tiktok.html).
   - Les affiches des aperçus sont dessinées par js/export-facebook.js (le même dessin que les affiches « Rendez-vous » et
     « Résultats du week-end » de la maquette), avec les scores réels de js/donnees-ffbb.js (relevé de la fédération du 3 novembre).
     Aucun fichier existant n'est modifié : on passe à l'affiche une description adaptée, puis on retouche l'image obtenue
     (chemins des logos, deux textes, score retiré chez les U13 filles).
   - Le diaporama des résultats suit ce qu'annonce la page : une couverture, puis une image par jour de matchs.
   - Cadres verticaux : une image à la fois, défilement toutes les 3,5 s seulement quand le cadre est à l'écran,
     bouton pour l'arrêter (son texte dit l'action, sans état « enfoncé ») ; rien ne défile seul avec « réduire les animations ».
   - « Copier le texte » : presse-papiers, sinon le texte est sélectionné pour être copié à la main.
   Rien n'est envoyé ni publié. */
(function () {
  'use strict';
  var X = window.BCRExport, D = window.BCR_FFBB;
  var reduit = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var DUREE = 3500;
  var W = 1080;

  /* ---------- Copier le texte ---------- */
  function texteDe(el) { return (el.innerText || el.textContent || '').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
  function selectionner(el) {
    try { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* rien */ }
  }
  function copierSimple(t) {
    return new Promise(function (ok) {
      function repli() {
        var ta = document.createElement('textarea'), bon = false;
        ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
        document.body.appendChild(ta); ta.select();
        try { ta.setSelectionRange(0, t.length); bon = document.execCommand('copy'); } catch (e) { bon = false; }
        ta.remove(); ok(bon ? 'repli' : 'manuel');
      }
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        try { navigator.clipboard.writeText(t).then(function () { ok('ok'); }, repli); } catch (e) { repli(); }
      } else repli();
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-copier]') : null; if (!b) return;
    var cible = document.getElementById(b.getAttribute('data-copier')); if (!cible) return;
    var etat = b.parentNode.querySelector('.etat');
    var copie = X && X.copier ? X.copier : copierSimple;
    copie(texteDe(cible)).then(function (r) {
      if (!etat) return;
      etat.textContent = '';
      setTimeout(function () {
        if (r === 'manuel') { selectionner(cible); etat.textContent = 'Le texte est sélectionné : appui long, puis Copier.'; }
        else etat.textContent = 'Texte copié.';
      }, 40);
    });
  });

  /* ---------- Un lien vers un week-end replié l'ouvre ---------- */
  function ouvrir(hash) {
    if (!hash || hash.length < 2) return;
    var el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el && el.tagName === 'DETAILS') { el.open = true; }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null; if (!a) return;
    ouvrir(a.getAttribute('href'));
  });
  window.addEventListener('hashchange', function () { ouvrir(location.hash); });
  ouvrir(location.hash);

  /* ---------- Cadres verticaux ---------- */
  var lecteurs = [];
  function Lecteur(el) {
    var cadre = el.querySelector('[data-cadre]'), diapos = [].slice.call(cadre.querySelectorAll('.diapo')), n = diapos.length, i = 0;
    var arret = reduit.matches, visible = false, minuterie = null;
    var zone = el.querySelector('[data-commandes]');
    zone.innerHTML = '<div class="commandes-ligne"><span class="compteur" aria-live="off"></span></div>'
      + '<div class="commandes-boutons">'
      + '<button type="button" class="bouton ligne" data-action="prec" aria-label="Image précédente">Précédente</button>'
      + '<button type="button" class="bouton ligne" data-action="suiv" aria-label="Image suivante">Suivante</button>'
      + '<button type="button" class="bouton ligne" data-action="pause"></button>'
      + '<button type="button" class="bouton ligne" data-action="grand">Agrandir</button></div>';
    var compteur = zone.querySelector('.compteur'), bPause = zone.querySelector('[data-action="pause"]');
    function montrer(k, annoncer) {
      i = (k + n) % n;
      diapos.forEach(function (d, j) { var a = j === i; d.classList.toggle('active', a); d.setAttribute('aria-hidden', a ? 'false' : 'true'); });
      compteur.textContent = 'Image ' + (i + 1) + ' sur ' + n;
      compteur.setAttribute('aria-live', annoncer ? 'polite' : 'off');
    }
    function majPause() {
      bPause.textContent = arret ? 'Faire défiler' : 'Mettre en pause';
    }
    function planifier() {
      clearTimeout(minuterie); minuterie = null;
      if (arret || !visible || n < 2 || document.hidden) return;
      minuterie = setTimeout(function () { montrer(i + 1, false); planifier(); }, DUREE);
    }
    zone.addEventListener('click', function (e) {
      var b = e.target.closest('[data-action]'); if (!b) return;
      var a = b.getAttribute('data-action');
      if (a === 'prec') { montrer(i - 1, true); planifier(); }
      else if (a === 'suiv') { montrer(i + 1, true); planifier(); }
      else if (a === 'pause') { arret = !arret; majPause(); planifier(); }
      else if (a === 'grand') agrandir(cadre, diapos[i]);
    });
    /* Un toucher sur la moitié droite du cadre : image suivante ; à gauche : la précédente. */
    cadre.addEventListener('click', function (e) {
      var r = cadre.getBoundingClientRect();
      montrer(e.clientX - r.left > r.width / 2 ? i + 1 : i - 1, true); planifier();
    });
    this.voir = function (v) { visible = v; planifier(); };
    this.reduire = function (r) { if (r) { arret = true; majPause(); planifier(); } };
    this.planifier = planifier;
    this.el = el;
    montrer(0, false); majPause();
  }
  [].forEach.call(document.querySelectorAll('[data-lecteur]'), function (el) { lecteurs.push(new Lecteur(el)); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) {
        lecteurs.forEach(function (l) { if (l.el === en.target) l.voir(en.isIntersecting && en.intersectionRatio >= 0.6); });
      });
    }, { threshold: [0, 0.6, 1] });
    lecteurs.forEach(function (l) { io.observe(l.el); });
  }
  document.addEventListener('visibilitychange', function () { lecteurs.forEach(function (l) { l.planifier(); }); });
  if (reduit.addEventListener) reduit.addEventListener('change', function (e) { lecteurs.forEach(function (l) { l.reduire(e.matches); }); });

  /* ---------- Image agrandie ---------- */
  var dlg = document.getElementById('grand'), zoneGrand = dlg ? dlg.querySelector('[data-grand]') : null, nZoom = 0;
  function agrandir(cadre, diapo) {
    if (!dlg || !zoneGrand || !dlg.showModal) return;
    var html = diapo.innerHTML, pref = diapo.getAttribute('data-pref');
    /* Les identifiants des dégradés de l'affiche doivent rester uniques dans la page. */
    if (pref) html = html.split(pref).join('zoom' + (++nZoom) + '-');
    zoneGrand.innerHTML = '<div class="' + diapo.className.replace(/\bactive\b/, '') + ' active">' + html + '</div>';
    zoneGrand.style.background = cadre.classList.contains('cadre-noir') ? '#080a09' : '#030a22';
    var lab = diapo.getAttribute('aria-label');
    var inter = zoneGrand.firstChild;
    if (lab) { inter.setAttribute('role', 'img'); inter.setAttribute('aria-label', lab); }
    dlg.showModal();
  }
  if (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { zoneGrand.innerHTML = ''; });
  }

  /* ---------- Les affiches (dessin du club, données réelles) ---------- */
  if (!X || !X.affiches || !X.affiches.svg) return;
  var TH = { id: 'bleu', fond: '#1f66c9', accent: '#7db8ff', nom: 'Movember', emb: 'moustache' };
  var mc = document.createElement('canvas').getContext('2d');
  function largeur(t, z, italique, ls) {
    mc.font = (italique ? 'italic ' : '') + '700 ' + z + 'px "Barlow Condensed"';
    if ('letterSpacing' in mc) mc.letterSpacing = (ls || 0) + 'px';
    var w = mc.measureText(t).width;
    if ('letterSpacing' in mc) mc.letterSpacing = '0px';
    return w;
  }
  function textes(svg, contenu) {
    return [].filter.call(svg.querySelectorAll('text'), function (t) { return t.textContent === contenu; });
  }
  /* Remplace un texte de l'affiche ; la taille baisse si le nouveau texte est plus long que la place prévue. */
  function remplacer(svg, ancien, nouveau, maxW) {
    var els = textes(svg, ancien);
    els.forEach(function (t) {
      var z = parseFloat(t.getAttribute('font-size')), it = t.getAttribute('font-style') === 'italic', ls = parseFloat(t.getAttribute('letter-spacing') || '0');
      var w = largeur(nouveau, z, it, ls);
      if (w > maxW) z = Math.floor(z * maxW / w);
      t.textContent = nouveau; t.setAttribute('font-size', String(z));
    });
    return els;
  }
  function poser(nom, spec, retouche) {
    var d = document.querySelector('[data-affiche="' + nom + '"]'); if (!d) return Promise.resolve();
    var pref = 'tk-' + nom + '-';
    return X.affiches.svg(spec, pref).then(function (s) {
      /* Les logos de l'affiche sont rangés dans img/ à la racine de la maquette, un dossier au-dessus de cette page. */
      s = s.replace(/href="img\//g, 'href="../img/');
      var tmp = document.createElement('div'); tmp.innerHTML = s;
      var svg = tmp.querySelector('svg'); if (!svg) return;
      svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      if (retouche) retouche(svg);
      var repli = d.querySelector('.diapo-repli');
      d.innerHTML = ''; if (repli) d.appendChild(repli); d.appendChild(svg);
      d.setAttribute('data-pref', pref); d.classList.add('prete');
    }).catch(function () { /* l'aperçu garde son texte de repli */ });
  }

  /* 1. Samedi 7 novembre, 11 h : « Aujourd'hui, premier match en élite » (U18 filles contre Cherbourg Basket Ball, 15 h 15). */
  var elite = null;
  ((D && D.equipes && D.equipes.u18f1 && D.equipes.u18f1.matchs) || []).forEach(function (m) { if (m.d.slice(0, 10) === '2026-11-07') elite = m; });
  if (elite) {
    poser('elite', {
      type: 'affiche', modele: 'jour', theme: TH, lieu: elite.dom ? 'dom' : 'ext', titre: 'Aujourd’hui', suite: '',
      salleDom: 'Salle Alexandre-Cheruel – Rouxmesnil',
      lignes: [{ heure: elite.d.length >= 16 ? elite.d.slice(11, 16).replace(':', 'H') : '', jourCourt: 'SAM.', code: 'U18 filles', adv: 'Cherbourg Basket Ball', sig: elite.sig || 'C', logo: elite.logo || '', salle: '' }]
    }, function (svg) {
      remplacer(svg, 'RENDEZ-VOUS', 'PREMIER MATCH', 736);
      remplacer(svg, 'DU WEEK-END', 'EN ÉLITE', 736);
    });
  }

  /* 2. Le diaporama des résultats du samedi 31 octobre : les trois matchs de championnat joués ce jour-là. */
  var EQUIPES = [
    { id: 'dfu18', code: 'DFU18' },
    { id: 'u15f', code: 'DFU15' },
    { id: 'u13f', code: 'DFU13', sansScore: true }
  ];
  var JOUR = '2026-10-31', joues = [];
  EQUIPES.forEach(function (e) {
    var eq = D && D.equipes && D.equipes[e.id]; if (!eq || !eq.matchs) return;
    eq.matchs.forEach(function (m) { if (m.d.slice(0, 10) === JOUR && m.s) joues.push({ e: e, m: m }); });
  });
  if (joues.length) {
    var v = joues.filter(function (x) { return x.m.s[0] > x.m.s[1]; }).length, n = joues.length;
    var phrase = n + ' MATCHS DE CHAMPIONNAT, ' + v + (v > 1 ? ' VICTOIRES' : ' VICTOIRE');
    poser('res-couverture', { type: 'affiche', modele: 'couverture', mode: 'res', theme: TH, dates: 'Samedi 31 octobre 2026', compte: { v: v, n: n } }, function (svg) {
      /* « 3 VICTOIRES SUR 3 MATCHS » devient « 3 MATCHS DE CHAMPIONNAT, 3 VICTOIRES » (les coupes ne sont pas dans le relevé). */
      var avant = v + (v > 1 ? ' VICTOIRES' : ' VICTOIRE') + ' SUR ' + n + (n > 1 ? ' MATCHS' : ' MATCH');
      var els = textes(svg, avant); if (!els.length) return;
      var t = els[0], x0 = parseFloat(t.getAttribute('x')) - 84;
      remplacer(svg, avant, phrase, W - 160 - 100);
      var z = parseFloat(t.getAttribute('font-size')), w = largeur(phrase, z, true, 1), nx0 = Math.round((W - (84 + w)) / 2);
      t.setAttribute('x', String(nx0 + 84));
      /* Le petit ballon à gauche de la phrase suit le texte. */
      [].forEach.call(svg.querySelectorAll('path[transform]'), function (p) {
        var mm = /^translate\(([-\d.]+) ([-\d.]+)\) scale\(0\.66\)$/.exec(p.getAttribute('transform'));
        if (mm && Math.abs(parseFloat(mm[1]) - x0) < 1.5) p.setAttribute('transform', 'translate(' + nx0 + ' ' + mm[2] + ') scale(0.66)');
      });
    });
    /* Une image pour le samedi : les trois matchs, l'un sous l'autre, comme l'image d'une journée des affiches du club. */
    var lignes = joues.map(function (x) {
      var m = x.m, e = x.e, sans = !!e.sansScore;
      return { heure: '', jourCourt: 'SAM.', code: e.code, adv: m.adv, sig: m.sig || '', logo: m.logo || '',
        bcr: sans ? '' : m.s[0], ad: sans ? '' : m.s[1], v: m.s[0] > m.s[1] ? true : m.s[0] < m.s[1] ? false : null,
        lieuTxt: m.dom ? 'À domicile' : 'À l\'extérieur' };
    });
    var avecSans = joues.some(function (x) { return x.e.sansScore; });
    poser('res-samedi', { type: 'affiche', modele: 'resultats', theme: TH, titre: 'Samedi 31 octobre', suite: '', resume: v + (v > 1 ? ' victoires' : ' victoire'), lignes: lignes }, avecSans ? function (svg) {
      /* Grand écart chez des jeunes : « victoire », sans le score, sur la seule carte des U13 filles. */
      var vide = [].filter.call(svg.querySelectorAll('text'), function (t) { return t.textContent.trim() === '-'; });
      if (!vide.length) return;
      var y = parseFloat(vide[0].getAttribute('y')), z = parseFloat(vide[0].getAttribute('font-size'));
      var vic = null, ecart = Infinity;
      textes(svg, 'VICTOIRE').forEach(function (t) { var d = parseFloat(t.getAttribute('y')) - y; if (d > 0 && d < ecart) { ecart = d; vic = t; } });
      if (!vic) return;
      vide.forEach(function (t) { t.remove(); });
      var zz = Math.min(40, Math.round(z * .62));
      vic.setAttribute('font-size', String(zz)); vic.setAttribute('y', String(Math.round(y - z * .39 + zz * .36)));
      vic.setAttribute('letter-spacing', '2');
    } : null);
  }
})();
