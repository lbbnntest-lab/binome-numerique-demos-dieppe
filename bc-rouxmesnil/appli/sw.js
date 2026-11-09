// Service worker de l'appli des publications du BCR (portée : bc-rouxmesnil/appli/).
// Fichier écrit par scratchpad/appli/outils/faire_sw.js (liste relue sur le disque) : 95 fichiers, 3.7 Mo.
// - Mise à jour : la nouvelle version attend que la page la lance (message « activer »), jamais pendant une publication en cours.
// - Coquille (page, styles, scripts, polices, logos, images des partenaires, moteur vidéo, liste des licences) : gardée dans le
//   téléphone (cache « appli-<VERSION> »). Les anciens caches « appli-* » ne sont supprimés que quand aucune autre page de l'appli
//   n'est ouverte (une page restée sur l'ancienne version continue de lire ses propres fichiers).
// - Matchs et salles (../js/donnees-ffbb.js, ../js/salles-ffbb.js) : la copie gardée (cache « bcr-donnees ») répond tout de suite
//   si le réseau ne répond pas en 0,6 s (réseau faible au gymnase), et se met à jour derrière ; réponse marquée « x-bcr-lent »
//   (réseau lent), ou « x-bcr-hors-ligne » (réseau en échec). ?attendre=1 (relecture de fond) : le réseau a 20 s. Première
//   ouverture, rien de gardé : le réseau seul.
// - Voix (../vendor/ sauf mediabunny et la liste des licences) : gardée une fois pour toutes (cache « bcr-voix-v1 », partagé avec
//   le moteur de la voix et avec presentation/tiktok.html) ; les gros fichiers y sont rangés par le moteur lui-même, les petits ici.
// Jamais de requête vers un autre site : les requêtes d'une autre origine ne passent pas par ici.
const VERSION = 'v3';
const COQUILLE = 'appli-' + VERSION, DONNEES = 'bcr-donnees', VOIX = 'bcr-voix-v1';
const FICHIERS = ["./", "./manifest.webmanifest", "./appli.css", "./calendrier.json", "./voix-worker.js", "./icones/icone-180.png", "./icones/icone-192.png", "./icones/icone-512.png", "./icones/icone-masquable-512.png", "../js/appli-atelier.js", "../js/appli-cartes.js", "../js/appli-commun.js", "../js/appli-corrections-club.js", "../js/appli-demarrage.js", "../js/appli-entree.js", "../js/appli-images.js", "../js/appli-matchs.js", "../js/appli-partage.js", "../js/appli-partenaires.js", "../js/appli-photos.js", "../js/appli-publications.js", "../js/appli-publier.js", "../js/appli-reglages.js", "../js/appli-regles.js", "../js/appli-score.js", "../js/appli-semaine.js", "../js/appli-sorties.js", "../js/appli-stockage.js", "../js/appli-textes.js", "../js/appli-video.js", "../js/appli-vue-matchs.js", "../js/appli-weekend.js", "../js/export-facebook.js", "../js/salles-ffbb.js", "../js/tiktok-atelier.js", "../js/tiktok-commun.js", "../js/tiktok-donnees.js", "../js/tiktok-exemple.js", "../js/tiktok-studio.js", "../js/tiktok-voix-worker.js", "../js/tiktok-voix.js", "../fonts/barlow-condensed-600-italic.woff2", "../fonts/barlow-condensed-600.woff2", "../fonts/barlow-condensed-700-italic.woff2", "../fonts/barlow-condensed-700.woff2", "../fonts/source-sans-3.woff2", "../img/logo-bcr-160.webp", "../img/logo-bcr-240.webp", "../img/salle-tribunes.jpg", "../img/partenaires/abrafer.jpg", "../img/partenaires/art-mony.jpg", "../img/partenaires/atelier.jpg", "../img/partenaires/auchan.jpg", "../img/partenaires/bayeux.jpg", "../img/partenaires/bigmat.jpg", "../img/partenaires/bistrot-barrieres.jpg", "../img/partenaires/boulangerie-prieure.jpg", "../img/partenaires/brico-depot.jpg", "../img/partenaires/carbon.jpg", "../img/partenaires/chaumont.jpg", "../img/partenaires/commune-rouxmesnil.jpg", "../img/partenaires/demare.jpg", "../img/partenaires/dequesne.jpg", "../img/partenaires/diamant.jpg", "../img/partenaires/eph.jpg", "../img/partenaires/etria.jpg", "../img/partenaires/feron.jpg", "../img/partenaires/franck-provost.jpg", "../img/partenaires/hysope.jpg", "../img/partenaires/leader.jpg", "../img/partenaires/ligny-gaspary.jpg", "../img/partenaires/mekabulle.jpg", "../img/partenaires/ongles.jpg", "../img/partenaires/proxi.jpg", "../img/partenaires/regates.jpg", "../img/partenaires/salon-m.jpg", "../img/partenaires/samp.jpg", "../img/partenaires/stadium.jpg", "../img/partenaires/trianon.jpg", "../img/partenaires/wlc.jpg", "../img/logos/alencon.webp", "../img/logos/aplemont.webp", "../img/logos/carpiquet.webp", "../img/logos/cherbourg.webp", "../img/logos/cleon.webp", "../img/logos/elbeuf.webp", "../img/logos/goderville.webp", "../img/logos/ifs.webp", "../img/logos/louviers.webp", "../img/logos/mondeville.webp", "../img/logos/saintemarie.webp", "../img/logos/veauville.webp", "../vendor/mediabunny/mediabunny-aac-encoder.min.mjs", "../vendor/mediabunny/mediabunny.min.mjs", "../vendor/LISEZMOI-LICENCES.txt"];
const DONNEES_URL = ['../js/donnees-ffbb.js', '../js/salles-ffbb.js'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(COQUILLE);
    await c.addAll(FICHIERS.map((u) => new Request(u, { cache: 'reload' })));
    const d = await caches.open(DONNEES);
    for (const u of DONNEES_URL) { try { const r = await fetch(u, { cache: 'no-cache' }); if (r.ok) await d.put(new URL(u, location.href).href, r); } catch (x) { } }
    // une mise à jour attend : la page la lance (message « activer ») seulement quand aucune publication n'est en cours ; une page
    // ouverte ne lit donc jamais un mélange de deux versions
  })());
});
self.addEventListener('message', (e) => { if (e.data === 'activer') self.skipWaiting(); });
/** supprime les anciennes versions de la coquille quand plus aucune page ne peut les lire : à l'activation, seulement si aucune page
 *  de l'appli n'est ouverte ; à l'ouverture d'une page, seulement si c'est la seule (celle qu'on recharge va être remplacée) */
