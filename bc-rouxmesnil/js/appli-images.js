// Appli des publications du BCR : fabrication des images, dans le téléphone (aucune image ne part ailleurs).
//  - affiches 1080 x 1350 (rendez-vous, résultats) : dessin de js/export-facebook.js, chargé tel quel (BCRExport.affiches.svg),
//    retouché comme dans js/tiktok-exemple.js (score caché d'un gros écart chez les jeunes ou d'un derby, titre « Aujourd'hui à la
//    maison »), puis peint sur un canvas avec les polices et les logos inclus ;
//  - images carrées 1080 x 1080 (fin de match, partenaire, article, anniversaires, changement) : BCRExport.dessiner, tel quel ;
//  - stories 1080 x 1920 : l'affiche ou la carte posée dans la zone sûre (x 65 à 1015, y 270 à 1250 : rien d'important dans les
//    14 % du haut ni les 35 % du bas, d'après le guide de Meta), ou une story de texte (« Ce soir », « Le BCR est aussi sur TikTok »).
// Logique de story RECOPIÉE de affiche() de js/tiktok-exemple.js (affiche réduite et posée sur un fond de nuit).
import { NUITS } from './appli-regles.js';

const X = () => window.BCRExport;
const W = 1080, HP = 1350, HS = 1920;
const ZONE = { x0: 65, x1: 1015, y0: 270, y1: 1250 };

// ---------- ressources incluses dans les images (lues sur place, gardées en mémoire) ----------
const cacheData = new Map();
function enDataUrl(blob) { return new Promise((ok, ko) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = ko; f.readAsDataURL(blob); }); }
function dataDe(chemin) {
  if (!cacheData.has(chemin)) cacheData.set(chemin, fetch(chemin).then((r) => { if (!r.ok) throw new Error('absent ' + chemin); return r.blob(); }).then(enDataUrl).catch(() => null));
  return cacheData.get(chemin);
}
let policesSvg = null;
function policesEnLigne() {
  if (!policesSvg) policesSvg = Promise.all([dataDe('fonts/barlow-condensed-700-italic.woff2'), dataDe('fonts/barlow-condensed-700.woff2'), dataDe('fonts/source-sans-3.woff2')]).then(([a, b, c]) =>
    (a ? '@font-face{font-family:"Barlow Condensed";font-style:italic;font-weight:700;src:url(' + a + ') format("woff2")}' : '')
    + (b ? '@font-face{font-family:"Barlow Condensed";font-style:normal;font-weight:700;src:url(' + b + ') format("woff2")}' : '')
    + (c ? '@font-face{font-family:"Source Sans 3";font-weight:400 700;src:url(' + c + ') format("woff2")}' : ''));
  return policesSvg;
}
export async function polices() {
  try { await Promise.all(['italic 700 40px "Barlow Condensed"', '700 40px "Barlow Condensed"', '400 40px "Source Sans 3"', '700 40px "Source Sans 3"'].map((f) => document.fonts.load(f))); } catch (e) { /* polices de repli */ }
}
let mc = null;
function largeur(t, z, italique, ls) {
  mc = mc || document.createElement('canvas').getContext('2d');
  mc.font = (italique ? 'italic ' : '') + '700 ' + z + 'px "Barlow Condensed"';
  if ('letterSpacing' in mc) mc.letterSpacing = (ls || 0) + 'px';
  const w = mc.measureText(t).width; if ('letterSpacing' in mc) mc.letterSpacing = '0px'; return w;
}
const textes = (svg, contenu) => [...svg.querySelectorAll('text')].filter((t) => t.textContent === contenu);
function remplacer(svg, ancien, nouveau, maxW) {
  for (const t of textes(svg, ancien)) {
    let z = parseFloat(t.getAttribute('font-size')); const it = t.getAttribute('font-style') === 'italic', ls = parseFloat(t.getAttribute('letter-spacing') || '0');
    const w = largeur(nouveau, z, it, ls); if (w > maxW) z = Math.floor(z * maxW / w);
    t.textContent = nouveau; t.setAttribute('font-size', String(z));
  }
}
/** score caché (cases vides : « - » seul) : le mot « VICTOIRE » ou « DÉFAITE » prend la place du score ; un derby écrit « DERBY » */
function cacherScores(svg) {
  const vides = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim() === '-');
  for (const t of vides) {
    const y = parseFloat(t.getAttribute('y')), z = parseFloat(t.getAttribute('font-size')), x = t.getAttribute('x');
    let lab = null, ecart = Infinity;
    for (const l of [...textes(svg, 'VICTOIRE'), ...textes(svg, 'DÉFAITE')]) { const d = parseFloat(l.getAttribute('y')) - y; if (l.getAttribute('x') === x && d > 0 && d < z && d < ecart) { ecart = d; lab = l; } }
    const zz = Math.min(40, Math.round(z * 0.62));
    if (lab) { t.remove(); lab.setAttribute('font-size', String(zz)); lab.setAttribute('y', String(Math.round(y - z * 0.39 + zz * 0.36))); lab.setAttribute('letter-spacing', '2'); }
    else { t.textContent = 'DERBY'; t.setAttribute('font-size', String(zz)); t.setAttribute('y', String(Math.round(y - z * 0.39 + zz * 0.36))); t.setAttribute('letter-spacing', '2'); }
  }
}

