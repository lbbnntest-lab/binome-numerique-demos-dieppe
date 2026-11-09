/* Le studio de la page TikTok du BCR : même écran pour toutes les publications.
   Le club colle ses photos et vidéos, tape ce qu'on lui demande (souvent rien), choisit l'habillage ; la vidéo se monte
   dans le téléphone (js/tiktok-studio.js), avec la voix de synthèse (js/tiktok-voix.js). Rien n'est envoyé.
   Ce fichier calcule aussi les valeurs que le moteur attend de la page (légendes, mémoire du défi, phrases selon le score). */
import DONNEES from './tiktok-donnees.js';
import { esc, maj, HAB_NOMS, HAB_SERIE, dessinHabillage, pilierDe, dateLongue, ecartJours, stocker, relire } from './tiktok-commun.js';
import { mediasExemple, imagesDemonstration, resultats31 } from './tiktok-exemple.js';

const MODELES = Object.fromEntries(DONNEES.modeles.map(m => [m.id, m]));
let MOTEUR = null;
async function moteur() {
  if (!MOTEUR) { const [s, v] = await Promise.all([import('./tiktok-studio.js'), import('./tiktok-voix.js')]); MOTEUR = { S: s.BCRStudio, V: v.BCRVoix }; }
  return MOTEUR;
}
export async function voixDejaLa() { const { V } = await moteur(); return V.disponible() || await V.dejaTelechargee(); }

/* ---------- fabrication : voix puis montage, une seule barre d'avancement ---------- */
async function fabriquer({ modele, valeurs, medias, habillage, montrer, signal, date }) {
  const { S, V } = await moteur();
  const caps = await S.capacites();
  if (!caps.ok) throw new Error(caps.message);
  const M = S.preparer(modele, valeurs);
  let voix = null, sansVoix = false; let part = 0;
  if (M.textesVoix.length) {
    const deja = V.disponible() || await V.dejaTelechargee();
    part = deja ? 0.12 : 0.45;
    try {
      await V.preparer({ onProgres: (f) => montrer(f * (part - 0.06), deja ? 'Préparation de la voix…' : 'Téléchargement de la voix, une seule fois : ' + Math.round(f * 100) + ' %') });
      montrer(part - 0.05, 'La voix lit le texte…');
      voix = await V.dire(M.textesVoix);
      // petit téléphone (4 Go ou moins) : la voix est libérée tout de suite, elle se recharge depuis le téléphone la fois suivante
      if ((navigator.deviceMemory || 8) <= 4) V.arreter();
    } catch (e) { voix = null; sansVoix = true; }
  }
  if (signal && signal.aborted) throw new Error('Montage arrêté.');
  const r = await S.monter({ montage: M, medias, voix, habillage, signal, date, onProgres: (f) => montrer(part + f * (1 - part), 'Montage de la vidéo : ' + Math.round(f * 100) + ' %') });
  let legende = r.legende || '';
  if (!r.voixSynthese) legende = legende.replace(/\n?Voix : synthèse vocale\s*$/, '');
  if (sansVoix) r.avertissements.unshift('La voix n\'a pas pu se préparer sur ce téléphone : la vidéo est faite sans voix, avec les textes à l\'écran.');
  return { r, M, sansVoix, legende };
}

/* ---------- l'exemple : vrais résultats du samedi 31 octobre ---------- */
export async function monterExemple(montrer) {
  const modele = MODELES['resultats-scores-qui-tombent'];
  const matchs = resultats31();
  if (!matchs.length) throw new Error('Les résultats de l\'exemple sont introuvables.');
  montrer(0.02, 'Préparation des images…');
  const medias = await mediasExemple();
  const valeurs = { matchs, bandeau: DEVISE, coeur: '💚', surtitre: 'Samedi 31 octobre', intro_voix: 'Samedi 31 octobre : ', n: 4, date: '2026-10-31' };
  const { r, sansVoix } = await fabriquer({ modele, valeurs, medias, habillage: 'oblique', montrer, date: '2026-10-31' });
  return { blob: r.blob, duree: r.duree, sansVoix };
}

/* ---------- valeurs que la page calcule pour le moteur ---------- */
const MEMOIRE_DEFI = 'bcr-tiktok-defi';
const DEVISE = "Passion, esprit d'équipe, respect, Rouxmesnil";
const MOVEMBER = 'Le BCR soutient Movember';
const FIN_MOVEMBER = '2026-11-30';
const heureChamp = (h) => { const m = /(\d{1,2})\s*[h:]\s*(\d{2})?/.exec(h || ''); return m ? m[1].padStart(2, '0') + ':' + (m[2] || '00') : ''; };
const estCommune = (p) => /commune/i.test(p || '');
function listeDe(champ, ctx) {
  if (champ.options) return champ.options.map(o => ({ v: o, t: o }));
  if (champ.options_selon_equipe) {
    const jeunes = DONNEES.listes.categories_jeunes.includes(ctx.categorie);
    return (ctx.categorie && !jeunes ? champ.options_selon_equipe.seniors : champ.options_selon_equipe.jeunes).map(o => ({ v: o, t: maj(o) }));
  }
  const L = DONNEES.listes[champ.liste];
  if (Array.isArray(L)) return L.map(o => typeof o === 'string' ? { v: o, t: o } : { v: o.libelle, t: maj(o.libelle) });
  if (L && L.choix) return L.choix.map(o => ({ v: o.libelle, t: maj(o.libelle) }));
  if (L && L.noms) return L.noms.map(o => ({ v: o, t: o }));
  return [];
}
function consignesChoix(modele, champs) {
  const r = [];
  const q = (DONNEES.listes.qui_defi.choix || []).find(c => c.libelle === champs.qui); if (q && q.consigne) r.push(q.consigne);
  const s = (DONNEES.listes.sacs.choix || []).find(c => c.libelle === champs.qui_sac); if (s && s.consigne) r.push(s.consigne);
  const pc = DONNEES.listes.partenaires.consignes || {}; const part = champs.partenaire || champs.partenaire_du_week_end;
  if (part && pc[part]) r.push(pc[part]);
  return r;
}
function memoireDefi() { return relire(MEMOIRE_DEFI, {}); }

