// Appli des publications du BCR : les matchs de toutes les équipes, et LA fonction qui fusionne
//   relevé officiel (js/donnees-ffbb.js, tel quel) + scores tapés + corrections + matchs ajoutés par le club.
// Tout le reste de l'appli (Cette semaine, Matchs, Publier, atelier) lit les matchs par fusion() : un score tapé une fois sert partout.
// Règles : 1. un score officiel l'emporte sur un score tapé (l'écart est signalé) ; 2. une correction du club l'emporte sur le
// relevé pour l'heure et la salle ; 3. un match retiré ne sort plus dans les publications mais reste visible (barré) dans Matchs ;
// 4. un derby (deux équipes du club l'une contre l'autre) n'apparaît qu'une fois ; une heure manquante reste « heure à confirmer ».
// Rien n'est inventé : un score manquant reste manquant.
import { Stock } from './appli-stockage.js';
import { aujourdhui, ajouterJours, jourSemaine, ecartJours, MOIS, maj1 } from './appli-commun.js';
import { CORRECTIONS_CLUB } from './appli-corrections-club.js';

// Les 19 équipes de championnat, dans l'ordre des listes (libellés repris de js/score-auto.js : base + précision).
export const EQUIPES = [
  ['rm3', 'seniors garçons', 'régionale 3'], ['prm', 'seniors garçons', 'pré-régionale'], ['dm3', 'seniors garçons', 'départementale 3'],
  ['dm6', 'seniors garçons', 'départementale 6'], ['rf2', 'seniors filles', 'régionale 2'], ['df2', 'seniors filles', 'départementale 2'],
  ['df3', 'seniors filles', 'départementale 3'], ['u21', 'U21 garçons', 'régionale'], ['u18f1', 'U18 filles', 'élite', 1],
  ['dfu18', 'U18 filles', 'équipe 2', 1], ['dmu18a', 'U18 garçons', 'équipe 1', 1], ['dmu18b', 'U18 garçons', 'équipe 2', 1],
  ['dmu18c', 'U18 garçons', 'équipe 3', 1], ['u15f', 'U15 filles', '', 1], ['dmu15a', 'U15 garçons', 'équipe 4', 1],
  ['dmu15b', 'U15 garçons', 'équipe 2', 1], ['u13f', 'U13 filles', '', 1], ['dmu13', 'U13 garçons', '', 1], ['u11', 'U11', '', 1]
].map(([id, base, prec, jeune]) => ({ id, base, prec, jeune: !!jeune }));
const PAR_ID = Object.fromEntries(EQUIPES.map((e) => [e.id, e]));
// LA table des noms d'équipe (une seule pour toute l'appli), deux colonnes :
//  - le code du club : celui de ses affiches et de son texte Facebook (sa voix). Publication du 3/11 : « DMU15-4 », « DMU15-2 »,
//    « RFU18 Élite » ; sigles vus sur ses affiches (faits_verifies_bcr.md) : RM3, PRM, DM3, DM6, RF2, DF2, DF3, RMU21, DFU18, DMU13,
//    DFU15, DFU13, DMU18G1, DMU18G2. « DMU18G3 » suit la même règle (à confirmer avec le club) ;
//  - le nom en clair (libelle() ci-dessous) : cartes de score, Instagram, TikTok, vidéos et écrans de l'appli (« U18 filles (élite) »).
export const CODES_CLUB = { rm3: 'RM3', prm: 'PRM', dm3: 'DM3', dm6: 'DM6', rf2: 'RF2', df2: 'DF2', df3: 'DF3', u21: 'RMU21', u18f1: 'RFU18 Élite',
  dfu18: 'DFU18', dmu18a: 'DMU18G1', dmu18b: 'DMU18G2', dmu18c: 'DMU18G3', u15f: 'DFU15', dmu15a: 'DMU15-4', dmu15b: 'DMU15-2', u13f: 'DFU13', dmu13: 'DMU13', u11: 'U11' };
