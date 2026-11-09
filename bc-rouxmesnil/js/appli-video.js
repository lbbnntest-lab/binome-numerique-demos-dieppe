// Appli des publications du BCR : le pont vers le moteur vidéo (js/tiktok-studio.js, js/tiktok-voix.js, importés tels quels).
// La vidéo 1080 x 1920 se monte dans le téléphone, avec la voix de synthèse, à partir des photos et vidéos choisies dans la galerie
// et des matchs de l'appli (liste fusionnée : un score tapé une fois sert aussi ici). Le même fichier sert pour TikTok, les Reels
// Instagram et la vidéo Facebook. Valeurs et légende : valeursPour() et legendeFinale() de js/tiktok-atelier.js (sans son écran).
// Voix : moteur lancé avec appli/voix-worker.js (copie dans le périmètre de l'appli), sinon la voix ne marcherait pas sans réseau.
import DONNEES from './tiktok-donnees.js';
import { valeursPour, legendeFinale } from './tiktok-atelier.js';
import { esc, maj1, heureFr, joursWeekend, MOIS, ajouterJours } from './appli-commun.js';
import * as M from './appli-matchs.js';
import { avecMineurs, motsDiese, propre } from './appli-regles.js';

export const MODELES = Object.fromEntries(DONNEES.modeles.map((m) => [m.id, m]));
const CATS = DONNEES.listes.categories;                                   // même ordre que M.EQUIPES (19 équipes)
const VOIX_EQ = {}; for (const p of DONNEES.publications) for (const m of p.matchs || []) if (m.cle && m.voix_equipe) VOIX_EQ[m.cle] = m.voix_equipe;
VOIX_EQ.dmu15a = 'nos U15 garçons, équipe 4';   // le club l'appelle équipe 4 (DMU15-4, publication du 3/11), comme la table des noms
const DEPART = DONNEES.depart_defaut || '2026-11-09';
const CHAMPS_MATCHS = new Set(['liste_matchs_modifiable', 'scores_par_match', 'score_un_match', 'ajout_match', 'choix_match', 'associer_photos', 'curseur']);
let MOTEUR = null;
export async function moteur() {
  if (!MOTEUR) { const [s, v] = await Promise.all([import('./tiktok-studio.js'), import('./tiktok-voix.js')]); MOTEUR = { S: s.BCRStudio, V: v.BCRVoix }; }
  return MOTEUR;
}
const workerUrl = () => new URL('appli/voix-worker.js', document.baseURI).href;

// Vidéos à la demande (tuile « Vidéo ») : la base est le dernier exemple du calendrier vidéo, mais ses textes datés ne sont JAMAIS
// repris tels quels (« 12 et 13 décembre », « En janvier, on remet ça » sur les résultats du 7-8 novembre). Les modèles dont les
// textes ne valent que pour un jour précis (premier match en élite, derby du 5/12, compte à rebours du tournoi, manche 3 du défi…)
// ne sont pas proposés à la demande ; les autres reçoivent des textes recalculés ou neutres (adapterLibre).
const PAS_A_LA_DEMANDE = new Set(['resultats-match-a-retenir', 'resultats-tableau', 'programme-domicile-exterieur', 'programme-match-a-ne-pas-rater',
  'programme-affiche', 'special-compte-a-rebours-ce-soir', 'defi-dix-lancers', 'defi-vous-avez-choisi', 'special-bilan-30s']);
