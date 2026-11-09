// Appli des publications du BCR : démarrage, écrans d'entrée, onglets, rafraîchissement des matchs, service worker.
// (Ancien nom : js/appli.js, renommé le 07/11 pour rester dans les fichiers js/appli-*.js ; l'ancien fichier n'est plus chargé.)
// Page : bc-rouxmesnil/appli/index.html (avec <base href="../"> : tous les chemins partent de bc-rouxmesnil/).
// L'appli prépare et ouvre le partage du téléphone ; elle ne publie jamais, ne se connecte à aucun compte, n'envoie rien.
import { Stock, Local } from './appli-stockage.js';
import { $, $$, aujourdhui, signaler, annoncer, PICTOS } from './appli-commun.js';
import * as M from './appli-matchs.js';
import * as P from './appli-publications.js';
import * as E from './appli-entree.js';
import { rendreSemaine, resteAujourdhui } from './appli-semaine.js';
import { rendreMatchs } from './appli-vue-matchs.js';
import { rendrePublier } from './appli-publier.js';
import { rendrePhotos } from './appli-photos.js';
import { rendreReglages } from './appli-reglages.js';
import { ouvrirAtelier, atelierRendre, atelierEnCours } from './appli-atelier.js';

const ONGLETS = {
  semaine: { titre: 'Cette semaine', rendre: rendreSemaine },
  matchs: { titre: 'Matchs', rendre: rendreMatchs },
  publier: { titre: 'Publier', rendre: rendrePublier },
  photos: { titre: 'Photos', rendre: rendrePhotos },
  reglages: { titre: 'Réglages', rendre: rendreReglages }
};

const App = {
  jour: aujourdhui(), liste: [], stock: { scores: {}, corrections: {} }, faits: {}, reglages: {}, compteurs: null,
  onglet: 'semaine', semainesOuvertes: new Set(), edition: null, correction: null, ajout: false,
  atelierOuvert: false, matchsEnAttente: false, nouvelleVersion: false, ouverte: false
};
window.__appli = App;   // pour les essais

// ---------- données ----------
App.relire = async () => {
  const [stock, faits, reglages] = await Promise.all([M.lireStock(), Stock.tous('faits'), Stock.tous('reglages')]);
  App.stock = stock; App.faits = faits; App.reglages = reglages;
  App.liste = M.fusion(stock);
  App.compteurs = { scores: Object.keys(stock.scores).length, corrections: Object.keys(stock.corrections).length, faits: Object.keys(faits).length };
};
App.relireFaits = async () => { App.faits = await Stock.tous('faits'); App.compteurs && (App.compteurs.faits = Object.keys(App.faits).length); App.majBadge(); };

// ---------- affichage ----------
function placerFocus(zone, f) {
  if (!f) return;
  let c = null;
  if (f.cle) {
    const li = zone.querySelector('[data-cle="' + CSS.escape(f.cle) + '"]');
    if (li) c = (f.champ && li.querySelector('[name="' + f.champ + '"]')) || (f.action && li.querySelector('[data-action="' + f.action + '"]')) || li.querySelector('button, input');
  }
  if (!c && f.selecteur) c = zone.querySelector(f.selecteur);
  if (!c && f.repli) c = zone.querySelector(f.repli);
  if (c) { if (!c.hasAttribute('tabindex') && !/^(BUTTON|INPUT|SELECT|TEXTAREA|A|SUMMARY)$/.test(c.tagName)) c.setAttribute('tabindex', '-1'); c.focus({ preventScroll: false }); }
}
App.rendre = (onglet, o = {}) => {
  const zone = document.getElementById('vue-' + onglet); if (!zone) return;
  ONGLETS[onglet].rendre(zone, App);
  if (o.haut) window.scrollTo(0, 0);
  placerFocus(zone, o.focus);
};
App.majTout = async (o = {}) => {
  await App.relire();
  App.rendre(App.onglet, atelierEnCours() ? {} : o);
  if (atelierEnCours()) { atelierRendre(App); placerFocus(document.getElementById('atelier'), o.focus); }
  App.majBadge();
};
App.majBadge = () => {
  const b = $('.onglets [data-onglet="semaine"] .badge'); if (!b) return;
  const n = M.disponible() ? resteAujourdhui(App) : 0;
  b.hidden = !n; b.innerHTML = n ? n + '<span class="visuellement-cache"> publication' + (n > 1 ? 's' : '') + ' à faire aujourd\'hui</span>' : '';
};
function bandeau() {
  const b = document.getElementById('bandeau'); const t = [];
  if (App.nouvelleVersion) t.push('Une nouvelle version est prête : elle s\'ouvrira à la fermeture de cette publication.');
  if (Stock.enMemoire()) t.push('Ce téléphone ne garde rien pour l\'instant : les scores tapés seront perdus à la fermeture.');
  if (M.disponible() && M.estHorsLigne()) t.push('Sans réseau : ' + M.phraseReleve().toLowerCase() + '.');
  else if (M.disponible() && M.estLent()) t.push('Réseau faible : ' + M.phraseReleve().toLowerCase() + ', gardés sur ce téléphone.');
  if (!M.disponible()) t.push('Les matchs ne sont pas encore sur ce téléphone. Ouvrez l\'appli une fois avec du réseau.');
  b.textContent = t.join(' '); b.hidden = !t.length;
}

