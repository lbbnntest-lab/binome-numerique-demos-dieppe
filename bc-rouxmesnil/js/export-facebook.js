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

  /* spec -> canvas */
  function dessiner(spec) {
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
