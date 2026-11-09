// Appli des publications du BCR : l'onglet « Publier ». En premier, en grand, la publication du moment ; puis « Quand vous voulez »
// (7 tuiles, chacune dit ce qu'elle va préparer) ; tout le calendrier prévu (9/11 au 20/12) est replié derrière « Tout le calendrier
// prévu », semaine par semaine, avec les cases « Fait ». Chaque carte, tuile ou ligne ouvre l'atelier.
import { esc, dateCourte, ajouterJours, jourSemaine, joursWeekend, pastilles, MOIS } from './appli-commun.js';
import * as M from './appli-matchs.js';
import * as P from './appli-publications.js';
import { PARTENAIRES } from './appli-partenaires.js';
import { publicationsDeLaSemaine } from './appli-semaine.js';

// Les 7 publications à la demande (« Anniversaires » n'en fait pas partie : seulement dans le calendrier, avec ses conditions).
const DEMANDES = [
  { type: 'rendez-vous', titre: 'Rendez-vous du week-end', sous: 'Le prochain week-end, toutes les équipes', sorties: ['facebook', 'instagram', 'story'] },
  { type: 'resultats', titre: 'Résultats du week-end', sous: 'Le dernier week-end joué', sorties: ['facebook', 'instagram', 'story'] },
  { type: 'fin-de-match', titre: 'Fin de match', sous: 'Un match, son score', sorties: ['facebook', 'instagram', 'story'] },
  { type: 'merci-partenaire', titre: 'Merci partenaire', sous: 'Les 31 partenaires à tour de rôle', sorties: ['facebook', 'instagram'] },
  { type: 'article', titre: 'Raconter', sous: '3 lignes et un titre', sorties: ['facebook', 'instagram'] },
  { type: 'changement', titre: 'Changement de match', sous: 'Reporté, annulé, autre salle', sorties: ['facebook', 'story'] },
  { type: 'video', titre: 'Vidéo', sous: 'Une vidéo verticale avec vos images', sorties: ['tiktok', 'instagram', 'facebook'] }
];
// les équipes dont la fin de match est proposée (à tour de rôle dans le calendrier)
const EQUIPES_FIN = ['u18f1', 'rm3', 'rf2'];

/** la ligne sous le nom de la tuile : ce que la tuile va préparer, tiré des matchs du téléphone */
function sousTitre(d, p, App) {
  if (d.type === 'rendez-vous' || d.type === 'resultats') {
    if (!p.samedi) return d.type === 'resultats' ? 'Aucun week-end joué pour l\'instant' : d.sous;
    const n = M.duWeekend(App.liste, p.samedi).filter((m) => !m.retire).length;
    return joursWeekend(p.samedi) + (n ? ' · ' + n + ' match' + (n > 1 ? 's' : '') : '');
  }
  if (d.type === 'fin-de-match') return p.match ? p.titre.split(' · ').slice(1).join(' · ') : d.sous;
  if (d.type === 'merci-partenaire') { const i = +(App.reglages['partenaire-suivant']) || 0; return 'Proposé : ' + PARTENAIRES[i % PARTENAIRES.length].nom; }
  return d.sous;
}
function pubDemande(d, App) {
  const cal = (P.calendrier() && P.calendrier().publications || []).find((p) => p.type === d.type) || {};
  const p = {
    id: 'libre:' + d.type + ':' + App.jour, source: 'demande', date: App.jour, heure: '', type: d.type, statut: 'fixe', titre: d.titre,
    reseaux: d.sorties.filter((s) => s !== 'story'), sorties: Object.fromEntries(d.sorties.map((s) => [s, {}])),
    medias: cal.medias_attendus || (d.type === 'video' ? '2 à 6 photos ou vidéos du club' : ''), aTaper: cal.a_taper || '',
    regles: (cal.regle_enfants && cal.regle_enfants.codes) || ['R1'], donnees: {}
  };
  if (d.type === 'rendez-vous') { const j = jourSemaine(App.jour); p.samedi = ajouterJours(App.jour, (6 - j + 7) % 7); p.titre += ' · ' + joursWeekend(p.samedi); }
  if (d.type === 'resultats') { const ws = M.weekends(App.liste).filter((s) => s <= App.jour && M.duWeekend(App.liste, s).some((m) => !m.retire)); p.samedi = ws.pop() || null; if (p.samedi) p.titre += ' · ' + joursWeekend(p.samedi); }
  if (d.type === 'fin-de-match') {
    // le dernier match joué parmi les équipes de la fin de match (U18 filles élite, RM3, RF2)
    const une = App.liste.filter((m) => EQUIPES_FIN.includes(m.equipe) && m.date <= App.jour && !m.retire).pop();
    if (une) { p.match = une.cle; p.titre += ' · ' + M.libelle(une.equipe) + ' contre ' + une.adv; }
  }
  return p;
}
/** « Semaine du 9 au 15 novembre », « Semaine du 30 novembre au 6 décembre » */
const nomSemaine = (lundi, dimanche) => 'Semaine du ' + +lundi.slice(8) + (lundi.slice(5, 7) === dimanche.slice(5, 7) ? '' : ' ' + MOIS[+lundi.slice(5, 7) - 1]) + ' au ' + +dimanche.slice(8) + ' ' + MOIS[+dimanche.slice(5, 7) - 1];

