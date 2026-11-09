// Petits outils partagés par la page TikTok du BCR (calendrier et studio).
export const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const maj = (s) => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };

// Habillages : mêmes noms et mêmes listes par série que le moteur (js/tiktok-studio.js, HABILLAGES et HABILLAGES_PAR_SERIE).
// Le studio relit la liste du moteur au moment du montage ; ce double sert seulement à afficher le calendrier sans charger le moteur.
export const HAB_NOMS = { oblique: 'Bandes obliques', cadre: 'Cadre', bloc: 'Bloc vert', ruban: 'Rubans' };
export const HAB_SERIE = {
  programme: ['oblique', 'ruban', 'cadre'], resultats: ['oblique', 'bloc', 'ruban', 'cadre'], panier: ['bloc', 'oblique'],
  defi: ['ruban', 'bloc', 'cadre'], gens: ['cadre', 'oblique'], jeunes: ['cadre', 'bloc'], speciaux: ['oblique', 'cadre', 'bloc'], joker: ['cadre', 'ruban']
};
// Petit dessin de l'habillage (aux couleurs du club), décoratif : le nom est toujours écrit à côté.
export function dessinHabillage(h) {
  const f = '<rect width="24" height="40" rx="2" fill="#080a09"/>';
  const d = {
    oblique: '<path d="M0 22 L24 13 L24 21 L0 30Z" fill="#46c46f"/><path d="M0 32 L24 23 L24 25 L0 34Z" fill="#fff"/>',
    cadre: '<rect x="3.5" y="3.5" width="17" height="33" fill="none" stroke="#fff" stroke-width="2"/><rect x="6" y="24" width="12" height="4" fill="#46c46f"/>',
    bloc: '<rect x="0" y="20" width="24" height="20" fill="#1f7a3f"/><rect x="4" y="25" width="16" height="4" fill="#46c46f"/>',
    ruban: '<path d="M0 14 L24 11 L24 15 L0 18Z" fill="#fff"/><path d="M0 26 L24 23 L24 27 L0 30Z" fill="#46c46f"/>'
  }[h] || '';
  return '<svg class="hab-dessin" viewBox="0 0 24 40" width="14" height="24" aria-hidden="true" focusable="false">' + f + d + '</svg>';
}

// Piliers : la couleur d'une publication dans le calendrier (le nom est toujours écrit, la couleur aide seulement l'œil).
export const PILIERS = {
  'jour de match': { cle: 'match', nom: 'Matchs' },
  'fun': { cle: 'fun', nom: 'Pour s\'amuser' },
  'gens du club': { cle: 'gens', nom: 'Portraits' },
  'jeunes': { cle: 'jeunes', nom: 'Jeunes' },
  'vie du club': { cle: 'vie', nom: 'Vie du club' }
};
export const pilierDe = (modele) => PILIERS[modele && modele.pilier] || PILIERS['vie du club'];

// Dates : chaînes « AAAA-MM-JJ », calculées à midi UTC (aucun décalage d'heure d'été).
export const jourJ = (s) => new Date(s + 'T12:00:00Z');
export const versTexte = (d) => d.toISOString().slice(0, 10);
export const ajouterJours = (s, n) => { const d = jourJ(s); d.setUTCDate(d.getUTCDate() + n); return versTexte(d); };
export const ecartJours = (a, b) => Math.round((jourJ(b) - jourJ(a)) / 86400000);
const fmt = (o) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...o });
export const dateLongue = (s) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(jourJ(s)).replace(/^(\w+) 1 /, '$1 1er ');
export const jourCourt = (s) => fmt({ weekday: 'short' }).format(jourJ(s));
export const numeroJour = (s) => jourJ(s).getUTCDate();
export const moisCourt = (s) => fmt({ month: 'short' }).format(jourJ(s));
export const moisLong = (s) => fmt({ month: 'long' }).format(jourJ(s));

export function stocker(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* mode privé : rien n'est gardé */ } }
export function relire(cle, defaut) { try { const v = localStorage.getItem(cle); return v == null ? defaut : JSON.parse(v); } catch (e) { return defaut; } }