function changerOnglet(o, { focus = true } = {}) {
  if (!ONGLETS[o]) return;
  App.onglet = o;
  for (const [k] of Object.entries(ONGLETS)) document.getElementById('vue-' + k).hidden = k !== o;
  for (const b of $$('.onglets [data-onglet]')) { if (b.dataset.onglet === o) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  $('#titre-ecran').textContent = ONGLETS[o].titre;
  document.title = ONGLETS[o].titre + ' · Les publications du club';
  App.rendre(o);
  window.scrollTo(0, 0);
  if (focus) $('#titre-ecran').focus({ preventScroll: true });
}

// ---------- écrans d'entrée ----------
function montrerEcran(nom) {
  $('#ecran-installer').hidden = nom !== 'installer';
  $('#ecran-code').hidden = nom !== 'code';
  $('#appli').hidden = nom !== 'appli';
  window.scrollTo(0, 0);
}
App.montrerInstallation = () => {
  $('#inst-fermer').hidden = false; $('#inst-continuer').hidden = true; $('#inst-continuer-note').hidden = true;
  montrerEcran('installer'); $('#inst-titre').setAttribute('tabindex', '-1'); $('#inst-titre').focus();
};
App.apresInstallation = async () => {
  if ((await E.etatCode()).entre) { montrerEcran('appli'); if (!App.ouverte) App.ouvrir(); else changerOnglet('reglages'); return; }
  montrerEcran('code'); $('#code').focus();
};
App.ouvrir = async ({ premiereFois = false } = {}) => {
  montrerEcran('appli');
  if (!App.ouverte) {
    App.ouverte = true;
    const [r] = await Promise.all([M.charger(), P.chargerCalendrier()]);
    App.dernierReleve = M.releve();
    await App.relire();
    bandeau();
    // première entrée : la confirmation s'écrit sous le titre (rien ne recouvre l'écran) et le titre prend le focus
    App.bienvenue = premiereFois;
    changerOnglet(App.onglet, { focus: premiereFois });
    App.majBadge();
    Stock.persister().then((p) => { window.__persiste = p; });
    window.pret = true;
    // réseau lent au gymnase : l'appli s'ouvre sur la copie gardée ; les matchs sont relus en arrière-plan 5 s plus tard
    setTimeout(() => { window.__rafraichi = App.verifierMatchs({ attendre: true }); }, 5000);
  } else if (premiereFois) { App.bienvenue = true; changerOnglet(App.onglet, { focus: true }); }
  if (premiereFois) { annoncer('C\'est bon. Le code reste sur ce téléphone : vous ne le tapez qu\'une fois.'); App.bienvenue = false; }
};

// ---------- matchs relus (ouverture, retour au premier plan, retour du réseau) ----------
App.verifierMatchs = async (o = {}) => {
  const r = await M.charger(o);
  bandeau();
  if (r.change || r.premier) {
    if (atelierEnCours()) App.matchsEnAttente = true;
    else { await App.majTout(); if (r.change && M.releve() !== App.dernierReleve) signaler('Les matchs ont été mis à jour (relevés le ' + M.releve() + ').', 6000); }
    App.dernierReleve = M.releve();
  }
  return r;
};
App.apresAtelier = (id) => {
  // une nouvelle version est arrivée pendant l'atelier : elle s'ouvre maintenant (les photos choisies sont déjà libérées)
  if (App.nouvelleVersion) { if (!App.lancerNouvelleVersion()) location.reload(); return; }
  App.matchsEnAttente = false;
  App.majTout(id ? { focus: { selecteur: '[data-pub="' + CSS.escape(id) + '"]' } } : {});
};
function auRetour() {
  if (!App.ouverte) return;
  const j = aujourdhui(); if (j !== App.jour) { App.jour = j; App.vueMatchs = null; }
  window.__rafraichi = App.verifierMatchs();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') auRetour(); });
addEventListener('online', auRetour);
addEventListener('offline', () => { if (App.ouverte) { M.charger().then(bandeau); } });

// ---------- « Effacer mes données » ----------
function demander(titre, texte, oui, non) {
  const d = document.getElementById('confirmer');
  $('#conf-titre', d).textContent = titre; $('#conf-texte', d).textContent = texte;
  $('#conf-oui', d).textContent = oui; $('#conf-non', d).textContent = non;
  return new Promise((ok) => {
    const fin = (v) => { d.close(); $('#conf-oui', d).onclick = $('#conf-non', d).onclick = null; d.oncancel = null; ok(v); };
    $('#conf-oui', d).onclick = () => fin(true); $('#conf-non', d).onclick = () => fin(false);
    d.oncancel = (e) => { e.preventDefault(); fin(false); };
    d.showModal(); $('#conf-non', d).focus();
  });
}
App.effacerDonnees = async (depuis) => {
  const oui = await demander('Effacer mes données',
    'Effacer les scores tapés, les corrections, les publications cochées, les comptes du club et le code de ce téléphone ? C\'est définitif.', 'Effacer', 'Annuler');
  if (!oui) { depuis && depuis.focus(); return; }
  await Stock.toutEffacer();
  const voix = await demander('La voix des vidéos', 'Effacer aussi la voix (il faudra la recharger, environ 90 Mo) ?', 'Effacer la voix', 'Garder la voix');
  if (voix) await Stock.effacerVoix();
  window.__efface = { voix };
  location.reload();
};

// ---------- démarrage ----------
for (const s of $$('.o-picto')) s.innerHTML = PICTOS[s.dataset.picto] || '';
for (const b of $$('.onglets [data-onglet]')) b.addEventListener('click', () => changerOnglet(b.dataset.onglet));
App.ouvrirAtelier = (p, depuis) => ouvrirAtelier(p, App, depuis);

async function demarrer() {
  await Stock.verifier();
  E.brancherInstallation(App); E.brancherCode(App);
  const ec = await E.etatCode();
  if (ec.entre) { await App.ouvrir(); return; }
  window.pret = true;
  if (!E.estInstallee() && !Local.lire('sans-installer')) { montrerEcran('installer'); return; }
  montrerEcran('code'); $('#code-change').hidden = !ec.change;
}

// ---------- service worker : hors ligne et mises à jour ----------
// Une nouvelle version s'installe en attente ; l'appli la lance (message « activer ») seulement quand aucune publication n'est en
// cours, puis se recharge : une page ouverte ne lit jamais un mélange des fichiers de deux versions (moteur vidéo, voix…).
let enAttente = null;
App.lancerNouvelleVersion = () => { if (enAttente) { enAttente.postMessage('activer'); return true; } return false; };
if ('serviceWorker' in navigator) {
  const avaitControleur = !!navigator.serviceWorker.controller;
  let recharge = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!avaitControleur || recharge) return;     // première installation : pas une mise à jour
    recharge = true; location.reload();
  });
  const attendre = (w) => {
    if (!w || !navigator.serviceWorker.controller) return;
    const pret = () => {
      enAttente = w;
      if (!atelierEnCours()) { App.lancerNouvelleVersion(); return; }
      App.nouvelleVersion = true; bandeau(); annoncer('Une nouvelle version est prête : elle s\'ouvrira à la fermeture de cette publication.');
    };
    if (w.state === 'installed') pret(); else w.addEventListener('statechange', () => { if (w.state === 'installed') pret(); });
  };
  navigator.serviceWorker.register('appli/sw.js', { scope: 'appli/' }).then((r) => {
    window.__sw = r.scope;
    if (r.waiting) attendre(r.waiting);
    r.addEventListener('updatefound', () => attendre(r.installing));
  }, (e) => { window.__swErreur = String(e); });
}

demarrer();