/** la publication du moment : la première d'aujourd'hui pas encore faite, sinon les résultats (dimanche au mardi) ou le rendez-vous */
function duMoment(App, demandes) {
  const auj = publicationsDeLaSemaine(App)[0].pubs.find((p) => !P.etatDe(p, App.faits).toutFait && P.estImportante(p));
  if (auj) return auj;
  const j = jourSemaine(App.jour);
  const t = j === 0 || j === 1 || j === 2 ? 'resultats' : 'rendez-vous';
  const p = demandes.find((x) => x.type === t);
  return p && p.samedi && !P.etatDe(p, App.faits).toutFait ? p : null;
}

export function rendrePublier(zone, App) {
  App.pubsPublier = new Map();
  const demandes = DEMANDES.map((d) => { const p = pubDemande(d, App); App.pubsPublier.set(p.id, p); return p; });
  let h = '';
  const mo = duMoment(App, demandes);
  if (mo) {
    App.pubsPublier.set(mo.id, mo);
    h += '<section class="moment" aria-labelledby="moment-t"><h2 class="titre-section" id="moment-t" tabindex="-1">À faire maintenant</h2>' +
      '<div class="carte-pub moment-carte"><h3>' + esc(mo.titre) + '</h3>' + pastilles(P.pastillesDe(mo)) + '<p class="besoin">' + esc(P.besoins(mo, App.liste, App.reglages, App.jour)) + '</p>' +
      '<p><button type="button" class="bouton plein grand" data-pub="' + esc(mo.id) + '">Préparer</button></p></div></section>';
  }
  h += '<h2 class="titre-section"' + (mo ? '' : ' tabindex="-1"') + '>Quand vous voulez</h2><ul class="tuiles">';
  DEMANDES.forEach((d, i) => {
    const p = demandes[i];
    h += '<li><button type="button" class="tuile" data-pub="' + esc(p.id) + '"><span class="t-nom">' + esc(d.titre) + '</span><span class="t-sous">' + esc(sousTitre(d, p, App)) + '</span></button></li>';
  });
  h += '</ul>';
  const tous = P.toutesDuCalendrier(App.liste);
  const fin = P.finCalendrier();
  h += '<details class="calendrier-prevu"' + (App.calendrierOuvert ? ' open' : '') + '><summary>Tout le calendrier prévu <span class="nb">(' + tous.length + ' publications, du 9 novembre au 20 décembre)</span></summary>';
  if (fin && App.jour > fin) {
    h += '<p class="note">Le calendrier prévu s\'arrête le 20 décembre. Les matchs et les publications « Quand vous voulez » restent là.</p>';
    if (App.jour <= '2027-01-08') h += '<p class="note">Pas de match avant le samedi 9 janvier.</p>';
  }
  const semaines = new Map();
  for (const p of tous) { const k = p.brut.semaine; if (!semaines.has(k)) semaines.set(k, []); semaines.get(k).push(p); }
  const debut = P.debutCalendrier();
  for (const [n, ps] of semaines) {
    const lundi = ajouterJours(debut, (n - 1) * 7), dimanche = ajouterJours(lundi, 6);
    const enCours = App.jour >= lundi && App.jour <= dimanche || (App.jour < debut && n === 1);
    const faites = ps.filter((p) => P.etatDe(p, App.faits).toutFait).length;
    h += '<details class="semaine"' + (enCours || App.semainesOuvertes.has(n) ? ' open' : '') + ' data-n="' + n + '"><summary><span class="s-titre">' + esc(nomSemaine(lundi, dimanche)) + '</span>' +
      '<span class="s-compte">' + faites + ' sur ' + ps.length + ' faites</span></summary><ul class="lignes-pub">';
    for (const p of ps) {
      App.pubsPublier.set(p.id, p);
      const e = P.etatDe(p, App.faits);
      h += '<li><button type="button" class="ligne-pub' + (e.toutFait ? ' est-fait' : '') + '" data-pub="' + esc(p.id) + '"><span class="l-quand">' + esc(dateCourte(p.date)) + ', ' + esc(p.heure) + '</span>' +
        '<span class="l-titre">' + esc(p.titre) + '</span>' + pastilles(P.pastillesDe(p)) +
        '<span class="l-etat">' + (e.toutFait ? 'Fait' : e.faitSur.length ? 'En partie' : P.estImportante(p) ? 'À faire · important' : 'Si vous avez le temps') + '</span></button></li>';
    }
    h += '</ul></details>';
  }
  h += '</details>';
  zone.innerHTML = h;
  const cp = zone.querySelector('details.calendrier-prevu'); if (cp) cp.addEventListener('toggle', () => { App.calendrierOuvert = cp.open; });
  for (const d of zone.querySelectorAll('details.semaine')) d.addEventListener('toggle', () => { if (d.open) App.semainesOuvertes.add(+d.dataset.n); else App.semainesOuvertes.delete(+d.dataset.n); });
  if (!zone.dataset.branche) {
    zone.dataset.branche = '1';
    zone.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-pub]'); if (!b) return;
      const p = App.pubsPublier.get(b.dataset.pub); if (!p) return;
      App.ouvrirAtelier(p, b);
    });
  }
}
