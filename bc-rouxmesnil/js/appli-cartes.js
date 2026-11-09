// Appli des publications du BCR : les cartes et les stories dessinées dans le téléphone (canvas), aux couleurs du mois.
// Logique RECOPIÉE de js/export-facebook.js (dessinerMatch, dessinerPartenaire, dessinerArticle, ajuster, bloc, contenir, palettes et
// pictogrammes des affiches), chargé tel quel par ailleurs pour les affiches 1080 x 1350. Différences voulues :
//  - le thème du mois sur TOUTES les cartes, comme sur les affiches : en novembre, bandeau du haut bleu Movember (#1f4fd1), ruban, et
//    bandeau « Le BCR soutient Movember » en pied ; le reste de l'année, le vert et noir du club et sa devise ;
//  - le logo de l'adversaire quand le club l'a (img/logos/), sinon ses initiales ;
//  - la carte du partenaire : logo en grand (1000 x 420), « Merci pour votre soutien » en pied, une seule fois le mot « partenaire » ;
//  - la carte d'un changement : la nouvelle date et le motif écrits dans la partie basse ;
//  - trois formats : carré 1080 x 1080 (Facebook), portrait 1080 x 1350 (Instagram : la carte posée sur le fond du thème) et
//    story 1080 x 1920 dessinée pour la story (titre à partir de y = 260, contenu entre 260 et 1580, bas libre pour les autocollants).
// Aucun émoji, aucun logo de réseau, aucun logo de fédération. Rien n'est envoyé : les images restent dans le téléphone.
const W = 1080, H = 1080, HP = 1350, HS = 1920, M = 64;
const TITRE = '"Barlow Condensed","Arial Narrow",Arial,sans-serif';
const TEXTE = '"Source Sans 3",Arial,sans-serif';
export const PALETTES = {
  bleu: { nuit: '#030a22', fonce: '#0a2260', vif: '#1f5fd0', eclat: '#4a93ff', clair: '#9fcbff', bande: '#1f4fd1', ligne: '#0d1a3d' },
  rose: { nuit: '#1e030d', fonce: '#5a0a2f', vif: '#d8186f', eclat: '#ff58a0', clair: '#ffb1d3', bande: '#c4135f', ligne: '#2e0b19' },
  vert: { nuit: '#080a09', fonce: '#0a2814', vif: '#1f7a3f', eclat: '#46c46f', clair: '#9fe6b6', bande: '#1f7a3f', ligne: '#14181c' }
};
const GRIS = '#c9cdca', CLAIR = '#d7dbd8', BLANC = '#ffffff';
const pal = (t) => PALETTES[t] || PALETTES.vert;
const maj = (t) => String(t || '').toUpperCase().replace(/(^|[^0-9A-Z])1ER(?![A-Z])/g, (m, a) => a + '1er');
const titre = (z, it) => (it ? 'italic ' : '') + '700 ' + z + 'px ' + TITRE;
const texte = (z, gras) => (gras ? '700 ' : '400 ') + z + 'px ' + TEXTE;
const esp = (g, px) => { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; };

// ---------- ressources (même origine : le canvas n'est jamais « sali ») ----------
const images = new Map();
export function image(src) {
  if (!src) return Promise.resolve(null);
  if (!images.has(src)) images.set(src, new Promise((ok) => { const i = new Image(); i.decoding = 'async'; i.onload = () => (i.decode ? i.decode().catch(() => { }) : Promise.resolve()).then(() => ok(i)); i.onerror = () => ok(null); i.src = src; }));
  return images.get(src);
}
let pretes = null;
export function polices() {
  if (!pretes) pretes = Promise.all(['italic 700 40px "Barlow Condensed"', '700 40px "Barlow Condensed"', '400 40px "Source Sans 3"', '700 40px "Source Sans 3"'].map((f) => document.fonts.load(f, 'Éé1'))).catch(() => { });
  return pretes;
}

