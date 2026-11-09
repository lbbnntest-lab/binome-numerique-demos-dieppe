/* Page « Le TikTok du BCR » (presentation/tiktok.html) : l'exemple monté sur place, les séries, le calendrier des 6 semaines.
   Le studio (js/tiktok-atelier.js) et le moteur de montage (js/tiktok-studio.js) ne se chargent qu'au premier besoin.
   Tout se passe dans le téléphone : aucune photo, aucune vidéo, aucun texte n'est envoyé. */
import DONNEES from './tiktok-donnees.js';
import { esc, HAB_NOMS, HAB_SERIE, dessinHabillage, PILIERS, pilierDe, ajouterJours, ecartJours, dateLongue, jourCourt, numeroJour, moisCourt, moisLong, stocker, relire } from './tiktok-commun.js';

const MODELES = Object.fromEntries(DONNEES.modeles.map(m => [m.id, m]));
const DEPART_DEFAUT = DONNEES.depart_defaut;
const DEPARTS = [0, 7, 14, 21].map(n => ajouterJours(DEPART_DEFAUT, n));
const NB_SEMAINES = 6;
let atelier = null;
const chargerAtelier = () => atelier || (atelier = import('./tiktok-atelier.js'));

/* ---------- Les séries ---------- */
const SERIES = [
  { cle: 'programme', vu: 'Nos matchs à la maison et le match à suivre.' },
  { cle: 'resultats', vu: 'Nos victoires et le match à retenir ; tous les scores dans la légende.' },
  { cle: 'panier', vu: 'La plus belle action du week-end, avec le son de la salle.' },
  { cle: 'defi', vu: 'Dix lancers francs : qui fait mieux ?' },
  { cle: 'gens', vu: 'Ceux sans qui il n\'y a pas de match.' },
  { cle: 'jeunes', vu: 'On apprend, on rate, on recommence ; sans visage.' },
  { cle: 'speciaux', vu: 'Movember, un partenaire, une photo d\'avant, le bilan de l\'automne.' }
];
const QUAND = { programme: 'Le vendredi', resultats: 'Le dimanche soir', panier: 'Le lundi, en bonus', defi: 'Le mercredi', gens: 'Le mercredi', jeunes: 'Le lundi ou le vendredi', speciaux: 'Selon l\'événement' };
const titreCourt = (p, date) => {
  const i = p.titre.indexOf(' · '); let t = i > 0 ? p.titre.slice(i + 3) : p.titre;
  // « 6 semaines en 30 secondes » : le nombre de semaines depuis le départ choisi
  if (date && p.modele === 'special-bilan-30s') t = t.replace(/^\d+ semaines/, Math.max(1, Math.ceil((ecartJours(etat.depart, date) + 1) / 7)) + ' semaines');
  return t;
};
const serieDe = (p) => { const i = p.titre.indexOf(' · '); return i > 0 ? p.titre.slice(0, i) : (MODELES[p.modele] || {}).serie || ''; };

function dessinerSeries() {
  const zone = document.getElementById('series'); if (!zone) return;
  zone.innerHTML = SERIES.map((s) => {
    const S = DONNEES.series[s.cle] || {};
    const pubs = DONNEES.publications.filter(p => (MODELES[p.modele] || {}).serie_cle === s.cle);
    const pres = [...new Set(pubs.map(titreCourt))];
    const piliers = [...new Set(pubs.map(p => pilierDe(MODELES[p.modele]).cle))];
    const nom = S.nom + (S.nom_option ? ' <span class="option">(ou « ' + esc(S.nom_option) + ' », si vous préférez)</span>' : '');
    return '<details class="serie"><summary><span class="serie-nom">' + nom + '</span><span class="serie-quand">' + esc(QUAND[s.cle]) + '</span></summary>'
      + '<div class="serie-corps"><p>' + esc(s.vu) + '</p>'
      + (pres.length ? '<p class="lib">Les présentations qui tournent</p><ul class="pres">' + pres.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '')
      + '<p class="etiquettes">' + piliers.map(c => { const P = Object.values(PILIERS).find(x => x.cle === c); return '<span class="pilier pilier-' + c + '">' + esc(P.nom) + '</span>'; }).join('')
      + (HAB_SERIE[s.cle] || []).map(h => '<span class="hab">' + dessinHabillage(h) + esc(HAB_NOMS[h]) + '</span>').join('') + '</p></div></details>';
  }).join('');
}

