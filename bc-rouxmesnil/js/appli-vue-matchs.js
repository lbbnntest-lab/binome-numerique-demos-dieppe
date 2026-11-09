// Appli des publications du BCR : l'onglet « Matchs » (ce week-end, par équipe) et la ligne d'un match, réutilisée par
// « Cette semaine » et l'atelier (même saisie du score partout, même stockage).
import { esc, maj1, heureFr, dateLongue, dateCourte, joursWeekend, ajouterJours, signaler, PICTOS, $ } from './appli-commun.js';
import * as M from './appli-matchs.js';

import { SOURCE_CLUB } from './appli-corrections-club.js';

const lieuTexte = (m) => (m.salle ? m.salle.filter(Boolean).join(', ') : '');
const nomDerby = (id) => { const e = M.EQUIPES.find((x) => x.id === id); return e && e.prec ? e.prec.charAt(0).toUpperCase() + e.prec.slice(1) : M.libelleCourt(id); };
const advCourt = (m) => m.derby ? nomDerby(m.derby.exterieur) : m.adv;
/** « Points d'AS Dieppe », « Points de l'équipe 3 », « Points de Cherbourg » (lu par les lecteurs d'écran) */
export const pointsDe = (nom) => /^équipe\b/i.test(nom) ? 'Points de l\'' + nom.charAt(0).toLowerCase() + nom.slice(1)
  : /^[aeiouyéèêëàâîïôûüh]/i.test(nom) ? 'Points d\'' + nom : 'Points de ' + nom;
/** la salle d'un match : « Salle à confirmer » et le choix entre les deux salles du club quand deux matchs se chevauchent */
function salleHtml(m) {
  if (m.salleAConfirmer && !m.retire) return '<p class="m-salle a-confirmer">Salle à confirmer, deux matchs en même temps. Touchez la salle : ' +
    '<button type="button" class="lien" data-action="choisir-salle" data-salle="cheruel">Cheruel</button> ou <button type="button" class="lien" data-action="choisir-salle" data-salle="lefebvre">Lefebvre</button></p>';
  return lieuTexte(m) ? '<p class="m-salle">' + esc(lieuTexte(m)) + '</p>' : '';
}

/** « Nos U18 filles (élite) reçoivent Cherbourg » écrit court pour une ligne */
function titreMatch(m, sansEquipe) {
  if (m.derby) return '<b>Derby :</b> ' + esc(M.libelle(m.equipe)) + ' reçoit ' + esc(M.libelle(m.derby.exterieur));
  if (sansEquipe) return (m.dom ? 'Reçoit ' : 'Chez ') + '<b>' + esc(m.adv) + '</b>';
  return '<b>' + esc(M.libelle(m.equipe)) + '</b> ' + (m.dom ? 'reçoit ' : 'chez ') + esc(m.adv);
}