// ---------- outils de texte (export-facebook.js) ----------
function ajuster(g, t, fonte, tmax, tmin, largeur) {
  let z = tmax; for (; z > tmin; z -= 2) { g.font = fonte(z); if (g.measureText(t).width <= largeur) return t; }
  g.font = fonte(tmin); let s = t; while (s.length > 1 && g.measureText(s + '…').width > largeur) s = s.slice(0, -1);
  return s === t ? t : s.trim() + '…';
}
function decouper(g, t, largeur) {
  const mots = String(t).split(/\s+/); const L = []; let l = '';
  for (const m of mots) { const e = l ? l + ' ' + m : m; if (g.measureText(e).width <= largeur || !l) l = e; else { L.push(l); l = m; } }
  if (l) L.push(l); return L;
}
/** bloc de texte : la plus grande taille qui tient en hauteur et en lignes */
function bloc(g, t, fonte, tmax, tmin, largeur, hauteur, inter, maxL) {
  for (let z = tmax; z >= tmin; z -= 2) {
    g.font = fonte(z); const L = decouper(g, t, largeur);
    if (L.length <= maxL && L.length * z * inter <= hauteur && L.every((x) => g.measureText(x).width <= largeur)) return { lignes: L, taille: z, pas: z * inter };
  }
  g.font = fonte(tmin); const L = decouper(g, t, largeur).slice(0, maxL); return { lignes: L, taille: tmin, pas: tmin * inter };
}
function contenir(g, im, x, y, w, h) { const k = Math.min(w / im.width, h / im.height), iw = im.width * k, ih = im.height * k; g.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rond(g, cx, cy, r, fond, trait) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = fond; g.fill(); if (trait) { g.lineWidth = 4; g.strokeStyle = trait; g.stroke(); } }
function logoRond(g, im, cx, cy, r, fond = '#000') { rond(g, cx, cy, r, fond); if (im) { g.save(); g.beginPath(); g.arc(cx, cy, r * (fond === '#000' ? 1 : .92), 0, Math.PI * 2); g.clip(); const k = fond === '#000' ? 1 : .8; contenir(g, im, cx - r * k, cy - r * k, 2 * r * k, 2 * r * k); g.restore(); } }

// ---------- pictogrammes (carré de 100 x 100, export-facebook.js) ----------
const PICTOS = {
  ruban: { t: ['M34 95 C45 68 51 57 60 43 C71 27 71 9 53 7 C37 5 33 20 43 36 C51 50 58 66 67 95'], lw: 13 },
  moustache: { r: ['M50 42 C44 34 34 32 26 36 C18 40 14 48 8 50 C4 51 2 47 4 43 C0 46 0 54 6 57 C14 61 26 58 34 55 C42 52 47 51 50 48 C53 51 58 52 66 55 C74 58 86 61 94 57 C100 54 100 46 96 43 C98 47 96 51 92 50 C86 48 82 40 74 36 C66 32 56 34 50 42 Z'] },
  coeur: { r: ['M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C39 8 46 13 50 20 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z'] },
  ballon: { t: ['M6 50 A44 44 0 1 0 94 50 A44 44 0 1 0 6 50 Z', 'M50 6 V94', 'M6 50 H94', 'M19 17 C37 35 37 65 19 83', 'M81 17 C63 35 63 65 81 83'], lw: 6 },
  maison: { r: ['M50 6 L97 47 L89 56 L82 50 V93 H60 V66 H40 V93 H18 V50 L11 56 L3 47 Z'] },
  calendrier: { r: ['M10 30 Q10 22 18 22 H82 Q90 22 90 30 V42 H10 Z'], t: ['M18 22 H82 Q90 22 90 30 V84 Q90 92 82 92 H18 Q10 92 10 84 V30 Q10 22 18 22 Z', 'M32 10 V30', 'M68 10 V30'], lw: 8 }
};
function picto(g, nom, x, y, taille, c, lw) {
  const d = PICTOS[nom]; if (!d) return;
  g.save(); g.translate(x, y); g.scale(taille / 100, taille / 100);
  for (const p of d.r || []) { g.fillStyle = c; g.fill(new Path2D(p)); }
  for (const p of d.t || []) { g.strokeStyle = c; g.lineWidth = lw || d.lw || 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(new Path2D(p)); }
  g.restore();
}

