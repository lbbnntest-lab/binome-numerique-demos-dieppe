// Appli des publications du BCR : « Rendez-vous du week-end » et « Résultats du week-end ».
// Logique RECOPIÉE de js/rendez-vous.js (brut, WE, texteRdv, texteRes, affiches : même texte, même style que la page du club,
// mêmes affiches 1080 x 1350), mais sur la liste fusionnée de l'appli (appli-matchs.js) : un score tapé une fois, une heure ou une
// salle corrigée, un match retiré ou ajouté servent ici comme partout. rendez-vous.js n'est pas chargé (il construit son propre écran
// et ne voit pas les scores tapés). Différences voulues :
//  - la règle des scores est celle de l'appli (appli-regles.js : derby et gros écarts chez les jeunes sans le score, sauf
//    « Afficher le score ») ; un forfait (20 à 0) s'écrit « Victoire par forfait », sans le score ;
//  - un score manquant n'est jamais inventé : tant qu'il en manque, le texte parle des « premiers résultats » et ne liste que les
//    scores connus ; une heure manquante : « Heure à confirmer » ; deux matchs à la maison trop proches : « Salle à confirmer » ;
//  - les équipes portent le code du club (« DMU15-4 », « RFU18 Élite ») dans le texte Facebook et sur les affiches ;
//  - le thème (bleu en novembre…) est celui de la date du week-end, la ligne Movember celle de la date de publication ;
//  - texte court pour Instagram (3 à 5 mots-dièse).
import { MOIS, ajouterJours, jourSemaine } from './appli-commun.js';
import * as M from './appli-matchs.js';
import { regleScore, themeDe, coeurDe, motsDiese, propre } from './appli-regles.js';

export const codeEquipe = (id) => M.codeClub(id);
const PAR_AFFICHE = 8;
const SEP = '━━━━━━━━━━━━━━';
const LOGO_BCR = 'img/logo-bcr-160.webp';
const SALLE_CLUB = ['Salle Alexandre-Cheruel', 'Rouxmesnil'];
export const SALLE_A_CONFIRMER = 'Salle à confirmer (Cheruel ou Lefebvre)';
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const maj1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const maj = (t) => String(t).toUpperCase().replace(/(^|[^0-9A-Z])1ER(?![A-Z])/g, (m, a) => a + '1er');
const pl = (n, un, plus) => n + ' ' + (n > 1 ? plus : un);
const liste = (a) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
const jm = (d) => { const n = +d.slice(8, 10); return (n === 1 ? '1er' : n) + ' ' + MOIS[+d.slice(5, 7) - 1]; };
const dateLongue = (d) => JOURS[jourSemaine(d)] + ' ' + jm(d);
const prec = (id) => { const e = M.EQUIPES.find((x) => x.id === id); return e && e.prec ? e.prec : M.libelleCourt(id); };
const nomAdvCourt = (adv) => String(adv).replace(/^(US|AS|BC|CEP|ES|CA|AL|USO) /, '');
/** fin du tournoi Movember (ligne d'annonce dans les textes jusqu'à ce jour) */
export const TOURNOI_MOVEMBER = '2026-11-20';
export const LIGNE_TOURNOI = '🎗️ Tournoi Movember vendredi 20 novembre dès 19 h';

/** un match de la liste fusionnée au format de rendez-vous.js */
function versRdv(m, afficher) {
  const r = regleScore(m, afficher);
  const salle = m.salle ? [m.salle[0], String(m.salle[1] || '').replace('-Bouteilles', '')] : null;
  return {
    m, id: m.equipe, lib: codeEquipe(m.equipe), j: m.date, g: jourSemaine(m.date), t: m.heure || '', dom: !!m.dom,
    adv: m.derby ? 'BCR ' + prec(m.derby.exterieur) + ' (derby du club)' : m.adv, sig: m.sig || '', logo: m.derby ? LOGO_BCR : (m.logo || ''),
    s: m.score ? [m.score[0], m.score[1]] : null, der: !!m.derby, regle: r, salle, aConfirmer: !!m.salleAConfirmer, forfait: !!m.forfait,
    ord: M.EQUIPES.findIndex((e) => e.id === m.equipe)
  };
}
const parHeure = (a, b) => { const x = a.j + 'T' + (a.t || '99:99'), y = b.j + 'T' + (b.t || '99:99'); return x < y ? -1 : x > y ? 1 : a.ord - b.ord; };

