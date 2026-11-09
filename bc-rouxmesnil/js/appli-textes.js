// Appli des publications du BCR : les textes « à taper » (changement de match, raconter, anniversaires, rétro, bilan).
// Logique RECOPIÉE de js/publications.js (texteChangement, premiereLigne, ETIQ) et de js/articles.js (phrase, titreDe, recit),
// sans « Toute la vie du club est à retrouver sur cette page » ni rien qui parle d'un site. Le titre de « Raconter » est demandé à
// part (articles.js le coupait à 70 signes au milieu d'une phrase). Rien n'est inventé : une ligne vide n'écrit rien.
import { MOIS, jourSemaine, heureFr } from './appli-commun.js';
import { motsDiese, propre } from './appli-regles.js';
import { premiereLigne } from './appli-score.js';

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const dateLongue = (d) => { const n = +d.slice(8, 10); return JOURS[jourSemaine(d)] + ' ' + (n === 1 ? '1er' : n) + ' ' + MOIS[+d.slice(5, 7) - 1]; };

// ---------- articles.js ----------
export function phrase(t) {
  t = String(t || '').replace(/\s+/g, ' ').trim(); if (!t) return '';
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(t) ? t : t + '.';
}
export const recit = (t) => String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/).map(phrase).filter(Boolean).join(' ');
export const titrePropre = (t) => { t = String(t || '').replace(/\s+/g, ' ').trim().replace(/[.,;:\s]+$/, ''); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; };

/** « Raconter » : titre + 3 lignes (ce qui s'est passé, quand et où, le merci) ; finFixe et mots-dièse selon le calendrier */
export function texteRaconter({ titre, l1, l2, l3, coeur, finFixe = '', hashtagsFb = [] }) {
  const t = titrePropre(titre); if (!t || !String(l1 || '').trim()) return null;
  const corps = [(String(l2 || '').trim() ? phrase(l2) + ' ' : '') + recit(l1), String(l3 || '').trim() ? phrase(l3) : '', finFixe].filter(Boolean).join('\n\n');
  return propre(t + (/[!?]$/.test(t) ? ' ' : ' ') + coeur + '\n\n' + corps + (hashtagsFb.length ? '\n\n' + hashtagsFb.join(' ') : ''));
}
export function texteRaconterInstagram({ titre, l1, coeur, hashtags }) {
  const t = titrePropre(titre); if (!t || !String(l1 || '').trim()) return null;
  const premiere = recit(l1).split(/(?<=[.!?…])\s/)[0];
  return propre(t + ' ' + coeur + '\n' + premiere + '\n' + motsDiese(hashtags).join(' '));
}

// ---------- rétro (calendrier, 16/12) ----------
export function texteRetro({ annee, coeur }) {
  const a = /^\d{4}$/.test(String(annee || '').trim()) ? ' · ' + String(annee).trim() : '';
  return propre('📸 Rétro BCR' + a + ' ' + coeur + '\nPetits et grands pour le plaisir du ballon depuis 1949.\nVous y étiez ? Racontez-nous en commentaire !');
}
export const texteRetroInstagram = ({ coeur, hashtags }) => propre('Rétro BCR 📸 Depuis 1949 ' + coeur + '\n' + motsDiese(hashtags).join(' '));

// ---------- bilan de l'automne (calendrier, 20/12) ----------
export function texteBilan({ phraseClub, coeur }) {
  const p = String(phraseClub || '').trim();
  return propre('Merci pour cet automne ' + coeur + (p ? ' ' + phrase(p) : '') + '\nNos seniors et nos U18 filles élite reprennent le week-end du 9-10 janvier. Bonnes fêtes à toute la famille du BCR ! 🏀');
}

