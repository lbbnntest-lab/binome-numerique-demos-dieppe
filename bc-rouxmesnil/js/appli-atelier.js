// Appli des publications du BCR : l'atelier d'une publication (un seul écran, défilant).
// 1. Le score (interrupteur « Afficher le score », seulement quand un score est caché par la règle du club) ;
// 2. Vos photos et vidéos (galerie, gardées en mémoire le temps de l'atelier, jamais copiées ni envoyées) ;
// 3. À taper : seulement ce qui manque (scores, partenaire, 3 lignes, prénoms avec accord…) ; même saisie que l'onglet Matchs ;
// 4. La vidéo (si la publication en a une) : montée dans le téléphone, toute seule quand tout est prêt ;
// 5. Une carte par réseau : aperçu des fichiers, texte modifiable, « Copier le texte et partager », « Copier le texte »,
//    « Enregistrer dans le téléphone », case « Fait » (cochée par le club : un partage réussi ne veut pas dire publié).
// « Résultats du week-end » : la carte Facebook en tête (ce que le club vient chercher), puis « X scores tapés sur N · Taper les
// scores » qui ouvre la liste repliée, jour par jour, une ligne courte par match ; une photo des tribunes en simple lien.
// Trois gestes : « Préparer » (Cette semaine), « Copier le texte et partager », puis l'appli du réseau dans le partage du téléphone.
import { esc, maj1, dateLongue, dateCourte, ajouterJours, signaler, annoncer, copier, PICTOS, pastilles, RESEAUX, $ } from './appli-commun.js';
import { Stock } from './appli-stockage.js';
import * as M from './appli-matchs.js';
import * as P from './appli-publications.js';
import { ligneMatch, ligneCompacte, gestesMatch } from './appli-vue-matchs.js';
import * as S from './appli-sorties.js';
import * as V from './appli-video.js';
import { PARTENAIRES, parNom, suivant, aucunMerci, merciFait, troisPour, troisFaits } from './appli-partenaires.js';
import { prenomValide } from './appli-textes.js';
import { defautsTexte } from './appli-regles.js';
import { copierEtPartager, enregistrer, message, phraseTelechargement } from './appli-partage.js';
import { SOURCE_CLUB } from './appli-corrections-club.js';

let dlg = null, pub = null, declencheur = null, parHistorique = false, App = null;
let E = null;   // état de l'atelier ouvert (rien n'est gardé après la fermeture, sauf ce qui va dans le stockage de l'appli)
let observateur = null;

const regleVisible = (p) => {
  const R = P.reglesEnfants(); const code = (p.regles || []).find((c) => R.codes[c]);
  return code ? R.codes[code] : 'De dos ou de loin pour les jeunes, sauf accord écrit des deux parents (et l\'enfant d\'accord lui aussi).';
};
const estVideo = (p) => p.type === 'video-serie' || p.type === 'video';
const estResultats = (p) => S.sousType(p) === 'resultats' && !!p.samedi;
// le montage part tout seul pour une vidéo du calendrier ; pour « Vidéo » (à la demande), le club choisit d'abord laquelle
const montageAuto = (p) => p.type === 'video-serie';
function attendMedias(p) {
  const st = S.sousType(p);
  if (st === 'resultats') return false;   // résultats : un simple lien « Ajouter une photo des tribunes » sous la carte Facebook
  if (estVideo(p) || /^(raconter|retro|bilan|story-ce-soir)$/.test(st)) return true;
  if (/^(story-jour|story-tiktok|anniversaires|changement|merci-partenaire)$/.test(st)) return false;
  return !!P.mediasCourts(p.medias) || /facultatif|si vous (voulez|en avez)/i.test(p.medias || '');
}
/** le partenaire remercié le même jour (il ne revient pas dans la fin de match) */
async function partenaireDuJour(date) {
  const md = await Stock.lire('reglages', 'merci-du-jour'); if (md && md.date === date) return [md.slug];
  const cal = ((P.calendrier() && P.calendrier().publications) || []).find((q) => q.type === 'merci-partenaire' && q.date === date);
  if (!cal) return [];
  const sug = /suggestion\s*:\s*([^)]+)\)/.exec(cal.titre || ''); const pp = (await aucunMerci()) && sug && parNom(sug[1].trim()) || await suivant();
  return pp ? [pp.slug] : [];
}

// ---------- état de départ ----------
async function etatDepart(p) {
  const e = { afficher: false, medias: [], match: p.match || null, partenaire: null, partenairesFin: [], raconter: { titre: '', l1: '', l2: '', l3: '' },
    changement: { statut: 'reporte' }, prenoms: [{ t: '', accord: false }], annee: '', phrase: '', modeleVideo: '', champsVideo: {}, video: { etat: 'attente' },
    edites: {}, ouvert: {}, fichiers: {}, messages: {}, voixChoix: App.reglages['sans-voix'] ? 'non' : null, jeton: 0, controle: null, ferme: false, scoresOuverts: null };
  const st = S.sousType(p);
  if (st === 'merci-partenaire') {
    // le tour gardé sur le téléphone d'abord ; la suggestion du calendrier seulement tant qu'aucun merci n'a été fait
    const sug = /suggestion\s*:\s*([^)]+)\)/.exec((p.brut && p.brut.titre) || '');
    const pp = ((await aucunMerci()) && sug && parNom(sug[1].trim())) || await suivant();
    e.partenaire = pp.slug;
  }
  if (st === 'fin-de-match') e.partenairesFin = await troisPour(P.cleCommune(p), await partenaireDuJour(p.date));
  if (st === 'raconter' && /Movember/i.test(p.titre)) e.raconter.titre = 'Merci pour le tournoi Movember !';
  if (st === 'changement') { const m = App.liste.find((x) => !x.retire && x.date >= App.jour); if (m) e.changement.cle = m.cle; }
  if (st === 'video') e.modeleVideo = (V.choixVideos(App.jour).find((c) => c.modele === 'special-bienvenue') || V.choixVideos(App.jour)[0] || {}).modele || '';
  if (estVideo(p)) { e.x = V.adapterLibre(V.videoDe(p, e.modeleVideo), App); if (e.x) e.champsVideo = V.champsDepart(e.x); }
  return e;
}