/** la zone du score d'un match : officiel, tapé par le club, ou deux cases à remplir */
export function zoneScore(m, App, { compacte = false } = {}) {
  if (m.miseDeCote) return '<p class="m-retire">Pas dans ' + esc(SOURCE_CLUB) + ' : mis de côté. <button type="button" class="lien" data-action="remettre">Ce match a lieu : le remettre</button></p>';
  if (m.retire) return '<p class="m-retire">Pas dans les publications. <button type="button" class="lien" data-action="remettre">Remettre</button></p>';
  const nous = m.derby ? nomDerby(m.equipe) : 'BCR';
  if (m.source === 'officiel') {
    return '<p class="m-score"><strong>' + m.score[0] + ' à ' + m.score[1] + '</strong> <span class="m-source">score officiel</span></p>' +
      (m.ecart ? '<p class="m-ecart">Score officiel : ' + m.score[0] + ' à ' + m.score[1] + ' (vous aviez tapé ' + m.tape.nous + ' à ' + m.tape.eux + ').</p>' : '');
  }
  const edition = App.edition === m.cle;
  if (m.source === 'club' && !edition) {
    return '<p class="m-score"><button type="button" class="score-tape" data-action="modifier-score" aria-label="Modifier le score ' + m.score[0] + ' à ' + m.score[1] + '"><strong>' +
      m.score[0] + ' à ' + m.score[1] + '</strong></button> <span class="m-source">score tapé par le club, gardé sur ce téléphone</span></p>';
  }
  if (!M.peutTaper(m, App.jour)) return compacte ? '' : '<p class="m-avenir">Le score se tape après le match.</p>';
  const id = 's-' + m.cle.replace(/[^a-z0-9]/gi, '-');
  const v = m.tape || {};
  // le score est gardé tout seul dès que les deux cases sont remplies (en quittant la 2e case, ou « Suivant » sur le clavier),
  // puis le curseur passe au match suivant : 2 touchers par match, aucun bouton à aller chercher
  return '<form class="m-saisie" data-action="garder-score" novalidate>' +
    '<span class="m-cases"><label class="visuellement-cache" for="' + id + '-a">' + esc(m.derby ? pointsDe(nous) : 'Points du BCR') + '</label>' +
    '<span class="m-equipe" aria-hidden="true">' + esc(nous) + '</span>' +
    '<input id="' + id + '-a" name="nous" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" enterkeyhint="next" value="' + (v.nous ?? '') + '">' +
    '<span aria-hidden="true">à</span>' +
    '<label class="visuellement-cache" for="' + id + '-b">' + esc(pointsDe(advCourt(m))) + '</label>' +
    '<input id="' + id + '-b" name="eux" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" enterkeyhint="next" value="' + (v.eux ?? '') + '">' +
    '<span class="m-equipe adv" aria-hidden="true">' + esc(advCourt(m)) + '</span></span>' +
    (m.tape ? '<span class="m-boutons"><button type="button" class="lien" data-action="oublier-score">Effacer ce score</button></span>' : '') +
    '<span class="m-erreur" role="alert"></span></form>';
}
/** une ligne courte pour taper un score (atelier des résultats) : « 13 h 30 · U15 garçons (équipe 4) contre BC Offranville 2 » */
export function ligneCompacte(m, App) {
  const quoi = m.derby ? '<b>Derby</b> : ' + esc(M.libelle(m.equipe)) + ' contre ' + esc(M.libelle(m.derby.exterieur))
    : '<b>' + esc(M.libelle(m.equipe)) + '</b> ' + (m.dom ? 'contre ' : 'chez ') + esc(m.adv);
  return '<li class="match compact' + (m.retire ? ' est-retire' : '') + '" data-cle="' + esc(m.cle) + '"><p class="m-titre"><span class="m-heure' + (m.heure ? '' : ' a-confirmer') + '">' +
    esc(m.heure ? heureFr(m.heure) : 'heure à confirmer') + '</span> · ' + quoi + '</p>' + zoneScore(m, App, { compacte: true }) + '</li>';
}

/** une ligne de match complète (onglet Matchs) */
export function ligneMatch(m, App, { avecDate = false, corriger = true, sansEquipe = false, sansScore = false, compacte = false } = {}) {
  const heure = m.heure ? heureFr(m.heure) : 'heure à confirmer';
  const marques = [m.heureCorrigee || m.salleCorrigee ? 'corrigé par le club' : '', m.heureClub ? 'heure corrigée d\'après la publication du club' : '', m.ajoute ? 'ajouté par le club' : ''].filter(Boolean);
  const form = App.correction === m.cle ? formCorrection(m) : '';
  return '<li class="match' + (m.retire ? ' est-retire' : '') + '" data-cle="' + esc(m.cle) + '">' +
    '<p class="m-haut"><span class="m-heure' + (m.heure ? '' : ' a-confirmer') + '">' + (avecDate ? esc(dateCourte(m.date)) + ', ' : '') + esc(heure) + '</span>' +
    (marques.length ? '<span class="m-marque">' + marques.join(', ') + '</span>' : '') + '</p>' +
    '<p class="m-titre">' + titreMatch(m, sansEquipe) + '</p>' +
    (!(sansEquipe && m.score) ? salleHtml(m) : '') +
    (sansScore ? '' : zoneScore(m, App, { compacte })) +
    (corriger && !form ? '<p class="m-actions"><button type="button" class="lien" data-action="corriger">Corriger</button></p>' : '') +
    form + '</li>';
}

