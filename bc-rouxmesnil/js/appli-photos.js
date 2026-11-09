// Appli des publications du BCR : l'onglet « Photos ». L'appli ne garde aucune photo : cet onglet aide à les avoir dans la
// galerie au bon moment (ce qu'il faut filmer, comment recevoir celles des autres, la règle des enfants).
import { esc, maj1, dateLongue, ajouterJours, copier, signaler } from './appli-commun.js';
import * as P from './appli-publications.js';

// Texte prêt à coller dans le groupe du club : c'est le club qui l'envoie, avec ses mots s'il préfère.
export const MESSAGE_PARENTS =
  'Bonjour à tous ! 📸 Pour les publications du club, envoyez-nous vos photos et vidéos des matchs ici, dans le groupe ou dans l\'album partagé du club.\n' +
  '👉 En bonne qualité s\'il vous plaît (pas de capture d\'écran).\n' +
  '👉 Les jeunes de dos ou de loin, sauf si les deux parents ont donné leur accord par écrit, et l\'enfant d\'accord lui aussi.\n' +
  '👉 Pas de photo dans les vestiaires, et pas de joueur adverse mineur reconnaissable.\n' +
  'Merci à vous ! 💚🖤 Allez le BCR ! 🏀';

export function rendrePhotos(zone, App) {
  const R = P.reglesEnfants();
  let h = '<h2 class="titre-section" tabindex="-1">À filmer cette semaine</h2>';
  const lignes = [], facultatives = [];
  for (let i = 0; i < 7; i++) {
    const d = ajouterJours(App.jour, i);
    for (const p of P.publicationsDu(d, App.liste)) {
      const t = String(p.medias || '').trim();
      if (!t || /^(aucun|rien)\b/i.test(t) && !/si vous|facultatif/i.test(t)) continue;
      const cible = P.mediasCourts(t) && !/^(déjà fait)/i.test(t) ? lignes : facultatives;
      const codes = (p.regles || []).filter((c) => R.codes[c]);
      cible.push('<li class="a-filmer"><p class="f-quand">Pour ' + (i === 0 ? 'aujourd\'hui' : i === 1 ? 'demain' : esc(dateLongue(d))) + '</p>' +
        '<p class="f-titre">' + esc(p.titre) + '</p><p class="f-quoi">' + esc(maj1(t)) + '</p>' +
        (codes.length ? '<p class="f-regle">' + esc(R.codes[codes[0]]) + '</p>' : '') + '</li>');
    }
  }
  h += lignes.length ? '<ul class="liste-filmer">' + lignes.join('') + '</ul>' : '<p class="vide">Rien d\'obligatoire à filmer cette semaine.</p>';
  if (facultatives.length) h += '<details class="facultatifs"><summary>Si vous avez le temps (' + facultatives.length + ')</summary><ul class="liste-filmer">' + facultatives.join('') + '</ul></details>';
  if (R.consignes && R.consignes.sono) h += '<p class="note">' + esc(R.consignes.sono) + '</p>';

  h += '<h2 class="titre-section">Recevoir les photos des autres</h2>' +
    '<p>Les parents et les photographes bénévoles envoient leurs photos comme d\'habitude : groupe du club ou album partagé. Enregistrez celles que vous voulez dans votre galerie : l\'appli les y trouvera.</p>' +
    '<p><button type="button" class="bouton plein" data-action="copier-message">Copier le message pour les parents</button></p>' +
    '<details class="apercu-message"><summary>Voir le message</summary><p class="message-club">' + esc(MESSAGE_PARENTS).replace(/\n/g, '<br>') + '</p></details>' +
    '<p class="petit">C\'est vous qui l\'envoyez dans le groupe du club. Rien n\'est stocké chez nous.</p>';

  h += '<h2 class="titre-section">La règle des enfants</h2>' +
    '<p class="regle-forte">Un enfant reconnaissable seulement avec l\'accord écrit de ses deux parents, et l\'enfant d\'accord lui aussi. Jamais de nom de famille. Jamais de vestiaire. Les joueurs adverses mineurs ne sont jamais reconnaissables.</p>' +
    '<details class="regles"><summary>Les consignes en détail</summary><ul class="consignes">' +
    Object.values(R.codes || {}).map((v) => '<li>' + esc(v) + '</li>').join('') + '</ul>' +
    (R.consignes ? '<ul class="consignes">' + Object.values(R.consignes).map((v) => '<li>' + esc(v) + '</li>').join('') + '</ul>' : '') + '</details>';
  zone.innerHTML = h;
  if (!zone.dataset.branche) {
    zone.dataset.branche = '1';
    zone.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-action="copier-message"]'); if (!b) return;
      const ok = await copier(MESSAGE_PARENTS);
      if (ok) signaler('Copié. Collez-le dans le groupe du club.');
      else { const d = zone.querySelector('.apercu-message'); d.open = true; signaler('Appuyez longuement sur le texte, puis Copier.', 6000); }
    });
  }
}