const SEULEMENT_EN_NOVEMBRE = new Set(['special-qui-est-le-plus']);
const APRES_LE_TOURNOI = new Set(['special-tournoi-micro-en-tribune']);
/** les vidéos à la demande, par série (nom de la vidéo d'abord, la série sert de groupe) */
export function choixVideos(jour = '2026-11-09') {
  const vus = new Map();
  for (const p of DONNEES.publications) vus.set(p.modele, p);
  return [...vus.values()].filter((p) => MODELES[p.modele] && !PAS_A_LA_DEMANDE.has(p.modele)
    && !(SEULEMENT_EN_NOVEMBRE.has(p.modele) && jour.slice(0, 7) !== '2026-11') && !(APRES_LE_TOURNOI.has(p.modele) && !(jour >= '2026-11-20' && jour <= '2026-11-30')))
    .map((p) => ({ modele: p.modele, titre: p.titre.replace(/^Joker · /, '').replace(/^[^·]*· /, ''), serie: MODELES[p.modele].serie }));
}
/** la vidéo d'une publication : { p (calendrier vidéo), modele, date } */
export function videoDe(pub, modeleChoisi) {
  if (pub.type === 'video-serie') {
    const ref = pub.sorties && pub.sorties.tiktok && pub.sorties.tiktok.ref_tiktok;
    const p = DONNEES.publications[ref]; if (!p) return null;
    return { p, modele: MODELES[p.modele], date: pub.date };
  }
  const id = modeleChoisi || pub.modele; if (!id || !MODELES[id]) return null;
  const base = [...DONNEES.publications].reverse().find((q) => q.modele === id);
  return { p: { ...base, valeurs: { ...(base.valeurs || {}) }, matchs: null, date: pub.date }, modele: MODELES[id], date: pub.date, libre: true };
}
const nomCourt = (adv) => String(adv || '').replace(/^(US|AS|BC|CEP|ES|CA|AL|USO) /, '');
/** le samedi du week-end dont parle une vidéo (résultats : le dernier joué ; programme : le prochain) */
export function samediVideo(x, App) {
  if (x.p.matchs && x.p.matchs.length) return M.samediDe(x.p.matchs[0].date);
  const liste = App.liste.filter((m) => !m.retire); const ws = M.weekends(liste);
  return estResultats(x) ? ws.filter((s) => s <= x.date).pop() || null : ws.find((s) => M.duWeekend(liste, s).some((m) => m.date >= x.date)) || null;
}
/** une vidéo à la demande : les textes datés sont recalculés pour le week-end des matchs, ou remplacés par des textes neutres */
export function adapterLibre(x, App) {
  if (!x || !x.libre) return x;
  const v = x.p.valeurs; const sam = samediVideo(x, App); const id = x.modele.id;
  const jw = sam ? joursWeekend(sam) : ''; const dates = sam ? jw.replace(/^Samedi /, '').replace(' et dimanche ', ' et ') : '';
  const neutre = 'Bravo à tous, et merci aux supporters !';
  if (id === 'resultats-scores-qui-tombent') Object.assign(v, { surtitre: jw || 'Ce week-end', intro_voix: jw ? jw + ' : ' : 'Ce week-end, ', suite_voix: neutre, legende_sans_victoire: 'Bravo à toutes nos équipes, et merci aux supporters !' });
  if (id === 'resultats-chiffre') v.suite_voix = neutre;
  if (id === 'resultats-carnet') { v.phrase_legende = ''; v.prochain = 'samedi'; }
  if (id === 'resultats-coup-de-sifflet') {
    const m = App.liste.filter((y) => !y.retire && y.equipe === M.EQUIPE_A_LA_UNE && y.date <= x.date).pop();
    if (m) v.heros_adversaire_voix = nomCourt(m.adv); else delete v.heros_adversaire_voix;
  }
  if (id === 'panier-de-la-semaine') { if (dates) v.dates = dates; else delete v.dates; }
  if (id === 'programme-planning' && x.date >= '2026-11-20') delete v.rappel_evenement;
  if (id === 'gens-table-de-marque' && x.date >= '2026-11-20') delete v.voix_fin;
  x.samedi = sam;
  return x;
}
export const champsDuModele = (x) => (x.modele.champs || []).filter((c) => !CHAMPS_MATCHS.has(c.type));
export const utiliseMatchs = (x) => (x.modele.champs || []).some((c) => /^(liste_matchs_modifiable|scores_par_match|score_un_match)$/.test(c.type));
const unSeulScore = (x) => (x.modele.champs || []).some((c) => c.type === 'score_un_match');
const estResultats = (x) => /^resultats|^joker-mot/.test(x.modele.id);

