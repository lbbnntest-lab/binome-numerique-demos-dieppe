// Appli des publications du BCR : installation sur l'écran d'accueil et code du club.
// Le code est une simple barrière d'entrée : on compare l'empreinte de « bcr-rouxmesnil|CODE » (majuscules, sans espaces)
// à celle écrite ici. Le code lui-même n'est écrit nulle part, mais toute personne qui lit ce fichier peut passer l'écran :
// ce n'est PAS une sécurité, et il n'y a rien à protéger (matchs publics, photos jamais envoyées). L'appli le dit au club.
// Code d'essai : celui du prototype (scratchpad/appli/technique_appli.md §3) ; le vrai code sera choisi par le club
// (jamais un mot de passe utilisé ailleurs). Changer de code = changer EMPREINTE_CODE (et la VERSION de appli/sw.js).
import { Stock, Local } from './appli-stockage.js';
import { $ } from './appli-commun.js';

export const EMPREINTE_CODE = '4a6e03ab3068c96e0bc40319a65e954625bda40afca7b14a7cf4f7ba01254265';

// ---------- installation ----------
let invite = null;
const ecouteursInvite = new Set();
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); invite = e; ecouteursInvite.forEach((f) => f(true)); });
addEventListener('appinstalled', () => { invite = null; ecouteursInvite.forEach((f) => f(false, true)); });
export const quandInvite = (f) => { ecouteursInvite.add(f); if (invite) f(true); };
export const peutProposer = () => !!invite;
export async function proposerInstallation() {
  if (!invite) return 'indisponible';
  const e = invite; invite = null;
  try { await e.prompt(); const r = await e.userChoice; return r && r.outcome === 'accepted' ? 'acceptee' : 'refusee'; } catch (x) { return 'indisponible'; }
}
export function estInstallee() {
  try { if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches) return true; } catch (e) { }
  return navigator.standalone === true;
}
export function plateforme() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iphone';
  if (/Android/.test(ua)) return 'android';
  return 'autre';
}

// ---------- code ----------
export async function empreinte(code) {
  const t = 'bcr-rouxmesnil|' + String(code).toUpperCase().replace(/\s+/g, '');
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function etatCode() {
  let garde = Local.lire('entree');
  if (!garde) { try { garde = await Stock.lire('reglages', 'entree'); } catch (e) { } }
  return { entre: garde === EMPREINTE_CODE, change: !!garde && garde !== EMPREINTE_CODE };
}
export async function essayerCode(code) {
  if (!code || !code.trim()) return 'vide';
  if ((await empreinte(code)) !== EMPREINTE_CODE) return 'faux';
  Local.ecrire('entree', EMPREINTE_CODE);
  try { await Stock.ecrire('reglages', 'entree', EMPREINTE_CODE); } catch (e) { }
  return 'bon';
}

// ---------- écran d'installation ----------
export function brancherInstallation(App) {
  const z = document.getElementById('ecran-installer');
  const montrer = (p) => {
    $('#inst-android', z).hidden = p !== 'android' && p !== 'autre';
    $('#inst-iphone', z).hidden = p !== 'iphone';
    $('#inst-changer', z).textContent = p === 'iphone' ? 'Vous avez un téléphone Android ?' : 'Vous avez un iPhone ?';
    z.dataset.plateforme = p;
    // la phrase sur l'iPhone seulement sur un iPhone, ou après « Vous avez un iPhone ? »
    const note = $('#inst-continuer-note', z); if (note && !$('#inst-continuer', z).hidden) note.hidden = p !== 'iphone';
  };
  montrer(plateforme());
  const bouton = $('#inst-bouton', z), gestes = $('#inst-gestes-android', z), fait = $('#inst-fait', z);
  quandInvite((dispo, installee) => {
    bouton.hidden = !dispo; gestes.hidden = !!dispo;
    if (installee) { fait.hidden = false; fait.textContent = 'C\'est installé. Ouvrez l\'appli depuis l\'icône du club sur l\'écran d\'accueil, puis tapez le code.'; }
  });
  if (!peutProposer()) { bouton.hidden = true; gestes.hidden = false; }
  bouton.addEventListener('click', async () => {
    const r = await proposerInstallation();
    if (r === 'acceptee') { fait.hidden = false; fait.textContent = 'C\'est installé. Ouvrez l\'appli depuis l\'icône du club sur l\'écran d\'accueil, puis tapez le code.'; }
    else if (r === 'refusee') { fait.hidden = false; fait.textContent = 'Pas installée. Vous pourrez le faire plus tard dans Réglages.'; }
    if (!peutProposer()) { bouton.hidden = true; gestes.hidden = false; }
  });
  $('#inst-changer', z).addEventListener('click', () => montrer(z.dataset.plateforme === 'iphone' ? 'android' : 'iphone'));
  $('#inst-continuer', z).addEventListener('click', () => { Local.ecrire('sans-installer', true); App.apresInstallation(); });
  $('#inst-fermer', z).addEventListener('click', () => App.apresInstallation());
}

// ---------- écran du code ----------
export function brancherCode(App) {
  const z = document.getElementById('ecran-code');
  const f = $('#f-code', z), champ = $('#code', z), msg = $('#code-msg', z);
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const r = await essayerCode(champ.value);
    if (r === 'bon') { champ.removeAttribute('aria-invalid'); msg.textContent = ''; champ.value = ''; App.ouvrir({ premiereFois: true }); return; }
    champ.setAttribute('aria-invalid', 'true');
    msg.textContent = r === 'vide' ? 'Tapez le code du club.' : 'Ce n\'est pas le bon code. Demandez-le au bureau du club.';
    champ.focus(); champ.select();
  });
  $('#code-oublie', z).addEventListener('click', (ev) => {
    const b = ev.currentTarget; const p = $('#code-oublie-texte', z);
    p.hidden = !p.hidden; b.setAttribute('aria-expanded', String(!p.hidden));
  });
}