// ---------- blocs ----------
function blocInterrupteur(p) {
  if (!S.montrerInterrupteur(p, E, App)) return '';
  return '<section class="a-bloc a-score" aria-labelledby="a-score-t"><h3 id="a-score-t">Le score</h3>' +
    '<p class="petit">Par défaut, le score n\'est pas écrit pour un derby du club, ni pour un match de jeunes avec 30 points d\'écart ou plus : « Victoire », sans le score.</p>' +
    '<label class="interrupteur"><input type="checkbox" role="switch" data-e="afficher"' + (E.afficher ? ' checked' : '') + '> <span>Afficher le score (pour cette publication)</span></label></section>';
}
const champGalerie = () => '<input type="file" id="a-galerie" class="visuellement-cache" accept="image/*,video/*" multiple>';
function blocMedias(p) {
  if (!attendMedias(p)) return '';
  const x = E.x; const mm = x && x.modele.medias;
  const consigne = mm ? (mm.consignes || '') + (mm.max ? ' (' + (mm.min ? (mm.min === mm.max ? mm.min : mm.min + ' à ' + mm.max) : 'jusqu\'à ' + mm.max) + ')' : '') : p.medias;
  return '<section class="a-bloc" aria-labelledby="a-medias"><h3 id="a-medias">Vos photos et vidéos</h3>' +
    (consigne ? '<p class="petit">' + esc(maj1(consigne)) + '</p>' : '') +
    '<p class="regle-enfants">' + esc(regleVisible(p)) + '</p>' + champGalerie() +
    '<label for="a-galerie" class="bouton">Ajouter depuis la galerie</label>' +
    '<ul class="vignettes" aria-label="Photos et vidéos choisies"></ul>' +
    '<p class="petit">Elles restent dans votre téléphone. Si vous fermez l\'appli, il faudra les rechoisir.</p></section>';
}
/** résultats : le lien discret vers la galerie, sous la carte Facebook, avec la règle des enfants */
function lienMedias(p) {
  return '<div class="a-medias-lien">' + champGalerie() + '<label for="a-galerie" class="lien">Ajouter une photo des tribunes (facultatif)</label>' +
    '<p class="petit regle-courte">' + esc(regleVisible(p)) + '</p><ul class="vignettes" aria-label="Photos choisies"></ul></div>';
}
const champTexte = (id, lib, v, o = {}) => '<div class="champ"><label for="' + id + '">' + lib + (o.facultatif ? ' <span class="facultatif">(facultatif)</span>' : '') + '</label>' +
  (o.zone ? '<textarea id="' + id + '" rows="' + (o.rows || 2) + '" maxlength="' + (o.max || 300) + '" data-e="' + o.e + '">' + esc(v || '') + '</textarea>'
    : '<input id="' + id + '" type="text" maxlength="' + (o.max || 120) + '" autocomplete="off"' + (o.mode ? ' inputmode="' + o.mode + '"' : '') + ' value="' + esc(v || '') + '" data-e="' + o.e + '">') + (o.aide ? '<p class="petit">' + o.aide + '</p>' : '') + '</div>';