async function nettoyer(max) {
  if ((await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).length > max) return;
  for (const k of await caches.keys()) if (k.startsWith('appli-') && k !== COQUILLE) await caches.delete(k);   // jamais la voix ni les matchs
}
self.addEventListener('activate', (e) => { e.waitUntil((async () => { await nettoyer(0); await self.clients.claim(); })()); });
const delai = (ms, quoi) => new Promise((ok) => setTimeout(() => ok(quoi), ms));
const estDonnee = (p) => /\/js\/(donnees|salles)-ffbb\.js$/.test(p);
const enCours = new Map();
async function marquer(garde, entete) { const h = new Headers(garde.headers); h.set(entete, '1'); return new Response(await garde.blob(), { status: 200, headers: h }); }

self.addEventListener('fetch', (e) => {
  const q = e.request; if (q.method !== 'GET') return;
  const u = new URL(q.url); if (u.origin !== location.origin) return;
  const p = u.pathname;
  if (estDonnee(p)) {
    e.respondWith((async () => {
      const d = await caches.open(DONNEES); const cle = u.origin + p;
      const garde = await d.match(cle);
      // une seule lecture du réseau à la fois par fichier ; elle range la copie fraîche dès qu'elle arrive
      let reseau = enCours.get(cle);
      if (!reseau) {
        reseau = fetch(cle, { cache: 'no-cache' }).then(async (r) => { if (r.ok) await d.put(cle, r.clone()); return r; }).finally(() => enCours.delete(cle));
        enCours.set(cle, reseau);
      }
      e.waitUntil(reseau.then(() => { }, () => { }));
      if (!garde) { try { return await reseau; } catch (x) { return new Response('', { status: 503, statusText: 'Sans reseau' }); } }
      const attente = u.searchParams.has('attendre') ? 20000 : 600;
      const r = await Promise.race([reseau.then((x) => (x.ok ? x.clone() : 'echec'), () => 'echec'), delai(attente, 'lent')]);
      if (r instanceof Response) return r;
      return marquer(garde, r === 'lent' ? 'x-bcr-lent' : 'x-bcr-hors-ligne');
    })());
    return;
  }
  if (p.includes('/vendor/') && !p.includes('/vendor/mediabunny/') && !p.endsWith('/LISEZMOI-LICENCES.txt')) {
    e.respondWith((async () => {
      const v = await caches.open(VOIX); const deja = await v.match(q, { ignoreSearch: true }); if (deja) return deja;
      const r = await fetch(q);
      if (r.ok && +(r.headers.get('Content-Length') || 0) < 4e6) { try { await v.put(q, r.clone()); } catch (x) { } }
      return r;
    })());
    return;
  }
  if (q.mode === 'navigate') e.waitUntil(nettoyer(1));
  e.respondWith((async () => {
    const c = await caches.open(COQUILLE);
    const deja = await c.match(q, { ignoreSearch: true }); if (deja) return deja;
    try { return await fetch(q); }
    catch (x) { if (q.mode === 'navigate') return (await c.match('./')) || Response.error(); return Response.error(); }
  })());
});