/* ---------- Le calendrier ---------- */
// Les matchs et les rendez-vous datés gardent leur date (sautés s'ils sont passés) ; les autres vidéos se décalent avec le départ.
function calendrier(depart) {
  const decalage = ecartJours(DEPART_DEFAUT, depart);
  const L = [];
  DONNEES.publications.forEach((p) => {
    let date;
    // Le premier match en élite (résultats du 7-8 novembre) ne sert qu'au départ proposé : plus tard, il serait trop ancien.
    if (p.ancrage === 'premier jour') { if (p.week_end && depart !== DEPART_DEFAUT) return; date = depart; }
    else if (p.ancrage === 'lendemain du premier jour') { if (p.week_end && depart !== DEPART_DEFAUT) return; date = ajouterJours(depart, 1); }
    else if (p.ancrage === 'date' || p.ancrage === 'week-end') { date = p.date; if (date < depart) return; }
    else date = ajouterJours(p.date, decalage);
    const semaine = Math.floor(ecartJours(depart, date) / 7) + 1;
    if (semaine > NB_SEMAINES) return;
    L.push({ p, date, semaine, decale: date !== p.date, modele: MODELES[p.modele] });
  });
  // une semaine qui n'a que 2 publications reçoit une vidéo de réserve (Joker « le bruit du basket »), facultative
  for (let s = 1; s <= NB_SEMAINES; s++) {
    const pris = L.filter(x => x.semaine === s); if (pris.length >= 3) continue;
    const lundi = ajouterJours(depart, (s - 1) * 7);
    const FERIES = ['2026-11-11', '2026-12-25', '2027-01-01'];   // jamais une vidéo de réserve un jour férié
    const jour = [2, 4, 0, 1, 3, 5].map(n => ajouterJours(lundi, n)).find(d => d >= depart && !FERIES.includes(d) && !pris.some(x => x.date === d)); if (!jour) continue;
    const m = MODELES[RESERVE.modele]; if (!m) continue;
    L.push({ p: { ...RESERVE, i: 100 + s, date: jour, jour: '', bandeau: jour <= '2026-11-30' ? 'Le BCR soutient Movember' : DEVISE, coeur: jour <= '2026-11-30' ? '💙' : '💚' }, date: jour, semaine: s, decale: true, modele: m, reserve: true });
  }
  const ordreHeure = (h) => { const m = /(\d{1,2})\s*h\s*(\d{2})?/.exec(h || ''); return m ? (+m[1]) * 60 + (+(m[2] || 0)) : (/matin/.test(h) ? 600 : /midi/.test(h) ? 720 : 1080); };
  L.sort((a, b) => a.date.localeCompare(b.date) || ordreHeure(a.p.heure) - ordreHeure(b.p.heure) || a.p.i - b.p.i);
  // L'habillage tourne dans chaque série ; dans une même semaine, deux vidéos n'ont pas le même habillage quand la série en a un autre.
  const vus = {};
  L.forEach((x) => {
    const s = x.modele.serie_cle, liste = HAB_SERIE[s] || ['oblique', 'cadre']; const k = vus[s] || 0;
    const semaine = L.filter(y => y.semaine === x.semaine && y.habillage).map(y => y.habillage);
    let j = 0; while (j < liste.length && semaine.includes(liste[(k + j) % liste.length])) j++;
    // tous déjà pris cette semaine (semaine à 5 vidéos) : celui qui a servi le plus tôt dans la semaine
    if (j >= liste.length) { let mieux = 0, rang = Infinity; for (let q = 0; q < liste.length; q++) { const r = semaine.lastIndexOf(liste[(k + q) % liste.length]); if (r < rang) { rang = r; mieux = q; } } j = mieux; }
    const h = liste[(k + j) % liste.length]; vus[s] = k + j + 1;
    x.habillage = relire('bcr-tiktok-hab-' + x.p.i, null) || h;
  });
  return L;
}

const STATUT = { ouverture: 'Ouverture du compte', bonus: 'En bonus, facultatif', joker: 'Joker, facultatif' };
const DEVISE = "Passion, esprit d'équipe, respect, Rouxmesnil";
// vidéo de réserve pour une semaine à 2 publications (même modèle que le Joker « à défaut »)
const RESERVE = { modele: 'joker-bruit-du-basket', titre: 'Joker · Le bruit du basket', precision: 'facultatif, sans voix', statut: 'joker', ancrage: 'reserve', heure: '18 h',
  hashtags: ['#basket', '#BCRouxmesnil', '#Rouxmesnil', '#Dieppe', '#Normandie'], quand: '', filmer: '', taper: 'rien.', autres: [], valeurs: {} };