export const codeClub = (id) => CODES_CLUB[id] || libelleCourt(id);
/** « U18 filles (élite) » */
export const libelle = (id) => { const e = PAR_ID[id]; return e ? maj1(e.base) + (e.prec ? ' (' + e.prec + ')' : '') : id; };
/** « U18 filles » */
export const libelleCourt = (id) => { const e = PAR_ID[id]; return e ? maj1(e.base) : id; };
export const estJeune = (id) => !!(PAR_ID[id] && PAR_ID[id].jeune);
/** l'équipe dont la fin de match est préparée chaque fois qu'elle joue (calendrier des publications) */
export const EQUIPE_A_LA_UNE = 'u18f1';

let F = null, SAL = null, derniereLecture = null, horsLigne = false, erreur = null;
const SALLES_DEFAUT = { domicile: ['Salle Alexandre-Cheruel', 'Rouxmesnil-Bouteilles'], matchs: {} };

// Les fichiers de données sont relus à l'ouverture, au retour au premier plan et au retour du réseau (sans recharger la page) :
// une balise <script> ne serait pas relue tant que l'appli reste ouverte.
// Le service worker répond tout de suite avec la copie gardée sur le téléphone (réseau faible au gymnase) ; il marque sa réponse
// « x-bcr-hors-ligne » quand le réseau a échoué, « x-bcr-lent » quand le réseau n'a pas répondu à temps (la copie se met à jour
// derrière). ?attendre=1 : la relecture de fond attend le réseau (jusqu'à 20 s) avant de prendre la copie.
async function lireScript(url, nom, attendre) {
  const r = await fetch(url + (attendre ? '?attendre=1' : ''), { cache: 'no-cache' });
  if (!r.ok) throw new Error('lecture ' + url + ' ' + r.status);
  const texte = await r.text();
  const fenetre = {};
  new Function('window', texte + '\n;')(fenetre);
  return { valeur: fenetre[nom], horsLigne: r.headers.get('x-bcr-hors-ligne') === '1', lent: r.headers.get('x-bcr-lent') === '1' };
}

/** lit (ou relit) les matchs ; rend { change, horsLigne, lent } ; ne jette jamais d'erreur */
export async function charger({ attendre = false } = {}) {
  const avant = F ? JSON.stringify(F) : null;
  try {
    const [d, s] = await Promise.all([lireScript('js/donnees-ffbb.js', 'BCR_FFBB', attendre), lireScript('js/salles-ffbb.js', 'BCR_SALLES', attendre).catch(() => null)]);
    if (d.valeur && d.valeur.equipes) { F = d.valeur; erreur = null; }
    if (s && s.valeur) SAL = s.valeur;
    horsLigne = d.horsLigne || (typeof navigator !== 'undefined' && navigator.onLine === false);
    lent = !horsLigne && d.lent;
    derniereLecture = Date.now();
  } catch (e) {
    erreur = String(e && e.message || e); horsLigne = true; lent = false;
  }
  return { change: !!avant && JSON.stringify(F) !== avant, premier: !avant && !!F, horsLigne, lent, disponible: !!F };
}
let lent = false;
export const disponible = () => !!F;
export const estHorsLigne = () => horsLigne;
export const estLent = () => lent;
export const derniereErreur = () => erreur;

/** « 3 novembre » (texte du relevé, jamais recalculé) */
export const releve = () => (F && F.releve) || '';
export const phraseReleve = () => (F ? 'Matchs relevés le ' + F.releve : 'Matchs pas encore sur ce téléphone');
/** date du relevé (AAAA-MM-JJ) : l'année est celle qui met le relevé dans les 12 mois avant aujourd'hui */
export function dateReleve(jour = aujourdhui()) {
  const m = /^(\d{1,2})(?:er)? (\S+)/.exec(releve()); if (!m) return null;
  const mois = MOIS.indexOf(m[2]); if (mois < 0) return null;
  const an = +jour.slice(0, 4);
  for (const a of [an, an - 1]) { const d = a + '-' + String(mois + 1).padStart(2, '0') + '-' + String(+m[1]).padStart(2, '0'); if (d <= jour) return d; }
  return null;
}
/** plus de 14 jours : avertissement en tête des listes */
export const releveAncien = (jour = aujourdhui()) => { const d = dateReleve(jour); return !!d && ecartJours(d, jour) > 14; };