function formCorrection(m) {
  const id = 'c-' + m.cle.replace(/[^a-z0-9]/gi, '-');
  return '<form class="m-correction" data-action="garder-correction" novalidate>' +
    '<p class="petit">Gardé sur ce téléphone, marqué « corrigé par le club ».</p>' +
    '<div class="champ"><label for="' + id + '-h">Heure</label><input id="' + id + '-h" name="heure" type="time" value="' + esc(m.heure || '') + '"></div>' +
    '<div class="champ"><label for="' + id + '-s">Salle</label><input id="' + id + '-s" name="salle" type="text" autocomplete="off" value="' + esc(m.salleCorrigee ? m.salle[0] : '') + '" placeholder="' + esc(lieuTexte(m) || 'nom de la salle') + '"></div>' +
    (m.ajoute ? '' : '<label class="case"><input type="checkbox" name="retire"' + (m.retire ? ' checked' : '') + '> Ne pas mettre ce match dans les publications</label>') +
    '<p class="rangee"><button type="submit" class="bouton plein">Garder</button><button type="button" class="bouton" data-action="annuler">Annuler</button>' +
    (m.ajoute ? '<button type="button" class="bouton" data-action="retirer-ajout">Retirer ce match</button>' : '') + '</p></form>';
}

function avertissements(App) {
  let t = '';
  if (M.releveAncien(App.jour)) t += '<p class="alerte">Les matchs datent du ' + esc(M.releve()) + ' : vérifiez les heures avant de publier.</p>';
  return t;
}

// ---------- onglet ----------
export function rendreMatchs(zone, App) {
  const E = App.vueMatchs || (App.vueMatchs = { mode: 'weekend', samedi: M.weekendParDefaut(App.jour), equipe: null });
  if (!M.disponible()) { zone.innerHTML = '<p class="vide">Les matchs ne sont pas encore sur ce téléphone. Ouvrez l\'appli une fois avec du réseau.</p>'; return; }
  let h = '<div class="selecteur" role="group" aria-label="Affichage des matchs">' +
    '<button type="button" data-action="mode" data-mode="weekend" aria-pressed="' + (E.mode === 'weekend') + '">Ce week-end</button>' +
    '<button type="button" data-action="mode" data-mode="equipe" aria-pressed="' + (E.mode === 'equipe') + '">Par équipe</button></div>' + avertissements(App);
  h += E.mode === 'weekend' ? vueWeekend(App, E) : E.equipe ? vueEquipe(App, E.equipe) : listeEquipes(App);
  h += '<p class="pied-liste">' + esc(M.phraseReleve()) + '. Vérifiez les heures avant de publier.</p>';
  zone.innerHTML = h;
  if (!zone.dataset.branche) { zone.dataset.branche = '1'; brancher(zone, App); }
}

