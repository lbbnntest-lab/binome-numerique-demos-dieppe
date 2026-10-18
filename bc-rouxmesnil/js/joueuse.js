/* Joueuse du BCR : squelette articulé (hanches, genoux, épaules, coudes) dessiné en aplats.
   Les angles sont en degrés ; 0 = membre vers le bas, négatif = vers l'avant (vers le panier).
   Joueuse.poser(p) place le corps ; Joueuse.main(p) donne la position de la main avant, pour le ballon. */
(function(){
  var S = 0.86, SOL = 404, CUISSE = 50, TIBIA = 48, PIED = 9, BRAS = 33, AVANT = 30, MAIN = 7;
  var EPAULE = [3, -74];
  function rad(a){ return a * Math.PI / 180; }
  function tourne(v, a){ var c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [v[0]*c - v[1]*s, v[0]*s + v[1]*c]; }
  function plus(a, b){ return [a[0]+b[0], a[1]+b[1]]; }
  function el(id){ return document.getElementById(id); }
  function rot(id, a, x, y){ a = +a || 0; var e = el(id); if (e) e.setAttribute('transform', (x !== undefined ? 'translate('+x+' '+y+') ' : '') + 'rotate('+a.toFixed(2)+')'); }

  /* Hauteur des hanches pour que le pied le plus bas touche le sol (hors saut). */
  function cheville(c, t){ return plus(tourne([0, CUISSE], c), tourne([0, TIBIA], c + t)); }
  function hanches(p){
    var a = cheville(p.cuisseA, p.tibiaA)[1], b = cheville(p.cuisseB, p.tibiaB)[1];
    return SOL - (Math.max(a, b) + PIED) * S - (p.saut || 0);
  }
  function main(p, cote){
    var c = cote || 'A', y = hanches(p);
    var ep = tourne(EPAULE, p.tronc);
    var coude = plus(ep, tourne([0, BRAS], p.tronc + p['bras'+c]));
    var m = plus(coude, tourne([0, AVANT + MAIN], p.tronc + p['bras'+c] + p['avant'+c]));
    return [p.x + m[0]*S, y + m[1]*S];
  }
  function poser(p){
    ['saut','pointeA','pointeB','tete','queue'].forEach(function(k){ p[k] = +p[k] || 0; });
    var y = hanches(p);
    el('j-racine').setAttribute('transform', 'translate('+p.x.toFixed(2)+' '+y.toFixed(2)+') scale('+S+')');
    ['j-tronc','j-brasB','j-brasA'].forEach(function(id){ rot(id, p.tronc); });
    rot('j-epauleA', p.brasA, EPAULE[0], EPAULE[1]); rot('j-coudeA', p.avantA, 0, BRAS);
    rot('j-epauleB', p.brasB, EPAULE[0], EPAULE[1]); rot('j-coudeB', p.avantB, 0, BRAS);
    rot('j-cuisseA', p.cuisseA); rot('j-genouA', p.tibiaA, 0, CUISSE); rot('j-piedA', -(p.cuisseA + p.tibiaA) + (p.pointeA || 0), 0, TIBIA);
    rot('j-cuisseB', p.cuisseB); rot('j-genouB', p.tibiaB, 0, CUISSE); rot('j-piedB', -(p.cuisseB + p.tibiaB) + (p.pointeB || 0), 0, TIBIA);
    rot('j-tete', p.tete || 0, 4, -80);
    rot('j-queue', p.queue || 0, -10, -22);
    var o = el('j-ombre'); if (o) { o.setAttribute('cx', p.x + 6); var k = Math.max(0.45, 1 - (p.saut || 0) / 90); o.setAttribute('rx', 40 * k); o.setAttribute('opacity', 0.5 * k); }
  }
  /* Postures clés. */
  var P = {
    garde:   { x:150, tronc:16, tete:-8, brasA:-22, avantA:-38, brasB:-35, avantB:-75, cuisseA:-38, tibiaA:48, cuisseB:18, tibiaB:34, queue:18 },
    dribbleH:{ x:166, tronc:18, tete:-10, brasA:-28, avantA:-42, brasB:-40, avantB:-70, cuisseA:-30, tibiaA:44, cuisseB:24, tibiaB:30, queue:28 },
    dribbleB:{ x:182, tronc:20, tete:-10, brasA:-12, avantA:-8, brasB:-38, avantB:-72, cuisseA:-40, tibiaA:52, cuisseB:14, tibiaB:40, queue:10 },
    prise:   { x:196, tronc:12, tete:-6, brasA:-40, avantA:-95, brasB:-48, avantB:-88, cuisseA:-34, tibiaA:58, cuisseB:-8, tibiaB:58, queue:14 },
    appel:   { x:200, tronc:6, tete:-4, brasA:-70, avantA:-100, brasB:-75, avantB:-95, cuisseA:-40, tibiaA:80, cuisseB:-22, tibiaB:78, queue:4 },
    detente: { x:204, tronc:-2, tete:0, brasA:-158, avantA:-40, brasB:-150, avantB:-55, cuisseA:-14, tibiaA:16, cuisseB:4, tibiaB:22, pointeA:38, pointeB:30, saut:46, queue:-24 },
    lacher:  { x:206, tronc:-3, tete:-2, brasA:-168, avantA:-4, brasB:-140, avantB:-40, cuisseA:-10, tibiaA:14, cuisseB:8, tibiaB:20, pointeA:40, pointeB:34, saut:52, queue:-30 },
    reception:{ x:210, tronc:8, tete:-4, brasA:-165, avantA:-10, brasB:-60, avantB:-30, cuisseA:-30, tibiaA:56, cuisseB:-6, tibiaB:52, queue:30 },
    fin:     { x:210, tronc:2, tete:-4, brasA:-150, avantA:-20, brasB:-14, avantB:-14, cuisseA:-14, tibiaA:18, cuisseB:8, tibiaB:14, queue:12 }
  };
  Object.keys(P).forEach(function(n){ ['saut','pointeA','pointeB'].forEach(function(k){ if (P[n][k] === undefined) P[n][k] = 0; }); });
  window.Joueuse = { poser: poser, main: main, P: P, SOL: SOL };
})();
