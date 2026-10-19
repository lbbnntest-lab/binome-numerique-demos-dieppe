/* Actions de la mascotte dans l'ouverture : une action tirée au hasard à chaque visite (tir à 3 points, tir après
   un pas en arrière, dunk à une main, dunk à deux mains suspendu au cercle), puis la fête du panier : la mascotte se
   tourne vers le visiteur, fait un clin d'œil et le ballon revient tourner sur son doigt, comme sur la couverture du
   calendrier. Pour montrer une action précise : ?action=trois-points, pas-arriere, dunk ou dunk-suspendu. */
(function(){
  if (!document.documentElement.classList.contains('avec-mascotte') || !window.Joueuse || !window.Mascotte) return;
  var J = window.Joueuse, P = J.P, M = window.Mascotte, S = 0.86;
  var CERCLE = [520, 101], SOL_B = J.SOL - 12, BOUT = 17;
  var ACTIONS = ['trois-points', 'pas-arriere', 'dunk', 'dunk-suspendu'];

  function base(p, extra){ return Object.assign({ saut: 0, pointeA: 0, pointeB: 0 }, p, extra || {}); }
  /* Place le corps pour que la main avant (ou le ballon qu'elle tient) arrive au point voulu. */
  function ajuster(p, tx, ty, avecBallon){
    var q = base(p, { x: 0, saut: 0 }), m = J.main(q), ox = avecBallon ? 4 : 0, oy = avecBallon ? 9 : 0;
    p.x = tx - (m[0] + ox); p.saut = (m[1] + oy) - ty; return p;
  }
  /* Bout de l'index levé (main avant), pour poser le ballon dessus. */
  function bout(p){
    var m = J.main(p), a = (p.tronc + p.brasA + p.avantA) * Math.PI / 180;
    return [m[0] - Math.sin(a) * BOUT * S, m[1] + Math.cos(a) * BOUT * S];
  }

  /* Postures propres aux actions (les angles suivent les conventions de js/joueuse.js). */
  var F = {
    course1:  base(P.dribbleB, { tronc: 26, cuisseA: -48, tibiaA: 60, cuisseB: 30, tibiaB: 50 }),
    course2:  base(P.dribbleH, { tronc: 24, cuisseA: 20, tibiaA: 40, cuisseB: -44, tibiaB: 56 }),
    recul:    base(P.prise, { tronc: -6, tete: 2, cuisseA: -6, tibiaA: 24, cuisseB: 34, tibiaB: 28, saut: 16, queue: 30 }),
    envol1:   base({ tronc: 12, tete: -6, brasA: -124, avantA: -18, brasB: -70, avantB: -40, cuisseA: -78, tibiaA: 104, cuisseB: 22, tibiaB: 46, queue: -30 }),
    smash1:   base({ tronc: 18, tete: -10, brasA: -96, avantA: -46, brasB: -40, avantB: -30, cuisseA: -50, tibiaA: 80, cuisseB: 16, tibiaB: 50, queue: -20 }),
    envol2:   base({ tronc: 8, tete: -4, brasA: -132, avantA: -20, brasB: -128, avantB: -24, cuisseA: -64, tibiaA: 96, cuisseB: -30, tibiaB: 90, queue: -34 }),
    smash2:   base({ tronc: 16, tete: -8, brasA: -110, avantA: -40, brasB: -106, avantB: -42, cuisseA: -40, tibiaA: 70, cuisseB: -20, tibiaB: 66, queue: -24 }),
    suspendu: base({ tronc: -8, tete: 4, brasA: -122, avantA: -8, brasB: -124, avantB: -6, cuisseA: -16, tibiaA: 22, cuisseB: 12, tibiaB: 26, pointeA: 30, pointeB: 26, queue: 26 }),
    balance:  base({ tronc: -14, tete: 6, brasA: -124, avantA: -4, brasB: -126, avantB: -2, cuisseA: 14, tibiaA: 30, cuisseB: 30, tibiaB: 34, pointeA: 30, pointeB: 26, queue: -10 }),
    atterri:  base(P.reception, { brasA: -40, avantA: -30, brasB: -50, avantB: -30 }),
    fete:     base({ tronc: 2, tete: 0, brasA: -92, avantA: -82, brasB: 26, avantB: -78, cuisseA: -10, tibiaA: 16, cuisseB: 12, tibiaB: 12, queue: 22, face: 1, index: 1, dessus: 1 })
  };

  function choisir(){
    var m = /[?&]action=([a-z-]+)/.exec(location.search);
    if (m && ACTIONS.indexOf(m[1]) >= 0) return m[1];
    return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  }

  /* Scène fixe (visiteur qui demande moins de mouvement) : la mascotte de face, ballon sur le doigt. */
  function fixe(){
    var p = base(F.fete, { x: 300 });
    M.regler(true, true, true);
    J.poser(p);
    var b = bout(p);
    document.getElementById('j-ballon').setAttribute('transform', 'translate(' + b[0].toFixed(1) + ' ' + (b[1] - 12).toFixed(1) + ')');
    var t = document.getElementById('trajet'); if (t) t.style.opacity = 0;
  }

  function jouer(tl, A){
    var nom = choisir(), dunk = nom.indexOf('dunk') === 0;
    var pose = base(P.garde, { face: 0, index: 0, dessus: 0 });
    var e = { d: 0, v: 0, r: 0, tour: 0, s: 0, a: 0 };
    var mode = 'main', dep = null, ctrl = null, depR = null;
    var trajet = document.getElementById('trajet');
    document.documentElement.setAttribute('data-action', nom);

    function placer(x, y){
      A.ballon.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      var h = Math.max(0, Math.min(1, (SOL_B - y) / 220));
      A.bOmbre.setAttribute('cx', x.toFixed(1));
      A.bOmbre.setAttribute('opacity', (mode === 'main' || mode === 'doigt' ? 0 : 0.45 * (1 - h)).toFixed(2));
    }
    function maj(){
      M.regler(pose.face > 0.5, pose.index > 0.5, pose.dessus > 0.5);
      J.poser(pose);
      var m, k;
      if (mode === 'main') { m = J.main(pose); placer(m[0] + 4, m[1] + 9); }
      else if (mode === 'dribble') { m = J.main(pose); placer(m[0] + 4, m[1] + 9 + (SOL_B - m[1] - 9) * e.d); }
      else if (mode === 'vol') { k = e.v; placer((1-k)*(1-k)*dep[0] + 2*(1-k)*k*ctrl[0] + k*k*CERCLE[0], (1-k)*(1-k)*dep[1] + 2*(1-k)*k*ctrl[1] + k*k*CERCLE[1]); }
      else if (mode === 'retour' || mode === 'doigt') {
        var b = bout(pose), arr = [b[0], b[1] - 12];
        if (mode === 'doigt') placer(arr[0], arr[1]);
        else { k = e.r; var c = [(depR[0] + arr[0]) / 2, Math.min(depR[1], arr[1]) - 150];
          placer((1-k)*(1-k)*depR[0] + 2*(1-k)*k*c[0] + k*k*arr[0], (1-k)*(1-k)*depR[1] + 2*(1-k)*k*c[1] + k*k*arr[1]); }
      }
      A.rotB.setAttribute('transform', 'rotate(' + (e.tour % 360).toFixed(1) + ')');
    }
    function compte(){ A.sc.textContent = Math.round(e.s); A.adv.textContent = Math.round(e.a); }
    function vers(p, d, ez, t){ tl.to(pose, Object.assign({}, p, { duration: d, ease: ez || 'power1.inOut', onUpdate: maj }), t); }
    function passe(m, t){ tl.call(function(){ mode = m; maj(); }, null, t); }
    function dribble(t, xb, xh, d){
      vers(base(P.dribbleB, { x: xb }), d, 'power1.in', t);
      tl.to(e, { d: 1, duration: d, ease: 'power2.in', onUpdate: maj }, t);
      vers(base(P.dribbleH, { x: xh }), d, 'power1.out', t + d);
      tl.to(e, { d: 0, duration: d, ease: 'power2.out', onUpdate: maj }, t + d);
    }
    function foulee(t, xb, xh, d){
      vers(base(F.course1, { x: xb }), d, 'none', t);
      tl.to(e, { d: 1, duration: d, ease: 'power2.in', onUpdate: maj }, t);
      vers(base(F.course2, { x: xh }), d, 'none', t + d);
      tl.to(e, { d: 0, duration: d, ease: 'power2.out', onUpdate: maj }, t + d);
    }
    /* Tir en extension depuis x : élan, détente, lâcher, vol du ballon jusqu'au cercle. Renvoie l'heure du panier. */
    function tir(t, x){
      vers(base(P.appel, { x: x - 4 }), 0.24, 'power2.in', t);
      vers(base(P.detente, { x: x }), 0.3, 'power2.out', t + 0.24);
      vers(base(P.lacher, { x: x + 2 }), 0.14, 'power1.out', t + 0.54);
      tl.call(function(){
        var m = J.main(pose); dep = [m[0] + 4, m[1] + 9];
        ctrl = [(dep[0] + CERCLE[0]) / 2 + 10, Math.min(dep[1], CERCLE[1]) - 170];
        trajet.setAttribute('d', 'M' + dep[0].toFixed(1) + ' ' + dep[1].toFixed(1) + ' Q' + ctrl[0].toFixed(1) + ' ' + ctrl[1].toFixed(1) + ' ' + CERCLE[0] + ' ' + CERCLE[1]);
        mode = 'vol';
      }, null, t + 0.68);
      tl.to(e, { v: 1, tour: 720, duration: 1.15, ease: 'none', onUpdate: maj }, t + 0.68)
        .fromTo(trajet, { opacity: 0 }, { opacity: 1, duration: 0.5 }, t + 0.74);
      vers(base(P.reception, { x: x + 4 }), 0.34, 'power2.in', t + 0.74);
      vers(base(P.fin, { x: x + 4 }), 0.6, 'power1.out', t + 1.08);
      return t + 1.83;
    }
    /* Le ballon traverse le filet ; le tableau prend les points. */
    function filet(t, fort){
      tl.call(function(){ mode = 'libre'; maj(); }, null, t)
        .to(A.ballon, { attr: { transform: 'translate(520 150)' }, duration: 0.2, ease: 'none' }, t)
        .fromTo(A.filet, { scaleY: 1 }, { scaleY: fort ? 1.32 : 1.18, svgOrigin: '520 104', duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.out' }, t + 0.03)
        .fromTo('.cercle-av', { stroke: '#ff6a1a' }, { stroke: '#ffd2a8', duration: 0.12, yoyo: true, repeat: 1 }, t + 0.01)
        .to(e, { s: 78, duration: 0.3, ease: 'none', onUpdate: compte }, t + 0.06)
        .fromTo('.tableau', { boxShadow: '0 18px 40px rgba(0,0,0,.45)' }, { boxShadow: '0 0 0 3px #46c46f, 0 18px 40px rgba(0,0,0,.45)', duration: 0.25, yoyo: true, repeat: 1 }, t + 0.06)
        .to(A.ballon, { attr: { transform: 'translate(522 ' + SOL_B + ')' }, duration: 0.42, ease: 'power2.in', onUpdate: function(){ var m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(A.ballon.getAttribute('transform')); if (m) { A.bOmbre.setAttribute('cx', m[1]); A.bOmbre.setAttribute('opacity', (0.45 * (1 - Math.min(1, (SOL_B - m[2]) / 220))).toFixed(2)); } } }, t + 0.2);
      return t + 0.62;
    }
    /* La fête : la mascotte se tourne vers le visiteur, le ballon rebondit jusqu'à son doigt et y tourne. */
    function fete(t, x){
      vers(base(F.fete, { x: x }), 0.4, 'back.out(1.6)', t);
      tl.call(function(){ depR = [522, SOL_B]; mode = 'retour'; e.r = 0; maj(); }, null, t)
        .to(e, { r: 1, tour: '+=540', duration: 0.95, ease: 'power1.inOut', onUpdate: maj }, t)
        .call(function(){ mode = 'doigt'; maj(); }, null, t + 0.95)
        .to(e, { tour: '+=2160', duration: 3.2, ease: 'power2.out', onUpdate: maj }, t + 0.95)
        .to(trajet, { opacity: 0, duration: 0.4 }, t);
    }

    tl.set(trajet, { opacity: 0 }, 0);
    tl.call(function(){ mode = 'dribble'; maj(); }, null, 1.0);
    var tb, xf;
    if (nom === 'trois-points') {
      tl.to(e, { s: 75, a: 57, duration: 2.2, ease: 'power1.out', onUpdate: compte }, 1.0);
      dribble(1.0, 182, 166, 0.31); dribble(1.62, 182, 166, 0.31);
      passe('main', 2.24); vers(base(P.prise), 0.32, null, 2.24);
      tb = tir(2.56, 204); xf = 208;
    } else if (nom === 'pas-arriere') {
      tl.to(e, { s: 75, a: 57, duration: 2.2, ease: 'power1.out', onUpdate: compte }, 1.0);
      dribble(1.0, 196, 214, 0.27); dribble(1.54, 238, 262, 0.27);
      passe('main', 2.08); vers(base(P.prise, { x: 270 }), 0.2, 'power1.out', 2.08);
      vers(base(F.recul, { x: 238 }), 0.22, 'power2.out', 2.28);
      vers(base(P.prise, { x: 222 }), 0.2, 'power2.in', 2.5);
      tb = tir(2.7, 222); xf = 226;
    } else {
      tl.to(e, { s: 76, a: 57, duration: 2.0, ease: 'power1.out', onUpdate: compte }, 1.0);
      foulee(1.0, 205, 245, 0.2); foulee(1.4, 285, 325, 0.2);
      passe('main', 1.8);
      vers(base(P.prise, { x: 360 }), 0.2, 'power1.out', 1.8);
      vers(base(P.appel, { x: 392 }), 0.2, 'power2.in', 2.0);
      if (nom === 'dunk') {
        vers(ajuster(base(F.envol1), 506, 62, true), 0.42, 'power2.out', 2.2);
        vers(ajuster(base(F.smash1), 520, 112, true), 0.14, 'power2.in', 2.62);
        tb = filet(2.76, true);
        vers(base(F.atterri, { x: 470 }), 0.42, 'power2.in', 2.76);
        xf = 470;
      } else {
        vers(ajuster(base(F.envol2), 504, 66, true), 0.44, 'power2.out', 2.2);
        vers(ajuster(base(F.smash2), 520, 110, true), 0.14, 'power2.in', 2.64);
        tb = filet(2.78, true);
        /* Suspendu au cercle : le cercle plie sous le poids, les jambes se balancent, puis il se laisse tomber. */
        vers(ajuster(base(F.suspendu), 503, 103, false), 0.16, 'power1.out', 2.78);
        tl.to('.cercle-av, .cercle-ar, #filet', { rotation: -9, svgOrigin: '542 104', duration: 0.16, ease: 'power2.out' }, 2.8)
          .to('.cercle-av, .cercle-ar, #filet', { rotation: 0, svgOrigin: '542 104', duration: 0.5, ease: 'elastic.out(1, 0.35)' }, 3.62);
        vers(ajuster(base(F.balance), 503, 106, false), 0.3, 'sine.inOut', 2.94);
        vers(ajuster(base(F.suspendu), 503, 106, false), 0.3, 'sine.inOut', 3.24);
        vers(base(F.atterri, { x: 462 }), 0.36, 'power2.in', 3.6);
        xf = 462;
      }
      tb = Math.max(tb, nom === 'dunk' ? 3.4 : 3.96);
    }
    if (!dunk) tb = filet(tb, false);
    fete(tb + 0.1, xf);
  }

  window.MascotteActions = { jouer: jouer, fixe: fixe, actions: ACTIONS };
})();