function vueWeekend(App, E) {
  const tous = App.liste; const ws = M.weekends(tous);
  const avant = ws.filter((s) => s < E.samedi).pop(), apres = ws.find((s) => s > E.samedi);
  const ms = M.duWeekend(tous, E.samedi); const actifs = ms.filter((m) => !m.retire);
  let h = '<div class="nav-weekend">' +
    '<button type="button" class="rond" data-action="weekend" data-samedi="' + (avant || '') + '"' + (avant ? '' : ' disabled') + ' aria-label="Week-end précédent">' + PICTOS.avant + '</button>' +
    '<h2 class="titre-weekend" tabindex="-1">' + esc(joursWeekend(E.samedi)) + '</h2>' +
    '<button type="button" class="rond" data-action="weekend" data-samedi="' + (apres || '') + '"' + (apres ? '' : ' disabled') + ' aria-label="Week-end suivant">' + PICTOS.apres + '</button></div>';
  if (!ms.length) {
    h += '<p class="vide">Pas de match ce week-end' + (apres ? '. Prochains matchs : ' + esc(joursWeekend(apres).toLowerCase()) + '.' : '.') + '</p>';
  } else {
    const nDom = actifs.filter((m) => m.dom).length;
    h += '<p class="compte">' + actifs.length + ' match' + (actifs.length > 1 ? 's' : '') + ', dont ' + nDom + ' à la maison</p>';
    const cote = ms.filter((m) => m.miseDeCote);
    if (cote.length) h += '<p class="alerte">' + (cote.length > 1 ? cote.length + ' matchs de la fédération ne sont pas' : '1 match de la fédération n\'est pas') + ' dans ' + esc(SOURCE_CLUB) +
      ' : ' + (cote.length > 1 ? 'ils sont mis de côté (barrés plus bas) et ne comptent pas' : 'il est mis de côté (barré plus bas) et ne compte pas') + '. Touchez « Ce match a lieu » s\'il faut le remettre.</p>';
    for (const d of [E.samedi, ajouterJours(E.samedi, 1)]) {
      const duJour = ms.filter((m) => m.date === d); if (!duJour.length) continue;
      h += '<h3 class="jour">' + esc(maj1(dateLongue(d))) + '</h3>';
      const dom = duJour.filter((m) => m.dom), ext = duJour.filter((m) => !m.dom);
      if (dom.length) h += '<p class="sous-groupe">À la maison</p><ul class="matchs">' + dom.map((m) => ligneMatch(m, App)).join('') + '</ul>';
      if (ext.length) h += '<p class="sous-groupe">À l\'extérieur</p><ul class="matchs">' + ext.map((m) => ligneMatch(m, App)).join('') + '</ul>';
    }
  }
  h += App.ajout ? formAjout(E.samedi) : '<p class="ajouter"><button type="button" class="bouton" data-action="ouvrir-ajout">Ajouter un match</button></p>';
  return h;
}

function formAjout(samedi) {
  const opts = M.EQUIPES.map((e) => '<option value="' + e.id + '">' + esc(M.libelle(e.id)) + '</option>').join('');
  return '<form class="ajout" data-action="garder-ajout" novalidate><h3>Ajouter un match</h3>' +
    '<p class="petit">Pour un match annoncé par le club qui manque dans la liste. Gardé sur ce téléphone.</p>' +
    '<div class="champ"><label for="aj-eq">Notre équipe</label><select id="aj-eq" name="equipe">' + opts + '</select></div>' +
    '<div class="champ"><label for="aj-adv">Adversaire</label><input id="aj-adv" name="adv" type="text" autocomplete="off" required></div>' +
    '<fieldset class="choix"><legend>Jour</legend><label class="case"><input type="radio" name="date" value="' + samedi + '" checked> ' + esc(dateLongue(samedi)) + '</label>' +
    '<label class="case"><input type="radio" name="date" value="' + ajouterJours(samedi, 1) + '"> ' + esc(dateLongue(ajouterJours(samedi, 1))) + '</label></fieldset>' +
    '<div class="champ"><label for="aj-h">Heure</label><input id="aj-h" name="heure" type="time"></div>' +
    '<fieldset class="choix"><legend>Où</legend><label class="case"><input type="radio" name="dom" value="1" checked> À la maison</label>' +
    '<label class="case"><input type="radio" name="dom" value="0"> À l\'extérieur</label></fieldset>' +
    '<div class="champ"><label for="aj-s">Salle (si vous la connaissez)</label><input id="aj-s" name="salle" type="text" autocomplete="off"></div>' +
    '<p class="m-erreur" role="alert"></p>' +
    '<p class="rangee"><button type="submit" class="bouton plein">Ajouter</button><button type="button" class="bouton" data-action="fermer-ajout">Annuler</button></p></form>';
}

