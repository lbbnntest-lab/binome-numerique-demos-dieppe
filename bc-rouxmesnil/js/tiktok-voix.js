// BCRVoix : voix off française calculée DANS le téléphone. Aucun texte ni média n'est envoyé.
// Moteur : phonémiseur espeak-ng en WebAssembly (vendor/piper) + voix Piper fr_FR-mls-medium (vendor/voix, 125 locuteurs)
// exécutée par onnxruntime-web (vendor/ort, wasm, un seul fil). Le calcul tourne dans un Web Worker
// (js/tiktok-voix-worker.js) pour que la page ne se fige pas ; repli dans la page si le worker échoue.
// Les fichiers (≈ 93 Mo la première fois) sont gardés dans le stockage du navigateur (Cache Storage « bcr-voix-v1 »).
// Voix choisie le 07/11/2026 : fr_FR-mls-medium, entraînée sans modèle de départ (« Trained from scratch ») sur Multilingual
// LibriSpeech (CC BY 4.0). siwis-medium (affinée depuis lessac, usage commercial non établi) n'est plus chargeable (07/11) : seules
// les voix de REGLAGES_VOIX le sont, toute autre demande prend la voix par défaut.
//
// API :
//   await BCRVoix.preparer({ base?, voix?, locuteur?, onProgres(fraction, texte)?, worker? = true, workerUrl? })
//     → { …, voix, locuteur, gardee } (gardee : le gros fichier est bien dans le téléphone, vérifié après la préparation)
//   const v = await BCRVoix.dire(['Phrase 1.', 'Phrase 2.'], { vitesse: 1.12, pause: 0.18, locuteur? })
//     (vitesse : débit voulu pour la vidéo, calé sur siwis ; multiplié par le « débit » propre à la voix, voir REGLAGES_VOIX)
//     → { frequence: 22050, morceaux: [{ texte, echantillons: Float32Array, duree }],
//         echantillons (tout bout à bout), duree, segments: [{ texte, debut, fin }], mesures }
//   BCRVoix.disponible()            → true quand la voix est prête
//   await BCRVoix.dejaTelechargee() → true si le gros fichier de voix est déjà dans le téléphone
//   BCRVoix.lireEssai(phrases)      → lecture d'essai par la voix du téléphone (repli : n'entre PAS dans le fichier)
//   BCRVoix.normaliser(texte)       → texte tel que la voix le lira
const CACHE = 'bcr-voix-v1';
const VOIX_DEFAUT = 'fr_FR-mls-medium';
// Réglages propres à chaque voix. MLS : livres audio lus plus lentement que siwis, d'où un débit x 1,25 (1,12 x 1,25 = 1,4, dans la
// fourchette 1,35 à 1,45 relevée le 07/11). Locuteur 110 (lecteur MLS 2607) : meilleure note de compréhension le 07/11.
// À CONFIRMER À L'OREILLE PAR LE FONDATEUR (fichiers d'essai s110, s43, s79) avant la première vidéo publiée.
export const REGLAGES_VOIX = {
  'fr_FR-mls-medium': { locuteur: 110, debit: 1.25, poids_Mo: 93 }
};
const voixPermise = (voix) => (REGLAGES_VOIX[voix] ? voix : VOIX_DEFAUT);
const reglagesDe = (voix) => REGLAGES_VOIX[voixPermise(voix)];
const DANS_PAGE = typeof window !== 'undefined' && typeof document !== 'undefined';

// ---------- noms propres : orthographe pour la voix seulement (les sous-titres gardent la vraie) ----------
// Relevé à l'écoute des phonèmes de la voix le 07/11 ; à réécouter sur un téléphone avant la première publication.
export const PRONONCIATION = [
  [/\bEawy\b/g, 'Éavi'],                          // forêt d'Eawy : « é-a-vi » (la voix disait « iwi »)
  [/\bSeventy[- ]Six\b/gi, 'Sèveunti Sixe'],       // nom anglais du club de Belleville (la voix disait « sevennti si »)
  [/\bMovember\b/gi, 'Movèmbeur']                 // la voix disait « movanbé »
];

