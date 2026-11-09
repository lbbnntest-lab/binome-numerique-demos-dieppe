// Appli des publications du BCR : petits outils partagés (dates, texte, annonces). Aucun accès réseau ici.

export const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const maj1 = (s) => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- dates : chaînes « AAAA-MM-JJ », calculées à midi UTC (aucun décalage d'heure d'été) ----------
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const jourJ = (s) => new Date(s.slice(0, 10) + 'T12:00:00Z');
export const versTexte = (d) => d.toISOString().slice(0, 10);
export const ajouterJours = (s, n) => { const d = jourJ(s); d.setUTCDate(d.getUTCDate() + n); return versTexte(d); };
export const ecartJours = (a, b) => Math.round((jourJ(b) - jourJ(a)) / 86400000);
export const jourSemaine = (s) => jourJ(s).getUTCDay();
const num = (s) => { const n = jourJ(s).getUTCDate(); return n === 1 ? '1er' : String(n); };
/** « samedi 7 novembre » */
export const dateLongue = (s) => JOURS[jourSemaine(s)] + ' ' + num(s) + ' ' + MOIS[jourJ(s).getUTCMonth()];
/** « sam. 7 » */
export const dateCourte = (s) => JOURS_COURTS[jourSemaine(s)] + ' ' + num(s);
export const nomJour = (s) => JOURS[jourSemaine(s)];
/** « Samedi 7 et dimanche 8 novembre » (ou « … 31 octobre et dimanche 1er novembre ») */
export function joursWeekend(samedi) {
  const dim = ajouterJours(samedi, 1); const m1 = jourJ(samedi).getUTCMonth(), m2 = jourJ(dim).getUTCMonth();
  return 'Samedi ' + num(samedi) + (m1 === m2 ? '' : ' ' + MOIS[m1]) + ' et dimanche ' + num(dim) + ' ' + MOIS[m2];
}
/** « 15:15 » -> « 15 h 15 », « 14:00 » -> « 14 h » */
export const heureFr = (hm) => { if (!hm) return ''; const [h, m] = hm.split(':'); return (+h) + ' h' + (m && m !== '00' ? ' ' + m : ''); };

/** La date du jour : celle du téléphone, ou ?aujourdhui=AAAA-MM-JJ pour essayer une autre date (essais seulement). */
export function aujourdhui() {
  try { const q = new URLSearchParams(location.search).get('aujourdhui'); if (/^\d{4}-\d{2}-\d{2}$/.test(q || '')) return q; } catch (e) { }
  const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ---------- annonces pour les lecteurs d'écran et petit message visible ----------
let minuterie = null;
export function annoncer(texte) {
  const a = document.getElementById('annonce'); if (!a) return;
  a.textContent = ''; setTimeout(() => { a.textContent = texte; }, 30);
}
/** message court en haut de l'écran (« Copié », « Score gardé sur ce téléphone »), annoncé aussi aux lecteurs d'écran */
export function signaler(texte, duree = 4000) {
  const b = document.getElementById('signal'); if (!b) return;
  b.textContent = texte; b.hidden = false; annoncer(texte);
  clearTimeout(minuterie); minuterie = setTimeout(() => { b.hidden = true; }, duree);
}

/** copie d'un texte ; repli : le texte est sélectionné dans un champ (« Appuyez longuement sur le texte, puis Copier. ») */
export async function copier(texte) {
  try { await navigator.clipboard.writeText(texte); return true; } catch (e) { }
  try {
    const t = document.createElement('textarea'); t.value = texte; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok;
  } catch (e) { return false; }
}

// ---------- pictogrammes de l'appli (dessinés pour elle, toujours accompagnés d'un mot écrit) ----------
const P = (d) => '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
export const PICTOS = {
  semaine: P('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 15l2.2 2.2 4.8-4.8"/>'),
  matchs: P('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5v17"/><path d="M6 6c2.6 2.4 2.6 9.6 0 12M18 6c-2.6 2.4-2.6 9.6 0 12"/>'),
  publier: P('<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5v6.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-6.5"/>'),
  photos: P('<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10.5H4z"/><circle cx="12" cy="13.5" r="3.3"/>'),
  reglages: P('<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="15" cy="6" r="2.2" fill="#080a09"/><circle cx="8" cy="12" r="2.2" fill="#080a09"/><circle cx="13" cy="18" r="2.2" fill="#080a09"/>'),
  retour: P('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
  avant: P('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
  apres: P('<path d="M9.5 5.5 16 12l-6.5 6.5"/>')
};

/** noms des réseaux écrits en toutes lettres (aucun logo ni couleur des réseaux) */
export const RESEAUX = { facebook: 'Facebook', instagram: 'Instagram', story: 'Story Instagram', tiktok: 'TikTok', video: 'Vidéo' };
export const pastilles = (liste) => '<ul class="pastilles" aria-label="Réseaux">' + liste.map((r) => '<li>' + esc(RESEAUX[r] || r) + '</li>').join('') + '</ul>';