function salleDe(id, date, dom) {
  const S = SAL || SALLES_DEFAUT;
  const s = S.matchs && S.matchs[id + '|' + date];
  if (s) return s;
  return dom ? (S.domicile || SALLES_DEFAUT.domicile) : null;
}

/** le nom de l'adversaire tel qu'on peut l'écrire en public (« Comité 76 (hors club) » est un libellé interne de la fédération) */
export const nomAdversaire = (adv) => { const a = String(adv || '').replace(/\s*\(hors club\)\s*/i, '').trim(); return /^Comité \d+$/i.test(a) ? 'Sélection du ' + a : a; };
/** les deux salles du club (une correction tapée avec ce nom reprend la ville) */
export const SALLES_CLUB = { cheruel: ['Salle Alexandre-Cheruel', 'Rouxmesnil-Bouteilles'], lefebvre: ['Salle Charles-Lefebvre', 'Rouxmesnil-Bouteilles'] };
const salleTapee = (t) => { const n = String(t || '').trim(); const k = Object.values(SALLES_CLUB).find((x) => x[0].toLowerCase() === n.toLowerCase()); return k ? [...k] : [n, '']; };
/** Deux matchs à la maison qui commencent à moins de 1 h 30 l'un de l'autre ne tiennent pas dans la même salle. Le club enchaîne
 *  lui-même ses matchs toutes les 1 h 30 à Cheruel (8/11 : 9 h 45 puis 11 h 15) : un écart de 1 h 45 mettrait en doute sa propre annonce. */
export const ECART_MEME_SALLE = 90;
const minutesDe = (h) => +h.slice(0, 2) * 60 + +h.slice(3, 5);

const estNous = (adv) => /^BC Rouxmesnil\b/i.test(adv || '');
const categorie = (id) => id.replace(/[a-c]$/, '');

/**
 * La liste fusionnée de tous les matchs (sauf « Exempt »), triée par date et heure.
 * stock = { scores, corrections } (Stock.tous) ; chaque match :
 * { cle, equipe, j, date, heure|null, dom, adv, logo, salle:[nom, ville]|null, salleCorrigee, heureCorrigee,
 *   officiel:[nous, eux]|null, tape:{nous, eux, le}|null, score:[nous, eux]|null, source:'officiel'|'club'|null, ecart:bool,
 *   retire, ajoute, derby:{ exterieur: id }|null, jeune }
 * Pour un derby, « nous » est l'équipe qui reçoit.
 */
