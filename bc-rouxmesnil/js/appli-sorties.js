// Appli des publications du BCR : ce que produit chaque publication, réseau par réseau (« une saisie, partout »).
// Pour une publication et l'état de l'atelier, plan() rend les cartes (Facebook, Instagram, Story Instagram, TikTok) : texte prêt à
// coller, fichiers à fabriquer (clé + description), raison écrite quand il manque quelque chose (jamais une valeur inventée).
// fabriquer() dessine les fichiers d'une clé (affiches, carte de score, stories…) ; la vidéo est faite à part (appli-video.js).
// Les photos de la galerie ne partent jamais telles quelles : réduites pour Facebook, mises au format de la première image pour
// Instagram (appli-images.js, photoPour), ce qui efface aussi leurs informations de position.
import { MOIS, dateCourte, heureFr } from './appli-commun.js';
import * as M from './appli-matchs.js';
import * as P from './appli-publications.js';
import { regleScore, scoresCaches, themeDe, coeurDe, motsDiese, propre } from './appli-regles.js';
import * as WE from './appli-weekend.js';
import { texteFin, texteFinInstagram, specFin, specChangement } from './appli-score.js';
import { PARTENAIRES, parNom, texteMerci, texteMerciInstagram, specMerci } from './appli-partenaires.js';
import * as TX from './appli-textes.js';
import { afficheCanvas, storyTexte, versFichier, photoReduite, photoPour } from './appli-images.js';
import * as K from './appli-cartes.js';

const MOVEMBER_FIN = 'Le BCR soutient Movember : santé masculine, prévention, sensibilisation.';
export const NOMS_RESEAU = { facebook: 'Facebook', instagram: 'Instagram', story: 'Story Instagram', tiktok: 'TikTok' };
const nomsReseau = NOMS_RESEAU;
const imgs = (n) => n + ' image' + (n > 1 ? 's' : '');

/** le genre précis d'une publication (les articles et les stories d'annonce ont plusieurs formes) */
export function sousType(p) {
  if (p.type === 'article') return /Rétro/i.test(p.titre) ? 'retro' : /Bilan/i.test(p.titre) ? 'bilan' : 'raconter';
  if (p.type === 'story-annonce') return /TikTok/i.test(p.titre) ? 'story-tiktok' : 'story-ce-soir';
  return p.type;
}
/** mots-dièse Instagram d'une publication : ceux du calendrier, sinon ceux de la publication du même genre la plus proche */
function tagsDe(p, reseau = 'instagram') {
  const s = p.sorties && p.sorties[reseau];
  if (s && s.hashtags && s.hashtags.length) return motsDiese(s.hashtags);
  const cal = P.calendrier(); const L = ((cal && cal.publications) || []).filter((q) => q.type === p.type && q.sorties && q.sorties[reseau] && (q.sorties[reseau].hashtags || []).length);
  L.sort((a, b) => Math.abs(new Date(a.date) - new Date(p.date)) - Math.abs(new Date(b.date) - new Date(p.date)));
  const t = L[0] ? L[0].sorties[reseau].hashtags : null;
  // #Movember seulement sur ce qui parle de Movember (ligne éditoriale), jamais par voisinage dans le calendrier
  const movember = p.date <= '2026-11-30' && (/Movember/i.test(p.titre) || /^(rendez-vous|resultats)$/.test(p.type));
  return motsDiese((t || []).filter((x) => x !== '#Movember' || movember));
}
const estStoryInsta = (p) => !!(p.sorties && p.sorties.instagram && /story/i.test(p.sorties.instagram.format || ''));
const nomFichier = (p, quoi, i, n, ext = 'png') => 'bcr-' + quoi + '-' + p.date + (n > 1 ? '-' + (i + 1) : '') + '.' + ext;

/** les matchs concernés par une publication (pour « À taper » et pour l'interrupteur « Afficher le score ») */
export function matchsDe(p, E, App) {
  const st = sousType(p);
  if (st === 'fin-de-match') { const m = App.liste.find((x) => x.cle === (E.match || p.match)); return m ? [m] : []; }
  if ((st === 'resultats' || st === 'rendez-vous') && p.samedi) return M.duWeekend(App.liste, p.samedi).filter((m) => !m.retire);
  return [];
}
export const montrerInterrupteur = (p, E, App) => {
  const st = sousType(p);
  if (st === 'video-serie' || st === 'video') return (E.matchsVideo || []).some((m) => m.derby || (m.mineurs === 'oui' && m.nous !== '' && m.eux !== '' && Math.abs(m.nous - m.eux) >= 30)) || E.afficher;
  return st !== 'rendez-vous' && scoresCaches(matchsDe(p, E, App)).length > 0;
};
/** une vidéo des résultats, quand une publication des résultats part déjà sur Facebook le même jour : l'heure de celle-ci */
function resultatsLeMemeJour(p, App) {
  const r = P.publicationsDu(p.date, App.liste).find((q) => q.type === 'resultats');
  return r ? (r.heure || '') : null;
}

