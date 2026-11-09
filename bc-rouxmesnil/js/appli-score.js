// Appli des publications du BCR : la « fin de match » (un match, son score).
// Logique RECOPIÉE de js/score-auto.js (EQ, contexte, bilanApres, suiteTexte, textePhrases), sur la liste fusionnée de l'appli :
// le score tapé par le club (ou officiel) sert ici, dans les résultats du dimanche et dans la vidéo.
// Différences voulues : la règle des scores de l'appli (appli-regles.js) ; un forfait (20 à 0) s'écrit « Victoire par forfait », sans
// le score ni « large victoire » ; le bilan et le rang ne s'écrivent que s'ils se déduisent des données relevées (un score tapé n'est
// pas encore dans le classement : on n'écrit pas de rang) ; le texte Facebook prend la voix du club (ouverture en capitales,
// émojis, « ALLEZ LE BCR ! »), comme ses rendez-vous et ses résultats ; la carte est dessinée par appli-cartes.js (thème du mois).
import { MOIS, jourSemaine, heureFr } from './appli-commun.js';
import * as M from './appli-matchs.js';
import { regleScore, coeurDe, motsDiese, propre } from './appli-regles.js';
import { phraseMerci, logo } from './appli-partenaires.js';

// niveau de chaque équipe (le nom de l'équipe, lui, vient de la table unique de appli-matchs.js)
const EQ = {
  rm3: { niv: 'Régionale 3' }, prm: { niv: 'Pré-régionale' }, dm3: { niv: 'Départementale 3' }, dm6: { niv: 'Départementale 6' },
  rf2: { niv: 'Régionale 2', fem: true }, df2: { niv: 'Départementale 2', fem: true }, df3: { niv: 'Départementale 3', fem: true },
  u21: { niv: 'Régionale' }, u18f1: { niv: 'Élite régionale', fem: true }, dfu18: { niv: 'Départementale', fem: true },
  dmu18a: { niv: 'Départementale 4' }, dmu18b: { niv: 'Départementale 4' }, dmu18c: { niv: 'Départementale 4' },
  u15f: { niv: 'Départementale', fem: true }, dmu15a: { niv: 'Départementale 4' }, dmu15b: { niv: 'Départementale 4' },
  u13f: { niv: 'Départementale', fem: true }, dmu13: { niv: 'Départementale 4' }, u11: { niv: 'Départementale' }
};
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const maj1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const majT = (t) => String(t).toUpperCase();
const dateLongue = (d) => { const n = +d.slice(8, 10); return JOURS[jourSemaine(d)] + ' ' + (n === 1 ? '1er' : n) + ' ' + MOIS[+d.slice(5, 7) - 1]; };
const nous = (id) => 'nos ' + M.libelle(id).replace(/^Seniors/, 'seniors');
const nosCourt = (id) => 'nos ' + M.libelleCourt(id).replace(/^Seniors/, 'seniors');
const nomCourt = (adv) => String(adv).replace(/^(US|AS|BC|CEP|ES|CA|AL|USO) /, '');
function sigle(nom) {
  const m = String(nom).split(/[\s-]+/);
  if (/^[A-Z]{2,5}$/.test(m[0])) return m[0];
  return m.filter((x) => /^[A-ZÉ]/.test(x)).map((x) => x.charAt(0)).join('').slice(0, 4) || String(nom).slice(0, 3).toUpperCase();
}