/** le week-end (samedi) : { sam, dim, ms } avec les matchs gardés (retirés et mis de côté exclus), triés comme le club */
export function weekend(listeFusion, samedi, afficher = false) {
  const ms = M.duWeekend(listeFusion, samedi).filter((m) => !m.retire).map((m) => versRdv(m, afficher)).sort(parHeure);
  return { sam: samedi, dim: ajouterJours(samedi, 1), ms };
}

// ---------- libellés (rendez-vous.js) ----------
const joursDe = (w) => [w.sam, w.dim].filter((j) => w.ms.some((m) => m.j === j));
function datesTexte(w) {
  const js = joursDe(w); if (!js.length) return '';
  const an = js[0].slice(0, 4);
  if (js.length === 1) return maj1(dateLongue(js[0])) + ' ' + an;
  const a = js[0], b = js[1];
  return maj1(JOURS[jourSemaine(a)] + ' ' + (a.slice(5, 7) === b.slice(5, 7) ? (+a.slice(8) === 1 ? '1er' : +a.slice(8)) : jm(a)) + ' & ' + dateLongue(b)) + ' ' + an;
}
const heureTxt = (m) => m.t ? m.t.replace(':', 'h') : 'Heure à confirmer';
const salleTxt = (m) => m.aConfirmer ? SALLE_A_CONFIRMER : m.salle ? m.salle.filter(Boolean).join(' – ') : '';
const salleClubTxt = SALLE_CLUB[0] + ' – ' + SALLE_CLUB[1];
const aLaSalleDuClub = (m) => !m.aConfirmer && (!m.salle || salleTxt(m) === salleClubTxt);

function paragrapheTheme(th, datePub) {
  if (th.id === 'rose') return ['🎀 OCTOBRE ROSE – LE BCR SE MOBILISE ! 💗',
    'Durant tout le mois d\'octobre, le Basket Club de Rouxmesnil soutient la lutte contre le cancer du sein.',
    'Sur les terrains comme dans les tribunes, portons ensemble les couleurs d\'Octobre Rose ! 💗'];
  if (th.id === 'bleu') {
    const l = ['💙 MOVEMBER – ON PORTE LA MOUSTACHE AVEC PANACHE ! 💙',
      'En novembre, le Basket Club de Rouxmesnil porte la moustache avec panache pour Movember !'];
    if (datePub <= TOURNOI_MOVEMBER) l.push('🏆 Rendez-vous le vendredi 20 novembre à partir de 19h à la salle Alexandre-Cheruel : tournoi masculin (U18 à seniors), animations, vente de t-shirts et d’objets du club, restauration sur place.');
    return l;
  }
  return [];
}
const FIN = '💚🖤 ENSEMBLE, PLUS FORTS ! ALLEZ LE BCR ! 🏀';
const tete = (titre, coeur, emoji) => emoji + coeur + ' ' + titre + ' – BCR ' + coeur + emoji;
const groupes = (w, j) => { const x = w.ms.filter((m) => m.j === j); return { dom: x.filter((m) => m.dom), ext: x.filter((m) => !m.dom) }; };
/** la ligne Movember d'Instagram, seulement quand le mot-dièse #Movember est mis et avant le tournoi */
const ligneMovember = (tags, datePub) => tags.includes('#Movember') && (datePub || '') <= TOURNOI_MOVEMBER ? LIGNE_TOURNOI + '\n' : '';

