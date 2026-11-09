// Appli des publications du BCR : les corrections de départ, tirées de la publication du club (jamais de donnees-ffbb.js, chargé tel quel).
// Source : docs/strategie/partenariat_bc_rouxmesnil/publication_club_07-08-11/README.md, publication « Rendez-vous du week-end » des
// 7 et 8 novembre, mise en ligne par le club le 3 novembre (13 matchs, dont 8 à domicile).
//  - « heure » : l'heure donnée par le club, quand le relevé de la fédération n'en a pas (marquée « corrigé d'après la publication du club ») ;
//  - « aVerifier » : match du relevé de la fédération que le club n'a pas annoncé. Il est mis de côté par défaut (pas dans les publications,
//    pas dans les comptes) tant que le club ne l'a pas remis (« Remettre » dans l'onglet Matchs).
// Ce que le club tape ou corrige dans l'appli l'emporte toujours sur ces valeurs.
export const SOURCE_CLUB = 'votre publication du 3 novembre';
export const CORRECTIONS_CLUB = {
  'dmu13:2': { heure: '15:30' },          // DMU13 à Belleville, samedi 7 : « 15h30 » dans la publication du club
  'dfu18:5': { aVerifier: true },         // U18 filles 2 contre la sélection du Comité 76 : pas dans la publication du club
  'dmu18c:2': { aVerifier: true },        // derby U18 garçons équipe 3 contre équipe 1, sans heure : pas dans la publication du club
  'dm6:5': { aVerifier: true }            // seniors garçons DM6 contre CEP Saint-Nicolas, dimanche 8 h : pas dans la publication du club
};
