// BCRStudio : moteur de montage des vidéos verticales du BCR, entièrement DANS le téléphone.
// Les photos et vidéos du club ne quittent jamais l'appareil : lecture des fichiers locaux, dessin image par image
// sur un canvas, encodage H.264 + AAC par le navigateur (WebCodecs, via mediabunny), fichier mp4 fabriqué en mémoire.
// Aucune musique ajoutée : la vidéo porte la voix off (voix de synthèse, js/tiktok-voix.js) et le son des vidéos du club.
//
// API (détail en bas du fichier, objet BCRStudio) :
//   BCRStudio.capacites()                         → { ok, webcodecs, avc1080, avc720, aacNatif, aacLogiciel, message }
//   BCRStudio.preparer(modele, valeurs)           → montage : textes remplis, plans retenus, phrases de la voix
//   BCRStudio.monter({ modele, valeurs | montage, medias, voix, ... }) → { blob, fichier, duree, ... }
//   BCRStudio.enregistrer(resultat)               → { etat: partage (téléphone) | annule | telechargement (ordinateur) }
//   BCRStudio.calculer(matchs), .enLettres(n, genre), .scoreAffiche(match), .habillages(serie)
import * as MB from '../vendor/mediabunny/mediabunny.min.mjs';

const URL_MB = new URL('../vendor/mediabunny/mediabunny.min.mjs', import.meta.url).href;
const URL_AAC = new URL('../vendor/mediabunny/mediabunny-aac-encoder.min.mjs', import.meta.url).href;
const FONTES = [
  ['BCRTitre', new URL('../fonts/barlow-condensed-700-italic.woff2', import.meta.url).href, { style: 'italic', weight: '700' }],
  ['BCRTexte', new URL('../fonts/source-sans-3.woff2', import.meta.url).href, { weight: '200 900' }]
];
const URL_LOGO = new URL('../img/logo-bcr-240.webp', import.meta.url).href;

export const COULEURS = { noir: '#080a09', vert: '#1f7a3f', vif: '#46c46f', blanc: '#ffffff', fonce: '#155a2d', gris: '#c9cdca', papier: '#f3f4f1', encre: '#171a20' };
const C = COULEURS;
const DEVISE = "Passion, esprit d'équipe, respect, Rouxmesnil";
// Carte de fin courte (1,2 s, son de la salle dessous) ; accroche lisible 2 s au moins, sans transition avant.
const FIN_D = 1.2, ACCROCHE_D = 2.0, MAX_MEDIAS = 8, DUREE_MIN = 7, DUREE_MAX = 30;
// Zone sûre du téléphone : rien d'important sous la colonne de boutons de l'application (x > 940) ni sous y = 1540.
const ZONE = { gauche: 140, droite: 940, largeur: 800 };

// ---------- messages simples (jamais d'écran blanc : la page affiche err.message) ----------
export class ErreurStudio extends Error {
  constructor(code, message, detail) { super(message); this.name = 'ErreurStudio'; this.code = code; this.detail = detail; }
}
const MSG = {
  ENCODAGE_IMPOSSIBLE: "Ce téléphone ne sait pas fabriquer la vidéo ici. Ouvrez cette page dans Chrome (Android) ou dans Safari à jour (iPhone).",
  AUCUN_MEDIA_LISIBLE: "Ces photos ou vidéos n'ont pas pu être lues. Essayez avec d'autres fichiers du téléphone.",
  ANNULE: "Montage arrêté.",
  ECHEC: "La vidéo n'a pas pu être fabriquée. Fermez les autres applications, puis réessayez."
};
const mediasManquants = (n, video) => 'Ajoutez ' + (n > 1 ? 'au moins ' + n + (video ? ' vidéos' : ' photos ou vidéos') : (video ? 'une vidéo' : 'une photo ou une vidéo')) + ' pour cette publication.';

// ---------- habillages : 2 à 4 par série, même couleurs du club ----------
// Grille commune (badge, sous-titres, carte de fin) + un signe propre à chaque habillage pour le titre d'accroche :
// oblique = titre centré en bas du tiers haut ; cadre = titre en bas, sous-titres en haut ; rubans = titre sur un ruban
// pleine largeur ; bloc = un mot ou un chiffre géant en plein centre.
export const HABILLAGES = {
  oblique: { nom: 'Bandes obliques', pente: 0.32, surFond: C.vif, surTexte: C.noir, entree: 'gauche', transition: 'diagonale', st: 'boite', ligneFond: 'rgba(8,10,9,.80)', ligneTexte: C.blanc, accent: C.vif, vif: C.vif, badgeFond: C.vert, badgeTexte: C.blanc, fond: 'diagonales', fin: 'diagonale', accroche: 'centre', stY: 0.635 },
  cadre: { nom: 'Cadre', pente: 0, surFond: C.blanc, surTexte: C.noir, entree: 'haut', transition: 'volet', st: 'contour', ligneFond: 'rgba(255,255,255,.93)', ligneTexte: C.encre, accent: C.vif, vif: C.vif, accentClair: C.fonce, badgeFond: C.noir, badgeTexte: C.vif, fond: 'cercles', fin: 'colonne', liseré: true, accroche: 'bas', stY: 0.219, stHautAccroche: true },
  bloc: { nom: 'Bloc vert', pente: 0, surFond: C.noir, surTexte: C.vif, entree: 'zoom', transition: 'eclair', st: 'vert', ligneFond: 'rgba(31,122,63,.92)', ligneTexte: C.blanc, accent: C.vif, vif: C.vif, accentLigne: '#b9f5cc', badgeFond: C.vif, badgeTexte: C.noir, fond: 'aplat', fin: 'plein', blocTitre: true, accroche: 'geant', stY: 0.70 },
  ruban: { nom: 'Rubans', pente: 0.12, surFond: C.noir, surTexte: C.blanc, entree: 'droite', transition: 'ruban', st: 'surligne', ligneFond: 'rgba(8,10,9,.82)', ligneTexte: C.blanc, accent: C.vif, vif: C.vif, badgeFond: C.blanc, badgeTexte: C.noir, fond: 'rubans', fin: 'rubans', rubans: true, accroche: 'ruban', stY: 0.635 }
};
// Novembre (Movember) : accent bleu à la place du vert vif sur le badge et les traits, comme les visuels du club ce mois-là.
const THEMES = { movember: { accent: '#7db8ff', vif: '#7db8ff', badgeFond: '#1f5fd0', badgeTexte: C.blanc, accentLigne: '#cfe3ff' } };
export const HABILLAGES_PAR_SERIE = {
  programme: ['oblique', 'ruban', 'cadre'],
  resultats: ['oblique', 'bloc', 'ruban', 'cadre'],
  panier: ['bloc', 'oblique'],
  defi: ['ruban', 'bloc', 'cadre'],
  gens: ['cadre', 'oblique'],
  jeunes: ['cadre', 'bloc'],
  speciaux: ['oblique', 'cadre', 'bloc'],
  joker: ['cadre', 'ruban']
};

// ---------- textes : nombres en lettres, équipes, scores, heures ----------
const U = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZ = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
function moinsDeCent(n) {
  if (n < 20) return U[n];
  const d = Math.floor(n / 10), u = n % 10;
  if (d === 7 || d === 9) { const r = n - (d === 7 ? 60 : 80); return DIZ[d] + (d === 7 && r === 11 ? ' et onze' : '-' + U[r]); }
  if (u === 0) return d === 8 ? 'quatre-vingts' : DIZ[d];
  if (u === 1 && d !== 8) return DIZ[d] + ' et un';
  return DIZ[d] + '-' + U[u];
}
export function enLettres(n, genre = 'm') {
  n = Math.round(+n || 0); if (n < 0) return 'moins ' + enLettres(-n, genre);
  let s;
  if (n < 100) s = moinsDeCent(n);
  else if (n < 1000) { const c = Math.floor(n / 100), r = n % 100; s = (c > 1 ? U[c] + ' cent' + (r === 0 ? 's' : '') : 'cent') + (r ? ' ' + moinsDeCent(r) : ''); }
  else { const m = Math.floor(n / 1000), r = n % 1000; s = (m > 1 ? enLettres(m) + ' mille' : 'mille') + (r ? ' ' + enLettres(r) : ''); }
  if (genre === 'f') s = s.replace(/(^|[ -])un$/, '$1une');
  return s;
}
const maj = (s) => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const ORDRE_JOUR = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 7 };
export function equipeEcran(l) { return String(l || '').replace(/\s*\(([^)]+)\)/, (m, x) => /^[A-Z0-9]+$/.test(x) ? ' ' + x : ' · ' + x).trim(); }
export function equipeVoix(l) { const s = String(l || '').replace(/\s*\([^)]*\)/g, '').trim(); return 'nos ' + s.replace(/^Seniors/, 'seniors'); }
function mineursDe(l) { if (/^U(11|13|15|18)\b/.test(l)) return 'oui'; if (/^U21\b/.test(l)) return 'possible'; return 'non'; }
function heureNorm(h) { if (!h) return null; const m = String(h).match(/(\d{1,2})\s*[:h]\s*(\d{2})?/); if (!m) return null; return m[1].padStart(2, '0') + ':' + (m[2] || '00'); }
export function heureEcran(h) { h = heureNorm(h); if (!h) return ''; const [a, b] = h.split(':'); return (+a) + ' h' + (b === '00' ? '' : ' ' + b); }
export function heureVoix(h) { h = heureNorm(h); if (!h) return ''; const [a, b] = h.split(':'); return (+a) + (+a === 1 ? ' heure' : ' heures') + (b === '00' ? '' : ' ' + (+b)); }
export function scoreAffiche(m) {
  if (m.derby) return 'Bravo aux deux équipes';
  if (m.nous == null || m.eux == null || m.nous === '' || m.eux === '') return '';
  const mineurs = m.mineurs || mineursDe(m.equipe || '');
  if (mineurs !== 'non' && Math.abs(m.nous - m.eux) >= 30) return m.nous > m.eux ? 'Victoire' : 'Défaite';
  return m.nous + ' – ' + m.eux;
}
function normMatch(m) {
  const x = { ...m };
  x.equipe = x.equipe || '';
  x.equipe_ecran = x.equipe_ecran || equipeEcran(x.equipe);
  x.voix_equipe = x.voix_equipe || equipeVoix(x.equipe);
  x.mineurs = x.mineurs || mineursDe(x.equipe);
  if (!x.jour && x.date) x.jour = JOURS[new Date(x.date + 'T12:00').getDay()];
  x.jour = (x.jour || '').toLowerCase();
  x.heure = heureNorm(x.heure);
  x.lieu = /ext|route/i.test(x.lieu || '') ? 'exterieur' : 'domicile';
  x.nous = x.nous === '' || x.nous == null ? null : +x.nous; x.eux = x.eux === '' || x.eux == null ? null : +x.eux;
  x.joue = x.nous != null && x.eux != null || !!x.derby && x.joue !== false;
  x.victoire = x.joue && !x.derby && x.nous > x.eux; x.defaite = x.joue && !x.derby && x.nous < x.eux;
  x.score_affiche = scoreAffiche(x);
  x.lisible = !x.derby && !(x.mineurs !== 'non' && x.joue && Math.abs(x.nous - x.eux) >= 30);
  return x;
}
function prefixer(p, m) {
  const o = {};
  o[p + '_equipe'] = m.equipe_ecran; o[p + '_voix_equipe'] = m.voix_equipe; o[p + '_voix_equipe_maj'] = maj(m.voix_equipe);
  o[p + '_adversaire'] = m.adversaire || ''; o[p + '_adversaire_voix'] = m.adversaire_voix || m.adversaire || '';
  o[p + '_adversaire_affiche'] = m.adversaire ? 'contre ' + m.adversaire : '';
  o[p + '_nous'] = m.nous; o[p + '_eux'] = m.eux; o[p + '_score_affiche'] = m.score_affiche; o[p + '_score_lisible'] = m.lisible;
  o[p + '_jour'] = maj(m.jour); o[p + '_jour_court'] = maj(m.jour.slice(0, 3)) + (m.jour ? '.' : '');
  o[p + '_heure'] = heureEcran(m.heure); o[p + '_heure_voix'] = heureVoix(m.heure);
  o[p + '_heure_ou_confirmer'] = m.heure ? heureEcran(m.heure) : 'horaire à confirmer'; o[p + '_heure_ou_rien'] = heureEcran(m.heure);
  o[p + '_lieu'] = m.lieu === 'domicile' ? 'à domicile' : "à l'extérieur";
  const hv = m.heure ? ', à ' + heureVoix(m.heure) : '';
  const ve = m.voix_equipe + (/,/.test(m.voix_equipe) ? ',' : '');   // « nos U18 filles, en élite, jouent »
  o[p + '_voix'] = m.lieu === 'domicile'
    ? maj(m.jour) + (m.heure ? ' à ' + heureVoix(m.heure) : '') + ', ' + ve + ' reçoivent ' + (m.adversaire_voix || m.adversaire) + '.'
    : 'Et ' + m.jour + ', ' + ve + ' jouent contre ' + (m.adversaire_voix || m.adversaire) + ", à l'extérieur" + hv + '.';
  return o;
}

// Valeurs calculées à partir de la liste des matchs du studio (après corrections du club). Les valeurs saisies gagnent toujours.
export function calculer(matchs = []) {
  const L = (matchs || []).filter(m => m && m.actif !== false).map(normMatch);
  const v = { __matchs: L };
  const dom = L.filter(m => m.lieu === 'domicile'), ext = L.filter(m => m.lieu !== 'domicile');
  const heros = L.find(m => m.une) || null;
  const joues = L.filter(m => m.joue), horsDerby = joues.filter(m => !m.derby), vict = horsDerby.filter(m => m.nous > m.eux);
  v.n_matchs = L.length; v.n_domicile = dom.length; v.n_exterieur = ext.length;
  v.n_domicile_hors_heros = dom.length - (heros && heros.lieu === 'domicile' ? 1 : 0);
  v.n_joues = joues.length; v.n_joues_hors_derby = horsDerby.length; v.n_autres_joues = joues.length - (heros && heros.joue ? 1 : 0);
  v.n_victoires = vict.length; v.n_victoires_exterieur = vict.filter(m => m.lieu !== 'domicile').length;
  v.victoire_s = v.n_victoires > 1 ? 'victoires' : 'victoire';
  v.victoire_s_exterieur = v.n_victoires_exterieur > 1 ? 'victoires' : 'victoire';
  v.n_joues_exterieur = joues.filter(m => m.lieu !== 'domicile').length;
  if (heros) { Object.assign(v, prefixer('heros', heros)); v.score_lisible = heros.lisible; v.victoire = heros.victoire; v.defaite = heros.defaite; }
  let ret = L.find(m => m.retenir && m.victoire && m.lisible) || null;
  if (!ret) ret = vict.filter(m => m.lisible).sort((a, b) => (a.nous - a.eux) - (b.nous - b.eux))[0] || null;
  if (ret) { Object.assign(v, prefixer('retenir', ret)); v.match_a_retenir = ret.equipe_ecran; v.__retenir = ret; }
  if (v.n_victoires > 0 && v.n_victoires >= v.n_joues_hors_derby / 2) {
    v.accroche_resultats = v.n_victoires + ' ' + v.victoire_s + ' ce week-end'; v.chiffre = String(v.n_victoires); v.chiffre_surtitre = 'Le chiffre du week-end'; v.unite = v.victoire_s + ' ce week-end';
  } else if (v.n_victoires > 0) {
    v.accroche_resultats = 'Le match à retenir'; v.chiffre = ret ? ret.score_affiche : ''; v.chiffre_surtitre = 'Le match à retenir'; v.unite = ret ? ret.equipe_ecran : '';
  } else if (joues.length) {
    v.accroche_resultats = v.n_joues + (v.n_joues > 1 ? ' matchs' : ' match') + ' ce week-end'; v.chiffre = String(v.n_joues); v.chiffre_surtitre = 'Le chiffre du week-end'; v.unite = v.n_joues > 1 ? 'matchs ce week-end' : 'match ce week-end';
  }
  // début et fin des matchs à la maison (programme)
  const avecHeure = dom.filter(m => m.heure).sort((a, b) => (ORDRE_JOUR[a.jour] || 9) - (ORDRE_JOUR[b.jour] || 9) || a.heure.localeCompare(b.heure));
  if (avecHeure.length) {
    const a = avecHeure[0], z = avecHeure[avecHeure.length - 1];
    const tousJour = (j) => dom.filter(m => m.jour === j).every(m => m.heure);
    const debut = tousJour(a.jour) ? 'Ça commence ' + a.jour + ' à ' + heureVoix(a.heure) : 'Premier match annoncé ' + a.jour + ' à ' + heureVoix(a.heure);
    const fin = tousJour(z.jour) ? ', et ça finit ' + z.jour + ' à ' + heureVoix(z.heure) + ' avec ' + z.voix_equipe + '.' : ', dernier ' + z.jour + ' à ' + heureVoix(z.heure) + ', avec ' + z.voix_equipe + '.';
    v.debut_voix = avecHeure.length > 1 ? debut + fin : debut + ', avec ' + a.voix_equipe + '.';
    v.debut_voix_court = maj(a.jour) + (tousJour(a.jour) ? ', ça commence à ' + heureVoix(a.heure) + ' avec ' : ', premier match annoncé à ' + heureVoix(a.heure) + ', avec ') + a.voix_equipe + '.';
  }
  v.liste_complete_matchs = L.map(m => m.jour.slice(0, 3) + '. ' + (m.heure ? heureEcran(m.heure) : 'horaire à confirmer') + ' · ' + m.equipe_ecran + ' · ' + (m.adversaire || '') + (m.lieu === 'domicile' ? ' (dom.)' : ' (ext.)')).join('\n');
  v.liste_complete_scores = joues.map(m => m.derby ? 'Derby des ' + m.equipe_ecran + ' : bravo aux deux équipes !' : m.equipe_ecran + ' · ' + m.score_affiche + ' · ' + (m.adversaire || '')).join('\n');
  return v;
}