// ---------- rendez-vous ----------
/** texte Facebook du rendez-vous, dans le style du club */
export function texteRdv(w, { datePub, ligneTiktok = '' } = {}) {
  const th = themeDe(w.sam);
  const js = joursDe(w), dom = w.ms.filter((m) => m.dom).length, ext = w.ms.length - dom; let L = [];
  L.push(tete('LES RENDEZ-VOUS DU WEEK-END', th.coeur, '🏀'));
  L.push('🔥 Un nouveau week-end de compétition attend nos équipes du Basket Club de Rouxmesnil !');
  L.push('📅 ' + datesTexte(w) + ' : ' + (dom ? pl(dom, 'match', 'matchs') + ' à domicile' : '') + (dom && ext ? ' et ' : '') + (ext ? pl(ext, 'match', 'matchs') + ' à l\'extérieur' : '') + '. Venez nous encourager ! 💪');
  for (const j of js) {
    const g = groupes(w, j);
    L.push(SEP); L.push('📅 ' + maj(dateLongue(j)));
    if (g.dom.length) {
      L.push('🏠 ' + (g.dom.length > 1 ? 'MATCHS' : 'MATCH') + ' À DOMICILE');
      // la salle du club en tête seulement si tous les matchs du jour y sont ; sinon chaque match dit sa salle
      const tousIci = g.dom.every(aLaSalleDuClub);
      if (tousIci) L.push('📍 ' + salleClubTxt);
      for (const m of g.dom) {
        L.push('🏀 ' + heureTxt(m) + ' | ' + m.lib); L.push('🆚 ' + m.adv);
        if (!tousIci) L.push('📍 ' + (aLaSalleDuClub(m) ? salleClubTxt : salleTxt(m)));
      }
    }
    if (g.ext.length) {
      L.push('🚌 ' + (g.ext.length > 1 ? 'MATCHS' : 'MATCH') + ' À L\'EXTÉRIEUR');
      for (const m of g.ext) { L.push('🏀 ' + heureTxt(m) + ' | ' + m.lib); L.push('🆚 ' + m.adv); const s = salleTxt(m); if (s) L.push('📍 ' + s); }
    }
  }
  L.push(SEP);
  const t = paragrapheTheme(th, datePub || w.sam);
  if (t.length) L = L.concat(t, '');
  if (ligneTiktok) L.push(ligneTiktok, '');
  L.push('📣 SUPPORTERS, ON COMPTE SUR VOUS !');
  L.push(dom ? '🔥 Venez nombreux encourager nos équipes à domicile' + (ext ? ', et une grosse pensée pour toutes nos équipes en déplacement !' : ' !')
    : '🔥 Une grosse pensée pour toutes nos équipes en déplacement, que nous encourageons de tout cœur !');
  L.push(FIN);
  return propre(L.join('\n'));
}
/** texte court pour Instagram (publication à faire glisser) */
export function texteRdvInstagram(w, hashtags, { datePub } = {}) {
  const c = coeurDe(w.sam), dom = w.ms.filter((m) => m.dom), ext = w.ms.length - dom.length;
  const tags = motsDiese(hashtags);
  const aConfirmer = dom.some((m) => m.aConfirmer);
  const autres = [...new Set(dom.filter((m) => !m.aConfirmer && m.salle && m.salle[0] !== SALLE_CLUB[0]).map((m) => m.salle[0].replace(/^Salle /, 'salle ')))];
  const lieux = dom.length && !aConfirmer ? ' (salle Alexandre-Cheruel' + (autres.length ? ', et ' + liste(autres) + ' pour ' + (autres.length > 1 ? 'certains' : 'un') : '') + ')' : '';
  const l2 = dom.length ? pl(dom.length, 'match', 'matchs') + ' à la maison' + lieux + (ext ? ', ' + ext + ' à l’extérieur' : '') + '.'
    : pl(ext, 'match', 'matchs') + ' à l’extérieur ce week-end.';
  return propre('Le programme du week-end est là 🏀' + c + '\n' + l2 + ' Tous les horaires sur les images 👉\n' + (dom.length ? 'On compte sur vous en tribune !' : 'On pousse derrière nos équipes !') + '\n' +
    ligneMovember(tags, datePub || w.sam) + tags.join(' '));
}