// ---------- fond, en-tête et pied aux couleurs du mois ----------
function fond(g, K, w, h) {
  const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, K.fonce); d.addColorStop(.45, K.nuit); d.addColorStop(1, K.nuit);
  g.fillStyle = d; g.fillRect(0, 0, w, h);
}
function entete(g, K, logo, theme, y0 = 0) {
  g.fillStyle = K.bande; g.fillRect(0, y0, W, 176);
  logoRond(g, logo, M + 56, y0 + 88, 56);
  g.fillStyle = BLANC; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; esp(g, 2);
  g.font = titre(54); g.fillText('BASKET CLUB', M + 140, y0 + 86); g.fillText('DE ROUXMESNIL', M + 140, y0 + 138); esp(g, 0);
  if (theme === 'bleu') {   // ruban et moustache, comme sur les affiches du club en novembre
    picto(g, 'ruban', W - M - 70, y0 + 34, 108, '#ffffff', 13);
    picto(g, 'moustache', W - M - 220, y0 + 50, 130, '#ffffff');
  } else picto(g, 'ballon', W - M - 104, y0 + 36, 104, 'rgba(255,255,255,.85)', 6);
}
/** bandeau du pied (y0 → y0 + 100) : « Le BCR soutient Movember » en novembre, la devise du club sinon ; ou un texte donné */
function pied(g, K, theme, y0, txt) {
  g.fillStyle = K.fonce; g.fillRect(0, y0, W, 100); g.fillStyle = K.eclat; g.fillRect(0, y0, W, 5);
  g.textAlign = 'center'; g.fillStyle = BLANC;
  if (txt) {
    g.font = titre(50, true); esp(g, 2); const tw = g.measureText(maj(txt)).width; esp(g, 0);
    picto(g, 'coeur', (W - tw) / 2 - 70, y0 + 28, 50, K.eclat);
    esp(g, 2); g.fillText(maj(txt), W / 2 + 6, y0 + 70); esp(g, 0);
  } else if (theme === 'bleu') {
    picto(g, 'ruban', M + 6, y0 + 16, 70, K.eclat, 14);
    g.font = titre(50, true); esp(g, 2); g.fillText('LE BCR SOUTIENT MOVEMBER', W / 2 + 20, y0 + 70); esp(g, 0);
  } else {
    g.font = titre(44, true); esp(g, 1); g.fillText('PASSION · ESPRIT D\'ÉQUIPE · RESPECT', W / 2, y0 + 66); esp(g, 0);
  }
  g.textAlign = 'left';
}
function etiquette(g, t, y, couleur, taille) {
  g.fillStyle = couleur; g.textAlign = 'left'; esp(g, 5);
  g.fillText(ajuster(g, maj(t), (s) => titre(s), taille || 58, 30, W - 2 * M), M, y); esp(g, 0);
}

// ---------- la carte d'un match (fin de match, changement) ----------
function ligneEquipe(g, K, y, h, nom, score, dessinerRond) {
  g.fillStyle = K.ligne; g.fillRect(M, y, W - 2 * M, h);
  dessinerRond(M + 24 + 40, y + h / 2, 40);
  const x = M + 24 + 80 + 24, reserve = score === null || score === '' ? 0 : 230;
  g.fillStyle = BLANC; g.textAlign = 'left'; esp(g, 1);
  const t = ajuster(g, maj(nom), (s) => titre(s), 50, 26, W - M - 24 - reserve - x);
  g.fillText(t, x, y + h / 2 + 16); esp(g, 0);
  if (score !== null && score !== '') { g.font = titre(96, true); g.textAlign = 'right'; g.fillText(String(score), W - M - 28, y + h / 2 + 32); g.textAlign = 'left'; }
}
async function carteMatch(g, s, K, theme) {
  const [logo, logoAdv, ...parts] = await Promise.all([image('img/logo-bcr-160.webp'), image(s.logo || ''), ...(s.parts || []).map(image)]);
  fond(g, K, W, H); entete(g, K, logo, theme);
  etiquette(g, s.equipe, 244, K.eclat, 60);
  g.fillStyle = GRIS; g.font = texte(36); g.fillText(ajuster(g, s.niv || '', (z) => texte(z), 36, 24, W - 2 * M), M, 294);
  g.fillStyle = s.vict ? K.eclat : BLANC; esp(g, 1);
  g.fillText(ajuster(g, maj(s.issue), (z) => titre(z, true), 140, 60, W - 2 * M), M, 420); esp(g, 0);
  ligneEquipe(g, K, 450, 104, 'BCR', s.bcr, (cx, cy, r) => logoRond(g, logo, cx, cy, r));
  ligneEquipe(g, K, 566, 104, s.adv, s.ad, (cx, cy, r) => {
    if (logoAdv) logoRond(g, logoAdv, cx, cy, r, '#ffffff');
    else { rond(g, cx, cy, r, K.vif); g.fillStyle = BLANC; g.textAlign = 'center'; g.font = titre(String(s.sig || '').length >= 3 ? 26 : 32); g.fillText(maj(s.sig || ''), cx, cy + 11); g.textAlign = 'left'; }
  });
  g.fillStyle = CLAIR; g.font = texte(38);
  g.fillText(ajuster(g, [s.quand, s.lieu].filter(Boolean).join(' · '), (z) => texte(z), 38, 24, W - 2 * M), M, 730);
  if (s.lignesBas && s.lignesBas.length) {   // changement : nouvelle date, motif (à partir de y = 840)
    // une ligne chacune (taille réduite plutôt qu'une coupure), au-dessus du bandeau du pied
    let y = 836;
    for (const [i, l] of s.lignesBas.slice(0, 2).entries()) {
      g.fillStyle = i ? CLAIR : BLANC;
      g.fillText(ajuster(g, l, (z) => i ? texte(z) : texte(z, true), i ? 38 : 44, 26, W - 2 * M), M, y); y += i ? 52 : 64;
    }
  } else if (parts.length) {
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(M, 778, W - 2 * M, 3);
    g.fillStyle = GRIS; esp(g, 2); g.font = titre(32); g.fillText('AVEC LE', M, 842); g.fillText('SOUTIEN DE', M, 880); esp(g, 0);
    parts.slice(0, 3).forEach((im, i) => { const x = M + 190 + i * 260; g.fillStyle = BLANC; g.fillRect(x, 800, 240, 110); if (im) contenir(g, im, x + 16, 812, 208, 86); });
  }
  pied(g, K, theme, 980);
}