/* ---------- Vignette de l'accroche sur chaque carte (dessinée ici, aux couleurs du club, sans aucune image) ---------- */
const HV = { noir: '#080a09', vert: '#1f7a3f', vif: '#46c46f', blanc: '#ffffff' };
function titreAccroche(x) {
  const m = x.modele, p = x.p; const a = (m.plans || []).find(q => q.type === 'accroche' || q.type === 'chiffre') || {};
  let t = String((a.textes && a.textes.titre) || '');
  for (let i = 0; i < 4 && /\{\w+\}/.test(t); i++) t = t.replace(/\{(\w+)\}/g, (s, k) => p.valeurs && typeof p.valeurs[k] === 'string' ? p.valeurs[k] : s);
  if (!t || /\{/.test(t)) t = titreCourt(p, x.date);
  return t.replace(/\.$/, '');
}
let policesPretes = null;
function dessinerVignettes(pubs) {
  if (!policesPretes) policesPretes = (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('italic 700 40px "Barlow Condensed"'), document.fonts.load('700 20px "Source Sans 3"')]) : Promise.resolve()).catch(() => { });
  policesPretes.then(() => pubs.forEach((x) => { const c = document.querySelector('[data-vignette="' + x.p.i + '"]'); if (c) vignette(c, x); }));
}
function vignette(cv, x) {
  const g = cv.getContext('2d'); if (!g) return; const W = cv.width, H = cv.height, h = x.habillage;
  const d = g.createLinearGradient(0, 0, W * 0.4, H); d.addColorStop(0, h === 'bloc' ? '#103d22' : '#0c1f14'); d.addColorStop(1, HV.noir); g.fillStyle = d; g.fillRect(0, 0, W, H);
  g.save();
  if (h === 'oblique') { for (let i = -1; i < 4; i++) { g.fillStyle = i % 2 ? 'rgba(70,196,111,.18)' : 'rgba(31,122,63,.35)'; g.beginPath(); g.moveTo(i * 70, 0); g.lineTo(i * 70 + 26, 0); g.lineTo(i * 70 + 26 - H * 0.4, H); g.lineTo(i * 70 - H * 0.4, H); g.fill(); } }
  else if (h === 'cadre') { g.strokeStyle = HV.vif; g.lineWidth = 3; g.strokeRect(6, 6, W - 12, H - 12); }
  else if (h === 'ruban') { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? 'rgba(70,196,111,.16)' : 'rgba(31,122,63,.3)'; g.fillRect(0, 30 + i * 80, W, 22); } }
  else { g.strokeStyle = 'rgba(70,196,111,.22)'; g.lineWidth = 4; g.beginPath(); g.arc(W * 0.8, H * 0.35, 120, 0, Math.PI * 2); g.stroke(); }
  g.restore();
  // badge de la série
  const serie = serieDe(x.p).toUpperCase(); g.font = '800 11px "Source Sans 3", system-ui, sans-serif';
  const bw = Math.min(g.measureText(serie).width, 140) + 14; g.fillStyle = h === 'bloc' ? HV.vif : h === 'ruban' ? HV.blanc : h === 'cadre' ? HV.noir : HV.vert; g.beginPath(); g.roundRect ? g.roundRect(10, 26, bw, 18, 9) : g.rect(10, 26, bw, 18); g.fill();
  g.fillStyle = h === 'bloc' || h === 'ruban' ? HV.noir : h === 'cadre' ? HV.vif : HV.blanc; g.textBaseline = 'middle'; g.fillText(serie, 17, 36, 140);
  // titre de l'accroche, posé comme dans la vidéo (signe de l'habillage)
  const t = titreAccroche(x).toUpperCase().replace(/ ([?!:;»])/g, '\u202F$1'); const centre = h === 'oblique' || h === 'bloc';
  let z = h === 'bloc' ? 40 : 32, L = [];
  for (; z >= 16; z -= 2) { g.font = 'italic 700 ' + z + 'px "Barlow Condensed", "Arial Narrow", sans-serif'; L = []; let cur = ''; for (const w of t.split(/ +/)) { const e = cur ? cur + ' ' + w : w; if (g.measureText(e).width > W - 28 && cur) { L.push(cur); cur = w; } else cur = e; } if (cur) L.push(cur); if (L.length <= 4 && L.every(l => g.measureText(l).width <= W - 28)) break; }
  const lh = z * 0.98, hT = lh * L.length;
  let y = h === 'oblique' ? 110 - hT : h === 'bloc' ? (H - hT) / 2 : h === 'cadre' ? 250 - hT : 120; y = Math.max(54, y);
  L.forEach((l, i) => {
    const yy = y + i * lh;
    if (h === 'ruban') { g.fillStyle = 'rgba(8,10,9,.9)'; g.fillRect(0, yy - 2, W, lh + 2); g.fillStyle = HV.vif; g.fillRect(0, yy + lh, W, 3); }
    if (h === 'bloc') { g.fillStyle = 'rgba(31,122,63,.94)'; const w = g.measureText(l).width + 12; g.fillRect((W - w) / 2, yy - 2, w, lh + 4); }
    g.fillStyle = HV.blanc; g.textAlign = centre ? 'center' : 'left'; g.textBaseline = 'alphabetic'; g.fillText(l, centre ? W / 2 : 12, yy + z * 0.82);
  });
  g.textAlign = 'left';
}
let etat = { depart: DEPART_DEFAUT, semaine: 1, liste: [] };

