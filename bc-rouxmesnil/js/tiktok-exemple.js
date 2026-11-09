// Images de démonstration du studio TikTok du BCR, fabriquées dans le téléphone à partir de la maquette :
//  - la photo de la salle (img/salle-tribunes.jpg) et la salle Alexandre-Cheruel (img/salle-cheruel-vert.webp) ;
//  - les affiches du club dessinées par js/export-facebook.js (même dessin que la 1re version de la page),
//    avec les vrais résultats du samedi 31 octobre et le premier match en élite du 7 novembre (js/donnees-ffbb.js).
// Les affiches sont posées sur un fond vertical 1080 x 1920 de leur couleur de nuit, polices et logos inclus dans l'image.
// Rien n'est envoyé : tout se lit depuis l'adresse de la page.
const RACINE = new URL('../', import.meta.url).href;
const W = 1080, HV = 1920;
// Couleurs du club (vert et noir) : le samedi 31 octobre n'était pas encore en Movember (le bleu ne sert qu'en novembre).
const TH = { id: 'vert', fond: '#1f7a3f', accent: '#3dbb67', nom: '', emb: 'ballon' };
const NUIT = '#020503';

function D() { return window.BCR_FFBB || null; }
function X() { return window.BCRExport || null; }

// ---------- les vrais résultats du samedi 31 octobre (relevé de la fédération du 3 novembre) ----------
const EQUIPES_31 = [
  { id: 'dfu18', code: 'DFU18', equipe: 'U18 filles (départementale)' },
  { id: 'u15f', code: 'DFU15', equipe: 'U15 filles' },
  { id: 'u13f', code: 'DFU13', equipe: 'U13 filles' }
];
const JOUR_31 = '2026-10-31';
function joues31() {
  const d = D(); const r = [];
  EQUIPES_31.forEach((e) => {
    const eq = d && d.equipes && d.equipes[e.id]; if (!eq || !eq.matchs) return;
    eq.matchs.forEach((m) => { if (m.d.slice(0, 10) === JOUR_31 && m.s) r.push({ e, m }); });
  });
  return r;
}
// Liste des matchs au format du studio (scores réels).
export function resultats31() {
  return joues31().map(({ e, m }) => ({
    equipe: e.equipe, adversaire: m.adv, jour: 'samedi', heure: m.d.length >= 16 ? m.d.slice(11, 16) : null,
    lieu: m.dom ? 'domicile' : 'exterieur', nous: m.s[0], eux: m.s[1]
  }));
}

// ---------- outils ----------
function enDataUrl(blob) { return new Promise((ok, ko) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = ko; f.readAsDataURL(blob); }); }
const cacheData = new Map();
function dataDe(chemin) {
  if (!cacheData.has(chemin)) cacheData.set(chemin, fetch(RACINE + chemin).then(r => { if (!r.ok) throw new Error('absent ' + chemin); return r.blob(); }).then(enDataUrl).catch(() => null));
  return cacheData.get(chemin);
}
let policesSvg = null;
function polices() {
  if (!policesSvg) policesSvg = Promise.all([dataDe('fonts/barlow-condensed-700-italic.woff2'), dataDe('fonts/barlow-condensed-700.woff2'), dataDe('fonts/source-sans-3.woff2')]).then(([a, b, c]) =>
    (a ? '@font-face{font-family:"Barlow Condensed";font-style:italic;font-weight:700;src:url(' + a + ') format("woff2")}' : '')
    + (b ? '@font-face{font-family:"Barlow Condensed";font-style:normal;font-weight:700;src:url(' + b + ') format("woff2")}' : '')
    + (c ? '@font-face{font-family:"Source Sans 3";font-weight:400 700;src:url(' + c + ') format("woff2")}' : ''));
  return policesSvg;
}
const mc = document.createElement('canvas').getContext('2d');
function largeur(t, z, italique, ls) {
  mc.font = (italique ? 'italic ' : '') + '700 ' + z + 'px "Barlow Condensed"';
  if ('letterSpacing' in mc) mc.letterSpacing = (ls || 0) + 'px';
  const w = mc.measureText(t).width; if ('letterSpacing' in mc) mc.letterSpacing = '0px'; return w;
}
const textes = (svg, contenu) => [...svg.querySelectorAll('text')].filter(t => t.textContent === contenu);
function remplacer(svg, ancien, nouveau, maxW) {
  const els = textes(svg, ancien);
  els.forEach((t) => {
    let z = parseFloat(t.getAttribute('font-size')); const it = t.getAttribute('font-style') === 'italic', ls = parseFloat(t.getAttribute('letter-spacing') || '0');
    const w = largeur(nouveau, z, it, ls); if (w > maxW) z = Math.floor(z * maxW / w);
    t.textContent = nouveau; t.setAttribute('font-size', String(z));
  });
  return els;
}