function optionsMatchs(liste, choisi) {
  return liste.map((m) => '<option value="' + esc(m.cle) + '"' + (m.cle === choisi ? ' selected' : '') + '>' + esc(dateCourte(m.date) + ' · ' + M.libelle(m.equipe) + (m.dom ? ' contre ' : ' chez ') + (m.derby ? M.libelle(m.derby.exterieur) : m.adv)) + '</option>').join('');
}
/** les scores d'un week-end (résultats) : jour par jour, une ligne courte par match ; les matchs mis de côté à la fin */
function blocScores(p) {
  const ms = M.duWeekend(App.liste, p.samedi); const actifs = ms.filter((m) => !m.retire); const connus = actifs.filter((m) => m.score).length;
  if (E.scoresOuverts == null) E.scoresOuverts = connus === 0;
  let liste = '';
  for (const d of [p.samedi, ajouterJours(p.samedi, 1)]) {
    const duJour = actifs.filter((m) => m.date === d && M.peutTaper(m, App.jour)); if (!duJour.length) continue;
    liste += '<h4 class="jour">' + esc(maj1(dateLongue(d))) + '</h4><ul class="matchs compacts">' + duJour.map((m) => ligneCompacte(m, App)).join('') + '</ul>';
  }
  const cote = ms.filter((m) => m.miseDeCote || (m.retire && !m.miseDeCote));
  if (cote.length) liste += '<h4 class="jour">Pas dans les publications</h4><p class="petit">' + (cote.some((m) => m.miseDeCote) ? 'Ces matchs de la fédération ne sont pas dans ' + esc(SOURCE_CLUB) + '. ' : '') + 'S\'ils ont eu lieu, remettez-les.</p><ul class="matchs compacts">' + cote.map((m) => ligneCompacte(m, App)).join('') + '</ul>';
  return '<div class="a-scores" id="a-scores"><p class="a-scores-etat"><span><b>' + connus + ' score' + (connus > 1 ? 's' : '') + ' tapé' + (connus > 1 ? 's' : '') + '</b> sur ' + actifs.length + ' match' + (actifs.length > 1 ? 's' : '') + '</span>' +
    '<button type="button" class="bouton" data-action="taper-scores">Taper les scores</button></p>' +
    '<details class="a-scores-liste" id="a-scores-liste"' + (E.scoresOuverts ? ' open' : '') + '><summary>Les scores, match par match</summary>' +
    '<p class="petit">Tapez ceux que vous connaissez : le score est gardé dès que les deux cases sont remplies. Un score vide n\'est jamais inventé.</p>' + liste + '</details></div>';
}
function blocATaper(p) {
  const st = S.sousType(p); let h = '';
  const lignes = (ms, o) => '<ul class="matchs">' + ms.map((m) => ligneMatch(m, App, o)).join('') + '</ul>';
  if (st === 'fin-de-match') {
    if (p.source === 'demande') {
      const choix = App.liste.filter((m) => !m.retire && m.date <= App.jour && m.date >= ajouterJours(App.jour, -28)).reverse();
      h += '<div class="champ"><label for="a-match">Le match</label><select id="a-match" data-e="match"><option value="">Choisir…</option>' + optionsMatchs(choix, E.match) + '</select></div>';
    }
    const m = App.liste.find((x) => x.cle === E.match); if (m) h += lignes([m], { corriger: false });
  } else if (st === 'resultats') {
    return '';   // dans la section des publications, sous la carte Facebook
  } else if (st === 'rendez-vous' && p.samedi) {
    const ms = M.duWeekend(App.liste, p.samedi).filter((m) => !m.retire && (!m.heure || m.salleAConfirmer || App.correction === m.cle));
    if (ms.length) h += '<p class="petit">Ces matchs n\'ont pas d\'heure au relevé du ' + esc(M.releve()) + ', ou leur salle est à choisir. Corrigez-les si vous savez.</p>' + lignes(ms, { corriger: true, sansScore: true });
    h += '<p class="petit">Un match à retirer ou à ajouter : onglet « Matchs ».</p>';
  } else if (st === 'merci-partenaire') {
    h += '<div class="champ"><label for="a-part">Le partenaire</label><select id="a-part" data-e="partenaire">' + PARTENAIRES.map((x) => '<option value="' + x.slug + '"' + (x.slug === E.partenaire ? ' selected' : '') + '>' + esc(x.nom) + '</option>').join('') + '</select>' +
      '<p class="petit">Proposé : le suivant de la liste des 31 partenaires.</p></div>';
    h += champTexte('a-compte-p', 'Son compte Instagram', App.reglages['compte-partenaire:' + E.partenaire], { e: 'compte-partenaire', facultatif: true, max: 40, aide: 'Gardé sur ce téléphone.' });
  } else if (st === 'raconter') {
    const R = E.raconter;
    h += champTexte('a-titre', 'Le titre', R.titre, { e: 'raconter.titre', max: 90 }) +
      champTexte('a-l1', 'Ce qui s\'est passé', R.l1, { e: 'raconter.l1', zone: true, rows: 3 }) +
      champTexte('a-l2', 'Quand et où', R.l2, { e: 'raconter.l2', facultatif: true }) +
      champTexte('a-l3', 'Le merci', R.l3, { e: 'raconter.l3', facultatif: true });
    if (/Movember/i.test(p.titre)) h += '<p class="petit">Aucun chiffre de recette ou de dons, sauf si le club le donne.</p>';
  } else if (st === 'retro') {
    h += champTexte('a-annee', 'L\'année', E.annee, { e: 'annee', facultatif: true, max: 4, mode: 'numeric' });
  } else if (st === 'bilan') {
    h += champTexte('a-phrase', 'Une phrase du club', E.phrase, { e: 'phrase', facultatif: true, max: 160 });
  } else if (st === 'anniversaires') {
    h += '<p class="regle-enfants">Un seul prénom, jamais de nom de famille. Un adulte s\'il a dit oui ; un mineur seulement avec l\'accord écrit de ses deux parents, et s\'il est d\'accord lui aussi. Jamais d\'âge, de date de naissance, d\'équipe ni de photo pour un mineur.</p>' +
      '<ul class="prenoms">' + E.prenoms.map((x, i) => { const err = x.t && prenomValide(x.t); return '<li data-i="' + i + '"><div class="champ"><label for="a-pr-' + i + '">Prénom ' + (i + 1) + '</label><input id="a-pr-' + i + '" type="text" maxlength="30" autocomplete="off" value="' + esc(x.t) + '" data-prenom="' + i + '"' + (err ? ' aria-invalid="true" aria-describedby="a-pr-' + i + '-e"' : '') + '>' + (err ? '<p class="m-erreur" id="a-pr-' + i + '-e">' + esc(err) + '</p>' : '') + '</div>' +
        '<label class="case"><input type="checkbox" data-accord="' + i + '"' + (x.accord ? ' checked' : '') + '> Accord reçu (les deux parents et l\'enfant pour un mineur)</label></li>'; }).join('') + '</ul>' +
      '<p><button type="button" class="bouton" data-action="ajouter-prenom">Ajouter un prénom</button></p><p class="petit">Les prénoms ne sont gardés nulle part : ils disparaissent à la fermeture.</p>';
  } else if (st === 'story-tiktok') {
    h += champTexte('a-tiktok', 'Le nom du compte TikTok du club', App.reglages['compte-tiktok'], { e: 'compte-tiktok', max: 40, aide: 'Tapé une fois, gardé sur ce téléphone.' });
  } else if (st === 'changement') {
    const C = E.changement; const choix = App.liste.filter((m) => !m.retire && m.date >= App.jour && m.date <= ajouterJours(App.jour, 28));
    h += '<div class="champ"><label for="a-chg-m">Le match</label><select id="a-chg-m" data-e="changement.cle"><option value="">Choisir…</option>' + optionsMatchs(choix, C.cle) + '</select></div>' +
      '<fieldset class="choix"><legend>Ce qui change</legend>' + [['reporte', 'Reporté'], ['annule', 'Annulé'], ['horaire', 'Nouvel horaire'], ['salle', 'Autre salle'], ['forfait', 'Forfait'], ['autre', 'Autre chose']].map(([v, t]) =>
        '<label class="case"><input type="radio" name="a-chg-s" value="' + v + '" data-e="changement.statut"' + (C.statut === v ? ' checked' : '') + '> ' + t + '</label>').join('') + '</fieldset>';
    if (C.statut === 'reporte') h += '<div class="champ"><label for="a-chg-d">Nouvelle date <span class="facultatif">(facultatif)</span></label><input id="a-chg-d" type="date" value="' + esc(C.nouvelleDate || '') + '" data-e="changement.nouvelleDate"></div>';
    if (C.statut === 'reporte' || C.statut === 'horaire') h += '<div class="champ"><label for="a-chg-h">Nouvelle heure' + (C.statut === 'reporte' ? ' <span class="facultatif">(facultatif)</span>' : '') + '</label><input id="a-chg-h" type="time" value="' + esc(C.nouvelleHeure || '') + '" data-e="changement.nouvelleHeure"></div>';
    if (C.statut === 'salle') h += champTexte('a-chg-salle', 'La salle', C.salle, { e: 'changement.salle', max: 80 });
    if (C.statut === 'autre') h += champTexte('a-chg-autre', 'Ce qui change', C.autre, { e: 'changement.autre', max: 120 });
    h += champTexte('a-chg-motif', 'Le motif', C.motif, { e: 'changement.motif', facultatif: true, max: 120 });
  } else if (estVideo(p) && E.x) {
    if (p.type === 'video') {
      // le nom de la vidéo d'abord ; la série sert de groupe
      const groupes = new Map(); for (const c of V.choixVideos(App.jour)) { if (!groupes.has(c.serie)) groupes.set(c.serie, []); groupes.get(c.serie).push(c); }
      h += '<div class="champ"><label for="a-modele">Quelle vidéo ?</label><select id="a-modele" data-e="modeleVideo">' + [...groupes].map(([g, cs]) => '<optgroup label="' + esc(g) + '">' +
        cs.map((c) => '<option value="' + c.modele + '"' + (c.modele === E.modeleVideo ? ' selected' : '') + '>' + esc(c.titre) + '</option>').join('') + '</optgroup>').join('') + '</select></div>';
    }
    h += V.champsHtml(E.x, E.champsVideo);
    const mv = E.matchsVideo || [];
    if (V.utiliseMatchs(E.x) && mv.length) {
      const cles = new Set(mv.map((m) => m.cle + ':' + m.journee));
      const ms = App.liste.filter((m) => cles.has(m.cle) && !m.retire);
      const res = /^resultats|^joker-mot/.test(E.x.modele.id);
      const aTaper = res ? ms.filter((m) => (!m.score || App.edition === m.cle) && M.peutTaper(m, App.jour)) : ms.filter((m) => !m.heure || App.correction === m.cle);
      if (aTaper.length) h += (res ? '<p class="petit">Les scores manquants (ils servent aussi aux résultats du dimanche) :</p><ul class="matchs compacts">' + aTaper.map((m) => ligneCompacte(m, App)).join('') + '</ul>' : '<p class="petit">Ces matchs n\'ont pas d\'heure au relevé :</p>' + lignes(aTaper, { corriger: true, sansScore: true }));
      h += '<p class="petit">' + mv.length + ' match' + (mv.length > 1 ? 's' : '') + ' dans la vidéo. ' + esc(M.phraseReleve()) + '.</p>';
    }
  }
  if (!h) return '';
  return '<section class="a-bloc" aria-labelledby="a-taper"><h3 id="a-taper">À taper</h3>' + h + '</section>';
}
const avecVoixChoisie = () => E.x && E.x.modele.voix != null && E.voixChoix !== 'non' && !App.reglages['sans-voix'];
function blocVideo(p) {
  if (!estVideo(p)) return '';
  if (!E.x) return '<section class="a-bloc a-video"><h3>La vidéo</h3><p>Cette vidéo n\'est pas prête dans l\'appli.</p></section>';
  const v = E.video; const manque = V.manques(E.x, E.champsVideo, E.medias, E.matchsVideo);
  let h = '<section class="a-bloc a-video" aria-labelledby="a-video-t"><h3 id="a-video-t">La vidéo</h3>';
  // la phrase suit le choix fait (réglage « Vidéos sans voix », « Faire la vidéo sans voix »), pas seulement le modèle
  if (v.etat !== 'pret') h += '<p class="petit">' + (avecVoixChoisie() ? 'Avec la voix de synthèse et les sous-titres.' : E.x.modele.voix != null ? 'Sans voix : les textes sont écrits à l\'écran.' : 'Sans voix : on entend le son de vos vidéos.') + ' Montée dans ce téléphone.</p>';
  if (manque.length && v.etat !== 'montage') h += '<ul class="a-manques">' + manque.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>';
  if (v.etat === 'montage') {
    h += '<div class="avancement" id="a-avancement"><div class="barre" aria-hidden="true"><span style="width:' + Math.round((v.progres || 0) * 100) + '%"></span></div><p class="avancement-texte" role="status">' + esc(v.texte || 'Montage de la vidéo…') + '</p></div>' +
      '<p class="alerte">Ne fermez pas l\'appli pendant le montage (environ 15 à 30 s).</p><p><button type="button" class="bouton" data-action="arreter-video">Arrêter</button></p>';
  } else if (!manque.length) {
    if (E.besoinChoixVoix) {
      h += '<p class="note">La voix n\'est pas encore sur ce téléphone.</p><p class="rangee"><button type="button" class="bouton plein" data-action="voix-oui">Préparer la voix (Wi-Fi conseillé, environ 90 Mo)</button>' +
        '<button type="button" class="bouton" data-action="voix-non">Faire la vidéo sans voix</button></p>';
    } else if (v.etat !== 'pret' || v.perimee) h += '<p><button type="button" class="bouton plein grand" data-action="monter-video">' + (v.etat === 'pret' ? 'Refaire la vidéo avec vos changements' : 'Fabriquer la vidéo') + '</button></p>';
  }
  if (v.etat === 'arrete') h += '<p class="note">Montage arrêté. Touchez « Fabriquer la vidéo » pour recommencer.</p>';
  if (v.etat === 'erreur') h += '<p class="alerte" role="alert">' + esc(v.message) + '</p>';
  if (v.etat === 'pret') {
    h += '<div class="apercu apercu-video"><video src="' + v.url + '" controls playsinline preload="metadata" aria-label="La vidéo fabriquée"></video></div>' +
      '<p class="petit">' + (v.avecVoix ? 'Avec la voix de synthèse et les sous-titres.' : 'Sans voix : les textes sont écrits à l\'écran.') + ' ' + Math.round(v.duree) + ' secondes.</p>' +
      (v.perimee ? '<p class="alerte">Vos derniers changements ne sont pas dans cette vidéo.</p>' : '') +
      (v.avertissements && v.avertissements.length ? '<ul class="a-manques">' + v.avertissements.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '');
  }
  return h + '</section>';
}
function libellePartager(c, nb) {
  if (!navigator.canShare) return c.texte ? 'Copier le texte et enregistrer' : 'Enregistrer dans le téléphone';
  if (c.video) return 'Copier la légende et partager';
  if (c.story) return nb > 1 ? 'Partager les ' + nb + ' stories' : 'Partager la story';
  if (c.reseau === 'instagram' && nb > 1) return 'Copier le texte et partager les ' + nb + ' images';
  return 'Copier le texte et partager';
}
const libelleEnregistrer = (c, nb) => c.video ? 'Enregistrer la vidéo dans le téléphone' : nb > 1 ? 'Enregistrer les ' + nb + ' images dans le téléphone' : 'Enregistrer l\'image dans le téléphone';
const libelleFait = (c) => c.reseau === 'story' ? 'Fait en story sur Instagram' : c.story ? 'Fait en story sur ' + (RESEAUX[c.reseau] || c.reseau) : 'Fait sur ' + (RESEAUX[c.reseau] || c.reseau);
function htmlCarte(c, i) {
  const id = 'c-' + c.reseau + '-' + i; const fait = !!App.faits[P.cleFait(pub, c.reseau)];
  const t = c.bloque ? null : E.edites[c.reseau] != null ? E.edites[c.reseau] : c.texte;
  const f = c.video ? (E.video.etat === 'pret' ? { pret: true, files: [E.video.fichier] } : null) : E.fichiers[c.fichiers];
  const pret = !c.bloque && !!f && f.pret && (c.video || f.sig === S.signature(c.fichiers, E.plan.specs));
  const nb = pret ? f.files.length : 0;
  return '<section class="a-reseau" data-carte="' + i + '" aria-labelledby="' + id + '-t">' +
    '<div class="a-reseau-tete"><h4 id="' + id + '-t" class="visuellement-cache">' + esc(c.nom) + '</h4>' + pastilles([c.nom]) + '<span class="a-format">' + esc(c.detail || '') + '</span></div>' +
    (c.bloque ? '<p class="a-bloque">' + esc(c.bloque) + '</p>' : '<div class="apercu apercu-' + c.format + '" data-apercu="' + i + '">' + (c.video ? '' : '<p class="a-attente">Préparation des images…</p>') + '</div>') +
    (t ? '<div class="a-texte"><label for="' + id + '-x">' + (c.video ? 'La légende' : 'Le texte') + ' <span class="petit">(modifiable)</span></label><textarea id="' + id + '-x" rows="' + (E.ouvert[c.reseau] ? 14 : 3) + '" data-texte="' + c.reseau + '">' + esc(t) + '</textarea>' +
      '<p class="rangee"><button type="button" class="lien" data-action="voir-tout" data-reseau="' + c.reseau + '" aria-expanded="' + !!E.ouvert[c.reseau] + '" aria-controls="' + id + '-x">' + (E.ouvert[c.reseau] ? 'Replier' : 'Voir tout') + '</button>' +
      (E.edites[c.reseau] != null ? '<button type="button" class="lien" data-action="texte-prepare" data-reseau="' + c.reseau + '">Revenir au texte préparé</button>' : '') + '</p></div>' : '') +
    '<p class="a-actions"><button type="button" class="bouton plein grand" data-action="partager" data-carte="' + i + '"' + (pret ? '' : ' disabled') + '>' + esc(libellePartager(c, nb)) + '</button></p>' +
    '<p class="rangee">' + (t ? '<button type="button" class="bouton" data-action="copier" data-carte="' + i + '"' + (c.bloque ? ' disabled' : '') + '>' + (c.video ? 'Copier la légende' : 'Copier le texte') + '</button>' : '') +
    '<button type="button" class="bouton" data-action="enregistrer" data-carte="' + i + '"' + (pret ? '' : ' disabled') + '>' + esc(libelleEnregistrer(c, nb)) + '</button></p>' +
    '<p class="a-message" role="status" data-message="' + i + '">' + esc(E.messages[c.reseau] || '') + '</p>' +
    (c.aide && !c.bloque ? '<p class="petit">' + esc(c.aide) + '</p>' : '') +
    '<label class="case fait"><input type="checkbox" data-reseau="' + c.reseau + '"' + (fait ? ' checked' : '') + '> ' + esc(libelleFait(c)) + '</label></section>';
}
const notesHtml = (pl) => pl.notes.length ? '<ul class="a-notes">' + pl.notes.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '';
/** les cartes, en une zone (ou deux pour les résultats : Facebook en tête, les autres sous les scores) */
function zonesCartes() {
  const pl = S.plan(pub, E, App); E.plan = pl;
  if (!estResultats(pub)) return { a: notesHtml(pl) + pl.cartes.map(htmlCarte).join(''), b: null };
  const a = [], b = []; pl.cartes.forEach((c, i) => (c.reseau === 'facebook' ? a : b).push(htmlCarte(c, i)));
  return { a: notesHtml(pl) + a.join('') + lienMedias(pub), b: b.join('') };
}
function sectionCartes() {
  const z = zonesCartes();
  if (z.b == null) return '<section class="a-bloc" aria-labelledby="a-reseaux"><h3 id="a-reseaux">Les publications</h3><div class="a-cartes" data-zone="a">' + z.a + '</div></section>';
  return '<section class="a-bloc" aria-labelledby="a-reseaux"><h3 id="a-reseaux" class="visuellement-cache">Les publications</h3><div class="a-cartes" data-zone="a">' + z.a + '</div></section>' +
    '<section class="a-bloc" aria-labelledby="a-scores-t"><h3 id="a-scores-t">Les scores</h3>' + blocScores(pub) + '</section>' +
    '<section class="a-bloc" aria-labelledby="a-autres"><h3 id="a-autres">Instagram</h3><div class="a-cartes" data-zone="b">' + z.b + '</div></section>';
}