function carte(x) {
  const p = x.p, m = x.modele, P = pilierDe(m);
  const sansVoix = m.voix == null;
  const infos = [];
  // « Quand » seulement s'il dit plus que la date et l'heure déjà affichées (et seulement pour le départ proposé : ses dates sont écrites).
  if (p.quand && !x.decale && etat.depart === DEPART_DEFAUT && !/^[a-zé]+ \d+(er)? [a-zéû]+, \d{1,2} h( \d{2})?\.?$/i.test(p.quand.trim())) infos.push(['Quand', p.quand]);
  // décalé : une consigne qui cite un jour précis ne vaut plus ; on donne la consigne générale du modèle
  const date = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+\d|\b\d{1,2}\s*-\s*\d{1,2}\b|\b\d{1,2}(er)?\s+(novembre|décembre)|\bdu \d{1,2}\b/i;
  const filmer = x.reserve ? (m.medias && m.medias.consignes) || '' : p.filmer && (x.decale || etat.depart !== DEPART_DEFAUT) && date.test(p.filmer) ? (m.medias && m.medias.consignes) || '' : p.filmer;
  if (filmer) infos.push(['À filmer', filmer]);
  if (p.taper) infos.push(['À taper', p.taper]);
  if (p.verifier) infos.push(['À vérifier', p.verifier]);
  const autres = (p.autres || []).map(t => '<p class="pub-plus">' + esc(t) + '</p>').join('');
  const option = p.statut === 'bonus' || p.statut === 'joker';
  return '<article class="pub pub-' + P.cle + (option ? ' pub-option' : '') + '" aria-labelledby="pub-t-' + p.i + '">'
    + '<div class="pub-date" aria-hidden="true"><span class="pub-jour">' + esc(jourCourt(x.date).replace('.', '')) + '</span><span class="pub-num">' + numeroJour(x.date) + '</span><span class="pub-mois">' + esc(moisCourt(x.date).replace('.', '')) + '</span></div>'
    + '<div class="pub-corps">'
    + '<canvas class="pub-vignette" width="180" height="320" data-vignette="' + p.i + '" aria-hidden="true"></canvas>'
    + '<p class="pub-quand">' + esc(dateLongue(x.date)) + ', ' + esc(p.heure) + '</p>'
    + '<h4 class="pub-titre" id="pub-t-' + p.i + '"><span class="pub-serie">' + esc(serieDe(p)) + '</span> ' + esc(titreCourt(p, x.date)) + '</h4>'
    + '<p class="etiquettes"><span class="pilier pilier-' + P.cle + '">' + esc(P.nom) + '</span><span class="hab">' + dessinHabillage(x.habillage) + esc(HAB_NOMS[x.habillage]) + '</span>'
    + (x.reserve ? '<span class="statut">En réserve, facultatif</span>' : STATUT[p.statut] ? '<span class="statut">' + esc(STATUT[p.statut]) + '</span>' : '') + (sansVoix ? '<span class="statut">Sans voix de synthèse</span>' : '') + '</p>'
    + '<dl class="pub-infos">' + infos.map(([a, b]) => '<div><dt>' + esc(a) + '</dt><dd>' + esc(b) + '</dd></div>').join('') + '</dl>' + autres
    + '<button type="button" class="bouton plein" data-studio="' + p.i + '">Coller mes médias</button>'
    + '</div></article>';
}