// ---------- la carte du partenaire ----------
async function cartePartenaire(g, s, K, theme) {
  const [logo, cart] = await Promise.all([image('img/logo-bcr-160.webp'), image(s.cartouche || '')]);
  fond(g, K, W, H); entete(g, K, logo, theme);
  etiquette(g, s.accroche || 'Merci à notre partenaire', 244, K.eclat, 58);
  g.fillStyle = BLANC; rr(g, 40, 276, 1000, 420, 18); g.fill();
  if (cart) { g.save(); rr(g, 40, 276, 1000, 420, 18); g.clip(); contenir(g, cart, 60, 290, 960, 392); g.restore(); }
  const b = bloc(g, maj(s.nom), (z) => titre(z, true), 96, 48, W - 2 * M, 170, 1.0, 2);
  g.fillStyle = BLANC; g.font = titre(b.taille, true); esp(g, 1);
  let y = 712 + b.taille * .9; b.lignes.forEach((l, i) => g.fillText(l, M, y + i * b.pas)); esp(g, 0);
  y += (b.lignes.length - 1) * b.pas + 58;
  if (s.detail) { g.fillStyle = CLAIR; g.font = texte(42); g.fillText(ajuster(g, s.detail, (z) => texte(z), 42, 26, W - 2 * M), M, Math.min(y, 950)); }
  pied(g, K, theme, 980, 'Merci pour votre soutien');
}

// ---------- la carte d'un article (raconter, anniversaires) ----------
async function carteArticle(g, s, K, theme) {
  const logo = await image('img/logo-bcr-160.webp');
  fond(g, K, W, H); entete(g, K, logo, theme);
  etiquette(g, 'Vie du club' + (s.date ? ' · ' + s.date : ''), 244, K.eclat, 52);
  const b = bloc(g, maj(s.titre), (z) => titre(z, true), 120, 46, W - 2 * M, 560, 1.04, 6);
  g.fillStyle = BLANC; g.font = titre(b.taille, true); esp(g, 1);
  b.lignes.forEach((l, i) => g.fillText(l, M, 300 + b.taille * .86 + i * b.pas)); esp(g, 0);
  if (s.pied) { g.fillStyle = GRIS; g.font = texte(38); g.fillText(ajuster(g, s.pied, (z) => texte(z), 38, 24, W - 2 * M), M, 940); }
  pied(g, K, theme, 980);
}

/** une carte carrée 1080 x 1080 → canvas */
export async function carre(spec, theme = 'vert') {
  await polices();
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.textBaseline = 'alphabetic';
  const K = pal(theme);
  if (spec.type === 'match') await carteMatch(g, spec, K, theme);
  else if (spec.type === 'partenaire') await cartePartenaire(g, spec, K, theme);
  else await carteArticle(g, spec, K, theme);
  return c;
}
/** la même carte en portrait 1080 x 1350 (Instagram : la grille du profil ne coupe rien), posée sur le fond du thème */
export async function portrait(spec, theme = 'vert') {
  const k = await carre(spec, theme);
  const c = document.createElement('canvas'); c.width = W; c.height = HP; const g = c.getContext('2d');
  const K = pal(theme); fond(g, K, W, HP);
  g.fillStyle = K.eclat; g.fillRect(0, 0, W, 10); g.fillRect(0, HP - 10, W, 10);
  g.drawImage(k, 0, 135); k.width = k.height = 1;
  return c;
}