// ---------- règles de lecture (scores, catégories, heures, sigles) ----------
export function normaliser(t) {
  let x = String(t || ''); for (const [re, dit] of PRONONCIATION) x = x.replace(re, dit);
  return x
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')     // émojis : jamais lus
    .replace(/\(\s*(?:RM|PRM|DM|RF|DF|DFU|DMU|U)\d*\s*\)/g, '')           // sigles de championnat entre parenthèses
    .replace(/\b(RM3|PRM|DM3|DM6|RF2|DF2|DF3|DFU\d+|DMU\d+)\b/g, '')        // sigles seuls : jamais lus
    .replace(/(\d+)\s*[-–—]\s*(\d+)/g, '$1 à $2')                          // 51-31 → 51 à 31
    .replace(/(\d+)\s*\/\s*10\b/g, '$1 sur 10')                            // 7 / 10 → 7 sur 10
    .replace(/\b(\d{1,2})\s*h\s*(\d{2})\b/g, '$1 heures $2')                // 15 h 30 → 15 heures 30
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (m, h, mn) => h + ' heures' + (mn === '00' ? '' : ' ' + mn))
    .replace(/\b(\d{1,2})\s*h\b/g, '$1 heures')                             // 15 h → 15 heures
    .replace(/\b1 heures\b/g, '1 heure')
    .replace(/\bU(\d{2})\b/g, 'U $1')                                       // U18 → U 18
    .replace(/\bBCR\b/g, 'B C R')
    .replace(/\s*·\s*/g, ', ')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
}