// Affiche du club → image verticale 1080 x 1920 (File JPEG).
async function affiche(spec, nom, retouche) {
  const x = X(); if (!x || !x.affiches || !x.affiches.svg) return null;
  try { await document.fonts.load('italic 700 40px "Barlow Condensed"'); await document.fonts.load('700 40px "Barlow Condensed"'); } catch (e) { /* polices de repli */ }
  let s = await x.affiches.svg(spec, 'ex-' + nom + '-');
  const doc = new DOMParser().parseFromString(s, 'image/svg+xml'); const svg = doc.documentElement;
  if (retouche) retouche(svg);
  // logos inclus dans l'image (une image dessinée ne va rien chercher ailleurs)
  for (const im of [...svg.querySelectorAll('image')]) {
    const h = im.getAttribute('href') || ''; if (!/^img\//.test(h)) continue;
    const d = await dataDe(h); if (d) im.setAttribute('href', d); else im.remove();
  }
  const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style'); style.textContent = await polices();
  (svg.querySelector('defs') || svg).prepend(style);
  svg.setAttribute('width', String(W)); svg.setAttribute('height', '1350');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  try {
    const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = HV; const g = c.getContext('2d');
    // l'affiche un peu en retrait des bords : le zoom lent de la vidéo ne la coupe pas
    const lw = 940, lh = Math.round(1350 * lw / W);
    g.fillStyle = NUIT; g.fillRect(0, 0, W, HV); g.drawImage(img, Math.round((W - lw) / 2), Math.round((HV - lh) / 2), lw, lh);
    const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
    if (!b) return null;
    // affiche du club, déjà pleine de texte : le studio la montre seule et entière, jamais avec du texte par-dessus
    const f = new File([b], 'exemple-' + nom + '.jpg', { type: 'image/jpeg' }); f.affiche = true; return f;
  } catch (e) { return null; } finally { URL.revokeObjectURL(url); }
}

function afficheCouverture() {
  const j = joues31(); if (!j.length) return Promise.resolve(null);
  const v = j.filter(x => x.m.s[0] > x.m.s[1]).length, n = j.length;
  const phrase = n + ' MATCHS DE CHAMPIONNAT, ' + v + (v > 1 ? ' VICTOIRES' : ' VICTOIRE');
  return affiche({ type: 'affiche', modele: 'couverture', mode: 'res', theme: TH, dates: 'Samedi 31 octobre 2026', compte: { v, n } }, 'couverture', (svg) => {
    const avant = v + (v > 1 ? ' VICTOIRES' : ' VICTOIRE') + ' SUR ' + n + (n > 1 ? ' MATCHS' : ' MATCH');
    const els = textes(svg, avant); if (!els.length) return;
    const t = els[0], x0 = parseFloat(t.getAttribute('x')) - 84;
    remplacer(svg, avant, phrase, W - 160 - 100);
    const z = parseFloat(t.getAttribute('font-size')), w = largeur(phrase, z, true, 1), nx0 = Math.round((W - (84 + w)) / 2);
    t.setAttribute('x', String(nx0 + 84));
    [...svg.querySelectorAll('path[transform]')].forEach((p) => {
      const mm = /^translate\(([-\d.]+) ([-\d.]+)\) scale\(0\.66\)$/.exec(p.getAttribute('transform'));
      if (mm && Math.abs(parseFloat(mm[1]) - x0) < 1.5) p.setAttribute('transform', 'translate(' + nx0 + ' ' + mm[2] + ') scale(0.66)');
    });
  });
}
function afficheSamedi() {
  const j = joues31(); if (!j.length) return Promise.resolve(null);
  const v = j.filter(x => x.m.s[0] > x.m.s[1]).length;
  // Grand écart chez des jeunes (30 points ou plus) : « victoire », sans le score, comme dans la vidéo.
  const lignes = j.map(({ e, m }) => { const sans = Math.abs(m.s[0] - m.s[1]) >= 30; return { heure: '', jourCourt: 'SAM.', code: e.code, adv: m.adv, sig: m.sig || '', logo: m.logo || '', bcr: sans ? '' : m.s[0], ad: sans ? '' : m.s[1], v: m.s[0] > m.s[1] ? true : m.s[0] < m.s[1] ? false : null, lieuTxt: m.dom ? 'À domicile' : 'À l\'extérieur' }; });
  const avecSans = lignes.some(l => l.bcr === '');
  return affiche({ type: 'affiche', modele: 'resultats', theme: TH, titre: 'Samedi 31 octobre', suite: '', resume: v + (v > 1 ? ' victoires' : ' victoire'), lignes }, 'samedi', avecSans ? (svg) => {
    const vide = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim() === '-'); if (!vide.length) return;
    const y = parseFloat(vide[0].getAttribute('y')), z = parseFloat(vide[0].getAttribute('font-size'));
    let vic = null, ecart = Infinity;
    textes(svg, 'VICTOIRE').forEach((t) => { const d = parseFloat(t.getAttribute('y')) - y; if (d > 0 && d < ecart) { ecart = d; vic = t; } });
    if (!vic) return; vide.forEach(t => t.remove());
    const zz = Math.min(40, Math.round(z * 0.62)); vic.setAttribute('font-size', String(zz)); vic.setAttribute('y', String(Math.round(y - z * 0.39 + zz * 0.36))); vic.setAttribute('letter-spacing', '2');
  } : null);
}
function afficheElite() {
  const d = D(); let elite = null;
  ((d && d.equipes && d.equipes.u18f1 && d.equipes.u18f1.matchs) || []).forEach((m) => { if (m.d.slice(0, 10) === '2026-11-07') elite = m; });
  if (!elite) return Promise.resolve(null);
  return affiche({ type: 'affiche', modele: 'jour', theme: TH, lieu: elite.dom ? 'dom' : 'ext', titre: 'Samedi 7 novembre', suite: '', salleDom: 'Salle Alexandre-Cheruel – Rouxmesnil',
    lignes: [{ heure: elite.d.length >= 16 ? elite.d.slice(11, 16).replace(':', 'H') : '', jourCourt: 'SAM.', code: 'U18 filles', adv: 'Cherbourg Basket Ball', sig: elite.sig || 'C', logo: elite.logo || '', salle: '' }] }, 'elite', (svg) => {
    remplacer(svg, 'RENDEZ-VOUS', 'PREMIER MATCH', 736); remplacer(svg, 'DU WEEK-END', 'EN ÉLITE', 736);
  });
}
async function photo(chemin, nom, type) {
  try { const r = await fetch(RACINE + chemin); if (!r.ok) return null; const b = await r.blob(); return new File([b], nom, { type: type || b.type }); } catch (e) { return null; }
}

// Les médias de l'exemple (« Voir un exemple ») : la salle, la couverture et l'image du samedi 31 octobre.
export async function mediasExemple() {
  const r = await Promise.all([photo('img/salle-tribunes.jpg', 'exemple-salle.jpg', 'image/jpeg'), afficheCouverture(), afficheSamedi()]);
  return r.filter(Boolean);
}
// Les images de démonstration proposées dans le studio (5 au plus).
export async function imagesDemonstration() {
  const r = await Promise.all([photo('img/salle-tribunes.jpg', 'exemple-salle.jpg', 'image/jpeg'), afficheCouverture(), photo('img/salle-cheruel-vert.webp', 'exemple-salle-cheruel.webp', 'image/webp'), afficheSamedi(), afficheElite()]);
  return r.filter(Boolean);
}