function dessinerChoixSemaines() {
  const zone = document.getElementById('semaines-choix'); if (!zone) return;
  let h = '';
  for (let s = 1; s <= NB_SEMAINES; s++) {
    const lundi = ajouterJours(etat.depart, (s - 1) * 7);
    const pubs = etat.liste.filter(x => x.semaine === s);
    h += '<button type="button" class="sem-bouton" data-semaine="' + s + '" aria-pressed="' + (s === etat.semaine) + '" aria-label="Semaine ' + s + ', à partir du ' + esc(dateLongue(lundi)) + ', ' + pubs.length + ' publications">'
      + '<span class="sem-num">' + s + '</span><span class="sem-date">' + numeroJour(lundi) + ' ' + esc(moisCourt(lundi).replace('.', '')) + '</span>'
      + '<span class="sem-points" aria-hidden="true">' + pubs.map(x => '<i class="pt-' + pilierDe(x.modele).cle + '"></i>').join('') + '</span></button>';
  }
  zone.innerHTML = h;
}

function dessinerSemaine() {
  const zone = document.getElementById('semaine'); if (!zone) return;
  const s = etat.semaine, lundi = ajouterJours(etat.depart, (s - 1) * 7), dimanche = ajouterJours(lundi, 6);
  const pubs = etat.liste.filter(x => x.semaine === s);
  const memeMois = moisLong(lundi) === moisLong(dimanche);
  const titre = 'Semaine ' + s + ', du ' + dateLongue(lundi).replace(/ \w+$/, memeMois ? '' : ' ' + moisLong(lundi)) + ' au ' + dateLongue(dimanche);
  let filmer = '';
  const liste = etat.depart === DEPART_DEFAUT && DONNEES.semaines_a_filmer[s] ? DONNEES.semaines_a_filmer[s].a_filmer : null;
  if (liste && liste.length) {
    const coches = relire('bcr-tiktok-filmer-' + s, []);
    filmer = '<div class="filmer"><h4>À filmer cette semaine</h4><ul>' + liste.map((t, i) => '<li><label class="case"><input type="checkbox" data-filmer="' + s + '" value="' + i + '"' + (coches.includes(i) ? ' checked' : '') + '><span>' + esc(t) + '</span></label></li>').join('') + '</ul></div>';
  }
  const fixes = pubs.filter(x => !x.reserve && x.p.statut !== 'bonus' && x.p.statut !== 'joker').length, plus = pubs.length - fixes;
  const resume = fixes + (fixes > 1 ? ' publications' : ' publication') + (plus ? ', plus ' + plus + ' en bonus si vous avez le temps (en gris)' : '') + '.';
  zone.innerHTML = '<h3 class="semaine-titre" tabindex="-1">' + esc(titre) + '</h3><p class="semaine-resume">' + esc(resume) + '</p>' + filmer
    + (pubs.length ? pubs.map(carte).join('') : '<p>Aucune publication prévue cette semaine.</p>');
  dessinerVignettes(pubs);
}

function majCalendrier(garderSemaine) {
  etat.liste = calendrier(etat.depart);
  if (!garderSemaine) etat.semaine = 1;
  dessinerChoixSemaines(); dessinerSemaine();
}