// ---------- résultats ----------
function issue(m) { return m.s[0] > m.s[1] ? true : m.s[0] < m.s[1] ? false : null; }
/** bilan des matchs joués (derbys à part : ni victoire ni défaite pour le club ; un forfait compte, et il est dit) */
export function bilan(w) {
  let v = 0, d = 0, forfaits = 0; const perdus = [];
  for (const m of w.ms) { if (!m.s || m.der) continue; const i = issue(m); if (m.forfait) forfaits++; if (i === true) v++; else if (i === false) { d++; perdus.push(m); } }
  return { v, d, n: v + d, forfaits, perdus, joues: w.ms.filter((m) => m.s).length, manquants: w.ms.filter((m) => !m.s).length, total: w.ms.length };
}
function ligneRes(m) {
  if (m.forfait && !m.der) return '🏀 ' + m.lib + ' | ' + (issue(m) ? 'Victoire par forfait de ' + nomAdvCourt(m.adv) + ' ✅' : 'Défaite par forfait contre ' + m.adv);
  if (m.der && !m.regle.montre) return '🏀 ' + m.lib + ' | Derby du club contre ' + m.adv.replace(/ \(derby du club\)$/, '') + ' : bravo aux deux équipes ! 💚';
  if (!m.regle.montre) return '🏀 ' + m.lib + ' | ' + (issue(m) === true ? 'Victoire du BCR contre ' + m.adv + ' ✅' : issue(m) === false ? 'Défaite contre ' + m.adv : 'Match nul contre ' + m.adv);
  return '🏀 ' + m.lib + ' | BCR ' + m.s[0] + ' - ' + m.s[1] + ' ' + m.adv + (issue(m) === true && !m.der ? ' ✅' : '');
}
/** « nos seniors garçons (RM3) et nos U18 filles (RFU18 Élite) » */
const nosEquipes = (ms) => liste([...new Set(ms.map((m) => 'nos ' + M.libelleCourt(m.id).replace(/^Seniors/, 'seniors') + ' (' + m.lib + ')'))]);
/** « 2 victoires sur 2 matchs ! », « 2 victoires sur les 3 scores connus », « 1 victoire et 1 défaite. » */
function phraseBilan(b) {
  const forf = b.forfaits ? ' (dont ' + (b.forfaits > 1 ? b.forfaits + ' par forfait' : '1 par forfait') + ')' : '';
  if (b.manquants) return pl(b.v, 'victoire', 'victoires') + forf + ' sur ' + (b.n > 1 ? 'les ' + b.n + ' scores connus' : 'le seul score connu') + (b.v === b.n ? ' !' : '.');
  return b.d === 0 ? pl(b.v, 'victoire', 'victoires') + forf + ' sur ' + pl(b.n, 'match', 'matchs') + ' !'
    : b.v === 0 ? pl(b.d, 'défaite', 'défaites') + '.' : pl(b.v, 'victoire', 'victoires') + forf + ' et ' + pl(b.d, 'défaite', 'défaites') + '.';
}
export function texteRes(w, { datePub } = {}) {
  const th = themeDe(w.sam);
  const b = bilan(w); let L = [];
  const connus = { ...w, ms: w.ms.filter((m) => m.s) };
  const js = joursDe(connus);
  L.push(tete('LES RÉSULTATS DU WEEK-END', th.coeur, '🏆'));
  L.push('🔥 Retour sur le week-end de compétition de nos équipes du Basket Club de Rouxmesnil !');
  // jamais « les N résultats » tant que les N scores ne sont pas tous tapés
  L.push('📅 ' + datesTexte(w) + ' : ' + (b.manquants ? 'les premiers résultats de nos équipes.' : 'nos ' + pl(w.ms.length, 'match', 'matchs') + ', match par match.'));
  for (const j of js) {
    const g = groupes(connus, j);
    L.push(SEP); L.push('📅 ' + maj(dateLongue(j)));
    if (g.dom.length) { L.push('🏠 ' + (g.dom.length > 1 ? 'MATCHS' : 'MATCH') + ' À DOMICILE'); g.dom.forEach((m) => L.push(ligneRes(m))); }
    if (g.ext.length) { L.push('🚌 ' + (g.ext.length > 1 ? 'MATCHS' : 'MATCH') + ' À L\'EXTÉRIEUR'); g.ext.forEach((m) => L.push(ligneRes(m))); }
  }
  L.push(SEP);
  if (b.n) {
    L.push('🔥 Bilan ' + (b.manquants ? 'pour l\'instant' : 'du week-end') + ' : ' + phraseBilan(b));
    if (b.d) L.push('💪 Courage à ' + nosEquipes(b.perdus) + ' : on se relève ensemble et on prépare la suite !');
  }
  if (b.manquants) L.push('⏳ Les autres scores arrivent très vite.');
  L.push('👏 Bravo à toutes nos équipes, et merci aux supporters et aux bénévoles !');
  const t = paragrapheTheme(th, datePub || w.dim);
  if (t.length) { L.push(SEP); L = L.concat(t); }
  L.push('');
  L.push(FIN);
  return propre(L.join('\n'));
}
export function texteResInstagram(w, hashtags, { datePub } = {}) {
  const b = bilan(w), c = coeurDe(w.sam), tags = motsDiese(hashtags);
  const acc = b.n ? (b.v ? phraseBilan(b).replace(/[.!]$/, '') + ' ce week-end 💪' : pl(b.n, 'match', 'matchs') + ' ce week-end : on garde la tête haute 💪')
    : 'Le week-end de nos équipes en images.';
  return propre((b.manquants ? 'Les premiers résultats du week-end ' : 'Les résultats du week-end ') + c + '\n' + acc + '\nLes scores sur les images 👉 Vous étiez dans les tribunes ? 💬\n' +
    ligneMovember(tags, datePub || w.dim) + tags.join(' '));
}

