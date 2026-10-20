/* Actions de la mascotte dans l'ouverture : une action tirée au hasard à chaque visite (tir à 3 points, tir après
   un pas en arrière, dunk à une main, dunk à deux mains suspendu au cercle), puis la fête du panier : la mascotte se
   tourne vers le visiteur, fait un clin d'œil et le ballon revient tourner sur son doigt, comme sur la couverture du
   calendrier. Pour montrer une action précise : ?action=trois-points, pas-arriere, dunk ou dunk-suspendu.

   Règles du basket respectées : les jambes sont calculées à partir de la position des pieds, donc un pied posé reste
   fixe au sol (aucun glissement) ; on ne se déplace qu'en dribblant ; après avoir pris le ballon en main, au plus deux
   appuis avant de tirer ou de sauter (ou un arrêt sur les deux pieds), et le ballon est lâché avant de retomber. */
(function(){
  if (!document.documentElement.classList.contains('avec-mascotte') || !window.Joueuse || !window.Mascotte) return;
  var J = window.Joueuse, P = J.P, M = window.Mascotte, S = 0.86;
  var CUISSE = 50, TIBIA = 48, PIED = 9, CHEV = J.SOL - PIED * S;   /* CHEV : hauteur d'une cheville posée au sol */
  var CERCLE = [520, 101], SOL_B = J.SOL - 12, BOUT = 17, DEBOUT = 318, ACCROUPI = 334;
  var ACTIONS = ['trois-points', 'pas-arriere', 'dunk', 'dunk-suspendu'];
  var HAUT = ['tronc', 'tete', 'brasA', 'avantA', 'brasB', 'avantB', 'queue', 'face', 'index', 'dessus', 'ecr'];

  function rad(a){ return a * Math.PI / 180; }
  function deg(a){ return a * 180 / Math.PI; }
  /* Haut du corps d'une posture (bras, tronc, tête, queue), sans les jambes. */
  function haut(p, extra){ var o = {}; HAUT.forEach(function(k){ if (p[k] !== undefined) o[k] = p[k]; }); return Object.assign(o, extra || {}); }

  /* Jambe : angles de la cuisse et du tibia pour que la cheville soit à (dx, dy) de la hanche, genou vers l'avant. */
  function jambe(dx, dy){
    var D = Math.sqrt(dx * dx + dy * dy); D = Math.max(10, Math.min(CUISSE + TIBIA - 0.4, D));
    var a0 = Math.atan2(-dx, dy);
    var al = Math.acos((CUISSE * CUISSE + D * D - TIBIA * TIBIA) / (2 * CUISSE * D));
    var be = Math.acos((TIBIA * TIBIA + D * D - CUISSE * CUISSE) / (2 * TIBIA * D));
    var c = a0 - al, t = al + be;
    return { c: deg(c), t: deg(t), y: CUISSE * Math.cos(c) + TIBIA * Math.cos(c + t) };
  }
  /* Position de la main avant par rapport aux hanches (mêmes mesures que js/joueuse.js). */
  function mainLocale(h){
    function tourne(v, a){ var c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [v[0]*c - v[1]*s, v[0]*s + v[1]*c]; }
    var e = h.ecr || 0, co = tourne([0, 33], h.brasA), m = tourne([0, 37], h.brasA + h.avantA);
    return tourne([(3 + co[0] + m[0]) * (1 + e), (-74 + co[1] + m[1]) * (1 - e)], h.tronc);
  }
  /* Hanches à placer pour que le ballon tenu par la main avant (ou la main seule) arrive au point voulu. */
  function hanchesPourBallon(h, bx, by){ var m = mainLocale(h); return { hx: bx - (m[0] * S + 4), hy: by - (m[1] * S + 9) }; }
  function hanchesPourMain(h, mx, my){ var m = mainLocale(h); return { hx: mx - m[0] * S, hy: my - m[1] * S }; }

  /* État complet de la mascotte : hanches (hx, hy), pieds (x et hauteur au-dessus du sol), haut du corps. */
  function etatDepart(){
    return Object.assign({ hx: 150, hy: DEBOUT, ax: 164, al: 0, bx: 136, bl: 0, pA: 0, pB: 0, face: 0, index: 0, dessus: 0, ecr: 0 }, haut(P.garde));
  }
  function construire(c){
    var la = jambe((c.ax - c.hx) / S, (CHEV - c.al - c.hy) / S), lb = jambe((c.bx - c.hx) / S, (CHEV - c.bl - c.hy) / S);
    var p = haut(c, { x: c.hx, cuisseA: la.c, tibiaA: la.t, cuisseB: lb.c, tibiaB: lb.t, pointeA: c.pA, pointeB: c.pB });
    p.saut = (J.SOL - (Math.max(la.y, lb.y) + PIED) * S) - c.hy;
    return p;
  }
  function bout(p){
    var m = J.main(p), a = rad(p.tronc + p.brasA + p.avantA);
    return [m[0] - Math.sin(a) * BOUT * S, m[1] + Math.cos(a) * BOUT * S];
  }

  var F = {
    course:   { tronc: 22, tete: -10, brasA: -14, avantA: -10, brasB: -40, avantB: -70, queue: 20 },
    courseH:  { tronc: 22, tete: -10, brasA: -30, avantA: -44, brasB: -36, avantB: -66, queue: 8 },
    envol1:   { tronc: 12, tete: -6, brasA: -124, avantA: -18, brasB: -70, avantB: -40, queue: -30 },
    smash1:   { tronc: 18, tete: -10, brasA: -96, avantA: -46, brasB: -40, avantB: -30, queue: -20 },
    envol2:   { tronc: 8, tete: -4, brasA: -132, avantA: -20, brasB: -128, avantB: -24, queue: -34 },
    smash2:   { tronc: 16, tete: -8, brasA: -110, avantA: -40, brasB: -106, avantB: -42, queue: -24 },
    suspendu: { tronc: -8, tete: 4, brasA: -122, avantA: -8, brasB: -124, avantB: -6, queue: 26 },
    balance:  { tronc: -14, tete: 6, brasA: -124, avantA: -4, brasB: -126, avantB: -2, queue: -10 },
    atterri:  { tronc: 8, tete: -4, brasA: -40, avantA: -30, brasB: -50, avantB: -30, queue: 30 },
    fete:     { tronc: 2, tete: 0, brasA: -92, avantA: -82, brasB: 26, avantB: -78, queue: 22, face: 1, index: 1, dessus: 1 }
  };

  function choisir(){
    var m = /[?&]action=([a-z-]+)/.exec(location.search);
    if (m && ACTIONS.indexOf(m[1]) >= 0) return m[1];
    return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  }

  /* Scène fixe (visiteur qui demande moins de mouvement) : la mascotte de face, ballon sur le doigt. */
  function fixe(){
    var c = Object.assign(etatDepart(), F.fete, { hx: 300, ax: 310, bx: 290 });
    M.regler(true, true, true);
    var p = construire(c); J.poser(p);
    var b = bout(p);
    document.getElementById('j-ballon').setAttribute('transform', 'translate(' + b[0].toFixed(1) + ' ' + (b[1] - 12).toFixed(1) + ')');
    var t = document.getElementById('trajet'); if (t) t.style.opacity = 0;
  }

  function jouer(tl, A){
    var nom = choisir();
    var c = etatDepart(), e = { d: 0, v: 0, r: 0, tour: 0, s: 0, a: 0 }, pose = construire(c);
    var mode = 'main', dep = null, ctrl = null, depR = null;
    var trajet = document.getElementById('trajet');
    document.documentElement.setAttribute('data-action', nom);
    window.MascotteSuivi = { etat: c, mode: function(){ return mode; } };   /* lu par les contrôles automatiques */

    /* Ballon façon dessin animé : il s'étire dans le sens de sa course quand il va vite, et s'écrase au contact du
       sol pendant le dribble (déformation autour du point de contact, le bas du ballon reste au sol). */
    var dern = null, etir = { s: 0, a: 0 };
    function placer(x, y){
      var now = performance.now(), tr = 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')';
      if (!dern) dern = { x: x, y: y, t: now };
      else if (now - dern.t > 8) {
        var dt = now - dern.t, vx = (x - dern.x) / dt, vy = (y - dern.y) / dt;
        etir.s = Math.min(0.22, Math.sqrt(vx * vx + vy * vy) * 0.3); etir.a = deg(Math.atan2(vy, vx));
        dern = { x: x, y: y, t: now };
      }
      var sol = mode === 'dribble' ? Math.max(0, (e.d - 0.88) / 0.12) : 0;
      if (sol > 0) tr = 'translate(' + x.toFixed(1) + ' ' + (y + 12).toFixed(1) + ') scale(' + (1 + 0.24 * sol).toFixed(3) + ' ' + (1 - 0.3 * sol).toFixed(3) + ') translate(0 -12)';
      else if (etir.s > 0.02 && mode !== 'main' && mode !== 'doigt') tr += ' rotate(' + etir.a.toFixed(1) + ') scale(' + (1 + etir.s).toFixed(3) + ' ' + (1 - etir.s * 0.7).toFixed(3) + ') rotate(' + (-etir.a).toFixed(1) + ')';
      A.ballon.setAttribute('transform', tr);
      var h = Math.max(0, Math.min(1, (SOL_B - y) / 220));
      A.bOmbre.setAttribute('cx', x.toFixed(1));
      A.bOmbre.setAttribute('opacity', (mode === 'main' || mode === 'doigt' ? 0 : 0.45 * (1 - h)).toFixed(2));
    }
    function maj(){
      M.regler(c.face > 0.5, c.index > 0.5, c.dessus > 0.5);
      pose = construire(c); J.poser(pose);
      var m, k;
      if (mode === 'main') { m = J.main(pose); placer(m[0] + 4, m[1] + 9); }
      else if (mode === 'dribble') { m = J.main(pose); placer(m[0] + 4, m[1] + 9 + (SOL_B - m[1] - 9) * e.d); }
      else if (mode === 'vol') { k = e.v; placer((1-k)*(1-k)*dep[0] + 2*(1-k)*k*ctrl[0] + k*k*CERCLE[0], (1-k)*(1-k)*dep[1] + 2*(1-k)*k*ctrl[1] + k*k*CERCLE[1]); }
      else if (mode === 'retour' || mode === 'doigt') {
        var b = bout(pose), arr = [b[0], b[1] - 12];
        if (mode === 'doigt') placer(arr[0], arr[1]);
        else { k = e.r; var q = [(depR[0] + arr[0]) / 2, Math.min(depR[1], arr[1]) - 150];
          placer((1-k)*(1-k)*depR[0] + 2*(1-k)*k*q[0] + k*k*arr[0], (1-k)*(1-k)*depR[1] + 2*(1-k)*k*q[1] + k*k*arr[1]); }
      }
      A.rotB.setAttribute('transform', 'rotate(' + (e.tour % 360).toFixed(1) + ')');
    }
    function compte(){ A.sc.textContent = Math.round(e.s); A.adv.textContent = Math.round(e.a); }
    function k(t, d, props, ez){ tl.to(c, Object.assign({}, props, { duration: d, ease: ez || 'power1.inOut', onUpdate: maj }), t); }
    function passe(m, t){ tl.call(function(){ mode = m; maj(); }, null, t); }
    /* Un pas : le pied quitte le sol, avance, se repose ; l'autre pied reste fixe. */
    function pas(pied, x, t, d, h){
      var o = {}; o[pied + 'x'] = x; k(t, d, o, 'power1.inOut');
      var u = {}; u[pied + 'l'] = h || 14; k(t, d / 2, u, 'power1.out');
      var b = {}; b[pied + 'l'] = 0; k(t + d / 2, d / 2, b, 'power1.in');
    }
    /* Un dribble pendant un pas : la main pousse le ballon au sol puis le reprend. */
    function dribble(t, d){
      tl.to(e, { d: 1, duration: d / 2, ease: 'power2.in', onUpdate: maj }, t)
        .to(e, { d: 0, duration: d / 2, ease: 'power2.out', onUpdate: maj }, t + d / 2);
      k(t, d / 2, haut(F.course), 'power1.in'); k(t + d / 2, d / 2, haut(F.courseH), 'power1.out');
    }
    /* Une foulée en dribblant : le pied « pied » va en x, les hanches avancent en hx. */
    function foulee(t, d, pied, x, hx, h){ pas(pied, x, t, d, h); k(t, d, { hx: hx }, 'none'); dribble(t, d); }
    /* Tir en extension, pieds fixes : flexion, détente, lâcher en l'air, retombée sur place. Renvoie l'heure du panier. */
    /* Clignement d'œil (paupière qui descend puis remonte). */
    function cligne(t, sel){
      tl.fromTo(sel, { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: 0.07, ease: 'power1.in', yoyo: true, repeat: 1, transformOrigin: '50% 0%' }, t);
    }
    /* Petit nuage de poussière aux pieds, à la réception d'un saut (x lu au moment voulu, les pieds étant fixes). */
    function poussiere(t, fort){
      tl.call(function(){ document.getElementById('poussiere').setAttribute('transform', 'translate(' + ((c.ax + c.bx) / 2 + 6).toFixed(1) + ' 0)'); }, null, t)
        .fromTo('#poussiere ellipse', { opacity: fort ? 0.9 : 0.75, scale: 0.4, x: 0, transformOrigin: '50% 50%' },
          { opacity: 0, scale: fort ? 1.7 : 1.3, x: function(i){ return (i - 1) * (fort ? 24 : 14); }, duration: 0.6, ease: 'power2.out', immediateRender: false }, t);
    }
    /* Tir en extension, pieds fixes : préparation (le corps se tasse), détente (il s'étire), lâcher en l'air,
       retombée sur place avec un léger rebond. Renvoie l'heure du panier. */
    function tir(t){
      k(t, 0.22, Object.assign(haut(P.appel), { hy: ACCROUPI + 3, ecr: 0.08 }), 'power2.in');
      k(t + 0.22, 0.3, Object.assign(haut(P.detente), { hy: DEBOUT - 48, pA: 38, pB: 30, ecr: -0.08 }), 'power2.out');
      k(t + 0.52, 0.14, Object.assign(haut(P.lacher), { ecr: -0.03 }), 'power1.out');
      tl.call(function(){
        var m = J.main(pose); dep = [m[0] + 4, m[1] + 9];
        ctrl = [(dep[0] + CERCLE[0]) / 2 + 10, Math.min(dep[1], CERCLE[1]) - 170];
        trajet.setAttribute('d', 'M' + dep[0].toFixed(1) + ' ' + dep[1].toFixed(1) + ' Q' + ctrl[0].toFixed(1) + ' ' + ctrl[1].toFixed(1) + ' ' + CERCLE[0] + ' ' + CERCLE[1]);
        mode = 'vol';
      }, null, t + 0.66);
      tl.to(e, { v: 1, tour: 720, duration: 1.15, ease: 'none', onUpdate: maj }, t + 0.66)
        .fromTo(trajet, { opacity: 0 }, { opacity: 1, duration: 0.5 }, t + 0.72);
      k(t + 0.7, 0.32, Object.assign(haut(P.reception), { hy: ACCROUPI - 4, pA: 0, pB: 0, ecr: 0.07 }), 'power2.in');
      poussiere(t + 0.98, false);
      k(t + 1.02, 0.5, Object.assign(haut(P.fin), { hy: DEBOUT, ecr: 0 }), 'back.out(2)');
      return t + 1.81;
    }
    /* Le ballon traverse le filet ; le tableau prend les points ; le ballon tombe au sol. */
    function filet(t, fort){
      tl.call(function(){ mode = 'libre'; maj(); }, null, t)
        .to(A.ballon, { attr: { transform: 'translate(520 150)' }, duration: 0.2, ease: 'none' }, t)
        .fromTo(A.filet, { scaleY: 1 }, { scaleY: fort ? 1.32 : 1.18, svgOrigin: '520 104', duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.out' }, t + 0.03)
        .fromTo('.cercle-av', { stroke: '#ff6a1a' }, { stroke: '#ffd2a8', duration: 0.12, yoyo: true, repeat: 1 }, t + 0.01)
        .fromTo('#eclat', { opacity: 1, scale: 0.7, svgOrigin: '520 116' }, { opacity: 0, scale: fort ? 1.35 : 1.2, svgOrigin: '520 116', duration: 0.55, ease: 'power2.out', immediateRender: false }, t + 0.04)
        .to(e, { s: 78, duration: 0.3, ease: 'none', onUpdate: compte }, t + 0.06)
        .fromTo('.tableau', { boxShadow: '0 18px 40px rgba(0,0,0,.45)' }, { boxShadow: '0 0 0 3px #46c46f, 0 18px 40px rgba(0,0,0,.45)', duration: 0.25, yoyo: true, repeat: 1 }, t + 0.06)
        .to(A.ballon, { attr: { transform: 'translate(522 ' + SOL_B + ')' }, duration: 0.42, ease: 'power2.in', onUpdate: function(){
          var m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(A.ballon.getAttribute('transform'));
          if (m) { A.bOmbre.setAttribute('cx', m[1]); A.bOmbre.setAttribute('opacity', (0.45 * (1 - Math.min(1, (SOL_B - m[2]) / 220))).toFixed(2)); } } }, t + 0.2)
        /* Le ballon s'écrase en touchant le parquet, puis reprend sa forme. */
        .set(A.ballon, { attr: { transform: 'translate(522 ' + (SOL_B + 12) + ') scale(1.3 0.7) translate(0 -12)' } }, t + 0.62)
        .set(A.ballon, { attr: { transform: 'translate(522 ' + (SOL_B + 12) + ') scale(0.92 1.08) translate(0 -12)' } }, t + 0.67)
        .set(A.ballon, { attr: { transform: 'translate(522 ' + SOL_B + ')' } }, t + 0.71);
      return t + 0.62;
    }
    /* La fête, pieds fixes : la mascotte se tourne vers le visiteur, le ballon rebondit jusqu'à son doigt et y tourne. */
    function fete(t){
      if (traits.length) tl.call(function(){ traits.forEach(function(el){ el.setAttribute('filter', el.getAttribute('data-filtre')); }); }, null, t);
      k(t, 0.4, Object.assign({}, F.fete, { hy: DEBOUT, ecr: 0 }), 'back.out(1.6)');
      /* La queue remue de contentement, puis l'œil ouvert cligne une fois. */
      tl.to(c, { queue: 38, duration: 0.16, ease: 'sine.inOut', yoyo: true, repeat: 5, onUpdate: maj }, t + 0.45);
      cligne(t + 2.3, '.m-face .m-paupiere');
      tl.call(function(){ depR = [522, SOL_B]; mode = 'retour'; e.r = 0; maj(); }, null, t)
        .to(e, { r: 1, tour: '+=540', duration: 0.95, ease: 'power1.inOut', onUpdate: maj }, t)
        .call(function(){ mode = 'doigt'; maj(); }, null, t + 0.95)
        .to(e, { tour: '+=2160', duration: 3.2, ease: 'power2.out', onUpdate: maj }, t + 0.95)
        .to(trajet, { opacity: 0, duration: 0.4 }, t);
    }

    /* Petits écrans : les contours intérieurs (filtres) sont coupés pendant l'action, puis remis pour la fête ;
       le liseré crème reste. Coût de dessin divisé par 2,4 (mesure de l'examen du 19/10). */
    var traits = matchMedia('(max-width: 899px), (pointer: coarse)').matches ? Array.prototype.slice.call(document.querySelectorAll('#j-racine [filter]')) : [];
    traits.forEach(function(el){ el.setAttribute('data-filtre', el.getAttribute('filter')); el.removeAttribute('filter'); });
    tl.set(trajet, { opacity: 0 }, 0);
    tl.set('.m-paupiere', { scaleY: 0, transformOrigin: '50% 0%' }, 0);
    maj(); tl.call(maj, null, 0.01);
    cligne(0.75, '.m-profil .m-paupiere');
    passe('dribble', 1.0);
    var tb, h, cible, h2;
    if (nom === 'trois-points') {
      /* Deux pas en dribblant ; ballon pris pied avant posé ; un seul appui (le pied arrière revient à côté) ; tir. */
      tl.to(e, { s: 75, a: 57, duration: 2.2, ease: 'power1.out', onUpdate: compte }, 1.0);
      foulee(1.0, 0.5, 'b', 194, 180);
      foulee(1.5, 0.5, 'a', 222, 208);
      passe('main', 2.0); k(2.0, 0.24, haut(P.prise), 'power1.out');
      pas('b', 236, 2.04, 0.3, 10); k(2.04, 0.3, { hx: 228 }, 'power1.inOut');
      tb = tir(2.36);
    } else if (nom === 'pas-arriere') {
      /* Trois pas en dribblant vers la ligne ; le dernier dribble dure pendant le saut en arrière ; ballon pris à la
         réception sur les deux pieds (arrêt simultané) ; tir sans bouger les pieds, derrière la ligne à 3 points. */
      tl.to(e, { s: 75, a: 57, duration: 2.2, ease: 'power1.out', onUpdate: compte }, 1.0);
      foulee(1.0, 0.42, 'b', 198, 184);
      foulee(1.42, 0.42, 'a', 236, 220);
      foulee(1.84, 0.4, 'b', 266, 252);
      dribble(2.24, 0.38);
      k(2.3, 0.32, { ax: 198, bx: 214, hx: 206 }, 'power2.out');
      k(2.3, 0.16, { al: 12, bl: 16, hy: DEBOUT - 8, ecr: -0.04 }, 'power1.out'); k(2.46, 0.16, { al: 0, bl: 0, hy: DEBOUT, ecr: 0.05 }, 'power1.in');
      poussiere(2.6, false);
      passe('main', 2.62); k(2.62, 0.16, haut(P.prise), 'power1.out');
      tb = tir(2.74);
    } else {
      /* Course en dribblant ; le ballon est pris en fin de dribble. */
      tl.to(e, { s: 76, a: 57, duration: 2.0, ease: 'power1.out', onUpdate: compte }, 1.0);
      foulee(1.0, 0.32, 'b', 212, 192, 20);
      foulee(1.32, 0.32, 'a', 286, 266, 20);
      if (nom === 'dunk') {
        pas('b', 346, 1.64, 0.32, 22); k(1.64, 0.32, { hx: 330 }, 'none'); dribble(1.64, 0.22);
        passe('main', 1.86); k(1.86, 0.12, haut(P.prise), 'power1.out');
        /* Prise pied arrière posé, puis deux appuis : pied avant, pied arrière, impulsion, dunk à une main. */
        pas('a', 404, 1.98, 0.24, 18); k(1.98, 0.24, Object.assign(haut(P.appel), { hx: 392, hy: ACCROUPI - 6, ecr: 0.09 }), 'power1.in');
        h = hanchesPourBallon(Object.assign({}, F.envol1, { ecr: -0.1 }), 506, 62);
        k(2.22, 0.42, Object.assign({}, F.envol1, { hx: h.hx, hy: h.hy, bx: h.hx + 22, bl: CHEV - (h.hy + 52 * S), pA: 40, pB: 20, ecr: -0.1 }), 'power2.out');
        cible = hanchesPourBallon(Object.assign({}, F.smash1, { ecr: -0.04 }), 520, 112);
        k(2.64, 0.14, Object.assign({}, F.smash1, { hx: cible.hx, hy: cible.hy, ax: cible.hx - 30, bx: cible.hx + 18, bl: CHEV - (cible.hy + 60 * S), ecr: -0.04 }), 'power2.in');
        tb = filet(2.78, true);
        k(2.78, 0.16, { ax: 482, bx: 462, al: 30, bl: 30 }, 'power1.out');
        k(2.78, 0.42, Object.assign({}, F.atterri, { hx: 472, hy: ACCROUPI, pA: 0, pB: 0, ecr: 0.11 }), 'power2.in');
        k(2.94, 0.26, { al: 0, bl: 0 }, 'power2.in');
        poussiere(3.14, true);
        k(3.2, 0.3, { hy: DEBOUT, ecr: 0 }, 'back.out(2.2)');
        tb = Math.max(tb, 3.4);
      } else {
        /* Ballon pris en l'air, réception sur les deux pieds en même temps (arrêt simultané), impulsion à deux pieds,
           dunk à deux mains ; la mascotte se tient un instant au cercle puis se laisse retomber. */
        /* Dernier dribble au début du bond, ballon pris en l'air, réception sur les deux pieds en même temps. */
        dribble(1.64, 0.22);
        passe('main', 1.86); k(1.86, 0.12, haut(P.prise), 'power1.out');
        k(1.64, 0.56, { ax: 404, bx: 390, hx: 392 }, 'power1.inOut');
        k(1.64, 0.28, { al: 24, bl: 18, hy: DEBOUT - 14 }, 'power1.out'); k(1.92, 0.28, { al: 0, bl: 0, hy: DEBOUT }, 'power1.in');
        k(2.2, 0.16, Object.assign(haut(P.prise), { hy: ACCROUPI + 4, ecr: 0.1 }), 'power2.in');
        h = hanchesPourBallon(Object.assign({}, F.envol2, { ecr: -0.1 }), 504, 66);
        k(2.36, 0.44, Object.assign({}, F.envol2, { hx: h.hx, hy: h.hy, ax: h.hx + 18, al: CHEV - (h.hy + 60 * S), bx: h.hx + 6, bl: CHEV - (h.hy + 64 * S), pA: 30, pB: 30, ecr: -0.1 }), 'power2.out');
        cible = hanchesPourBallon(Object.assign({}, F.smash2, { ecr: -0.04 }), 520, 110);
        k(2.8, 0.14, Object.assign({}, F.smash2, { hx: cible.hx, hy: cible.hy, ecr: -0.04 }), 'power2.in');
        tb = filet(2.94, true);
        h = hanchesPourMain(Object.assign({}, F.suspendu, { ecr: -0.06 }), 503, 103);
        k(2.94, 0.16, Object.assign({}, F.suspendu, { hx: h.hx, hy: h.hy, ax: h.hx + 8, al: CHEV - (h.hy + 96 * S), bx: h.hx - 4, bl: CHEV - (h.hy + 96 * S), ecr: -0.06 }), 'power1.out');
        tl.to('.cercle-av, .cercle-ar, #filet', { rotation: -9, svgOrigin: '542 104', duration: 0.16, ease: 'power2.out' }, 2.96)
          .to('.cercle-av, .cercle-ar, #filet', { rotation: 0, svgOrigin: '542 104', duration: 0.5, ease: 'elastic.out(1, 0.35)' }, 3.46);
        /* Prise momentanée du cercle (tolérée après un dunk), sans balancement. */
        k(3.46, 0.14, { ax: 476, bx: 456, al: 30, bl: 30 }, 'power1.out');
        k(3.46, 0.36, Object.assign({}, F.atterri, { hx: 466, hy: ACCROUPI, pA: 0, pB: 0, ecr: 0.11 }), 'power2.in');
        k(3.6, 0.22, { al: 0, bl: 0 }, 'power2.in');
        poussiere(3.78, true);
        k(3.82, 0.3, { hy: DEBOUT, ecr: 0 }, 'back.out(2.2)');
        tb = Math.max(tb, 4.0);
      }
    }
    if (nom === 'trois-points' || nom === 'pas-arriere') tb = filet(tb, false);
    fete(tb + 0.1);
  }

  window.MascotteActions = { jouer: jouer, fixe: fixe, actions: ACTIONS };
})();