/** les matchs de la vidéo, au format du moteur, depuis la liste de l'appli */
export function matchsPour(x, App, afficher) {
  if (!utiliseMatchs(x)) return null;
  const liste = App.liste.filter((m) => !m.retire);
  let ms = [];
  const refs = (x.p.matchs || []).map((m) => m.cle + ':' + m.journee);
  if (unSeulScore(x)) {
    const k = refs[0]; let m = k && liste.find((y) => y.cle === k);
    if (!m) m = liste.filter((y) => y.equipe === M.EQUIPE_A_LA_UNE && y.date <= x.date).pop();
    ms = m ? [m] : [];
  } else {
    let sam = null;
    if (x.p.matchs && x.p.matchs.length) sam = M.samediDe(x.p.matchs[0].date);
    if (!sam) {
      const ws = M.weekends(liste);
      sam = estResultats(x) ? ws.filter((s) => s <= x.date).pop() : ws.find((s) => M.duWeekend(liste, s).some((m) => m.date >= x.date));
    }
    ms = sam ? M.duWeekend(liste, sam) : [];
  }
  const une = new Set((x.p.matchs || []).filter((m) => m.une).map((m) => m.cle + ':' + m.journee));
  return ms.map((m) => {
    const i = M.EQUIPES.findIndex((e) => e.id === m.equipe);
    const derby = !!m.derby && !afficher;
    return {
      cle: m.equipe, journee: m.j, date: m.date, jour: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][new Date(m.date + 'T12:00:00Z').getUTCDay()],
      heure: m.heure || null, equipe: M.libelle(m.equipe) || CATS[i], voix_equipe: VOIX_EQ[m.equipe] || ('nos ' + M.libelleCourt(m.equipe)),
      mineurs: afficher ? 'non' : (avecMineurs(m.equipe) ? 'oui' : 'non'),
      adversaire: m.derby ? M.libelle(m.derby.exterieur) : m.adv,
      lieu: m.dom ? 'domicile' : 'exterieur', derby, une: une.size ? une.has(m.cle) : (unSeulScore(x) || m.equipe === M.EQUIPE_A_LA_UNE),
      nous: m.score ? m.score[0] : '', eux: m.score ? m.score[1] : '', actif: true
    };
  });
}