// ---------- cœur (utilisé dans le worker, ou dans la page en repli) ----------
export function creerCoeur() {
  let ort = null, session = null, config = null, phonemiseur = null, wasmPh = null, dataPh = null, base = '';
  let ecarts = 0, voixChoisie = VOIX_DEFAUT, locuteurChoisi;

  async function octets(url, onOctets) {
    let cache = null;
    try { cache = await caches.open(CACHE); const r = await cache.match(url); if (r) { const b = await r.arrayBuffer(); if (onOctets) onOctets(1, 1); return b; } } catch (e) { cache = null; }
    const rep = await fetch(url, { credentials: 'same-origin' });
    if (!rep.ok) throw new Error('VOIX_INTROUVABLE ' + rep.status + ' ' + url);
    const total = +rep.headers.get('Content-Length') || 0;
    let recu = 0; const morceaux = []; const lecteur = rep.body.getReader();
    for (;;) { const { done, value } = await lecteur.read(); if (done) break; morceaux.push(value); recu += value.length; if (onOctets) onOctets(recu, total); }
    const tout = new Uint8Array(recu); let o = 0; for (const m of morceaux) { tout.set(m, o); o += m.length; }
    morceaux.length = 0;
    if (cache) { try { await cache.put(url, new Response(tout, { headers: { 'Content-Type': 'application/octet-stream' } })); } catch (e) { /* stockage plein : on retéléchargera */ } }
    return tout.buffer;
  }

  async function scriptPhonemiseur(url) {
    if (self.createPiperPhonemize) return;
    if (typeof importScripts === 'function') { importScripts(url); return; }
    await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = () => ko(new Error('VOIX_INTROUVABLE script')); document.head.appendChild(s); });
  }

  async function nouveauPhonemiseur() {
    const sorties = [];
    const mod = await self.createPiperPhonemize({
      print: (l) => sorties.push(l), printErr: () => { },
      wasmBinary: wasmPh, getPreloadedPackage: () => dataPh.slice(0),
      locateFile: (u) => base + 'piper/' + u
    });
    mod.__sorties = sorties; return mod;
  }

  async function phonemiser(textes) {
    if (!phonemiseur) phonemiseur = await nouveauPhonemiseur();
    phonemiseur.__sorties.length = 0;
    try { phonemiseur.callMain(['-l', config.espeak.voice, '--input', JSON.stringify(textes.map(t => ({ text: t }))), '--espeak_data', '/espeak-ng-data']); }
    catch (e) { phonemiseur = null; throw e; }
    return phonemiseur.__sorties.map(l => JSON.parse(l));
  }

  // Phonèmes → numéros avec la table DU modèle (même schéma que Piper : ^, chaque phonème suivi de _, puis $).
  function versIds(r) {
    const t = config.phoneme_id_map; const ph = r.phonemes;
    if (!ph || !t) return r.phoneme_ids;
    const ids = [...t['^'], ...t['_']];
    for (const p of ph) { if (t[p]) ids.push(...t[p], ...t['_']); }
    ids.push(...t['$']);
    if (r.phoneme_ids && (r.phoneme_ids.length !== ids.length || r.phoneme_ids.some((v, i) => v !== ids[i]))) ecarts++;
    return ids;
  }

  return {
    async preparer({ base: b, voix = VOIX_DEFAUT, locuteur }, prog) {
      base = b; const t0 = Date.now(); voixChoisie = voix; locuteurChoisi = locuteur;
      const poids = { modele: 0.78, ort: 0.16, ph: 0.06 }; const fait = { modele: 0, ort: 0, ph: 0 };
      const maj = (k) => (r, tot) => { fait[k] = tot ? Math.min(1, r / tot) : 0; prog(fait.modele * poids.modele + fait.ort * poids.ort + fait.ph * poids.ph); };
      const urlModele = base + 'voix/' + voix + '.onnx';
      const [modeleBuf, cfgTxt, wasmOrt] = await Promise.all([
        octets(urlModele, maj('modele')),
        fetch(urlModele + '.json').then(r => { if (!r.ok) throw new Error('VOIX_INTROUVABLE config'); return r.text(); }),
        octets(base + 'ort/ort-wasm-simd-threaded.wasm', maj('ort')),
        octets(base + 'piper/piper_phonemize.data', maj('ph')).then(x => { dataPh = x; }),
        octets(base + 'piper/piper_phonemize.wasm').then(x => { wasmPh = x; }),
        scriptPhonemiseur(base + 'piper/piper_phonemize.js')
      ]);
      const telechargement_ms = Date.now() - t0;
      config = JSON.parse(cfgTxt);
      ort = await import(base + 'ort/ort.wasm.min.mjs');
      ort.env.wasm.numThreads = 1;          // pas d'isolation d'origine sur l'hébergement : un seul fil
      ort.env.wasm.wasmBinary = wasmOrt;
      ort.env.wasm.wasmPaths = base + 'ort/';
      const t1 = Date.now();
      session = await ort.InferenceSession.create(modeleBuf, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      return { telechargement_ms, ouverture_ms: Date.now() - t1, frequence: config.audio.sample_rate, voix, locuteur: config.num_speakers > 1 ? (Number.isInteger(locuteur) ? locuteur : reglagesDe(voix).locuteur) : 0 };
    },
    async phonemes(phrases) { const ph = await phonemiser(phrases.map(normaliser)); return ph.map(r => (r.phonemes || []).join('')); },
    async dire(phrases, { vitesse = 1, locuteur } = {}) {
      const fr = config.audio.sample_rate; const t0 = Date.now();
      const rg = reglagesDe(voixChoisie); const debit = vitesse * rg.debit;
      let sid = Number.isInteger(locuteur) ? locuteur : Number.isInteger(locuteurChoisi) ? locuteurChoisi : rg.locuteur;
      if (!(sid >= 0 && sid < (config.num_speakers || 1))) sid = 0;
      const textes = phrases.map(normaliser);
      const ph = await phonemiser(textes);
      const t1 = Date.now(); const morceaux = [];
      for (let i = 0; i < ph.length; i++) {
        const ids = versIds(ph[i]);
        const feeds = {
          input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
          input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
          scales: new ort.Tensor('float32', Float32Array.from([config.inference.noise_scale, config.inference.length_scale / debit, config.inference.noise_w]), [3])
        };
        if (config.num_speakers > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(sid)]), [1]);
        const sortie = await session.run(feeds);
        const pcm = new Float32Array(sortie.output.data);   // copie : le tenseur est libéré juste après
        try { sortie.output.dispose && sortie.output.dispose(); } catch (e) { }
        morceaux.push(rogner(pcm, fr));
      }
      // même niveau pour toutes les phrases (crête à -1 dB sur l'ensemble)
      let crete = 0; for (const m of morceaux) for (let i = 0; i < m.length; i++) { const a = Math.abs(m[i]); if (a > crete) crete = a; }
      if (crete > 0) { const g = 0.89 / crete; for (const m of morceaux) for (let i = 0; i < m.length; i++) m[i] *= g; }
      return { frequence: fr, morceaux, mesures: { ecarts_table: ecarts, phonemes_ms: t1 - t0, calcul_ms: Date.now() - t1, locuteur: config.num_speakers > 1 ? sid : 0, debit } };
    }
  };
}