// ---------- affiches (rendez-vous.js : couverture, puis une par jour et par lieu ; résultats : une par jour) ----------
/** case de l'heure quand le match n'en a pas : remplacée sur l'affiche par « À CONFIRMER » sur deux lignes (appli-images.js) */
export const MARQUE_HEURE = '¤';
/** case du score d'un forfait : remplacée sur l'affiche par « FORFAIT » (appli-images.js) */
export const MARQUE_FORFAIT = 'F';
function ligneAff(m, res) {
  const l = { heure: m.t ? m.t.replace(':', 'H') : '', jourCourt: MARQUE_HEURE, code: m.lib, adv: m.adv, sig: m.sig, logo: m.logo,
    salle: res ? '' : m.dom && aLaSalleDuClub(m) ? '' : m.aConfirmer ? 'Salle à confirmer – Cheruel ou Lefebvre' : salleTxt(m) };
  if (res) {
    l.lieuTxt = m.dom ? 'À domicile' : 'À l\'extérieur';
    if (m.forfait && !m.der) { l.bcr = MARQUE_FORFAIT; l.ad = MARQUE_FORFAIT; l.v = issue(m); }
    else if (m.regle.montre) { l.bcr = m.s[0]; l.ad = m.s[1]; l.v = m.der ? null : issue(m); }
    else { l.bcr = ''; l.ad = ''; l.v = m.der ? null : issue(m); l.cache = m.der ? 'DERBY' : maj(m.regle.mot); }
  }
  return l;
}
function decoupe(lignes, n = PAR_AFFICHE) {
  if (lignes.length <= n) return [lignes];
  const k = Math.ceil(lignes.length / n), t = Math.ceil(lignes.length / k), r = [];
  for (let i = 0; i < k; i++) r.push(lignes.slice(i * t, (i + 1) * t));
  return r;
}
/** les affiches 1080 x 1350 (specs pour BCRExport), dans l'ordre de la publication */
export function affiches(w, res) {
  const th = themeDe(w.sam), dates = datesTexte(w), out = [];
  const ms = res ? w.ms.filter((m) => m.s) : w.ms;
  const ww = { sam: w.sam, dim: w.dim, ms };
  const js = joursDe(ww); const b = res ? bilan(ww) : null; const partiel = res && w.ms.some((m) => !m.s);
  let dom = 0, ext = 0; js.forEach((j) => { const g = groupes(ww, j); dom += g.dom.length; ext += g.ext.length; });
  out.push({ type: 'affiche', modele: 'couverture', mode: res ? 'res' : 'rdv', theme: th, dates, compte: res ? { v: b.v, n: b.n } : { dom, ext }, partiel,
    alt: (res ? (partiel ? 'Couverture : les premiers résultats du week-end, ' : 'Couverture : résultats du week-end, ') : 'Couverture : rendez-vous du week-end, ') + dates + '.', nom: 'couverture' });
  for (const j of js) {
    const g = groupes(ww, j);
    if (res) {
      const tous = g.dom.concat(g.ext).sort(parHeure), bj = bilan({ ms: tous });
      decoupe(tous.map((m) => ligneAff(m, true))).forEach((ls, i, a) => out.push({ type: 'affiche', modele: 'resultats', theme: th, titre: dateLongue(j), suite: a.length > 1 ? (i + 1) + '/' + a.length : '', lignes: ls,
        resume: bj.n ? pl(bj.v, 'victoire', 'victoires') + ' sur ' + bj.n : '', alt: 'Résultats du ' + dateLongue(j) + ', ' + pl(tous.length, 'match', 'matchs') + '.',
        nom: JOURS[jourSemaine(j)] + '-resultats' + (a.length > 1 ? '-' + (i + 1) : '') }));
    } else {
      for (const [lieu, l] of [['dom', g.dom], ['ext', g.ext]]) {
        if (!l.length) continue;
        decoupe(l.map((m) => ligneAff(m, false))).forEach((ls, i, a) => out.push({ type: 'affiche', modele: 'jour', theme: th, lieu, titre: dateLongue(j), suite: a.length > 1 ? (i + 1) + '/' + a.length : '',
          salleDom: salleClubTxt, lignes: ls, alt: maj1(dateLongue(j)) + ', matchs ' + (lieu === 'dom' ? 'à domicile' : 'à l\'extérieur') + ', ' + pl(l.length, 'match', 'matchs') + '.',
          nom: JOURS[jourSemaine(j)] + '-' + (lieu === 'dom' ? 'domicile' : 'exterieur') + (a.length > 1 ? '-' + (i + 1) : '') }));
      }
    }
  }
  return out;
}