// ---------- gabarits : trous {nom} et conditions « si » ----------
function vrai(v) { return v === true || (typeof v === 'number' && v !== 0) || (typeof v === 'string' && v.trim() !== '' && !/^(non|false|0)$/i.test(v.trim())) || (Array.isArray(v) && v.length > 0); }
function clause(c, ctx) {
  let neg = false; c = c.trim(); if (/^non\s+/.test(c)) { neg = true; c = c.replace(/^non\s+/, ''); }
  const m = c.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/); let r;
  if (m) {
    let a = ctx[m[1]]; const bt = m[3].trim();
    let b = /^-?\d+(\.\d+)?$/.test(bt) ? +bt : (ctx[bt] !== undefined ? ctx[bt] : bt);
    if (a === true) a = 'oui'; if (a === false) a = 'non';
    if (typeof a === 'number' || typeof b === 'number') { const x = +a, y = +b; r = { '==': x === y, '!=': x !== y, '>=': x >= y, '<=': x <= y, '>': x > y, '<': x < y }[m[2]]; }
    else { const x = String(a == null ? '' : a).toLowerCase(), y = String(b).toLowerCase(); const eg = x === y || (y.length > 2 && new RegExp('\\b' + y.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(x)); r = m[2] === '!=' ? !eg : eg; }
  } else r = vrai(ctx[c]);
  return neg ? !r : r;
}
export function condition(expr, ctx) {
  if (expr == null || expr === '') return true;
  return String(expr).split(/\s+ou\s+/).some(p => p.split(/\s+et\s+/).every(c => clause(c, ctx)));
}
function remplir(x, ctx, manquants) {
  if (x == null) return x;
  if (Array.isArray(x)) return x.map(y => remplir(y, ctx, manquants));
  if (typeof x === 'object') { const o = {}; for (const k in x) o[k] = remplir(x[k], ctx, manquants); return o; }
  if (typeof x !== 'string') return x;
  let s = x;
  for (let i = 0; i < 6 && /\{\w+\}/.test(s); i++) s = s.replace(/\{(\w+)\}/g, (t, k) => { const v = ctx[k]; if (v === undefined || v === null || v === '') { if (v == null) manquants.add(k); return ''; } return Array.isArray(v) ? v.join(', ') : String(v); });
  if (/\{[^}]*\}/.test(s)) { (s.match(/\{[^}]*\}/g) || []).forEach(t => manquants.add(t)); s = s.replace(/\{[^}]*\}/g, ''); }
  return nettoyer(s);
}
const nettoyer = (s) => s.replace(/([?!…])\s*\.(?!\.)/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.])/g, '$1').replace(/^[\s·,]+|[\s·,]+$/g, '').trim();

// Phrases de la voix : une valeur vide rendrait la phrase fausse (« Score final : à contre Cherbourg »).
// Seules ces valeurs peuvent manquer sans dommage ; si une autre manque, la phrase n'est pas lue.
const OPTIONNELLES = /^(intro_voix|ajout_voix|heure_derby_voix|coeur|bandeau|heure_si_saisie|bilan_tournoi)$/;
// Dernier filet : forme d'une phrase à trou, même si la valeur vide venait d'ailleurs.
export const TROU = /(^|\s)à\s+(à|contre|face)\b|(^|\s)à\s*[,.;!?]|:\s*à\s+(contre|face|à)\b|:\s*[,.;]|\(\s*\)|[{}]|\s{2,}|^\s*[,.:;]/;
function remplirPhrase(x, ctx) {
  let s = String(x == null ? '' : x); const vides = new Set();
  for (let i = 0; i < 6 && /\{\w+\}/.test(s); i++) s = s.replace(/\{(\w+)\}/g, (t, k) => { const v = ctx[k]; if (v === undefined || v === null || v === '') { if (!OPTIONNELLES.test(k)) vides.add(k); return ''; } return Array.isArray(v) ? v.join(', ') : String(v); });
  return { texte: nettoyer(s.replace(/\{[^}]*\}/g, '')), vides: [...vides] };
}
// Ce que dit la voix pour un match (pages du carnet) : la ligne forte, comme un club pro.
function voixMatch(m) {
  const adv = m.adversaire_voix || m.adversaire || ''; const eq = maj(m.voix_equipe); const v = /,/.test(m.voix_equipe) ? ',' : '';
  if (m.derby) return 'Derby pour ' + m.voix_equipe + ' : bravo aux deux équipes !';
  if (!m.joue) return '';
  if (m.victoire) return m.lisible ? eq + v + ' gagnent ' + m.nous + ' à ' + m.eux + (adv ? ' contre ' + adv : '') + '.' : 'Victoire de ' + m.voix_equipe + (adv ? ' contre ' + adv : '') + '.';
  return m.lisible ? eq + v + " s'inclinent " + m.nous + ' à ' + m.eux + (adv ? ' face à ' + adv : '') + '.' : eq + v + ' ont tout donné' + (adv ? ' face à ' + adv : '') + '.';
}
function listeVoix(noms) {   // 3 équipes au plus, sans virgule à l'intérieur d'un nom (« nos U18 garçons équipe 2 »)
  const L = noms.slice(0, 3).map(n => n.replace(/,\s*/g, ' ')); const suite = noms.length > 3 ? ', et d\'autres encore' : '';
  return (L.length < 2 ? L.join('') : L.slice(0, -1).join(', ') + ' et ' + L[L.length - 1]) + suite;
}
// Une ancre de phrase correspond-elle à ce plan ? (même règle pour le studio et pour le calage)
function ancreDe(ancre, q, idx, page) {
  if (!ancre) return false;
  if (ancre[0] === '@') { const [a, b] = ancre.slice(1).split('#'); return idx === +a && (b === undefined || page === +b); }
  return q.type === ancre || (ancre === 'accroche' && q.type === 'chiffre') || (ancre === 'retenir' && q.source === 'match_a_retenir') || (ancre === 'heros' && q.source === 'match_heros') || (ancre === 'dernier' && (q.media === 'dernier' || q.role === 'dernier')) || (ancre === 'carte' && q.type === 'carte');
}

// Valeurs déduites des choix du club (listes, prénom, année…), complétées sans rien inventer.
function completer(ctx) {
  const v = ctx;
  if (v.categorie) { v.categorie_ecran = v.categorie_ecran || equipeEcran(v.categorie); v.categorie_voix = v.categorie_voix || equipeVoix(v.categorie); }
  if (v.qui) { const q = String(v.qui); v.qui_ecran = v.qui_ecran || q.replace(/^(une?) de nos (.+)$/, (m, a, b) => a + ' ' + b.replace(/s$/, '')); v.qui_legende = v.qui_legende || maj(q); }
  const p = (v.prenom || '').trim();
  if (v.prenom_ou_eux === undefined) v.prenom_ou_eux = p || 'à eux';
  if (v.prenom_ou_a_eux === undefined) v.prenom_ou_a_eux = p || 'à eux';
  if (v.prenom_ou_nos_benevoles === undefined) v.prenom_ou_nos_benevoles = p || 'nos bénévoles';
  if (v.c_etait_prenom === undefined) v.c_etait_prenom = p ? "c'était " + p : "c'étaient nos bénévoles";
  if (Array.isArray(v.objets) && v.objets.length) { v.objet_surprise = v.objet_surprise || v.objets[v.objets.length - 1]; v.objets_voix = v.objets_voix || maj(v.objets.slice(0, -1).join('… ')) + '…'; }
  if (v.qui_sac && !v.sac_intro_voix) v.sac_intro_voix = 'Il y a quoi dans le sac ' + v.qui_sac + ' ?';
  if (v.fige_texte === undefined) v.fige_texte = /défense/i.test(v.presentation_choisie || '') ? 'Et là ?' : 'Ça rentre ?';
  if (v.presentation_choisie && !v.presentation_affichee) v.presentation_affichee = maj(v.presentation_choisie);
  if (v.partenaire) {
    const commune = /commune/i.test(v.partenaire);
    if (v.partenaire_accroche === undefined) v.partenaire_accroche = commune ? 'Avec le soutien de la commune' : 'On est passés chez ' + v.partenaire;
    if (v.partenaire_voix_1 === undefined) v.partenaire_voix_1 = commune ? 'Merci à la commune de Rouxmesnil-Bouteilles, qui soutient le club.' : 'Vous connaissez ' + v.partenaire + ' ? Ils sont avec le club cette saison.';
    if (v.partenaire_voix_2 === undefined) v.partenaire_voix_2 = commune ? 'Le club, c\'est vous tous !' : 'Merci ! Passez les voir de notre part.';
    if (v.contrepartie === undefined) v.contrepartie = 'oui';
  }
  if (v.retro_accroche === undefined) {
    const an = +v.annee; const age = an >= 1949 && an <= 2025 ? new Date().getFullYear() - an : null;
    if (age) { v.age_photo = age; v.retro_accroche = 'Cette photo a ' + age + ' ans'; v.retro_voix_1 = 'Cette photo a ' + enLettres(age) + ' ans !'; v.fin_retro_voix = 'Un souvenir de cette époque ? Dites-le en commentaire !'; }
    else { v.retro_accroche = 'En quelle année ?'; v.retro_voix_1 = 'Cette photo, c\'était en quelle année ?'; v.fin_retro_voix = "Dites-nous l'année en commentaire !"; }
  }
  if (v.suite_voix === undefined) v.suite_voix = 'Samedi, on remet ça, et on compte sur vous !';
  if (v.heure_derby && v.heure_derby_voix === undefined) v.heure_derby_voix = ', à ' + heureVoix(v.heure_derby);
  if (v.heure_derby && v.heure_si_saisie === undefined) v.heure_si_saisie = heureEcran(v.heure_derby);
  // nombres en lettres pour la voix (féminin pour les victoires)
  for (const k of Object.keys(v)) {
    const x = v[k]; if (k.startsWith('__') || /_lettres/.test(k)) continue;
    if (typeof x === 'number' || (typeof x === 'string' && /^\d{1,4}$/.test(x))) {
      const g = /victoire/.test(k) ? 'f' : 'm';
      if (v[k + '_lettres'] === undefined) v[k + '_lettres'] = enLettres(+x, g);
      if (v[k + '_lettres_maj'] === undefined) v[k + '_lettres_maj'] = maj(enLettres(+x, g));
    }
  }
  return v;
}

function periode(h) { if (!h) return 'horaire à confirmer'; const x = +h.slice(0, 2); return x < 12 ? 'matin' : x < 18 ? 'après-midi' : 'soir'; }
function filtrer(L, f = {}, ctx) {
  return L.filter(m => (!f.jour || m.jour === f.jour) && (!f.lieu || m.lieu === (/ext/.test(f.lieu) ? 'exterieur' : 'domicile'))
    && (f.joue === undefined || m.joue === f.joue) && (!f.sauf_heros || !m.une) && (!f.sauf_retenir || m !== ctx.__retenir));
}
function ligneMatch(modele, m, ctx, manquants) {
  return remplir(modele || '{equipe} · {score_affiche}', { ...ctx, equipe: m.equipe_ecran, score_affiche: m.score_affiche, adversaire: m.adversaire, heure: heureEcran(m.heure), jour: maj(m.jour) }, manquants);
}
// Lignes d'un plan de type liste / groupes / colonnes / pages / scores_un_par_un.
function lignesPour(p, ctx, manquants) {
  const donnees = ctx.lignes_plans && ctx.lignes_plans[p.index];
  if (donnees) return donnees;
  const L = ctx.__matchs || [];
  const src = p.source === 'victoires' ? L.filter(m => m.victoire) : p.source === 'resume_exterieur' ? null : L;
  if (p.type === 'pages' && p.source === 'resume_exterieur') {
    if (!ctx.n_joues_exterieur) return [];
    const n = ctx.n_victoires_exterieur || 0, plus = (ctx.n_victoires || 0) - n > 0 ? ' de plus' : '';
    return [{ titre: remplir(p.page.titre, ctx, manquants), tampon: remplir(p.page.tampon, ctx, manquants), bas: '', voix: n ? "À l'extérieur, " + enLettres(n, 'f') + ' ' + (n > 1 ? 'victoires' : 'victoire') + plus + '.' : "À l'extérieur, pas de victoire cette fois." }];
  }
  let liste = filtrer(src || [], p.filtre, ctx);
  if (p.ordre === 'par heure' || p.type === 'scores_un_par_un') liste = liste.slice().sort((a, b) => (ORDRE_JOUR[a.jour] || 9) - (ORDRE_JOUR[b.jour] || 9) || String(a.heure).localeCompare(String(b.heure)));
  const max = p.max_lignes || p.max_pages || 5;
  if (p.type === 'groupes') {
    const g = new Map();
    for (const m of liste.slice().sort((a, b) => (ORDRE_JOUR[a.jour] || 9) - (ORDRE_JOUR[b.jour] || 9) || String(a.heure).localeCompare(String(b.heure)))) {
      const k = (p.filtre && p.filtre.jour ? '' : maj(m.jour) + ' ') + periode(m.heure); if (!g.has(k)) g.set(k, []); g.get(k).push(m);
    }
    const out = [...g].map(([k, ms]) => { const h = ms.find(x => x.heure); return maj(k.trim()) + ' · ' + ms.length + (ms.length > 1 ? ' matchs' : ' match') + (h ? ', dès ' + heureEcran(h.heure) : ''); });
    return out.length > max ? out.slice(0, max - 1).concat(['et ' + (out.length - max + 1) + ' autres']) : out;
  }
  if (p.type === 'colonnes') {
    const a = liste.filter(m => m.lieu === 'domicile').length, b = liste.length - a;
    if (!liste.length) return [];
    const t = (n) => remplir(p.ligne || '{n} matchs', { n }, manquants).replace(/^1 matchs$/, '1 match');
    return { colonnes: [{ titre: (p.colonnes || [])[0] || 'À la maison', n: a, ligne: t(a) }, { titre: (p.colonnes || [])[1] || 'Sur la route', n: b, ligne: t(b) }] };
  }
  if (p.type === 'pages') {
    return liste.slice(0, max).map(m => ({ titre: m.equipe_ecran, tampon: m.score_affiche, bas: m.adversaire ? 'contre ' + m.adversaire : '', photo: m.photo || null, voix: voixMatch(m) }));
  }
  const lignes = liste.map(m => ligneMatch(p.ligne, m, ctx, manquants));
  return lignes.length > max ? lignes.slice(0, max - 1).concat(['et ' + (lignes.length - max + 1) + ' autres']) : lignes;
}

