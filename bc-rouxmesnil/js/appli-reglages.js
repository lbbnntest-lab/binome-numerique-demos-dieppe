// Appli des publications du BCR : l'onglet « Réglages » (installer, voix des vidéos, comptes du club, matchs,
// ce que garde ce téléphone avec « Effacer mes données », le code du club, crédits).
import { esc, signaler, annoncer, $ } from './appli-commun.js';
import { Stock } from './appli-stockage.js';
import * as M from './appli-matchs.js';
import { estInstallee } from './appli-entree.js';

const PHRASE_ESSAI = 'Bonjour ! Voici la voix des vidéos du Basket Club de Rouxmesnil. Allez le BCR !';
let voixMod = null;
const moteurVoix = async () => (voixMod = voixMod || (await import('./tiktok-voix.js')).BCRVoix);

function ligne(titre, corps, id) { return '<section class="reglage" aria-labelledby="' + id + '"><h3 id="' + id + '">' + titre + '</h3>' + corps + '</section>'; }

export function rendreReglages(zone, App) {
  const r = App.reglages; const n = App.compteurs || { scores: 0, corrections: 0, faits: 0 };
  let h = '<h2 class="visuellement-cache" tabindex="-1">Réglages</h2>';
  if (!estInstallee()) h += ligne('Installer l\'appli', '<p>Pour l\'ouvrir depuis l\'icône du club sur l\'écran d\'accueil, même sans réseau.</p><p><button type="button" class="bouton plein" data-action="installer">Installer l\'appli</button></p>', 'r-installer');
  h += ligne('Voix des vidéos',
    '<p class="etat-voix" id="etat-voix">Vérification…</p>' +
    '<div class="avancement" id="voix-avancement" hidden><div class="barre" aria-hidden="true"><span></span></div><p class="avancement-texte" role="status" aria-live="polite"></p></div>' +
    '<p class="rangee"><button type="button" class="bouton plein" data-action="preparer-voix">Préparer la voix</button>' +
    '<button type="button" class="bouton" data-action="essai-voix">Écouter un essai</button></p>' +
    '<p class="petit">Wi-Fi conseillé : environ 90 Mo, une seule fois. Ensuite, elle marche sans réseau.</p>' +
    '<label class="interrupteur"><input type="checkbox" role="switch" data-reglage="sans-voix"' + (r['sans-voix'] ? ' checked' : '') + '> <span>Vidéos sans voix (sous-titres seulement)</span></label>', 'r-voix');
  h += ligne('Les comptes du club',
    '<form class="comptes" data-action="comptes" novalidate><p class="petit">Tapés une fois : ils servent aux stories et aux rendez-vous.</p>' +
    '<div class="champ"><label for="c-insta">Nom du compte Instagram</label><input id="c-insta" name="instagram" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" value="' + esc(r['compte-instagram'] || '') + '"></div>' +
    '<div class="champ"><label for="c-tiktok">Nom du compte TikTok</label><input id="c-tiktok" name="tiktok" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" value="' + esc(r['compte-tiktok'] || '') + '"></div>' +
    '<p><button type="submit" class="bouton plein">Garder</button></p></form>', 'r-comptes');
  h += ligne('Les matchs',
    '<p>' + esc(M.phraseReleve()) + '.' + (M.estHorsLigne() ? ' Sans réseau pour l\'instant.' : M.estLent() ? ' Réseau faible pour l\'instant.' : '') + '</p>' +
    '<p>Les matchs sont repris de la fédération par Le Binôme Numérique, à la main : ils ne se mettent pas à jour tout seuls. Les scores, tapez-les vous-même après les matchs ; ils sont gardés sur ce téléphone.</p>' +
    '<p><button type="button" class="bouton" data-action="verifier">Vérifier maintenant</button></p>', 'r-matchs');
  h += ligne('Ce que garde ce téléphone',
    (Stock.enMemoire() ? '<p class="alerte">Ce téléphone ne garde rien pour l\'instant : les scores tapés seront perdus à la fermeture.</p>' : '') +
    '<ul class="compteurs"><li><b>' + n.scores + '</b> score' + (n.scores > 1 ? 's' : '') + ' tapé' + (n.scores > 1 ? 's' : '') + '</li>' +
    '<li><b>' + n.corrections + '</b> correction' + (n.corrections > 1 ? 's' : '') + ' ou match' + (n.corrections > 1 ? 's' : '') + ' ajouté' + (n.corrections > 1 ? 's' : '') + '</li>' +
    '<li><b>' + n.faits + '</b> publication' + (n.faits > 1 ? 's' : '') + ' cochée' + (n.faits > 1 ? 's' : '') + '</li></ul>' +
    '<p class="petit">Vos photos et vidéos ne sont jamais copiées : elles restent dans votre galerie.</p>' +
    '<p><button type="button" class="bouton danger" data-action="effacer">Effacer mes données</button></p>', 'r-donnees');
  h += ligne('Le code du club',
    '<p>Le code évite qu\'on tombe sur l\'appli par hasard. Ce n\'est pas un coffre-fort : il n\'y a rien de secret dedans (les matchs sont publics), et vos photos et vidéos ne quittent jamais votre téléphone.</p>' +
    '<p class="petit">Le code ne se change pas dans l\'appli : un nouveau code arrive avec une nouvelle version, et chacun le retape une fois.</p>', 'r-code');
  h += ligne('Crédits',
    '<details class="credits"><summary>Voir les crédits</summary>' +
    '<p>Logo du club et logos des partenaires : ils appartiennent au club et à chaque partenaire.</p>' +
    '<p>Voix de synthèse apprise sur des livres audio libres (Multilingual LibriSpeech, V. Pratap et al., 2020, licence CC BY 4.0). Elle n\'imite personne.</p>' +
    '<p>L\'appli utilise des logiciels libres et deux polices libres : voir la liste.</p>' +
    '<p><a class="lien-bloc" href="vendor/LISEZMOI-LICENCES.txt">La liste des logiciels libres, de leurs licences et de leurs sources</a></p>' +
    '<p>Appli préparée par Le Binôme Numérique pour le Basket Club de Rouxmesnil. </p><p><a class="lien-bloc" href="https://lebinomenumerique.fr/mentions-legales.html" rel="noopener">Mentions légales</a></p></details>', 'r-credits');
  zone.innerHTML = h;
  majEtatVoix();
  if (!zone.dataset.branche) { zone.dataset.branche = '1'; brancher(zone, App); }
}