// ---------- anniversaires (calendrier, 2/12) : seulement les prénoms avec accord ----------
export function texteAnniversaires({ mois, prenoms, coeur }) {
  const L = (prenoms || []).map((x) => String(x || '').trim()).filter(Boolean);
  if (!L.length) return null;
  const l = L.length > 1 ? L.slice(0, -1).join(', ') + ' et ' + L[L.length - 1] : L[0];
  return propre('🎂 Les anniversaires de ' + mois + ' au BCR ! 🎉\nJoyeux anniversaire à ' + l + ' ! ' + coeur + '\nToute la famille du BCR vous souhaite une belle journée.');
}
/** un seul prénom (un seul mot ; trait d'union permis : « Marie-Lou ») : jamais de nom de famille, ni d'âge, ni de date */
export function prenomValide(t) {
  t = String(t || '').trim();
  if (!t) return 'vide';
  if (/\d/.test(t)) return 'Le prénom seulement, sans âge ni date.';
  if (/\s/.test(t)) return 'Un seul prénom. Pour un prénom composé, mettez un trait d\'union (Marie-Lou).';
  if (!/^\p{L}[\p{L}'’-]*\p{L}$|^\p{L}$/u.test(t)) return 'Le prénom seulement, avec des lettres.';
  if (t.length > 30) return 'Un prénom plus court, s\'il vous plaît.';
  return '';
}

// ---------- changement de match (publications.js) ----------
export const ETIQ = { reporte: 'Reporté', annule: 'Annulé', horaire: 'Horaire modifié', salle: 'Salle modifiée', forfait: 'Forfait', autre: 'Changement' };
export function libelleChangement(c) {
  if (c.statut === 'reporte') return 'Reporté ' + (c.nouvelleDate ? 'au ' + dateLongue(c.nouvelleDate) + (c.nouvelleHeure ? ', ' + heureFr(c.nouvelleHeure) : '') : ', date à fixer');
  if (c.statut === 'horaire') return c.nouvelleHeure ? 'Nouvel horaire : ' + heureFr(c.nouvelleHeure) : 'Horaire modifié';
  if (c.statut === 'salle') return c.salle ? 'Salle : ' + c.salle : 'Salle modifiée';
  if (c.statut === 'autre') return c.autre ? 'Changement : ' + c.autre : 'Changement';
  return ETIQ[c.statut] || 'Changement';
}
/** texte du changement ; null s'il manque ce qui est indispensable (nouvelle heure, salle, précision) */
export function texteChangement(c) {
  if (c.statut === 'horaire' && !c.nouvelleHeure) return null;
  if (c.statut === 'salle' && !String(c.salle || '').trim()) return null;
  if (c.statut === 'autre' && !String(c.autre || '').trim()) return null;
  const match = 'Le match du ' + dateLongue(c.date) + ' contre ' + c.adv;
  const p = c.statut === 'reporte' ? match + ' est reporté' + (c.nouvelleDate ? ' au ' + dateLongue(c.nouvelleDate) + (c.nouvelleHeure ? ', ' + heureFr(c.nouvelleHeure) : '') + '.' : ' ; la nouvelle date sera communiquée dès qu\'elle sera fixée.')
    : c.statut === 'annule' ? match + ' est annulé.'
    : c.statut === 'horaire' ? match + ' change d\'horaire : début à ' + heureFr(c.nouvelleHeure) + '.'
    : c.statut === 'salle' ? match + ' se jouera à : ' + String(c.salle).trim() + '.'
    : c.statut === 'forfait' ? match + ' n\'aura pas lieu (forfait).'
    : match + ' : ' + String(c.autre).trim() + '.';
  return propre('⚠️ CHANGEMENT DE MATCH ⚠️\n\n🏀 ' + premiereLigne(c.equipe) + '\n' + p + (String(c.motif || '').trim() ? '\nMotif : ' + String(c.motif).trim().replace(/\.$/, '') + '.' : '') +
    '\n\nMerci de votre compréhension ' + (c.coeur || '💚'));
}
/** les lignes du bas de la carte : la nouvelle date (ou l'heure, la salle), puis le motif */
export function lignesCarteChangement(c) {
  const L = [];
  if (c.statut === 'reporte') L.push('Nouvelle date : ' + (c.nouvelleDate ? dateLongue(c.nouvelleDate) + ', ' + (c.nouvelleHeure ? heureFr(c.nouvelleHeure) : 'heure à confirmer') : 'à confirmer'));
  else if (c.statut === 'horaire' && c.nouvelleHeure) L.push('Nouvel horaire : ' + heureFr(c.nouvelleHeure));
  else if (c.statut === 'salle' && c.salle) L.push('Nouvelle salle : ' + String(c.salle).trim());
  else if (c.statut === 'autre' && c.autre) L.push(String(c.autre).trim());
  if (String(c.motif || '').trim()) L.push('Motif : ' + String(c.motif).trim().replace(/\.$/, ''));
  return L;
}