// Une carte de texte sans voix laisse un silence : on lui donne sa phrase (la ligne forte qu'elle affiche).
function voixDesCartes(plans, phrases, ctx, majPhrase) {
  const resoudre = () => {
    let dernier = -1;
    for (const ph of phrases) {
      ph.plan_ = null; if (!ph.ancre) continue;
      const a = ph.ancre.replace(/#\d+$/, '');
      let k = plans.findIndex((q, x) => x > dernier && ancreDe(a, q, q.index));
      if (k < 0 && dernier < 0) k = plans.findIndex(q => ancreDe(a, q, q.index));
      if (k >= 0) { ph.plan_ = k; dernier = k; }
    }
  };
  const dit = (t) => phrases.some(ph => ph.texte === t);
  const inserer = (k, liste) => {
    resoudre();
    let pos = phrases.findIndex(x => x.plan_ != null && x.plan_ > k);
    if (pos < 0) { let der = -1; phrases.forEach((x, n) => { if (x.plan_ != null && x.plan_ <= k) der = n; }); pos = der + 1; }
    phrases.splice(pos, 0, ...liste);
  };
  plans.forEach((q, k) => {
    if (['accroche', 'fin', 'media', 'ralenti', 'accelere', 'fige'].includes(q.type)) return;
    resoudre(); if (phrases.some(ph => ph.plan_ === k)) return;
    const tx = q.textes || {}; const at = '@' + q.index; let L = [];
    if (q.type === 'pages' && Array.isArray(q.lignes)) L = q.lignes.map((pg, j) => ({ texte: majPhrase(pg.voix || ''), ancre: at + '#' + j })).filter(x => x.texte);
    else if ((q.type === 'scores_un_par_un' || q.type === 'liste') && q.source === 'victoires') {
      const noms = filtrer((ctx.__matchs || []).filter(m => m.victoire), q.filtre, ctx).slice(0, 4).map(m => m.voix_equipe);
      if (noms.length) L = [{ texte: (noms.length > 1 ? 'Victoires pour ' : 'Victoire pour ') + listeVoix(noms) + '.', ancre: at }];
    } else if (q.type === 'carte' || q.type === 'score') {
      const tous = /^Tous les (scores|matchs)/i.exec(tx.titre || '');
      let t = '';
      if (tous) t = 'Tous les ' + tous[1].toLowerCase() + (/facebook/i.test(tx.equipe || '') ? ' sont sur notre page Facebook.' : ' sont dans la légende.');
      else if (q.source === 'match_heros') t = typeof ctx.heros_voix === 'string' ? ctx.heros_voix : '';
      else if (q.type === 'carte' && !q.source) t = [tx.surtitre, tx.titre, tx.equipe, ...(Array.isArray(tx.fin) ? tx.fin : [])].filter(Boolean).map(x => String(x).replace(/\s*·\s*/g, ', ').replace(/[\s.!]+$/, '')).join(' : ').replace(/^(.*?) : (.*)$/, '$1 : $2') + '.';
      t = majPhrase(nettoyer(String(t || '').replace(/\p{Extended_Pictographic}|️/gu, '')));
      if (t && t.length > 3 && t.length < 110 && !dit(t) && !TROU.test(t)) L = [{ texte: t, ancre: at }];
    }
    if (L.length) inserer(k, L.map(x => ({ ...x, silence: false, derivee: true })));
  });
  phrases.forEach(ph => { delete ph.plan_; });
}

// Prépare un modèle : trous remplis, conditions appliquées, phrases de la voix. Ne lit aucun média.
export function preparer(modele, valeurs = {}) {
  if (!modele || !Array.isArray(modele.plans)) throw new ErreurStudio('MODELE', 'Modèle introuvable.');
  const manquants = new Set(); const avert = [];
  const ctx = completer({ nom_serie: modele.serie, bandeau: '', ...calculer(valeurs.matchs || []), ...valeurs });
  const R = (x) => remplir(x, ctx, manquants);
  const voixSynthese = modele.voix != null && valeurs.sans_voix !== true;
  let phrases = [];
  const majPhrase = (t) => t.replace(/(^|[.!?]\s+)([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
  const nomHeros = ctx.heros_equipe || 'le match à la une';
  if (voixSynthese) {
    let src = modele.voix;
    if (typeof src === 'string') { const k = src.replace(/[{}]/g, ''); src = ctx[k]; if (!Array.isArray(src)) { manquants.add(k); src = []; } }
    for (const p of src.filter(p => condition(p.si, ctx))) {
      if (p.silence) { phrases.push({ texte: '', ancre: p.ancre || null, silence: true }); continue; }
      if (/^\{objets_voix\}$/.test(String(p.texte).trim()) && Array.isArray(ctx.objets) && ctx.objets.length > 1) {
        const ip = modele.plans.findIndex(q => q.type === 'media' && /chaque sauf dernier/.test(String(q.media)));
        ctx.objets.slice(0, -1).forEach(o => phrases.push({ texte: majPhrase(String(o)) + '…', ancre: ip >= 0 ? '@' + ip : null, silence: false }));
        continue;
      }
      const r = remplirPhrase(p.texte, ctx); const t = majPhrase(r.texte);
      if (!t) continue;
      if (r.vides.length || TROU.test(t)) {   // jamais une phrase à trou : elle n'est pas lue, et on dit pourquoi en clair
        avert.push(r.vides.some(k => /^heros_/.test(k)) ? 'Pas de score pour ' + nomHeros + ' : la vidéo ne parle pas du score.'
          : r.vides.some(k => /^retenir_/.test(k)) ? 'Pas de score pour le match à retenir : la voix n\'en parle pas.'
          : 'Une phrase de la voix est retirée : une information manque.');
        continue;
      }
      phrases.push({ texte: t, ancre: p.ancre || null, silence: false });
    }
  }
  const plans = [];
  modele.plans.forEach((p, i) => {
    if (!condition(p.si, ctx)) return;
    const q = { ...p, index: i, textes: p.textes ? R(p.textes) : {} };
    if (Array.isArray(q.textes.fin)) q.textes.fin = q.textes.fin.filter((l, j, a) => l && a.indexOf(l) === j);
    if (typeof p.etiquette === 'string' && !/\{objet_i\}/.test(p.etiquette)) q.etiquette = R(p.etiquette);
    if (p.titre) q.titre = R(p.titre);
    if (Array.isArray(p.etiquettes)) q.etiquettes = p.etiquettes.map(e => /\{n\}/.test(e) ? e : R(e)).filter(Boolean);
    if (['liste', 'groupes', 'colonnes', 'pages', 'scores_un_par_un'].includes(p.type)) {
      q.lignes = lignesPour({ ...p, index: i }, ctx, manquants);
      const vide = !q.lignes || (Array.isArray(q.lignes) && !q.lignes.length);
      if (vide) { avert.push('Rien à montrer pour « ' + (q.titre || p.type) + ' » : ce passage est retiré.'); return; }
    }
    if (p.type === 'score' && p.source === 'match_a_retenir' && !ctx.__retenir && !valeurs.retenir_score_affiche) return;
    if (p.type === 'score' && p.source === 'match_heros' && ctx.heros_score_affiche === '') { avert.push('Pas de score pour ' + nomHeros + ' : la vidéo ne parle pas du score.'); return; }
    plans.push(q);
  });
  if (!plans.some(p => p.type === 'fin')) plans.push({ type: 'fin', duree: FIN_D, textes: { fin: [DEVISE] }, index: 99 });
  if (voixSynthese && phrases.length) voixDesCartes(plans, phrases, ctx, majPhrase);
  let bandeauHaut = null;
  if (modele.bandeau && typeof modele.bandeau === 'object' && condition(modele.bandeau.si, ctx)) bandeauHaut = modele.bandeau.texte || 'Collaboration commerciale';
  if (!bandeauHaut && ctx.partenaire_du_week_end && plans.some(p => p.bandeau)) bandeauHaut = /commune/i.test(ctx.partenaire_du_week_end) ? null : (ctx.contrepartie === 'non' ? null : 'Collaboration commerciale');
  if (ctx.bandeau_commercial) bandeauHaut = ctx.bandeau_commercial === true ? 'Collaboration commerciale' : String(ctx.bandeau_commercial);
  const liste = HABILLAGES_PAR_SERIE[modele.serie_cle] || ['oblique', 'cadre'];
  const graine = valeurs.n != null ? +valeurs.n : [...(modele.id || '') + (valeurs.date || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  const manquantsLegende = new Set(); const legende = modele.legende ? remplir(modele.legende, ctx, manquantsLegende).replace(/\n{2,}/g, '\n') : '';
  return {
    id: modele.id, serie: R(modele.badge || modele.serie || ''), serie_cle: modele.serie_cle, presentation: R(modele.presentation || ''),
    duree: { min: Math.max(DUREE_MIN, (modele.duree && modele.duree.min) || DUREE_MIN), max: Math.min(DUREE_MAX, (modele.duree && modele.duree.max) || DUREE_MAX) },
    medias: modele.medias || { min: 0, max: MAX_MEDIAS }, plans, phrases, textesVoix: phrases.filter(p => !p.silence).map(p => p.texte),
    voixSynthese, vraieVoix: !!modele.vraie_voix, bandeauHaut, habillages: liste, habillage: liste[Math.abs(graine) % liste.length], theme: valeurs.theme || null, date: valeurs.date || null,
    couperSon: vrai(ctx.couper_son), legende: legende + (voixSynthese && !/synthèse vocale/.test(legende) ? '\nVoix : synthèse vocale' : ''),
    ctx, manquantsLegende: [...manquantsLegende], manquants: [...manquants].filter(k => !/^(bandeau|coeur|ligne_partenaire|phrase_legende_ligne|heure_derby_voix|heure_si_saisie)$/.test(k)), avertissements: avert
  };
}

// ---------- ressources (polices, logo) ----------
let ressources = null;
function chargerRessources() {
  if (ressources) return ressources;
  ressources = (async () => {
    for (const [nom, url, desc] of FONTES) { try { const f = new FontFace(nom, 'url(' + url + ')', desc); await f.load(); document.fonts.add(f); } catch (e) { /* police de secours du système */ } }
    let logo = null; try { const r = await fetch(URL_LOGO); logo = await createImageBitmap(await r.blob()); } catch (e) { }
    return { logo };
  })();
  ressources.catch(() => { ressources = null; });
  return ressources;
}

let aacLogiciel = null;
async function activerAacLogiciel() {
  if (aacLogiciel) return aacLogiciel;
  aacLogiciel = (async () => {
    // Le fichier de l'encodeur importe « mediabunny » par son nom : on le relie ici à notre copie (fichier non modifié sur le disque).
    const txt = (await (await fetch(URL_AAC)).text()).replace(/from\s*"mediabunny"/g, 'from"' + URL_MB + '"');
    const u = URL.createObjectURL(new Blob([txt], { type: 'text/javascript' }));
    try { const m = await import(u); m.registerAacEncoder(); } finally { URL.revokeObjectURL(u); }
    return true;
  })();
  aacLogiciel.catch(() => { aacLogiciel = null; });
  return aacLogiciel;
}
const estWebkit = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Safari\//.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Android|Edg\//.test(navigator.userAgent)) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ---------- lecture des médias (aucun envoi : tout reste dans le téléphone) ----------
async function lireMedia(f, i, W, H, o) {
  const type = f.type || '';
  const estImage = type.startsWith('image/') || (!type && /\.(jpe?g|png|webp|heic|gif)$/i.test(f.name || ''));
  if (estImage) {
    let brut = await createImageBitmap(f, { imageOrientation: 'from-image' });
    const Z = 1.2; const s = Math.max(W * Z / brut.width, H * Z / brut.height);
    if (s < 0.98) {
      const w = Math.round(brut.width * s), h = Math.round(brut.height * s);
      try { const r = await createImageBitmap(brut, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' }); brut.close(); brut = r; }
      catch (e) { const cv = new OffscreenCanvasOuCanvas(w, h); cv.getContext('2d').drawImage(brut, 0, 0, w, h); brut.close(); brut = cv; }
    }
    // affiche = visuel du club déjà plein de texte (titre, logo) : jamais de texte posé dessus
    return { genre: 'photo', index: i, image: brut, largeur: brut.width, hauteur: brut.height, duree: Infinity, nom: f.name, affiche: !!f.affiche };
  }
  const m = { genre: 'video', index: i, fichier: f, duree: 0, t0: 0, video: null, audio: null, lecteur: false, nom: f.name, deja: [] };
  try {
    const entree = new MB.Input({ formats: MB.ALL_FORMATS, source: new MB.BlobSource(f) });
    m.entree = entree;
    const vt = await entree.getPrimaryVideoTrack(); const at = await entree.getPrimaryAudioTrack();
    if (!vt) throw new Error('sans image');
    m.t0 = Math.max(0, await entree.getFirstTimestamp().catch(() => 0));
    m.duree = (await entree.computeDuration()) - m.t0;
    if (!o.forcerLecteurVideo && await vt.canDecode()) m.video = vt; else m.lecteur = true;
    if (at && await at.canDecode()) m.audio = at;
  } catch (e) { m.lecteur = true; }
  if (m.lecteur) { // repli : balise <video> (plus lent, mais lit ce que le téléphone sait lire)
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(f);
    await new Promise((ok, ko) => { v.onloadeddata = ok; v.onerror = () => ko(new Error('vidéo illisible')); setTimeout(() => ko(new Error('vidéo illisible')), 15000); });
    m.el = v; if (!m.duree || !isFinite(m.duree)) m.duree = v.duration; m.t0 = 0;
    if (!m.audio) m.audioSecours = true;
  }
  if (!(m.duree > 0.2)) throw new Error('vidéo trop courte');
  return m;
}
function OffscreenCanvasOuCanvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function liberer(m) {
  try { if (m.image && m.image.close) m.image.close(); } catch (e) { }
  m.image = null; m.flou = null;
  try { m.entree && m.entree.dispose && m.entree.dispose(); } catch (e) { }
  if (m.el) { try { URL.revokeObjectURL(m.el.src); m.el.removeAttribute('src'); m.el.load(); } catch (e) { } m.el = null; }
  m.stills = null;
}

// Énergie du son par tranches de 0,1 s (sert à choisir le passage le plus vivant). Les longues vidéos ne sont lues qu'en 12 fenêtres de 5 s.
async function profilSon(m) {
  if (m.profil !== undefined) return m.profil;
  m.profil = null; if (!m.audio) return null;
  const pas = 0.1, n = Math.ceil(m.duree / pas) + 1; const somme = new Float64Array(n), compte = new Uint32Array(n);
  const fen = m.duree <= 90 ? [[0, m.duree]] : Array.from({ length: 12 }, (_, i) => { const a = (m.duree - 5) * i / 11; return [a, a + 5]; });
  try {
    const sink = new MB.AudioBufferSink(m.audio);
    for (const [a, b] of fen) for await (const w of sink.buffers(m.t0 + a, m.t0 + b)) {
      const ch = w.buffer.getChannelData(0), fr = w.buffer.sampleRate, t = w.timestamp - m.t0;
      for (let i = 0; i < ch.length; i += 32) { const k = Math.floor((t + i / fr) / pas); if (k >= 0 && k < n) { somme[k] += ch[i] * ch[i]; compte[k]++; } }
    }
  } catch (e) { return null; }
  const rms = new Float32Array(n), connu = new Uint8Array(n);
  for (let k = 0; k < n; k++) if (compte[k]) { rms[k] = Math.sqrt(somme[k] / compte[k]); connu[k] = 1; }
  m.profil = { pas, rms, connu }; return m.profil;
}
function choisirDebut(m, d, mode) {
  const dur = m.duree; if (d >= dur - 0.05) return 0;
  const maxS = dur - d - 0.05;
  if (mode === 'fin') return maxS;
  if (mode === 'debut') return Math.min(0.15, maxS);
  const P = m.profil; const chevauche = (s) => m.deja.reduce((a, [x, y]) => a + Math.max(0, Math.min(y, s + d) - Math.max(x, s)), 0) / d;
  let best = maxS * 0.5, bestScore = -Infinity;
  for (let s = Math.min(0.2, maxS); s <= maxS + 1e-6; s += 0.1) {
    let sc;
    if (P) {
      const a = Math.floor(s / P.pas), b = Math.floor((s + d) / P.pas); let sum = 0, nb = 0, pic = 0, inconnu = 0;
      for (let k = a; k < b && k < P.rms.length; k++) { if (!P.connu[k]) { inconnu++; continue; } sum += P.rms[k]; nb++; const rel = (k * P.pas - s) / d; if (rel > 0.15 && rel < 0.85 && P.rms[k] > pic) pic = P.rms[k]; }
      if (inconnu > (b - a) * 0.3) continue;
      sc = (nb ? sum / nb : 0) + 0.6 * pic;
      if (mode === 'bruit') sc = pic;
    } else sc = -Math.abs(s - maxS * 0.5);
    sc -= chevauche(s) * 10;
    if (sc > bestScore) { bestScore = sc; best = s; }
  }
  return Math.max(0, Math.min(maxS, best));
}

// ---------- plan de montage ----------
const TEXTUELS = ['accroche', 'carte', 'score', 'liste', 'groupes', 'colonnes', 'pages', 'scores_un_par_un', 'chiffre', 'fige'];
const aTexte = (c) => TEXTUELS.includes(c.type) || !!c.etiquette || c.type === 'accelere';
function nombreDans(s, re, defaut) { const m = String(s || '').match(re); return m ? +m[1].replace(',', '.') : defaut; }

function construirePlans(M, lus) {
  const N = lus.length; const ctx = M.ctx; const out = []; const av = [];
  const parIndex = (n) => N ? lus[(Math.max(1, n) - 1) % N] : null;
  let reponses = [];
  if (M.plans.some(p => /reponses/.test(String(p.media)))) {
    if (Array.isArray(ctx.reponses) && ctx.reponses.length) reponses = ctx.reponses.map(n => n - 1).filter(n => n >= 0 && n < N);
    else { const vids = lus.map((m, i) => m.genre === 'video' ? i : -1).filter(i => i >= 0); reponses = N >= 4 ? vids.slice(-2) : []; }
  }
  const pris = new Set(); M.plans.forEach(p => { if (typeof p.media === 'number' && (p.type === 'accroche' || p.type === 'media') && N) pris.add((p.media - 1) % N); });
  const tous = [...Array(N).keys()];
  const role = (p) => {
    const r = String(p.media);
    if (r === 'chaque sauf dernier') return tous.slice(0, -1);
    if (r === 'dernier') return N ? [N - 1] : [];
    if (r === 'reponses') return reponses;
    let base = tous.filter(i => !(r === 'chaque sauf reponses' && reponses.includes(i)));
    if ((p.etiquette == null) && base.filter(i => !pris.has(i)).length >= 1 && base.length > 1) base = base.filter(i => !pris.has(i));
    return base;
  };
  for (const p of M.plans) {
    const base = { type: p.type, src: p, textes: p.textes || {}, etiquette: p.etiquette || null, etiquettes: p.etiquettes || null, lignes: p.lignes, sens: out.length % 2, cadre: 0 };
    const dNum = typeof p.duree === 'number' ? p.duree : null;
    if (p.type === 'fin') { out.push({ ...base, media: null, d: FIN_D, dMin: FIN_D, dMax: FIN_D, flex: false }); continue; }
    if (p.type === 'accroche') {
      // 2 s au moins : le titre reste entier tout le plan, et aucune transition ne passe avant la fin de l'accroche.
      const d = Math.max(ACCROCHE_D, Math.min(2.4, dNum || 0));
      out.push({ ...base, media: parIndex(p.media || 1), d, dMin: d, dMax: d, flex: false, texteReste: d, mode: 'normal', son: true });
      continue;
    }
    if (p.type === 'media') {
      const idx = typeof p.media === 'number' ? [N ? (p.media - 1) % N : -1] : role(p);
      if (!idx.length || idx[0] < 0) { av.push('Pas de média pour un passage : il est retiré.'); continue; }
      const txt = String(p.duree || '');
      for (const i of idx) {
        const m = lus[i]; const video = m.genre === 'video';
        let d = dNum, mode = 'normal', dMin = 1.2, dMax = null, extrait = null;
        if (p.duree === 'auto' || d == null) { const a = p.min || 1.8, b = p.max || 3; d = Math.min(b, Math.max(a, 2.4)); dMin = a; dMax = b; }
        if (/action/.test(txt)) { const mx = nombreDans(txt, /(\d+(?:,\d+)?) s au plus/, 6); d = video ? Math.min(mx, m.duree) : 3; dMax = d; dMin = Math.min(d, 3); extrait = 'fin'; }
        else if (/réponse|phrase/.test(txt)) { const mx = nombreDans(txt, /(\d+(?:,\d+)?) s au plus/, 5); d = video ? Math.min(mx, m.duree) : 3; dMax = d; extrait = 'debut'; }
        else if (/dernier tir/.test(txt)) { const de = ctx.debut_dernier_tir != null ? +ctx.debut_dernier_tir : Math.max(0, m.duree - 6); d = video ? Math.max(1.2, m.duree - de) : 3; dMax = d; extrait = 'fixe'; base.de = de; }
        if (p.coupe) extrait = extrait || 'bruit';
        const etq = typeof p.etiquette === 'string' && /\{objet_i\}/.test(p.etiquette) ? ((ctx.objets || [])[i] || '') : (p.etiquette || null);
        const sonPlein = /sa voix|voix de la personne/.test(String(p.son || '')) || !M.voixSynthese;
        const st = /sous-titr/.test(String(p.son || '')) ? (p.media === 'reponses' ? (ctx.sous_titres_reponses || [])[reponses.indexOf(i)] : ctx.sous_titre) : null;
        const c = { ...base, etiquette: etq, media: m, d, dMin: Math.min(dMin, d), dMax: dMax || d + 2.5, flex: !/réponse|phrase|dernier tir/.test(txt), mode, extrait: extrait || 'energie', son: true, sonPlein, sousTitreVrai: st || null, role: String(p.media) === 'dernier' ? 'dernier' : null, de: base.de };
        out.push(c);
        if (p.ralenti && video) { out.push({ ...base, type: 'ralenti', etiquette: 'Au ralenti', media: m, d: 3, dMin: 3, dMax: 3, flex: false, mode: 'ralenti', secondes: 1.5, apres: c, son: false }); }
        if (p.transition && /claquement/.test(p.transition)) c.extrait = 'bruit';
      }
      continue;
    }
    if (p.type === 'fige') {
      const m = parIndex(p.media || 1);
      out.push({ ...base, media: m, d: dNum || 1.2, dMin: 1.2, dMax: 1.6, flex: false, mode: 'fige', instant: ctx.instant_fige != null ? +ctx.instant_fige : (m && m.genre === 'video' ? Math.max(0, m.duree - 1) : 0), son: false });
      continue;
    }
    if (p.type === 'ralenti') {
      const prec = [...out].reverse().find(x => x.media && x.media.genre === 'video' && x.mode === 'normal');
      const m = prec ? prec.media : parIndex(p.media || 1);
      const sec = nombreDans(p.duree, /(\d+) dernières secondes/, 2);
      if (!m || m.genre !== 'video') { av.push('Ralenti retiré : il faut une vidéo.'); continue; }
      out.push({ ...base, media: m, d: sec / 0.5, dMin: Math.min(sec, 2) / 0.5, dMax: sec / 0.5, flex: true, mode: 'ralenti', secondes: sec, apres: prec || null, son: false, etiquette: p.etiquette || 'Au ralenti' });
      continue;
    }
    if (p.type === 'accelere') {
      const m = parIndex(p.media || 1);
      if (!m || m.genre !== 'video') { av.push('Passage en accéléré retiré : il faut une vidéo.'); continue; }
      const a = ctx.debut_dernier_tir != null ? +ctx.debut_dernier_tir : Math.max(0, m.duree - 6);
      const longueur = Math.max(0.5, a); const max = nombreDans(p.duree, /(\d+) s au plus/, 9);
      const vitesse = Math.max(2, longueur / max);
      out.push({ ...base, media: m, d: Math.max(1, longueur / vitesse), dMin: 1, dMax: max, flex: false, mode: 'accelere', de: 0, a, vitesse, son: false });
      continue;
    }
    // plans de textes : carte, score, liste, groupes, colonnes, pages, scores_un_par_un, chiffre
    let d = dNum; const n = Array.isArray(p.lignes) ? p.lignes.length : 1;
    let dMin = 1.5, dMax;
    if (p.type === 'liste' || p.type === 'groupes') { if (d == null) d = (p.par_ligne || 1.5) * n + 0.8; dMin = Math.max(1.5, 0.35 * n + 1.5); d = Math.max(d, dMin); }
    else if (p.type === 'pages') { d = d != null ? d : (p.par_page || 2) * n; dMin = Math.min(d, 1.6 * n); dMax = 2.8 * n; }
    else if (p.type === 'scores_un_par_un') { d = (p.par_score || 1.5) * n + 0.6; dMin = 1.1 * n + 0.6; dMax = 2 * n + 1; }
    else if (p.type === 'score') { d = d || 2.6; dMin = 1.8; }
    else if (p.type === 'chiffre') { d = d || 3; dMin = 2.4; }
    else if (p.type === 'colonnes') { d = d || 3; dMin = 2; }
    else d = d || 2;
    const media = p.media === 'tour' ? null : (typeof p.media === 'number' ? parIndex(p.media) : null);
    if (p.type === 'pages' && Array.isArray(p.lignes) && p.lignes.length > 1) {   // une page = un plan : chaque page a sa phrase
      const dp = d / p.lignes.length;
      p.lignes.forEach((pg, j) => out.push({ ...base, lignes: [pg], page: j, premierePage: j === 0, media: null, d: dp, dMin: Math.min(dp, 1.6), dMax: 2.8, flex: true, mode: 'fond', son: false }));
      for (let j = 0; j < p.lignes.length - 1; j++) out[out.length - p.lignes.length + j].pageSuivante = p.lignes[j + 1];
      continue;
    }
    out.push({ ...base, media, page: p.type === 'pages' ? 0 : undefined, premierePage: true, tour: p.media === 'tour', d, dMin: Math.min(dMin, d), dMax: dMax || d + 3.5, flex: true, mode: 'fond', son: false });
  }
  // Tous les médias collés servent : une carte de texte sans média prend en fond un média encore inutilisé (sinon le moins vu).
  const vus = new Map(lus.map(m => [m, 0])); const plus = (m) => { if (m && vus.has(m)) vus.set(m, vus.get(m) + 1); };
  out.forEach(c => { plus(c.media); if (c.tour) lus.forEach(plus);
    if (c.type === 'pages' && Array.isArray(c.lignes) && c.src.source === 'matchs') c.lignes.forEach((pg, j) => plus(pg.photo ? lus[pg.photo - 1] : lus[(c.page || 0) + j])); });
  if (N) for (const c of out) {
    if (c.media || c.tour || c.type === 'fin' || c.type === 'pages' || c.mode !== 'fond') continue;
    let best = lus[0]; for (const m of lus) if (vus.get(m) < vus.get(best)) best = m;
    c.media = best; plus(best);
  }
  // Une affiche (visuel plein de texte) n'est jamais recouverte : on la montre seule, entière, 1,5 s ; en fond, elle est floutée.
  const vitrines = new Set(out.filter(c => c.media && c.media.affiche && c.mode !== 'fond').map(c => c.media));
  for (let k = 0; k < out.length && vitrines.size < 2; k++) {
    const c = out[k]; const aff = c.tour ? lus.find(m => m.affiche && !vitrines.has(m)) : (c.media && c.media.affiche && !vitrines.has(c.media) ? c.media : null);
    if (!aff || k === 0) continue;
    out.splice(k, 0, { type: 'media', src: { index: -1 }, textes: {}, etiquette: null, media: aff, d: 1.5, dMin: 1.5, dMax: 1.5, flex: false, mode: 'vitrine', son: false, sens: 0, cadre: 0 });
    vitrines.add(aff); k++;
  }
  const inutiles = lus.filter(m => !vus.get(m) && !out.some(c => c.media === m)).map(m => m.index + 1);
  if (inutiles.length) av.push((inutiles.length > 1 ? 'Les médias n° ' + inutiles.join(', ') + ' ne sont pas dans la vidéo' : 'Le média n° ' + inutiles[0] + ' n\'est pas dans la vidéo') + ' : cette présentation en montre moins.');
  return { plans: out, avertissements: av, reponses };
}

function debutsDe(plans) { const r = []; let t = 0; for (const c of plans) { r.push(t); t += c.d; } r.push(t); return r; }

// Calage de la voix : chaque phrase ancrée commence avec son plan ; les plans s'allongent si la voix a besoin de place.
function placerVoix(plans, phrases, pause) {
  const debuts = debutsDe(plans); const total = debuts[plans.length];
  const iFin = plans.findIndex(c => c.type === 'fin'); const tFin = iFin >= 0 ? debuts[iFin] : total;
  let prev = 0;
  for (const ph of phrases) {
    if (ph.silence) continue;
    const base = ph.plan != null ? debuts[ph.plan] + (ph.plan === 0 ? 0.15 : 0.2) : 0;
    ph.debut = Math.max(base, prev ? prev + pause : 0.15); ph.fin = ph.debut + ph.duree; prev = ph.fin;
  }
  // contrôles
  const viol = []; let groupe = 0;
  phrases.forEach((ph, j) => {
    if (ph.plan != null) groupe = ph.plan;
    if (ph.silence) return;
    const suiv = phrases.slice(j + 1).find(x => x.plan != null && x.plan > groupe);
    const limite = suiv ? debuts[suiv.plan] - 0.1 : tFin - 0.25;
    if (ph.fin > limite + 1e-3) viol.push({ de: groupe, a: suiv ? suiv.plan : (iFin >= 0 ? iFin : plans.length), manque: ph.fin - limite + 0.05 });
  });
  return { viol, total, debuts };
}
// Allonge les plans souples de [de, a) ; renvoie la durée ajoutée.
function etendre(plans, de, a, manque, forcer) {
  let reste = manque;
  for (let tour = 0; tour < 4 && reste > 1e-3; tour++) {
    const cand = plans.slice(de, a).filter(c => c.flex && c.d < c.dMax - 1e-3); if (!cand.length) break;
    const part = reste / cand.length;
    for (const c of cand) { const add = Math.min(part, c.dMax - c.d); c.d += add; reste -= add; }
  }
  if (reste > 1e-3 && forcer) {
    const cand = plans.slice(de, a).filter(c => c.flex); const c = cand[cand.length - 1];
    if (c) { c.d += reste; reste = 0; }
  }
  return manque - reste;
}
const deficit = (viol) => viol.reduce((s, v) => s + v.manque, 0);
function planifier(M, construits, phrases, pause) {
  const plans = construits.plans; const av = [];
  // ancres
  let dernier = -1;
  for (const ph of phrases) {
    ph.plan = null; if (!ph.ancre) continue;
    const ok = (c) => ancreDe(ph.ancre, { type: c.type, source: c.src.source, role: c.role }, c.src.index, c.page);
    let i = plans.findIndex((c, k) => k > dernier && ok(c));
    if (i < 0 && dernier < 0) i = plans.findIndex(ok);
    if (i >= 0) { ph.plan = i; dernier = i; }
  }
  // la voix d'abord : chaque groupe de phrases doit finir avant l'ancre suivante (sinon on allonge ses plans souples)
  const iFin0 = () => { const i = plans.findIndex(c => c.type === 'fin'); return i >= 0 ? i : plans.length; };
  for (let it = 0; it < 60; it++) {
    const { viol } = placerVoix(plans, phrases, pause); if (!viol.length) break;
    let ajoute = 0;
    for (const v of viol) { ajoute += etendre(plans, v.de, Math.max(v.a, v.de + 1), v.manque, false); if (ajoute > 1e-3) break; }
    if (ajoute <= 1e-3) for (const v of viol) { ajoute += etendre(plans, v.de, Math.max(v.a, v.de + 1), v.manque, true); if (ajoute > 1e-3) break; }
    if (ajoute <= 1e-3) { // dernier recours, pour le dernier groupe seulement : allonger le plan juste avant la fin
      const v = viol[viol.length - 1]; const c = plans[iFin0() - 1];
      if (c && v.a >= iFin0() && c.type !== 'accroche' && c.type !== 'fin') { c.d += v.manque; c.dMax = Math.max(c.dMax, c.d); ajoute = v.manque; }
    }
    if (ajoute <= 1e-3) break;   // reste un chevauchement accepté (ex. : la voix d'accroche déborde sur le plan suivant)
  }
  const sommeD = () => plans.reduce((a, c) => a + c.d, 0);
  // Pas de trou de voix : une carte de texte ne dure que le temps de sa phrase (+ 0,35 s), sans descendre sous son minimum.
  if (phrases.some(p => !p.silence)) {
    for (let k = 0; k < plans.length; k++) {
      const c = plans[k]; if (!c.flex || !aTexte(c) || c.type === 'accroche') continue;
      const { debuts } = placerVoix(plans, phrases, pause); const a = debuts[k], b = a + c.d;
      const fins = phrases.filter(ph => !ph.silence && ph.debut != null && ph.debut < b - 0.05 && ph.fin > a).map(ph => ph.fin);
      if (!fins.length) continue;
      const besoin = Math.max(...fins) - a + 0.35;
      if (besoin < c.d - 0.25) c.d = Math.max(c.dMin, besoin);
    }
  }
  // Trou de plus de 0,6 s entre deux phrases : les plans souples qui le portent se resserrent (sans passer sous leur minimum).
  const parle = phrases.some(p => !p.silence);
  if (parle) for (let it = 0; it < 40; it++) {
    const { debuts } = placerVoix(plans, phrases, pause); const P = phrases.filter(p => !p.silence && p.debut != null);
    let fait = false;
    for (let q = 1; q < P.length && !fait; q++) {
      const trou = P[q].debut - P[q - 1].fin; if (trou <= 0.6 || P[q].plan == null) continue;
      const k0 = Math.max(0, plans.findIndex((c, k) => debuts[k] + c.d > P[q - 1].fin)); const k1 = P[q].plan;
      const cand = plans.slice(k0, k1).filter(c => c.flex && c.type !== 'accroche' && c.d > c.dMin + 0.05); if (!cand.length) continue;
      const part = (trou - 0.45) / cand.length;
      for (const c of cand) c.d -= Math.min(part, c.d - c.dMin);
      fait = true;
    }
    if (!fait) break;
  }
  // durée du modèle : trop court → on allonge d'abord les plans d'images (le son de la salle porte), puis le reste ;
  // avec une voix, seulement ce qui vient après la dernière phrase (jamais de trou au milieu) ; trop long → on raccourcit
  if (sommeD() < M.duree.min) {
    const iFin = plans.findIndex(c => c.type === 'fin'); const z = iFin >= 0 ? iFin : plans.length;
    const { debuts } = placerVoix(plans, phrases, pause); const finVoix = Math.max(0, ...phrases.filter(p => !p.silence && p.fin != null).map(p => p.fin));
    const apres = (c) => !parle || debuts[plans.indexOf(c)] + c.d > finVoix - 0.3;
    const images = plans.slice(0, z).filter(c => c.flex && !aTexte(c) && c.media && apres(c));
    for (let tour = 0; tour < 4 && sommeD() < M.duree.min - 1e-3 && images.some(c => c.d < c.dMax - 1e-3); tour++) {
      const cand = images.filter(c => c.d < c.dMax - 1e-3); const part = (M.duree.min - sommeD()) / cand.length;
      for (const c of cand) c.d += Math.min(part, c.dMax - c.d);
    }
    if (!parle && sommeD() < M.duree.min - 1e-3 && !etendre(plans, 0, z, M.duree.min - sommeD(), false)) etendre(plans, 0, z, M.duree.min - sommeD(), true);
    if (parle && sommeD() < DUREE_MIN) etendre(plans, 0, z, DUREE_MIN - sommeD(), true);
  }
  if (sommeD() > M.duree.max) {
    const ref = deficit(placerVoix(plans, phrases, pause).viol);
    for (let it = 0; it < 400 && sommeD() > M.duree.max; it++) {
      const cand = plans.filter(c => c.flex && c.d - 0.1 >= c.dMin).sort((a, b) => (b.d - b.dMin) - (a.d - a.dMin));
      let fait = false;
      for (const c of cand) { c.d -= 0.1; if (deficit(placerVoix(plans, phrases, pause).viol) > ref + 1e-3) c.d += 0.1; else { fait = true; break; } }
      if (!fait) break;
    }
    if (sommeD() > M.duree.max + 0.05) av.push((phrases.some(p => !p.silence) ? 'La voix demande ' : 'La vidéo dure ') + sommeD().toFixed(1) + ' s : un peu plus que la durée prévue (' + M.duree.max + ' s).');
  }
  if (sommeD() > DUREE_MAX + 0.05) av.push('Vidéo de ' + sommeD().toFixed(1) + ' s : raccourcissez le texte de la voix pour rester sous 30 s.');
  const { debuts } = placerVoix(plans, phrases, pause);
  // une photo ne reste jamais plus de 4 s à l'écran : au-delà, plans plus serrés (cadres haut, bas, détail)
  const final = [];
  plans.forEach((c, k) => {
    c.debut = debuts[k]; c.fin = debuts[k] + c.d;
    if (c.media && c.media.genre === 'photo' && c.mode === 'normal' && c.d > 4) {
      const n = Math.ceil(c.d / 3.4);
      for (let j = 0; j < n; j++) final.push({ ...c, debut: c.debut + c.d * j / n, fin: c.debut + c.d * (j + 1) / n, d: c.d / n, cadre: j, morceau: j, sens: (c.sens + j) % 2 });
    } else final.push(c);
  });
  return { plans: final, total: debuts[plans.length], avertissements: av };
}

// Sous-titres : morceaux de 26 caractères au plus, calés sur le vrai temps de chaque phrase, mot par mot.
function decouper(texte, debut, fin) {
  // la ponctuation française (« ? », « ! », « : ») reste collée au mot d'avant par une espace insécable
  const mots = String(texte).replace(/\s+/g, ' ').trim().replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ').split(' ').filter(Boolean); const morceaux = []; let cur = [];
  // Groupes de mots : on coupe d'abord après une virgule ou un point (dès 10 caractères), 4 mots au plus,
  // jamais après un petit mot qui appelle la suite (« et », « de », « du », « la »…).
  const COLLE = /^(et|ou|de|du|des|la|le|les|l'.*|d'.*|à|au|aux|en|un|une|nos|notre|nous|leur|leurs|pour|par|avec|contre|sur|dans|ce|cette|ces|son|sa|ses|qui|que|à|c'est|on|il|elle|y)$/i;
  for (const w of mots) {
    const essai = cur.concat(w).join(' ');
    if ((essai.length > 26 || cur.length >= 4) && cur.length) {
      // le dernier mot du morceau appelle la suite : il passe au morceau suivant
      let reporte = [];
      while (cur.length > 1 && COLLE.test(cur[cur.length - 1])) reporte.unshift(cur.pop());
      morceaux.push(cur); cur = reporte.concat(w);
    } else cur.push(w);
    if (cur.length && /[,.;:!?…]$/.test(w) && cur.join(' ').length >= 10) { morceaux.push(cur); cur = []; }
  }
  if (cur.length) morceaux.push(cur);
  // pas de mot seul en fin de phrase : il rejoint le morceau d'avant s'il reste lisible (32 caractères au plus)
  if (morceaux.length > 1 && morceaux[morceaux.length - 1].length === 1 && morceaux[morceaux.length - 2].concat(morceaux[morceaux.length - 1]).join(' ').length <= 32) morceaux[morceaux.length - 2].push(morceaux.pop()[0]);
  const n = morceaux.reduce((a, m) => a + m.join(' ').length + 2, 0); let t = debut; const out = [];
  for (const m of morceaux) {
    const d = (fin - debut) * (m.join(' ').length + 2) / n; const tot = m.reduce((a, w) => a + w.length + 1, 0); let tw = t; const temps = [];
    for (const w of m) { temps.push(tw); tw += d * (w.length + 1) / tot; }
    out.push({ mots: m, temps, debut: t, fin: t + d }); t += d;
  }
  return out;
}

// ---------- dessin ----------
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const easeIn = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * x; };
const easeBack = (x) => { x = Math.min(1, Math.max(0, x)); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function police(fonte, taille, poids) { return fonte === 'titre' ? 'italic 700 ' + taille + 'px BCRTitre, "Barlow Condensed", "Arial Narrow", sans-serif' : 'normal ' + (poids || 700) + ' ' + taille + 'px BCRTexte, "Source Sans 3", system-ui, sans-serif'; }
const memo = new Map();
// Coupe un texte en lignes et choisit la plus grande taille qui tient (largeur, nombre de lignes).
function caser(g, texte, { fonte = 'titre', poids, max, min, largeur, lignes = 3, capitales = fonte === 'titre' }) {
  // typographie française : « ? », « ! », « : », « ; » et « » » restent collés au mot d'avant (espace fine insécable)
  let t = (capitales ? String(texte || '').toUpperCase() : String(texte || '')).replace(/[ \t]+([?!:;»])/g, ' $1').replace(/«[ \t]+/g, '« ');
  const cle = [t, fonte, poids, max, min, largeur, lignes].join('|'); if (memo.has(cle)) return memo.get(cle);
  let taille = max, res = null;
  const mots = t.split(/[ \t\n]+/).filter(Boolean);
  // une ligne d'un seul petit mot (« CE » seul) est refusée : on recoupe autrement, ou on baisse la taille
  // … ni une ligne qui finit sur un petit mot qui appelle la suite (« 10 MATCHS À / LA MAISON »)
  const orphelin = (L) => L.length > 1 && (L.some(l => !/ /.test(l) && l.replace(/ .*/, '').length < 4) || L.slice(0, -1).some(l => / (à|a|de|du|des|la|le|les|et|en|un|une|au|aux|nos|pour|contre|sur)$/i.test(l)));
  const avant = (w) => { const L = []; let cur = ''; for (const x of w) { const e = cur ? cur + ' ' + x : x; if (g.measureText(e).width > largeur && cur) { L.push(cur); cur = x; } else cur = e; } if (cur) L.push(cur); return L; };
  const arriere = (w) => { const L = []; let cur = ''; for (let i = w.length - 1; i >= 0; i--) { const e = cur ? w[i] + ' ' + cur : w[i]; if (g.measureText(e).width > largeur && cur) { L.unshift(cur); cur = w[i]; } else cur = e; } if (cur) L.unshift(cur); return L; };
  while (taille >= min) {
    g.font = police(fonte, taille, poids);
    let L = avant(mots); const tient = (X) => X.length <= lignes && X.every(l => g.measureText(l).width <= largeur);
    if (orphelin(L)) { const R2 = arriere(mots); if (tient(R2) && !orphelin(R2)) L = R2; }
    const ok = tient(L) && (!orphelin(L) || taille * 0.92 < min);
    res = { taille, lignes: L, largeurs: L.map(l => g.measureText(l).width) };
    if (ok) break; taille = Math.floor(taille * 0.92);
  }
  if (memo.size > 600) memo.clear(); memo.set(cle, res); return res;
}
function ecrire(g, t, x, y, taille, { fonte = 'titre', poids, couleur = C.blanc, align = 'left', ombre = true, contour = 0, base = 'alphabetic' } = {}) {
  g.save(); g.font = police(fonte, taille, poids); g.textAlign = align; g.textBaseline = base; g.fillStyle = couleur;
  if (contour) { g.lineJoin = 'round'; g.strokeStyle = 'rgba(8,10,9,.92)'; g.lineWidth = contour; g.strokeText(t, x, y); }
  if (ombre) { g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = taille * 0.14; g.shadowOffsetY = taille * 0.04; }
  g.fillText(t, x, y); g.restore();
}
function paral(g, x, y, w, h, couleur, pente) { const p = h * pente; g.fillStyle = couleur; g.beginPath(); g.moveTo(x + p, y); g.lineTo(x + w + p, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); g.fill(); }

class Dessinateur {
  constructor(g, W, H, S, res, M) { this.g = g; this.W = W; this.H = H; this.u = W / 1080; this.S = S; this.logo = res.logo; this.M = M; this.x0 = 70 * this.u; this.larg = W - 2 * this.x0 - 110 * this.u; }
  // étiquette inclinée (surtitre, étiquette de plan) qui entre selon l'habillage
  etiquette(texte, y, k, { taille = 60, fond, couleur, centre = false } = {}) {
    if (!texte) return 0; const { g, u, S } = this; const e = ease(k); if (e <= 0) return 0;
    const c = caser(g, texte, { fonte: 'titre', max: taille * u, min: 30 * u, largeur: this.larg - 60 * u, lignes: 1 });
    const h = c.taille * 1.32, w = c.largeurs[0] + 56 * u, x = centre ? (this.W - w) / 2 : this.x0 - 20 * u;
    g.save();
    if (S.entree === 'droite') g.translate((1 - e) * (this.W - x), 0); else if (S.entree === 'haut') { g.globalAlpha = e; g.translate(0, -(1 - e) * 40 * u); } else if (S.entree === 'zoom') { g.globalAlpha = e; } else g.translate(-(1 - e) * (w + x + 40 * u), 0);
    paral(g, x, y, w, h, fond || S.surFond, S.pente);
    if (S.rubans) { g.fillStyle = S.accent; g.fillRect(x, y + h - 6 * u, w, 6 * u); }
    ecrire(g, c.lignes[0], x + 28 * u + (S.pente ? h * S.pente * 0.5 : 0), y + h * 0.76, c.taille, { couleur: couleur || S.surTexte, ombre: false });
    g.restore(); return h;
  }
  // gros titre sur 1 à 3 lignes. pose = titre d'accroche : entier dès la 1re image (elle sert souvent de couverture),
  // seulement un léger rebond d'échelle 1,04 → 1 en 0,2 s, sans transparence ni glissement.
  titre(texte, y, k, { max = 170, min = 80, lignes = 3, couleur = C.blanc, pose = false, align = 'left', ruban = false, t = 0 } = {}) {
    if (!texte) return 0; const { g, u, S } = this; const e = pose ? 1 : ease(k); if (e <= 0) return 0;
    const larg = align === 'center' ? ZONE.largeur * u - 40 * u : this.larg;
    const c = caser(g, texte, { fonte: 'titre', max: max * u, min: min * u, largeur: larg, lignes });
    const lh = c.taille * 0.98; let yy = y + c.taille * 0.82;
    const x = align === 'center' ? this.W / 2 : this.x0;
    g.save();
    if (pose) { const s = 1 + 0.04 * (1 - ease(t / 0.2)); const cx = align === 'center' ? x : x + Math.max(...c.largeurs) / 2; g.translate(cx, y); g.scale(s, s); g.translate(-cx, -y); }
    else if (S.entree === 'zoom') { const s = 0.7 + 0.3 * easeBack(k); g.globalAlpha = e; g.translate(this.x0, y); g.scale(s, s); g.translate(-this.x0, -y); }
    else if (S.entree === 'droite') { g.globalAlpha = e; g.translate((1 - e) * 220 * u, 0); }
    else if (S.entree === 'haut') { g.globalAlpha = e; g.translate(0, (1 - e) * 60 * u); }
    else { g.globalAlpha = e; g.translate(-(1 - e) * 180 * u, 0); }
    if (ruban) { // rubans : chaque ligne sur un ruban pleine largeur, légèrement incliné
      c.lignes.forEach((l, i) => { const yb = y + i * lh - 4 * u; g.save(); g.translate(0, yb + lh / 2); g.rotate(-0.025); g.translate(0, -(yb + lh / 2)); g.fillStyle = 'rgba(8,10,9,.9)'; g.fillRect(-20 * u, yb, this.W + 40 * u, lh + 10 * u); g.fillStyle = S.vif; g.fillRect(-20 * u, yb + lh + 2 * u, this.W + 40 * u, 8 * u); g.restore(); });
    } else if (S.blocTitre) { const w = Math.max(...c.largeurs) + 60 * u; const bx = align === 'center' ? x - w / 2 : this.x0 - 30 * u; g.fillStyle = 'rgba(31,122,63,.94)'; g.fillRect(bx, y - 10 * u, w, lh * c.lignes.length + 34 * u); }
    c.lignes.forEach((l, i) => { const chiffre = /^\d/.test(l) && S.accent; ecrire(this.g, l, x, yy + i * lh, c.taille, { couleur: chiffre && !S.blocTitre ? S.accent : couleur, align }); });
    g.restore(); return lh * c.lignes.length + 20 * u;
  }
  ligneTexte(texte, y, k, { taille = 56, couleur = C.blanc, poids = 700 } = {}) {
    if (!texte) return 0; const { g, u } = this; const e = ease(k); if (e <= 0) return 0;
    const c = caser(g, texte, { fonte: 'texte', poids, max: taille * u, min: 34 * u, largeur: this.larg, lignes: 2, capitales: false });
    g.save(); g.globalAlpha = e; g.translate(-(1 - e) * 60 * u, 0);
    c.lignes.forEach((l, i) => ecrire(g, l, this.x0, y + c.taille * (0.9 + i * 1.15), c.taille, { fonte: 'texte', poids, couleur }));
    g.restore(); return c.taille * (0.4 + 1.15 * c.lignes.length);
  }
  // nom de la série : le repère de chaque rendez-vous, lisible sur un téléphone (38 px sur 1080, 64 px de haut)
  badge(texte, y) {
    if (!texte) return; const { g, u, S } = this;
    g.save(); g.font = police('texte', 38 * u, 800); const t = texte.toUpperCase(); const w = Math.min(g.measureText(t).width, 740 * u) + 48 * u;
    const a = g.globalAlpha; g.fillStyle = S.badgeFond; g.globalAlpha = a * 0.94; g.beginPath(); g.roundRect(60 * u, y, w, 64 * u, 32 * u); g.fill(); g.globalAlpha = a;
    g.fillStyle = S.badgeTexte; g.textBaseline = 'middle'; g.fillText(t, 84 * u, y + 34 * u, 740 * u); g.restore();
  }
  bandeauHaut(texte, y) {
    const { g, u } = this; g.save(); g.font = police('texte', 30 * u, 800); const t = texte.toUpperCase(); const w = g.measureText(t).width + 56 * u;
    g.fillStyle = 'rgba(8,10,9,.78)'; g.fillRect(60 * u, y, w, 52 * u); g.fillStyle = this.S.vif; g.fillRect(60 * u, y, 10 * u, 52 * u);
    g.fillStyle = C.blanc; g.textBaseline = 'middle'; g.fillText(t, 88 * u, y + 27 * u); g.restore();
  }
  voile(force = 0) {
    const { g, W, H } = this; const d = g.createLinearGradient(0, 0, 0, H);
    d.addColorStop(0, 'rgba(8,10,9,' + (0.55 + force * 0.2) + ')'); d.addColorStop(0.32, 'rgba(8,10,9,' + (0.12 + force * 0.4) + ')'); d.addColorStop(0.62, 'rgba(8,10,9,' + (0.12 + force * 0.4) + ')'); d.addColorStop(1, 'rgba(8,10,9,' + (0.62 + force * 0.2) + ')');
    g.fillStyle = d; g.fillRect(0, 0, W, H);
    if (this.S.liseré) { const u = this.u; g.strokeStyle = this.S.vif; g.lineWidth = 8 * u; g.strokeRect(26 * u, 26 * u, W - 52 * u, H - 52 * u); }
  }
  fondCouleurs(t, variante = 0) {
    const { g, W, H, u, S } = this;
    const d = g.createLinearGradient(0, 0, W * 0.4, H);
    if (S.fond === 'aplat') { d.addColorStop(0, '#103d22'); d.addColorStop(1, '#06130b'); } else { d.addColorStop(0, '#0c1f14'); d.addColorStop(1, C.noir); }
    g.fillStyle = d; g.fillRect(0, 0, W, H);
    g.save();
    if (S.fond === 'cercles' || S.fond === 'aplat') { // coutures d'un ballon, qui tournent lentement
      g.translate(W * 0.78, H * 0.36); g.rotate(t * 0.05 + variante); g.strokeStyle = 'rgba(70,196,111,.16)'; g.lineWidth = 14 * u; const r = 760 * u;
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
      g.beginPath(); g.ellipse(0, 0, r * 0.55, r, 0, 0, Math.PI * 2); g.stroke();
    } else if (S.fond === 'rubans') {
      for (let i = 0; i < 6; i++) { const y = ((i * 340 + t * 60) % (H / u + 340)) * u - 340 * u; g.fillStyle = i % 2 ? 'rgba(70,196,111,.10)' : 'rgba(31,122,63,.22)'; g.fillRect(0, y, W, 120 * u); }
    } else { // diagonales
      const dec = (t * 50 * u) % (420 * u);
      for (let i = -3; i < 8; i++) { const x = i * 420 * u + dec; g.fillStyle = i % 2 ? 'rgba(70,196,111,.10)' : 'rgba(31,122,63,.26)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 150 * u, 0); g.lineTo(x + 150 * u - H * 0.4, H); g.lineTo(x - H * 0.4, H); g.closePath(); g.fill(); }
    }
    g.restore();
  }
  transition(k) {
    if (k >= 1 || k < 0) return; const { g, W, H, u, S } = this;
    g.save();
    if (S.transition === 'volet') { const y = H * (1 - 2.2 * k); g.fillStyle = S.vif; g.fillRect(0, y, W, H * 0.3); g.fillStyle = C.vert; g.fillRect(0, y + H * 0.3, W, 30 * u); }
    else if (S.transition === 'eclair') { // éclair vert, jamais blanc : 35 % au plus, sur 4 images (0,13 s)
      const kk = clamp01(k * 0.22 / 0.13); if (kk < 1) { g.globalAlpha = 0.35 * (1 - kk); g.fillStyle = S.vif; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      g.fillStyle = S.vif; g.globalAlpha = 0.6 * (1 - k); g.fillRect(0, H * (0.3 + 0.4 * k), W, 24 * u); g.globalAlpha = 1; }
    else if (S.transition === 'ruban') { for (let i = 0; i < 3; i++) { const x = W - (2.6 * k - i * 0.25) * W; g.fillStyle = i === 1 ? S.vif : C.noir; g.fillRect(x, H * (0.2 + i * 0.22), W * 1.1, H * 0.2); } }
    else { const x = -W * 0.6 + k * W * 2.2; g.fillStyle = S.vif; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 260 * u, 0); g.lineTo(x + 260 * u - H * 0.35, H); g.lineTo(x - H * 0.35, H); g.closePath(); g.fill();
      g.fillStyle = C.vert; g.beginPath(); g.moveTo(x + 300 * u, 0); g.lineTo(x + 360 * u, 0); g.lineTo(x + 360 * u - H * 0.35, H); g.lineTo(x + 300 * u - H * 0.35, H); g.closePath(); g.fill(); }
    g.restore();
  }
  sousTitre(st, t) {
    const s = st.find(x => t >= x.debut && t < x.fin + 0.04); if (!s) return;
    const { g, W, H, u, S } = this; const k = easeBack((t - s.debut) / 0.14); const taille = 64 * u;
    g.save(); g.font = police('texte', taille, 800); g.textBaseline = 'middle';
    const esp = g.measureText(' ').width; const larg = s.mots.map(m => g.measureText(m).width); const L = larg.reduce((a, b) => a + b, 0) + esp * (s.mots.length - 1);
    // boîte de 800 px au plus (x 140 à 940) : jamais sous la colonne de boutons de l'application
    const ech = Math.min(1, (ZONE.largeur * u - 2 * 26 * u) / L); const cx = (ZONE.gauche + ZONE.largeur / 2) * u, cy = H * (S.stY || 0.635);
    g.translate(cx, cy); g.scale(k * ech, k * ech);
    const pad = 26 * u, hh = taille * 1.38;
    if (S.st === 'boite' || S.st === 'vert') { g.fillStyle = S.st === 'vert' ? 'rgba(31,122,63,.95)' : 'rgba(8,10,9,.76)'; g.beginPath(); g.roundRect(-L / 2 - pad, -hh / 2, L + 2 * pad, hh, 18 * u); g.fill(); }
    let x = -L / 2; const actif = s.temps.reduce((a, tw, i) => t >= tw ? i : a, 0);
    for (let i = 0; i < s.mots.length; i++) {
      const w = s.mots[i]; const chiffre = /\d/.test(w);
      if (S.st === 'surligne' && i === actif) { g.fillStyle = S.vif; g.beginPath(); g.roundRect(x - 10 * u, -hh / 2 + 6 * u, larg[i] + 20 * u, hh - 12 * u, 10 * u); g.fill(); }
      let coul = C.blanc;
      if (S.st === 'surligne') coul = i === actif ? C.noir : C.blanc;
      else if (S.st === 'vert') coul = i === actif ? C.blanc : (chiffre ? '#c9ffd9' : 'rgba(255,255,255,.82)');
      else coul = i === actif ? S.vif : (chiffre ? S.vif : C.blanc);
      if (S.st === 'contour' || S.st === 'surligne') { g.lineJoin = 'round'; g.strokeStyle = 'rgba(8,10,9,.95)'; g.lineWidth = 12 * u; if (!(S.st === 'surligne' && i === actif)) g.strokeText(w, x, 2 * u); }
      g.fillStyle = coul; g.fillText(w, x, 2 * u); x += larg[i] + esp;
    }
    g.restore();
  }
  // Carte de fin (1,2 s) : fond à nos couleurs, logo, puis tous les textes sur un pavé noir dans la zone sûre
  // (x 140 à 940) : aucun texte vif sur le vert, rien sous la colonne de boutons de l'application.
  fin(tx, t, voixSynthese) {
    const { g, W, H, u, S } = this;
    g.fillStyle = C.noir; g.fillRect(0, 0, W, H);
    const k0 = ease(t / 0.2);
    g.save();
    if (S.fin === 'colonne') { g.fillStyle = C.vert; g.fillRect(0, 0, W * 0.2 * k0, H); g.fillStyle = S.vif; g.fillRect(W * 0.2 * k0, 0, 14 * u, H); }
    else if (S.fin === 'plein') { g.fillStyle = C.vert; g.globalAlpha = k0; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    else if (S.fin === 'rubans') { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? S.vif : C.vert; g.fillRect(W - W * 1.1 * ease((t - i * 0.04) / 0.25), (180 + i * 62) * u, W * 1.1, 30 * u); } }
    else paral(g, -40 * u - W * 0.62 * (1 - k0), 0, W * 0.62, H, C.vert, 0);
    g.restore();
    const kl = easeBack((t - 0.05) / 0.3), tl = 300 * u * kl, cy = 560 * u;
    if (kl > 0 && this.logo) {
      const m = tl * 0.09; g.save(); g.fillStyle = C.noir; g.strokeStyle = S.vif; g.lineWidth = 8 * u * kl;
      g.beginPath(); g.roundRect(W / 2 - tl / 2 - m, cy - tl / 2 - m, tl + 2 * m, tl + 2 * m, 28 * u * kl); g.fill(); g.stroke(); g.restore();
      g.drawImage(this.logo, W / 2 - tl / 2, cy - tl / 2, tl, tl);
    }
    const k2 = ease((t - 0.2) / 0.25);
    if (k2 > 0) {
      g.save(); g.globalAlpha = k2;
      const x0 = ZONE.gauche * u, lw = ZONE.largeur * u, pad = 40 * u;
      g.fillStyle = 'rgba(8,10,9,.94)'; g.beginPath(); g.roundRect(x0 - 20 * u, 790 * u, lw + 40 * u, 560 * u, 20 * u); g.fill();
      const c = caser(g, 'Basket Club de Rouxmesnil', { fonte: 'titre', max: 110 * u, min: 60 * u, largeur: lw - 2 * pad, lignes: 2 });
      c.lignes.forEach((l, i) => ecrire(g, l, W / 2, (900 + i * 100) * u, c.taille, { align: 'center' }));
      let y = (900 + c.lignes.length * 100 - 10) * u;
      const f = (tx.fin || []).filter(Boolean);
      if (f[0]) { const c1 = caser(g, f[0], { fonte: 'texte', poids: 700, max: 58 * u, min: 36 * u, largeur: lw - 2 * pad, lignes: 2, capitales: false }); c1.lignes.forEach((l, i) => ecrire(g, l, W / 2, y + i * 64 * u, c1.taille, { align: 'center', fonte: 'texte', poids: 700, couleur: S.vif })); y += c1.lignes.length * 64 * u + 4 * u; }
      if (f[1]) { const c2 = caser(g, f[1], { fonte: 'texte', poids: 600, max: 44 * u, min: 30 * u, largeur: lw - 2 * pad, lignes: 2, capitales: false }); c2.lignes.forEach((l, i) => ecrire(g, l, W / 2, y + i * 52 * u, c2.taille, { align: 'center', fonte: 'texte', poids: 600 })); y += c2.lignes.length * 52 * u; }
      if (voixSynthese) ecrire(g, 'Voix de synthèse', W / 2, Math.min(1330 * u, Math.max(y + 20 * u, 1290 * u)), 30 * u, { align: 'center', fonte: 'texte', poids: 600, couleur: 'rgba(255,255,255,.78)', ombre: false });
      g.restore();
    }
  }
}

// Fond d'un plan : photo (zoom lent, recadrage 9:16 centré, sans déformer), vidéo, image figée, fond flouté ou fond à nos couleurs.
function dessinerPhoto(g, W, H, img, k, c, cache) {
  // photo plus large que haute : montrée ENTIÈRE sur un fond flouté d'elle-même (personne ne disparaît d'une photo d'équipe)
  if (img.width > img.height * 1.1) {
    const m = cache || c; if (!m.flouLarge) m.flouLarge = petitFlou(img, W, H, 14);
    const zf = 1.08 + 0.04 * k; g.drawImage(m.flouLarge, -W * (zf - 1) / 2, -H * (zf - 1) / 2, W * zf, H * zf); g.fillStyle = 'rgba(8,10,9,.38)'; g.fillRect(0, 0, W, H);
    const s = (W / img.width) * (1 + 0.06 * ease(k)); const w = img.width * s, h = img.height * s;
    g.drawImage(img, (W - w) / 2 + (c.sens ? -1 : 1) * 20 * k, (H - h) / 2, w, h); return;
  }
  const sc = Math.max(W / img.width, H / img.height);
  const z = (1.02 + 0.12 * ease(k * 0.9 + 0.05)) * (c.cadre ? 1.16 : 1);
  const fw = W / (sc * z), fh = H / (sc * z);
  const hauteur = [0.5, 0.25, 0.75][c.cadre % 3];
  const px = c.sens ? 0.35 + 0.3 * k : 0.65 - 0.3 * k;
  const dx = (img.width - fw) * (c.cadre ? [0.5, 0.3, 0.7][c.cadre % 3] : px), dy = (img.height - fh) * hauteur;
  g.drawImage(img, Math.max(0, dx), Math.max(0, dy), fw, fh, 0, 0, W, H);
}
function petitFlou(src, W, H, f = 18) { // flou bon marché : réduction puis agrandissement (marche partout, même sans « filter »)
  const w = Math.max(8, Math.round(W / f)), h = Math.max(14, Math.round(H / f)); const cv = OffscreenCanvasOuCanvas(w, h); const g = cv.getContext('2d');
  const sw = src.width, sh = src.height; const s = Math.max(w / sw, h / sh); g.drawImage(src, (w - sw * s) / 2, (h - sh * s) / 2, sw * s, sh * s);
  const cv2 = OffscreenCanvasOuCanvas(w * 3, h * 3); const g2 = cv2.getContext('2d'); g2.imageSmoothingQuality = 'high'; g2.drawImage(cv, 0, 0, w * 3, h * 3); return cv2;
}
// flou d'une image de vidéo, image par image (deux dessins seulement : réduction puis agrandissement)
function flouDirect(g, src, W, H, c, z) {
  if (!c.petit) c.petit = OffscreenCanvasOuCanvas(Math.round(W / 12), Math.round(H / 12));
  const p = c.petit.getContext('2d'); p.drawImage(src, 0, 0, c.petit.width, c.petit.height);
  g.save(); g.imageSmoothingQuality = 'high'; g.drawImage(c.petit, -W * (z - 1) / 2, -H * (z - 1) / 2, W * z, H * z); g.restore();
}
function chercher(v, t) { return new Promise((ok) => { if (Math.abs(v.currentTime - t) < 0.001 && v.readyState >= 2) return ok(); const fini = () => { v.removeEventListener('seeked', fini); ok(); }; v.addEventListener('seeked', fini); v.currentTime = t; setTimeout(fini, 3000); }); }
function dessinerVideoEl(g, W, H, v) { const s = Math.max(W / v.videoWidth, H / v.videoHeight); const w = v.videoWidth * s, h = v.videoHeight * s; g.drawImage(v, (W - w) / 2, (H - h) / 2, w, h); }

async function imageFixe(m, t, W, H) { // une image d'une vidéo (copie : le lecteur réutilise ses canvas)
  if (m.genre === 'photo') return m.image;
  m.stills = m.stills || new Map(); const cle = t.toFixed(2); if (m.stills.has(cle)) return m.stills.get(cle);
  const cv = OffscreenCanvasOuCanvas(W, H); const g = cv.getContext('2d');
  if (m.video) { if (!m.sinkFixe) m.sinkFixe = new MB.CanvasSink(m.video, { width: W, height: H, fit: 'cover' }); const w = await m.sinkFixe.getCanvas(m.t0 + Math.max(0, Math.min(m.duree - 0.05, t))); if (w) g.drawImage(w.canvas, 0, 0, W, H); }
  else if (m.el) { await chercher(m.el, Math.max(0, Math.min(m.duree - 0.05, t))); dessinerVideoEl(g, W, H, m.el); }
  if (m.stills.size > 6) m.stills.delete(m.stills.keys().next().value);
  m.stills.set(cle, cv); return cv;
}

// ---------- son : voix + son des vidéos du club baissé sous la voix (aucune musique ajoutée) ----------
// Le son de la salle ne s'arrête pas sur les passages sans son propre (accéléré, ralenti, cartes de texte, fin) :
// on y prolonge, plus bas, le son d'une vidéo du club (vitesse normale, donc sans changer le ton).
// Puis toute la vidéo est ramenée au même niveau (≈ −19 dB), sans dépasser la crête.
const NIVEAU_CIBLE_DB = -19;
async function mixerSon(plan, phrasesPlacees, voix, total, couperSon) {
  const FR = 48000; const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(total * FR)), FR);
  const maitre = ctx.createDynamicsCompressor(); maitre.threshold.value = -10; maitre.ratio.value = 4; maitre.attack.value = 0.005; maitre.release.value = 0.2; maitre.connect(ctx.destination);
  const ambiance = ctx.createGain(); ambiance.connect(maitre);
  const BAS = 0.22, HAUT = 0.85, FOND = 0.4; ambiance.gain.setValueAtTime(HAUT, 0);
  if (voix) for (const ph of phrasesPlacees) { if (ph.silence || ph.debut == null) continue; ambiance.gain.setTargetAtTime(BAS, Math.max(0, ph.debut - 0.2), 0.06); ambiance.gain.setTargetAtTime(HAUT, ph.fin + 0.15, 0.15); }
  let pistes = 0;
  const sonore = (m) => m && m.genre === 'video' && (m.audio || (m.audioSecours && m.fichier.size < 150e6));
  const decode = new Map();
  async function jouer(m, s0, debut, duree, niveau, bus) {
    if (duree <= 0.05) return;
    const g = ctx.createGain(); g.connect(bus);
    g.gain.setValueAtTime(0, debut); g.gain.linearRampToValueAtTime(niveau, debut + 0.05); g.gain.setValueAtTime(niveau, Math.max(debut + 0.06, debut + duree - 0.08)); g.gain.linearRampToValueAtTime(0, debut + duree);
    // si le passage demandé dépasse la vidéo, on repart du début de la vidéo (son d'ambiance, pas d'image à suivre)
    let t = debut, reste = duree, a = Math.max(0, Math.min(s0, m.duree - 0.1));
    for (let tour = 0; tour < 8 && reste > 0.02; tour++) {
      const morceau = Math.min(reste, m.duree - a); if (morceau <= 0.02) { a = 0; continue; }
      try {
        if (m.audio) {
          const sink = new MB.AudioBufferSink(m.audio);
          for await (const w of sink.buffers(m.t0 + a, m.t0 + a + morceau)) {
            const src = ctx.createBufferSource(); src.buffer = w.buffer; src.connect(g);
            const quand = t + (w.timestamp - m.t0 - a); if (quand >= 0) src.start(quand); else src.start(0, -quand); src.stop(t + morceau); pistes++;
          }
        } else {
          if (!decode.has(m)) decode.set(m, await ctx.decodeAudioData(await m.fichier.arrayBuffer()));
          const src = ctx.createBufferSource(); src.buffer = decode.get(m); src.connect(g); src.start(t, a, morceau); pistes++;
        }
      } catch (e) { return; /* vidéo sans son lisible : on continue */ }
      t += morceau; reste -= morceau; a = 0;
    }
  }
  if (!couperSon) {
    const couvert = [];
    // 1. le son propre des plans vidéo (passage montré, ou fond de carte qui défile)
    for (const p of plan.plans) {
      const m = p.media; if (!sonore(m) || p.son === false && p.mode !== 'fond' || !(p.mode === 'normal' || p.mode === 'fond') || p.s0 == null) continue;
      const joue = Math.min(p.d, p.dispo);
      await jouer(m, p.s0, p.debut, joue, p.mode === 'fond' ? FOND * 1.4 : 1, p.sonPlein ? maitre : ambiance); couvert.push([p.debut, p.debut + joue]);
    }
    // 2. les trous : on prolonge le son d'une vidéo du club, plus bas
    const videos = plan.plans.filter(p => sonore(p.media));
    if (videos.length) for (const p of plan.plans) {
      const a = p.debut, b = p.fin; const deja = couvert.reduce((x, [u, v]) => x + Math.max(0, Math.min(v, b) - Math.max(u, a)), 0);
      if (deja > (b - a) - 0.15) continue;
      let m = sonore(p.media) ? p.media : null, s0 = 0;
      if (m) s0 = p.mode === 'accelere' ? p.de : p.mode === 'ralenti' ? p.a0 : p.mode === 'fige' ? Math.max(0, p.instant - 1) : (p.s0 || 0);
      else { const prec = [...videos].reverse().find(x => x.fin <= a + 0.01) || videos[0]; m = prec.media; s0 = (prec.s0 != null ? prec.s0 : prec.mode === 'accelere' ? prec.de : prec.a0 || 0) + Math.max(0, a - prec.debut); }
      // le passage déjà couvert dans ce plan n'est pas doublé
      const libres = [[a, b]]; for (const [u, v] of couvert) for (let i = libres.length - 1; i >= 0; i--) { const [x, y] = libres[i]; if (v <= x || u >= y) continue; libres.splice(i, 1, ...[[x, u], [v, y]].filter(([q, r]) => r - q > 0.1)); }
      for (const [x, y] of libres) { await jouer(m, s0 + (x - a), x, y - x, p.type === 'fin' ? FOND * 0.8 : FOND, ambiance); couvert.push([x, y]); }
    }
  }
  if (voix) for (const ph of phrasesPlacees) {
    if (ph.silence || !ph.morceau || ph.debut == null) continue;
    const b = ctx.createBuffer(1, ph.morceau.echantillons.length, voix.frequence); b.copyToChannel(ph.morceau.echantillons, 0);
    const src = ctx.createBufferSource(); src.buffer = b; src.connect(maitre); src.start(ph.debut);
  }
  const rendu = await ctx.startRendering();
  // même niveau d'une vidéo à l'autre
  const canaux = [rendu.getChannelData(0), rendu.getChannelData(1)];
  let s = 0, crete = 0; const d0 = canaux[0]; for (let i = 0; i < d0.length; i += 2) { s += d0[i] * d0[i]; const x = Math.abs(d0[i]); if (x > crete) crete = x; }
  for (let i = 0; i < canaux[1].length; i += 2) { const x = Math.abs(canaux[1][i]); if (x > crete) crete = x; }
  const rms = Math.sqrt(s / Math.max(1, d0.length / 2)); const avant = 20 * Math.log10(rms + 1e-9);
  let gain = 1;
  if (rms > 1e-5) { gain = Math.pow(10, (NIVEAU_CIBLE_DB - avant) / 20); gain = Math.min(gain, 4, 0.97 / Math.max(crete, 1e-6)); for (const c of canaux) for (let i = 0; i < c.length; i++) c[i] *= gain; }
  return { rendu, pistes, rms_dB: +(avant + 20 * Math.log10(gain)).toFixed(1), rms_avant_dB: +avant.toFixed(1) };
}

// ---------- montage ----------
async function capacites() {
  const r = { webcodecs: typeof VideoEncoder !== 'undefined' };
  if (typeof VideoEncoder === 'undefined') return { ...r, ok: false, message: MSG.ENCODAGE_IMPOSSIBLE };
  try { r.avc1080 = await MB.canEncodeVideo('avc', { width: 1080, height: 1920 }); } catch (e) { r.avc1080 = false; }
  try { r.avc720 = await MB.canEncodeVideo('avc', { width: 720, height: 1280 }); } catch (e) { r.avc720 = false; }
  try { r.aacNatif = typeof AudioEncoder !== 'undefined' && await MB.canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: 48000 }); } catch (e) { r.aacNatif = false; }
  r.aacLogiciel = estWebkit() || !r.aacNatif;
  r.ok = !!(r.avc1080 || r.avc720); if (!r.ok) r.message = MSG.ENCODAGE_IMPOSSIBLE;
  return r;
}

async function monterUneFois(o, W, H) {
  const T0 = performance.now(); const mes = {}; const avert = [];
  const ips = o.ips || 30;
  const prog = (f, etape) => { const p = Math.max(0, Math.min(1, f)); try { o.onProgres && o.onProgres(p, etape === 'fini' ? 'Vidéo prête' : 'Montage : ' + Math.round(p * 100) + ' %', etape); } catch (e) { } };
  const stop = () => { if (o.signal && o.signal.aborted) throw new ErreurStudio('ANNULE', MSG.ANNULE); };
  const M = o.montage || preparer(o.modele, o.valeurs || {});
  avert.push(...M.avertissements);
  let S = HABILLAGES[o.habillage] || HABILLAGES[M.habillage] || HABILLAGES.oblique; if (M.theme && THEMES[M.theme]) S = { ...S, ...THEMES[M.theme] }; const nomHab = HABILLAGES[o.habillage] ? o.habillage : M.habillage;
  if (!(await MB.canEncodeVideo('avc', { width: W, height: H }))) throw new ErreurStudio('ENCODAGE_IMPOSSIBLE', MSG.ENCODAGE_IMPOSSIBLE);
  let aac = 'natif';
  // iPhone / Safari : l'AAC natif a donné des pistes muettes dans un mp4 (bogue WebKit 302253) → encodeur logiciel.
  if (o.forcerAacLogiciel || estWebkit() || typeof AudioEncoder === 'undefined' || !(await MB.canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: 48000 }))) { await activerAacLogiciel(); aac = 'logiciel'; }
  mes.codecs = { video: 'H.264', audio: 'AAC (' + aac + ')', taille: W + 'x' + H };
  prog(0.01, 'lecture');
  const res = await chargerRessources();
  // médias
  const max = Math.min(MAX_MEDIAS, (M.medias && M.medias.max) || MAX_MEDIAS);
  const fichiers = (o.medias || []).slice(0, max);
  if ((o.medias || []).length > max) avert.push('Seuls les ' + max + ' premiers médias sont utilisés.');
  const lus = [];
  for (let i = 0; i < fichiers.length; i++) {
    stop();
    try { lus.push(await lireMedia(fichiers[i], i, W, H, o)); }
    catch (e) { avert.push('Le média n° ' + (i + 1) + " n'a pas pu être lu : il est laissé de côté."); }
    prog(0.01 + 0.04 * (i + 1) / Math.max(1, fichiers.length), 'lecture');
  }
  const besoin = (M.medias && M.medias.min) || 0; const videoSeule = M.medias && M.medias.types && !M.medias.types.includes('photo');
  if (fichiers.length && !lus.length && besoin) throw new ErreurStudio('AUCUN_MEDIA_LISIBLE', MSG.AUCUN_MEDIA_LISIBLE);
  if (lus.length < besoin) { lus.forEach(liberer); throw new ErreurStudio('MEDIAS_MANQUANTS', mediasManquants(besoin, videoSeule)); }
  if (videoSeule && lus.some(m => m.genre === 'photo')) avert.push('Ce modèle est prévu pour des vidéos : les photos sont montrées avec un zoom lent.');
  mes.lecture_ms = Math.round(performance.now() - T0);
  let sortieRef = null, planRef = null;
  try {
    // voix : morceaux réels, ou durées estimées (≈ 2,5 mots par seconde) si la voix n'a pas pu se charger
    const voix = M.voixSynthese ? (o.voix || null) : null;
    if (M.voixSynthese && !voix && M.textesVoix.length) avert.push("La voix n'a pas pu être préparée : la vidéo est faite sans voix, avec les textes à l'écran.");
    let k = 0;
    const phrases = M.phrases.map(p => {
      if (p.silence) return { ...p };
      const morceau = voix && voix.morceaux ? voix.morceaux[k] : null; k++;
      const duree = morceau ? morceau.duree : Math.max(1.2, p.texte.split(/\s+/).length / 2.5 + 0.2);
      return { ...p, morceau, duree };
    });
    if (voix && voix.morceaux && voix.morceaux.length !== M.textesVoix.length) avert.push('La voix ne correspond pas au texte : refaites la voix.');
    const construits = construirePlans(M, lus); avert.push(...construits.avertissements);
    // profil du son des vidéos, puis plan
    for (const m of lus) if (m.genre === 'video') await profilSon(m);
    stop();
    const plan = planifier(M, construits, phrases, o.pause != null ? o.pause : 0.18); avert.push(...plan.avertissements); planRef = plan;
    // extraits choisis automatiquement (le passage le plus vivant ; jamais deux fois le même passage)
    for (const c of plan.plans) {
      const m = c.media; if (!m || m.genre !== 'video') continue;
      if (c.mode === 'normal' || c.mode === 'fond') {
        if (c.morceau > 0) { const prem = plan.plans.find(x => x.src === c.src && x.morceau === 0 && x.media === m); if (prem) { c.s0 = prem.s0 + (c.debut - prem.debut); c.dispo = Math.max(0, m.duree - c.s0); continue; } }
        const d = Math.min(c.d, m.duree);
        c.s0 = c.extrait === 'fixe' ? Math.min(c.de || 0, Math.max(0, m.duree - 0.5)) : choisirDebut(m, d, c.extrait);
        c.dispo = Math.max(0.1, m.duree - c.s0); m.deja.push([c.s0, c.s0 + d]);
      } else if (c.mode === 'ralenti') {
        const prec = c.apres; const finExtrait = prec && prec.s0 != null ? Math.min(m.duree, prec.s0 + Math.min(prec.d, prec.dispo)) : m.duree;
        c.secondes = c.d * 0.5; c.a0 = Math.max(0, finExtrait - c.secondes);
      }
    }
    for (const c of plan.plans) { const m = c.media; if (m && m.genre === 'photo') m.dernier = plan.plans.lastIndexOf(c); if (m && m.genre === 'video') m.dernier = plan.plans.lastIndexOf(c); }
    plan.plans.forEach((c, i) => { if (c.media) c.media.dernierPlan = i; if (c.tour || c.type === 'pages') lus.forEach(m => { m.dernierPlan = Math.max(m.dernierPlan || 0, i); }); });
    // sous-titres (voix de synthèse, ou textes seuls en repli) et sous-titres des vraies voix saisis par le club
    const st = [];
    for (const ph of phrases) if (!ph.silence && ph.debut != null) st.push(...decouper(ph.texte, ph.debut, ph.fin));
    for (const c of plan.plans) if (c.sousTitreVrai && !c.morceau) st.push(...decouper(c.sousTitreVrai, c.debut + 0.25, c.debut + Math.min(c.d, c.dispo || c.d) - 0.2));
    const accroche = plan.plans[0] && plan.plans[0].type === 'accroche' ? plan.plans[0] : null;
    const tAccroche = accroche ? accroche.d : 0;   // le titre d'accroche reste tout son plan (2 s au moins)
    stop(); prog(0.07, 'son');
    // son
    const T1 = performance.now();
    const son = await mixerSon(plan, phrases, voix, plan.total, M.couperSon);
    mes.son_ms = Math.round(performance.now() - T1); mes.pistes_ambiance = son.pistes; mes.son_rms_dB = son.rms_dB;
    const sansSon = son.rms_dB < -60;
    if (sansSon) avert.push("La vidéo n'a pas de son : choisissez un son dans l'application au moment de publier.");
    prog(0.12, 'son');
    // encodeur
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', { alpha: false });
    g.imageSmoothingQuality = 'high';
    const D = new Dessinateur(g, W, H, S, res, M);
    const sortie = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new MB.BufferTarget() });
    const srcV = new MB.CanvasSource(cv, { codec: 'avc', bitrate: W >= 1080 ? 8e6 : 5e6, keyFrameInterval: 1, latencyMode: 'quality' });
    const srcA = new MB.AudioBufferSource({ codec: 'aac', bitrate: 160e3 });
    sortie.addVideoTrack(srcV, { frameRate: ips }); sortie.addAudioTrack(srcA);
    sortie.setMetadataTags({ title: M.presentation || M.serie || 'BCR', comment: voix ? 'Voix de synthèse (elle n’imite aucune personne connue). Montage fait dans le téléphone, sans musique ajoutée.' : 'Montage fait dans le téléphone, sans musique ajoutée.' });
    await sortie.start(); sortieRef = sortie;
    if (o.simuler && o.simuler.echecEncodeur && W >= (o.simuler.echecEncodeur === true ? 1080 : o.simuler.echecEncodeur)) throw new Error('ENCODEUR (simulé)');
    await srcA.add(son.rendu); srcA.close(); son.rendu = null;
    // images
    const nb = Math.round(plan.total * ips); const T2 = performance.now(); let attente = 0; let idx = 0;
    const entrer = async (c) => {
      const m = c.media;
      if (c.tour) { c.fonds = []; for (const x of lus) { stop(); const img = x.genre === 'photo' ? x.image : await imageFixe(x, x.duree * 0.5, W, H); if (x.affiche && !x.flou) x.flou = petitFlou(img, W, H, 26); c.fonds.push({ img, m: x }); } }
      if (c.type === 'pages' && Array.isArray(c.lignes)) for (let j = 0; j < c.lignes.length; j++) { // photo d'équipe associée par le club, sinon dans l'ordre des photos, sinon fond uni
        stop(); const pg = c.lignes[j]; const x = pg.photo ? lus[pg.photo - 1] : (c.src.source === 'matchs' ? lus[c.page != null ? c.page + j : j] : null);
        pg.photoImg = x ? (x.genre === 'photo' ? x.image : await imageFixe(x, x.duree * 0.5, W, H)) : null;
      }
      if (!m) return;
      // fond d'une carte : photo en zoom lent, affiche floutée, vidéo qui défile floutée (avec son son, plus bas)
      if ((c.mode === 'fond' || c.mode === 'vitrine') && m.genre === 'photo') { if ((m.affiche || c.mode === 'vitrine') && !m.flou) m.flou = petitFlou(m.image, W, H, 26); return; }
      if (m.genre !== 'video') return;
      if (c.mode === 'fige') { c.fixe = await imageFixe(m, c.instant, W, H); return; }
      const n = Math.max(1, Math.round(c.d * ips)); const temps = new Array(n); const fin = m.duree - 0.04;
      for (let i = 0; i < n; i++) {
        const l = i / ips; let ts;
        if (c.mode === 'ralenti') ts = c.a0 + l * 0.5; else if (c.mode === 'accelere') ts = c.de + l * c.vitesse; else ts = (c.s0 || 0) + Math.min(l, (c.dispo || m.duree) - 0.04);
        temps[i] = Math.max(0, Math.min(fin, ts));
      }
      for (let i = 1; i < n; i++) if (temps[i] < temps[i - 1]) temps[i] = temps[i - 1];
      c.temps = temps; c.n = 0;
      if (m.video) { if (!m.sink) m.sink = new MB.CanvasSink(m.video, { width: W, height: H, fit: 'cover', poolSize: 2 }); c.iter = m.sink.canvasesAtTimestamps(temps.map(x => m.t0 + x)); }
    };
    const sortir = async (c, i) => {
      if (c.iter) { try { await c.iter.return(); } catch (e) { } c.iter = null; }
      c.dernierImg = null; c.fixe = null; c.fonds = null; c.temps = null;
      for (const m of lus) if (m.dernierPlan != null && m.dernierPlan <= i && !m.libere) { liberer(m); m.libere = true; }
    };
    await entrer(plan.plans[0]);
    for (let i = 0; i < nb; i++) {
      if (i % 15 === 0) stop();
      const t = i / ips;
      while (idx < plan.plans.length - 1 && t >= plan.plans[idx].fin - 1e-6) { await sortir(plan.plans[idx], idx); idx++; await entrer(plan.plans[idx]); }
      const c = plan.plans[idx]; const lt = Math.max(0, t - c.debut); const k = clamp01(lt / c.d);   // ≥ 0 : jamais d'image vide à cause d'un arrondi
      if (c.type === 'fin') { D.fin(c.textes, lt, !!voix); }
      else {
        // fond
        const m = c.media;
        if (c.tour && c.fonds && c.fonds.length) { const n = Array.isArray(c.lignes) ? c.lignes.length : 1; const j = Math.min(n - 1, Math.floor(lt / (c.d / n))); const f = c.fonds[j % c.fonds.length];
          if (f.m.affiche) { const z = 1.06 + 0.05 * k; g.drawImage(f.m.flou, -W * (z - 1) / 2, -H * (z - 1) / 2, W * z, H * z); g.fillStyle = 'rgba(8,10,9,.55)'; g.fillRect(0, 0, W, H); } else dessinerPhoto(g, W, H, f.img, k, { ...c, cadre: 0 }, f.m); D.voile(0.8); }
        else if (!m) { D.fondCouleurs(t, idx); D.voile(0); }
        else if (c.mode === 'vitrine') { const z = 1.08; g.drawImage(m.flou, -W * (z - 1) / 2, -H * (z - 1) / 2, W * z, H * z); g.fillStyle = 'rgba(8,10,9,.4)'; g.fillRect(0, 0, W, H);
          const s = Math.min(W / m.image.width, H / m.image.height) * (1 + 0.04 * ease(k)); const w = m.image.width * s, h = m.image.height * s; g.drawImage(m.image, (W - w) / 2, (H - h) / 2, w, h); }
        else if (c.mode === 'fond' && m.genre === 'photo') {
          if (m.affiche) { const z = 1.06 + 0.05 * k; g.drawImage(m.flou, -W * (z - 1) / 2, -H * (z - 1) / 2, W * z, H * z); } else dessinerPhoto(g, W, H, m.image, k, c, m);
          g.fillStyle = 'rgba(8,10,9,.45)'; g.fillRect(0, 0, W, H); D.voile(0.4); }
        else if (c.mode === 'fond') { // vidéo floutée qui défile sous la carte
          if (c.iter) { const r = await c.iter.next(); if (!r.done && r.value) c.dernierImg = r.value.canvas; } else if (m.el) { await chercher(m.el, c.temps[Math.min(c.temps.length - 1, c.n)]); c.dernierImg = m.el; }
          c.n++; if (c.dernierImg) flouDirect(g, c.dernierImg, W, H, c, 1.06 + 0.04 * k); else { g.fillStyle = C.noir; g.fillRect(0, 0, W, H); }
          g.fillStyle = 'rgba(8,10,9,.42)'; g.fillRect(0, 0, W, H); D.voile(0.4); }
        else if (m.genre === 'photo') { dessinerPhoto(g, W, H, m.image, k, c, m); D.voile(c.mode === 'fige' ? 0.5 : 0); }
        else if (c.mode === 'fige') { const z = 1 + 0.08 * ease(k); g.drawImage(c.fixe, -W * (z - 1) / 2, -H * (z - 1) / 2, W * z, H * z); D.voile(0.5); }
        else {
          if (c.iter) { const r = await c.iter.next(); if (!r.done && r.value) c.dernierImg = r.value.canvas; }
          else if (m.el) { await chercher(m.el, c.temps[Math.min(c.temps.length - 1, c.n)]); c.dernierImg = m.el; }
          c.n++;
          if (c.dernierImg) {
            const tenu = c.mode === 'normal' && lt > c.dispo; const z = tenu ? 1 + 0.06 * clamp01((lt - c.dispo) / 2) : 1;
            if (c.dernierImg === m.el) dessinerVideoEl(g, W, H, m.el); else g.drawImage(c.dernierImg, -W * (z - 1) / 2, -H * (z - 1) / 2, W * z, H * z);
          } else { g.fillStyle = C.noir; g.fillRect(0, 0, W, H); }
          D.voile(c.mode === 'normal' ? 0 : 0.15);
        }
        // textes du plan
        const debutTexte = idx > 0 && accroche && c.debut < tAccroche && aTexte(c) ? tAccroche : c.debut;
        const tt = t - debutTexte;
        if (accroche && t < tAccroche) dessinerAccroche(D, accroche.textes, t, tAccroche, true);
        if (tt >= 0) dessinerPlan(D, c, tt, t, M.ctx);
      }
      // éléments présents toute la vidéo : bandeau « Collaboration commerciale », nom de la série
      const u = W / 1080;
      if (M.bandeauHaut) D.bandeauHaut(M.bandeauHaut, 236 * u);
      if (c.type !== 'fin' && M.serie && M.serie_cle !== 'joker' && t > 0.3) { g.save(); g.globalAlpha = clamp01((t - 0.3) / 0.3); D.badge(M.serie, (M.bandeauHaut ? 300 : 250) * u); g.restore(); }
      if (!(accroche && t < tAccroche) && c.mode !== 'vitrine') D.sousTitre(st, t);   // pendant l'accroche, le titre suffit (la voix le double) ; une affiche reste sans texte par-dessus
      if (c.debut > 0 && lt < 0.25) D.transition(lt / 0.22);
      const a0 = performance.now(); await srcV.add(t, 1 / ips); attente += performance.now() - a0;
      if (i % 10 === 0) prog(0.12 + 0.85 * i / nb, 'images');
    }
    await sortir(plan.plans[idx], plan.plans.length);
    srcV.close();
    prog(0.98, 'fin');
    await sortie.finalize(); sortieRef = null;
    mes.images_ms = Math.round(performance.now() - T2); mes.encodeur_attente_ms = Math.round(attente); mes.images = nb;
    const blob = new Blob([sortie.target.buffer], { type: 'video/mp4' });
    mes.total_ms = Math.round(performance.now() - T0); mes.octets = blob.size;
    const nom = 'bcr-' + (M.id || 'video') + '-' + (/^\d{4}-\d{2}-\d{2}$/.test(o.date || M.date || '') ? (o.date || M.date) : new Date().toISOString().slice(0, 10)) + '.mp4';   // date de la publication
    let fichier = null; try { fichier = new File([blob], nom, { type: 'video/mp4' }); } catch (e) { fichier = blob; }
    prog(1, 'fini');
    return {
      blob, fichier, nom, duree: plan.total, largeur: W, hauteur: H, ips, habillage: nomHab, voixSynthese: !!voix, sansSon, legende: M.legende,
      avertissements: [...new Set(avert)], mesures: mes, manquants: M.manquants,
      plan: plan.plans.map(c => ({ type: c.type, mode: c.mode, media: c.media ? c.media.index + 1 : null, genre: c.media ? c.media.genre : null, debut: +c.debut.toFixed(2), fin: +c.fin.toFixed(2), extrait: c.s0 != null ? +c.s0.toFixed(2) : undefined, lecteur: c.media ? !!c.media.lecteur : undefined })),
      voix: phrases.filter(p => !p.silence).map(p => ({ texte: p.texte, debut: p.debut != null ? +p.debut.toFixed(2) : null, fin: p.fin != null ? +p.fin.toFixed(2) : null, reelle: !!p.morceau })),
      sousTitres: st.map(s => ({ texte: s.mots.join(' '), debut: +s.debut.toFixed(2), fin: +s.fin.toFixed(2) }))
    };
  } catch (e) {
    if (sortieRef) { try { await sortieRef.cancel(); } catch (x) { } }
    throw e;
  } finally {
    // montage arrêté ou fini : les images en cours de lecture sont rendues avant de libérer les vidéos (décodeur du téléphone)
    if (planRef) for (const c of planRef.plans) { if (c.iter) { try { await c.iter.return(); } catch (x) { } c.iter = null; } c.dernierImg = null; c.petit = null; }
    for (const m of lus) { m.sink = null; m.sinkFixe = null; if (!m.libere) liberer(m); }
  }
}

// Accroche : posée dès l'image 0 (elle sert souvent de couverture). Chaque habillage a son signe : oblique = centrée en bas
// du tiers haut ; cadre = en bas de l'écran ; rubans = sur un ruban pleine largeur ; bloc = un mot ou un chiffre géant au centre.
function dessinerAccroche(D, tx, t, tFin, sortie) {
  const { u, S, g } = D; const out = sortie ? ease((t - (tFin - 0.22)) / 0.22) : 0;
  g.save(); if (out > 0) { g.globalAlpha = 1 - out; g.translate(-out * 120 * u, 0); }
  const titre = String(tx.titre || ''); const mise = S.accroche || 'centre';
  const centre = mise === 'centre' || mise === 'geant';
  let max = 175, min = 86; const lignes = 3;
  if (mise === 'geant') { max = /^\d+$/.test(titre.trim()) ? 300 : 230; min = 110; }
  const c = caser(g, titre, { fonte: 'titre', max: max * u, min: min * u, largeur: centre ? ZONE.largeur * u - 40 * u : D.larg, lignes });
  const hT = c.taille * 0.98 * c.lignes.length; const hE = tx.surtitre ? 62 * 1.32 * u + 24 * u : 0;
  let y = mise === 'centre' ? 640 * u - hT - hE : mise === 'geant' ? 960 * u - (hT + hE) / 2 : mise === 'bas' ? 1290 * u - hT - hE : 560 * u;
  y = Math.max(340 * u, y);
  if (tx.surtitre) y += D.etiquette(tx.surtitre, y, 1, { taille: 62, centre }) + 24 * u;
  const sc = titre.match(/^(\d+)\s*[–-]\s*(\d+)$/);
  if (sc) { const s = 1 + 0.04 * (1 - ease(t / 0.2)); const x = centre ? D.W / 2 : D.x0; g.save(); g.translate(x, y); g.scale(s, s); g.translate(-x, -y); ecrire(g, sc[1] + ' – ' + sc[2], x, y + 210 * u, 230 * u, { couleur: S.vif, align: centre ? 'center' : 'left' }); g.restore(); y += 260 * u; }
  else y += D.titre(titre, y, 1, { max, min, lignes, pose: true, t, align: centre ? 'center' : 'left', ruban: mise === 'ruban' });
  if (tx.equipe || tx.adversaire) D.ligneTexte([tx.equipe, tx.adversaire && 'contre ' + tx.adversaire].filter(Boolean).join(' · '), y, 1, { taille: 60 });
  g.restore();
}

function scoreDe(x) {
  if (Array.isArray(x)) return x[0] !== '' && x[0] != null && x[1] !== '' && x[1] != null ? { a: +x[0], b: +x[1] } : null;
  const m = String(x || '').match(/^(\d+)\s*[–-]\s*(\d+)$/); return m ? { a: +m[1], b: +m[2] } : null;
}
function dessinerPlan(D, c, tt, t, ctx) {
  const { g, u, W, S } = D; const tx = c.textes || {};
  switch (c.type) {
    case 'carte': {
      let y = 520 * u;
      if (tx.surtitre) y += D.etiquette(tx.surtitre, y, tt / 0.3) + 26 * u;
      y += D.titre(tx.titre, y, (tt - 0.08) / 0.35, { max: 150, min: 70 });
      if (tx.equipe) y += D.ligneTexte(tx.equipe, y, (tt - 0.3) / 0.35, { taille: 60, couleur: S.accent });
      (tx.fin || []).filter(Boolean).forEach((l, i) => { y += D.ligneTexte(l, y, (tt - 0.45 - i * 0.12) / 0.35, { taille: 60 }); });
      break;
    }
    case 'score': {
      let y = 470 * u;
      if (tx.surtitre) y += D.etiquette(tx.surtitre, y, tt / 0.3) + 24 * u;
      const tit = String(tx.titre || '');
      const surDix = tit.match(/^(\d+)\s*\/\s*(\d+)$/);
      const sc = surDix ? null : scoreDe(tx.score);
      if (surDix) { // défi : le nombre défile jusqu'au score saisi
        const e = ease((tt - 0.1) / 1.1); const n = Math.round(+surDix[1] * e);
        ecrire(g, String(n), D.x0, y + 330 * u, 380 * u, { couleur: S.accent }); g.font = police('titre', 380 * u);
        ecrire(g, '/ ' + surDix[2], D.x0 + g.measureText(String(n)).width + 30 * u, y + 330 * u, 160 * u);
        y += 380 * u; if (tx.equipe) D.ligneTexte(tx.equipe, y, (tt - 0.6) / 0.35, { taille: 60 });
        break;
      }
      y += D.titre(tit, y, (tt - 0.05) / 0.3, { max: 120, min: 64, lignes: 2 });
      if (sc) {
        const e = ease((tt - 0.35) / 0.9); const a = Math.round(sc.a * e), b = Math.round(sc.b * e);
        const k = ease((tt - 0.3) / 0.3); paral(g, D.x0 - 20 * u - (1 - k) * 900 * u, y, 760 * u, 220 * u, 'rgba(8,10,9,.88)', S.pente || 0.1);
        if (k > 0.3) ecrire(g, a + ' – ' + b, D.x0 + 30 * u, y + 175 * u, 175 * u, { couleur: S.vif, ombre: false });
        y += 250 * u;
      } else if (tx.score && !Array.isArray(tx.score)) {
        const k = easeBack((tt - 0.3) / 0.4); g.save(); g.translate(D.x0 + 20 * u, y + 110 * u); g.rotate(-0.06); g.scale(Math.max(0.01, k), Math.max(0.01, k));
        const c2 = caser(g, tx.score, { fonte: 'titre', max: 130 * u, min: 60 * u, largeur: D.larg - 60 * u, lignes: 2 });
        g.strokeStyle = S.vif; g.lineWidth = 10 * u; const w = Math.max(...c2.largeurs) + 60 * u, h = c2.taille * 1.05 * c2.lignes.length + 40 * u;
        g.strokeRect(-20 * u, -c2.taille * 0.9, w, h); c2.lignes.forEach((l, i) => ecrire(g, l, 10 * u, i * c2.taille * 1.05, c2.taille, { couleur: S.vif }));
        g.restore(); y += c2.taille * 1.05 * c2.lignes.length + 100 * u;
      }
      if (tx.adversaire) D.ligneTexte('contre ' + tx.adversaire, y, (tt - 0.5) / 0.35, { taille: 58 });
      else if (tx.equipe) D.ligneTexte(tx.equipe, y, (tt - 0.5) / 0.35, { taille: 58 });
      break;
    }
    case 'liste': case 'groupes': case 'scores_un_par_un': {
      // 4 lignes au plus par écran, en 48 px au moins (une ligne trop longue passe sur deux lignes, la fin en couleur)
      const T = Array.isArray(c.lignes) ? c.lignes : []; let y = 470 * u;
      const titre = c.titre || (c.src && c.src.titre) || '';
      const ecrans = []; for (let i = 0; i < T.length; i += 4) ecrans.push(T.slice(i, i + 4));
      const ne = Math.max(1, ecrans.length), de = c.d / ne; const je = Math.min(ne - 1, Math.floor(tt / de)); const te = tt - je * de;
      const L = ecrans[je] || [];
      if (titre) y += D.etiquette(titre, y, tt / 0.3, { taille: 64 }) + 34 * u;
      const n = L.length; const pas = c.type === 'scores_un_par_un' ? de / Math.max(1, n) * 0.92 : Math.min(0.42, Math.max(0.18, (de - 1.6) / Math.max(1, n)));
      const sortieE = je < ne - 1 ? ease((te - (de - 0.25)) / 0.25) : 0;
      const coulB = S.ligneTexte === C.encre ? (S.vif === C.vif ? C.fonce : '#0a2260') : (S.accentLigne || S.vif);
      const largeur = D.larg - 60 * u; const pos = []; let yc = y;
      L.forEach((l) => { const ls = String(l); g.font = police('texte', 48 * u, 800); const h = (g.measureText(ls.replace(' · ', ' · ')).width <= largeur ? 104 : 168) * u; pos.push(yc); yc += h + 16 * u; });
      L.forEach((l, i) => {
        const t0 = 0.25 + i * pas; const kk = c.type === 'scores_un_par_un' ? easeBack((te - t0) / 0.45) : ease((te - t0) / 0.32); if (kk <= 0) return;
        const ls = String(l); const cut = ls.lastIndexOf(' · '); const a = cut > 0 ? ls.slice(0, cut) : ls, b = cut > 0 ? ls.slice(cut + 3) : '';
        y = pos[i];
        g.save();
        if (c.type === 'scores_un_par_un') { g.globalAlpha = clamp01(kk * 2) * (1 - sortieE); g.translate(0, -(1 - kk) * 180 * u); } else { g.globalAlpha = clamp01(kk * 1.5) * (1 - sortieE); g.translate(-(1 - kk) * 300 * u - sortieE * 200 * u, 0); }
        const plein = a + (b ? ' · ' + b : '');
        const un = caser(g, plein, { fonte: 'texte', poids: 800, max: 58 * u, min: 48 * u, largeur, lignes: 1, capitales: false });
        g.font = police('texte', 48 * u, 800); const tientUne = g.measureText(plein).width <= largeur; g.font = police('texte', un.taille, 800);
        const hl = (tientUne ? 104 : 168) * u; const yy = y;
        g.fillStyle = S.ligneFond;
        if (tientUne) {
          const wa = g.measureText(a + (b ? ' · ' : '')).width; const w = un.largeurs[0] + 56 * u;
          g.beginPath(); g.roundRect(D.x0 - 20 * u, yy, w, hl, 12 * u); g.fill(); g.fillStyle = S.accent; g.fillRect(D.x0 - 20 * u, yy, 10 * u, hl);
          const by = yy + hl / 2 + un.taille * 0.34;
          ecrire(g, a + (b ? ' · ' : ''), D.x0 + 12 * u, by, un.taille, { fonte: 'texte', poids: 800, couleur: S.ligneTexte, ombre: false });
          if (b) ecrire(g, b, D.x0 + 12 * u + wa, by, un.taille, { fonte: 'texte', poids: 800, couleur: coulB, ombre: false });
        } else {
          const ca = caser(g, a, { fonte: 'texte', poids: 800, max: 52 * u, min: 48 * u, largeur, lignes: 1, capitales: false });
          const cb = caser(g, b || ' ', { fonte: 'texte', poids: 800, max: 52 * u, min: 48 * u, largeur, lignes: 1, capitales: false });
          const tz = Math.min(ca.taille, cb.taille); const w = Math.max(ca.largeurs[0] || 0, cb.largeurs[0] || 0) * tz / Math.max(ca.taille, 1) + 56 * u;
          g.beginPath(); g.roundRect(D.x0 - 20 * u, yy, Math.min(w, D.larg + 20 * u), hl, 12 * u); g.fill(); g.fillStyle = S.accent; g.fillRect(D.x0 - 20 * u, yy, 10 * u, hl);
          ecrire(g, a, D.x0 + 12 * u, yy + 70 * u, tz, { fonte: 'texte', poids: 800, couleur: S.ligneTexte, ombre: false });
          if (b) ecrire(g, b, D.x0 + 12 * u, yy + 138 * u, tz, { fonte: 'texte', poids: 800, couleur: coulB, ombre: false });
        }
        g.restore();
      });
      break;
    }
    case 'colonnes': {
      let y = 470 * u; const col = (c.lignes && c.lignes.colonnes) || [];
      const titre = c.titre || (c.src && c.src.titre) || '';
      if (titre) y += D.etiquette(titre, y, tt / 0.3, { taille: 64 }) + 40 * u;
      const lw = 400 * u, gap = 30 * u;
      col.forEach((cc, i) => {
        const kk = ease((tt - 0.25 - i * 0.25) / 0.4); if (kk <= 0) return; const x = D.x0 - 20 * u + i * (lw + gap);
        g.save(); g.globalAlpha = kk; g.translate((i ? 1 : -1) * (1 - kk) * 200 * u, 0);
        g.fillStyle = i ? 'rgba(8,10,9,.86)' : 'rgba(31,122,63,.92)'; g.beginPath(); g.roundRect(x, y, lw, 420 * u, 18 * u); g.fill();
        ecrire(g, cc.titre, x + lw / 2, y + 80 * u, 50 * u, { fonte: 'texte', poids: 800, align: 'center', ombre: false });
        const n = Math.round(cc.n * ease((tt - 0.4 - i * 0.25) / 0.8));
        ecrire(g, String(n), x + lw / 2, y + 300 * u, 220 * u, { align: 'center', couleur: i ? S.vif : C.blanc });
        ecrire(g, String(cc.ligne || '').replace(/^\d+\s*/, ''), x + lw / 2, y + 380 * u, 46 * u, { fonte: 'texte', poids: 700, align: 'center', ombre: false });
        g.restore();
      });
      break;
    }
    case 'pages': {
      const P = Array.isArray(c.lignes) ? c.lignes : []; const n = Math.max(1, P.length); const dp = c.d / n;
      const j = Math.min(n - 1, Math.floor(tt / dp)); const lp = tt - j * dp; const page = P[j]; if (!page) break;
      const suivante = j + 1 < n ? P[j + 1] : (c.pageSuivante || null);
      const sortie = suivante ? ease((lp - (dp - 0.3)) / 0.3) : 0; const entree = j === 0 && c.premierePage !== false ? ease(lp / 0.3) : 1;
      const z = 1 + 0.035 * clamp01(lp / dp); g.save(); g.translate(W / 2, 760 * u); g.scale(z, z); g.translate(-W / 2, -760 * u);
      if (suivante && sortie > 0) dessinerPage(D, suivante, 0, 1, 0, c, ctx);
      dessinerPage(D, page, lp, entree, sortie, c, ctx);
      g.restore();
      break;
    }
    case 'chiffre': {
      let y = 470 * u;
      const pose = c.debut === 0;   // 1er plan de la vidéo : posé dès l'image 0 (couverture), pas de compteur
      if (tx.surtitre) y += D.etiquette(tx.surtitre, y, pose ? 1 : tt / 0.3) + 20 * u;
      const v = String(tx.titre || ''); const sc = scoreDe(v); const e = pose ? 1 : ease((tt - 0.15) / 1.2);
      const aff = sc ? Math.round(sc.a * e) + ' – ' + Math.round(sc.b * e) : /^\d+$/.test(v) ? String(Math.round(+v * e)) : v;
      const c1 = caser(g, sc ? sc.a + ' – ' + sc.b : v, { fonte: 'titre', max: 440 * u, min: 140 * u, largeur: D.larg, lignes: 1 });
      ecrire(g, aff, D.x0, y + c1.taille * 0.86, c1.taille, { couleur: S.accent });
      y += c1.taille + 10 * u;
      if (tx.sous_titre) D.ligneTexte(tx.sous_titre, y, pose ? 1 : (tt - 0.7) / 0.35, { taille: 64 });
      break;
    }
    case 'media': case 'ralenti': case 'accelere': case 'fige': case 'accroche': {
      if (c.type === 'fige') { const y = 560 * u; D.titre(tx.titre, y, tt / 0.25, { max: 190, min: 90, lignes: 2, pose: c.debut === 0, t: tt }); // pause
        g.save(); g.globalAlpha = 0.9; g.fillStyle = C.blanc; g.fillRect(W - 220 * u, 520 * u, 26 * u, 90 * u); g.fillRect(W - 180 * u, 520 * u, 26 * u, 90 * u); g.restore(); }
      let y = 500 * u;
      if (c.type === 'accelere') {
        const nTir = Math.min(9, 1 + Math.floor((tt / c.d) * 9));
        const etq = (c.etiquettes || []).map(e => e.replace('{n}', nTir)).filter(Boolean);
        etq.forEach((e, i) => { y += D.etiquette(e, y, (tt - i * 0.2) / 0.25, { taille: i ? 48 : 70 }) + 20 * u; });
        D.etiquette('Accéléré x' + Math.round(c.vitesse), 1040 * u, tt / 0.25, { taille: 52, fond: C.noir, couleur: S.vif });
      } else if (c.etiquette) D.etiquette(c.etiquette, y, tt / 0.3, { taille: c.type === 'ralenti' ? 56 : 66 });
      break;
    }
  }
}
function dessinerPage(D, page, lp, entree, sortie, c, ctx) {
  const { g, u, W, S } = D; const x = 90 * u, y = 390 * u, w = W - 260 * u, h = 740 * u;
  g.save();
  g.translate(x + w / 2, y + h / 2); g.rotate((sortie * -0.5) + (page === null ? 0 : -0.02)); g.translate(-(x + w / 2) - sortie * W * 0.9, -(y + h / 2) + (1 - entree) * 300 * u);
  g.globalAlpha = entree;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 12 * u, y + 16 * u, w, h);
  g.fillStyle = C.papier; g.fillRect(x, y, w, h);
  // haut de page : photo de l'équipe si le club l'a associée, sinon fond uni à nos couleurs
  const ph = page.photoImg;
  g.fillStyle = C.vert; g.fillRect(x + 24 * u, y + 24 * u, w - 48 * u, h * 0.42);
  if (ph) { g.save(); g.beginPath(); g.rect(x + 24 * u, y + 24 * u, w - 48 * u, h * 0.42); g.clip(); const s = Math.max((w - 48 * u) / ph.width, h * 0.42 / ph.height); g.drawImage(ph, x + 24 * u + (w - 48 * u - ph.width * s) / 2, y + 24 * u + (h * 0.42 - ph.height * s) / 2, ph.width * s, ph.height * s); g.restore(); }
  else { g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 10 * u; g.beginPath(); g.arc(x + w * 0.72, y + h * 0.22, h * 0.3, 0, Math.PI * 2); g.stroke(); }
  const c1 = caser(g, page.titre || '', { fonte: 'titre', max: 96 * u, min: 50 * u, largeur: w - 80 * u, lignes: 2 });
  c1.lignes.forEach((l, i) => ecrire(g, l, x + 40 * u, y + h * 0.42 + 120 * u + i * c1.taille, c1.taille, { couleur: C.encre, ombre: false }));
  if (page.bas) ecrire(g, page.bas, x + 40 * u, y + h - 60 * u, 42 * u, { fonte: 'texte', poids: 700, couleur: '#4f5866', ombre: false });
  // tampon
  if (page.tampon) {
    const k = easeBack((lp - 0.35) / 0.35);
    if (k > 0) { g.save(); g.translate(x + w - 220 * u, y + h * 0.42 + 300 * u); g.rotate(-0.2); const s = 1.8 - 0.8 * Math.min(1, k); g.scale(s, s); g.globalAlpha = Math.min(1, k);
      const c2 = caser(g, page.tampon, { fonte: 'titre', max: 84 * u, min: 40 * u, largeur: 380 * u, lignes: 2 });
      const tw = Math.max(...c2.largeurs) + 50 * u, th = c2.taille * 1.05 * c2.lignes.length + 30 * u;
      g.strokeStyle = C.vert; g.lineWidth = 9 * u; g.strokeRect(-tw / 2, -th / 2, tw, th);
      c2.lignes.forEach((l, i) => ecrire(g, l, 0, -th / 2 + 15 * u + c2.taille * (0.85 + i * 1.05), c2.taille, { couleur: C.vert, align: 'center', ombre: false }));
      g.restore(); }
  }
  g.restore();
}

// ---------- façade ----------
let wakeLock = null;
async function garderEcran(oui) {
  try {
    if (oui && 'wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen');
    else if (!oui && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

export const BCRStudio = {
  COULEURS, HABILLAGES, HABILLAGES_PAR_SERIE, ErreurStudio,
  capacites, preparer, calculer, condition, enLettres, scoreAffiche, equipeEcran, equipeVoix, heureEcran, heureVoix,
  habillages: (serie) => HABILLAGES_PAR_SERIE[serie] || ['oblique', 'cadre'],
  // Monte la vidéo. Options : { modele, valeurs } ou { montage (sortie de preparer) }, medias: [File…] dans l'ordre du club,
  // voix (sortie de BCRVoix.dire, ou null), taille: 'auto' | 1080 | 720, habillage, onProgres(fraction, texte, etape), signal (AbortSignal).
  async monter(o = {}) {
    if (typeof VideoEncoder === 'undefined' || (o.simuler && o.simuler.sansEncodeur)) throw new ErreurStudio('ENCODAGE_IMPOSSIBLE', MSG.ENCODAGE_IMPOSSIBLE);
    const montage = o.montage || preparer(o.modele, o.valeurs || {});
    let grand = o.taille === 1080 || o.taille === 'auto' || o.taille == null;
    if (grand && o.taille !== 1080) { try { grand = await MB.canEncodeVideo('avc', { width: 1080, height: 1920 }); } catch (e) { grand = false; } }
    const vis = () => { if (document.visibilityState === 'visible') garderEcran(true); };
    await garderEcran(true); document.addEventListener('visibilitychange', vis);
    try {
      try { return await monterUneFois({ ...o, montage }, grand ? 1080 : 720, grand ? 1920 : 1280); }
      catch (e) {
        if (!grand || (e instanceof ErreurStudio && e.code !== 'ENCODAGE_IMPOSSIBLE')) throw e;
        // l'encodeur a échoué en 1080 : on recommence en 720
        const r = await monterUneFois({ ...o, montage }, 720, 1280);
        r.avertissements.unshift('Vidéo faite en 720 × 1280 : ce téléphone n\'a pas réussi en 1080.');
        return r;
      }
    } catch (e) {
      if (e instanceof ErreurStudio) throw e;
      if (e && (e.name === 'QuotaExceededError' || /memory|mémoire|allocation/i.test(e.message || ''))) throw new ErreurStudio('MEMOIRE', 'Le téléphone manque de place pour la vidéo. Fermez les autres applications, ou utilisez des vidéos plus courtes.', String(e));
      throw new ErreurStudio('ECHEC', MSG.ECHEC, String(e && e.stack || e));
    } finally { document.removeEventListener('visibilitychange', vis); garderEcran(false); }
  },
  // Enregistrer : sur un téléphone (iPhone ET Android), feuille de partage du téléphone dès qu'elle accepte la vidéo ;
  // sinon (ordinateur, ou partage refusé), téléchargement. Renvoie 'partage' | 'annule' | 'telechargement' et le système.
  async enregistrer(r) {
    const f = r.fichier || r.blob; const ios = estWebkit();
    const telephone = ios || /Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.matchMedia && matchMedia('(pointer: coarse)').matches);
    if (telephone && navigator.canShare && f instanceof File) {
      let ok = false; try { ok = navigator.canShare({ files: [f] }); } catch (e) { ok = false; }
      if (ok) { try { await navigator.share({ files: [f] }); return { etat: 'partage', ios }; } catch (e) { if (e && e.name === 'AbortError') return { etat: 'annule', ios }; } }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = r.nom || 'bcr-video.mp4'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000); return { etat: 'telechargement', ios };
  },
  async partager(r) {
    const f = r.fichier; if (!(navigator.canShare && f instanceof File && navigator.canShare({ files: [f] }))) return false;
    try { await navigator.share({ files: [f] }); return true; } catch (e) { return false; }
  }
};
if (typeof window !== 'undefined') window.BCRStudio = BCRStudio;