// ---------- affichage ----------
function rendre(focus) {
  const p = pub;
  if (estVideo(p) && E.x) E.matchsVideo = V.matchsPour(E.x, App, E.afficher);
  const res = estResultats(p);
  $('.a-corps', dlg).innerHTML =
    '<h2 id="atelier-titre" tabindex="-1">' + esc(p.titre) + '</h2>' +
    '<p class="a-quand">' + esc(maj1(dateLongue(p.date))) + (p.heure ? ', ' + esc(P.heureProposee(p.heure)) : '') + '</p>' +
    pastilles(P.pastillesDe(p)) +
    blocInterrupteur(p) + blocMedias(p) + blocATaper(p) + blocVideo(p) + sectionCartes() +
    '<p class="vous-publiez">C\'est vous qui publiez : l\'appli prépare et ouvre le partage du téléphone, elle ne publie jamais.</p>' +
    (res ? '<div class="a-barre" hidden><button type="button" class="bouton plein grand" data-action="partager" data-carte="0" data-barre="1">Facebook : copier le texte et partager</button></div>' : '');
  afficherVignettes();
  remplirFichiers();
  if (res) suivreBarre();
  if (focus && focus.cle) { const li = dlg.querySelector('[data-cle="' + CSS.escape(focus.cle) + '"]'); const c = li && (li.querySelector(focus.champ ? '[name="' + focus.champ + '"]' : '[data-action="' + focus.action + '"]') || li.querySelector('button, input')); if (c) c.focus(); }
  else if (focus && focus.selecteur) { const c = dlg.querySelector(focus.selecteur); if (c) c.focus(); }
}
/** résultats : la barre « Facebook : copier le texte et partager » reste en bas de l'écran quand la carte Facebook n'est plus visible */
function suivreBarre() {
  if (observateur) observateur.disconnect();
  const bouton = dlg.querySelector('.a-cartes [data-action="partager"][data-carte="0"]'); const barre = dlg.querySelector('.a-barre');
  if (!bouton || !barre || !('IntersectionObserver' in window)) return;
  observateur = new IntersectionObserver((es) => { const e = es[es.length - 1]; barre.hidden = e.isIntersecting || !E || !E.scoresOuverts; }, { root: dlg.querySelector('.a-corps').scrollHeight > dlg.clientHeight ? dlg.querySelector('.a-corps') : null });
  observateur.observe(bouton);
  majBarre();
}
function majBarre() {
  const b = dlg && dlg.querySelector('.a-barre button'); const src = dlg && dlg.querySelector('.a-cartes [data-action="partager"][data-carte="0"]');
  if (b) b.disabled = !src || src.disabled;
}
/** seules les cartes (et le bloc vidéo) sont redessinées : le champ en cours de frappe garde le focus */
function majCartes() {
  const za = dlg && dlg.querySelector('.a-cartes[data-zone="a"]'); if (!za || !E) return;
  if (estVideo(pub) && E.x) E.matchsVideo = V.matchsPour(E.x, App, E.afficher);
  const zb = dlg.querySelector('.a-cartes[data-zone="b"]');
  const actif = document.activeElement && (za.contains(document.activeElement) || (zb && zb.contains(document.activeElement))) ? document.activeElement : null;
  const ref = actif ? { action: actif.dataset.action, carte: actif.dataset.carte, reseau: actif.dataset.reseau || actif.dataset.texte } : null;
  const z = zonesCartes(); za.innerHTML = z.a; if (zb && z.b != null) zb.innerHTML = z.b;
  afficherVignettes();
  majVideo();
  remplirFichiers();
  if (estResultats(pub)) suivreBarre();
  if (ref) { const c = dlg.querySelector('.a-cartes ' + (ref.action ? '[data-action="' + ref.action + '"][data-carte="' + ref.carte + '"]' : '[data-texte="' + ref.reseau + '"], .a-cartes [data-reseau="' + ref.reseau + '"]')); if (c) c.focus(); }
}
function majVideo() {
  const b = $('.a-video', dlg); if (!b) return;
  const actif = document.activeElement && b.contains(document.activeElement) ? document.activeElement.dataset.action : null;
  b.outerHTML = blocVideo(pub);
  if (actif) { const c = dlg.querySelector('.a-video [data-action="' + actif + '"]') || dlg.querySelector('.a-video button'); if (c) c.focus(); }
}
let attenteMaj = 0;
const majPlusTard = () => { clearTimeout(attenteMaj); attenteMaj = setTimeout(majCartes, 350); };