async function majEtatVoix(texte) {
  const e = document.getElementById('etat-voix'); if (!e) return;
  if (texte) { e.textContent = texte; return; }
  try {
    const V = await moteurVoix();
    if (V.disponible()) e.textContent = 'Prête, gardée sur ce téléphone.';
    else e.textContent = (await V.dejaTelechargee()) ? 'Prête, gardée sur ce téléphone.' : 'Pas encore sur ce téléphone.';
  } catch (x) { e.textContent = 'Pas encore sur ce téléphone.'; }
}

async function preparerVoix(zone) {
  const av = $('#voix-avancement', zone), barre = av.querySelector('.barre span'), t = av.querySelector('.avancement-texte');
  const b = $('[data-action="preparer-voix"]', zone); b.disabled = true; av.hidden = false;
  try {
    const V = await moteurVoix();
    const deja = await V.dejaTelechargee();
    const r = await V.preparer({ workerUrl: new URL('appli/voix-worker.js', document.baseURI).href, onProgres: (f) => { barre.style.width = Math.round(f * 100) + '%'; t.textContent = (deja ? 'Préparation de la voix… ' : 'Téléchargement de la voix, une seule fois : ') + Math.round(f * 100) + ' %'; } });
    av.hidden = true;
    const gardee = r.deja || r.gardee !== false;
    const msg = gardee ? 'Prête, gardée sur ce téléphone.' : 'La voix marche, mais ce téléphone n\'a pas pu la garder : elle se rechargera la prochaine fois.';
    majEtatVoix(msg); signaler(gardee ? 'La voix est prête.' : msg, 6000);
    window.__voixAppli = { ...r, gardee };
    return window.__voixAppli;
  } catch (e) {
    av.hidden = true;
    const s = String(e && e.message || e);
    const msg = /memory|mémoire|allocation|RangeError/i.test(s) ? 'Ce téléphone n\'arrive pas à faire la voix. Les vidéos sortiront avec les sous-titres seulement.' : 'La voix n\'a pas pu être préparée. Réessayez en Wi-Fi.';
    majEtatVoix(msg); signaler(msg, 6000);
    window.__voixAppli = { erreur: s };
    return window.__voixAppli;
  } finally { b.disabled = false; }
}

async function essaiVoix(zone) {
  const V = await moteurVoix();
  if (!V.disponible() && !(await V.dejaTelechargee())) { signaler('Préparez d\'abord la voix (bouton « Préparer la voix »).', 5000); return { pret: false }; }
  const b = $('[data-action="essai-voix"]', zone); b.disabled = true;
  try {
    if (!V.disponible()) await preparerVoix(zone);
    annoncer('Préparation de l\'essai…');
    const v = await V.dire([PHRASE_ESSAI]);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ctx.createBuffer(1, v.echantillons.length, v.frequence); buf.copyToChannel(v.echantillons, 0);
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start();
    src.onended = () => ctx.close();
    return { pret: true, duree: v.duree };
  } catch (e) { signaler('L\'essai n\'a pas marché sur ce téléphone.', 5000); return { erreur: String(e) }; }
  finally { b.disabled = false; }
}

function brancher(zone, App) {
  zone.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-action]'); if (!b) return;
    const a = b.dataset.action;
    if (a === 'installer') App.montrerInstallation();
    else if (a === 'preparer-voix') window.__voixPromesse = preparerVoix(zone);
    else if (a === 'essai-voix') window.__essaiPromesse = essaiVoix(zone);
    else if (a === 'verifier') {
      b.disabled = true; const r = await App.verifierMatchs(); b.disabled = false;
      signaler(r.disponible ? (r.horsLigne ? 'Sans réseau : ' + M.phraseReleve().toLowerCase() + '.' : 'Les matchs sont à jour : ' + M.phraseReleve().toLowerCase() + '.') : 'Les matchs ne sont pas encore sur ce téléphone.');
    } else if (a === 'effacer') App.effacerDonnees(b);
  });
  zone.addEventListener('change', async (ev) => {
    const c = ev.target; if (!c.dataset.reglage) return;
    await Stock.ecrire('reglages', c.dataset.reglage, c.checked); App.reglages[c.dataset.reglage] = c.checked;
    signaler(c.checked ? 'Les vidéos sortiront sans voix, avec les sous-titres.' : 'Les vidéos sortiront avec la voix.');
  });
  zone.addEventListener('submit', async (ev) => {
    const f = ev.target; if (f.dataset.action !== 'comptes') return; ev.preventDefault();
    const net = (v) => v.trim().replace(/^@+/, '').replace(/\s+/g, '');
    for (const [k, champ] of [['compte-instagram', 'instagram'], ['compte-tiktok', 'tiktok']]) {
      const v = net(f.elements[champ].value); f.elements[champ].value = v;
      if (v) await Stock.ecrire('reglages', k, v); else await Stock.effacer('reglages', k);
      App.reglages[k] = v;
    }
    signaler('Comptes gardés sur ce téléphone.');
    App.majBadge();
  });
}
