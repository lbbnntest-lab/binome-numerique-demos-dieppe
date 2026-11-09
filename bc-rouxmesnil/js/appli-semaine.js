// Appli des publications du BCR : l'onglet « Cette semaine » (ouvert par défaut).
// Aujourd'hui, demain, puis (replié) les jours suivants : une carte par publication, un seul bouton « Préparer ».
import { esc, maj1, dateLongue, ajouterJours, pastilles } from './appli-commun.js';
import * as M from './appli-matchs.js';
import * as P from './appli-publications.js';
import { zoneScore, gestesMatch } from './appli-vue-matchs.js';

const JOURS_SUIVANTS = 5;

function carte(p, App) {
  const etat = P.etatDe(p, App.faits);
  const m = p.match ? App.liste.find((x) => x.cle === p.match) : null;
  const besoin = P.besoins(p, App.liste, App.reglages, App.jour);
  const scoreIci = p.type === 'fin-de-match' && m && !m.retire && M.peutTaper(m, App.jour) && (!m.score || App.edition === m.cle || m.source === 'club');
  const etatTexte = etat.toutFait ? 'Fait' : etat.faitSur.length ? 'Fait sur ' + etat.faitSur.map((r) => ({ facebook: 'Facebook', instagram: 'Instagram', story: 'story Instagram', tiktok: 'TikTok' }[r])).join(', ') : 'À faire';
  // l'importance est un simple texte (jamais un cadre qu'on prendrait pour un bouton)
  return '<article class="carte-pub' + (etat.toutFait ? ' est-fait' : '') + '" data-pub="' + esc(p.id) + '" aria-labelledby="t-' + esc(p.id.replace(/[^a-z0-9]/gi, '-')) + '">' +
    '<p class="carte-haut"><span class="heure">' + esc(P.heureProposee(p.heure)) + '</span>' +
    '<span class="importance' + (P.estImportante(p) ? ' forte' : '') + '">' + (P.estImportante(p) ? 'Important' : 'Si vous avez le temps') + '</span></p>' +
    '<h3 id="t-' + esc(p.id.replace(/[^a-z0-9]/gi, '-')) + '">' + esc(p.titre) + '</h3>' +
    pastilles(P.pastillesDe(p)) +
    '<p class="besoin">' + esc(besoin) + '</p>' +
    (scoreIci ? '<div class="score-carte" data-cle="' + esc(m.cle) + '"><p class="score-qui">' + esc(M.libelle(m.equipe)) + ' ' + (m.dom ? 'contre ' : 'chez ') + esc(m.adv) + '</p>' + zoneScore(m, App, { compacte: true }) + '</div>' : '') +
    '<p class="carte-bas"><span class="etat' + (etat.faitSur.length ? ' fait' : '') + '">' + esc(etatTexte) + '</span>' +
    '<button type="button" class="bouton plein" data-action="preparer" data-pub="' + esc(p.id) + '">Préparer</button></p></article>';
}

export function publicationsDeLaSemaine(App) {
  const jours = [];
  for (let i = 0; i < 2 + JOURS_SUIVANTS; i++) { const d = ajouterJours(App.jour, i); jours.push({ date: d, pubs: P.publicationsDu(d, App.liste) }); }
  return P.sansDoublons(jours);   // une seule carte par publication (ex. résultats du 7-8/11 : dimanche 20 h 30, pas aussi lundi 12 h)
}

/** nombre de publications d'aujourd'hui pas encore faites (pastille de l'onglet) */
export function resteAujourdhui(App) {
  return publicationsDeLaSemaine(App)[0].pubs.filter((p) => !P.etatDe(p, App.faits).toutFait).length;
}

export function rendreSemaine(zone, App) {
  const jours = publicationsDeLaSemaine(App);
  App.pubsVisibles = new Map(jours.flatMap((j) => j.pubs.map((p) => [p.id, p])));
  let h = '<h2 class="date-jour" tabindex="-1">' + esc(maj1(dateLongue(App.jour))) + '</h2>' +
    '<p class="releve">' + esc(M.phraseReleve()) + '</p>' +
    (App.bienvenue ? '<p class="note bienvenue" id="bienvenue">C\'est bon. Le code reste sur ce téléphone : vous ne le tapez qu\'une fois.</p>' : '');
  if (M.releveAncien(App.jour)) h += '<p class="alerte">Les matchs datent du ' + esc(M.releve()) + ' : vérifiez les heures avant de publier.</p>';
  const groupe = (titre, j) => '<section class="groupe" aria-labelledby="g-' + j.date + '"><h3 class="groupe-titre" id="g-' + j.date + '">' + titre + '</h3>' +
    (j.pubs.length ? j.pubs.map((p) => carte(p, App)).join('') : '<p class="vide">Rien à publier ' + (titre === 'Aujourd\'hui' ? 'aujourd\'hui' : 'ce jour-là') + '.</p>') + '</section>';
  h += groupe('Aujourd\'hui', jours[0]);
  if (!jours[0].pubs.length) {
    const pro = jours.slice(1).find((j) => j.pubs.length);
    if (pro) h = h.replace('Rien à publier aujourd\'hui.</p>', 'Rien à publier aujourd\'hui. Prochaine publication : ' + esc(dateLongue(pro.date)) + ', ' + esc(pro.pubs[0].titre.split(' · ')[0].toLowerCase()) + '.</p>');
  }
  h += groupe('Demain', jours[1]);
  const suite = jours.slice(2).filter((j) => j.pubs.length);
  const n = suite.reduce((a, j) => a + j.pubs.length, 0);
  h += '<details class="plus-tard"' + (App.plusTardOuvert ? ' open' : '') + '><summary>Les jours suivants <span class="nb">(' + n + ' publication' + (n > 1 ? 's' : '') + ')</span></summary>' +
    (suite.length ? suite.map((j) => '<section class="groupe" aria-labelledby="g-' + j.date + '"><h3 class="groupe-titre" id="g-' + j.date + '">' + esc(maj1(dateLongue(j.date))) + '</h3>' + j.pubs.map((p) => carte(p, App)).join('') + '</section>').join('') : '<p class="vide">Rien de prévu les jours suivants.</p>') +
    '</details>';
  const fin = P.finCalendrier();
  if (fin && App.jour > fin) h += '<p class="note">Le calendrier prévu s\'arrête le 20 décembre. Les matchs et les publications à la demande restent là.</p>';
  zone.innerHTML = h;
  const d = zone.querySelector('details.plus-tard'); if (d) d.addEventListener('toggle', () => { App.plusTardOuvert = d.open; });
  if (!zone.dataset.branche) {
    zone.dataset.branche = '1';
    gestesMatch(zone, App, (o) => App.rendre('semaine', o));
    zone.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-action="preparer"]'); if (!b) return;
      const p = App.pubsVisibles.get(b.dataset.pub); if (p) App.ouvrirAtelier(p, b);
    });
  }
}
