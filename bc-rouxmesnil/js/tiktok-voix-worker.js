// Calcul de la voix off hors de la page (Web Worker classique) : le téléphone reste fluide pendant le calcul.
// Reçoit { id, type: 'preparer' | 'dire', ... } et répond { id, resultat } ou { id, erreur } (+ { id, progres }).
// Rien n'est envoyé sur le réseau : on télécharge seulement les fichiers de la voix depuis notre site.
let coeur = null;
self.onmessage = async (e) => {
  const d = e.data;
  try {
    if (!coeur) { const m = await import('./tiktok-voix.js'); coeur = m.creerCoeur(); }
    if (d.type === 'preparer') {
      const r = await coeur.preparer({ base: d.base, voix: d.voix, locuteur: d.locuteur }, (f) => self.postMessage({ id: d.id, progres: f }));
      self.postMessage({ id: d.id, resultat: r });
    } else if (d.type === 'phonemes') {
      self.postMessage({ id: d.id, resultat: await coeur.phonemes(d.phrases) });
    } else if (d.type === 'dire') {
      const r = await coeur.dire(d.phrases, { vitesse: d.vitesse, locuteur: d.locuteur });
      self.postMessage({ id: d.id, resultat: r }, r.morceaux.map(m => m.buffer));
    }
  } catch (err) {
    self.postMessage({ id: d.id, erreur: String(err && err.message || err) });
  }
};