export function valeursPour(x, saisie, S, ctx) {
  const p = x.p, modele = x.modele, c = saisie.champs;
  const v = { ...p.valeurs, coeur: p.coeur, bandeau: p.bandeau, releve: DONNEES.releve, n: p.i, date: x.date };
  // calendrier décalé : le bandeau suit la vraie date (Movember jusqu'au 30 novembre, la devise ensuite)
  if (p.bandeau === MOVEMBER || p.bandeau === DEVISE) { const nov = x.date <= FIN_MOVEMBER; v.bandeau = nov ? MOVEMBER : DEVISE; v.coeur = nov ? '💙' : '💚'; }
  // les 4 vidéos Movember : accent bleu, comme les visuels du club ce mois-là
  if ((p.hashtags || []).includes('#Movember') && x.date <= FIN_MOVEMBER) v.theme = 'movember';
  for (const k in c) if (c[k] !== '' && c[k] != null) v[k] = c[k];
  // la liste des matchs, avec les corrections du club
  if (saisie.matchs) {
    v.matchs = saisie.matchs.map(m => ({ ...m, nous: m.nous === '' ? null : m.nous, eux: m.eux === '' ? null : m.eux }));
    const derby = v.matchs.find(m => m.derby && m.actif !== false && m.heure); if (derby) v.heure_derby = derby.heure;
  }
  // un seul score (coup de sifflet) : le match à la une
  if (c.score_nous !== undefined && v.matchs && v.matchs.length) { const h = v.matchs.find(m => m.une) || v.matchs[0]; h.une = true; h.nous = c.score_nous; h.eux = c.score_eux; }
  delete v.score_nous; delete v.score_eux;
  if (modele.id === 'joker-mot-du-coach') { v.nous = c.score_nous; v.eux = c.score_eux; }
  const calc = v.matchs ? S.calculer(v.matchs) : {};
  // le match à la une sans score : la voix n'en parle pas (jamais « Score final : à contre… ») ; score non montré : la phrase sans score
  const une = (calc.__matchs || []).find(m => m.une);
  // 9 novembre : la phrase du score selon le résultat
  if (v.voix_heros_score_sans && / \/ /.test(v.voix_heros_score_sans)) {
    const [vic, def] = v.voix_heros_score_sans.split(' / ');
    v.voix_heros_score_sans = calc.victoire ? vic : def.replace(/^\(défaite\)\s*/, '');
  }
  if (une && typeof v.voix_heros_score === 'string') {
    if (!une.joue) v.voix_heros_score = '';
    else if (!une.lisible && v.voix_heros_score_sans) v.voix_heros_score = v.voix_heros_score_sans;
  }
  // résultats : légende
  if (v.matchs) {
    const joues = (calc.__matchs || []).filter(m => m.joue);
    const autres = joues.filter(m => !m.une);
    v.liste_autres_scores = autres.map(m => m.derby ? 'Derby des ' + m.equipe_ecran + ' : bravo aux deux équipes !' : m.equipe_ecran + ' · ' + m.score_affiche + ' · ' + (m.adversaire || '')).join('\n');
    if (!autres.length && v.phrase_legende) v.phrase_legende = '';
    const nv = calc.n_victoires || 0;
    if (nv > 0 && nv >= (calc.n_joues_hors_derby || 0) / 2) v.accroche_legende_resultats = nv + ' ' + calc.victoire_s + ' ce week-end 💪 Quel match vous a fait vibrer ?';
    else if (nv > 0) v.accroche_legende_resultats = 'Le match à retenir : ' + (calc.retenir_equipe || '') + ' 🏀 Quel match vous a fait vibrer ?';
    else v.accroche_legende_resultats = v.legende_sans_victoire || 'Bravo à toutes nos équipes, et merci aux supporters !';
    v.phrase_legende_ligne = v.phrase_legende ? v.phrase_legende + '\n' : '';
    const h = (calc.__matchs || []).find(m => m.une);
    if (h) {
      v.heros_equipe_legende = maj(h.voix_equipe) + ',';
      v.heros_score_legende = h.lisible ? h.nous + ' à ' + h.eux : (h.victoire ? 'victoire' : 'se sont battues');
    }
  }
  // programme : partenaire du week-end
  const pw = v.partenaire_du_week_end;
  v.ligne_partenaire = pw ? (estCommune(pw) ? 'Avec le soutien de la commune de Rouxmesnil-Bouteilles\n' : (v.contrepartie === 'non' ? '' : 'Collaboration commerciale · ') + 'Partenaire du week-end : ' + pw + '\n') : '';
  // « On est passés chez… »
  if (v.partenaire) {
    const com = estCommune(v.partenaire);
    v.prefixe_collaboration = !com && v.contrepartie !== 'non' ? 'Collaboration commerciale · ' : '';
    v.phrase_partenaire_legende = com ? 'Avec le soutien de la commune de Rouxmesnil-Bouteilles.' : 'Ils sont avec le club cette saison : passez les voir de notre part !';
    if (com) v.contrepartie = 'non';
  }
  // sac, défi, rétro, bilan
  if (v.qui_sac) { v.qui_sac_voix = v.qui_sac; const s = DONNEES.listes.sacs.choix.find(o => o.libelle === v.qui_sac); if (s && !c.sac_intro_voix) v.sac_intro_voix = s.intro_voix; }
  if (v.defi_saison_2) { const d = DONNEES.listes.defis_saison_2.find(o => o.libelle === v.defi_saison_2); v.defi_saison_2_voix = d ? d.voix : v.defi_saison_2; }
  if (modele.id === 'defi-dix-lancers') {
    if (v.qui) v.qui_legende = v.qui;   // en milieu de phrase dans la légende : « Dix lancers francs : un coach en a mis 7. »
    const mem = memoireDefi(); const manche = +v.manche || 1;
    const avant = []; for (let k = 1; k < manche; k++) if (mem['manche_' + k] != null) avant.push(+mem['manche_' + k]);
    const prec = mem['manche_' + (manche - 1)] != null ? mem['manche_' + (manche - 1)] : c.a_battre_saisi;
    const meilleur = avant.length ? Math.max(...avant) : c.a_battre_saisi;
    if (typeof v.a_battre_ecran === 'string') {
      v.a_battre_ecran = v.a_battre_ecran.replace('{memoire.manche_1}', prec != null && prec !== '' ? prec : '').replace('{memoire.meilleur}', meilleur != null && meilleur !== '' ? meilleur : '');
      if (/:\s+\/ 10/.test(v.a_battre_ecran)) v.a_battre_ecran = '';
    }
    delete v.a_battre_saisi;
  }
  if (modele.id === 'special-compte-a-rebours-ce-soir') { const h = c.heure_demain || v.heure_demain || '15:00'; v.heure_demain_ecran = S.heureEcran(h); v.heure_demain_voix = S.heureVoix(h); }
  if (modele.id === 'special-bilan-30s') v.bilan_tournoi = (ctx.depart || '') <= '2026-11-20' ? ', un tournoi Movember' : '';
  if (modele.id === 'special-retro') v.fin_retro_legende = v.annee ? 'Un souvenir de cette époque ? Dites-le en commentaire ! 👇' : 'Dites-nous l\'année en commentaire ! 👇';
  if (modele.id === 'special-bilan-30s') v.n_semaines = Math.max(1, Math.ceil((ecartJours(ctx.depart, x.date) + 1) / 7));
  // vidéos décalées après le tournoi : la voix ne l'annonce plus
  if (x.date >= '2026-11-20' && typeof v.voix_fin === 'string' && /tournoi Movember/.test(v.voix_fin)) delete v.voix_fin;
  if (saisie.reponses && saisie.reponses.length) v.reponses = saisie.reponses.slice();
  return v;
}
export function legendeFinale(texte, p) {
  let t = String(texte || '').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  const tags = (p.hashtags || []).join(' ');
  if (tags) t = /\nVoix : synthèse vocale$/.test(t) ? t.replace(/\nVoix : synthèse vocale$/, '\n' + tags + '\nVoix : synthèse vocale') : t + '\n' + tags;
  return t;
}