// ---------- les champs à taper du modèle (sans les matchs : ils viennent de l'onglet Matchs) ----------
function optionsDe(c, champs) {
  if (c.options) return c.options.map((o) => ({ v: o, t: maj1(o) }));
  if (c.options_selon_equipe) {
    const jeunes = DONNEES.listes.categories_jeunes.includes(champs.categorie);
    return (champs.categorie && !jeunes ? c.options_selon_equipe.seniors : c.options_selon_equipe.jeunes).map((o) => ({ v: o, t: maj1(o) }));
  }
  const L = DONNEES.listes[c.liste];
  if (Array.isArray(L)) return L.map((o) => typeof o === 'string' ? { v: o, t: o } : { v: o.libelle, t: maj1(o.libelle) });
  if (L && L.choix) return L.choix.map((o) => ({ v: o.libelle, t: maj1(o.libelle) }));
  if (L && L.noms) return L.noms.map((o) => ({ v: o, t: o }));
  return [];
}
const libelleDe = (c) => c.libelle || ({ categorie: 'Quelle équipe ?', presentation_choisie: 'Quelle action ?' }[c.id] || c.id);
const heureChamp = (h) => { const m = /(\d{1,2})\s*[h:]\s*(\d{2})?/.exec(h || ''); return m ? m[1].padStart(2, '0') + ':' + (m[2] || '00') : ''; };
/** valeurs de départ : celles du calendrier vidéo, puis les valeurs par défaut des champs */
export function champsDepart(x) {
  const ch = {};
  for (const c of x.modele.champs || []) {
    if (x.p.valeurs && x.p.valeurs[c.id] !== undefined) ch[c.id] = x.p.valeurs[c.id];
    else if (c.defaut !== undefined) ch[c.id] = c.defaut;
  }
  if (!ch.presentation_choisie && x.p.valeurs && x.p.valeurs.presentation_proposee) ch.presentation_choisie = x.p.valeurs.presentation_proposee;
  return ch;
}
export function champsHtml(x, champs) {
  return champsDuModele(x).map((c) => {
    const v = champs[c.id]; const id = 'v-' + c.id; const lib = esc(libelleDe(c)) + (c.obligatoire ? '' : ' <span class="facultatif">(facultatif)</span>');
    switch (c.type) {
      case 'choix': {
        const L = optionsDe(c, champs);
        return '<div class="champ"><label for="' + id + '">' + lib + '</label><select id="' + id + '" data-vc="' + c.id + '"><option value="">' + (c.obligatoire ? 'Choisir…' : 'Aucun') + '</option>' +
          L.map((o) => '<option value="' + esc(o.v) + '"' + (o.v === v ? ' selected' : '') + '>' + esc(o.t) + '</option>').join('') + '</select></div>';
      }
      case 'choix_multiple_ordonne': {
        const L = optionsDe(c, champs), pris = Array.isArray(v) ? v : [];
        return '<fieldset class="choix-objets"><legend>' + esc(libelleDe(c)) + '</legend><div class="objets">' + L.map((o) => { const k = pris.indexOf(o.v); return '<button type="button" class="objet" aria-pressed="' + (k >= 0) + '" data-objet="' + esc(o.v) + '" data-vc-liste="' + c.id + '">' + (k >= 0 ? '<span class="rang">' + (k + 1) + '</span>' : '') + esc(o.t) + '</button>'; }).join('') + '</div>' +
          '<p class="petit">' + (pris.length ? 'Dans l\'ordre : ' + esc(pris.join(', ')) + '.' : 'Aucun objet choisi.') + ' De ' + c.min + ' à ' + c.max + '.</p></fieldset>';
      }
      case 'prenom': case 'texte_court':
        return '<div class="champ"><label for="' + id + '">' + lib + '</label><input id="' + id + '" type="text" maxlength="' + (c.max || 40) + '" autocomplete="off" value="' + esc(v ?? '') + '" data-vc="' + c.id + '"></div>';
      case 'nombre':
        return '<div class="champ"><label for="' + id + '">' + lib + '</label><input id="' + id + '" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" value="' + esc(v ?? '') + '" data-vc="' + c.id + '"></div>';
      case 'interrupteur':
        return '<label class="interrupteur"><input type="checkbox" role="switch" data-vc="' + c.id + '"' + (v === true || v === 'oui' ? ' checked' : '') + '> <span>' + esc(libelleDe(c)) + '</span></label>';
      case 'oui_non':
        return '<fieldset class="choix"><legend>' + esc(libelleDe(c)) + '</legend>' + ['oui', 'non'].map((o) => '<label class="case"><input type="radio" name="' + id + '" value="' + o + '" data-vc="' + c.id + '"' + ((v || c.defaut || 'oui') === o ? ' checked' : '') + '> ' + maj1(o) + '</label>').join('') + '</fieldset>';
      case 'heure':
        return '<div class="champ"><label for="' + id + '">' + lib + '</label><input id="' + id + '" type="time" value="' + esc(heureChamp(v || c.defaut || '')) + '" data-vc="' + c.id + '">' + (c.astuce ? '<p class="petit">' + esc(c.astuce) + '</p>' : '') + '</div>';
      default: return '';
    }
  }).join('');
}
/** ce qui manque pour monter la vidéo (raisons écrites), d'après les champs, les médias et les matchs */
export function manques(x, champs, medias, matchs) {
  const r = [];
  for (const c of champsDuModele(x)) {
    if (!c.obligatoire) continue;
    const v = champs[c.id];
    if (c.type === 'choix_multiple_ordonne') { const n = Array.isArray(v) ? v.length : 0; if (n < (c.min || 1)) r.push('Choisissez ' + (c.min || 1) + ' objets au moins (' + n + ' pour l\'instant).'); }
    else if (v == null || v === '') r.push('À choisir : ' + libelleDe(c).replace(/\s*\(.*\)$/, '').replace(/[.?]$/, '') + '.');
  }
  const min = (x.modele.medias && x.modele.medias.min) || 0;
  if (medias.length < min) r.push('Ajoutez ' + (min - medias.length) + ' photo' + (min - medias.length > 1 ? 's' : '') + ' ou vidéo' + (min - medias.length > 1 ? 's' : '') + ' (' + (x.modele.medias.consignes || '').split('.')[0].toLowerCase() + ').');
  if (unSeulScore(x) && matchs) { const m = matchs[0]; if (!m) r.push('Aucun match trouvé pour cette vidéo.'); else if (m.nous === '' || m.eux === '') r.push('Il manque le score de ' + m.voix_equipe + '.'); }
  const d = dateFausse(x, champs, matchs); if (d) r.push(d);
  return r;
}
/** Contrôle bloquant : un mois écrit dans un texte daté de la vidéo (surtitre, voix d'ouverture, dates) doit être celui des matchs ;
 *  la phrase de fin peut annoncer un mois à venir (« En janvier, on remet ça » le 13/12), jamais un mois passé. */
