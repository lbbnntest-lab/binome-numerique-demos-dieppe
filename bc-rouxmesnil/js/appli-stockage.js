// Appli des publications du BCR : ce que garde le téléphone (IndexedDB « bcr-appli »).
// Magasins : scores (équipe:journée -> { nous, eux, le }), corrections (équipe:journée -> { heure?, salle?, retire? } ;
// ajout:<n> -> match ajouté par le club), faits (<publication>:<réseau> -> date), reglages (clé -> valeur).
// Rien ne part du téléphone. Si le navigateur refuse de garder (navigation privée, téléphone plein), tout marche en mémoire
// et l'appli le dit (« Ce téléphone ne garde rien pour l'instant… »).
// L'adresse de l'appli est partagée avec les autres démonstrations du même compte : tout est préfixé « bcr- », et
// l'effacement ne touche que « bcr-appli » (base et clés locales) et, sur demande, la voix « bcr-voix-v1 ».
const NOM = 'bcr-appli', VERSION_BASE = 1;
export const MAGASINS = ['scores', 'corrections', 'faits', 'reglages'];
const memoire = Object.fromEntries(MAGASINS.map((m) => [m, new Map()]));
let base = null, enMemoire = false;
const ecouteurs = new Set();

function ouvrirBase() {
  if (base) return base;
  base = new Promise((ok, ko) => {
    let r;
    try { r = indexedDB.open(NOM, VERSION_BASE); } catch (e) { ko(e); return; }
    r.onupgradeneeded = () => { for (const m of MAGASINS) if (!r.result.objectStoreNames.contains(m)) r.result.createObjectStore(m); };
    r.onsuccess = () => { const db = r.result; db.onversionchange = () => { db.close(); base = null; }; ok(db); };
    r.onerror = () => ko(r.error);
    r.onblocked = () => ko(new Error('base bloquée'));
  }).catch((e) => { enMemoire = true; base = null; throw e; });
  return base;
}

async function action(magasin, mode, faire) {
  if (enMemoire) return faire(null, memoire[magasin]);
  let db;
  try { db = await ouvrirBase(); } catch (e) { enMemoire = true; return faire(null, memoire[magasin]); }
  return new Promise((ok, ko) => {
    const t = db.transaction(magasin, mode); const s = t.objectStore(magasin); let res;
    const q = faire(s, null);
    if (q && 'onsuccess' in q) q.onsuccess = () => { res = q.result; };
    t.oncomplete = () => ok(res); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error);
  });
}

export const Stock = {
  /** true si rien n'est gardé (l'appli marche en mémoire) */
  enMemoire: () => enMemoire,
  async verifier() { try { await ouvrirBase(); } catch (e) { enMemoire = true; } return !enMemoire; },
  lire: (m, cle) => action(m, 'readonly', (s, mem) => s ? s.get(cle) : mem.get(cle)),
  async ecrire(m, cle, val) {
    try { await action(m, 'readwrite', (s, mem) => s ? s.put(val, cle) : mem.set(cle, val)); }
    catch (e) { enMemoire = true; memoire[m].set(cle, val); }
    ecouteurs.forEach((f) => f(m, cle));
  },
  async effacer(m, cle) {
    try { await action(m, 'readwrite', (s, mem) => s ? s.delete(cle) : mem.delete(cle)); }
    catch (e) { memoire[m].delete(cle); }
    ecouteurs.forEach((f) => f(m, cle));
  },
  /** tout un magasin, en objet { clé: valeur } */
  async tous(m) {
    if (enMemoire) return Object.fromEntries(memoire[m]);
    let db; try { db = await ouvrirBase(); } catch (e) { return Object.fromEntries(memoire[m]); }
    return new Promise((ok, ko) => {
      const s = db.transaction(m).objectStore(m); const k = s.getAllKeys(), v = s.getAll();
      v.onsuccess = () => ok(Object.fromEntries(k.result.map((x, i) => [x, v.result[i]])));
      v.onerror = () => ko(v.error);
    });
  },
  quandChange(f) { ecouteurs.add(f); return () => ecouteurs.delete(f); },
  /** demande au navigateur de ne pas effacer le stockage (accordé sans question à une appli installée sur Android) */
  async persister() {
    try { if (navigator.storage && navigator.storage.persist) return (await navigator.storage.persisted()) || (await navigator.storage.persist()); } catch (e) { }
    return false;
  },
  /** « Effacer mes données » : la base de l'appli et ses clés locales ; jamais rien d'autre que « bcr-appli » */
  async toutEffacer() {
    for (const m of MAGASINS) memoire[m].clear();
    try { const db = await base; if (db) db.close(); } catch (e) { }
    base = null;
    await new Promise((ok) => { try { const r = indexedDB.deleteDatabase(NOM); r.onsuccess = r.onerror = r.onblocked = () => ok(); } catch (e) { ok(); } });
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('bcr-appli')) localStorage.removeItem(k); } catch (e) { }
    enMemoire = false;
    ecouteurs.forEach((f) => f('*'));
  },
  async effacerVoix() { try { return await caches.delete('bcr-voix-v1'); } catch (e) { return false; } }
};

/** petites valeurs locales (localStorage), toujours préfixées « bcr-appli- » ; jamais d'erreur */
export const Local = {
  lire(cle, defaut = null) { try { const v = localStorage.getItem('bcr-appli-' + cle); return v == null ? defaut : JSON.parse(v); } catch (e) { return defaut; } },
  ecrire(cle, v) { try { localStorage.setItem('bcr-appli-' + cle, JSON.stringify(v)); return true; } catch (e) { return false; } },
  effacer(cle) { try { localStorage.removeItem('bcr-appli-' + cle); } catch (e) { } }
};