/* ---------- copier ---------- */
function copier(t, zone) {
  const repli = () => { zone.focus(); zone.select(); try { return document.execCommand('copy') ? 'ok' : 'manuel'; } catch (e) { return 'manuel'; } };
  if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) return navigator.clipboard.writeText(t).then(() => 'ok', repli);
  return Promise.resolve(repli());
}

/* ---------- l'écran du studio ---------- */
let ouvert = null;
export async function ouvrirStudio(x, ctx) {
  const dlg = document.getElementById('studio'); if (!dlg) return;
  if (ouvert) ouvert.fermer();
  const { S } = await moteur();
  const p = x.p, modele = x.modele;
  const cleBrouillon = 'bcr-tiktok-brouillon-' + p.i;
  const brouillon = relire(cleBrouillon, {});
  const saisie = { champs: { ...(brouillon.champs || {}) }, matchs: null, reponses: [] };
  const champs = modele.champs || [];
  const ids = champs.map(c => c.id);
  const aMatchs = ids.includes('matchs') || ids.includes('scores') || ids.includes('score');
  if (aMatchs && p.matchs) {
    const bm = brouillon.matchs || [];
    saisie.matchs = p.matchs.map((m, k) => ({ ...m, actif: true, nous: '', eux: '', ...(bm[k] && bm[k].cle === m.cle && bm[k].equipe === m.equipe ? { actif: bm[k].actif, heure: bm[k].heure, nous: bm[k].nous, eux: bm[k].eux, photo: bm[k].photo, retenir: !!bm[k].retenir } : {}) }));
    (brouillon.ajoutes || []).forEach(m => saisie.matchs.push(m));
  }
  // valeurs proposées par le calendrier
  champs.forEach((c) => { if (saisie.champs[c.id] === undefined && p.valeurs[c.id] !== undefined) saisie.champs[c.id] = p.valeurs[c.id]; });
  if (ids.includes('presentation_choisie') && !saisie.champs.presentation_choisie && p.valeurs.presentation_proposee) saisie.champs.presentation_choisie = p.valeurs.presentation_proposee;
  champs.forEach((c) => { if (saisie.champs[c.id] === undefined && c.defaut !== undefined) saisie.champs[c.id] = c.defaut; });
  const medias = []; const urls = [];
  let habillage = x.habillage; let resultat = null; let controle = null; let urlVideo = null;
  const habs = S.habillages(modele.serie_cle).filter(h => HAB_NOMS[h]);
  if (!habs.includes(habillage)) habillage = habs[0];
  const min = (modele.medias && modele.medias.min) || 0, max = (modele.medias && modele.medias.max) || 8;
  const videoSeule = modele.medias && modele.medias.types && !modele.medias.types.includes('photo');
  const regle = DONNEES.regles.enfants[modele.regle_enfants] || DONNEES.regles.enfants.R1;
  const P = pilierDe(modele);
  const titre = p.titre.includes(' · ') ? p.titre.split(' · ').slice(1).join(' · ') : p.titre;
  const serie = p.titre.includes(' · ') ? p.titre.split(' · ')[0] : modele.serie;
  const voixSynthese = modele.voix != null;
  const nbTexte = min === max ? String(min) : min + ' à ' + max;
  // le match à la une (celui dont parle la voix) : signalé dans la liste, et rappel en clair s'il manque son score
  const usesHeros = /heros_/.test(JSON.stringify(modele.plans || []) + JSON.stringify(modele.voix || '') + JSON.stringify(p.valeurs || {}));
  const vide = (x) => x === '' || x == null;
  const nomSimple = (e) => S.equipeEcran(e).replace(/\s*·\s*/g, ' ');
  function texteUne() { const m = (saisie.matchs || []).find(y => y.une); if (!m || m.actif === false || !(vide(m.nous) || vide(m.eux))) return ''; return 'Tapez le score des ' + nomSimple(m.equipe) + ', ou la vidéo ne parlera pas du score.'; }
  // victoires dont le score peut être montré (pas de jeunes à 30 points d'écart ou plus, pas de derby)
  function victoiresMontrables() { return (saisie.matchs || []).map((m, k) => ({ m, k })).filter(({ m }) => m.actif !== false && !m.derby && !vide(m.nous) && !vide(m.eux) && +m.nous > +m.eux && !(/^U(11|13|15|18)\b/.test(m.equipe || '') && +m.nous - +m.eux >= 30)); }
  function optionsRetenir() { const L = victoiresMontrables(); const choisi = L.find(({ m }) => m.retenir); return '<option value="">' + (L.length ? 'La victoire la plus serrée (choisie pour vous)' : 'Tapez d’abord les scores') + '</option>' + L.map(({ m, k }) => '<option value="' + k + '"' + (choisi && choisi.k === k ? ' selected' : '') + '>' + esc(S.equipeEcran(m.equipe) + ' · ' + m.nous + ' – ' + m.eux + (m.adversaire ? ' · ' + m.adversaire : '')) + '</option>').join(''); }

  dlg.innerHTML = '<div class="studio-boite">'
    + '<header class="studio-tete"><div><p class="studio-quand">' + esc(maj(dateLongue(x.date))) + ', ' + esc(p.heure) + '</p>'
    + '<h2 id="studio-titre">' + esc(modele.id === 'special-bilan-30s' ? titre.replace(/^\d+ semaines/, Math.max(1, Math.ceil((ecartJours(ctx.depart, x.date) + 1) / 7)) + ' semaines') : titre) + '</h2><p class="studio-serie">' + esc(serie) + ' <span class="pilier pilier-' + P.cle + '">' + esc(P.nom) + '</span></p></div>'
    + '<button type="button" class="bouton ligne studio-fermer" data-fermer>Fermer</button></header>'
    + '<div class="studio-corps">'
    + '<section class="etape" aria-labelledby="et-medias"><h3 id="et-medias"><span class="num">1</span> Vos photos et vidéos</h3>'
    + '<p class="rappel"><strong>Enfants :</strong> <span data-rappel>' + esc(regle) + '</span></p>'
    + '<ul class="consignes" data-consignes></ul>'
    + '<p class="besoin">' + esc(modele.medias.consignes || '') + (max ? ' <span class="nb">(' + (min ? nbTexte : 'jusqu\'à ' + max) + ')</span>' : '') + '</p>'
    + '<label class="bouton plein ajouter">Ajouter photos et vidéos<input type="file" multiple accept="' + (videoSeule ? 'video/*,image/*' : 'image/*,video/*') + '" data-fichiers></label>'
    + '<ol class="vignettes" data-vignettes></ol>'
    + '<div class="sans-media" data-sans-media></div>'
    + '</section>'
    + (champs.length ? '<section class="etape" aria-labelledby="et-taper"><h3 id="et-taper"><span class="num">2</span> À taper</h3><div data-champs></div></section>' : '')
    + '<section class="etape" aria-labelledby="et-hab"><h3 id="et-hab"><span class="num">' + (champs.length ? 3 : 2) + '</span> L\'habillage</h3>'
    + '<p class="petit">Choisi par le calendrier pour changer d\'une semaine à l\'autre. Vous pouvez en prendre un autre.</p>'
    + '<div class="habillages" role="radiogroup" aria-labelledby="et-hab">' + habs.map(h => '<label class="hab-choix"><input type="radio" name="hab" value="' + h + '"' + (h === habillage ? ' checked' : '') + '>' + dessinHabillage(h).replace('width="14" height="24"', 'width="24" height="40"') + '<span>' + esc(HAB_NOMS[h]) + '</span></label>').join('') + '</div></section>'
    + '<section class="etape" aria-labelledby="et-video"><h3 id="et-video"><span class="num">' + (champs.length ? 4 : 3) + '</span> La vidéo</h3>'
    + '<p class="petit">' + (voixSynthese ? 'Avec la voix de synthèse et les sous-titres. ' : 'Sans voix de synthèse : on entend le son de vos vidéos. ') + 'Comptez environ une minute ; gardez l\'écran allumé.</p>'
    + '<p class="manque" data-manque role="alert"></p>'
    + '<div class="rangee"><button type="button" class="bouton plein grand-bouton" data-monter>Monter la vidéo</button><button type="button" class="bouton ligne" data-arreter hidden>Arrêter</button></div>'
    + '<div class="avancement" data-avancement hidden><div class="barre" aria-hidden="true"><span></span></div><p class="avancement-texte" role="status" aria-live="polite"></p></div>'
    + '<div class="resultat" data-resultat hidden>'
    + '<div class="ecran ecran-studio" data-apercu></div>'
    + '<ul class="avertissements" data-avert></ul>'
    + '<div class="rangee"><button type="button" class="bouton plein" data-enregistrer>Enregistrer la vidéo</button><button type="button" class="bouton ligne" data-copier>Copier la légende</button></div>'
    + '<p class="etat" data-etat role="status"></p>'
    + '<label class="lib" for="legende-' + p.i + '">La légende à coller</label><textarea id="legende-' + p.i + '" class="legende" data-legende rows="6"></textarea>'
    + '<h4>Pour publier, 3 gestes</h4><ol class="trois-gestes" data-gestes></ol>'
    + '</div></section>'
    + '</div></div>';

  const $ = (s) => dlg.querySelector(s);
  const zoneChamps = $('[data-champs]');

  function sauver() { stocker(cleBrouillon, { champs: saisie.champs, matchs: (saisie.matchs || []).filter(m => !m.ajoute).map(m => ({ cle: m.cle, equipe: m.equipe, actif: m.actif, heure: m.heure, nous: m.nous, eux: m.eux, photo: m.photo, retenir: !!m.retenir })), ajoutes: (saisie.matchs || []).filter(m => m.ajoute) }); }
  function majConsignes() {
    const L = [...(modele.consignes_collage || []), ...consignesChoix(modele, saisie.champs)];
    $('[data-consignes]').innerHTML = [...new Set(L)].map(t => '<li>' + esc(t) + '</li>').join('');
  }

  /* --- médias --- */
  function dessinerMedias() {
    const ol = $('[data-vignettes]'); const avecReponses = ids.includes('reponses');
    ol.innerHTML = medias.map((m, k) => '<li class="vignette' + (m.etat === 'illisible' ? ' illisible' : '') + '">'
      + (m.etat === 'illisible' ? '<span class="v-vide" aria-hidden="true">?</span>' : m.genre === 'video' ? '<video src="' + m.url + '#t=0.5" muted playsinline preload="metadata" aria-hidden="true"></video>' : (m.vignette ? '<img src="' + m.vignette + '" alt="" width="56" height="72">' : '<span class="v-vide" aria-hidden="true"></span>'))
      + '<span class="v-texte"><strong>' + (k + 1) + '.</strong> ' + (m.genre === 'video' ? 'Vidéo' : 'Photo') + (m.demo ? ' de démonstration' : '') + (m.etat === 'illisible' ? ' <span class="v-illisible">illisible : retirez-la</span>' : '') + '</span>'
      + (avecReponses && m.genre === 'video' ? '<label class="case petite"><input type="checkbox" data-reponse="' + k + '"' + (saisie.reponses.includes(k + 1) ? ' checked' : '') + '><span>Un adulte répond</span></label>' : '')
      + '<span class="v-boutons">' + (k ? '<button type="button" class="bouton ligne petit-bouton" data-avant="' + k + '" aria-label="Mettre le média ' + (k + 1) + ' plus tôt">Avant</button>' : '')
      + '<button type="button" class="bouton ligne petit-bouton" data-retirer="' + k + '" aria-label="Retirer le média ' + (k + 1) + '">Retirer</button></span></li>').join('');
    const sm = $('[data-sans-media]');
    if (!medias.length) {
      sm.innerHTML = (modele.passer_si_aucun_media ? '<p>Pas de photo ni de vidéo pour celle-ci ? Passez-la : rien à rattraper.</p>' : (min ? '' : '<p>Sans photo ni vidéo, la vidéo se fait sur un fond à nos couleurs.</p>'))
        + '<p>Pour voir le résultat tout de suite :</p><button type="button" class="bouton ligne" data-demo>Essayer avec nos images de démonstration</button>';
    } else sm.innerHTML = '<p class="petit">' + medias.length + ' sur ' + max + ' au plus. L\'ordre compte : c\'est celui de la vidéo.</p>';
    if (ids.includes('debut_dernier_tir')) dessinerCurseur();
    if (modele.id === 'resultats-carnet') dessinerChamps();
  }
  // Chaque média est essayé dès l'ajout (une photo .heic que ce téléphone ne sait pas lire, une vidéo abîmée) ;
  // la vignette est une petite image réduite (jamais la photo de 4000 × 6000 décodée pour 56 px).
  async function essayer(m) {
    try {
      if (m.genre === 'photo') {
        let b; try { b = await createImageBitmap(m.f, { resizeWidth: 112, resizeQuality: 'medium', imageOrientation: 'from-image' }); }
        catch (e) { b = await createImageBitmap(m.f); }
        const s = 112 / b.width; const cv = document.createElement('canvas'); cv.width = 112; cv.height = Math.max(1, Math.round(b.height * s));
        cv.getContext('2d').drawImage(b, 0, 0, cv.width, cv.height); if (b.close) b.close();
        const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.8)); if (!blob) throw new Error('vignette');
        m.vignette = URL.createObjectURL(blob); urls.push(m.vignette);
      } else {
        await new Promise((ok, ko) => { const v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; let t = 0; const fin = (e) => { clearTimeout(t); v.onloadeddata = v.onerror = null; v.removeAttribute('src'); v.load(); if (e) ko(e); else ok(); }; t = setTimeout(() => fin(new Error('délai')), 10000); v.onloadeddata = () => fin(); v.onerror = () => fin(new Error('illisible')); v.src = m.url; });
      }
      m.etat = 'ok';
    } catch (e) { m.etat = 'illisible'; }
  }
  function ajouter(fichiers, demo) {
    let refus = 0, trop = 0; const nouveaux = [];
    for (const f of fichiers) {
      if (!f || !/^(image|video)\//.test(f.type || '') && !/\.(jpe?g|png|webp|heic|heif|mp4|mov|m4v|webm)$/i.test(f.name || '')) { refus++; continue; }
      if (medias.length >= max) { trop++; continue; }
      const url = URL.createObjectURL(f); urls.push(url);
      const m = { f, url, genre: /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name) ? 'video' : 'photo', demo: !!demo, etat: 'essai' };
      medias.push(m); nouveaux.push(m);
    }
    const message = () => { const t = [];
      if (refus) t.push(refus > 1 ? refus + ' fichiers ne sont ni des photos ni des vidéos : ils ne sont pas ajoutés.' : 'Un fichier n\'est ni une photo ni une vidéo : il n\'est pas ajouté.');
      if (trop) t.push('Cette publication prend ' + max + ' photos ou vidéos au plus : ' + (trop > 1 ? 'les ' + trop + ' autres ne sont pas ajoutées.' : 'la dernière n\'est pas ajoutée.'));
      if (t.length) $('[data-sans-media]').insertAdjacentHTML('beforeend', '<p class="petit" role="status">' + esc(t.join(' ')) + '</p>'); };
    dessinerMedias(); message();
    Promise.all(nouveaux.map(essayer)).then(() => { if (!dlg.open || !medias.length) return; dessinerMedias(); message(); });
  }
  $('[data-fichiers]').addEventListener('change', (e) => { ajouter([...e.target.files]); e.target.value = ''; });
  $('[data-vignettes]').addEventListener('click', (e) => {
    const a = e.target.closest('[data-avant]'), r = e.target.closest('[data-retirer]');
    if (a) { const k = +a.dataset.avant; [medias[k - 1], medias[k]] = [medias[k], medias[k - 1]]; saisie.reponses = []; dessinerMedias(); }
    if (r) { const k = +r.dataset.retirer; medias.splice(k, 1); saisie.reponses = []; dessinerMedias(); }
  });
  $('[data-vignettes]').addEventListener('change', (e) => {
    const c = e.target.closest('[data-reponse]'); if (!c) return;
    saisie.reponses = [...dlg.querySelectorAll('[data-reponse]')].filter(x => x.checked).map(x => +x.dataset.reponse + 1);
  });
  $('[data-sans-media]').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-demo]'); if (!b) return;
    b.disabled = true; b.textContent = 'Préparation des images…';
    const imgs = await imagesDemonstration();
    ajouter(imgs.slice(0, Math.max(min, Math.min(max, imgs.length))), true);
  });

  /* --- curseur du dernier tir (défi) --- */
  function dessinerCurseur() {
    const zone = dlg.querySelector('[data-curseur]'); if (!zone) return;
    const v = medias.find(m => m.genre === 'video');
    if (!v) { zone.innerHTML = '<p class="petit">Ajoutez la vidéo des 10 tirs : le réglage du dernier tir apparaît ici.</p>'; delete saisie.champs.debut_dernier_tir; return; }
    const el = document.createElement('video'); el.preload = 'metadata'; el.muted = true; el.src = v.url;
    el.addEventListener('loadedmetadata', () => {
      const d = el.duration; if (!isFinite(d) || d <= 0) return;
      const val = saisie.champs.debut_dernier_tir != null && saisie.champs.debut_dernier_tir < d ? +saisie.champs.debut_dernier_tir : Math.max(0, d - 6);
      zone.innerHTML = '<label class="lib" for="curseur-' + p.i + '">Le dernier tir commence à <output data-sortie>' + val.toFixed(1).replace('.', ',') + ' s</output></label>'
        + '<input type="range" id="curseur-' + p.i + '" min="0" max="' + Math.max(0.1, d - 1).toFixed(1) + '" step="0.1" value="' + val.toFixed(1) + '" data-curseur-v>'
        + '<p class="petit">Déjà placé à 6 secondes de la fin. Déplacez-le si le dernier tir commence ailleurs.</p>';
      saisie.champs.debut_dernier_tir = +val.toFixed(1);
    }, { once: true });
  }

  /* --- champs à taper --- */
  function ligneMatch(m, k, mode) {
    const id = 'm' + p.i + '-' + k;
    const nom = esc(S.equipeEcran(m.equipe)) + ' <span class="adv">' + (m.derby ? 'contre ' + esc(m.adversaire || '') : (m.lieu === 'domicile' ? 'contre ' : 'à ') + esc(m.adversaire || '')) + '</span>';
    const jour = esc(maj((m.jour || '').slice(0, 3))) + '.';
    let h = '<li class="match' + (m.actif === false ? ' decoche' : '') + (m.une && usesHeros ? ' une' : '') + '">' + (m.une && usesHeros ? '<span class="etiquette-une">À la une</span>' : '') + '<label class="case"><input type="checkbox" data-actif="' + k + '"' + (m.actif !== false ? ' checked' : '') + ' aria-label="Garder le match ' + esc(S.equipeEcran(m.equipe)) + '"><span class="m-nom">' + nom + '</span></label><span class="m-infos">';
    if (mode === 'heure') h += '<label class="m-heure"><span class="visuellement-cache">Heure du match ' + esc(S.equipeEcran(m.equipe)) + '</span>' + jour + ' <input type="time" class="champ" value="' + esc(heureChamp(m.heure)) + '"data-heure="' + k + '"></label>' + (m.heure ? '' : '<span class="petit">horaire à confirmer</span>');
    else h += '<span class="m-jour">' + jour + ' ' + esc(m.heure || '') + (m.lieu === 'domicile' ? ', à la maison' : ', à l\'extérieur') + '</span>';
    h += '</span>';
    if (mode === 'scores') {
      h += '<span class="score"><label for="' + id + 'n" class="visuellement-cache">Score du BCR, ' + esc(S.equipeEcran(m.equipe)) + '</label><input id="' + id + 'n" class="champ chiffre" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" value="' + esc(m.nous ?? '') + '" data-nous="' + k + '"><span aria-hidden="true">à</span>'
        + '<label for="' + id + 'e" class="visuellement-cache">Score de ' + esc(m.adversaire || 'l\'adversaire') + '</label><input id="' + id + 'e" class="champ chiffre" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" value="' + esc(m.eux ?? '') + '" data-eux="' + k + '"></span>';
      if (modele.id === 'resultats-carnet' && m.lieu === 'domicile' && medias.some(x => x.genre === 'photo')) h += '<label class="m-photo">Sa photo <select class="champ" data-photo="' + k + '"><option value="">aucune</option>' + medias.map((x, j) => x.genre === 'photo' ? '<option value="' + (j + 1) + '"' + (+m.photo === j + 1 ? ' selected' : '') + '>photo ' + (j + 1) + '</option>' : '').join('') + '</select></label>';
    }
    return h + '</li>';
  }
  function champHtml(c) {
    const v = saisie.champs[c.id]; const id = 'c' + p.i + '-' + c.id;
    const lib = c.libelle ? esc(c.libelle) : ({ categorie: 'Quelle équipe ?', presentation_choisie: 'Quelle action ?', score: 'Le score du match' }[c.id] || '');
    switch (c.type) {
      case 'liste_matchs_modifiable': {
        if (ids.includes('scores')) return '';
        return '<fieldset class="groupe"><legend>' + lib + '</legend><p class="petit">Horaires de la fédération au ' + esc(DONNEES.releve) + '.</p><ul class="matchs">' + (saisie.matchs || []).map((m, k) => ligneMatch(m, k, 'heure')).join('') + '</ul></fieldset>';
      }
      case 'scores_par_match': {
        const n = (saisie.matchs || []).length;
        return '<fieldset class="groupe"><legend>' + lib + '</legend><p class="petit">' + esc(c.astuce || '') + ' Le score du BCR d\'abord. Un match annulé ? Décochez-le.</p><ul class="matchs">' + (saisie.matchs || []).map((m, k) => ligneMatch(m, k, 'scores')).join('') + '</ul>' + (n ? '' : '<p>Aucun match dans la liste.</p>') + (usesHeros ? '<p class="alerte-une" data-une role="status">' + esc(texteUne()) + '</p>' : '') + '</fieldset>';
      }
      case 'score_un_match': {
        const m = (saisie.matchs || []).find(y => y.une) || (saisie.matchs || [])[0];
        return '<fieldset class="groupe"><legend>' + lib + (m ? ' : ' + esc(S.equipeEcran(m.equipe)) + ' contre ' + esc(m.adversaire) : '') + '</legend><span class="score"><label for="' + id + 'n" class="visuellement-cache">Score du BCR</label><input id="' + id + 'n" class="champ chiffre" inputmode="numeric" pattern="[0-9]*" maxlength="3" value="' + esc(saisie.champs.score_nous ?? '') + '" data-c="score_nous"><span aria-hidden="true">à</span><label for="' + id + 'e" class="visuellement-cache">Score de l\'adversaire</label><input id="' + id + 'e" class="champ chiffre" inputmode="numeric" pattern="[0-9]*" maxlength="3" value="' + esc(saisie.champs.score_eux ?? '') + '" data-c="score_eux"></span><p class="petit">Le score du BCR d\'abord.</p></fieldset>';
      }
      case 'ajout_match': {
        const cats = DONNEES.listes.categories;
        return '<details class="groupe ajout"><summary>' + lib + '</summary><div class="ajout-grille">'
          + '<label>Équipe <select class="champ" data-aj="equipe">' + cats.map(o => '<option>' + esc(o) + '</option>').join('') + '</select></label>'
          + '<label>Adversaire <input class="champ" maxlength="40" data-aj="adversaire" autocomplete="off"></label>'
          + '<label>Jour <select class="champ" data-aj="jour"><option value="samedi">samedi</option><option value="dimanche">dimanche</option><option value="vendredi">vendredi</option></select></label>'
          + '<label>Heure (facultatif) <input type="time" class="champ" data-aj="heure"></label>'
          + '<label>Lieu <select class="champ" data-aj="lieu"><option value="domicile">à domicile</option><option value="exterieur">à l\'extérieur</option></select></label>'
          + '<button type="button" class="bouton ligne" data-ajouter-match>Ajouter ce match</button></div></details>';
      }
      case 'choix': {
        const L = listeDe(c, saisie.champs);
        return '<label class="lib" for="' + id + '">' + lib + (c.obligatoire ? '' : ' <span class="facultatif">(facultatif)</span>') + '</label><select id="' + id + '" class="champ" data-c="' + c.id + '"><option value="">' + (c.obligatoire ? 'Choisir…' : 'Aucun') + '</option>' + L.map(o => '<option value="' + esc(o.v) + '"' + (o.v === v ? ' selected' : '') + '>' + esc(o.t) + '</option>').join('') + '</select>'
          + (c.id === 'partenaire_du_week_end' && v && !estCommune(v) ? ouiNon({ id: 'contrepartie', libelle: 'Ce partenaire donne-t-il quelque chose au club (argent, lots, matériel) ?' }, saisie.champs.contrepartie || 'oui') : '');
      }
      case 'choix_multiple_ordonne': {
        const L = listeDe(c, saisie.champs), pris = Array.isArray(v) ? v : [];
        return '<fieldset class="groupe"><legend>' + lib + '</legend><div class="objets">' + L.map(o => { const k = pris.indexOf(o.v); return '<button type="button" class="objet" aria-pressed="' + (k >= 0) + '" data-objet="' + esc(o.v) + '">' + (k >= 0 ? '<span class="rang">' + (k + 1) + '</span>' : '') + esc(o.t) + '</button>'; }).join('') + '</div>'
          + '<p class="petit">' + (pris.length ? 'Dans l\'ordre : ' + esc(pris.join(', ')) + '.' : 'Aucun objet choisi.') + ' De ' + c.min + ' à ' + c.max + ' objets.</p></fieldset>';
      }
      case 'prenom': case 'texte_court':
        return '<label class="lib" for="' + id + '">' + lib + '</label><input id="' + id + '" class="champ" maxlength="' + (c.max || 40) + '" autocomplete="off" value="' + esc(v ?? '') + '" data-c="' + c.id + '">';
      case 'nombre':
        return '<label class="lib" for="' + id + '">' + lib + '</label><input id="' + id + '" class="champ chiffre large" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" value="' + esc(v ?? '') + '" data-c="' + c.id + '">';
      case 'interrupteur':
        return '<label class="case"><input type="checkbox" data-c="' + c.id + '"' + (v === true || v === 'oui' ? ' checked' : '') + '><span>' + lib + '</span></label>';
      case 'oui_non': return ouiNon(c, v || 'oui');
      case 'curseur': return '<div data-curseur></div>';
      case 'choix_match': return '<label class="lib" for="' + id + '">Le match à retenir <span class="facultatif">(facultatif)</span></label><select id="' + id + '" class="champ" data-retenir>' + optionsRetenir() + '</select><p class="petit">Seulement nos victoires dont le score peut être montré.</p>';
      case 'heure': return '<label class="lib" for="' + id + '">' + lib + '</label><input type="time" id="' + id + '" class="champ heure-seule" value="' + esc(heureChamp(v || c.defaut || '')) + '" data-c="' + c.id + '">' + (c.astuce ? '<p class="petit">' + esc(c.astuce) + '</p>' : '');
      case 'associer_photos': return '<p class="petit">' + lib + ' : cochez « Un adulte répond » sous les vidéos, à l\'étape 1.</p>';
      default: return '';
    }
  }
  function ouiNon(c, v) {
    return '<fieldset class="groupe"><legend>' + esc(c.libelle) + '</legend><label class="case"><input type="radio" name="on-' + c.id + '" value="oui" data-c="' + c.id + '"' + (v === 'oui' ? ' checked' : '') + '><span>Oui</span></label><label class="case"><input type="radio" name="on-' + c.id + '" value="non" data-c="' + c.id + '"' + (v === 'non' ? ' checked' : '') + '><span>Non</span></label></fieldset>';
  }
  function dessinerChamps() {
    if (!zoneChamps) return;
    let h = '';
    if (modele.id === 'defi-dix-lancers') {
      const manche = +p.valeurs.manche || 1, mem = memoireDefi();
      if (manche > 1 && mem['manche_' + (manche - 1)] == null) h += '<label class="lib" for="abattre-' + p.i + '">Le score de la manche ' + (manche - 1) + ', à battre (facultatif)</label><input id="abattre-' + p.i + '" class="champ chiffre large" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="' + esc(saisie.champs.a_battre_saisi ?? '') + '" data-c="a_battre_saisi">';
    }
    h += champs.map(champHtml).join('');
    zoneChamps.innerHTML = h;
    if (ids.includes('debut_dernier_tir')) dessinerCurseur();
  }
  function majScores() {
    const u = zoneChamps && zoneChamps.querySelector('[data-une]'); if (u) u.textContent = texteUne();
    const r = zoneChamps && zoneChamps.querySelector('[data-retenir]'); if (r) { const v = r.value; r.innerHTML = optionsRetenir(); if ([...r.options].some(o => o.value === v)) r.value = v; }
  }
  function lireChamp(el) {
    const k = el.dataset.c; let v;
    if (el.type === 'checkbox') v = el.checked; else if (el.type === 'radio') { if (!el.checked) return; v = el.value; } else v = el.value.trim();
    if (el.classList.contains('chiffre')) v = v === '' ? '' : (/^\d+$/.test(v) ? +v : v);
    saisie.champs[k] = v;
  }
  if (zoneChamps) {
    zoneChamps.addEventListener('input', (e) => {
      const el = e.target;
      if (el.dataset.c) lireChamp(el);
      if (el.dataset.nous !== undefined) saisie.matchs[+el.dataset.nous].nous = el.value.trim() === '' ? '' : +el.value.replace(/\D/g, '');
      if (el.dataset.eux !== undefined) saisie.matchs[+el.dataset.eux].eux = el.value.trim() === '' ? '' : +el.value.replace(/\D/g, '');
      if (el.dataset.nous !== undefined || el.dataset.eux !== undefined) majScores();
      if (el.dataset.curseurV !== undefined) { saisie.champs.debut_dernier_tir = +el.value; const o = zoneChamps.querySelector('[data-sortie]'); if (o) o.textContent = (+el.value).toFixed(1).replace('.', ',') + ' s'; }
      sauver();
    });
    zoneChamps.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.c) { lireChamp(el); if (el.tagName === 'SELECT') { if (el.dataset.c === 'categorie') delete saisie.champs.presentation_choisie; dessinerChamps(); majConsignes(); } }
      if (el.dataset.actif !== undefined) { saisie.matchs[+el.dataset.actif].actif = el.checked; el.closest('.match').classList.toggle('decoche', !el.checked); majScores(); }
      if (el.dataset.retenir !== undefined) { const k = el.value === '' ? -1 : +el.value; (saisie.matchs || []).forEach((m, j) => { m.retenir = j === k; }); }
      if (el.dataset.heure !== undefined) saisie.matchs[+el.dataset.heure].heure = el.value || null;
      if (el.dataset.photo !== undefined) saisie.matchs[+el.dataset.photo].photo = el.value ? +el.value : null;
      sauver();
    });
    zoneChamps.addEventListener('click', (e) => {
      const o = e.target.closest('[data-objet]');
      if (o) {
        const c = champs.find(y => y.type === 'choix_multiple_ordonne'); const L = Array.isArray(saisie.champs[c.id]) ? saisie.champs[c.id].slice() : [];
        const k = L.indexOf(o.dataset.objet); if (k >= 0) L.splice(k, 1); else if (L.length < c.max) L.push(o.dataset.objet);
        saisie.champs[c.id] = L; sauver(); dessinerChamps(); const b = zoneChamps.querySelector('[data-objet="' + CSS.escape(o.dataset.objet) + '"]'); if (b) b.focus();
      }
      if (e.target.closest('[data-ajouter-match]')) {
        const g = (k) => zoneChamps.querySelector('[data-aj="' + k + '"]').value.trim();
        if (!g('adversaire')) { zoneChamps.querySelector('[data-aj="adversaire"]').focus(); return; }
        if (!saisie.matchs) saisie.matchs = [];
        saisie.matchs.push({ equipe: g('equipe'), adversaire: g('adversaire'), jour: g('jour'), heure: g('heure') || null, lieu: g('lieu'), actif: true, nous: '', eux: '', ajoute: true, cle: 'ajout-' + Date.now() });
        sauver(); dessinerChamps();
      }
    });
  }
  dlg.querySelector('.habillages').addEventListener('change', (e) => { if (e.target.name === 'hab') { habillage = e.target.value; if (ctx.changerHabillage) ctx.changerHabillage(habillage); } });

  /* --- montage --- */
  function manques() {
    const r = [];
    if (medias.length < min) r.push('Ajoutez au moins ' + min + (min > 1 ? ' photos ou vidéos' : ' photo ou vidéo') + ' (ou essayez avec nos images de démonstration).');
    const ill = medias.map((m, k) => m.etat === 'illisible' ? k + 1 : 0).filter(Boolean);
    if (ill.length) r.push((ill.length > 1 ? 'Les médias n° ' + ill.join(', ') + ' ne peuvent pas être lus' : 'Le média n° ' + ill[0] + ' ne peut pas être lu') + ' sur ce téléphone : retirez-' + (ill.length > 1 ? 'les' : 'le') + '.');
    // un objet touché par photo (le dernier = la surprise) : sinon la voix annonce un objet qui n'est pas à l'image
    const co = champs.find(c => c.type === 'choix_multiple_ordonne');
    if (co && medias.length >= min) {
      const n = Array.isArray(saisie.champs[co.id]) ? saisie.champs[co.id].length : 0, nm = medias.length, ec = Math.abs(nm - n);
      if (n && n !== nm) r.push('Vous avez ' + nm + (nm > 1 ? ' photos ou vidéos' : ' photo ou vidéo') + ' et ' + n + (n > 1 ? ' objets' : ' objet') + ' : '
        + (n < nm ? 'touchez encore ' + (ec > 1 ? ec + ' objets' : 'un objet') + ' ou retirez ' + (ec > 1 ? ec + ' photos' : 'une photo') : 'retirez ' + (ec > 1 ? ec + ' objets' : 'un objet') + ' ou ajoutez ' + (ec > 1 ? ec + ' photos' : 'une photo')) + '.');
    }
    champs.forEach((c) => {
      if (!c.obligatoire) return; const v = saisie.champs[c.id];
      if (c.type === 'score_un_match') { if (saisie.champs.score_nous === '' || saisie.champs.score_nous == null || saisie.champs.score_eux === '' || saisie.champs.score_eux == null) r.push('Tapez le score du match.'); return; }
      if (c.type === 'choix_multiple_ordonne') { if (!Array.isArray(v) || v.length < c.min) r.push('Touchez au moins ' + c.min + ' objets.'); return; }
      if (c.type === 'nombre' && (v === '' || v == null || isNaN(+v) || +v < (c.min ?? -Infinity) || +v > (c.max ?? Infinity))) { r.push((c.libelle || 'Un nombre') + ' : un nombre de ' + c.min + ' à ' + c.max + '.'); return; }
      if (v === '' || v == null) r.push((c.libelle || { categorie: 'Quelle équipe ?', presentation_choisie: 'Quelle action ?' }[c.id] || c.id) + ' : à choisir.');
    });
    if (ids.includes('scores') && !(saisie.matchs || []).some(m => m.actif !== false && m.nous !== '' && m.eux !== '' && m.nous != null && m.eux != null)) r.push('Tapez au moins un score.');
    if (saisie.champs.annee !== undefined && saisie.champs.annee !== '' && !(+saisie.champs.annee >= 1949 && +saisie.champs.annee <= 2025)) r.push('L\'année : entre 1949 et 2025, ou laissez vide.');
    return r;
  }
  const bMonter = $('[data-monter]'), bArreter = $('[data-arreter]'), av = $('[data-avancement]');
  const barre = av.querySelector('.barre span'), txt = av.querySelector('.avancement-texte');
  const montrer = (f, t) => { barre.style.width = Math.max(1, Math.round(f * 100)) + '%'; txt.textContent = t; };
  bMonter.addEventListener('click', async () => {
    const m = manques(); const zm = $('[data-manque]');
    zm.textContent = m.join(' '); if (m.length) return;
    bMonter.disabled = true; bArreter.hidden = false; av.hidden = false; av.classList.remove('erreur'); $('[data-resultat]').hidden = true; montrer(0.01, 'Préparation…');
    controle = new AbortController();
    try {
      const valeurs = valeursPour(x, saisie, S, ctx);
      const f = await fabriquer({ modele, valeurs, medias: medias.map(y => y.f), habillage, montrer, signal: controle.signal, date: x.date });
      resultat = f;
      if (modele.id === 'defi-dix-lancers' && saisie.champs.score_defi !== '' && saisie.champs.score_defi != null) { const mem = memoireDefi(); mem['manche_' + (+p.valeurs.manche || 1)] = +saisie.champs.score_defi; stocker(MEMOIRE_DEFI, mem); }
      if (urlVideo) URL.revokeObjectURL(urlVideo);
      urlVideo = URL.createObjectURL(f.r.blob);
      $('[data-apercu]').innerHTML = '<video controls playsinline src="' + urlVideo + '" aria-label="Aperçu de la vidéo : ' + esc(titre) + '"></video>';
      $('[data-avert]').innerHTML = (f.r.avertissements || []).map(a => '<li>' + esc(a) + '</li>').join('');
      $('[data-legende]').value = legendeFinale(f.legende, p);
      const commercial = !!f.M.bandeauHaut;
      $('[data-gestes]').innerHTML = '<li>Appuyez sur « Enregistrer la vidéo » : elle est enregistrée dans le téléphone.</li>'
        + '<li>Dans TikTok, touchez +, choisissez la vidéo, puis collez la légende. Pour la couverture, choisissez l\'image avec le titre. Ajoutez un son de la bibliothèque libre de droits de l\'application, volume bas : la voix reste devant.</li>'
        + '<li>' + (f.r.voixSynthese ? 'Par prudence, activez le réglage qui signale un contenu généré (la voix est une voix de synthèse)' + (commercial ? ', puis celui du contenu de marque' : '') + ', et publiez.' : (commercial ? 'Activez le réglage du contenu de marque, puis publiez.' : 'Publiez.')) + '</li>';
      $('[data-resultat]').hidden = false;
      montrer(1, 'Vidéo prête : ' + Math.round(f.r.duree) + ' secondes' + (f.r.voixSynthese ? ', avec la voix.' : '.'));
      $('[data-apercu] video').focus();
    } catch (e) {
      av.classList.add('erreur'); montrer(0, (e && e.message) || 'La vidéo n\'a pas pu être fabriquée. Fermez les autres applications, puis réessayez.');
    } finally { bMonter.disabled = false; bArreter.hidden = true; controle = null; bMonter.textContent = resultat ? 'Monter de nouveau' : 'Monter la vidéo'; }
  });
  bArreter.addEventListener('click', () => { if (controle) controle.abort(); });
  $('[data-enregistrer]').addEventListener('click', async () => {
    if (!resultat) return; const etat = $('[data-etat]');
    const r = await S.enregistrer(resultat.r); const e = r && r.etat || r;
    etat.textContent = e === 'partage' ? (r.ios ? 'Si vous avez choisi « Enregistrer la vidéo », elle est dans vos photos.' : 'La vidéo est partie là où vous l\'avez choisie : TikTok, ou vos fichiers.') : e === 'annule' ? 'Enregistrement annulé : appuyez de nouveau sur « Enregistrer la vidéo ».' : 'La vidéo est enregistrée dans le téléphone, dans les téléchargements (« ' + (resultat.r.nom || 'bcr-video.mp4') + ' »).';
  });
  $('[data-copier]').addEventListener('click', async () => {
    const zone = $('[data-legende]'); const etat = $('[data-etat]');
    const r = await copier(zone.value, zone);
    etat.textContent = r === 'ok' ? 'Légende copiée. Collez-la dans TikTok.' : 'La légende est sélectionnée : appui long, puis Copier.';
  });

  /* --- ouverture et fermeture --- */
  function fermer() {
    if (controle) controle.abort();
    urls.forEach(u => URL.revokeObjectURL(u)); if (urlVideo) URL.revokeObjectURL(urlVideo);
    if (dlg.open) dlg.close();
    dlg.innerHTML = ''; ouvert = null;
    if (ctx.retour && document.contains(ctx.retour)) ctx.retour.focus();
  }
  dlg.querySelector('[data-fermer]').addEventListener('click', fermer);
  dlg.oncancel = (e) => { e.preventDefault(); fermer(); };
  ouvert = { fermer };
  majConsignes(); dessinerMedias(); dessinerChamps();
  dlg.showModal();
  dlg.querySelector('.studio-corps').scrollTop = 0;
  dlg.querySelector('#studio-titre').setAttribute('tabindex', '-1'); dlg.querySelector('#studio-titre').focus();
}