function initCalendrier() {
  const sel = document.getElementById('depart'); if (!sel) return;
  const choisi = relire('bcr-tiktok-depart', DEPART_DEFAUT);
  etat.depart = DEPARTS.includes(choisi) ? choisi : DEPART_DEFAUT;
  sel.innerHTML = DEPARTS.map(d => '<option value="' + d + '"' + (d === etat.depart ? ' selected' : '') + '>' + esc(dateLongue(d)) + '</option>').join('');
  sel.addEventListener('change', () => { etat.depart = sel.value; stocker('bcr-tiktok-depart', sel.value); majCalendrier(false); });
  document.getElementById('legende-piliers').innerHTML = '<p class="lib">Les couleurs</p>' + Object.values(PILIERS).map(P => '<span class="pilier pilier-' + P.cle + '">' + esc(P.nom) + '</span>').join('');
  document.getElementById('semaines-choix').addEventListener('click', (e) => {
    const b = e.target.closest('[data-semaine]'); if (!b) return;
    etat.semaine = +b.dataset.semaine; dessinerChoixSemaines(); dessinerSemaine();
    const t = document.querySelector('.semaine-titre'); if (t) t.focus({ preventScroll: true });
  });
  document.getElementById('semaine').addEventListener('change', (e) => {
    const c = e.target.closest('[data-filmer]'); if (!c) return;
    const cle = 'bcr-tiktok-filmer-' + c.dataset.filmer;
    const v = [...document.querySelectorAll('[data-filmer="' + c.dataset.filmer + '"]')].filter(x => x.checked).map(x => +x.value);
    stocker(cle, v);
  });
  document.getElementById('semaine').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-studio]'); if (!b) return;
    const x = etat.liste.find(y => y.p.i === +b.dataset.studio); if (!x) return;
    if (x.reserve) x.p.valeurs = x.p.valeurs || {};
    b.disabled = true; const avant = b.textContent; b.textContent = 'Ouverture du studio…';
    try {
      const A = await chargerAtelier();
      await A.ouvrirStudio(x, { depart: etat.depart, retour: b, changerHabillage: (h) => { stocker('bcr-tiktok-hab-' + x.p.i, h); majCalendrier(true); } });
    } catch (err) { b.textContent = 'Le studio n\'a pas pu s\'ouvrir. Rechargez la page.'; return; }
    finally { b.disabled = false; }
    b.textContent = avant;
  });
  majCalendrier(false);
}

/* ---------- L'exemple monté sur place ---------- */
function initExemple() {
  const bouton = document.getElementById('demo-bouton'); if (!bouton) return;
  const ecran = document.getElementById('demo-ecran'), av = document.getElementById('demo-avancement');
  const barre = av.querySelector('.barre span'), txt = av.querySelector('.avancement-texte');
  const apres = document.getElementById('demo-apres'), noteVoix = document.getElementById('demo-voix');
  let video = null;
  chargerAtelier().then(A => A.voixDejaLa()).then((oui) => { if (!oui) noteVoix.hidden = false; }).catch(() => { noteVoix.hidden = false; });
  bouton.addEventListener('click', async () => {
    bouton.disabled = true; bouton.setAttribute('aria-busy', 'true'); apres.hidden = true; av.hidden = false; av.classList.remove('erreur');
    const montrer = (f, t) => { barre.style.width = Math.round(f * 100) + '%'; txt.textContent = t; };
    montrer(0.01, 'Préparation…');
    const reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const r0 = ecran.getBoundingClientRect(); if (r0.bottom > innerHeight) ecran.scrollIntoView({ block: 'nearest', behavior: reduit ? 'auto' : 'smooth' });
    try {
      const A = await chargerAtelier();
      const r = await A.monterExemple(montrer);
      if (video) { URL.revokeObjectURL(video.src); video.remove(); }
      video = document.createElement('video');
      video.src = URL.createObjectURL(r.blob); video.controls = true; video.playsInline = true; video.setAttribute('playsinline', '');
      video.setAttribute('aria-label', 'Vidéo d\'exemple : les résultats du samedi 31 octobre, avec la voix');
      ecran.classList.add('lecture'); ecran.prepend(video);
      av.hidden = true;
      document.getElementById('demo-pret').textContent = r.sansVoix ? 'Vidéo prête, sans voix : la voix n\'a pas pu se préparer sur ce téléphone.' : 'Vidéo prête : ' + String(Math.round(r.duree)) + ' secondes, avec la voix.';
      apres.hidden = false; noteVoix.hidden = true;
      if (!reduit) video.play().catch(() => { });
      bouton.textContent = 'Refaire l\'exemple';
    } catch (e) {
      av.classList.add('erreur'); montrer(0, (e && e.message) || 'La vidéo n\'a pas pu être fabriquée. Réessayez.');
    } finally { bouton.disabled = false; bouton.removeAttribute('aria-busy'); }
  });
  document.getElementById('demo-revoir').addEventListener('click', () => { if (video) { video.currentTime = 0; video.play().catch(() => { }); video.focus(); } });
}

dessinerSeries();
initCalendrier();
initExemple();