// ---------- fichiers ----------
// Les adresses des fichiers (URL.createObjectURL) ne sont créées qu'au moment de montrer l'aperçu, et seulement si l'atelier est
// encore ouvert et le fichier encore celui de la carte : un dessin qui finit après la fermeture ne laisse rien en mémoire.
async function remplirFichiers() {
  if (!E) return;
  const jeton = ++E.jeton; const pl = E.plan; if (!pl) return; const ici = E;
  const cles = [...new Set(pl.cartes.filter((c) => !c.bloque && !c.video).map((c) => c.fichiers))];
  async function assurer(k) {
    const sig = S.signature(k, pl.specs);
    let f = ici.fichiers[k];
    if (f && f.sig === sig) { await f.promesse; return f; }
    if (f) liberer(f);
    f = ici.fichiers[k] = { sig, pret: false, files: [], urls: [] };
    f.promesse = S.fabriquer(k, pl.specs, pub, async (d) => (await assurer(d)).files)
      .then((files) => { if (ici.ferme || ici.fichiers[k] !== f) return; f.files = files; f.pret = true; }, (e) => { if (ici.ferme || ici.fichiers[k] !== f) return; f.erreur = String(e && e.message || e); f.pret = false; });
    await f.promesse; return f;
  }
  for (const k of cles) {
    const f = await assurer(k);
    if (ici !== E || ici.ferme || jeton !== E.jeton || !dlg.open) return;
    pl.cartes.forEach((c, i) => { if (c.fichiers === k && !c.bloque) montrerApercu(c, i, f); });
  }
  if (E.video.etat === 'pret') pl.cartes.forEach((c, i) => { if (c.video) montrerApercu(c, i, { pret: true, files: [E.video.fichier], urls: [E.video.url] }); });
  majBarre();
  window.__atelierPret = { id: pub.id, cles, jeton, erreurs: cles.map((k) => E.fichiers[k] && E.fichiers[k].erreur).filter(Boolean) };
}
function liberer(f) { for (const u of f.urls || []) URL.revokeObjectURL(u); f.urls = []; f.files = []; }
function montrerApercu(c, i, f) {
  const z = dlg.querySelector('[data-apercu="' + i + '"]'); const b = dlg.querySelector('.a-cartes [data-action="partager"][data-carte="' + i + '"]'); const e = dlg.querySelector('[data-action="enregistrer"][data-carte="' + i + '"]');
  if (!z) return;
  if (f.erreur) { z.innerHTML = '<p class="alerte">L\'image n\'a pas pu être dessinée. Fermez l\'atelier et rouvrez-le.</p>'; return; }
  if (!f.pret) return;
  if (!c.video && (!f.urls || f.urls.length !== f.files.length)) { for (const u of f.urls || []) URL.revokeObjectURL(u); f.urls = f.files.map((x) => URL.createObjectURL(x)); }
  if (c.video) z.innerHTML = '<p class="petit">La vidéo est plus haut : le même fichier sert ici.</p>';
  else if (!f.files.length) z.innerHTML = '<p class="petit">Rien à joindre : le texte seul.</p>';
  else z.innerHTML = '<ul class="defile" aria-label="' + (f.files.length > 1 ? f.files.length + ' images, dans l\'ordre' : 'L\'image') + '">' + f.files.map((x, k) => x.type.startsWith('video')
    ? '<li><video src="' + f.urls[k] + '" muted playsinline preload="metadata" aria-label="Vidéo ' + (k + 1) + '"></video></li>'
    : '<li><img src="' + f.urls[k] + '" alt="' + esc(altDe(c, k, f.files.length)) + '"></li>').join('') + '</ul>';
  if (b) { b.disabled = !f.files.length && !c.texte; b.textContent = f.files.length ? libellePartager(c, f.files.length) : 'Copier le texte'; }
  if (e) { e.disabled = !f.files.length; e.textContent = libelleEnregistrer(c, f.files.length); }
}
const altDe = (c, k, n) => (c.story ? 'Story' : 'Image') + (n > 1 ? ' ' + (k + 1) + ' sur ' + n : '') + ' de la publication ' + c.nom;