// ---------- stories natives 1080 x 1920 (dessinées par appli-cartes.js) ----------
const ligneStory = (m, res) => ({ heure: m.t ? m.t.replace(':', ' h ').replace(/ h 00$/, ' h') : 'Heure à confirmer', equipe: M.libelle(m.id), adv: m.der ? m.adv.replace(/ \(derby du club\)$/, '') : m.adv,
  derby: m.der, dom: m.dom, salle: m.dom && !res ? (m.aConfirmer ? 'Salle à confirmer' : aLaSalleDuClub(m) ? '' : m.salle ? m.salle[0] : '') : '',
  score: res ? (m.forfait && !m.der ? (issue(m) ? 'Victoire par forfait' : 'Défaite par forfait') : m.der && !m.regle.montre ? 'Bravo aux deux équipes' : !m.regle.montre ? m.regle.mot : m.s[0] + ' - ' + m.s[1]) : '',
  v: res ? (m.der ? null : issue(m)) : null });
/** stories « à la maison » d'un jour (rendez-vous, story du samedi) : 8 matchs au plus par image */
export function storiesJour(w, jour, { veille = false } = {}) {
  const th = themeDe(w.sam); const dom = w.ms.filter((m) => m.j === jour && m.dom);
  return decoupe(dom.map((m) => ligneStory(m, false))).filter((ls) => ls.length).map((ls, i, a) => ({ type: 'story-jour', theme: th.id,
    titre: veille ? 'DEMAIN|À LA MAISON' : 'AUJOURD\'HUI|À LA MAISON', date: maj1(dateLongue(jour)), suite: a.length > 1 ? (i + 1) + '/' + a.length : '', lignes: ls }));
}
/** stories du rendez-vous : une par jour avec des matchs à la maison */
export function storiesRdv(w) {
  const th = themeDe(w.sam);
  return joursDe(w).filter((j) => w.ms.some((m) => m.j === j && m.dom)).flatMap((j) => storiesJour(w, j).map((s) => ({ ...s, theme: th.id, titre: 'À LA MAISON|CE WEEK-END' })));
}
/** stories des résultats : la couverture, puis les scores connus (8 lignes au plus par image) */
export function storiesRes(w) {
  const th = themeDe(w.sam); const b = bilan(w);
  const connus = w.ms.filter((m) => m.s);
  const couv = { type: 'story-couv', theme: th.id, titre: b.manquants ? 'LES PREMIERS|RÉSULTATS' : 'LES RÉSULTATS|DU WEEK-END', dates: datesTexte(w).replace(/ \d{4}$/, ''),
    compte: b.n ? (b.manquants ? phraseBilan(b).replace(/[.!]$/, '').replace(/^(\d+ victoires?)/, '$1') : pl(b.v, 'victoire', 'victoires') + ' sur ' + pl(b.n, 'match', 'matchs')) : '' };
  const scores = decoupe(connus.map((m) => ligneStory(m, true))).filter((ls) => ls.length).map((ls, i, a) => ({ type: 'story-scores', theme: th.id, titre: 'LES SCORES', date: datesTexte(w).replace(/ \d{4}$/, ''),
    suite: a.length > 1 ? (i + 1) + '/' + a.length : '', lignes: ls }));
  return [couv, ...scores];
}