export function dateFausse(x, champs = {}, matchs) {
  const v = { ...(x.p.valeurs || {}), ...champs };
  const ref = (matchs && matchs.length ? matchs.map((m) => m.date) : [x.date]).map((d) => +d.slice(5, 7) - 1);
  const mois = (t) => MOIS.map((m, i) => new RegExp('\\b' + m + '\\b', 'i').test(String(t || '')) ? i : -1).filter((i) => i >= 0);
  const ordre = (i) => (i + 12 - 6) % 12;   // saison de septembre à août : novembre avant décembre, avant janvier
  for (const k of ['surtitre', 'intro_voix', 'dates', 'accroche_surtitre']) for (const i of mois(v[k])) if (!ref.includes(i)) return 'Cette vidéo parle de ' + MOIS[i] + ', mais ses matchs sont en ' + MOIS[ref[0]] + ' : elle ne se fabrique pas. Choisissez-en une autre.';
  for (const k of ['suite_voix', 'legende_sans_victoire']) for (const i of mois(v[k])) if (ordre(i) < Math.min(...ref.map(ordre))) return 'Cette vidéo parle de ' + MOIS[i] + ', un mois déjà passé : elle ne se fabrique pas.';
  return '';
}

/** prépare le montage (textes, voix, légende) sans rien fabriquer */
export async function preparer(x, champs, matchs, { sansVoix = false } = {}) {
  const { S } = await moteur();
  const saisie = { champs: { ...champs }, matchs: matchs ? matchs.map((m) => ({ ...m })) : null, reponses: [] };
  if (unSeulScore(x) && matchs && matchs[0]) { saisie.champs.score_nous = matchs[0].nous; saisie.champs.score_eux = matchs[0].eux; }
  const valeurs = valeursPour(x, saisie, S, { depart: DEPART });
  if (sansVoix) valeurs.sans_voix = true;
  return S.preparer(x.modele, valeurs);
}
/** la légende à coller (TikTok et Reels : avec les mots-dièse ; Facebook : sans). Résultats du week-end : une phrase d'accroche, le
 *  week-end et 4 mots-dièse, jamais la liste des scores (sur TikTok on n'en voit que 1 à 2 lignes ; les scores sont sur Facebook). */