/** contexte d'un match (bilan avant le match, rang) : seulement ce qui se déduit des données relevées, sinon rien */
function contexte(m, liste) {
  const c = { coh: false, v: 0, d: 0, rang: null, tete: false, sommet: false, choc: false };
  const cl = M.classement(m.equipe); const lignes = cl.filter((r) => r[7] === 1);
  if (lignes.length !== 1 || m.derby) return c;                 // poule où deux équipes du club figurent : on n'invente pas
  const ligne = lignes[0];
  const sienne = M.deLEquipe(liste, m.equipe).filter((y) => !y.ajoute);
  const officiels = sienne.filter((y) => y.source === 'officiel');
  const avant = sienne.filter((y) => !y.derby && (y.date + (y.heure || '')) < (m.date + (m.heure || '')));
  c.coh = ligne[3] === officiels.length && avant.every((y) => y.score);
  if (!c.coh) return c;
  for (const y of avant) { if (y.score[0] > y.score[1]) c.v++; else if (y.score[0] < y.score[1]) c.d++; }
  const dernier = m.source === 'officiel' && officiels.every((y) => y.date <= m.date);
  if (dernier) {
    c.rang = ligne[0];
    c.tete = ligne[0] === 1 && cl.length > 1 && cl[1][2] < ligne[2];
    const adv = cl.find((r) => r[1] === m.adv && r[7] !== 1);
    if (adv) { c.choc = c.d === 0 && c.v > 0 && m.score[0] > m.score[1] && adv[5] === 1 && adv[4] > 0; c.sommet = ligne[0] <= 2 && adv[0] <= 2; }
  }
  return c;
}
const rangPhrase = (c) => c.rang ? (c.rang === 1 ? 'l\'équipe est en tête de sa poule' : 'l\'équipe est ' + c.rang + 'e de sa poule') : '';
function bilanApres(c, gagne) {
  const v = c.v + (gagne ? 1 : 0), n = c.v + c.d + 1, L = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
  const nl = L[n] || String(n);
  if (n === 1) return 'première victoire de la saison';
  return v === n ? nl + ' matchs, ' + (L[v] || v) + ' victoires' : (v === 1 ? 'première' : ['', '', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'septième', 'huitième', 'neuvième'][v] || v + 'e') + ' victoire en ' + nl + ' matchs';
}
/** le prochain match de l'équipe (à partir d'aujourd'hui), ou null */
function prochain(m, liste, jour) {
  return M.deLEquipe(liste, m.equipe).filter((y) => !y.retire && y.cle !== m.cle && (y.date + (y.heure || '')) > (m.date + (m.heure || '')) && y.date >= jour)[0] || null;
}
/** « Prochain match : samedi 21 novembre à 15 h, à la maison contre USO Mondeville 2. » */
export function prochainMatch(m, liste, jour) {
  const n = prochain(m, liste, jour); if (!n) return '';
  return 'Prochain match : ' + dateLongue(n.date) + (n.heure ? ' à ' + heureFr(n.heure) : '') + ', ' + (n.dom ? 'à la maison contre ' : 'à l\'extérieur contre ') + (n.derby ? M.libelle(n.derby.exterieur) : n.adv) + '.';
}

/** la phrase du score (faits seulement), sans ouverture ni signature */
export function phraseFin(m, liste, { afficher = false } = {}) {
  if (!m || !m.score) return null;
  const e0 = EQ[m.equipe] || {}; const r = regleScore(m, afficher);
  const [b, a] = m.score; const e = b - a, adv = nomCourt(m.adv), s = b + ' à ' + a, inv = b + '-' + a;
  const n = nous(m.equipe), nMaj = maj1(n), salle = m.dom ? 'à domicile' : 'à l\'extérieur';
  if (m.derby) {
    return r.montre ? 'Derby du club entre ' + n + ' et ' + nous(m.derby.exterieur) + ' : ' + s + '. Bravo aux deux équipes !'
      : 'Derby du club entre ' + n + ' et ' + nous(m.derby.exterieur) + ' : bravo aux deux équipes !';
  }
  const c = contexte(m, liste), rg = rangPhrase(c), serie = c.coh ? bilanApres(c, e > 0) : '';
  const fin = (parts) => { const p = parts.filter(Boolean).join(', '); return p ? ' : ' + p + '.' : '.'; };
  if (m.forfait) return e > 0 ? 'Victoire par forfait de ' + adv + ' pour ' + n + fin([serie, rg]) : 'Défaite par forfait pour ' + n + ' contre ' + adv + '.';
  if (e > 0) {
    if (!r.montre) return 'Belle victoire pour ' + n + ' face à ' + adv + ' ' + salle + fin([serie]);
    if (c.choc) return 'Le choc des ' + (e0.fem ? 'invaincues' : 'invaincus') + ' est pour nous' + (e <= 5 ? ', au bout du suspense' : '') + ' ! ' + nMaj + ' battent ' + adv + ' ' + s + ' ' + salle + ' et restent sans défaite' + fin([serie, c.tete ? 'et ' + (e0.fem ? 'seules' : 'seuls') + ' en tête de la poule' : '']);
    if (b >= 100) return 'Plus de 100 points ' + salle + ' ! ' + nMaj + ' s\'imposent ' + s + fin([serie, rg]);
    if (e <= 5) return 'Victoire au bout du suspense pour ' + n + ', ' + s + ' face à ' + adv + ' ' + salle + fin([serie, rg]);
    if (e >= 20 && !M.estJeune(m.equipe)) return 'Large victoire pour ' + n + ' contre ' + adv + ', ' + s + ' ' + salle + fin([serie, rg]);
    return nMaj + ' s\'imposent ' + s + ' face à ' + adv + ' ' + salle + fin([serie, rg]);
  }
  if (e < 0) {
    if (!r.montre) return 'Match difficile pour ' + n + ' face à ' + adv + '. On garde la tête haute et on se remet au travail.';
    if (c.coh && c.d === 0 && c.v > 0) return 'Première défaite de la saison pour ' + n + ', face à ' + adv + ' (' + inv + ')' + (c.sommet ? ' dans le match au sommet de la poule' : '') + '.' + (rg ? ' ' + maj1(rg) + '.' : '');
    if (e >= -5) return 'Défaite de peu pour ' + n + ' face à ' + adv + ' (' + inv + '). Rien n\'est perdu pour la suite.';
    return 'Défaite pour ' + n + ' face à ' + adv + ' (' + inv + '). On se remet au travail pour le prochain match.';
  }
  return r.montre ? 'Match nul entre ' + n + ' et ' + adv + ', ' + b + ' partout.' : 'Match nul entre ' + n + ' et ' + adv + '.';
}
/** l'ouverture du texte, dans la voix du club : « 🏀💙 VICTOIRE DE NOS U18 FILLES ! 💙🏀 » */
function ouverture(m, coeur) {
  const [b, a] = m.score; const q = majT(nosCourt(m.equipe));
  const t = m.derby ? 'DERBY DU CLUB ENTRE ' + q + ' !' : b > a ? 'VICTOIRE DE ' + q + ' !' : b < a ? 'MATCH DIFFICILE POUR ' + q : 'MATCH NUL POUR ' + q;
  return '🏀' + coeur + ' ' + t + ' ' + coeur + '🏀';
}

