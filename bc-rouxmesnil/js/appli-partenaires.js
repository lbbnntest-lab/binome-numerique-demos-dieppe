// Appli des publications du BCR : les 31 partenaires du club, le « Merci partenaire » et les 3 partenaires cités à chaque fin de match.
// Logique RECOPIÉE de js/merci-partenaires.js (table P, detailImage(), specImage()), sans la phrase sur la « page Partenaires »
// (l'appli n'est pas un site). Le tour des partenaires est gardé sur le téléphone (réglages « partenaire-suivant » et
// « tour-fin-de-match »), et n'avance que quand le club coche « Fait sur Facebook » : regarder ne fait pas sauter un partenaire.
// Métier et commune : seulement ceux des faits vérifiés (faits_verifies_bcr.md, liste des 31 partenaires) ; sinon rien, et le texte
// dit simplement que le partenaire soutient le club.
import { Stock } from './appli-stockage.js';
import { motsDiese, propre } from './appli-regles.js';

// [fichier du logo, nom, métier, commune, pluriel, commune?] : métier et commune seulement quand les faits vérifiés les donnent
export const PARTENAIRES = [
  ['commune-rouxmesnil', 'Commune de Rouxmesnil-Bouteilles', null, 'Rouxmesnil-Bouteilles', false, true],
  ['mekabulle', 'Mekabulle', 'graphiste illustratrice', null],
  ['chaumont', 'Michael Chaumont', 'boucherie, charcuterie et traiteur', 'Neuville-lès-Dieppe'],
  ['demare', 'SAS Demare Luc', 'charpente et menuiserie', 'Avremesnil'],
  ['proxi', 'Proxi Super', null, null],
  ['salon-m', 'Le salon M', 'coiffure mixte', 'Envermeu'],
  ['stadium', 'Sport Solidaire Stadium', null, null],
  ['abrafer', 'Abrafer', 'fer et métaux', null],
  ['diamant', 'SAS Diamant Fermetures', null, null],
  ['auchan', 'Auchan Dieppe', null, null],
  ['ligny-gaspary', 'Ligny-Gaspary Immobilier', null, null],
  ['dequesne', 'SAS Dequesne', 'paysagiste et élagueur', null],
  ['trianon', 'Le Trianon', 'bar', null],
  ['atelier', 'L\'atelier', 'coiffure mixte', 'Rouxmesnil-Bouteilles'],
  ['bigmat', 'BigMat Roger', null, null],
  ['wlc', 'WLC Automobiles', null, 'Martin-Église'],
  ['art-mony', 'Art Mony Pub', 'agence de publicité', null],
  ['ongles', 'Les Ongles en Gel in A.', null, null],
  ['hysope', 'Hysope Fleurs', null, 'Arques-la-Bataille'],
  ['leader', 'Leader actual emploi', null, null],
  ['bayeux', 'EURL Bayeux Maçonnerie', 'rénovation et carrelage', null],
  ['boulangerie-prieure', 'Boulangerie du Prieuré', null, 'Rouxmesnil-Bouteilles'],
  ['etria', 'Etria', null, null],
  ['eph', 'EPH publicité', null, null],
  ['bistrot-barrieres', 'Bistrot des Barrières', null, 'Dieppe'],
  ['franck-provost', 'Franck Provost', null, 'Dieppe'],
  ['brico-depot', 'Brico Dépôt', null, 'Dieppe'],
  ['samp', 'SAMP Services', 'mécanique de précision', null],
  ['carbon', 'Carbon Decor · Carbon Meta', null, null, true],
  ['regates', 'Les Régates', 'restaurant', 'Pourville'],
  ['feron', 'Boucherie charcuterie Feron', null, 'Dieppe (Janval)']
].map((x) => ({ slug: x[0], nom: x[1], metier: x[2], ville: x[3], pluriel: !!x[4] || /^Les /.test(x[1]), commune: !!x[5] }));
const mots = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((m) => m.length >= 5);
// le métier n'est écrit que s'il apprend quelque chose (« Boulangerie du Prieuré, boulangerie » serait redondant)
for (const p of PARTENAIRES) { const dans = mots(p.nom); if (p.metier && mots(p.metier).some((m) => dans.includes(m))) p.metier = null; }
PARTENAIRES.push(PARTENAIRES.shift());   // la commune (argent public) en dernier : le tour commence par un partenaire privé
const N = PARTENAIRES.length;
export const parNom = (nom) => PARTENAIRES.find((p) => p.nom === nom || p.slug === nom) || null;
export const logo = (p) => 'img/partenaires/' + p.slug + '.jpg';