const SVGNS = 'http://www.w3.org/2000/svg';
/** heure manquante : « À CONFIRMER » sur deux lignes dans la case de l'heure (60 % de la taille d'une heure), même fond */
function heuresAConfirmer(svg) {
  for (const t of textes(svg, '¤')) {
    const x = t.getAttribute('x'), y = parseFloat(t.getAttribute('y')), z0 = parseFloat(t.getAttribute('font-size'));
    const z = Math.max(18, Math.min(Math.round(76 * 0.6), z0, Math.floor(144 * 34 / Math.max(1, largeur('CONFIRMER', 34, true, 1)))));
    const haut = y - z0 * 0.35;   // centre de la case
    const l1 = t.cloneNode(); l1.textContent = 'À'; const l2 = t.cloneNode(); l2.textContent = 'CONFIRMER';
    for (const [l, dy] of [[l1, -0.12], [l2, 0.92]]) { l.setAttribute('font-size', String(z)); l.setAttribute('x', x); l.setAttribute('y', String(Math.round(haut + dy * z))); l.setAttribute('letter-spacing', '1'); }
    t.replaceWith(l1, l2);
  }
}
/** forfait : « FORFAIT » à la place du score (le mot « VICTOIRE » ou « DÉFAITE » reste dessous) */
function forfaits(svg) {
  for (const t of textes(svg, 'F - F')) {
    const it = t.getAttribute('font-style') === 'italic'; let z = parseFloat(t.getAttribute('font-size'));
    const w = largeur('FORFAIT', z, it, 0); if (w > 150) z = Math.floor(z * 150 / w);
    t.textContent = 'FORFAIT'; t.setAttribute('font-size', String(z));
  }
}
/** couverture des résultats tant que des scores manquent : pas de bilan qui ferait croire à tout le week-end */
function couverturePartielle(svg) {
  for (const t of [...svg.querySelectorAll('text')].filter((x) => /^\d+ VICTOIRES? SUR \d+ MATCHS?$/.test(x.textContent))) {
    let z = parseFloat(t.getAttribute('font-size')); const w = largeur('LES PREMIERS RÉSULTATS', z, true, 1); const max = 820;
    if (w > max) z = Math.floor(z * max / w);
    t.textContent = 'LES PREMIERS RÉSULTATS'; t.setAttribute('font-size', String(z));
  }
}