// ---------- vidéo ----------
function signatureVideo() {
  return JSON.stringify([E.modeleVideo, E.champsVideo, E.matchsVideo, E.afficher, E.medias.map((m) => m.nom + m.fichier.size), E.voixChoix]);
}
async function preparerMontage(auto) {
  if (!E || !E.x || E.video.etat === 'montage') return;
  if (V.manques(E.x, E.champsVideo, E.medias, E.matchsVideo).length) { majVideo(); return; }
  if (auto && E.video.etat === 'pret') return;
  if (E.x.modele.voix != null && !E.voixChoix) {
    const ici = E;
    if (!(await V.voixLa())) { if (ici === E) { E.besoinChoixVoix = true; majVideo(); } return; }
    if (ici !== E) return;
    E.voixChoix = 'oui';
  }
  E.besoinChoixVoix = false;
  monterVideo();
}
async function monterVideo() {
  const v = E.video; const sig = signatureVideo(); const num = E.montages = (E.montages || 0) + 1;
  if (v.url) URL.revokeObjectURL(v.url);
  E.video = { etat: 'montage', progres: 0, texte: 'Montage de la vidéo…' };
  E.controle = new AbortController(); const ctl = E.controle; const ici = E;
  majCartes();
  let dernier = 0;
  try {
    const r = await V.monter(E.x, E.champsVideo, E.matchsVideo, E.medias.map((m) => m.fichier), { voix: E.voixChoix || 'oui', signal: ctl.signal,
      onProgres: (f, t) => { if (ici !== E) return; E.video.progres = f; E.video.texte = t; const now = performance.now(); if (now - dernier < 250) return; dernier = now;
        const s = dlg.querySelector('#a-avancement .barre span'); if (s) s.style.width = Math.round(f * 100) + '%'; const tt = dlg.querySelector('#a-avancement .avancement-texte'); if (tt) tt.textContent = t; } });
    if (ici !== E || num !== E.montages || !dlg.open) return;
    E.video = { etat: 'pret', fichier: r.fichier, url: URL.createObjectURL(r.fichier), legendes: r.legendes, duree: r.duree, avecVoix: r.avecVoix, avertissements: r.avertissements, sig, mesures: r.mesures };
    window.__derniereVideo = { nom: r.fichier.name, octets: r.fichier.size, largeur: r.fichier.largeur, hauteur: r.fichier.hauteur, duree: r.duree, avecVoix: r.avecVoix, legendes: r.legendes, manquantsLegende: r.manquantsLegende, mesures: r.mesures, avertissements: r.avertissements };
    E.edites.tiktok = E.edites.instagram = E.edites.facebook = undefined;
    annoncer('La vidéo est prête.');
  } catch (e) {
    if (ici !== E || num !== E.montages) return;
    // un arrêt voulu par le club n'est pas une erreur
    E.video = e && e.code === 'ANNULE' ? { etat: 'arrete' } : { etat: 'erreur', message: V.messageErreur(e) };
    window.__derniereVideo = { erreur: String(e && (e.stack || e.message) || e), code: e && e.code };
    if (e && e.code === 'ANNULE') annoncer('Montage arrêté.');
  }
  if (ici === E && num === E.montages && dlg.open) majCartes();
}
function marquerVideoPerimee() { if (E && E.video.etat === 'pret') E.video.perimee = signatureVideo() !== E.video.sig; }

// ---------- vignettes de la galerie ----------
function afficherVignettes() {
  const ul = dlg && $('.vignettes', dlg); if (!ul || !E) return;
  const medias = E.medias;
  ul.innerHTML = medias.map((m, i) => '<li class="vignette" data-i="' + i + '">' +
    (m.type.startsWith('video') ? '<video src="' + m.url + '" muted playsinline preload="metadata" aria-label="Vidéo ' + (i + 1) + '"></video>' : '<img src="' + m.url + '" alt="Photo ' + (i + 1) + '">') +
    '<span class="v-boutons"><button type="button" data-v="haut" aria-label="Monter la ' + (m.type.startsWith('video') ? 'vidéo' : 'photo') + ' ' + (i + 1) + '"' + (i ? '' : ' disabled') + '>↑</button>' +
    '<button type="button" data-v="bas" aria-label="Descendre la ' + (m.type.startsWith('video') ? 'vidéo' : 'photo') + ' ' + (i + 1) + '"' + (i < medias.length - 1 ? '' : ' disabled') + '>↓</button>' +
    '<button type="button" data-v="retirer">Retirer</button></span></li>').join('');
  for (const el of ul.querySelectorAll('img, video')) el.addEventListener('error', () => {
    if (!E) return; const i = +el.closest('li').dataset.i; const m = E.medias[i]; if (!m) return;
    URL.revokeObjectURL(m.url); E.medias.splice(i, 1); afficherVignettes(); apresMedias();
    signaler(m.type.startsWith('video') ? 'Cette vidéo ne s\'ouvre pas ici. Choisissez-en une autre, ou une photo.' : 'Cette photo ne s\'ouvre pas ici. Choisissez-en une autre.');
  }, { once: true });
}
function apresMedias() { marquerVideoPerimee(); majCartes(); if (montageAuto(pub) && E.video.etat !== 'pret') preparerMontage(true); else if (estVideo(pub)) majVideo(); }