/**
 * Le plan des cartes : [{ reseau (clé de la case « Fait »), nom, story, texte, fichiers (clé), format, bloque, aide, video }]
 * + notes (lignes d'information au-dessus des cartes). Synchrone : aucun dessin ici.
 */
export function plan(p, E, App) {
  const st = sousType(p), cartes = [], notes = [], specs = {}; const c = coeurDe(p.date);
  const photos = E.medias.filter((m) => m.type.startsWith('image')).map((m) => m.fichier);
  const tous = E.medias.map((m) => m.fichier);
  const sorties = P.sortiesDe(p);
  const carte = (reseau, o) => cartes.push({ reseau, nom: nomsReseau[reseau], ...o });
  if (st === 'rendez-vous' || st === 'resultats') {
    const res = st === 'resultats';
    const w = WE.weekend(App.liste, p.samedi, E.afficher);
    if (!p.samedi || !w.ms.length) { notes.push('Aucun match ce week-end dans la liste des matchs.'); return { cartes: [], notes, specs }; }
    const b = WE.bilan(w);
    let bloque = '';
    if (res && !b.joues) bloque = 'Aucun score pour l\'instant : touchez « Taper les scores ».';
    if (res && b.joues && b.manquants) notes.push(b.manquants + (b.manquants > 1 ? ' scores manquent' : ' score manque') + ' : le texte parle des « premiers résultats » et ne montre que les scores connus.');
    if (!res) {
      const sh = w.ms.filter((m) => !m.t).length; if (sh) notes.push(sh + (sh > 1 ? ' matchs sans heure : ils sortent' : ' match sans heure : il sort') + ' avec « heure à confirmer ». Corrigez l\'heure si vous la connaissez.');
      const ac = w.ms.filter((m) => m.aConfirmer).length; if (ac) notes.push(ac + ' matchs à la maison se chevauchent (moins de 1 h 30 d\'écart) : touchez la salle de chacun pour la choisir, sinon ils sortent avec « salle à confirmer ».');
    }
    const aff = WE.affiches(w, res);
    specs.affichesFb = { liste: aff, photos, format: 'reduite' };
    specs.affichesIg = { de: 'affiches', liste: aff, photos, format: 'portrait' };
    const ligneTiktok = !res && /TikTok/.test(JSON.stringify((p.sorties.facebook || {}).valeurs || {})) && App.reglages['compte-tiktok'] ? '📱 Le BCR est aussi sur TikTok : ' + String(App.reglages['compte-tiktok']).replace(/^@?/, '@') : '';
    const n = aff.length + photos.length, ni = Math.min(20, n);
    if (sorties.includes('facebook')) carte('facebook', { texte: res ? WE.texteRes(w, { datePub: p.date }) : WE.texteRdv(w, { datePub: p.date, ligneTiktok }), fichiers: 'affichesFb', format: 'portrait', bloque, detail: 'Publication · ' + imgs(n) });
    if (sorties.includes('instagram')) carte('instagram', { texte: res ? WE.texteResInstagram(w, tagsDe(p), { datePub: p.date }) : WE.texteRdvInstagram(w, tagsDe(p), { datePub: p.date }), fichiers: 'affichesIg', format: 'portrait', bloque,
      detail: ni > 1 ? 'Publication · ' + ni + ' images à faire glisser' : 'Publication · 1 image',
      aide: ni > 1 ? 'Si Instagram n\'en prend qu\'une : touchez « Enregistrer dans le téléphone », puis dans Instagram, touchez + et choisissez les ' + ni + ' images dans l\'ordre.' : '' });
    if (sorties.includes('story')) {
      const ls = res ? WE.storiesRes(w) : WE.storiesRdv(w);
      if (ls.length) { specs.stories = { liste: ls }; carte('story', { story: true, texte: null, fichiers: 'stories', format: 'story', bloque, detail: res ? 'Story Instagram · la couverture et les scores' : 'Story Instagram · ' + imgs(ls.length) + ', les matchs à la maison' }); }
    }
  } else if (st === 'fin-de-match') {
    const m = App.liste.find((x) => x.cle === (E.match || p.match));
    let bloque = '';
    if (!m) bloque = 'Choisissez le match ci-dessus.';
    else if (!m.score) bloque = M.peutTaper(m, App.jour) ? 'Il manque le score de nos ' + M.libelle(m.equipe).replace(/^Seniors/, 'seniors') + ' : tapez-le ci-dessus.' : 'Le score se tape après le match (' + dateCourte(m.date) + (m.heure ? ', ' + heureFr(m.heure) : '') + ').';
    const parts = E.partenairesFin || [];
    const th = m ? themeDe(m.date).id : 'vert';
    if (m && m.score) {
      const sp = specFin(m, { afficher: E.afficher, partenaires: parts });
      specs.finFb = { carte: sp, theme: th, format: 'carre', photos, photosFormat: 'reduite' };
      specs.finIg = { carte: sp, theme: th, format: 'portrait', photos, photosFormat: 'portrait' };
      specs.storyFin = { carte: sp, theme: th, format: 'story', ligne: 'Toutes les infos sur notre page' };
    }
    const t = m && m.score ? texteFin(m, App.liste, { afficher: E.afficher, partenaires: parts, jour: App.jour }) : null;
    if (sorties.includes('facebook')) carte('facebook', { texte: t, fichiers: 'finFb', format: 'carre', bloque, detail: 'Publication · la carte de score' + (photos.length ? ' et ' + imgs(photos.length).replace(/images?/, (x) => x === 'image' ? 'photo' : 'photos') : '') });
    if (sorties.includes('instagram')) {
      if (estStoryInsta(p)) carte('instagram', { nom: 'Story Instagram', story: true, texte: null, fichiers: 'storyFin', format: 'story', bloque, detail: 'Story Instagram · la carte de score' });
      else carte('instagram', { texte: m && m.score ? texteFinInstagram(m, App.liste, { afficher: E.afficher, jour: App.jour, hashtags: tagsDe(p) }) : null, fichiers: 'finIg', format: 'portrait', bloque, detail: 'Publication · la carte de score' });
    }
    if (sorties.includes('story')) carte('story', { story: true, texte: null, fichiers: 'storyFin', format: 'story', bloque, detail: 'Story Instagram · la carte de score' });
  } else if (st === 'merci-partenaire') {
    const part = parNom(E.partenaire) || PARTENAIRES[0];
    const compte = App.reglages['compte-partenaire:' + part.slug] || '';
    const th = themeDe(p.date).id, sp = specMerci(part);
    specs.merciFb = { carte: sp, theme: th, format: 'carre', photos, photosFormat: 'reduite' };
    specs.merciIg = { carte: sp, theme: th, format: 'portrait', photos, photosFormat: 'portrait' };
    specs.storyMerci = { carte: sp, theme: th, format: 'story', compte: compte ? '@' + String(compte).replace(/^@+/, '') : '' };
    if (sorties.includes('facebook')) carte('facebook', { texte: texteMerci(part, c, compte), fichiers: 'merciFb', format: 'carre', detail: 'Publication · le logo du partenaire' });
    if (sorties.includes('instagram')) carte('instagram', { texte: texteMerciInstagram(part, c, compte, tagsDe(p)), fichiers: 'merciIg', format: 'portrait', detail: 'Publication · la même image' });
    carte('story', { story: true, texte: null, fichiers: 'storyMerci', format: 'story', detail: 'Story Instagram · la carte du partenaire',
      aide: compte ? 'Dans la story, touchez son nom de compte pour le relier : il pourra la partager.' : 'Dans la story, ajoutez son compte en bas (le texte « @ ») : il pourra la partager. Son compte se tape plus haut, une fois.' });
    if (/^(Le Trianon|Bistrot des Barrières)$/.test(part.nom)) notes.push('Pour ce partenaire : rien d\'alcoolisé à l\'image, jamais en vidéo.');
  } else if (st === 'raconter') {
    const R = E.raconter || {}; const fv = (p.sorties.facebook || {}).valeurs || {};
    const movember = /Movember/i.test(p.titre);
    const t = TX.texteRaconter({ titre: R.titre, l1: R.l1, l2: R.l2, l3: R.l3, coeur: c, finFixe: movember ? (fv.fin_fixe || MOVEMBER_FIN) : '', hashtagsFb: (p.sorties.facebook || {}).hashtags || [] });
    const bloque = t ? '' : 'Tapez le titre et la première ligne ci-dessus.';
    const th = themeDe(p.date).id;
    if (tous.length) { specs.photosFb = { fichiers: tous, format: 'reduite' }; specs.photosIg = { fichiers: tous, format: 'portrait' }; }
    else specs.carreArticle = { carte: { type: 'article', titre: TX.titrePropre(R.titre) || 'Vie du club', date: dateCourte(p.date).replace(/^\S+ /, '') + ' ' + MOIS[+p.date.slice(5, 7) - 1], pied: '' }, theme: th, format: 'carre' };
    const fb = tous.length ? 'photosFb' : 'carreArticle', ig = tous.length ? 'photosIg' : 'carreArticle', n = tous.length || 1;
    if (sorties.includes('facebook')) carte('facebook', { texte: t, fichiers: fb, format: tous.length ? 'photos' : 'carre', bloque, detail: tous.length ? 'Publication · ' + n + ' photo' + (n > 1 ? 's' : '') : 'Publication · une image à nos couleurs' });
    if (sorties.includes('instagram')) carte('instagram', { texte: TX.texteRaconterInstagram({ titre: R.titre, l1: R.l1, coeur: c, hashtags: tagsDe(p) }), fichiers: ig, format: tous.length ? 'photos' : 'carre', bloque, detail: n > 1 ? 'Publication · ' + Math.min(20, n) + ' photos à faire glisser' : 'Publication · 1 image' });
  } else if (st === 'retro') {
    const bloque = tous.length ? '' : 'Choisissez 2 à 5 photos anciennes ci-dessus.';
    specs.photosFb = { fichiers: tous, format: 'reduite' }; specs.photosIg = { fichiers: tous, format: 'portrait' };
    if (sorties.includes('facebook')) carte('facebook', { texte: TX.texteRetro({ annee: E.annee, coeur: c }), fichiers: 'photosFb', format: 'photos', bloque, detail: 'Publication · vos photos d\'avant' });
    if (sorties.includes('instagram')) carte('instagram', { texte: TX.texteRetroInstagram({ coeur: c, hashtags: tagsDe(p) }), fichiers: 'photosIg', format: 'photos', bloque, detail: 'Publication · les mêmes photos, à faire glisser' });
  } else if (st === 'bilan') {
    specs.photosFb = { fichiers: tous, format: 'reduite' };
    if (!tous.length) notes.push('Ajoutez la vidéo « 6 semaines en 30 secondes » depuis la galerie : elle part avec ce texte.');
    carte('facebook', { texte: TX.texteBilan({ phraseClub: E.phrase, coeur: c }), fichiers: 'photosFb', format: 'photos', detail: 'Publication · la vidéo du jour et ce texte' });
  } else if (st === 'anniversaires') {
    const ok = (E.prenoms || []).filter((x) => x.accord && !TX.prenomValide(x.t)).map((x) => x.t.trim());
    const mois = MOIS[+p.date.slice(5, 7) - 1];
    const t = TX.texteAnniversaires({ mois, prenoms: ok, coeur: c });
    specs.carreAnniv = { carte: { type: 'article', titre: 'Les anniversaires de ' + mois + ' au BCR', date: '', pied: 'Joyeux anniversaire !' }, theme: themeDe(p.date).id, format: 'carre' };
    carte('facebook', { texte: t, fichiers: 'carreAnniv', format: 'carre', bloque: t ? '' : 'Tapez au moins un prénom et cochez « Accord reçu ». Sans accord, le prénom ne sort pas.', detail: 'Publication · une image sans photo de personne' });
  } else if (st === 'story-jour') {
    const sam = p.samedi || M.samediDe(p.jourMatchs || p.date);
    const jour = p.jourMatchs || p.date;
    const w = sam ? WE.weekend(App.liste, sam, E.afficher) : { ms: [] };
    const ls = sam ? WE.storiesJour(w, jour, { veille: jour !== p.date }) : [];
    const bloque = ls.length ? '' : 'Aucun match à la maison ce jour-là dans la liste des matchs.';
    specs.storiesJour = { liste: ls };
    for (const r of ['instagram', 'facebook']) if ((p.reseaux || []).includes(r) || p.source !== 'calendrier') carte(r, { nom: 'Story ' + nomsReseau[r], story: true, texte: null, fichiers: 'storiesJour', format: 'story', bloque, detail: 'Story ' + nomsReseau[r] + ' · ' + (ls.length > 1 ? ls.length + ' images' : 'une image') });
  } else if (st === 'story-tiktok') {
    const compte = App.reglages['compte-tiktok'];
    const bloque = compte ? '' : 'Tapez d\'abord le nom du compte TikTok du club ci-dessus.';
    if (compte) specs.storyTiktok = { compte: String(compte).replace(/^@?/, '@'), theme: themeDe(p.date).id };
    for (const r of ['instagram', 'facebook']) carte(r, { nom: 'Story ' + nomsReseau[r], story: true, texte: null, fichiers: 'storyTiktok', format: 'story', bloque, detail: 'Story · « Le BCR est aussi sur TikTok »' });
  } else if (st === 'story-ce-soir') {
    specs.storyCeSoir = { photo: photos[0] || null, theme: themeDe(p.date).id };
    for (const r of ['instagram', 'facebook']) carte(r, { nom: 'Story ' + nomsReseau[r], story: true, texte: null, fichiers: 'storyCeSoir', format: 'story', detail: 'Story · « Ce soir »' });
  } else if (st === 'changement') {
    const ch = E.changement || {}; const m = App.liste.find((x) => x.cle === ch.cle);
    const c2 = m ? { ...ch, date: m.date, adv: m.derby ? M.libelle(m.derby.exterieur) : m.adv, equipe: m.equipe, coeur: coeurDe(m.date) } : null;
    const t = c2 ? TX.texteChangement(c2) : null;
    const bloque = !m ? 'Choisissez le match ci-dessus.' : !t ? 'Complétez le changement ci-dessus (nouvelle heure, salle ou précision).' : '';
    if (m && t) {
      const sp = specChangement(m, TX.ETIQ[ch.statut] || 'Changement', TX.lignesCarteChangement(c2)); const th = themeDe(m.date).id;
      specs.carreChg = { carte: sp, theme: th, format: 'carre' }; specs.storyChg = { carte: sp, theme: th, format: 'story', ligne: 'Toutes les infos sur notre page' };
    }
    carte('facebook', { texte: t, fichiers: 'carreChg', format: 'carre', bloque, detail: 'Publication · une image' });
    // Instagram : seulement la story (un report laissé dans le fil devient faux une fois le match joué)
    carte('story', { story: true, texte: null, fichiers: 'storyChg', format: 'story', bloque, detail: 'Story Instagram · la même carte' });
  } else if (st === 'video-serie' || st === 'video') {
    const v = E.video || {};
    const L = v.legendes || {};
    let ordre = st === 'video' ? ['tiktok', 'instagram', 'facebook'] : ['tiktok', 'instagram', 'facebook'].filter((r) => sorties.includes(r));
    if (E.x && /^resultats/.test(E.x.modele.id) && ordre.includes('facebook')) {
      const h = resultatsLeMemeJour(p, App);
      if (h != null) { ordre = ordre.filter((r) => r !== 'facebook'); notes.push('Facebook : les résultats partent déjà sur Facebook' + (h ? ' ' + P.heureProposee(h) : ' ce jour-là') + ', avec les affiches. La vidéo va sur TikTok et en Reel Instagram.'); }
    }
    for (const r of ordre) carte(r, { texte: L[r] || null, fichiers: 'video', format: 'video', video: true, detail: r === 'tiktok' ? 'Vidéo' : r === 'instagram' ? 'Reel · le même fichier' : 'Vidéo · le même fichier' + ((p.sorties.facebook || {}).facultatif ? ', si vous voulez' : ''),
      bloque: v.etat === 'pret' ? '' : 'La vidéo se prépare plus haut.' });
  }
  return { cartes, notes, specs };
}