function listeEquipes(App) {
  let h = '<h2 class="visuellement-cache" tabindex="-1">Les équipes</h2><ul class="equipes">';
  for (const e of M.EQUIPES) {
    const ms = M.deLEquipe(App.liste, e.id).filter((m) => !m.retire);
    const pro = ms.find((m) => m.date >= App.jour);
    const sous = pro ? 'Prochain match : ' + dateCourte(pro.date) + (pro.date.slice(5, 7) !== App.jour.slice(5, 7) ? ' ' + ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][+pro.date.slice(5, 7) - 1] : '') : 'Plus de match prévu';
    h += '<li><button type="button" class="equipe" data-action="equipe" data-id="' + e.id + '"><span class="e-nom">' + esc(M.libelle(e.id)) + '</span><span class="e-sous">' + esc(sous) + '</span>' + PICTOS.apres + '</button></li>';
  }
  return h + '</ul>';
}

function vueEquipe(App, id) {
  const ms = M.deLEquipe(App.liste, id);
  const vue = (m) => m;   // un derby se montre pareil depuis les deux équipes (même ligne, même score)
  const avenir = ms.filter((m) => m.date > App.jour), passes = ms.filter((m) => m.date <= App.jour).reverse();
  let h = '<p><button type="button" class="lien retour" data-action="equipes">' + PICTOS.retour + 'Toutes les équipes</button></p>' +
    '<h2 class="titre-equipe" tabindex="-1">' + esc(M.libelle(id)) + '</h2>';
  h += '<h3>Prochains matchs</h3>' + (avenir.length ? '<ul class="matchs">' + avenir.slice(0, App.toutVoir === id ? 99 : 4).map((m) => ligneMatch(vue(m), App, { avecDate: true, sansEquipe: true, compacte: true })).join('') + '</ul>' +
    (avenir.length > 4 && App.toutVoir !== id ? '<p><button type="button" class="lien" data-action="tout-voir">Voir les ' + avenir.length + ' matchs à venir</button></p>' : '') : '<p class="vide">Plus de match prévu.</p>');
  h += '<h3>Résultats</h3>' + (passes.length ? '<ul class="matchs">' + passes.map((m) => ligneMatch(vue(m), App, { avecDate: true, sansEquipe: true, corriger: !m.score })).join('') + '</ul>' : '<p class="vide">Pas encore de match joué.</p>');
  const cl = M.classement(id);
  h += '<h3>Classement</h3>';
  if (!cl.length) h += '<p class="vide">Classement pas encore publié.</p>';
  else {
    h += '<div class="tableau-cadre"><table class="classement"><caption class="visuellement-cache">Classement de nos ' + esc(M.libelle(id)) + '</caption>' +
      '<thead><tr><th scope="col">Rang</th><th scope="col">Équipe</th><th scope="col"><abbr title="Points">Pts</abbr></th><th scope="col"><abbr title="Matchs joués">J</abbr></th><th scope="col"><abbr title="Gagnés">G</abbr></th><th scope="col"><abbr title="Perdus">P</abbr></th></tr></thead><tbody>' +
      cl.map((l) => '<tr' + (l[7] ? ' class="nous"' : '') + '><td>' + l[0] + '</td><th scope="row">' + esc(l[1]) + '</th><td>' + l[2] + '</td><td>' + l[3] + '</td><td>' + l[4] + '</td><td>' + l[5] + '</td></tr>').join('') +
      '</tbody></table></div><p class="petit">Classement du ' + esc(M.releve()) + ', sans les scores tapés par le club.</p>';
  }
  return h;
}