// ---------- stories 1080 x 1920 ----------
const Y0 = 260, Y1 = 1580;
function fondStory(g, K) {
  fond(g, K, W, HS);
  const h = g.createRadialGradient(W / 2, 520, 0, W / 2, 520, 900); h.addColorStop(0, 'rgba(255,255,255,.10)'); h.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = h; g.fillRect(0, 0, W, HS);
  g.fillStyle = K.eclat; g.fillRect(0, 0, W, 12); g.fillRect(0, HS - 12, W, 12);
}
/** titre de story : logo du club à gauche, titre sur une ou deux lignes, date en pastille (renvoie la hauteur occupée) */
async function teteStory(g, K, theme, t, date, suite) {
  const logo = await image('img/logo-bcr-240.webp');
  if (logo) { rond(g, 120, Y0 + 80, 80, '#000'); g.save(); g.beginPath(); g.arc(120, Y0 + 80, 80, 0, Math.PI * 2); g.clip(); contenir(g, logo, 40, Y0, 160, 160); g.restore(); }
  // « AUJOURD'HUI|À LA MAISON » : la coupure de ligne est donnée (jamais « À LA » seul en fin de ligne)
  const parts = String(t).split('|'); let b;
  if (parts.length > 1) { let z = 96; g.font = titre(z, true); while (z > 54 && parts.some((x) => g.measureText(x).width > W - 240 - M)) { z -= 2; g.font = titre(z, true); } b = { lignes: parts, taille: z, pas: z }; }
  else b = bloc(g, t, (z) => titre(z, true), 96, 54, W - 240 - M, 190, 1.0, 2);
  g.fillStyle = BLANC; g.font = titre(b.taille, true); g.textAlign = 'left'; esp(g, 1);
  const hb = b.lignes.length * b.pas; const y = Y0 + 80 - hb / 2 + b.taille * .82;
  b.lignes.forEach((l, i) => { g.fillStyle = i === b.lignes.length - 1 ? K.eclat : BLANC; g.fillText(l, 236, y + i * b.pas); }); esp(g, 0);
  if (theme === 'bleu') picto(g, 'ruban', W - M - 40, Y0 - 10, 70, K.eclat, 14);
  let yy = Y0 + 200;
  if (date) {
    const d = maj(date) + (suite ? ' · ' + suite : ''); g.font = titre(54); esp(g, 1); const tw = Math.min(W - 2 * M - 110, g.measureText(d).width);
    g.fillStyle = K.vif; rr(g, M, yy, tw + 130, 84, 42); g.fill();
    picto(g, 'calendrier', M + 26, yy + 18, 48, '#ffffff');
    g.fillStyle = BLANC; g.fillText(ajuster(g, d, (z) => titre(z), 54, 34, W - 2 * M - 120), M + 96, yy + 61); esp(g, 0);
    yy += 120;
  }
  return yy;
}
/** lignes de matchs d'une story : heure (ou score) à gauche, équipe et adversaire à droite ; 64 px de texte au moins pour l'essentiel */
function lignesStory(g, K, lignes, y0, res) {
  const n = lignes.length, dispo = Y1 - y0, hl = Math.min(170, Math.floor(dispo / Math.max(1, n)));
  lignes.forEach((l, i) => {
    const y = y0 + i * hl, h = hl - 14;
    g.fillStyle = 'rgba(255,255,255,.07)'; rr(g, M - 14, y, W - 2 * M + 28, h, 16); g.fill();
    const gauche = res ? 300 : 250;
    g.fillStyle = res ? (l.v === true ? K.vif : 'rgba(255,255,255,.12)') : K.vif; rr(g, M - 4, y + 8, gauche - 8, h - 16, 12); g.fill();
    g.fillStyle = BLANC; g.textAlign = 'center';
    const cg = M - 4 + (gauche - 8) / 2;
    const t = res ? l.score : l.heure; const court = /^\d/.test(t);
    const zt = court ? Math.min(72, Math.floor(h * .5)) : Math.min(40, Math.floor(h * .3));
    if (court) { g.fillText(ajuster(g, t, (z) => titre(z, true), zt, 30, gauche - 30), cg, y + h / 2 + zt * .35); }
    else { const b = bloc(g, maj(t), (z) => titre(z), zt, 22, gauche - 30, h - 20, 1.0, 3); g.font = titre(b.taille); b.lignes.forEach((x, k) => g.fillText(x, cg, y + h / 2 - (b.lignes.length * b.pas) / 2 + b.taille * .82 + k * b.pas)); }
    g.textAlign = 'left';
    const x = M + gauche + 14, lw = W - M - x;
    const ze = Math.min(64, Math.floor(h * .4)), za = Math.min(44, Math.floor(h * .28));
    g.fillStyle = BLANC; esp(g, .5); g.fillText(ajuster(g, maj(l.equipe), (z) => titre(z), ze, 30, lw), x, y + h / 2 - 4); esp(g, 0);
    g.fillStyle = CLAIR; g.fillText(ajuster(g, (l.derby ? 'derby contre ' : l.dom || !res ? 'contre ' : 'chez ') + l.adv + (l.salle ? ' · ' + l.salle : ''), (z) => texte(z), za, 24, lw), x, y + h / 2 + za + 4);
  });
}
/** une story « à la maison » ou « les scores » (lignes de matchs) */
export async function storyLignes(spec) {
  await polices();
  const c = document.createElement('canvas'); c.width = W; c.height = HS; const g = c.getContext('2d'); g.textBaseline = 'alphabetic';
  const K = pal(spec.theme); fondStory(g, K);
  const y = await teteStory(g, K, spec.theme, spec.titre, spec.date, spec.suite);
  lignesStory(g, K, spec.lignes, y + 10, spec.type === 'story-scores');
  return c;
}
/** la story de couverture des résultats */
export async function storyCouverture(spec) {
  await polices();
  const c = document.createElement('canvas'); c.width = W; c.height = HS; const g = c.getContext('2d'); g.textBaseline = 'alphabetic';
  const K = pal(spec.theme); fondStory(g, K);
  const logo = await image('img/logo-bcr-240.webp');
  if (logo) { rond(g, W / 2, Y0 + 150, 150, K.eclat); rond(g, W / 2, Y0 + 150, 142, '#000'); g.save(); g.beginPath(); g.arc(W / 2, Y0 + 150, 142, 0, Math.PI * 2); g.clip(); contenir(g, logo, W / 2 - 142, Y0 + 8, 284, 284); g.restore(); }
  g.textAlign = 'center'; g.fillStyle = BLANC;
  const b = bloc(g, spec.titre, (z) => titre(z, true), 170, 90, W - 2 * M, 420, .98, 3);
  g.font = titre(b.taille, true); let y = Y0 + 360 + b.taille * .85;
  b.lignes.forEach((l, i) => { g.fillStyle = i === b.lignes.length - 1 ? K.eclat : BLANC; g.fillText(l, W / 2, y + i * b.pas); });
  y += (b.lignes.length - 1) * b.pas + 120;
  g.fillStyle = K.vif; rr(g, M, y - 70, W - 2 * M, 100, 50); g.fill();
  g.fillStyle = BLANC; g.fillText(ajuster(g, maj(spec.dates), (z) => titre(z), 62, 34, W - 2 * M - 60), W / 2, y);
  if (spec.compte) { y += 150; g.fillStyle = BLANC; g.fillText(ajuster(g, maj(spec.compte), (z) => titre(z, true), 76, 40, W - 2 * M), W / 2, y); }
  g.font = texte(46); g.fillStyle = CLAIR; g.fillText('Les scores sur les stories suivantes', W / 2, Math.min(Y1 - 20, y + 120));
  g.textAlign = 'left';
  return c;
}
/** une carte (fin de match, changement, partenaire) agrandie à 1000 px de large dans une story, avec une ligne en dessous */
export async function storyCarte(spec, theme, { ligne = '', compte = '' } = {}) {
  const k = await carre(spec, theme);
  const c = document.createElement('canvas'); c.width = W; c.height = HS; const g = c.getContext('2d'); g.textBaseline = 'alphabetic';
  const K = pal(theme); fondStory(g, K);
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(48, Y0 + 50, 1000, 1000);
  g.drawImage(k, 40, Y0 + 40, 1000, 1000); k.width = k.height = 1;
  g.textAlign = 'center';
  if (ligne) { g.fillStyle = BLANC; g.fillText(ajuster(g, ligne, (z) => texte(z, true), 52, 30, W - 2 * M), W / 2, Y0 + 1140); }
  if (compte) { g.fillStyle = K.eclat; g.fillText(ajuster(g, compte, (z) => titre(z, true), 80, 40, W - 2 * M), W / 2, 1500 + 40); }
  g.textAlign = 'left';
  return c;
}