// ---------- partager, copier, enregistrer, fait ----------
const carteN = (i) => E && E.plan && E.plan.cartes[+i];
const texteCarte = (c) => { const ta = dlg.querySelector('[data-texte="' + c.reseau + '"]'); return ta ? ta.value : (c.texte || ''); };
const fichiersCarte = (c) => c.video ? (E.video.etat === 'pret' ? [E.video.fichier] : []) : ((E.fichiers[c.fichiers] && E.fichiers[c.fichiers].files) || []);
const nomReseau = (c) => c.reseau === 'story' ? 'Instagram' : (RESEAUX[c.reseau] || c.reseau);
function dire(i, c, t) { E.messages[c.reseau] = t; const z = dlg.querySelector('[data-message="' + i + '"]'); if (z) z.textContent = t; annoncer(t); }
function partager(i) {
  const c = carteN(i); if (!c || c.bloque) return;
  const files = fichiersCarte(c); const t = c.texte != null ? texteCarte(c) : '';
  const d = t ? defautsTexte(t) : []; if (d.length) window.__defautsTexte = { reseau: c.reseau, d };
  const r = copierEtPartager(files, t);      // même geste : rien n'est attendu avant le partage
  r.then((x) => { if (!E) return; dire(i, c, message(x, { avecTexte: !!t, nb: files.length, video: !!c.video, reseau: nomReseau(c), story: !!c.story })); window.__dernierPartage = { reseau: c.reseau, etat: x.etat, copie: x.copie, fichiers: files.map((f) => ({ nom: f.name, type: f.type, octets: f.size })), texte: t }; });
}
async function copierCarte(i) {
  const c = carteN(i); if (!c) return; const t = texteCarte(c);
  const ok = await copier(t);
  if (!ok) { const ta = dlg.querySelector('[data-texte="' + c.reseau + '"]'); if (ta) { E.ouvert[c.reseau] = true; ta.rows = 14; ta.focus(); ta.select(); } }
  dire(i, c, ok ? 'Texte copié. Dans ' + nomReseau(c) + ', appuyez longuement dans la zone du texte, puis « Coller ».' : 'Appuyez longuement sur le texte, puis Copier.');
}
async function enregistrerCarte(i) {
  const c = carteN(i); if (!c) return; const files = fichiersCarte(c);
  const r = await enregistrer(files);
  dire(i, c, r.etat === 'partage' ? 'Choisissez « Enregistrer » dans le partage du téléphone.' : r.etat === 'annule' ? 'Partage annulé.' : phraseTelechargement(files.length, !!c.video));
}
async function cocherFait(reseau, oui) {
  await P.marquerFait(pub, reseau, oui);
  if (oui && reseau === 'facebook') {
    const st = S.sousType(pub);
    if (st === 'merci-partenaire') { const pp = parNom(E.partenaire); if (pp) await merciFait(pp, App.jour); }
    if (st === 'fin-de-match' && E.partenairesFin.length) await troisFaits(P.cleCommune(pub), E.partenairesFin);
  }
  await App.relireFaits();
  signaler(oui ? 'Coché : ' + (reseau === 'story' ? 'fait en story sur Instagram' : 'fait sur ' + RESEAUX[reseau]) + '.' : 'Décoché.');
}

// ---------- saisies ----------
async function saisie(t) {
  const k = t.dataset.e;
  if (k === 'afficher') { E.afficher = t.checked; marquerVideoPerimee(); majCartes(); return; }
  if (k === 'match') { E.match = t.value || null; rendre({ selecteur: '#a-match' }); return; }
  if (k === 'partenaire') { E.partenaire = t.value; rendre({ selecteur: '#a-part' }); return; }
  if (k === 'modeleVideo') {
    if (E.controle) try { E.controle.abort(); } catch (e) { }
    if (E.video.url) URL.revokeObjectURL(E.video.url);
    E.modeleVideo = t.value; E.x = V.adapterLibre(V.videoDe(pub, E.modeleVideo), App); E.champsVideo = E.x ? V.champsDepart(E.x) : {}; E.video = { etat: 'attente' };
    E.montages = (E.montages || 0) + 1; rendre({ selecteur: '#a-modele' }); return;
  }
  if (k === 'compte-partenaire' || k === 'compte-tiktok') {
    const cle = k === 'compte-tiktok' ? 'compte-tiktok' : 'compte-partenaire:' + E.partenaire; const v = t.value.trim();
    if (v) await Stock.ecrire('reglages', cle, v); else await Stock.effacer('reglages', cle);
    App.reglages[cle] = v || undefined; majPlusTard(); return;
  }
  if (k.startsWith('raconter.')) { E.raconter[k.slice(9)] = t.value; majPlusTard(); return; }
  if (k.startsWith('changement.')) {
    const c = k.slice(11); E.changement[c] = t.value;
    if (c === 'statut') rendre({ selecteur: 'input[name="a-chg-s"][value="' + t.value + '"]' }); else majPlusTard();
    return;
  }
  if (k === 'annee' || k === 'phrase') { E[k] = t.value; majPlusTard(); }
}