/** le texte Facebook de la fin de match (faits seulement, voix du club) ; null si le score manque */
export function texteFin(m, liste, { afficher = false, partenaires = [], jour } = {}) {
  if (!m || !m.score) return null;
  const coeur = coeurDe(m.date);
  const su = prochainMatch(m, liste, jour || m.date), me = phraseMerci(partenaires);
  return propre([ouverture(m, coeur), '', phraseFin(m, liste, { afficher }), '', su ? '📅 ' + su : '', me ? '🤝 ' + me : '', '', '💚🖤 ALLEZ LE BCR !'].join('\n'));
}
/** le texte Instagram : la phrase, une ligne d'appel (le prochain match, ou les tribunes), 3 à 5 mots-dièse */
export function texteFinInstagram(m, liste, { afficher = false, jour, hashtags = [] } = {}) {
  if (!m || !m.score) return null;
  const n = prochain(m, liste, jour || m.date);
  const appel = n ? 'Prochain match ' + dateLongue(n.date).replace(/ (\d+|1er) \S+$/, '') + (n.heure ? ' ' + heureFr(n.heure) : '') + (n.dom ? ', à la maison : venez nombreux ! 📣' : ', à l\'extérieur 🚌') : 'Vous étiez dans les tribunes ? 💬';
  return propre(phraseFin(m, liste, { afficher }) + ' ' + coeurDe(m.date) + '\n' + appel + '\n' + motsDiese(hashtags).join(' '));
}

/** la carte de score (spec de appli-cartes.js) */
export function specFin(m, { afficher = false, partenaires = [] } = {}) {
  const e = EQ[m.equipe] || {}; const r = regleScore(m, afficher);
  const quand = maj1(dateLongue(m.date)) + (m.heure ? ', ' + heureFr(m.heure) : '');
  const adv = m.derby ? 'BCR ' + (M.EQUIPES.find((x) => x.id === m.derby.exterieur) || {}).prec : m.adv;
  const [b, a] = m.score; const forfait = m.forfait && !m.derby;
  return {
    type: 'match', equipe: M.libelle(m.equipe), niv: e.niv || '', issue: forfait ? (b > a ? 'Victoire par forfait' : 'Défaite par forfait') : r.mot === 'Derby' ? 'Derby' : r.mot,
    vict: b > a && !m.derby, bcr: r.montre && !forfait ? b : '', ad: r.montre && !forfait ? a : '', adv, sig: m.derby ? 'BCR' : (m.sig || sigle(m.adv)),
    logo: m.derby ? 'img/logo-bcr-160.webp' : m.logo ? 'img/logos/' + m.logo : '', quand, lieu: m.dom ? 'à domicile' : 'à l\'extérieur', parts: partenaires.map(logo)
  };
}
/** la carte d'un changement de match (même carte, sans score : « Reporté », « Annulé »… ; nouvelle date et motif en bas) */
export function specChangement(m, etiquette, lignesBas = []) {
  const e = EQ[m.equipe] || {};
  return { type: 'match', equipe: M.libelle(m.equipe), niv: e.niv || '', issue: etiquette, vict: false, bcr: '', ad: '',
    adv: m.derby ? 'BCR ' + (M.EQUIPES.find((x) => x.id === m.derby.exterieur) || {}).prec : m.adv, sig: m.derby ? 'BCR' : (m.sig || sigle(m.adv)),
    logo: m.derby ? 'img/logo-bcr-160.webp' : m.logo ? 'img/logos/' + m.logo : '',
    quand: 'Match du ' + dateLongue(m.date) + (m.heure ? ', ' + heureFr(m.heure) : ''), lieu: m.dom ? 'à domicile' : 'à l\'extérieur', lignesBas: lignesBas.filter(Boolean), parts: [] };
}
/** « Nos U18 filles (RFU18 Élite) » : la première ligne d'un changement, avec le code du club (texte Facebook) */
export const premiereLigne = (id) => maj1(nosCourt(id)) + ' (' + M.codeClub(id) + ')';
