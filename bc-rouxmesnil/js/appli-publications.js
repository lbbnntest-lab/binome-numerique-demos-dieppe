// Appli des publications du BCR : quelles publications, quel jour, et ce qu'il manque pour chacune.
// Du 9/11 au 20/12/2026 : le calendrier (appli/calendrier.json, copie de calendrier_multi.json, 64 publications).
// Hors calendrier : la « semaine type », calculée depuis les matchs seuls (rendez-vous le mardi, comme le club le fait déjà, story « Aujourd'hui à la
// maison » le samedi et le dimanche, fin de match de l'équipe à la une quand elle joue, résultats le dimanche).
import { Stock } from './appli-stockage.js';
import { ajouterJours, jourSemaine, joursWeekend, heureFr, maj1 } from './appli-commun.js';
import { EQUIPE_A_LA_UNE, libelle, duWeekend, samediDe, peutTaper } from './appli-matchs.js';

let CAL = null;
export async function chargerCalendrier() {
  if (CAL) return CAL;
  try { const r = await fetch('appli/calendrier.json'); if (r.ok) CAL = await r.json(); } catch (e) { }
  return CAL;
}
export const calendrier = () => CAL;
const pubsCal = () => (CAL && CAL.publications) || [];
export const debutCalendrier = () => pubsCal().reduce((a, p) => (!a || p.date < a ? p.date : a), null);
export const finCalendrier = () => pubsCal().reduce((a, p) => (!a || p.date > a ? p.date : a), null);
export const reglesEnfants = () => (CAL && CAL.regles_enfants) || { codes: {}, toujours: '', consignes: {} };
const modele = (type) => pubsCal().find((p) => p.type === type && p.statut === 'fixe') || pubsCal().find((p) => p.type === type) || {};

/** « 18 h 30 » -> minutes (pour trier) ; « matin ou midi » -> 11 h ; « midi » -> 12 h */
function minutes(h) {
  const t = String(h || '');
  const m = /(\d{1,2})\s*h\s*(\d{2})?/.exec(t); if (m) return +m[1] * 60 + (+m[2] || 0);
  if (/matin/.test(t)) return 660; if (/midi/.test(t)) return 720; return 1200;
}
/** « vers 18 h 30 », « matin ou midi », « vers midi » */
export function heureProposee(h) { const t = String(h || '').trim(); if (!t) return ''; if (/^\d/.test(t) || t === 'midi') return 'vers ' + t; return t; }

