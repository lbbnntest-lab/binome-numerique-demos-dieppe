/* Export pour Facebook (démonstration). Chargé avant js/score-auto.js, js/articles.js et js/merci-partenaires.js (espace dirigeants).
   - « Télécharger l'image » : un vrai fichier PNG carré de 1080 x 1080 pixels, dessiné ici même sur un canvas à partir des données
     (fond noir, bande verte du club, logo, équipe, score, adversaire, date, logos des partenaires). Aucune bibliothèque, aucun appel
     extérieur : le logo, les logos des partenaires et les polices viennent tous de ce site (le canvas n'est donc pas « sali »).
   - « Copier le texte » : presse-papiers, avec repli si le navigateur refuse, puis texte sélectionné à copier à la main.
   - Chaque module (score, article partenaire, article publié) enregistre une fonction qui, au moment du clic, rend les données
     à jour : { spec, fichier, texte }. Les boutons portent data-exp-source, data-exp-id et data-exp-action (délégation sur document :
     les cartes sont redessinées sans cesse).
   Rien n'est envoyé ni publié : le dirigeant publie ensuite lui-même sur la page Facebook du club. */
(function () {
  'use strict';
  var W = 1080, H = 1080, M = 64;
  var C = { fond: '#080a09', vert: '#1f7a3f', vif: '#46c46f', gris: '#c9cdca', clair: '#d7dbd8', ligne: '#14181c', blanc: '#ffffff' };
  var TITRE = '"Barlow Condensed","Arial Narrow",Arial,sans-serif';
  var TEXTE = '"Source Sans 3",Arial,sans-serif';
  var sources = {};
  var api = { largeur: W, hauteur: H, dernier: null };

  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function maj(t) { return String(t).toUpperCase().replace(/(^|[^0-9A-Z])1ER(?![A-Z])/g, function (m, a) { return a + '1er'; }); }
  function police(style, taille, famille) { return style + ' ' + taille + 'px ' + famille; }
  function titre(taille, italique) { return police((italique ? 'italic ' : '') + '700', taille, TITRE); }
  function texte(taille, gras) { return police(gras ? '700' : '400', taille, TEXTE); }
  function espacement(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
  function nomDeFichier(n) {
    var s = String(n || 'bcr-publication').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (s || 'bcr-publication') + '.png';
  }

  /* ---------- Polices et images (tout vient du site) ---------- */
  var pretes = null;
  function polices() {
    if (pretes) return pretes;
    var f = ['italic 700 40px "Barlow Condensed"', '700 40px "Barlow Condensed"', '400 30px "Source Sans 3"', '700 30px "Source Sans 3"'];
    try {
      pretes = Promise.all(f.map(function (x) { return document.fonts.load(x, 'Éé€1'); }))
        .then(function () { return document.fonts.ready; }).catch(function () {});
    } catch (e) { pretes = Promise.resolve(); }
    return pretes;
  }
  var cacheImages = {};
  function image(src) {
    if (!src) return Promise.resolve(null);
    if (cacheImages[src]) return cacheImages[src];
    cacheImages[src] = new Promise(function (ok) {
      var im = new Image();
      im.onload = function () { (im.decode ? im.decode().catch(function () {}) : Promise.resolve()).then(function () { ok(im); }); };
      im.onerror = function () { ok(null); };
      im.src = src;
    });
    return cacheImages[src];
  }

  /* ---------- Outils de dessin ---------- */
  function ajuster(ctx, t, fonte, taille, mini, largeur) {
    var s = taille;
    for (;;) {
      ctx.font = fonte(s);
      if (ctx.measureText(t).width <= largeur || s <= mini) break;
      s -= 1;
    }
    if (ctx.measureText(t).width > largeur) {
      var a = t;
      while (a.length > 1 && ctx.measureText(a + '…').width > largeur) a = a.slice(0, -1);
      t = a.replace(/\s+$/, '') + '…';
    }
    return t;
  }
  function decouper(ctx, t, largeur) {
    var mots = String(t).replace(/\s+/g, ' ').trim().split(' '), lignes = [], cur = '';
    mots.forEach(function (m) {
      var essai = cur ? cur + ' ' + m : m;
      if (cur && ctx.measureText(essai).width > largeur) { lignes.push(cur); cur = m; } else cur = essai;
    });
    if (cur) lignes.push(cur);
    return lignes;
  }
  /* Bloc de texte à la plus grande taille qui tient dans largeur x hauteur (sinon la plus petite, avec points de suspension). */
  function bloc(ctx, t, fonte, tmax, tmin, largeur, hauteur, interligne, maxLignes) {
    var s = tmax, lignes;
    for (;;) {
      ctx.font = fonte(s); lignes = decouper(ctx, t, largeur);
      if ((lignes.length * s * interligne <= hauteur && (!maxLignes || lignes.length <= maxLignes)) || s <= tmin) break;
      s -= 2;
    }
    var haut = Math.max(1, Math.floor(hauteur / (s * interligne)));
    if (maxLignes) haut = Math.min(haut, maxLignes);
    if (lignes.length > haut) {
      lignes = lignes.slice(0, haut);
      var d = lignes[haut - 1];
      while (d.length > 1 && ctx.measureText(d + '…').width > largeur) d = d.slice(0, -1);
      lignes[haut - 1] = d.replace(/[\s.,;:]+$/, '') + '…';
    }
    return { taille: s, lignes: lignes, pas: s * interligne };
  }
  function contenir(ctx, im, x, y, w, h) {
    var k = Math.min(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
    ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  function couvrir(ctx, im, x, y, w, h) {
    var k = Math.max(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); ctx.restore();
  }
  function rond(ctx, cx, cy, r, fond, trait) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = fond; ctx.fill();
    if (trait) { ctx.lineWidth = 4; ctx.strokeStyle = trait; ctx.stroke(); }
  }
  function logoRond(ctx, im, cx, cy, r) {
    rond(ctx, cx, cy, r, '#000');
    if (im) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip(); contenir(ctx, im, cx - r, cy - r, r * 2, r * 2); ctx.restore(); }
  }
  function fondEtEntete(ctx, logo) {
    ctx.fillStyle = C.fond; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.vert; ctx.fillRect(0, 0, W, 176);
    logoRond(ctx, logo, M + 56, 88, 56);
    ctx.fillStyle = C.blanc; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; espacement(ctx, 2);
    ctx.font = titre(54); ctx.fillText('BASKET CLUB', M + 140, 86); ctx.fillText('DE ROUXMESNIL', M + 140, 138);
    espacement(ctx, 0);
  }
  function etiquette(ctx, t, y, couleur, taille) {
    ctx.fillStyle = couleur || C.vif; ctx.textAlign = 'left'; espacement(ctx, 5);
    ctx.fillText(ajuster(ctx, maj(t), function (s) { return titre(s); }, taille || 58, 30, W - 2 * M), M, y);
    espacement(ctx, 0);
  }
  /* « Avec le soutien de » et jusqu'à trois logos de partenaires sur des cartouches blancs, en bas de l'image. */
  function zonePartenaires(ctx, logos) {
    if (!logos.length) return;
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(M, 868, W - 2 * M, 3);
    ctx.fillStyle = C.gris; ctx.textAlign = 'left'; espacement(ctx, 2); ctx.font = titre(34);
    ctx.fillText('AVEC LE', M, 950); ctx.fillText('SOUTIEN DE', M, 992); espacement(ctx, 0);
    logos.slice(0, 3).forEach(function (im, i) {
      var x = M + 190 + i * 260;
      ctx.fillStyle = C.blanc; ctx.fillRect(x, 906, 240, 110);
      if (im) contenir(ctx, im, x + 16, 906 + 12, 240 - 32, 110 - 24);
    });
  }

  /* ---------- Les quatre images ---------- */
  function ligneScore(ctx, y, h, nom, score, rondFn) {
    ctx.fillStyle = C.ligne; ctx.fillRect(M, y, W - 2 * M, h);
    rondFn(M + 24 + 40, y + h / 2, 40);
    var x = M + 24 + 80 + 24, reserve = score === null ? 0 : 190;
    ctx.fillStyle = C.blanc; ctx.textAlign = 'left'; espacement(ctx, 1);
    var t = ajuster(ctx, maj(nom), function (s) { return titre(s); }, 50, 26, W - M - 24 - reserve - x);
    ctx.fillText(t, x, y + h / 2 + 16); espacement(ctx, 0);
    if (score !== null) {
      ctx.font = titre(96, true); ctx.textAlign = 'right'; ctx.fillStyle = C.blanc;
      ctx.fillText(String(score), W - M - 28, y + h / 2 + 32); ctx.textAlign = 'left';
    }
  }
  function dessinerMatch(ctx, s, im) {
    fondEtEntete(ctx, im.logo);
    etiquette(ctx, s.equipe, 244, C.vif, 60);
    ctx.fillStyle = C.gris; ctx.font = texte(36); ctx.textAlign = 'left';
    ctx.fillText(ajuster(ctx, s.niv, function (z) { return texte(z); }, 36, 24, W - 2 * M), M, 296);
    ctx.fillStyle = s.vict ? C.vif : C.blanc; espacement(ctx, 1);
    ctx.font = titre(150, true); ctx.fillText(maj(s.issue), M, 448); espacement(ctx, 0);
    ligneScore(ctx, 480, 112, 'BCR', s.masque ? null : s.bcr, function (cx, cy, r) { logoRond(ctx, im.logo, cx, cy, r); });
    ligneScore(ctx, 608, 112, s.adv, s.masque ? null : s.ad, function (cx, cy, r) {
      rond(ctx, cx, cy, r, '#1c2320', '#3a443f'); ctx.fillStyle = C.blanc; ctx.textAlign = 'center'; ctx.font = titre(30);
      ctx.fillText(maj(s.sig || ''), cx, cy + 10); ctx.textAlign = 'left';
    });
    ctx.fillStyle = C.clair; ctx.font = texte(38);
    ctx.fillText(ajuster(ctx, s.quand + ' · ' + s.lieu, function (z) { return texte(z); }, 38, 24, W - 2 * M), M, 782);
    if (s.masque) { ctx.fillStyle = C.gris; ctx.font = texte(34); ctx.fillText('Le score est sur le site du club', M, 830); }
    zonePartenaires(ctx, im.parts);
  }
  function dessinerWeekend(ctx, s, im) {
    fondEtEntete(ctx, im.logo);
    etiquette(ctx, 'Résultats du week-end' + (s.suite ? ' (' + s.suite + ')' : ''), 244, C.vif, 60);
    ctx.fillStyle = C.blanc; espacement(ctx, 1);
    ctx.fillText(ajuster(ctx, maj(s.dates), function (z) { return titre(z, true); }, 100, 50, W - 2 * M), M, 350); espacement(ctx, 0);
    var n = s.lignes.length, haut = 394, bas = im.parts.length ? 850 : 1010, dispo = bas - haut;
    var deux = n > 6, parCol = deux ? Math.ceil(n / 2) : n, hl = Math.min(deux ? 80 : 84, dispo / Math.max(1, parCol));
    var lc = deux ? (W - 2 * M - 36) / 2 : W - 2 * M;
    s.lignes.forEach(function (l, i) {
      var col = deux ? (i < parCol ? 0 : 1) : 0, r = deux ? (i < parCol ? i : i - parCol) : i;
      var x = M + col * (lc + 36), y = haut + r * hl;
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x, y + hl - 2, lc, 2);
      var sz = Math.min(36, Math.floor(hl * .4)), sp = Math.min(28, Math.floor(hl * .3)), ts = Math.min(50, Math.floor(hl * .56));
      ctx.font = titre(ts, true); var wsc = ctx.measureText(l.score).width, maxT = lc - wsc - 24;
      ctx.textAlign = 'left'; ctx.fillStyle = C.blanc; espacement(ctx, 0.5);
      ctx.fillText(ajuster(ctx, maj(l.equipe), function (z) { return titre(z); }, sz, 14, maxT), x, y + hl * .46); espacement(ctx, 0);
      ctx.fillStyle = C.gris;
      ctx.fillText(ajuster(ctx, 'contre ' + l.adv, function (z) { return texte(z); }, sp, 12, maxT), x, y + hl * .46 + sp + 2);
      ctx.font = titre(ts, true); ctx.fillStyle = l.v ? C.vif : C.blanc; ctx.textAlign = 'right';
      ctx.fillText(l.score, x + lc, y + hl * .66); ctx.textAlign = 'left';
    });
    zonePartenaires(ctx, im.parts);
  }
  function dessinerPartenaire(ctx, s, im) {
    fondEtEntete(ctx, im.logo);
    etiquette(ctx, s.accroche || 'Merci à notre partenaire', 252, C.vif, 62);
    ctx.fillStyle = C.blanc; ctx.fillRect(M, 292, W - 2 * M, 330);
    if (im.cartouche) contenir(ctx, im.cartouche, M + 48, 292 + 36, W - 2 * M - 96, 330 - 72);
    var b = bloc(ctx, maj(s.nom), function (z) { return titre(z, true); }, 112, 52, W - 2 * M, 200, 1.0, 2);
    ctx.fillStyle = C.blanc; ctx.font = titre(b.taille, true); ctx.textAlign = 'left'; espacement(ctx, 1);
    var y = 622 + 40 + b.taille * .85;
    b.lignes.forEach(function (l, i) { ctx.fillText(l, M, y + i * b.pas); }); espacement(ctx, 0);
    y += (b.lignes.length - 1) * b.pas + 56;
    if (s.detail) { ctx.fillStyle = C.clair; ctx.font = texte(44); ctx.fillText(ajuster(ctx, s.detail, function (z) { return texte(z); }, 44, 26, W - 2 * M), M, y); }
    ctx.fillStyle = C.vif; ctx.font = titre(46); espacement(ctx, 2);
    ctx.fillText(ajuster(ctx, maj(s.pied || 'Partenaire du club'), function (z) { return titre(z); }, 46, 28, W - 2 * M), M, 1016); espacement(ctx, 0);
  }
  function dessinerArticle(ctx, s, im) {
    fondEtEntete(ctx, im.logo);
    etiquette(ctx, 'Vie du club' + (s.date ? ' · ' + s.date : ''), 244, C.vif, 52);
    var haut = 290;
    if (im.photo) { couvrir(ctx, im.photo, M, haut, W - 2 * M, 350); haut = 640 + 36; }
    var dispo = 940 - haut, b = bloc(ctx, maj(s.titre), function (z) { return titre(z, true); }, im.photo ? 92 : 120, 46, W - 2 * M, dispo, 1.04, im.photo ? 4 : 6);
    ctx.fillStyle = C.blanc; ctx.font = titre(b.taille, true); ctx.textAlign = 'left'; espacement(ctx, 1);
    b.lignes.forEach(function (l, i) { ctx.fillText(l, M, haut + b.taille * .86 + i * b.pas); }); espacement(ctx, 0);
    ctx.fillStyle = C.gris; ctx.font = texte(36); ctx.fillText(s.pied || 'L’article complet est sur le site du club', M, 1010);
  }

  /* ---------- Affiches portrait 1080 x 1350 (rendez-vous et résultats du week-end) ----------
     Une seule mise en page (liste de primitives : rectangles, ronds, logos, textes, emblèmes) peinte de deux façons :
     en SVG dans la page (aperçu à l'écran) et sur un canvas (fichier PNG). L'aperçu et le fichier ne peuvent donc pas différer.
     Description d'une affiche (spec.type = 'affiche') :
       modele : 'couverture' | 'jour' | 'resultats' ; mode : 'rdv' | 'res' (couverture) ; theme : { fond, accent, nom, emb } ;
       titre ; dates ; lieu ('dom' | 'ext') ; salleDom ; suite ; resume ; compte : { dom, ext } ou { v, n } ; alt ;
       lignes : [{ heure, jourCourt, code, adv, sig, logo, salle, lieuTxt, bcr, ad, v }].
     Aucun émoji sur les affiches. */
  var HP = 1350;
  var EMBLEMES = {
    ruban: { remp: [], trait: ['M34 95 C45 68 51 57 60 43 C71 27 71 9 53 7 C37 5 33 20 43 36 C51 50 58 66 67 95'], lw: 9 },
    moustache: { remp: ['M50 44 C44 33 30 29 16 36 C7 41 2 50 3 60 C11 53 21 51 31 53 C40 55 46 54 50 50 C54 54 60 55 69 53 C79 51 89 53 97 60 C98 50 93 41 84 36 C70 29 56 33 50 44 Z'], trait: [], lw: 0 },
    ballon: { remp: [], trait: ['M6 50 A44 44 0 1 0 94 50 A44 44 0 1 0 6 50 Z', 'M50 6 V94', 'M6 50 H94', 'M19 17 C37 35 37 65 19 83', 'M81 17 C63 35 63 65 81 83'], lw: 4 }
  };
  var CA = { fond: '#0b0e0c', haut: '#12171a', gris: '#c9cdca', clair: '#d7dbd8' };
  var mesureCtx = null;
  function mesure() { if (!mesureCtx) mesureCtx = document.createElement('canvas').getContext('2d'); return mesureCtx; }
  function mettreEnPage(s) {
    return polices().then(function () {
      var th = s.theme, P = [], mc = mesure(), LOGO = 'img/logo-bcr-160.webp';
      function R(x, y, w, h, f) { P.push({ k: 'rect', x: x, y: y, w: w, h: h, f: f }); }
      function T(t, x, y, taille, o) { o = o || {}; P.push({ k: 'txt', t: t, x: x, y: y, taille: taille, f: o.f || 't', it: !!o.it, gras: !!o.gras, c: o.c || '#fff', al: o.al || 'left', ls: o.ls || 0 }); }
      /* Texte sur une ligne, à la plus grande taille qui tient dans la largeur (sinon points de suspension) ; rend la taille retenue. */
      function TT(t, x, y, tmax, tmin, largeur, o) {
        o = o || {};
        var fonte = o.f === 'x' ? function (z) { return texte(z, o.gras); } : function (z) { return titre(z, o.it); };
        espacement(mc, o.ls || 0);
        var r = ajuster(mc, String(t), fonte, tmax, tmin, largeur);
        var z = parseFloat(mc.font.match(/(\d+(?:\.\d+)?)px/)[1]);
        espacement(mc, 0);
        T(r, x, y, z, o); return z;
      }
      function logo(src, sig, cx, cy, r) { P.push({ k: 'logo', src: src || '', sig: sig || '', cx: cx, cy: cy, r: r }); }
      function emb(type, x, y, t, c) { P.push({ k: 'emb', type: type, x: x, y: y, t: t, c: c }); }
      function pied() {
        R(0, 1240, W, 110, th.fond);
        TT('ALLEZ LE BCR !', W / 2, 1316, 76, 40, W - 2 * M, { it: true, al: 'center', ls: 3 });
      }
      /* Coupe un texte en lignes : aux espaces et après les traits d'union (« Mesnil-Franqueville-Boos »). */
      function casser(t, largeur) {
        var mots = String(t).replace(/\s+/g, ' ').trim().split(' '), lignes = [], cur = '';
        mots.forEach(function (mot) {
          var morceaux = mot.match(/[^-]+-?|-/g) || [mot];
          morceaux.forEach(function (mc2, k) {
            var essai = cur + (k === 0 && cur ? ' ' : '') + mc2;
            if (cur && mc.measureText(essai).width > largeur) { lignes.push(cur.replace(/\s+$/, '')); cur = mc2; } else cur = essai;
          });
        });
        if (cur) lignes.push(cur);
        return lignes;
      }
      /* Texte sur au plus maxL lignes, à la plus grande taille qui tient dans largeur x hauteur ; sinon points de suspension. */
      function blocT(t, fonte, tmax, tmin, largeur, hauteur, inter, maxL) {
        var z = tmax, lignes;
        for (;;) {
          mc.font = fonte(z); lignes = casser(t, largeur);
          var large = lignes.some(function (x) { return mc.measureText(x).width > largeur + 0.5; });
          if ((lignes.length * z * inter <= hauteur && lignes.length <= maxL && !large) || z <= tmin) break;
          z -= 1;
        }
        var haut = Math.max(1, Math.min(maxL, Math.floor(hauteur / (z * inter))));
        if (lignes.length > haut) {
          lignes = lignes.slice(0, haut);
          var d = lignes[haut - 1];
          while (d.length > 1 && mc.measureText(d + '…').width > largeur) d = d.slice(0, -1);
          lignes[haut - 1] = d.replace(/[\s.,;:-]+$/, '') + '…';
        }
        lignes = lignes.map(function (x) {
          while (x.length > 1 && mc.measureText(x).width > largeur) x = x.slice(0, -2) + '…';
          return x;
        });
        return { taille: z, lignes: lignes, pas: z * inter };
      }
      /* Bloc de textes (1 à 2 lignes chacun) centré verticalement sur cy. */
      function blocCentre(items, x, cy, largeur) {
        var tot = 0, bl = items.map(function (it) {
          var b = blocT(it.t, it.titre ? function (z) { return titre(z, true); } : function (z) { return texte(z, it.gras); }, it.tmax, it.tmin, largeur, it.h, it.titre ? 1.0 : 1.08, it.lignes || 2);
          tot += b.lignes.length * b.pas; return b;
        });
        var y = cy - tot / 2;
        bl.forEach(function (b, i) {
          b.lignes.forEach(function (ln, k) {
            var o = items[i].titre ? { f: 't', it: true, c: items[i].c, ls: 1, al: items[i].al } : { f: 'x', gras: items[i].gras, c: items[i].c, al: items[i].al };
            T(ln, items[i].x !== undefined ? items[i].x : x, y + b.taille * (items[i].titre ? .8 : .85) + k * b.pas, b.taille, o);
          });
          y += b.lignes.length * b.pas;
        });
      }
      function cheminLogo(f) { return f ? (f.indexOf('/') >= 0 ? f : 'img/logos/' + f) : ''; }
      function fond(i, y, h) {
        R(M, y, W - 2 * M, h, i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.09)');
        R(M, y, 184, h, th.fond);
      }
      function rangeeRdv(l, i, y, rh) {
        var h = rh - 10, cy = y + h / 2, r = Math.min(44, Math.floor(h * .34));
        fond(i, y, h);
        var ts = Math.min(l.heure ? 80 : 60, Math.floor(h * .5));
        TT(l.heure || l.jourCourt, M + 92, cy + ts * .34, ts, 24, 164, { it: true, al: 'center', ls: 1 });
        var fc = Math.min(66, Math.floor(h * .42));
        if (/ /.test(l.code)) blocCentre([{ t: l.code, titre: true, c: '#fff', tmax: fc, tmin: 22, h: h * .86 }], 268, cy, 200);
        else TT(l.code, 268, cy + fc * .34, fc, 24, 204, { it: true, ls: 1 });
        logo(LOGO, 'BCR', 528, cy, r);
        T('VS', 596, cy + 8, 26, { c: CA.gris, al: 'center', ls: 1 });
        logo(cheminLogo(l.logo), l.sig, 664, cy, r);
        var amax = Math.min(38, Math.floor(h * .27)), smax = Math.min(26, Math.floor(h * .19));
        var items = [{ t: l.adv, gras: true, c: '#fff', tmax: amax, tmin: 17, h: h * (l.salle ? .5 : .8) }];
        if (l.salle) items.push({ t: l.salle, gras: false, c: CA.gris, tmax: smax, tmin: 14, h: h * .36 });
        blocCentre(items, 726, cy, W - M - 14 - 726);
      }
      function rangeeRes(l, i, y, rh) {
        var h = rh - 10, cy = y + h / 2, r = Math.min(44, Math.floor(h * .34));
        fond(i, y, h);
        var fc = Math.min(62, Math.floor(h * .42));
        if (/ /.test(l.code)) blocCentre([{ t: l.code, titre: true, c: '#fff', tmax: fc, tmin: 20, h: h * .86, al: 'center', x: M + 92 }], M + 92, cy, 164);
        else TT(l.code, M + 92, cy + fc * .34, fc, 20, 164, { it: true, al: 'center', ls: 1 });
        logo(LOGO, 'BCR', 320, cy, r);
        var ss = Math.min(70, Math.floor(h * .5)), tot = ss * .7 + 8 + 16, top = cy - tot / 2;
        TT(l.bcr + ' - ' + l.ad, 492, top + ss * .7, ss, 30, 150, { it: true, al: 'center', c: l.v === true ? th.accent : '#fff' });
        T(l.v === true ? 'VICTOIRE' : l.v === false ? 'DÉFAITE' : '', 492, top + ss * .7 + 8 + 18, 22, { c: CA.gris, al: 'center', ls: 3 });
        logo(cheminLogo(l.logo), l.sig, 664, cy, r);
        var amax = Math.min(38, Math.floor(h * .27));
        var items = [{ t: l.adv, gras: true, c: '#fff', tmax: amax, tmin: 17, h: h * .52 }];
        if (l.lieuTxt) items.push({ t: l.lieuTxt, gras: false, c: CA.gris, tmax: 24, tmin: 14, h: h * .3, lignes: 1 });
        blocCentre(items, 726, cy, W - M - 14 - 726);
      }

      R(0, 0, W, HP, CA.fond);
      if (s.modele === 'couverture') {
        R(0, 0, W, 300, th.fond);
        logo(LOGO, 'BCR', M + 106, 150, 100);
        T('BASKET CLUB', 300, 138, 84, { it: true, ls: 4 });
        T('DE ROUXMESNIL', 300, 232, 84, { it: true, ls: 4 });
        TT(s.mode === 'res' ? 'RÉSULTATS' : 'RENDEZ-VOUS', M, 520, 196, 80, W - 2 * M, { it: true, ls: 1 });
        TT('DU WEEK-END', M, 700, 196, 80, W - 2 * M, { it: true, ls: 1 });
        R(0, 750, W, 150, th.fond);
        TT(maj(s.dates), W / 2, 845, 92, 36, W - 2 * M, { it: true, al: 'center', ls: 1 });
        emb(th.emb, M, 950, 280, th.accent);
        var x = 420, c = s.compte || {}, ls = [];
        if (th.nom) TT(maj(th.nom), x, 1040, 84, 40, W - M - x, { it: true, c: th.accent, ls: 1 });
        if (s.mode === 'res') {
          ls.push(c.v + (c.v > 1 ? ' VICTOIRES' : ' VICTOIRE'));
          ls.push('SUR ' + c.n + (c.n > 1 ? ' MATCHS' : ' MATCH'));
        } else {
          if (c.dom) ls.push(c.dom + (c.dom > 1 ? ' MATCHS' : ' MATCH') + ' À DOMICILE');
          if (c.ext) ls.push(c.ext + (c.ext > 1 ? ' MATCHS' : ' MATCH') + ' À L\'EXTÉRIEUR');
        }
        var y2 = th.nom ? 1124 : 1080;
        ls.forEach(function (t, k) { TT(t, x, y2 + k * 68, 58, 28, W - M - x, { it: true, ls: 1 }); });
        pied();
      } else {
        R(0, 0, W, 230, th.fond);
        logo(LOGO, 'BCR', M + 82, 115, 78);
        var xt = M + 2 * 78 + 36;
        T('BASKET CLUB DE ROUXMESNIL', xt, 84, 36, { ls: 4, c: 'rgba(255,255,255,.92)' });
        TT(maj(s.titre), xt, 186, 112, 52, W - M - xt, { it: true, ls: 1 });
        R(0, 230, W, 120, CA.haut);
        var pill = s.modele === 'resultats' ? 'RÉSULTATS' : s.lieu === 'dom' ? 'À DOMICILE' : 'À L\'EXTÉRIEUR';
        if (s.suite) pill += ' · ' + s.suite;
        TT(pill, M, 312, 68, 40, 430, { it: true, c: th.accent, ls: 2 });
        if (s.modele === 'resultats') { if (s.resume) TT(s.resume, W - M, 306, 40, 22, W - 2 * M - 450, { al: 'right', c: CA.clair, it: true, ls: 1 }); }
        else if (s.lieu === 'dom' && s.salleDom) TT(s.salleDom, W - M, 304, 34, 18, W - 2 * M - 450, { f: 'x', al: 'right', c: CA.clair });
        var n = s.lignes.length, top = 372, bas = 1218, rh = Math.min(190, Math.floor((bas - top) / Math.max(1, n))), dec = Math.floor(((bas - top) - n * rh) / 2);
        s.lignes.forEach(function (l, i) { (s.modele === 'resultats' ? rangeeRes : rangeeRdv)(l, i, top + dec + i * rh, rh); });
        pied();
      }
      return { prims: P, largeur: W, hauteur: HP, alt: s.alt || '' };
    });
  }
  function svgAffiche(mep, pref) {
    var o = [], defs = [], n = 0;
    var FT = 'font-family="Barlow Condensed, Arial Narrow, Arial, sans-serif" font-weight="700"', FX = 'font-family="Source Sans 3, Arial, sans-serif"';
    mep.prims.forEach(function (p) {
      if (p.k === 'rect') o.push('<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" fill="' + p.f + '"/>');
      else if (p.k === 'logo') {
        var id = pref + 'c' + (n++);
        o.push('<circle cx="' + p.cx + '" cy="' + p.cy + '" r="' + p.r + '" fill="' + (p.src ? '#000' : '#1c2320') + '"' + (p.src ? '' : ' stroke="#3a443f" stroke-width="4"') + '/>');
        if (p.src) {
          defs.push('<clipPath id="' + id + '"><circle cx="' + p.cx + '" cy="' + p.cy + '" r="' + p.r + '"/></clipPath>');
          o.push('<image href="' + esc(p.src) + '" x="' + (p.cx - p.r) + '" y="' + (p.cy - p.r) + '" width="' + 2 * p.r + '" height="' + 2 * p.r + '" preserveAspectRatio="xMidYMid meet" clip-path="url(#' + id + ')"/>');
        } else {
          o.push('<text x="' + p.cx + '" y="' + (p.cy + p.r * .26) + '" text-anchor="middle" fill="#fff" font-size="' + Math.round(p.r * .78) + '" ' + FT + '>' + esc(maj(p.sig)) + '</text>');
        }
      } else if (p.k === 'txt') {
        if (!p.t) return;
        o.push('<text x="' + p.x + '" y="' + Math.round(p.y * 10) / 10 + '" font-size="' + p.taille + '" fill="' + p.c + '" text-anchor="' + (p.al === 'center' ? 'middle' : p.al === 'right' ? 'end' : 'start') + '" '
          + (p.f === 't' ? FT + (p.it ? ' font-style="italic"' : '') : FX + (p.gras ? ' font-weight="700"' : '')) + (p.ls ? ' letter-spacing="' + p.ls + '"' : '') + '>' + esc(p.t) + '</text>');
      } else if (p.k === 'emb') {
        var d = EMBLEMES[p.type]; if (!d) return;
        o.push('<g transform="translate(' + p.x + ' ' + p.y + ') scale(' + p.t / 100 + ')">'
          + d.remp.map(function (v) { return '<path d="' + v + '" fill="' + p.c + '"/>'; }).join('')
          + d.trait.map(function (v) { return '<path d="' + v + '" fill="none" stroke="' + p.c + '" stroke-width="' + d.lw + '" stroke-linecap="round" stroke-linejoin="round"/>'; }).join('') + '</g>');
      }
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + mep.largeur + ' ' + mep.hauteur + '" role="img" aria-label="' + esc(mep.alt) + '" focusable="false"><defs>' + defs.join('') + '</defs>' + o.join('') + '</svg>';
  }
  function peindreAffiche(ctx, mep, ims) {
    mep.prims.forEach(function (p) {
      if (p.k === 'rect') { ctx.fillStyle = p.f; ctx.fillRect(p.x, p.y, p.w, p.h); }
      else if (p.k === 'logo') {
        var im = p.src ? ims[p.src] : null;
        if (im) logoRond(ctx, im, p.cx, p.cy, p.r);
        else {
          rond(ctx, p.cx, p.cy, p.r, p.src ? '#000' : '#1c2320', p.src ? null : '#3a443f');
          if (!p.src) { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = titre(Math.round(p.r * .78)); espacement(ctx, 0); ctx.fillText(maj(p.sig), p.cx, p.cy + p.r * .26); ctx.textAlign = 'left'; }
        }
      } else if (p.k === 'txt') {
        if (!p.t) return;
        ctx.font = p.f === 't' ? titre(p.taille, p.it) : texte(p.taille, p.gras);
        ctx.fillStyle = p.c; ctx.textAlign = p.al; espacement(ctx, p.ls);
        ctx.fillText(p.t, p.x + (p.al === 'center' && p.ls ? p.ls / 2 : 0), p.y);
        espacement(ctx, 0); ctx.textAlign = 'left';
      } else if (p.k === 'emb') {
        var d = EMBLEMES[p.type]; if (!d) return;
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.t / 100, p.t / 100);
        d.remp.forEach(function (v) { ctx.fillStyle = p.c; ctx.fill(new Path2D(v)); });
        d.trait.forEach(function (v) { ctx.strokeStyle = p.c; ctx.lineWidth = d.lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(v)); });
        ctx.restore();
      }
    });
  }
  function dessinerAffiche(spec) {
    return mettreEnPage(spec).then(function (mep) {
      var srcs = []; mep.prims.forEach(function (p) { if (p.k === 'logo' && p.src && srcs.indexOf(p.src) < 0) srcs.push(p.src); });
      return Promise.all(srcs.map(function (x) { return image(x); })).then(function (r) {
        var ims = {}; srcs.forEach(function (x, i) { ims[x] = r[i]; });
        var cv = document.createElement('canvas'); cv.width = W; cv.height = HP;
        var ctx = cv.getContext('2d'); ctx.textBaseline = 'alphabetic';
        peindreAffiche(ctx, mep, ims);
        api.dernier = { canvas: cv, spec: spec };
        return cv;
      });
    });
  }
  api.affiches = {
    largeur: W, hauteur: HP, emblemes: EMBLEMES,
    miseEnPage: mettreEnPage,
    svg: function (spec, pref) { return mettreEnPage(spec).then(function (mep) { return svgAffiche(mep, pref || 'aff'); }); }
  };

  /* spec -> canvas */
  function dessiner(spec) {
    if (spec.type === 'affiche') return dessinerAffiche(spec);
    return polices().then(function () {
      var jobs = [image('img/logo-bcr-160.webp'), Promise.all((spec.parts || []).map(function (p) { return image(p); })),
        image(spec.cartouche || ''), image(spec.photo || '')];
      return Promise.all(jobs);
    }).then(function (r) {
      var im = { logo: r[0], parts: r[1], cartouche: r[2], photo: r[3] };
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      ctx.textBaseline = 'alphabetic';
      if (spec.type === 'match') dessinerMatch(ctx, spec, im);
      else if (spec.type === 'weekend') dessinerWeekend(ctx, spec, im);
      else if (spec.type === 'partenaire') dessinerPartenaire(ctx, spec, im);
      else dessinerArticle(ctx, spec, im);
      api.dernier = { canvas: cv, spec: spec };
      return cv;
    });
  }
  /* Un week-end de plus de 12 résultats est réparti sur plusieurs images (12 lignes au plus chacune) : texte lisible sur un téléphone. */
  var PAR_IMAGE = 12;
  function decouper2(spec) {
    if (spec.type !== 'weekend' || spec.lignes.length <= PAR_IMAGE) return [spec];
    var k = Math.ceil(spec.lignes.length / PAR_IMAGE), t = Math.ceil(spec.lignes.length / k), r = [];
    for (var i = 0; i < k; i++) {
      var c = {}; Object.keys(spec).forEach(function (x) { c[x] = spec[x]; });
      c.lignes = spec.lignes.slice(i * t, (i + 1) * t); c.suite = (i + 1) + '/' + k; r.push(c);
    }
    return r;
  }
  function telechargerUne(spec, nom) {
    return dessiner(spec).then(function (cv) {
      return new Promise(function (ok, ko) {
        function livrer(blob) {
          var url = URL.createObjectURL(blob), a = document.createElement('a');
          a.href = url; a.download = nom; a.style.display = 'none'; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
          api.dernier.fichier = nom; api.dernier.octets = blob.size;
          (api.fichiers = api.fichiers || []).push({ nom: nom, octets: blob.size, largeur: cv.width, hauteur: cv.height });
          ok({ nom: nom, octets: blob.size, largeur: cv.width, hauteur: cv.height });
        }
        try {
          if (cv.toBlob) cv.toBlob(function (b) { if (b) livrer(b); else ko(new Error('vide')); }, 'image/png');
          else {
            var d = cv.toDataURL('image/png').split(',')[1], bin = atob(d), u = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
            livrer(new Blob([u], { type: 'image/png' }));
          }
        } catch (e) { ko(e); }
      });
    });
  }
  function telecharger(spec, fichier) {
    var specs = decouper2(spec), base = nomDeFichier(fichier).replace(/\.png$/, ''), res = null, suite = Promise.resolve();
    specs.forEach(function (sp, i) {
      suite = suite.then(function () { return new Promise(function (ok) { setTimeout(ok, i ? 400 : 0); }); })
        .then(function () { return telechargerUne(sp, specs.length > 1 ? base + '-' + (i + 1) + '.png' : base + '.png'); })
        .then(function (r) { if (!res) res = r; res.nombre = specs.length; });
    });
    return suite.then(function () { return res; });
  }

  /* ---------- Copie du texte ---------- */
  function copier(t) {
    return new Promise(function (ok) {
      function repli() {
        var ta = document.createElement('textarea'), bon = false;
        ta.value = t; ta.setAttribute('readonly', ''); ta.setAttribute('aria-hidden', 'true');
        ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
        document.body.appendChild(ta); ta.focus(); ta.select();
        try { ta.setSelectionRange(0, t.length); bon = document.execCommand('copy'); } catch (e) { bon = false; }
        ta.remove(); ok(bon ? 'repli' : 'manuel');
      }
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        try { navigator.clipboard.writeText(t).then(function () { ok('ok'); }, repli); } catch (e) { repli(); }
      } else repli();
    });
  }

  /* ---------- Boutons et clics ---------- */
  api.enregistrer = function (nom, fn) { sources[nom] = fn; };
  api.boutons = function (source, id) {
    var a = ' data-exp-source="' + esc(source) + '" data-exp-id="' + esc(id) + '"';
    return '<div class="exp-groupe"><p class="exp-consigne">Pour Facebook : téléchargez l’image, copiez le texte, puis publiez sur la page Facebook du club.</p>'
      + '<div class="pub-boutons exp-boutons"><button type="button" class="bouton ligne petit"' + a + ' data-exp-action="image">Télécharger l’image</button>'
      + '<button type="button" class="bouton ligne petit"' + a + ' data-exp-action="texte">Copier le texte</button></div>'
      + '<div class="exp-etat" role="status" aria-live="polite"></div></div>';
  };
  api.dessiner = dessiner; api.telecharger = telecharger; api.copier = copier;

  function dire(groupe, msg, texteAChoisir) {
    var z = groupe && groupe.querySelector('.exp-etat'); if (!z) return;
    z.textContent = ''; z.className = 'exp-etat';
    setTimeout(function () {
      z.textContent = msg;
      if (texteAChoisir) {
        var ta = document.createElement('textarea'); ta.readOnly = true; ta.className = 'exp-manuel'; ta.rows = 5; ta.value = texteAChoisir;
        ta.setAttribute('aria-label', 'Texte à copier'); z.appendChild(ta); ta.focus(); ta.select();
      }
    }, 40);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-exp-action]') : null; if (!b) return;
    var fn = sources[b.getAttribute('data-exp-source')]; if (!fn) return;
    var groupe = b.closest('.exp-groupe'), action = b.getAttribute('data-exp-action'), d;
    try { d = fn(b.getAttribute('data-exp-id')); } catch (x) { d = null; }
    if (!d) { dire(groupe, 'Cette publication n’est plus disponible : préparez-la de nouveau.'); return; }
    if (d.erreur) { dire(groupe, d.erreur); return; }
    if (action === 'image') {
      b.disabled = true; b.setAttribute('aria-busy', 'true'); dire(groupe, 'Préparation de l’image…');
      telecharger(d.spec, d.fichier).then(function (r) {
        dire(groupe, r.nombre > 1 ? r.nombre + ' images téléchargées (' + r.largeur + ' x ' + r.hauteur + ' pixels chacune) : les résultats sont répartis pour rester lisibles. Joignez-les toutes à la publication Facebook.'
          : 'Image téléchargée (' + r.largeur + ' x ' + r.hauteur + ' pixels) : elle est dans vos téléchargements. Joignez-la à la publication Facebook.');
      }, function () {
        dire(groupe, 'L’image n’a pas pu être créée. Ouvrez la page depuis son adresse en ligne (et non depuis un fichier de l’ordinateur), puis recommencez.');
      }).then(function () { b.disabled = false; b.removeAttribute('aria-busy'); });
    } else {
      copier(d.texte).then(function (r) {
        if (r === 'manuel') dire(groupe, 'Votre navigateur refuse la copie automatique : le texte est sélectionné ci-dessous, faites Ctrl+C (ou appui long, puis Copier).', d.texte);
        else dire(groupe, 'Texte copié. Collez-le dans la publication Facebook.');
      });
    }
  });

  window.BCRExport = api;
})();