// ---------- fabrication des fichiers d'une clé ----------
/** les photos de la galerie au format voulu, numérotées dans l'ordre */
async function photosPour(fichiers, format, p) {
  const out = []; let k = 0;
  for (const f of (fichiers || []).slice(0, 20)) { k++; out.push(f.type && f.type.startsWith('image') ? await photoPour(f, format, 'bcr-photo-' + p.date + '-' + k + '.jpg') : f); }
  return out;
}
const nomAffiche = (a, p, i) => 'bcr-' + (a.modele === 'couverture' ? (a.mode === 'res' ? 'resultats' : 'rendez-vous') : a.modele === 'resultats' ? 'resultats' : 'rendez-vous') + '-' + p.date + '-' + (i + 1) + '-' + a.nom + '.png';
/** dessine les fichiers d'une clé du plan ; rend [File] */
export async function fabriquer(cle, specs, p, deja) {
  const s = specs[cle];
  if (!s) return [];
  if (cle === 'affichesFb' || cle === 'affichesIg') {
    // les affiches sont dessinées une fois (clé « affichesFb ») ; Instagram reprend les mêmes fichiers
    let aff;
    if (cle === 'affichesIg' && deja) aff = (await deja('affichesFb')).slice(0, s.liste.length);
    else { aff = []; for (let i = 0; i < s.liste.length; i++) aff.push(await versFichier(await afficheCanvas(s.liste[i]), nomAffiche(s.liste[i], p, i))); }
    return aff.concat(await photosPour(s.photos, s.format, p));
  }
  if (cle === 'finFb' || cle === 'finIg' || cle === 'merciFb' || cle === 'merciIg' || cle === 'carreArticle' || cle === 'carreAnniv' || cle === 'carreChg') {
    const quoi = { finFb: 'fin-de-match', finIg: 'fin-de-match-instagram', merciFb: 'merci', merciIg: 'merci-instagram', carreArticle: 'article', carreAnniv: 'anniversaires', carreChg: 'changement' }[cle];
    const c = s.format === 'portrait' ? await K.portrait(s.carte, s.theme) : await K.carre(s.carte, s.theme);
    return [await versFichier(c, nomFichier(p, quoi, 0, 1))].concat(await photosPour(s.photos, s.photosFormat || 'reduite', p));
  }
  if (cle === 'storyFin' || cle === 'storyChg' || cle === 'storyMerci') {
    const c = await K.storyCarte(s.carte, s.theme, { ligne: s.ligne || '', compte: s.compte || '' });
    return [await versFichier(c, nomFichier(p, { storyFin: 'story-fin-de-match', storyChg: 'story-changement', storyMerci: 'story-merci' }[cle], 0, 1))];
  }
  if (cle === 'photosFb' || cle === 'photosIg') return photosPour(s.fichiers, s.format, p);
  if (cle === 'stories' || cle === 'storiesJour') {
    const out = [];
    for (let i = 0; i < s.liste.length; i++) {
      const x = s.liste[i]; const c = x.type === 'story-couv' ? await K.storyCouverture(x) : await K.storyLignes(x);
      out.push(await versFichier(c, nomFichier(p, cle === 'storiesJour' ? 'story-maison' : x.type === 'story-jour' ? 'story-rendez-vous' : 'story-resultats', i, s.liste.length)));
    }
    return out;
  }
  if (cle === 'storyTiktok') {
    const c = await storyTexte([{ t: 'LE BCR EST AUSSI', taille: 112 }, { t: 'SUR TIKTOK !', taille: 150, couleur: 'vif' }, { t: s.compte, taille: 92, italique: false, marge: 50 },
      { t: 'Les vidéos de la vie du club.', taille: 52, police: 'texte', marge: 40 }], { theme: s.theme });
    return [await versFichier(c, nomFichier(p, 'story-tiktok', 0, 1))];
  }
  if (cle === 'storyCeSoir') {
    const ph = s.photo ? await photoReduite(s.photo) : null;
    const c = await storyTexte([{ t: 'CE SOIR', taille: 190, couleur: 'vif' }, { t: 'TOURNOI MOVEMBER', taille: 116 }, { t: 'DÈS 19 H', taille: 120, marge: 30 },
      { t: 'SALLE ALEXANDRE-CHERUEL', taille: 72, italique: false, marge: 20 }, { t: 'Tournoi masculin, des U18 aux seniors', taille: 48, police: 'texte', marge: 30 }], { theme: s.theme, photo: ph });
    if (ph && ph.close) ph.close();
    return [await versFichier(c, nomFichier(p, 'story-ce-soir', 0, 1))];
  }
  return [];
}
/** une signature des entrées d'une clé : on ne redessine que si elle change */
export function signature(cle, specs) {
  const s = specs[cle]; if (!s) return '';
  const id = (f) => f ? (f.name + ':' + f.size + ':' + f.lastModified) : '';
  return JSON.stringify(s, (k, v) => v instanceof Blob ? id(v) : v) + (cle === 'affichesIg' ? '<' + signature('affichesFb', specs) : '');
}
export { regleScore };