function fermer() {
  if (!dlg || !dlg.open) return;
  if (E) E.ferme = true;
  if (E && E.controle) try { E.controle.abort(); } catch (e) { }
  for (const m of (E && E.medias) || []) URL.revokeObjectURL(m.url);
  for (const f of Object.values((E && E.fichiers) || {})) liberer(f);
  if (E && E.video && E.video.url) URL.revokeObjectURL(E.video.url);
  if (E && estVideo(pub)) V.libererVoix();    // le moteur de la voix (77 Mo) ne reste pas en mémoire après l'atelier
  if (observateur) { observateur.disconnect(); observateur = null; }
  const id = pub && pub.id;
  E = null; dlg.close(); App.atelierOuvert = false; pub = null;
  $('.a-corps', dlg).innerHTML = '';
  if (declencheur && document.contains(declencheur)) declencheur.focus();
  App.apresAtelier(id);
}
/** « Taper les scores » : ouvre la liste et va au premier match sans score */
function allerAuxScores() {
  const d = dlg.querySelector('#a-scores-liste'); if (!d) return;
  d.open = true; E.scoresOuverts = true;
  const vide = [...d.querySelectorAll('form.m-saisie input[name="nous"]')].find((x) => !x.value) || d.querySelector('form.m-saisie input[name="nous"]');
  if (vide) { vide.focus({ preventScroll: true }); vide.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  else d.scrollIntoView({ block: 'start' });
  const b = dlg.querySelector('.a-barre'); if (b) suivreBarre();
}

function brancher() {
  dlg.dataset.branche = '1';
  gestesMatch(dlg, App, (o) => rendre(o.focus));
  dlg.addEventListener('toggle', (ev) => { if (ev.target.id === 'a-scores-liste' && E) { E.scoresOuverts = ev.target.open; suivreBarre(); } }, true);
  dlg.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b || !E) return;
    const a = b.dataset.action;
    if (a === 'fermer') { if (parHistorique) history.back(); else fermer(); return; }
    if (a === 'partager') { partager(b.dataset.carte); if (b.dataset.barre) { const c = dlg.querySelector('[data-carte="0"].a-reseau'); if (c) c.scrollIntoView({ block: 'start' }); } return; }
    if (a === 'copier') { copierCarte(b.dataset.carte); return; }
    if (a === 'enregistrer') { enregistrerCarte(b.dataset.carte); return; }
    if (a === 'taper-scores') { allerAuxScores(); return; }
    if (a === 'voir-tout') { const r = b.dataset.reseau; E.ouvert[r] = !E.ouvert[r]; const ta = dlg.querySelector('[data-texte="' + r + '"]'); if (ta) ta.rows = E.ouvert[r] ? 14 : 3; b.textContent = E.ouvert[r] ? 'Replier' : 'Voir tout'; b.setAttribute('aria-expanded', String(E.ouvert[r])); return; }
    if (a === 'texte-prepare') { E.edites[b.dataset.reseau] = undefined; majCartes(); return; }
    if (a === 'monter-video') { preparerMontage(false); return; }
    if (a === 'arreter-video') { if (E.controle) E.controle.abort(); return; }
    if (a === 'voix-oui') { E.voixChoix = 'oui'; E.besoinChoixVoix = false; monterVideo(); return; }
    if (a === 'voix-non') { E.voixChoix = 'non'; E.besoinChoixVoix = false; monterVideo(); return; }
    if (a === 'ajouter-prenom') { E.prenoms.push({ t: '', accord: false }); rendre({ selecteur: '#a-pr-' + (E.prenoms.length - 1) }); return; }
    if (b.dataset.objet) {
      const c = b.dataset.vcListe; const L = Array.isArray(E.champsVideo[c]) ? [...E.champsVideo[c]] : []; const k = L.indexOf(b.dataset.objet);
      const champ = (E.x.modele.champs || []).find((x) => x.id === c) || {};
      if (k >= 0) L.splice(k, 1); else if (L.length < (champ.max || 8)) L.push(b.dataset.objet);
      E.champsVideo[c] = L; marquerVideoPerimee(); rendre({ selecteur: '[data-objet="' + CSS.escape(b.dataset.objet) + '"]' });
      if (montageAuto(pub) && E.video.etat !== 'pret') preparerMontage(true);
      return;
    }
    const li = b.closest('.vignette'); if (!li || !b.dataset.v) return;
    const i = +li.dataset.i;
    if (b.dataset.v === 'retirer') { URL.revokeObjectURL(E.medias[i].url); E.medias.splice(i, 1); signaler('Retirée.'); }
    else { const j = b.dataset.v === 'haut' ? i - 1 : i + 1; if (j < 0 || j >= E.medias.length) return; [E.medias[i], E.medias[j]] = [E.medias[j], E.medias[i]]; }
    afficherVignettes(); apresMedias();
    const cible = dlg.querySelector('.vignette[data-i="' + Math.min(i, E.medias.length - 1) + '"] button:not([disabled])') || dlg.querySelector('label[for="a-galerie"]'); if (cible) cible.focus();
  });
  dlg.addEventListener('input', (ev) => {
    const t = ev.target; if (!E) return;
    if (t.dataset.texte) { E.edites[t.dataset.texte] = t.value; return; }
    if (t.dataset.prenom != null) { E.prenoms[+t.dataset.prenom].t = t.value; majPlusTard(); return; }
    if (t.dataset.vc && t.type === 'text') { E.champsVideo[t.dataset.vc] = t.value; marquerVideoPerimee(); return; }
    if (t.dataset.e && (t.type === 'text' || t.tagName === 'TEXTAREA')) saisie(t);
  });
  dlg.addEventListener('change', async (ev) => {
    const t = ev.target; if (!E) return;
    if (t.id === 'a-galerie') {
      const tous = [...t.files]; const avant = E.medias.length;
      for (const f of tous) if (/^(image|video)\//.test(f.type)) E.medias.push({ nom: f.name, type: f.type, fichier: f, url: URL.createObjectURL(f) });
      const ecartes = tous.length - (E.medias.length - avant); const ajoutes = E.medias.length - avant;
      t.value = ''; afficherVignettes();
      const ecart = ecartes ? (ecartes > 1 ? ecartes + ' fichiers ne sont' : '1 fichier n\'est') + ' ni une photo ni une vidéo : ' + (ecartes > 1 ? 'ils ne sont pas pris.' : 'il n\'est pas pris.') : '';
      signaler(ajoutes ? (E.medias.length + (E.medias.length > 1 ? ' photos ou vidéos choisies.' : ' photo ou vidéo choisie.')) + (ecart ? ' ' + ecart : '') : ecart || 'Rien de choisi.', ecart ? 6000 : 4000);
      if (ajoutes) apresMedias();
      return;
    }
    if (t.dataset.reseau && t.type === 'checkbox') { await cocherFait(t.dataset.reseau, t.checked); return; }
    if (t.dataset.prenom != null) { rendre({ selecteur: '#a-pr-' + t.dataset.prenom }); return; }
    if (t.dataset.accord != null) { E.prenoms[+t.dataset.accord].accord = t.checked; majCartes(); return; }
    if (t.dataset.vc) {
      const c = (E.x.modele.champs || []).find((x) => x.id === t.dataset.vc) || {};
      E.champsVideo[t.dataset.vc] = t.type === 'checkbox' ? t.checked : t.value;
      marquerVideoPerimee();
      if (c.type === 'choix' || c.type === 'oui_non' || c.type === 'interrupteur') rendre({ selecteur: '[data-vc="' + t.dataset.vc + '"]' + (t.type === 'radio' ? '[value="' + t.value + '"]' : '') });
      else majVideo();
      if (montageAuto(pub) && E.video.etat !== 'pret') preparerMontage(true);
      return;
    }
    if (t.dataset.e && !(t.type === 'text' || t.tagName === 'TEXTAREA')) saisie(t);
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); if (parHistorique) history.back(); else fermer(); });
  addEventListener('popstate', () => { if (dlg.open) { parHistorique = false; fermer(); } });
  // appli passée en arrière-plan : la voix est libérée (sauf pendant un montage), Android garde ainsi l'appli et ses photos plus longtemps
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && (!E || E.video.etat !== 'montage')) V.libererVoix(); });
}

export async function ouvrirAtelier(p, app, depuis) {
  App = app; dlg = dlg || document.getElementById('atelier');
  pub = p; declencheur = depuis || null;
  if (!dlg.dataset.branche) brancher();
  E = await etatDepart(p);
  $('.a-retour', dlg).innerHTML = '<button type="button" class="lien retour" data-action="fermer">' + PICTOS.retour + 'Retour</button>';
  rendre();
  App.atelierOuvert = true;
  dlg.showModal();
  dlg.scrollTop = 0; $('.a-corps', dlg).scrollTop = 0;
  try { history.pushState({ atelier: 1 }, '', location.href); parHistorique = true; } catch (e) { parHistorique = false; }
  const t = $('#atelier-titre', dlg); if (t) t.focus();
  if (montageAuto(p)) preparerMontage(true);
}
export const atelierRendre = () => { if (dlg && dlg.open && E) { marquerVideoPerimee(); rendre(); } };
export const atelierEnCours = () => !!(dlg && dlg.open);
window.__atelierEtat = () => E;   // pour les essais