const maj1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const min1 = (t) => t.charAt(0).toLowerCase() + t.slice(1);
function aLe(p) {
  const n = p.nom;
  if (p.commune) return 'à la commune de ' + n.slice(11);
  if (/^Les /.test(n)) return 'aux ' + n.slice(4);
  if (/^Le /.test(n)) return 'au ' + n.slice(3);
  if (/^L'/.test(n)) return 'à l\'' + n.slice(2);
  return 'à ' + n;
}
export function detailImage(p) {
  if (p.commune) return 'Commune · ' + p.ville;
  return [p.metier ? maj1(p.metier) : '', p.ville || ''].filter(Boolean).join(' · ');
}
const compteDe = (c) => { const t = String(c || '').trim().replace(/^@+/, ''); return t ? '@' + t : ''; };

/** le texte Facebook du merci, dans la voix du club (le nom du partenaire 2 fois au plus), 3 tournures à tour de rôle */
export function texteMerci(p, coeur, compte = '') {
  const rang = PARTENAIRES.indexOf(p), v = (rang < 0 ? 0 : rang) % 3, c = compteDe(compte);
  const L = ['🤝' + coeur + ' MERCI ' + aLe(p).toUpperCase() + ' ! ' + coeur + '🤝', ''];
  if (p.commune) L.push('La commune soutient le Basket Club de Rouxmesnil tout au long de la saison.');
  else if (p.metier) L.push(maj1(p.metier) + (p.ville ? ' à ' + p.ville : '') + ', partenaire' + (p.pluriel ? 's' : '') + ' du club cette saison.');
  else if (p.ville) L.push('À ' + p.ville + (p.pluriel ? ', ils soutiennent' : ', un partenaire qui soutient') + ' le club cette saison.');
  else L.push((p.pluriel ? 'Ils soutiennent' : 'Un partenaire qui soutient') + ' le club cette saison.');
  const eq = 'faire jouer toutes ses équipes, des plus jeunes aux seniors 🏀';
  L.push(v === 0 ? 'Grâce à ce soutien, le club peut ' + eq : v === 1 ? 'Ce soutien aide le club à ' + eq : 'C\'est grâce à ses partenaires que le club peut ' + eq);
  if (!p.commune) L.push(c ? (p.metier ? 'Allez découvrir son travail 👉 ' + c : 'Allez les découvrir 👉 ' + c) : 'Encore merci ' + aLe(p) + ' ! 🙌');
  L.push('', '💚🖤 ALLEZ LE BCR !');
  return propre(L.join('\n'));
}
/** le texte court pour Instagram (avec le compte du partenaire s'il est connu) et une ligne d'appel */
export function texteMerciInstagram(p, coeur, compte, hashtags) {
  const c = compteDe(compte);
  return propre('Merci ' + aLe(p) + ' pour ' + (p.pluriel ? 'leur' : 'son') + ' soutien ' + coeur + (c ? ' ' + c : '') + '\n' +
    (p.commune ? 'Le basket vit à Rouxmesnil grâce à vous 🏀' : 'Vous connaissez ? Dites-le en commentaire 💬') + '\n' +
    motsDiese(hashtags, ['#BCRouxmesnil', '#Rouxmesnil', '#Dieppe']).join(' '));
}
/** la carte du partenaire (spec de appli-cartes.js) */
export const specMerci = (p) => ({ type: 'partenaire', accroche: 'Merci à notre partenaire', nom: p.nom, detail: detailImage(p), cartouche: logo(p) });

// ---------- le tour, gardé sur le téléphone ----------
export async function suivant() { const i = +(await Stock.lire('reglages', 'partenaire-suivant')) || 0; return PARTENAIRES[((i % N) + N) % N]; }
/** aucun merci n'a encore été coché « Fait » sur ce téléphone (la suggestion du calendrier sert alors) */
export async function aucunMerci() { return (await Stock.lire('reglages', 'partenaire-suivant')) == null; }
/** le merci de ce partenaire est publié : le suivant de la liste devient le prochain proposé ; on retient le partenaire du jour */
export async function merciFait(p, jour) {
  const i = PARTENAIRES.indexOf(p); if (i < 0) return;
  await Stock.ecrire('reglages', 'partenaire-suivant', (i + 1) % N);
  if (jour) await Stock.ecrire('reglages', 'merci-du-jour', { date: jour, slug: p.slug });
}

/** « Merci à nos partenaires : X, Y et Z. » (fin de match), avec le bon article devant chaque nom */
function avecArticle(nom) {
  if (/^Commune de /.test(nom)) return 'la commune de ' + nom.slice(11);
  if (/^Les /.test(nom)) return 'les ' + nom.slice(4);
  if (/^Le /.test(nom)) return 'le ' + nom.slice(3);
  if (/^L'/.test(nom)) return min1(nom);
  return nom;
}
export function phraseMerci(ps) {
  const a = ps.map((p) => avecArticle(p.nom)); if (!a.length) return '';
  const l = a.length > 1 ? a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1] : a[0];
  return 'Merci à nos partenaires : ' + l + (/\.$/.test(l) ? '' : '.');
}
/** les 3 partenaires d'une fin de match : ceux déjà attribués à cette publication, sinon les 3 suivants du tour, sans le partenaire
 *  remercié le même jour (exclure : liste de slugs) */
export async function troisPour(idPub, exclure = []) {
  const deja = await Stock.lire('reglages', 'fin-partenaires:' + idPub);
  if (Array.isArray(deja) && deja.length) return deja.map((s) => parNom(s)).filter(Boolean);
  const t = +(await Stock.lire('reglages', 'tour-fin-de-match')) || 0;
  const out = []; for (let k = 0; out.length < 3 && k < N; k++) { const p = PARTENAIRES[(t + k) % N]; if (!exclure.includes(p.slug)) out.push(p); }
  return out;
}
/** la fin de match est publiée sur Facebook : ces 3 partenaires lui restent attachés, le tour avance jusqu'après le dernier cité */
export async function troisFaits(idPub, ps) {
  if (await Stock.lire('reglages', 'fin-partenaires:' + idPub)) return;
  await Stock.ecrire('reglages', 'fin-partenaires:' + idPub, ps.map((p) => p.slug));
  const der = PARTENAIRES.indexOf(ps[ps.length - 1]);
  const t = +(await Stock.lire('reglages', 'tour-fin-de-match')) || 0;
  await Stock.ecrire('reglages', 'tour-fin-de-match', der >= 0 ? (der + 1) % N : (t + ps.length) % N);
}
