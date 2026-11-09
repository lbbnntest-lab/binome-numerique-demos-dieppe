// Calcul de la voix des vidéos pour l'appli (même rôle que js/tiktok-voix-worker.js, dont il est la copie).
// Il est placé dans appli/ pour être sous la portée du service worker de l'appli : les fichiers de la voix qu'il lit
// (vendor/) sont alors gardés dans le téléphone, et la voix marche sans réseau. Rien n'est envoyé sur le réseau.
let coeur = null;
self.onmessage = async (e) => {
  const d = e.data;
  try {
    if (!coeur) { const m = await import('../js/tiktok-voix.js'); coeur = m.creerCoeur(); }
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