// Retire le silence trop long au début et à la fin d'une phrase (garde 40 ms).
function rogner(pcm, fr) {
  const seuil = 0.004; let a = 0, b = pcm.length - 1;
  while (a < b && Math.abs(pcm[a]) < seuil) a++;
  while (b > a && Math.abs(pcm[b]) < seuil) b--;
  const marge = Math.round(0.04 * fr); a = Math.max(0, a - marge); b = Math.min(pcm.length - 1, b + marge);
  return pcm.subarray(a, b + 1).slice();
}

// ---------- façade (page) ----------
let etat = { pret: false, worker: null, coeur: null, attente: new Map(), n: 0, preparation: null, mode: null, voix: null };

function baseParDefaut() { return new URL('../vendor/', import.meta.url).href; }

function appelWorker(type, donnees, onProgres) {
  return new Promise((ok, ko) => {
    const id = ++etat.n; etat.attente.set(id, { ok, ko, onProgres });
    etat.worker.postMessage({ id, type, ...donnees });
  });
}

// workerUrl : un worker placé ailleurs (l'appli installée met le sien dans appli/, sous la portée de son service worker,
// pour que les fichiers de la voix lus par le worker restent dans le téléphone et marchent sans réseau).
function demarrerWorker(workerUrl) {
  const w = new Worker(workerUrl || new URL('./tiktok-voix-worker.js', import.meta.url));
  w.onmessage = (e) => {
    const d = e.data; const a = etat.attente.get(d.id); if (!a) return;
    if (d.progres !== undefined) { try { a.onProgres && a.onProgres(d.progres); } catch (x) { } return; }
    etat.attente.delete(d.id);
    if (d.erreur) a.ko(new Error(d.erreur)); else a.ok(d.resultat);
  };
  w.onerror = (e) => { for (const [, a] of etat.attente) a.ko(new Error('VOIX_WORKER ' + (e.message || ''))); etat.attente.clear(); };
  return w;
}

function assembler(r, phrases, pause) {
  const fr = r.frequence; const morceaux = r.morceaux.map((ech, i) => ({ texte: phrases[i], echantillons: ech, duree: ech.length / fr }));
  const p = Math.round(pause * fr); let total = 0; morceaux.forEach((m, i) => { total += m.echantillons.length + (i ? p : 0); });
  const echantillons = new Float32Array(Math.max(1, total)); const segments = []; let pos = 0;
  morceaux.forEach((m, i) => { if (i) pos += p; echantillons.set(m.echantillons, pos); segments.push({ texte: m.texte, debut: pos / fr, fin: (pos + m.echantillons.length) / fr }); pos += m.echantillons.length; });
  return { frequence: fr, morceaux, echantillons, duree: echantillons.length / fr, segments, mesures: r.mesures };
}

