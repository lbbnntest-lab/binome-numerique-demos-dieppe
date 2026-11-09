// Appli des publications du BCR : « Copier le texte et partager », « Copier le texte », « Enregistrer ».
// Repris du prototype (proto-appli/app.js) : tout part du même geste, sans attente avant navigator.share (sinon Safari refuse :
// le geste « expire ») ; le texte passe par le presse-papiers et n'est jamais joint aux fichiers (bogue WebKit 251500 : le texte
// joint remplace ou perd les fichiers). L'appli ouvre le partage du téléphone ; c'est le club qui choisit l'appli et qui publie.
import { copier } from './appli-commun.js';

const estIphone = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const partageFichiersPossible = (fichiers) => {
  try { return !!(navigator.canShare && fichiers && fichiers.length && navigator.canShare({ files: fichiers })); } catch (e) { return false; }
};

/** Copie le texte (s'il y en a) et ouvre le partage avec les fichiers. Rend une promesse de { etat, copie } :
 *  etat = 'partage' | 'annule' | 'refuse' | 'enregistre' (partage impossible : fichiers enregistrés) | 'texte' (rien à partager). */
export function copierEtPartager(fichiers, texte) {
  const copie = texte ? copier(texte) : Promise.resolve(null);   // lancée, pas attendue : le partage part dans le même geste
  const L = (fichiers || []).filter(Boolean);
  if (L.length && partageFichiersPossible(L)) {
    let p; try { p = navigator.share({ files: L }); } catch (e) { p = Promise.reject(e); }
    return p.then(async () => ({ etat: 'partage', copie: await copie }),
      async (e) => ({ etat: e && e.name === 'AbortError' ? 'annule' : 'refuse', copie: await copie, erreur: String(e && e.message || e) }));
  }
  if (L.length) { telecharger(L); return copie.then((c) => ({ etat: 'enregistre', copie: c })); }
  return copie.then((c) => ({ etat: 'texte', copie: c }));
}

/** Enregistrer : sur iPhone, toujours par le partage (« Enregistrer les images » va dans Photos) ; ailleurs, un téléchargement par fichier. */
export async function enregistrer(fichiers) {
  const L = (fichiers || []).filter(Boolean); if (!L.length) return { etat: 'rien' };
  if (estIphone() && partageFichiersPossible(L)) {
    try { await navigator.share({ files: L }); return { etat: 'partage' }; } catch (e) { if (e && e.name === 'AbortError') return { etat: 'annule' }; }
  }
  telecharger(L); return { etat: 'enregistre', nombre: L.length };
}
function telecharger(L) {
  L.forEach((f, i) => setTimeout(() => {
    const u = URL.createObjectURL(f); const a = document.createElement('a'); a.href = u; a.download = f.name; a.rel = 'noopener'; a.hidden = true;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
    (window.__telechargements = window.__telechargements || []).push({ nom: f.name, octets: f.size, type: f.type });
  }, i * 350));
}

/** « Les 5 images arrivent dans vos téléchargements… » : un téléchargement n'est jamais annoncé comme certain */
export function phraseTelechargement(nb, video) {
  const quoi = video ? 'La vidéo arrive' : nb > 1 ? 'Les ' + nb + ' images arrivent' : 'L\'image arrive';
  return quoi + ' dans vos téléchargements.' + (nb > 1 ? ' Si le téléphone demande l\'autorisation, touchez Autoriser.' : '');
}
/** la phrase à dire après un partage (annoncée et affichée sur la carte) ; reseau : « Facebook », « Instagram »… (jamais « l'appli ») */
export function message(r, { avecTexte = true, nb = 1, video = false, reseau = 'Facebook', story = false } = {}) {
  const faitSur = '« Fait ' + (story ? 'en story sur ' : 'sur ') + reseau + ' »';
  const coller = 'Dans ' + reseau + ', appuyez longuement dans la zone du texte, puis « Coller », puis « Publier ».';
  if (r.etat === 'partage') return avecTexte ? (r.copie ? 'Le texte est copié. ' + coller + ' Revenez ensuite cocher ' + faitSur + '.' : 'Le texte n\'a pas pu être copié : touchez « Copier le texte », puis collez-le dans ' + reseau + '.')
    : 'Dans ' + reseau + ', touchez « Publier »' + (story ? ' (ou « Votre story »)' : '') + '. Revenez ensuite cocher ' + faitSur + '.';
  if (r.etat === 'annule') return 'Partage annulé.';
  if (r.etat === 'refuse') return 'Le téléphone n\'a pas ouvert le partage. Touchez encore une fois, ou enregistrez dans le téléphone.';
  if (r.etat === 'enregistre') return phraseTelechargement(nb, video) + (avecTexte && r.copie ? ' Le texte est copié.' : '');
  if (r.etat === 'texte') return r.copie ? 'Texte copié. ' + coller : 'Appuyez longuement sur le texte, puis Copier.';
  return '';
}