export function fusion(stock = { scores: {}, corrections: {} }) {
  if (!F) return [];
  const sc = stock.scores || {}, co = stock.corrections || {};
  const brut = [];
  for (const e of EQUIPES) {
    const eq = F.equipes[e.id]; if (!eq) continue;
    for (const m of eq.matchs) if (m.adv !== 'Exempt') brut.push({ id: e.id, m });
  }
  // derbys : même jour, deux équipes du club de la même catégorie, l'une reçoit l'autre
  const vus = new Set(), derbys = new Map();
  for (const a of brut) {
    if (!estNous(a.m.adv) || !a.m.dom) continue;
    const b = brut.find((x) => x !== a && !x.m.dom && estNous(x.m.adv) && x.m.d.slice(0, 10) === a.m.d.slice(0, 10) && categorie(x.id) === categorie(a.id));
    if (b) { derbys.set(a, b); vus.add(b); }
  }
  const liste = [];
  for (const x of brut) {
    if (vus.has(x)) continue;
    const { id, m } = x; const date = m.d.slice(0, 10); const cle = id + ':' + m.j;
    const b = derbys.get(x);
    let officiel = m.s ? [m.s[0], m.s[1]] : null;
    if (!officiel && b && b.m.s) officiel = [b.m.s[1], b.m.s[0]];
    const c = co[cle] || {};
    const d = CORRECTIONS_CLUB[cle] || {};
    const t = sc[cle] || null;
    const heureReleve = m.d.length > 10 ? m.d.slice(11, 16) : null;
    const salleReleve = salleDe(id, date, m.dom);
    const S = SAL || SALLES_DEFAUT;
    const miseDeCote = !!d.aVerifier && !c.confirme && !c.retire;
    const r = {
      cle, equipe: id, j: m.j, date, heure: c.heure || heureReleve || d.heure || null, heureCorrigee: !!c.heure, heureClub: !c.heure && !heureReleve && !!d.heure,
      dom: m.dom, adv: b ? libelle(b.id) : nomAdversaire(m.adv), logo: m.logo || '', sig: m.sig,
      salle: c.salle ? salleTapee(c.salle) : salleReleve, salleCorrigee: !!c.salle,
      salleDefaut: !!m.dom && !c.salle && !(S.matchs && S.matchs[id + '|' + date]), salleAConfirmer: false,
      officiel, tape: t, retire: !!c.retire || miseDeCote, miseDeCote, aVerifier: !!d.aVerifier, ajoute: false,
      derby: b ? { exterieur: b.id, cle2: b.id + ':' + b.m.j } : null, jeune: estJeune(id)
    };
    completerScore(r);
    liste.push(r);
  }
  for (const [cle, a] of Object.entries(co)) {
    if (!cle.startsWith('ajout:') || !a || !a.equipe || !a.date) continue;
    const r = {
      cle, equipe: a.equipe, j: null, date: a.date, heure: a.heure || null, heureCorrigee: false, dom: !!a.dom, adv: a.adv || 'adversaire à préciser',
      logo: '', sig: '', salle: a.salle ? salleTapee(a.salle) : (a.dom ? (SAL || SALLES_DEFAUT).domicile : null), salleCorrigee: !!a.salle,
      salleDefaut: !!a.dom && !a.salle, salleAConfirmer: false,
      officiel: null, tape: sc[cle] || null, retire: !!a.retire, miseDeCote: false, aVerifier: false, ajoute: true, derby: null, jeune: estJeune(a.equipe)
    };
    completerScore(r); liste.push(r);
  }
  liste.sort((p, q) => (p.date + (p.heure || '99')).localeCompare(q.date + (q.heure || '99')) || EQUIPES.findIndex((e) => e.id === p.equipe) - EQUIPES.findIndex((e) => e.id === q.equipe));
  // salle à confirmer : deux matchs à la maison sans salle précisée, à moins de 1 h 30 l'un de l'autre le même jour (Cheruel ou Lefebvre)
  const parJour = new Map();
  for (const r of liste) if (r.salleDefaut && !r.retire && r.heure) { if (!parJour.has(r.date)) parJour.set(r.date, []); parJour.get(r.date).push(r); }
  for (const ms of parJour.values()) for (const a of ms) for (const b of ms) if (a !== b && Math.abs(minutesDe(a.heure) - minutesDe(b.heure)) < ECART_MEME_SALLE) a.salleAConfirmer = true;
  return liste;
}
function completerScore(r) {
  if (r.officiel) { r.score = r.officiel; r.source = 'officiel'; r.ecart = !!(r.tape && (r.tape.nous !== r.officiel[0] || r.tape.eux !== r.officiel[1])); }
  else if (r.tape) { r.score = [r.tape.nous, r.tape.eux]; r.source = 'club'; r.ecart = false; }
  else { r.score = null; r.source = null; r.ecart = false; }
  // 20 à 0 : c'est ainsi que la fédération note un forfait (RM3 contre Canteleu le 27/09 ; au classement, Canteleu : 5 joués, 0 victoire, 4 défaites)
  r.forfait = !!r.score && ((r.score[0] === 20 && r.score[1] === 0) || (r.score[0] === 0 && r.score[1] === 20));
}
/** un match mis de côté par défaut (pas dans l'annonce du club) */
export const misDeCote = (liste, samedi) => duWeekend(liste, samedi).filter((m) => m.miseDeCote);