export const BCRVoix = {
  normaliser,
  disponible: () => etat.pret,
  mode: () => etat.mode,
  async dejaTelechargee({ base, voix = VOIX_DEFAUT } = {}) {
    voix = voixPermise(voix);
    try { const c = await caches.open(CACHE); return !!(await c.match((base || baseParDefaut()) + 'voix/' + voix + '.onnx')); } catch (e) { return false; }
  },
  voix: () => etat.voix,
  reglages: (voix = VOIX_DEFAUT) => ({ voix, ...reglagesDe(voix) }),
  preparer({ base, voix = VOIX_DEFAUT, locuteur, onProgres, worker = true, workerUrl } = {}) {
    voix = voixPermise(voix);
    if (etat.pret) return Promise.resolve({ deja: true, mode: etat.mode });
    if (etat.preparation) return etat.preparation;
    const b = base || baseParDefaut();
    const prog = (f) => { try { onProgres && onProgres(f, 'Préparation de la voix : ' + Math.round(f * 100) + ' %'); } catch (e) { } };
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => { }); } catch (e) { }
    etat.preparation = (async () => {
      const t0 = performance.now();
      if (worker && typeof Worker !== 'undefined') {
        try {
          etat.worker = demarrerWorker(workerUrl);
          const r = await appelWorker('preparer', { base: b, voix, locuteur }, prog);
          etat.pret = true; etat.mode = 'worker'; etat.voix = voix; prog(1);
          // le moteur ne fait pas échouer la préparation si le téléphone refuse de garder le fichier : on le vérifie ici
          return { ...r, mode: 'worker', gardee: await BCRVoix.dejaTelechargee({ base: b, voix }), total_ms: Math.round(performance.now() - t0) };
        } catch (e) {
          try { etat.worker && etat.worker.terminate(); } catch (x) { }
          etat.worker = null;
          if (/VOIX_INTROUVABLE/.test(String(e.message))) throw e;   // fichier absent : inutile d'essayer dans la page
        }
      }
      etat.coeur = creerCoeur();
      const r = await etat.coeur.preparer({ base: b, voix, locuteur }, prog);
      etat.pret = true; etat.mode = 'page'; etat.voix = voix; prog(1);
      return { ...r, mode: 'page', gardee: await BCRVoix.dejaTelechargee({ base: b, voix }), total_ms: Math.round(performance.now() - t0) };
    })();
    etat.preparation.catch(() => { etat.preparation = null; });
    return etat.preparation;
  },
  // pour vérifier la prononciation (noms propres) : les phonèmes que la voix va lire
  async phonemes(phrases) { if (!etat.pret) throw new Error('VOIX_NON_PREPAREE'); return etat.worker ? appelWorker('phonemes', { phrases }) : etat.coeur.phonemes(phrases); },
  // débit d'une voix off TikTok (≈ 6,5 syllabes par seconde) : vitesse 1,12 et 0,18 s entre les phrases
  async dire(phrases, { vitesse = 1.12, pause = 0.18, locuteur } = {}) {
    if (!etat.pret) throw new Error('VOIX_NON_PREPAREE');
    const liste = phrases.map(p => String(p || '').trim()).filter(Boolean);
    if (!liste.length) return assembler({ frequence: 22050, morceaux: [], mesures: {} }, [], pause);
    const r = etat.worker ? await appelWorker('dire', { phrases: liste, vitesse, locuteur }) : await etat.coeur.dire(liste, { vitesse, locuteur });
    return assembler(r, liste, pause);
  },
  lireEssai(phrases) {
    if (!DANS_PAGE || !('speechSynthesis' in window)) return false;
    speechSynthesis.cancel();
    for (const p of phrases) { const u = new SpeechSynthesisUtterance(normaliser(p)); u.lang = 'fr-FR'; speechSynthesis.speak(u); }
    return true;
  },
  arreter() {
    try { etat.worker && etat.worker.terminate(); } catch (e) { }
    etat = { pret: false, worker: null, coeur: null, attente: new Map(), n: 0, preparation: null, mode: null, voix: null };
  }
};
if (DANS_PAGE) window.BCRVoix = BCRVoix;
