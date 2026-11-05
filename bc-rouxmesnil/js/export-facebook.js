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
     Mise en page reprise des vraies affiches du club (fond texturé, logo et grand titre en tête, pastille de date, une carte
     blanche par match, bandeau du mois en pied), dessinée ici en formes simples : aucune image extérieure, seulement le logo
     du club et les logos d'adversaires déjà présents sur le site (sinon un rond avec les initiales).
     Une seule mise en page (liste de primitives : chemins, rectangles, dégradés, logos, textes) peinte de deux façons :
     en SVG dans la page (aperçu à l'écran) et sur un canvas (fichier PNG). L'aperçu et le fichier ne peuvent donc pas différer.
     Description d'une affiche (spec.type = 'affiche') :
       modele : 'couverture' | 'jour' | 'resultats' ; mode : 'rdv' | 'res' (couverture) ; theme : { id, fond, accent, nom, emb } ;
       titre ; dates ; lieu ('dom' | 'ext') ; salleDom ; suite ; resume ; compte : { dom, ext } ou { v, n } ; alt ;
       lignes : [{ heure, jourCourt, code, adv, sig, logo, salle, lieuTxt, bcr, ad, v }].
     Aucun émoji et aucun logo de fédération sur les affiches : la pastille de division est un simple rond dessiné. */
  var HP = 1350;
  var EMBLEMES = {
    ruban: { remp: [], trait: ['M34 95 C45 68 51 57 60 43 C71 27 71 9 53 7 C37 5 33 20 43 36 C51 50 58 66 67 95'], lw: 9 },
    moustache: { remp: ['M50 44 C44 33 30 29 16 36 C7 41 2 50 3 60 C11 53 21 51 31 53 C40 55 46 54 50 50 C54 54 60 55 69 53 C79 51 89 53 97 60 C98 50 93 41 84 36 C70 29 56 33 50 44 Z'], trait: [], lw: 0 },
    ballon: { remp: [], trait: ['M6 50 A44 44 0 1 0 94 50 A44 44 0 1 0 6 50 Z', 'M50 6 V94', 'M6 50 H94', 'M19 17 C37 35 37 65 19 83', 'M81 17 C63 35 63 65 81 83'], lw: 4 }
  };
  /* Pictogrammes dessinés dans un carré de 100 x 100 : r = formes pleines, t = traits (épaisseur lw). */
  var PICTOS = {
    calendrier: { r: ['M10 30 Q10 22 18 22 H82 Q90 22 90 30 V42 H10 Z', 'M24 52h13v11h-13z M44 52h13v11h-13z M64 52h13v11h-13z M24 70h13v11h-13z M44 70h13v11h-13z M64 70h13v11h-13z'],
      t: ['M18 22 H82 Q90 22 90 30 V84 Q90 92 82 92 H18 Q10 92 10 84 V30 Q10 22 18 22 Z', 'M32 10 V30', 'M68 10 V30'], lw: 8 },
    maison: { r: ['M50 6 L97 47 L89 56 L82 50 V93 H60 V66 H40 V93 H18 V50 L11 56 L3 47 Z'], t: [], lw: 0 },
    avion: { r: ['M95 41 C100 44 100 56 95 59 L63 57 L41 94 H30 L43 57 L19 55 L11 69 H3 L7 50 L3 31 H11 L19 45 L43 43 L30 6 H41 L63 43 Z'], t: [], lw: 0 },
    lieu: { r: ['M50 3 C29 3 14 19 14 39 C14 63 50 97 50 97 C50 97 86 63 86 39 C86 19 71 3 50 3 Z M50 23 A16 16 0 1 0 50 55 A16 16 0 1 0 50 23 Z'], t: [], lw: 0, pair: true },
    coeur: { r: ['M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C39 8 46 13 50 20 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z'], t: [], lw: 0 },
    ruban: { r: [], t: EMBLEMES.ruban.trait, lw: 13 },
    megaphone: { r: ['M8 38 H28 L72 13 V87 L28 62 H8 Z M30 64 L40 91 H53 L45 64 Z'], t: ['M83 33 Q93 50 83 67'], lw: 7 },
    chevron: { r: [], t: ['M22 14 L62 50 L22 86'], lw: 20 },
    ballon: { r: [], t: EMBLEMES.ballon.trait, lw: 6 },
    moustache: { r: ['M50 42 C44 34 34 32 26 36 C18 40 14 48 8 50 C4 51 2 47 4 43 C0 46 0 54 6 57 C14 61 26 58 34 55 C42 52 47 51 50 48 C53 51 58 52 66 55 C74 58 86 61 94 57 C100 54 100 46 96 43 C98 47 96 51 92 50 C86 48 82 40 74 36 C66 32 56 34 50 42 Z'], t: [], lw: 0 }
  };
  /* Couleurs du mois : bleu (Movember), rose (Octobre rose), sinon le vert et noir du club. */
  var PALETTES = {
    bleu: { nuit: '#030a22', fonce: '#0a2260', vif: '#1f5fd0', eclat: '#4a93ff', clair: '#9fcbff', encre: '#0a1d4a', trait: '#d5e0f3', carte: '#eaf1fc', defaite: '#36435f' },
    rose: { nuit: '#1e030d', fonce: '#5a0a2f', vif: '#d8186f', eclat: '#ff58a0', clair: '#ffb1d3', encre: '#4a0a26', trait: '#f1d4e2', carte: '#fcebf3', defaite: '#5b3a48' },
    vert: { nuit: '#020503', fonce: '#0a2814', vif: '#1f7a3f', eclat: '#3dbb67', clair: '#9fe6b6', encre: '#0c2a17', trait: '#d3e6d9', carte: '#ecf6ef', defaite: '#3a4a40' }
  };
  function paletteDe(th) { return PALETTES[th && th.id] || (th && th.emb === 'moustache' ? PALETTES.bleu : th && th.emb === 'ruban' ? PALETTES.rose : PALETTES.vert); }
  function rgba(hex, a) {
    var h = String(hex).replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    if (a === undefined || a === null) a = 1;
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
  }
  function n1(v) { return Math.round(v * 10) / 10; }
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, h / 2, w / 2));
    var a = 'A' + n1(r) + ' ' + n1(r) + ' 0 0 1 ';
    return 'M' + n1(x + r) + ' ' + n1(y) + 'H' + n1(x + w - r) + a + n1(x + w) + ' ' + n1(y + r) + 'V' + n1(y + h - r) + a + n1(x + w - r) + ' ' + n1(y + h)
      + 'H' + n1(x + r) + a + n1(x) + ' ' + n1(y + h - r) + 'V' + n1(y + r) + a + n1(x + r) + ' ' + n1(y) + 'Z';
  }
  function cercle(cx, cy, r) { var a = 'A' + n1(r) + ' ' + n1(r) + ' 0 1 0 '; return 'M' + n1(cx - r) + ' ' + n1(cy) + a + n1(cx + r) + ' ' + n1(cy) + a + n1(cx - r) + ' ' + n1(cy) + 'Z'; }
  var mesureCtx = null;
  function mesure() { if (!mesureCtx) mesureCtx = document.createElement('canvas').getContext('2d'); return mesureCtx; }
  function mettreEnPage(s) {
    return polices().then(function () {
      var th = s.theme || {}, K = paletteDe(th), P = [], mc = mesure(), LOGO = 'img/logo-bcr-160.webp';
      var movember = th.id === 'bleu' || (!th.id && th.emb === 'moustache');
      var graine = 1;
      String(s.modele + (s.mode || '') + (s.lieu || '')).split('').forEach(function (c) { graine = (graine * 31 + c.charCodeAt(0)) % 2147483646 + 1; });
      function alea() { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; }
      function R(x, y, w, h, f, op) { P.push({ k: 'rect', x: x, y: y, w: w, h: h, f: f, op: op }); }
      function PA(d, o) { o = o || {}; P.push({ k: 'path', d: d, f: o.f || null, s: o.s || null, lw: o.lw || 0, op: o.op === undefined ? 1 : o.op, pair: !!o.pair, tr: o.tr || null }); }
      function G(id, type, c, st) { P.push({ k: 'grad', id: id, type: type, c: c, st: st }); return { g: id }; }
      function CLIP(d) { P.push({ k: 'clip', d: d }); }
      function FINCLIP() { P.push({ k: 'finclip' }); }
      function T(t, x, y, taille, o) { o = o || {}; P.push({ k: 'txt', t: t, x: x, y: y, taille: taille, f: o.f || 't', it: !!o.it, gras: !!o.gras, c: o.c || '#fff', al: o.al || 'left', ls: o.ls || 0, op: o.op === undefined ? 1 : o.op }); }
      function fonteDe(o) { return o.f === 'x' ? function (z) { return texte(z, o.gras); } : function (z) { return titre(z, o.it); }; }
      /* Plus grande taille (entre tmax et tmin) à laquelle le texte tient sur une ligne ; sinon points de suspension. */
      function ajusteLigne(t, tmax, tmin, largeur, o) {
        o = o || {};
        espacement(mc, o.ls || 0);
        var r = ajuster(mc, String(t), fonteDe(o), tmax, tmin, largeur);
        var z = parseFloat(mc.font.match(/(\d+(?:\.\d+)?)px/)[1]), w = mc.measureText(r).width;
        espacement(mc, 0);
        return { t: r, z: z, w: w };
      }
      function TT(t, x, y, tmax, tmin, largeur, o) { var a = ajusteLigne(t, tmax, tmin, largeur, o); T(a.t, x, y, a.z, o); return a.z; }
      function logo(src, sig, cx, cy, r, o) { o = o || {}; P.push({ k: 'logo', src: src || '', sig: sig || '', cx: cx, cy: cy, r: r, fond: o.fond || '', anneau: o.anneau || '', rep: o.rep || '', zs: o.zs || 0 }); }
      /* Initiales de repli plus parlantes : le sigle si le nom en est un (« CBPQ »), sans numéro d'équipe (« BO2 » -> « BO »),
         au moins deux signes (« Comité 76 » -> « C76 »). Rien n'est inventé : tout vient du nom ou du sigle fournis. */
      function sigleAff(adv, sig) {
        var nom = String(adv || '').replace(/\([^)]*\)/g, ' ').replace(/[ \t]+-?\s*\d+\s*$/, '').trim();
        if (/^[A-ZÀ-Ý]{2,5}$/.test(nom)) return nom;
        var s = maj(sig || '').replace(/(\D)\d+$/, '$1');
        if (s.length >= 2) return s;
        var num = /\b(\d{2,3})\b/.exec(String(adv || ''));
        if (num) return (s || maj(nom.charAt(0))) + num[1];
        var lettres = maj(nom).replace(/[^A-ZÀ-Ý]/g, '');
        return lettres.length >= 2 ? lettres.slice(0, 2) : (s || lettres);
      }
      function picto(nom, x, y, taille, c, o) {
        var d = PICTOS[nom]; if (!d) return; o = o || {};
        var tr = [n1(x), n1(y), taille / 100];
        d.r.forEach(function (v) { PA(v, { f: c, tr: tr, pair: d.pair, op: o.op }); });
        d.t.forEach(function (v) { PA(v, { s: c, lw: o.lw || d.lw, tr: tr, op: o.op }); });
      }
      /* Coupe un texte en lignes : aux espaces et après les traits d'union (« Mesnil-Franqueville-Boos »). */
      function casser(t, largeur) {
        var mots = String(t).replace(/[ \t\r\n]+/g, ' ').trim().split(' '), lignes = [], cur = '';
        /* Un mot d'une lettre (« À », « & ») reste collé au mot qui le suit. */
        for (var q = mots.length - 2; q >= 0; q--) if (mots[q].length <= 1) mots.splice(q, 2, mots[q] + ' ' + mots[q + 1]);
        mots.forEach(function (mot) {
          var morceaux = mot.match(/[^-]+-?|-/g) || [mot];
          morceaux.forEach(function (mc2, k) {
            var essai = cur + (k === 0 && cur ? ' ' : '') + mc2;
            if (cur && mc.measureText(essai).width > largeur) { lignes.push(cur.replace(/\s+$/, '')); cur = mc2; } else cur = essai;
          });
        });
        if (cur) lignes.push(cur);
        /* Pas de dernière ligne orpheline (« 2 » seul) : on y descend le mot précédent. */
        var n = lignes.length;
        if (n > 1 && lignes[n - 1].length <= 2 && / /.test(lignes[n - 2])) {
          var i = lignes[n - 2].lastIndexOf(' ');
          lignes[n - 1] = lignes[n - 2].slice(i + 1) + ' ' + lignes[n - 1]; lignes[n - 2] = lignes[n - 2].slice(0, i);
        }
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
        var haut = Math.max(1, Math.min(maxL, Math.floor(hauteur / (z * inter)))), coupe = lignes.length > haut;
        if (lignes.length > haut) {
          lignes = lignes.slice(0, haut);
          var d = lignes[haut - 1];
          while (d.length > 1 && mc.measureText(d + '…').width > largeur) d = d.slice(0, -1);
          lignes[haut - 1] = d.replace(/[\s.,;:-]+$/, '') + '…';
        }
        lignes = lignes.map(function (x) {
          while (x.length > 1 && mc.measureText(x).width > largeur + 0.5) { x = x.slice(0, -2) + '…'; coupe = true; }
          return x;
        });
        return { taille: z, lignes: lignes, pas: z * inter, coupe: coupe };
      }
      /* Deux lignes se lisent mieux que trois, mais pas au prix d'une police bien plus petite : on garde trois lignes
         seulement quand les deux lignes tomberaient sous 24 px et que trois lignes donnent au moins 3 px de plus. */
      function choixBloc(t, fonte, tmax, tmin, largeur, hauteur, inter, maxL) {
        var b2 = blocT(t, fonte, tmax, tmin, largeur, hauteur, inter, Math.min(2, maxL));
        if (maxL <= 2) return b2;
        var b3 = blocT(t, fonte, tmax, tmin, largeur, hauteur, inter, maxL);
        if (b2.coupe && !b3.coupe) return b3;
        return !b3.coupe && b2.taille < 24 && b3.taille >= b2.taille + 3 ? b3 : b2;
      }
      /* Paragraphe (titre droit en capitales par défaut) centré verticalement sur cy ; rend sa hauteur. */
      function paragraphe(t, x, cy, largeur, hauteur, tmax, tmin, maxL, o) {
        o = o || {}; var oo = { f: o.f || 't', it: !!o.it, gras: o.gras, c: o.c || '#fff', al: o.al || 'left', op: o.op };
        var b = choixBloc(t, fonteDe(oo), tmax, tmin, largeur, hauteur, o.inter || 1.02, maxL);
        var tot = b.lignes.length * b.pas, y = cy - tot / 2;
        b.lignes.forEach(function (ln, k) { T(ln, x, y + b.taille * .8 + k * b.pas, b.taille, oo); });
        return tot;
      }
      function cheminLogo(f) { return f ? (f.indexOf('/') >= 0 ? f : 'img/logos/' + f) : ''; }

      /* ---- Fond texturé : dégradé, halo de lumière, traînées diagonales, grain ---- */
      function traineesDans(y0, y1, nb, opMax) {
        var pente = 0.62;
        for (var k = 0; k < nb; k++) {
          var lg = 160 + alea() * 620, ya = y0 + alea() * (y1 - y0 + lg) - lg / 2, yb = ya + lg;
          var x = alea() * (W + 700) - 600, w = 2 + alea() * alea() * 46;
          var blanc = alea() < .45;
          PA('M' + n1(x) + ' ' + n1(yb) + 'L' + n1(x + w) + ' ' + n1(yb) + 'L' + n1(x + w + pente * lg) + ' ' + n1(ya) + 'L' + n1(x + pente * lg) + ' ' + n1(ya) + 'Z',
            { f: blanc ? '#ffffff' : K.eclat, op: Math.round((.03 + alea() * opMax) * 1000) / 1000 });
        }
      }
      function grain(y0, y1, nb) {
        var d = '';
        for (var k = 0; k < nb; k++) { var gx = n1(alea() * W), gy = n1(y0 + alea() * (y1 - y0)), gt = n1(1.5 + alea() * 3); d += 'M' + gx + ' ' + gy + 'h' + gt + 'v' + gt + 'h-' + gt + 'z'; }
        PA(d, { f: '#ffffff', op: .14 });
      }
      function fondAffiche(haloY) {
        R(0, 0, W, HP, G('fd', 'lin', [0, 0, 300, HP], [[0, K.fonce], [.5, K.nuit], [1, K.nuit]]));
        R(0, 0, W, HP, G('halo', 'rad', [W / 2 + 40, haloY, 720], [[0, '#ffffff', .34], [.3, K.eclat, .26], [.7, K.vif, .08], [1, K.vif, 0]]));
        traineesDans(0, HP, 54, .13);
        /* Grand faisceau de lumière derrière le titre. */
        PA('M' + 120 + ' ' + (haloY + 520) + 'L' + 420 + ' ' + (haloY + 520) + 'L' + 1000 + ' ' + (haloY - 420) + 'L' + 820 + ' ' + (haloY - 420) + 'Z', { f: G('fx', 'lin', [0, haloY + 520, 0, haloY - 420], [[0, '#ffffff', 0], [.5, '#ffffff', .12], [1, '#ffffff', 0]]) });
        grain(0, HP, 220);
        R(0, 0, W, HP, G('vg', 'rad', [W / 2, HP / 2, 900], [[.55, K.nuit, 0], [1, K.nuit, .8]]));
      }
      /* ---- Petit titre « BASKET CLUB DE ROUXMESNIL » encadré de deux traits ---- */
      function petitTitre(cx, y, x0, x1, taille) {
        var a = ajusteLigne('BASKET CLUB DE ROUXMESNIL', taille, 22, x1 - x0 - 120, { ls: 3 });
        T(a.t, cx, y, a.z, { ls: 3, al: 'center' });
        var g = cx - a.w / 2 - 18, d = cx + a.w / 2 + 18, ly = n1(y - a.z * .34);
        if (g - x0 > 20) PA('M' + x0 + ' ' + ly + 'H' + n1(g), { s: K.eclat, lw: 5 });
        if (x1 - d > 20) PA('M' + n1(d) + ' ' + ly + 'H' + x1, { s: K.eclat, lw: 5 });
      }
      /* ---- Gros titre sur deux lignes : « RENDEZ-VOUS » droit blanc, « DU WEEK-END » italique ---- */
      function grosTitre(l1, l2, cx, y1, y2, t1, t2, largeur) {
        var a = ajusteLigne(l1, t1, 60, largeur, {}), b = ajusteLigne(l2, t2, 60, largeur, { it: true });
        T(a.t, cx + 5, y1 + 6, a.z, { al: 'center', c: K.nuit, op: .55 });
        T(a.t, cx, y1, a.z, { al: 'center' });
        T(b.t, cx + 5, y2 + 6, b.z, { it: true, al: 'center', c: K.nuit, op: .55 });
        T(b.t, cx, y2, b.z, { it: true, al: 'center', c: K.eclat });
        var w = Math.max(b.w, a.w * .8), x0 = cx - w / 2 + 30, x1 = cx + w / 2 - 10, yy = y2 + 26;
        PA('M' + n1(x0) + ' ' + n1(yy + 4) + 'Q' + n1(cx) + ' ' + n1(yy - 16) + ' ' + n1(x1) + ' ' + n1(yy - 6) + 'L' + n1(x1 - 6) + ' ' + n1(yy + 4) + 'Q' + n1(cx) + ' ' + n1(yy - 4) + ' ' + n1(x0 + 6) + ' ' + n1(yy + 14) + 'Z', { f: K.eclat });
      }
      function blasonClub(cx, cy, r) {
        PA(cercle(cx, cy, r + 16), { f: K.eclat, op: .28 });
        PA(cercle(cx, cy, r + 7), { f: '#ffffff' });
        logo(LOGO, 'BCR', cx, cy, r, { fond: 'noir' });
      }
      /* ---- Bandeau du bas ---- */
      function bandeau(y0) {
        var bord = 'M0 ' + (y0 + 16) + 'L90 ' + (y0 + 6) + 'L210 ' + (y0 + 14) + 'L360 ' + y0 + 'L520 ' + (y0 + 12) + 'L690 ' + (y0 - 2) + 'L860 ' + (y0 + 10) + 'L1080 ' + y0;
        var zone = bord + 'V' + HP + 'H0Z';
        PA(zone, { f: G('bd', 'lin', [0, y0, 0, HP], movember ? [[0, K.fonce], [1, K.nuit]] : [[0, '#0b2614'], [1, '#020403']]) });
        CLIP(zone); traineesDans(y0, HP, 18, .16); grain(y0, HP, 60); FINCLIP();
        PA(bord, { s: movember ? K.eclat : '#46c46f', lw: 5 });
        var h = HP - y0;
        if (movember) {
          /* Marges : environ 28 px sous le bord du bandeau et au moins 26 px au-dessus du bas de l'image. */
          var valeurs = ['PASSION', 'ESPRIT D\'ÉQUIPE', 'RESPECT', 'ROUXMESNIL'], pv = (h - 30 - 26) / 4;
          valeurs.forEach(function (v, k) {
            var by = y0 + 30 + pv * k + pv * .76;
            picto('chevron', 34 + k * 5, by - 19, 18, K.eclat);
            TT(v, 58 + k * 5, by, 30, 18, 220, { it: true });
          });
          /* Plaque blanche, ruban, moustache et « LE BCR SOUTIENT MOVEMBER ». */
          var py = y0 + 24;
          PA('M300 ' + (py + 6) + 'L776 ' + (py - 2) + 'L762 ' + (HP - 26) + 'L286 ' + (HP - 20) + 'Z', { f: '#ffffff', op: .96 });
          picto('ruban', 332, py + 2, 88, K.vif, { lw: 15 });
          picto('moustache', 306, py + 22, 140, '#111317');
          var bx = 466;
          TT('LE BCR', bx, py + 50, 50, 30, 280, { it: true, c: K.vif, ls: 1 });
          TT('SOUTIENT', bx + 26, py + 78, 27, 18, 250, { it: true, c: '#111317', ls: 1 });
          PA('M' + (bx - 8) + ' ' + (py + 85) + 'L756 ' + (py + 80) + 'L750 ' + (py + 126) + 'L' + (bx - 16) + ' ' + (py + 129) + 'Z', { f: K.vif });
          TT('MOVEMBER', bx + 4, py + 122, 54, 30, 280, { it: true, ls: 1 });
          var causes = [['coeur', 'SANTÉ MASCULINE'], ['ruban', 'PRÉVENTION'], ['megaphone', 'SENSIBILISATION']], pc = (h - 30 - 26) / 3;
          causes.forEach(function (c, k) {
            var cy = y0 + 26 + pc * k + pc / 2;
            PA(cercle(816, cy, 21), { s: '#ffffff', lw: 3.5 });
            picto(c[0], 816 - 12, cy - 12, 24, '#ffffff', c[0] === 'ruban' ? { lw: 16 } : {});
            TT(c[1], 848, cy + 10, 30, 16, W - 36 - 848, { it: true });
          });
        } else {
          var vert = '#46c46f';
          PA('M0 ' + (HP - 18) + 'H' + W + 'V' + HP + 'H0Z', { f: '#1f7a3f' });
          picto('ballon', 46, y0 + h / 2 - 50, 92, vert);
          picto('ballon', W - 46 - 92, y0 + h / 2 - 50, 92, vert);
          TT('PASSION · ESPRIT D\'ÉQUIPE · RESPECT', W / 2, y0 + h / 2 + 8, 62, 30, W - 2 * 170, { it: true, al: 'center', ls: 1 });
          TT('BASKET CLUB DE ROUXMESNIL', W / 2, y0 + h / 2 + 56, 30, 18, W - 2 * 170, { al: 'center', c: vert, ls: 4 });
        }
      }

      /* ---- Cartes des matchs ---- */
      var XC = 40, WC = W - 80;
      function carteFond(i, y, h) {
        PA(rr(XC, y + 6, WC, h, 18), { f: K.nuit, op: .5 });
        PA(rr(XC, y, WC, h, 18), { f: G('ct' + i, 'lin', [0, y, 0, y + h], [[0, '#ffffff'], [1, K.carte]]) });
      }
      function blocBleu(x, y, w, h, vif) {
        PA(rr(x, y, w, h, 12), { f: vif === false ? K.defaite : { g: 'tb' } });
        PA(rr(x, y, w, h * .48, 12), { f: '#ffffff', op: .08 });
      }
      function division(code, cx, cy, h, largeur) {
        var fc = Math.min(28, Math.floor(h * .23)), disque = Math.max(11, Math.min(20, Math.floor(h * .15)));
        mc.font = titre(fc); espacement(mc, 0);
        code = maj(code || '');
        var lignes = / /.test(code) ? blocT(code, function (z) { return titre(z); }, fc, 13, largeur, h * .5, 1.0, 2) : null;
        var hc = lignes ? lignes.lignes.length * lignes.pas : fc, avec = hc + 8 + 2 * disque <= h - 18, tot = hc + (avec ? 8 + 2 * disque : 0), top = cy - tot / 2;
        if (lignes) lignes.lignes.forEach(function (ln, k) { T(ln, cx, top + lignes.taille * .8 + k * lignes.pas, lignes.taille, { al: 'center', c: K.encre }); });
        else TT(code, cx, top + fc * .8, fc, 13, largeur, { al: 'center', c: K.encre });
        if (avec) {
          var dy = top + hc + 8 + disque;
          PA(cercle(cx, dy, disque), { f: { g: 'tb' } });
          PA(cercle(cx, dy, disque - 3), { s: '#ffffff', lw: 1.5, op: .7 });
          picto('ballon', cx - disque * .62, dy - disque * .62, disque * 1.24, '#ffffff', { lw: 8 });
        }
      }
      function separateur(x, y, h) { PA('M' + x + ' ' + n1(y + 14) + 'V' + n1(y + h - 14), { s: K.trait, lw: 3 }); }
      /* Nom du club à côté de son logo : deux lignes lisibles sur téléphone (22 px au moins) ; si la carte est trop basse,
         « BCR » seul plutôt qu'un texte minuscule. */
      function texteClub(h) {
        var z = Math.max(22, Math.min(26, Math.floor(h * .2)));
        var a = ajusteLigne('BASKET CLUB', z, 22, 112, {}), b = ajusteLigne('ROUXMESNIL', z, 22, 112, {});
        var ok = h >= 104 && a.t === 'BASKET CLUB' && b.t === 'ROUXMESNIL';
        if (!ok) { var c = ajusteLigne('BCR', 36, 22, 112, { it: true }); return { bcr: true, z: c.z, w: Math.ceil(c.w) + 2 }; }
        var zz = Math.min(a.z, b.z), w1 = ajusteLigne('BASKET CLUB', zz, zz, 999, {}).w, w2 = ajusteLigne('ROUXMESNIL', zz, zz, 999, {}).w;
        return { bcr: false, z: zz, w: Math.ceil(Math.max(w1, w2)) + 2 };
      }
      function blocClub(x, cy, r, h) {
        logo(LOGO, 'BCR', x + r, cy, r, { fond: 'noir' });
        if (h < 80) return;
        var tx = x + 2 * r + 9, tc = texteClub(h);
        if (tc.bcr) { T('BCR', tx, cy + tc.z * .35, tc.z, { it: true, c: K.encre }); return; }
        T('BASKET CLUB', tx, cy - tc.z * .14, tc.z, { c: K.encre });
        T('ROUXMESNIL', tx, cy + tc.z * .86, tc.z, { c: K.encre });
      }
      function rayon(h) { return Math.max(18, Math.min(38, Math.floor(h * .25))); }
      function largeurClub(h) { return h < 80 ? 2 * rayon(h) : 2 * rayon(h) + 9 + texteClub(h).w; }
      /* Zone de texte de l'adversaire (même calcul pour toutes les cartes d'une affiche). */
      function zoneAdv(x0, x1, h) { var r = rayon(h), la = x1 - x0 - largeurClub(h) - 54; return { r: r, larg: la - 2 * r - 10 }; }
      /* Taille qu'aurait le nom de l'adversaire seul dans sa carte (sans rien dessiner). */
      function tailleAdv(t, largeur, hauteur, tmax) { return choixBloc(t, function (z) { return titre(z); }, tmax, 13, largeur, hauteur, 1.02, 3).taille; }
      var plafondAdv = 99;
      function blocAdv(l, x, largeur, cy, r, h) {
        var sg = sigleAff(l.adv, l.sig);
        logo(cheminLogo(l.logo), sg, x + r, cy, r, { fond: 'blanc', anneau: K.trait, rep: K.vif, zs: sg.length >= 4 ? .56 : sg.length === 3 ? .68 : .78 });
        var tx = x + 2 * r + 10;
        paragraphe(maj(l.adv), tx, cy, x + largeur - tx, h - 18, Math.min(plafondAdv, Math.min(36, Math.floor(h * .25))), 13, 3, { c: K.encre });
      }
      function vs(cx, cy, h) { var z = Math.min(46, Math.floor(h * .36)); T('VS', cx, cy + z * .35, z, { it: true, al: 'center', c: K.vif }); }
      /* Le club toujours à gauche, comme sur ses affiches ; l'icône maison / avion dit où se joue le match. */
      function equipes(l, x0, x1, cy, h) {
        var r = rayon(h), lc = largeurClub(h), lv = 54, la = x1 - x0 - lc - lv;
        blocClub(x0, cy, r, h); vs(x0 + lc + lv / 2, cy, h); blocAdv(l, x0 + lc + lv, la, cy, r, h);
      }
      /* Une seule taille (à 3 px près) pour les noms d'adversaires d'une même affiche. */
      function uniformiserAdv(lignes, x0, x1, h) {
        var za = zoneAdv(x0, x1, h), tmax = Math.min(36, Math.floor(h * .25)), mini = tmax;
        lignes.forEach(function (l) { mini = Math.min(mini, tailleAdv(maj(l.adv), za.larg, h - 18, tmax)); });
        plafondAdv = mini + 3;
      }
      /* Salle : le nom en capitales, la ville en dessous (20 px au moins, sur deux lignes s'il le faut), centrés dans la colonne. */
      function blocSalle(salle, x, cy, largeur, hauteur) {
        var parts = String(salle).split(' – '), nom = maj(parts[0]), ville = parts.length > 1 ? maj(parts.slice(1).join(' – ')) : '';
        var zn = Math.max(18, Math.min(25, Math.floor(hauteur * .23))), zv = Math.max(18, Math.min(22, Math.round(zn * .88)));
        var bv = ville ? blocT(ville, function (z) { return titre(z); }, zv, Math.min(18, zv), largeur, hauteur * .5, 1.02, 2) : null;
        /* Affiche très chargée seulement : plutôt une ville plus petite qu'une ville coupée. */
        if (bv && bv.coupe) bv = blocT(ville, function (z) { return titre(z); }, zv, 13, largeur, hauteur * .5, 1.02, 2);
        var hv = bv ? bv.lignes.length * bv.pas + 2 : 0;
        var b = blocT(nom, function (z) { return titre(z); }, zn, 15, largeur, hauteur - hv, 1.02, 3);
        var tot = b.lignes.length * b.pas + hv, y = cy - tot / 2;
        b.lignes.forEach(function (ln, k) { T(ln, x, y + b.taille * .8 + k * b.pas, b.taille, { c: K.encre }); });
        if (bv) bv.lignes.forEach(function (ln, k) { T(ln, x, y + b.lignes.length * b.pas + 2 + bv.taille * .8 + k * bv.pas, bv.taille, { c: K.vif }); });
      }
      function carteRdv(l, i, y, h, colonne) {
        var cy = y + h / 2;
        carteFond(i, y, h);
        blocBleu(50, y + 8, 160, h - 16);
        var hz = Math.min(l.heure ? 76 : 58, Math.floor((h - 16) * .56));
        TT(l.heure || l.jourCourt, 130, cy + hz * .35, hz, 22, 144, { it: true, al: 'center', ls: 1 });
        division(l.code, 266, cy, h, 92);
        separateur(318, y, h);
        equipes(l, 330, finRdv(colonne), cy, h);
        if (colonne) {
          separateur(812, y, h);
          var salle = l.salle || (s.lieu === 'dom' ? s.salleDom : '');
          var tp = Math.min(40, Math.floor(h * .34));
          if (salle) {
            picto('lieu', 822, cy - tp / 2, tp, K.vif);
            blocSalle(salle, 822 + tp + 6, cy, W - XC - 12 - (822 + tp + 6), h - 16);
          } else {
            /* Salle pas encore connue : on le dit, sans rien deviner. */
            picto('lieu', 822, cy - tp / 2, tp, '#9aa5b8');
            paragraphe('LIEU À CONFIRMER', 822 + tp + 6, cy, W - XC - 12 - (822 + tp + 6), h - 16, Math.max(18, Math.min(24, Math.floor(h * .2))), 16, 2, { c: '#7d889c' });
          }
        }
      }
      function finRdv(colonne) { return colonne ? 806 : W - XC - 14; }
      function carteRes(l, i, y, h) {
        var cy = y + h / 2;
        carteFond(i, y, h);
        blocBleu(50, y + 8, 176, h - 16, l.v);
        var sz = Math.min(64, Math.floor((h - 16) * .44)), lz = Math.max(12, Math.min(20, Math.floor(h * .14))), etiq = l.v === true ? 'VICTOIRE' : l.v === false ? 'DÉFAITE' : '';
        var tot = sz * .78 + (etiq ? 8 + lz : 0), top = cy - tot / 2;
        TT(l.bcr + ' - ' + l.ad, 138, top + sz * .78, sz, 24, 160, { it: true, al: 'center' });
        if (etiq) T(etiq, 138, top + sz * .78 + 8 + lz * .85, lz, { al: 'center', ls: 3, c: l.v === true ? '#ffffff' : 'rgba(255,255,255,.8)' });
        division(l.code, 282, cy, h, 96);
        separateur(338, y, h);
        equipes(l, 350, 868, cy, h);
        separateur(878, y, h);
        if (l.lieuTxt) {
          /* Icône au-dessus, « À DOMICILE » / « À L'EXTÉRIEUR » sur une seule ligne en dessous, centrés dans la colonne. */
          var dom = /domicile/i.test(l.lieuTxt), ccx = (878 + W - XC) / 2, lw = W - XC - 878 - 20;
          var tp = Math.max(22, Math.min(40, Math.floor(h * .28))), al = ajusteLigne(maj(l.lieuTxt), Math.max(18, Math.min(24, Math.floor(h * .18))), 16, lw, {});
          var tot = tp + 8 + al.z * .8, top = cy - tot / 2;
          picto(dom ? 'maison' : 'avion', ccx - tp / 2, top, tp, K.vif);
          T(al.t, ccx, top + tp + 8 + al.z * .8, al.z, { al: 'center', c: K.encre });
        }
      }

      var BAND = 1172;
      G('tb', 'lin', [50, 0, 230, 0], [[0, K.eclat], [.45, K.vif], [1, K.fonce]]);
      if (s.modele === 'couverture') {
        fondAffiche(520);
        blasonClub(150, 150, 98);
        petitTitre(640, 108, 280, 1040, 40);
        var res = s.mode === 'res';
        grosTitre(res ? 'RÉSULTATS' : 'RENDEZ-VOUS', 'DU WEEK-END', W / 2, 436, 600, 210, 196, W - 2 * 56);
        /* Pastille des dates (sur deux lignes si le week-end compte deux jours). */
        var dt = maj(s.dates || ''), morceaux = dt.split(' & '), py = 688, ph = morceaux.length > 1 ? 196 : 132;
        PA(rr(56, py + 8, W - 112, ph, 40), { f: K.nuit, op: .5 });
        PA(rr(56, py, W - 112, ph, 40), { f: G('pd', 'lin', [56, 0, W - 56, 0], [[0, K.vif], [.6, K.fonce], [1, K.vif]]) });
        PA(rr(56, py, W - 112, ph, 40), { s: K.clair, lw: 3, op: .7 });
        /* Deux lignes équilibrées : « SAMEDI 7 & DIMANCHE 8 » puis « NOVEMBRE 2026 » quand le mois est commun ;
           sinon chaque jour sur sa ligne (« SAMEDI 31 OCTOBRE & » / « DIMANCHE 1er NOVEMBRE 2026 »). Le texte reste celui fourni. */
        var tw = W - 112 - 2 * 40 - 130, lgs;
        if (morceaux.length > 1) {
          var mm = /^(.*\d+(?:er)?)\s+([^\d&]+?(?:\s+\d{4})?)$/.exec(dt);
          lgs = mm && /\d(?:er)?$/.test(morceaux[0]) ? [mm[1], mm[2]] : [morceaux[0] + ' &', morceaux.slice(1).join(' & ')];
        } else lgs = [dt];
        var zd = 74, wl = 0;
        lgs.forEach(function (x) { zd = Math.min(zd, ajusteLigne(x, 74, 30, tw, { ls: 1 }).z); });
        lgs = lgs.map(function (x) { var a = ajusteLigne(x, zd, 30, tw, { ls: 1 }); wl = Math.max(wl, a.w); return a.t; });
        var gx = (W - (100 + 30 + wl)) / 2, tcx = gx + 130 + wl / 2, hl = zd * 1.1, ty0 = py + ph / 2 - (lgs.length * hl) / 2;
        picto('calendrier', gx, py + ph / 2 - 50, 100, '#ffffff');
        lgs.forEach(function (x, k) { T(x, tcx, ty0 + k * hl + zd * .86, zd, { al: 'center', ls: 1 }); });
        /* Comptes : matchs à domicile / à l'extérieur, ou victoires. */
        var c = s.compte || {}, rangs = [];
        if (res) {
          rangs.push(['ballon', c.v + (c.v > 1 ? ' VICTOIRES' : ' VICTOIRE') + ' SUR ' + c.n + (c.n > 1 ? ' MATCHS' : ' MATCH')]);
        } else {
          if (c.dom) rangs.push(['maison', c.dom + (c.dom > 1 ? ' MATCHS' : ' MATCH') + ' À DOMICILE']);
          if (c.ext) rangs.push(['avion', c.ext + (c.ext > 1 ? ' MATCHS' : ' MATCH') + ' À L\'EXTÉRIEUR']);
        }
        var haut0 = py + ph + 34, dispo = BAND - 24 - haut0, pas = Math.min(104, dispo / Math.max(1, rangs.length)), y0r = haut0 + (dispo - pas * rangs.length) / 2;
        rangs.forEach(function (rg, k) {
          var a = ajusteLigne(rg[1], 70, 32, W - 2 * 80 - 100, { it: true, ls: 1 }), larg = 84 + a.w, x0 = (W - larg) / 2, yb = y0r + pas * k + pas / 2;
          picto(rg[0], x0, yb - 34, 66, K.eclat, rg[0] === 'ballon' ? { lw: 8 } : {});
          T(a.t, x0 + 84, yb + a.z * .34, a.z, { it: true, ls: 1 });
        });
        bandeau(BAND);
      } else {
        var resu = s.modele === 'resultats';
        fondAffiche(250);
        /* Six matchs ou plus : en-tête plus compact, pour laisser de la place aux cartes. */
        var lignes = s.lignes || [], n = lignes.length, dense = n >= 6;
        var E = dense ? { bx: 132, by: 150, br: 86, ty: 56, tz: 30, y1: 166, y2: 268, z1: 118, z2: 108, py: 314, ph: 62, dz: 40, top: 400 }
          : { bx: 150, by: 196, br: 104, ty: 68, tz: 34, y1: 214, y2: 342, z1: 156, z2: 146, py: 398, ph: 70, dz: 46, top: 500 };
        blasonClub(E.bx, E.by, E.br);
        petitTitre(672, E.ty, 300, 1040, E.tz);
        grosTitre(resu ? 'RÉSULTATS' : 'RENDEZ-VOUS', 'DU WEEK-END', 672, E.y1, E.y2, E.z1, E.z2, 1040 - 304);
        /* Pastille de la date, puis « À domicile » / « À l'extérieur » (ou le bilan du jour). */
        var dtj = maj(s.titre || '') + (s.suite ? ' · ' + s.suite : '');
        var ad = ajusteLigne(dtj, E.dz, 26, 470, { ls: 1 }), pw = Math.max(330, Math.min(600, 88 + ad.w + 34)), y2 = E.py, h2 = E.ph;
        /* Le groupe « pastille + lieu (ou bilan) » est centré sur l'axe des cartes. */
        var droite = '', ld = 0, dz = 0, ico = 0;
        if (resu) { if (s.resume) { droite = maj(s.resume); ico = 72; dz = dense ? 52 : 56; } }
        else { droite = s.lieu === 'dom' ? 'À DOMICILE' : 'À L\'EXTÉRIEUR'; ico = 78; dz = dense ? 54 : 60; }
        var ard = droite ? ajusteLigne(droite, dz, resu ? 26 : 30, W - 80 - pw - 34 - ico, { it: true, ls: 1 }) : null;
        var grp = pw + (ard ? 34 + ico + ard.w : 0), xg = Math.max(40, Math.round((W - grp) / 2));
        PA(rr(xg, y2 + 5, pw, h2, 35), { f: K.nuit, op: .5 });
        PA(rr(xg, y2, pw, h2, 35), { f: G('pj', 'lin', [xg, 0, xg + pw, 0], [[0, K.vif], [1, K.fonce]]) });
        PA(rr(xg, y2, pw, h2, 35), { s: K.clair, lw: 3, op: .7 });
        picto('calendrier', xg + 22, y2 + h2 / 2 - 22, 44, '#ffffff');
        T(ad.t, xg + 82, y2 + h2 / 2 + ad.z * .35, ad.z, { ls: 1 });
        var x3 = xg + pw + 34;
        if (resu) {
          if (ard) {
            picto('ballon', x3, y2 + h2 / 2 - 28, 56, K.eclat, { lw: 8 });
            T(ard.t, x3 + 72, y2 + h2 / 2 + ard.z * .35, ard.z, { it: true, ls: 1 });
          }
        } else {
          var al = ard;
          picto(s.lieu === 'dom' ? 'maison' : 'avion', x3, y2 + h2 / 2 - 31, 62, '#ffffff');
          T(al.t, x3 + 78, y2 + h2 / 2 + al.z * .35, al.z, { it: true, ls: 1 });
          PA('M' + (x3 + 80) + ' ' + (y2 + h2 + 8) + 'Q' + n1(x3 + 80 + al.w / 2) + ' ' + (y2 + h2 - 2) + ' ' + n1(x3 + 80 + al.w) + ' ' + (y2 + h2 + 2) + 'L' + n1(x3 + 76 + al.w) + ' ' + (y2 + h2 + 10) + 'Q' + n1(x3 + 80 + al.w / 2) + ' ' + (y2 + h2 + 6) + ' ' + (x3 + 84) + ' ' + (y2 + h2 + 16) + 'Z', { f: K.eclat });
        }
        /* Les cartes : hauteur selon le nombre de matchs, empilées au centre de la zone. */
        var top = E.top, bas = BAND - 18, ecart = dense ? 10 : 12;
        var rh = Math.min(n <= 1 ? 236 : n === 2 ? 212 : n === 3 ? 188 : 150, Math.floor((bas - top + ecart) / Math.max(1, n))), dec = Math.floor(((bas - top + ecart) - n * rh) / 2);
        var colonne = !resu && lignes.some(function (l) { return l.salle; }) || (!resu && s.lieu === 'dom' && !!s.salleDom);
        uniformiserAdv(lignes, resu ? 350 : 330, resu ? 868 : finRdv(colonne), rh - ecart);
        lignes.forEach(function (l, i) {
          var y = top + dec + i * rh, h = rh - ecart;
          if (resu) carteRes(l, i, y, h); else carteRdv(l, i, y, h, colonne);
        });
        bandeau(BAND);
      }
      return { prims: P, largeur: W, hauteur: HP, alt: s.alt || '' };
    });
  }
  function svgAffiche(mep, pref) {
    var o = [], defs = [], n = 0, ouverts = 0;
    var FT = 'font-family="Barlow Condensed, Arial Narrow, Arial, sans-serif" font-weight="700"', FX = 'font-family="Source Sans 3, Arial, sans-serif"';
    function fill(f) { return f && typeof f === 'object' ? 'url(#' + pref + 'g' + f.g + ')' : f; }
    function op(v) { return v !== undefined && v !== null && v < 1 ? ' opacity="' + v + '"' : ''; }
    mep.prims.forEach(function (p) {
      if (p.k === 'grad') {
        var st = p.st.map(function (x) { return '<stop offset="' + x[0] + '" stop-color="' + x[1] + '"' + (x[2] !== undefined ? ' stop-opacity="' + x[2] + '"' : '') + '/>'; }).join('');
        defs.push(p.type === 'rad'
          ? '<radialGradient id="' + pref + 'g' + p.id + '" gradientUnits="userSpaceOnUse" cx="' + p.c[0] + '" cy="' + p.c[1] + '" r="' + p.c[2] + '">' + st + '</radialGradient>'
          : '<linearGradient id="' + pref + 'g' + p.id + '" gradientUnits="userSpaceOnUse" x1="' + p.c[0] + '" y1="' + p.c[1] + '" x2="' + p.c[2] + '" y2="' + p.c[3] + '">' + st + '</linearGradient>');
      } else if (p.k === 'rect') o.push('<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" fill="' + fill(p.f) + '"' + op(p.op) + '/>');
      else if (p.k === 'path') {
        var at = ' d="' + p.d + '" fill="' + (p.f ? fill(p.f) : 'none') + '"' + (p.pair ? ' fill-rule="evenodd"' : '')
          + (p.s ? ' stroke="' + p.s + '" stroke-width="' + p.lw + '" stroke-linecap="round" stroke-linejoin="round"' : '') + op(p.op);
        o.push(p.tr ? '<path transform="translate(' + p.tr[0] + ' ' + p.tr[1] + ') scale(' + p.tr[2] + ')"' + at + '/>' : '<path' + at + '/>');
      } else if (p.k === 'clip') {
        var ck = pref + 'k' + (n++);
        defs.push('<clipPath id="' + ck + '"><path d="' + p.d + '"/></clipPath>');
        o.push('<g clip-path="url(#' + ck + ')">'); ouverts++;
      } else if (p.k === 'finclip') { if (ouverts) { o.push('</g>'); ouverts--; } }
      else if (p.k === 'logo') {
        var id = pref + 'c' + (n++), blanc = p.fond === 'blanc';
        if (p.src) {
          var ri = blanc ? p.r * .8 : p.r;
          o.push('<circle cx="' + p.cx + '" cy="' + p.cy + '" r="' + p.r + '" fill="' + (blanc ? '#fff' : '#000') + '"' + (blanc ? ' stroke="' + (p.anneau || '#d5e0f3') + '" stroke-width="' + n1(Math.max(2, p.r * .07)) + '"' : '') + '/>');
          defs.push('<clipPath id="' + id + '"><circle cx="' + p.cx + '" cy="' + p.cy + '" r="' + n1(blanc ? p.r * .9 : p.r) + '"/></clipPath>');
          o.push('<image href="' + esc(p.src) + '" x="' + n1(p.cx - ri) + '" y="' + n1(p.cy - ri) + '" width="' + n1(2 * ri) + '" height="' + n1(2 * ri) + '" preserveAspectRatio="xMidYMid meet" clip-path="url(#' + id + ')"/>');
        } else {
          o.push('<circle cx="' + p.cx + '" cy="' + p.cy + '" r="' + p.r + '" fill="' + (p.rep || '#1c2320') + '"' + (p.rep ? '' : ' stroke="#3a443f" stroke-width="4"') + '/>');
          o.push('<text x="' + p.cx + '" y="' + n1(p.cy + p.r * .26) + '" text-anchor="middle" fill="#fff" font-size="' + Math.round(p.r * (p.zs || .74)) + '" ' + FT + '>' + esc(maj(p.sig)) + '</text>');
        }
      } else if (p.k === 'txt') {
        if (!p.t) return;
        o.push('<text x="' + n1(p.x) + '" y="' + n1(p.y) + '" font-size="' + p.taille + '" fill="' + p.c + '" text-anchor="' + (p.al === 'center' ? 'middle' : p.al === 'right' ? 'end' : 'start') + '" '
          + (p.f === 't' ? FT + (p.it ? ' font-style="italic"' : '') : FX + (p.gras ? ' font-weight="700"' : '')) + (p.ls ? ' letter-spacing="' + p.ls + '"' : '') + op(p.op) + '>' + esc(p.t) + '</text>');
      } else if (p.k === 'emb') {
        var d = EMBLEMES[p.type]; if (!d) return;
        o.push('<g transform="translate(' + p.x + ' ' + p.y + ') scale(' + p.t / 100 + ')">'
          + d.remp.map(function (v) { return '<path d="' + v + '" fill="' + p.c + '"/>'; }).join('')
          + d.trait.map(function (v) { return '<path d="' + v + '" fill="none" stroke="' + p.c + '" stroke-width="' + d.lw + '" stroke-linecap="round" stroke-linejoin="round"/>'; }).join('') + '</g>');
      }
    });
    while (ouverts-- > 0) o.push('</g>');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + mep.largeur + ' ' + mep.hauteur + '" role="img" aria-label="' + esc(mep.alt) + '" focusable="false"><defs>' + defs.join('') + '</defs>' + o.join('') + '</svg>';
  }
  function peindreAffiche(ctx, mep, ims) {
    var grads = {}, ouverts = 0;
    function fill(f) {
      if (!f || typeof f !== 'object') return f;
      var g = grads[f.g]; if (!g) return 'transparent';
      return g;
    }
    mep.prims.forEach(function (p) {
      if (p.k === 'grad') {
        var g = p.type === 'rad' ? ctx.createRadialGradient(p.c[0], p.c[1], 0, p.c[0], p.c[1], p.c[2]) : ctx.createLinearGradient(p.c[0], p.c[1], p.c[2], p.c[3]);
        p.st.forEach(function (x) { g.addColorStop(x[0], rgba(x[1], x[2])); });
        grads[p.id] = g;
      } else if (p.k === 'rect') {
        ctx.save(); ctx.globalAlpha = p.op === undefined || p.op === null ? 1 : p.op; ctx.fillStyle = fill(p.f); ctx.fillRect(p.x, p.y, p.w, p.h); ctx.restore();
      } else if (p.k === 'path') {
        ctx.save(); ctx.globalAlpha = p.op;
        if (p.tr) { ctx.translate(p.tr[0], p.tr[1]); ctx.scale(p.tr[2], p.tr[2]); }
        var ch = new Path2D(p.d);
        if (p.f) { ctx.fillStyle = fill(p.f); ctx.fill(ch, p.pair ? 'evenodd' : 'nonzero'); }
        if (p.s) { ctx.strokeStyle = p.s; ctx.lineWidth = p.lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(ch); }
        ctx.restore();
      } else if (p.k === 'clip') { ctx.save(); ctx.clip(new Path2D(p.d)); ouverts++; }
      else if (p.k === 'finclip') { if (ouverts) { ctx.restore(); ouverts--; } }
      else if (p.k === 'logo') {
        var im = p.src ? ims[p.src] : null, blanc = p.fond === 'blanc';
        if (p.src) {
          rond(ctx, p.cx, p.cy, p.r, blanc ? '#fff' : '#000');
          if (blanc) { ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2); ctx.lineWidth = n1(Math.max(2, p.r * .07)); ctx.strokeStyle = p.anneau || '#d5e0f3'; ctx.stroke(); }
          if (im) {
            var ri = blanc ? p.r * .8 : p.r;
            ctx.save(); ctx.beginPath(); ctx.arc(p.cx, p.cy, blanc ? p.r * .9 : p.r, 0, Math.PI * 2); ctx.clip(); contenir(ctx, im, p.cx - ri, p.cy - ri, ri * 2, ri * 2); ctx.restore();
          }
        } else {
          rond(ctx, p.cx, p.cy, p.r, p.rep || '#1c2320', p.rep ? null : '#3a443f');
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = titre(Math.round(p.r * (p.zs || .74))); espacement(ctx, 0); ctx.fillText(maj(p.sig), p.cx, p.cy + p.r * .26); ctx.textAlign = 'left';
        }
      } else if (p.k === 'txt') {
        if (!p.t) return;
        ctx.save(); ctx.globalAlpha = p.op === undefined ? 1 : p.op;
        ctx.font = p.f === 't' ? titre(p.taille, p.it) : texte(p.taille, p.gras);
        ctx.fillStyle = p.c; ctx.textAlign = p.al; espacement(ctx, p.ls);
        ctx.fillText(p.t, p.x + (p.al === 'center' && p.ls ? p.ls / 2 : 0), p.y);
        espacement(ctx, 0); ctx.restore(); ctx.textAlign = 'left';
      } else if (p.k === 'emb') {
        var d = EMBLEMES[p.type]; if (!d) return;
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.t / 100, p.t / 100);
        d.remp.forEach(function (v) { ctx.fillStyle = p.c; ctx.fill(new Path2D(v)); });
        d.trait.forEach(function (v) { ctx.strokeStyle = p.c; ctx.lineWidth = d.lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(v)); });
        ctx.restore();
      }
    });
    while (ouverts-- > 0) ctx.restore();
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