export function legendes(x, legendeMoteur, avecVoix, { samedi, manquants = 0 } = {}) {
  let l = String(legendeMoteur || '');
  if (!avecVoix) l = l.replace(/\n?Voix : synthèse vocale\s*$/, '');
  const tags = motsDiese(x.p.hashtags || []);
  if (/\{liste_/.test(x.modele.legende || '')) {
    // tant que des scores manquent, jamais « 1 victoire ce week-end » : ce ne sont que les premiers résultats
    const acc = manquants ? 'Les premiers résultats du week-end 🏀 Quel match vous a fait vibrer ?' : l.split('\n').map((s) => s.trim()).filter(Boolean)[0] || 'Les résultats du week-end 🏀';
    const court = [acc, samedi ? joursWeekend(samedi) : ''].filter(Boolean);
    const t4 = tags.slice(0, 4);
    const tiktok = propre([...court, t4.join(' '), avecVoix ? 'Voix : synthèse vocale' : ''].filter(Boolean).join('\n'));
    return { tiktok, instagram: tiktok, facebook: propre([...court, avecVoix ? 'Voix : synthèse vocale' : ''].filter(Boolean).join('\n')) };
  }
  const tiktok = propre(legendeFinale(l, { hashtags: tags }));
  const facebook = propre(l.replace(/(^|\s)#\S+/g, '$1'));
  return { tiktok, instagram: tiktok, facebook };
}

/** la voix est-elle déjà dans le téléphone ? */
export async function voixLa() { const { V } = await moteur(); return V.disponible() || await V.dejaTelechargee(); }
/**
 * Monte la vidéo. medias : [File] dans l'ordre ; onProgres(fraction, texte). Rend { fichier, legendes, duree, avertissements, avecVoix }.
 * voix : 'oui' (préparée au besoin, en Wi-Fi conseillé), 'non' (sous-titres seulement).
 */
export async function monter(x, champs, matchs, medias, { voix = 'oui', onProgres = () => { }, signal } = {}) {
  const { S, V } = await moteur();
  const caps = await S.capacites();
  if (!caps.ok) throw Object.assign(new Error('Ce téléphone ne sait pas fabriquer la vidéo. Les images et les textes marchent.'), { code: 'ENCODAGE_IMPOSSIBLE' });
  const sansVoix = voix === 'non';
  const Mt = await preparer(x, champs, matchs, { sansVoix });
  let audio = null, voixRatee = false, part = 0;
  if (!sansVoix && Mt.voixSynthese && Mt.textesVoix.length) {
    const deja = V.disponible() || await V.dejaTelechargee();
    part = deja ? 0.12 : 0.45;
    try {
      await V.preparer({ workerUrl: workerUrl(), onProgres: (f) => onProgres(f * (part - 0.06), deja ? 'Préparation de la voix…' : 'Téléchargement de la voix, une seule fois : ' + Math.round(f * 100) + ' %') });
      onProgres(part - 0.05, 'La voix lit le texte…');
      audio = await V.dire(Mt.textesVoix);
      // petit téléphone : la voix est libérée tout de suite ; sinon à la fermeture de l'atelier ou quand l'appli passe en arrière-plan
      // (libererVoix). Elle reste gardée dans le téléphone et se relance en une dizaine de secondes.
      if ((navigator.deviceMemory || 8) <= 4) V.arreter();
    } catch (e) { audio = null; voixRatee = true; try { V.arreter(); } catch (x2) { } }
  }
  if (signal && signal.aborted) throw Object.assign(new Error('Montage arrêté.'), { code: 'ANNULE' });
  const M2 = (sansVoix || voixRatee || !audio) && Mt.voixSynthese ? await preparer(x, champs, matchs, { sansVoix: true }) : Mt;
  const r = await S.monter({ montage: M2, medias, voix: audio, habillage: M2.habillage, signal, date: x.date,
    onProgres: (f) => onProgres(part + f * (1 - part), 'Montage de la vidéo : ' + Math.round(f * 100) + ' %') });
  const avecVoix = !!r.voixSynthese && !!audio;
  const av = [...(r.avertissements || [])];
  if (voixRatee) av.unshift('La voix n\'a pas pu se préparer sur ce téléphone : la vidéo est faite sans voix, avec les textes à l\'écran.');
  const fichier = r.fichier instanceof File ? r.fichier : new File([r.blob], r.nom || 'bcr-video.mp4', { type: 'video/mp4' });
  fichier.largeur = r.largeur; fichier.hauteur = r.hauteur;
  const samedi = matchs && matchs.length ? M.samediDe(matchs[0].date) : x.samedi;
  return { fichier, legendes: legendes(x, r.legende, avecVoix, { samedi, manquants: (matchs || []).filter((m) => m.nous === '' || m.eux === '').length }), duree: r.duree, avertissements: [...new Set(av)], avecVoix, manquantsLegende: M2.manquantsLegende || [], mesures: r.mesures };
}
/** libère la voix (fermeture de l'atelier, appli passée en arrière-plan) : elle reste gardée dans le téléphone */
export function libererVoix() { try { if (MOTEUR) MOTEUR.V.arreter(); } catch (e) { } }
/** message clair pour une erreur du moteur */
export function messageErreur(e) {
  const c = e && e.code;
  if (c === 'ENCODAGE_IMPOSSIBLE') return 'Ce téléphone ne sait pas fabriquer la vidéo. Les images et les textes marchent.';
  if (c === 'MEDIAS_MANQUANTS' || c === 'AUCUN_MEDIA_LISIBLE') return e.message;
  if (c === 'MEMOIRE') return e.message;
  if (c === 'ANNULE') return 'Montage arrêté.';
  return 'La vidéo n\'a pas pu être fabriquée. Réessayez ; si cela recommence, retirez une vidéo de la liste.';
}
export const heureVideo = (x) => heureFr(heureChamp(x.p.heure || ''));