/** tout ce qu'il faut pour fusionner, lu sur le téléphone */
export async function lireStock() {
  const [scores, corrections] = await Promise.all([Stock.tous('scores'), Stock.tous('corrections')]);
  return { scores, corrections };
}
export async function matchs() { return fusion(await lireStock()); }

// ---------- week-ends ----------
/** le samedi du week-end d'une date (samedi ou dimanche), sinon null */
export function samediDe(date) { const j = jourSemaine(date); return j === 6 ? date : j === 0 ? ajouterJours(date, -1) : null; }
/** le week-end montré par défaut : celui en cours le samedi et le dimanche ; lundi et mardi, celui qui vient de passer
 *  (les scores à taper) ; du mercredi au vendredi, le prochain (le rendez-vous) */
export function weekendParDefaut(jour = aujourdhui()) {
  const j = jourSemaine(jour);
  if (j === 6) return jour; if (j === 0) return ajouterJours(jour, -1);
  if (j === 1 || j === 2) return ajouterJours(jour, -(j + 1));
  return ajouterJours(jour, 6 - j);
}
export const duWeekend = (liste, samedi) => liste.filter((m) => m.date === samedi || m.date === ajouterJours(samedi, 1));
/** les samedis des week-ends qui ont au moins un match, dans l'ordre */
export const weekends = (liste) => [...new Set(liste.map((m) => samediDe(m.date)).filter(Boolean))].sort();
/** matchs d'une équipe (un derby compte pour les deux équipes) */
export const deLEquipe = (liste, id) => liste.filter((m) => m.equipe === id || (m.derby && m.derby.exterieur === id));
/** ce qu'il faut savoir du classement d'une équipe : lignes [rang, nom, pts, joués, gagnés, perdus, écart, estBCR] */
export const classement = (id) => (F && F.equipes[id] && F.equipes[id].cl) || [];
/** un match est-il joué (on peut taper son score) ? le jour même ou avant */
export const peutTaper = (m, jour = aujourdhui()) => m.date <= jour;

// ---------- enregistrer ce que tape le club ----------
export async function garderScore(cle, nous, eux) {
  await Stock.ecrire('scores', cle, { nous, eux, le: new Date().toISOString() });
}
export const oublierScore = (cle) => Stock.effacer('scores', cle);
export async function corriger(cle, changement) {
  const c = Object.assign({}, (await Stock.lire('corrections', cle)) || {}, changement);
  // un match « à vérifier » (pas dans l'annonce du club) que le club garde : il est confirmé
  if (CORRECTIONS_CLUB[cle] && CORRECTIONS_CLUB[cle].aVerifier && changement.retire === false) c.confirme = true;
  if (changement.retire === true) delete c.confirme;
  for (const k of Object.keys(c)) if (c[k] === '' || c[k] == null || c[k] === false) delete c[k];
  if (Object.keys(c).length) await Stock.ecrire('corrections', cle, c); else await Stock.effacer('corrections', cle);
}
export async function ajouterMatch(m) {
  const tous = await Stock.tous('corrections');
  let n = 1; while (tous['ajout:' + n]) n++;
  await Stock.ecrire('corrections', 'ajout:' + n, { equipe: m.equipe, adv: m.adv, date: m.date, heure: m.heure || '', dom: !!m.dom, salle: m.salle || '' });
  return 'ajout:' + n;
}
export const retirerAjout = (cle) => Stock.effacer('corrections', cle);

/** un score tapé est-il plausible ? (nombre entier de 0 à 250) */
export const scoreValide = (v) => /^\d{1,3}$/.test(String(v).trim()) && +v <= 250;