// ---------- gestes (un seul écouteur pour tout l'onglet, et pour les lignes de match ailleurs) ----------
/** les cases de score remplies mais pas encore gardées (elles survivent au redessin de l'écran) */
function brouillons(sauf) {
  const b = {};
  for (const f of document.querySelectorAll('form.m-saisie')) {
    const li = f.closest('[data-cle]'); if (!li || li.dataset.cle === sauf) continue;
    const n = f.elements.nous.value, e = f.elements.eux.value; if (n || e) b[li.dataset.cle] = { n, e };
  }
  return b;
}
function remettreBrouillons(b) {
  for (const [cle, v] of Object.entries(b)) for (const f of document.querySelectorAll('[data-cle="' + CSS.escape(cle) + '"] form.m-saisie')) {
    if (!f.elements.nous.value) f.elements.nous.value = v.n; if (!f.elements.eux.value) f.elements.eux.value = v.e;
  }
}
const enCours = new Set();
/** garde le score d'un formulaire dès que les deux cases sont remplies ; versSuivant : le curseur passe au match suivant */
async function garderSiComplet(f, App, versSuivant) {
  const li = f.closest('[data-cle]'); if (!li) return; const cle = li.dataset.cle;
  const n = f.elements.nous.value.trim(), e = f.elements.eux.value.trim(); const err = $('.m-erreur', f);
  [f.elements.nous, f.elements.eux].forEach((c) => c.removeAttribute('aria-invalid')); err.textContent = '';
  if (!n && !e) return;
  if (!n || !e) { if (versSuivant) { const vide = !n ? f.elements.nous : f.elements.eux; vide.setAttribute('aria-invalid', 'true'); err.textContent = 'Tapez aussi l\'autre score.'; vide.focus(); } return; }
  if (!M.scoreValide(n) || !M.scoreValide(e)) {
    const mauvais = !M.scoreValide(n) ? f.elements.nous : f.elements.eux;
    mauvais.setAttribute('aria-invalid', 'true'); err.textContent = 'Tapez les deux scores en chiffres (par exemple 51 et 31).';
    if (versSuivant) mauvais.focus(); return;
  }
  const m = App.liste.find((x) => x.cle === cle);
  if (enCours.has(cle) || (m && m.tape && m.tape.nous === +n && m.tape.eux === +e && App.edition !== cle)) return;
  enCours.add(cle);
  try {
    // le match suivant (ordre de l'écran) et l'endroit où le club a touché pendant ce temps
    const formes = [...document.querySelectorAll('form.m-saisie')]; const k = formes.indexOf(f);
    const suivante = formes.slice(k + 1).find((x) => x.closest('[data-cle]'));
    const suivant = suivante ? suivante.closest('[data-cle]').dataset.cle : null;
    await M.garderScore(cle, +n, +e);
    App.edition = null;
    const actif = document.activeElement; let focus = null;
    if (versSuivant) focus = suivant ? { cle: suivant, champ: 'nous' } : { cle, action: 'modifier-score' };
    else if (actif && actif !== document.body && !f.contains(actif)) {
      const la = actif.closest && actif.closest('[data-cle]');
      focus = la && actif.name ? { cle: la.dataset.cle, champ: actif.name } : actif.id ? { selecteur: '#' + CSS.escape(actif.id) } : null;
    }
    const b = brouillons(cle);
    await App.majTout(focus ? { focus } : {});
    remettreBrouillons(b);
    signaler('Score gardé sur ce téléphone.');
  } finally { enCours.delete(cle); }
}