let n = 0;
/** une affiche 1080 x 1350 → canvas (titre : { de: 'RENDEZ-VOUS', vers: "AUJOURD'HUI", de2, vers2 } pour la story du jour) */
export async function afficheCanvas(spec, { titre } = {}) {
  const x = X(); if (!x || !x.affiches) throw new Error('Le dessin des affiches n\'est pas chargé.');
  await polices();
  const s = await x.affiches.svg(spec, 'ap' + (n++) + '-');
  const doc = new DOMParser().parseFromString(s, 'image/svg+xml'); const svg = doc.documentElement;
  cacherScores(svg); heuresAConfirmer(svg); forfaits(svg);
  if (spec.partiel) couverturePartielle(svg);
  if (titre) { remplacer(svg, 'RENDEZ-VOUS', titre.vers, 736); if (titre.de2) remplacer(svg, titre.de2, titre.vers2, 736); }
  for (const im of [...svg.querySelectorAll('image')]) {
    const h = im.getAttribute('href') || ''; if (!/^img\//.test(h)) continue;
    const d = await dataDe(h); if (d) im.setAttribute('href', d); else im.remove();
  }
  const style = doc.createElementNS(SVGNS, 'style'); style.textContent = await policesEnLigne();
  (svg.querySelector('defs') || svg).prepend(style);
  svg.setAttribute('width', String(W)); svg.setAttribute('height', String(HP));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  try {
    const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = HP; c.getContext('2d').drawImage(img, 0, 0, W, HP);
    return c;
  } finally { URL.revokeObjectURL(url); }
}
/** une image carrée 1080 x 1080 (spec de BCRExport.dessiner) → canvas */
export async function carreCanvas(spec) {
  const x = X(); if (!x || !x.dessiner) throw new Error('Le dessin des images n\'est pas chargé.');
  await polices();
  return x.dessiner(spec);
}

// ---------- stories 1080 x 1920 ----------
function fondStory(g, nuit, vif) {
  g.fillStyle = nuit; g.fillRect(0, 0, W, HS);
  g.fillStyle = vif; g.globalAlpha = 0.9; g.fillRect(0, 0, W, 14); g.fillRect(0, HS - 14, W, 14); g.globalAlpha = 1;
}
let logoClub = null;
async function logo() {
  if (!logoClub) logoClub = new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = 'img/logo-bcr-240.webp'; });
  return logoClub;
}
async function piedStory(g) {
  // décoratif seulement (zone du bas, que l'appli du réseau peut couvrir)
  const l = await logo();
  g.fillStyle = '#ffffff'; g.globalAlpha = 0.85; g.font = '700 38px "Barlow Condensed"'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  if ('letterSpacing' in g) g.letterSpacing = '3px';
  const t = 'BASKET CLUB DE ROUXMESNIL', tw = g.measureText(t).width, x0 = Math.round((W - (l ? 78 : 0) - tw) / 2);
  if (l) g.drawImage(l, x0, 1330, 60, 63);
  g.fillText(t, x0 + (l ? 78 : 0), 1374);
  if ('letterSpacing' in g) g.letterSpacing = '0px'; g.globalAlpha = 1;
}
/** une affiche (ou une carte carrée) posée dans la zone sûre d'une story */
export async function storyDepuis(source, { theme = 'vert' } = {}) {
  await polices();
  const c = document.createElement('canvas'); c.width = W; c.height = HS; const g = c.getContext('2d');
  const nuit = NUITS[theme] || NUITS.vert, vif = theme === 'bleu' ? '#4a93ff' : theme === 'rose' ? '#ff58a0' : '#46c46f';
  fondStory(g, nuit, vif);
  const bw = ZONE.x1 - ZONE.x0 - 50, bh = ZONE.y1 - ZONE.y0 - 20;
  const k = Math.min(bw / source.width, bh / source.height), w = Math.round(source.width * k), h = Math.round(source.height * k);
  const x = Math.round((W - w) / 2), y = Math.round(ZONE.y0 + (ZONE.y1 - ZONE.y0 - h) / 2);
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + 8, y + 10, w, h);
  g.drawImage(source, x, y, w, h);
  await piedStory(g);
  return c;
}
function lignesAjustees(g, t, fonte, tmax, tmin, largeurMax) {
  let z = tmax; for (; z > tmin; z -= 2) { g.font = fonte(z); if (g.measureText(t).width <= largeurMax) break; }
  g.font = fonte(z); return z;
}
/** une story de texte : lignes [{ t, taille, couleur, italique, police: 'titre' | 'texte' }], centrées dans la zone sûre */
export async function storyTexte(lignes, { theme = 'vert', photo = null } = {}) {
  await polices();
  const c = document.createElement('canvas'); c.width = W; c.height = HS; const g = c.getContext('2d');
  const nuit = NUITS[theme] || NUITS.vert, vif = theme === 'bleu' ? '#4a93ff' : theme === 'rose' ? '#ff58a0' : '#46c46f';
  fondStory(g, nuit, vif);
  if (photo) {
    const k = Math.max(W / photo.width, HS / photo.height), w = photo.width * k, h = photo.height * k;
    g.drawImage(photo, (W - w) / 2, (HS - h) / 2, w, h); g.fillStyle = nuit; g.globalAlpha = 0.72; g.fillRect(0, 0, W, HS); g.globalAlpha = 1;
  }
  const l = await logo(); if (l) g.drawImage(l, W / 2 - 90, ZONE.y0 + 10, 180, 189);
  const hauteurs = lignes.map((x) => x.taille * 1.12 + (x.marge || 0));
  let y = ZONE.y0 + 250 + Math.max(0, (1580 - ZONE.y0 - 260 - hauteurs.reduce((a, b) => a + b, 0)) / 2);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  for (const x of lignes) {
    y += (x.marge || 0);
    const fonte = x.police === 'texte' ? (z) => '400 ' + z + 'px "Source Sans 3"' : (z) => (x.italique === false ? '' : 'italic ') + '700 ' + z + 'px "Barlow Condensed"';
    const z = lignesAjustees(g, x.t, fonte, x.taille, Math.round(x.taille * 0.5), ZONE.x1 - ZONE.x0 - 40);
    y += z * 0.95;
    g.fillStyle = x.couleur === 'vif' ? vif : x.couleur || '#ffffff';
    g.fillText(x.t, W / 2, y);
    y += z * 0.17;
  }
  return c;   // pas de second nom du club en bas : le logo est déjà en tête, et le bas de la story reste libre
}

