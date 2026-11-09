// Appli des publications du BCR : LES règles communes à toutes les sorties (Facebook, Instagram, story, vidéo).
// 1. Le score (décision du fondateur du 07/11) : pour un match de mineurs avec 30 points d'écart ou plus, et pour un derby entre
//    deux équipes du club, toutes les sorties écrivent « Victoire » (ou « Défaite », « Derby ») sans le score ; l'interrupteur
//    « Afficher le score » de l'atelier permet au club de le montrer, pour cette publication seulement. Une seule fonction : regleScore().
// 2. Le cœur et les couleurs du mois (octobre rose, novembre bleu Movember, sinon vert et noir), pris à la date du week-end.
// 3. Les mots-dièse : 5 au plus (règle d'Instagram), jamais en double.
// 4. Le contrôle des textes avant copie : aucun trou, aucun « undefined », jamais le mot « site ».
import { estJeune } from './appli-matchs.js';

export const ECART_JEUNES = 30;
/** équipes où jouent des mineurs (U11 à U18 ; les U21 peuvent en compter, comme dans le moteur vidéo) */
export const avecMineurs = (id) => estJeune(id) || id === 'u21';

/**
 * Comment montrer le score d'un match (liste fusionnée de appli-matchs.js).
 * Rend { connu, montre, mot, raison } : mot = « Victoire » | « Défaite » | « Match nul » | « Derby » ; raison = 'derby' | 'ecart' | null.
 */
export function regleScore(m, afficher = false) {
  if (!m || !m.score) return { connu: false, montre: false, mot: '', raison: null };
  const [a, b] = m.score; const mot = a > b ? 'Victoire' : a < b ? 'Défaite' : 'Match nul';
  if (m.derby) return { connu: true, montre: !!afficher, mot: 'Derby', raison: 'derby' };
  if (avecMineurs(m.equipe) && Math.abs(a - b) >= ECART_JEUNES) return { connu: true, montre: !!afficher, mot, raison: 'ecart' };
  return { connu: true, montre: true, mot, raison: null };
}
/** les matchs d'une publication dont le score est caché par défaut (pour proposer « Afficher le score ») */
export const scoresCaches = (ms) => (ms || []).filter((m) => regleScore(m).raison);

/** couleurs du mois d'une date (AAAA-MM-JJ) : thème des affiches (export-facebook.js) et cœur des textes */
export function themeDe(date) {
  const m = +String(date).slice(5, 7);
  if (m === 10) return { id: 'rose', fond: '#d8186f', accent: '#ff8cc0', nom: 'Octobre rose', emb: 'ruban', coeur: '💗' };
  if (m === 11) return { id: 'bleu', fond: '#1f66c9', accent: '#7db8ff', nom: 'Movember', emb: 'moustache', coeur: '💙' };
  return { id: 'vert', fond: '#1f7a3f', accent: '#46c46f', nom: '', emb: 'ballon', coeur: '💚' };
}
export const coeurDe = (date) => themeDe(date).coeur;
/** fond de nuit des stories, assorti au thème */
export const NUITS = { bleu: '#030a22', rose: '#1e030d', vert: '#020503' };

/** 3 à 5 mots-dièse, jamais plus de 5, jamais en double */
export function motsDiese(liste, defaut = ['#basket', '#BCRouxmesnil', '#Rouxmesnil', '#Dieppe', '#Normandie']) {
  const L = (liste && liste.length ? liste : defaut).map((x) => String(x).trim()).filter((x) => /^#\S+$/.test(x));
  return [...new Set(L)].slice(0, 5);
}

/** Les défauts d'un texte prêt à copier (liste vide = bon). */
export function defautsTexte(t) {
  const d = []; t = String(t == null ? '' : t);
  if (!t.trim()) d.push('texte vide');
  if (/\bsites?\b/i.test(t)) d.push('le mot « site »');
  if (/undefined|\bnull\b|NaN|\[object/i.test(t)) d.push('une valeur absente');
  if (/\[\s*\]|\{[^}]*\}/.test(t)) d.push('un trou à remplir');
  if (/—/.test(t)) d.push('un tiret cadratin');
  if (/(^|\s)(à|contre|face à)\s*[,.!?]/.test(t) || /\s{3,}\S/.test(t.replace(/\n/g, ' ').replace(/ {2}/g, ' '))) d.push('une phrase à trou');
  return d;
}
/** petit nettoyage commun : espaces doubles, lignes vides en trop, jamais de tiret cadratin */
export const propre = (t) => String(t || '').replace(/—/g, '–').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