export function gestesMatch(zone, App, apres) {
  zone.addEventListener('keydown', (ev) => {
    const t = ev.target; if (ev.key !== 'Enter' || !t.closest) return; const f = t.closest('form.m-saisie'); if (!f) return;
    ev.preventDefault();
    if (t.name === 'nous') { f.elements.eux.focus(); f.elements.eux.select(); return; }
    garderSiComplet(f, App, true);
  });
  zone.addEventListener('change', (ev) => {
    const t = ev.target; const f = t.closest && t.closest('form.m-saisie'); if (!f) return;
    if (t.name === 'nous' && !f.elements.eux.value.trim()) return;   // on passe à la 2e case
    garderSiComplet(f, App, false);
  });
  zone.addEventListener('submit', async (ev) => {
    const f = ev.target; const li = f.closest('[data-cle]'); const a = f.dataset.action;
    if (a === 'garder-score') {
      ev.preventDefault(); garderSiComplet(f, App, true);
    } else if (a === 'garder-correction') {
      ev.preventDefault();
      const cle = li.dataset.cle; const heure = f.elements.heure.value; const salle = f.elements.salle.value.trim();
      if (cle.startsWith('ajout:')) {
        const { Stock } = await import('./appli-stockage.js');
        const ancien = (await Stock.lire('corrections', cle)) || {};
        await Stock.ecrire('corrections', cle, { ...ancien, heure, salle });
      } else await M.corriger(cle, { heure, salle, retire: f.elements.retire && f.elements.retire.checked });
      App.correction = null; await App.majTout({ focus: { cle, action: 'corriger' } });
      signaler('Correction gardée sur ce téléphone.');
    } else if (a === 'garder-ajout') {
      ev.preventDefault();
      const adv = f.elements.adv.value.trim(); const err = $('.m-erreur', f);
      if (!adv) { f.elements.adv.setAttribute('aria-invalid', 'true'); err.textContent = 'Tapez le nom de l\'adversaire.'; f.elements.adv.focus(); return; }
      const cle = await M.ajouterMatch({ equipe: f.elements.equipe.value, adv, date: f.elements.date.value, heure: f.elements.heure.value, dom: f.elements.dom.value === '1', salle: f.elements.salle.value.trim() });
      App.ajout = false; await App.majTout({ focus: { cle, action: 'corriger' } });
      signaler('Match ajouté, gardé sur ce téléphone.');
    }
  });
  zone.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-action]'); if (!b || !zone.contains(b)) return;
    const li = b.closest('[data-cle]'); const cle = li && li.dataset.cle; const a = b.dataset.action;
    if (a === 'modifier-score') { App.edition = cle; await apres({ focus: { cle, champ: 'nous' } }); }
    else if (a === 'oublier-score') { await M.oublierScore(cle); App.edition = null; await App.majTout({ focus: { cle, champ: 'nous' } }); signaler('Score effacé.'); }
    else if (a === 'corriger') { App.correction = cle; await apres({ focus: { cle, champ: 'heure' } }); }
    else if (a === 'annuler') { App.correction = null; await apres({ focus: { cle, action: 'corriger' } }); }
    else if (a === 'remettre') { await M.corriger(cle, { retire: false }); await App.majTout({ focus: { cle, action: 'corriger', repli: '#atelier-titre' } }); signaler('Le match est remis dans les publications.'); }
    else if (a === 'choisir-salle') {
      const s = M.SALLES_CLUB[b.dataset.salle]; if (!s) return;
      await M.corriger(cle, { salle: s[0] }); await App.majTout({ focus: { cle, action: 'corriger', repli: '#atelier-titre' } }); signaler(s[0] + ' : gardé sur ce téléphone.');
    }
    else if (a === 'retirer-ajout') { await M.retirerAjout(cle); App.correction = null; await App.majTout({}); signaler('Match retiré.'); }
    else return;
    ev.preventDefault();
  });
}

function brancher(zone, App) {
  const re = (o) => App.rendre('matchs', o);
  gestesMatch(zone, App, re);
  zone.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-action]'); if (!b) return;
    const E = App.vueMatchs; const a = b.dataset.action;
    if (a === 'mode') { E.mode = b.dataset.mode; E.equipe = null; re({ focus: { selecteur: '[data-mode="' + E.mode + '"]' } }); }
    else if (a === 'weekend' && b.dataset.samedi) { E.samedi = b.dataset.samedi; App.ajout = false; re({ focus: { selecteur: '[data-action="weekend"][aria-label="' + b.getAttribute('aria-label') + '"]:not([disabled])', repli: '.titre-weekend' } }); }
    else if (a === 'equipe') { E.equipe = b.dataset.id; App.toutVoir = null; re({ focus: { selecteur: '.titre-equipe' }, haut: true }); }
    else if (a === 'equipes') { const ancien = E.equipe; E.equipe = null; re({ focus: { selecteur: '[data-id="' + ancien + '"]' } }); }
    else if (a === 'tout-voir') { App.toutVoir = E.equipe; re({}); }
    else if (a === 'ouvrir-ajout') { App.ajout = true; re({ focus: { selecteur: '#aj-eq' } }); }
    else if (a === 'fermer-ajout') { App.ajout = false; re({ focus: { selecteur: '[data-action="ouvrir-ajout"]' } }); }
  });
}