// ---------- fichiers ----------
/** canvas → File (PNG), puis le canvas est vidé (mémoire du téléphone) */
export function versFichier(c, nom, type = 'image/png', qualite = 0.92) {
  return new Promise((ok, ko) => {
    const fin = (b) => { const l = c.width, h = c.height; c.width = 1; c.height = 1; if (!b) { ko(new Error('Image vide')); return; } const f = new File([b], nom, { type, lastModified: Date.now() }); f.largeur = l; f.hauteur = h; ok(f); };
    try { c.toBlob(fin, type, qualite); } catch (e) { ko(e); }
  });
}
/**
 * Une photo de la galerie prête à partir avec une publication. Le passage par le canvas efface les informations EXIF (position GPS
 * comprise). format :
 *  - 'portrait' (1080 x 1350) ou 'carre' (1080 x 1080) : aux dimensions de la première image de la carte (Instagram met toutes les
 *    images d'une publication à faire glisser au format de la première) ; la photo est posée en entier sur un fond flou fait d'elle-même ;
 *  - 'reduite' (Facebook) : la photo entière, 2048 px au plus sur le grand côté.
 * Rend un File JPEG (qualité 0.88), ou le fichier d'origine si ce n'est pas une photo lisible.
 */
export async function photoPour(fichier, format, nom) {
  if (!fichier || !/^image\//.test(fichier.type || '')) return fichier;
  let b; try { b = await createImageBitmap(fichier, { imageOrientation: 'from-image' }); } catch (e) { return fichier; }
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  if (format === 'reduite') {
    const k = Math.min(1, 2048 / Math.max(b.width, b.height)); c.width = Math.round(b.width * k); c.height = Math.round(b.height * k);
    g.imageSmoothingQuality = 'high'; g.drawImage(b, 0, 0, c.width, c.height);
  } else {
    const w = 1080, h = format === 'carre' ? 1080 : 1350; c.width = w; c.height = h;
    const kf = Math.max(w / b.width, h / b.height) * 1.08;    // fond : la même photo agrandie et floutée
    g.filter = 'blur(38px) brightness(.62)'; g.drawImage(b, (w - b.width * kf) / 2, (h - b.height * kf) / 2, b.width * kf, b.height * kf); g.filter = 'none';
    const k = Math.min(w / b.width, h / b.height); const iw = Math.round(b.width * k), ih = Math.round(b.height * k);
    g.imageSmoothingQuality = 'high'; g.drawImage(b, Math.round((w - iw) / 2), Math.round((h - ih) / 2), iw, ih);
  }
  b.close && b.close();
  return versFichier(c, nom, 'image/jpeg', 0.88);
}
/** une photo de la galerie, réduite (pour un fond de story) */
export async function photoReduite(fichier, cote = 1600) {
  try {
    const b = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
    const k = Math.min(1, cote / Math.max(b.width, b.height));
    if (k === 1) return b;
    const r = await createImageBitmap(b, { resizeWidth: Math.round(b.width * k), resizeHeight: Math.round(b.height * k), resizeQuality: 'high' }); b.close && b.close(); return r;
  } catch (e) { return null; }
}