/** le titre du calendrier sans ses trous : « Merci partenaire · {partenaire} (suggestion : X) » -> « Merci partenaire · X » */
export const titrePropre = (t) => String(t || '').replace(/\{[^}]+\}\s*\(suggestion\s*:\s*([^)]+)\)/g, '$1').replace(/\s*\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim().replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»');

/** les « sorties » d'une publication, dans l'ordre des cartes de l'atelier */
export function sortiesDe(p) { const s = Object.keys(p.sorties || {}); return ['facebook', 'instagram', 'story', 'tiktok'].filter((k) => s.includes(k)); }
/** les pastilles à montrer (une story se dit toujours « Story Instagram » ou « Story Facebook », jamais « Story » seul) */
export function pastillesDe(p) {
  if (/^story/.test(p.type)) return (p.reseaux || []).map((r) => 'Story ' + ({ instagram: 'Instagram', facebook: 'Facebook' }[r] || r));
  return sortiesDe(p).map((r) => r === 'story' ? 'Story Instagram' : r);
}
const IMPORTANT = new Set(['fixe', 'ouverture']);
export const estImportante = (p) => IMPORTANT.has(p.statut);

/** le week-end dont parle une publication (samedi), ou null */
export function weekendDe(p) {
  const j = jourSemaine(p.date);
  if (p.type === 'rendez-vous') return ajouterJours(p.date, (6 - j + 7) % 7);
  if (p.type === 'resultats' || p.type === 'video-serie' && /résultats/i.test(p.titre)) return samediDe(p.date) || ajouterJours(p.date, -((j + 1) % 7));
  if (p.type === 'story-jour' || p.type === 'fin-de-match') return samediDe(p.date);
  return null;
}

function depuisCalendrier(p, liste) {
  const q = {
    id: p.id, source: 'calendrier', date: p.date, heure: p.heure, type: p.type, statut: p.statut, titre: titrePropre(p.titre),
    reseaux: p.reseaux || [], sorties: p.sorties || {}, medias: p.medias_attendus || '', aTaper: p.a_taper || '',
    regles: (p.regle_enfants && p.regle_enfants.codes) || [], donnees: p.donnees || {}, note: p.note || '', equipe: p.equipe || null, brut: p
  };
  q.samedi = weekendDe(q);
  if (q.type === 'fin-de-match' && liste) { const m = liste.find((x) => x.date === q.date && x.equipe === (q.equipe || EQUIPE_A_LA_UNE) && !x.retire); if (m) q.match = m.cle; }
  return q;
}
function auto(type, date, heure, titre, extra = {}) {
  const m = modele(type);
  return {
    id: 'libre:' + type + ':' + date, source: 'auto', date, heure, type, statut: type === 'story-jour' && jourSemaine(extra.jourMatchs || date) !== 6 ? 'facultatif' : 'fixe', titre,   // socle : la story du samedi
    reseaux: m.reseaux || ['facebook', 'instagram'], sorties: m.sorties || { facebook: {}, instagram: {} },
    medias: m.medias_attendus || '', aTaper: m.a_taper || '', regles: (m.regle_enfants && m.regle_enfants.codes) || [], donnees: {}, note: '', ...extra
  };
}

/** la semaine type d'un jour hors calendrier, calculée depuis les matchs (liste fusionnée, matchs retirés exclus) */
export function semaineType(date, liste) {
  const actifs = liste.filter((m) => !m.retire); const j = jourSemaine(date); const out = [];
  if (j === 2) {   // le mardi (décision du 07/11), pour le week-end qui suit
    const sam = ajouterJours(date, 4);
    if (duWeekend(actifs, sam).length) out.push(auto('rendez-vous', date, '18 h', 'Rendez-vous du week-end · ' + joursWeekend(sam), { samedi: sam }));
  }
  // story « à la maison » : une heure avant le premier match ; si le premier match est avant 9 h, la veille au soir, vers 20 h
  const maisonDu = (d) => actifs.filter((m) => m.date === d && m.dom).sort((a, b) => (a.heure || '99').localeCompare(b.heure || '99'));
  const tot = (ms) => { const p = ms.find((m) => m.heure); return !!p && +p.heure.slice(0, 2) < 9; };
  const nbm = (ms) => ms.length + ' match' + (ms.length > 1 ? 's' : '');
  if (j === 6 || j === 0) {
    const maison = maisonDu(date);
    if (maison.length && !tot(maison)) {
      const premiere = maison.find((m) => m.heure);
      const h = premiere ? +premiere.heure.slice(0, 2) - 1 : 9;   // une heure avant le premier match
      out.push(auto('story-jour', date, h + ' h', 'Story · Aujourd’hui à la maison (' + nbm(maison) + ')', { samedi: samediDe(date), jourMatchs: date }));
    }
  }
  const demain = ajouterJours(date, 1), jd = jourSemaine(demain);
  if (jd === 6 || jd === 0) {
    const maison = maisonDu(demain);
    if (maison.length && tot(maison)) out.push(auto('story-jour', date, '20 h', 'Story · Demain à la maison (' + nbm(maison) + ')', { samedi: samediDe(demain), jourMatchs: demain, id: 'libre:story-jour:' + demain }));
  }
  const une = actifs.find((m) => m.date === date && (m.equipe === EQUIPE_A_LA_UNE));
  if (une) {
    const h = une.heure ? heureFr(String((+une.heure.slice(0, 2) + 2) % 24).padStart(2, '0') + ':' + une.heure.slice(3)) : 'après le match';
    out.push(auto('fin-de-match', date, h, 'Fin de match · ' + libelle(une.equipe) + ' contre ' + une.adv + ' (' + (une.dom ? 'à la maison' : 'à l’extérieur') + ')', { match: une.cle, samedi: samediDe(date) }));
  }
  if (j === 0) {
    const sam = ajouterJours(date, -1);
    if (duWeekend(actifs, sam).length) out.push(auto('resultats', date, '20 h 30', 'Résultats du week-end · ' + joursWeekend(sam), { samedi: sam }));
  }
  return out;
}

/** les publications d'un jour (calendrier si le jour y est, sinon semaine type), triées par heure */
export function publicationsDu(date, liste) {
  const d = debutCalendrier(), f = finCalendrier();
  let pubs;
  if (d && date >= d && date <= f) pubs = pubsCal().filter((p) => p.date === date).map((p) => depuisCalendrier(p, liste));
  else pubs = semaineType(date, liste);
  // la veille du calendrier : la story « Demain à la maison » du premier jour, si le premier match est avant 9 h
  if (d && date === ajouterJours(d, -1)) pubs = pubs.concat(semaineType(date, liste).filter((p) => p.type === 'story-jour' && p.jourMatchs !== date));
  return pubs.sort((a, b) => minutes(a.heure) - minutes(b.heure));
}
/** toutes les publications du calendrier, pour l'onglet Publier */
export const toutesDuCalendrier = (liste) => pubsCal().map((p) => depuisCalendrier(p, liste));

/** La même publication peut avoir plusieurs portes d'entrée (calendrier, semaine type, tuile de l'onglet Publier) : elles partagent
 *  une seule clé (genre + week-end, ou le match), donc une seule carte dans « Cette semaine » et une seule case « Fait ». */
export function cleCommune(p) {
  if ((p.type === 'resultats' || p.type === 'rendez-vous') && p.samedi) return p.type + ':' + p.samedi;
  if (p.type === 'fin-de-match' && p.match) return 'fin:' + p.match;
  if (p.type === 'story-jour') return 'story-jour:' + (p.jourMatchs || p.date);
  return p.id;
}
/** clé d'une case « Fait » : <clé commune>:<réseau> */
export const cleFait = (p, reseau) => cleCommune(p) + ':' + reseau;
/** une seule carte par clé commune, à l'heure la plus proche (la première dans l'ordre des jours) */
export function sansDoublons(jours) {
  const vus = new Set();
  return jours.map((j) => ({ ...j, pubs: j.pubs.filter((p) => { const k = cleCommune(p); if (vus.has(k)) return false; vus.add(k); return true; }) }));
}
export function etatDe(p, faits) {
  const s = sortiesDe(p); const faitSur = s.filter((r) => faits[cleFait(p, r)]);
  // une sortie facultative (story des résultats, vidéo reprise sur Facebook « si vous voulez ») ne manque pas pour dire « Fait »
  const requises = s.filter((r) => !(p.sorties && p.sorties[r] && p.sorties[r].facultatif));
  return { toutFait: requises.length > 0 && requises.every((r) => faits[cleFait(p, r)]), faitSur, total: s.length };
}
export const marquerFait = (p, reseau, oui) => oui ? Stock.ecrire('faits', cleFait(p, reseau), new Date().toISOString()) : Stock.effacer('faits', cleFait(p, reseau));

/** ce qu'il manque, en une ligne (« 1 score à taper », « 4 à 6 photos », « Rien : tout est prêt ») */
export function besoins(p, liste, reglages = {}, jour) {
  const b = [];
  const t = String(p.aTaper || '').trim();
  const scoreManquant = (m) => !m.retire && !m.score && peutTaper(m, jour);
  if (p.type === 'fin-de-match') {
    const m = liste.find((x) => x.cle === p.match);
    if (m && !m.score) b.push(peutTaper(m, jour) ? '1 score à taper' : 'Le score, après le match');
  } else if (/score/i.test(t) && !/^rien\b/i.test(t) && p.samedi) {
    const ms = duWeekend(liste, p.samedi).filter((m) => !m.retire);
    const n = ms.filter(scoreManquant).length;
    if (n) b.push(n + ' score' + (n > 1 ? 's' : '') + ' à taper sur ' + ms.length + ' matchs');
    else if (!ms.some((m) => m.score)) b.push('Les scores, après les matchs');
  } else if (p.type === 'resultats' && p.samedi) {
    const ms = duWeekend(liste, p.samedi).filter((m) => !m.retire); const n = ms.filter(scoreManquant).length;
    if (n) b.push(n + ' score' + (n > 1 ? 's' : '') + ' à taper sur ' + ms.length + ' matchs');
    else if (!ms.some((m) => m.score)) b.push('Les scores, après les matchs');
  } else if (p.type === 'rendez-vous' && p.samedi) {
    const n = duWeekend(liste, p.samedi).filter((m) => !m.retire && !m.heure).length;
    if (n) b.push(n + ' heure' + (n > 1 ? 's' : '') + ' à vérifier');
  } else if (/compte TikTok/i.test(t)) { if (!reglages['compte-tiktok']) b.push('Le nom du compte TikTok'); }
  else if (/3 lignes et un titre/i.test(t)) b.push('3 lignes et un titre');
  else if (/paniers sur 10/i.test(t)) b.push('Le nombre de paniers sur 10');
  else if (t && !/^rien\b/i.test(t) && !/^le prénom/i.test(t) && !/^les scores/i.test(t)) b.push(maj1(t.split(/[.;]/)[0].trim()).slice(0, 70));
  const md = mediasCourts(p.medias);
  if (md) b.push(md);
  return b.length ? b.join(' · ') : 'Rien : tout est prêt';
}
/** les photos ou vidéos attendues, en quelques mots ; rien si elles sont facultatives ou déjà faites */
export function mediasCourts(t) {
  t = String(t || '').trim();
  if (!t || /^(aucun|rien|déjà fait|facultatif)/i.test(t)) return '';
  const m = /(\d+\s*à\s*\d+|\d+)\s+(petites vidéos|vidéos?|photos?)/i.exec(t);
  if (m) return m[1].replace(/\s+/g, ' ') + ' ' + m[2];
  if (/vidéo/i.test(t)) return 'Des vidéos à filmer';
  return 'Des photos à prendre';
}
