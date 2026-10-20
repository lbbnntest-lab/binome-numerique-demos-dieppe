/* Mascotte du BCR (jaguar vert tacheté) : mêmes pièces et mêmes articulations que la joueuse (js/joueuse.js),
   donc mêmes postures et même animation. Elle remplace la joueuse sur l'accueil ; la joueuse reste visible avec ?joueuse.
   Contours : un filtre par membre trace la silhouette (pas de trait parasite aux articulations). */
(function(){
  if (/[?&]joueuse\b/.test(location.search)) return;
  var racine = document.getElementById('j-racine');
  if (!racine || !racine.ownerSVGElement) return;

  /* Taches : [x, y, rx, ry, angle]. */
  function taches(liste, cls){
    return liste.map(function(t){
      return '<ellipse class="' + cls + '" cx="' + t[0] + '" cy="' + t[1] + '" rx="' + t[2] + '" ry="' + t[3] + '" transform="rotate(' + (t[4] || 0) + ' ' + t[0] + ' ' + t[1] + ')"/>';
    }).join('');
  }

  function bras(c, s){
    var f = 'm-fourrure' + s, k = 'm-creme' + s, t = 'm-tache' + s;
    return '<g id="j-bras' + c + '" filter="url(#m-trait)"><g id="j-epaule' + c + '">' +
      '<path class="' + f + '" d="M-9 -2 C-10.8 12 -9.4 24 -7.6 33 L7.6 33 C9.4 24 10.8 12 9 -2 Z"/>' +
      '<circle class="' + f + '" cx="0" cy="33" r="7.6"/>' +
      taches([[-2.6, 9, 2.4, 3.2, 10], [3, 18, 2.1, 2.9, -15], [-2.8, 26, 1.9, 2.5, 0]], t) +
      '<g id="j-coude' + c + '">' +
        '<path class="' + f + '" d="M-7.6 0 C-8.2 10 -7.2 21 -6.4 29 L6.4 29 C7.2 21 8.2 10 7.6 0 Z"/>' +
        taches([[2.2, 8, 1.9, 2.6, 12], [-2.2, 17, 1.8, 2.4, -8]], t) +
        '<g class="m-patte">' +
          '<path class="' + k + '" d="M-6.8 25 C-10 30 -9.8 40 -4.6 44 C-0.8 46.8 5.4 46 7.8 41.6 C10 37 9.2 30 6.8 25 Z"/>' +
          '<ellipse class="' + k + '" cx="7.4" cy="31" rx="3.2" ry="5" transform="rotate(-24 7.4 31)"/>' +
          '<path class="m-detail" d="M-2.8 38.6 L-2.2 42.4 M0.8 39.4 L1 43.2 M4 38.4 L4.4 41.8"/>' +
        '</g>' +
        (c === 'A' ? '<g class="m-index" style="display:none">' +
          '<path class="' + k + '" d="M-2.6 38 L-2.8 52 C-2.8 55.8 3.2 55.8 3.2 52 L3 38 Z"/>' +
          '<path class="' + k + '" d="M-6.8 25 C-10 30 -9.6 38 -5 41.4 C-1.4 43.8 4.6 43.4 7 39.6 C9.2 35.6 8.6 29.4 6.8 25 Z"/>' +
          '<ellipse class="' + k + '" cx="7.2" cy="32" rx="3" ry="4.6" transform="rotate(-20 7.2 32)"/>' +
          '<path class="m-detail" d="M-5 33.4 Q-1 35 3 33.6 M-0.2 38.6 L0.2 42"/>' +
        '</g>' : '') +
      '</g>' +
      '<path class="' + f + '" d="M-10.4 -3 C-10.6 -10 -5.4 -13 0 -13 C5.6 -13 10.6 -10 10.4 -3 C10.8 2 10.2 6 9.2 10 L-9 10 C-10.2 6 -10.8 2 -10.4 -3 Z"/>' +
    '</g></g>';
  }

  function jambe(c, s){
    var f = 'm-fourrure' + s, k = 'm-creme' + s, t = 'm-tache' + s;
    return '<g id="j-cuisse' + c + '" filter="url(#m-trait)">' +
      '<path class="' + f + '" d="M-13 -4 C-14.8 16 -12 38 -9.4 50 L9.4 50 C12 38 14.8 16 13 -4 Z"/>' +
      '<circle class="' + f + '" cx="0" cy="50" r="9.4"/>' +
      taches([[-4, 10, 3, 3.8, 15], [4.4, 21, 2.6, 3.4, -10], [-3.6, 33, 2.4, 3.2, 5], [3.4, 43, 2.2, 2.8, -20]], t) +
      '<g id="j-genou' + c + '">' +
        '<path class="' + f + '" d="M-9.4 0 C-11 14 -8.8 32 -7.2 47 L7.2 47 C8.8 32 11 14 9.4 0 Z"/>' +
        taches([[2.6, 11, 2.3, 3, -10], [-2.6, 24, 2.1, 2.8, 8], [2.4, 36, 1.9, 2.5, 0]], t) +
        '<g id="j-pied' + c + '">' +
          '<path class="' + k + '" d="M-9.4 -6 C-11 4 -9 10.6 -4.4 10.6 L19.6 10.6 C25.6 10.6 26.2 1.8 18.6 -1 L6.4 -7 Z"/>' +
          '<path class="m-detail" d="M10.4 10 L11 5.6 M15.4 10 L16.2 6"/>' +
        '</g>' +
      '</g>' +
    '</g>';
  }

  var tronc =
    '<g id="j-tronc" filter="url(#m-trait)">' +
      '<g id="j-queue" data-pivot="-14 -4" filter="url(#m-trait)">' +
        '<path class="m-queue" d="M0 0 C-12 10 -22 26 -20 44 C-19 54 -10 58 -5 51"/>' +
        '<circle class="m-tache" cx="-10" cy="9.6" r="2.2"/><circle class="m-tache" cx="-18.6" cy="25" r="2.3"/>' +
        '<circle class="m-tache" cx="-19.6" cy="39" r="2.1"/><circle class="m-tache" cx="-5" cy="51" r="4.6"/>' +
      '</g>' +
      '<path class="m-fourrure" d="M-19 12 C-24 -8 -24.6 -40 -19.6 -60 C-17 -71 -9 -78 2 -78 C13 -78 19.6 -71 21.6 -60 C25.6 -46 26.6 -20 21 12 C11 18.6 -9 18.6 -19 12 Z"/>' +
      '<path class="m-creme" d="M7 -66 C17 -62 22.4 -46 22 -28 C21.6 -12 18.6 2 13.4 10 C5.4 11 1.6 -6 2 -26 C2.2 -44 3 -58 7 -66 Z"/>' +
      taches([[-11, -58, 3, 2.4, 20], [-14, -40, 3.2, 2.6, -10], [-6, -48, 2.4, 2, 30], [-12, -22, 3, 2.4, 0], [-5, -30, 2.2, 1.8, -20], [-10, -4, 2.8, 2.2, 15], [-2, -12, 2, 1.6, 0]], 'm-tache') +
    '</g>';

  /* La tête est dessinée au premier plan (au-dessus du bras avant), dans un groupe qui suit le tronc. */
  var tete =
      '<g id="j-tete" filter="url(#m-trait)"><g class="m-profil" transform="translate(-2 4) scale(1.32)">' +
        '<path class="m-fourrure" d="M-15 -36 C-21 -50 -17 -61 -12 -64 C-4 -61 2 -55 5 -48 Z"/>' +
        '<path class="m-oreille" d="M-12.6 -45 C-15.4 -52 -13.8 -58 -11.6 -59.6 C-7.4 -57 -4.4 -53.4 -2.8 -49.6 Z"/>' +
        '<path class="m-fourrure" d="M-19.4 -20 C-21.4 -36 -10 -50.6 6 -50.6 C22.4 -50.6 33.6 -38.6 33.6 -24 C33.6 -10 24 -1 8 -1 C-8 -1 -18.4 -8 -19.4 -20 Z"/>' +
        '<path class="m-fourrure" d="M13 -47 C17 -58 25.4 -64.6 32 -62.6 C34.6 -54 33 -44 28.6 -37.6 Z"/>' +
        '<path class="m-oreille" d="M17.6 -48.4 C20.6 -55.4 25.6 -59 29.6 -58.6 C30.6 -53 29.6 -47.4 27.4 -43.6 Z"/>' +
        taches([[-11, -36, 3.2, 2.4, -30], [-3, -43, 3, 2.3, -10], [7, -46, 3.2, 2.2, 0], [17, -44, 2.8, 2.1, 15], [25, -38, 2.4, 1.9, 35], [-15, -25, 2.6, 2.1, -50], [-5, -35, 2.2, 1.7, 0], [13, -38, 2.2, 1.6, 10], [2, -39, 1.8, 1.4, 0]], 'm-tache') +
        '<path class="m-creme" d="M-19 -18 L-25 -15.4 L-18.8 -12.6 L-23.4 -8.4 L-16 -7.6 L-17.4 -2.4 L-9 -3.6 C-12 -8 -14.6 -13.4 -19 -18 Z"/>' +
        '<path class="m-creme" d="M-8 -14 C-6 -23 2 -27 11 -26 C19 -29.6 31 -28.6 35.4 -20 C38.4 -11 32.4 0.6 17 1.4 C3 2 -8.6 -4 -8 -14 Z"/>' +
        '<path class="m-detail" d="M-1 -30.4 Q4.4 -35.4 10 -30.6"/>' +
        '<path class="m-detail" d="M0.4 -29.8 Q4.6 -27.8 9 -29.6"/>' +
        '<ellipse class="m-blanc" cx="20.4" cy="-29.4" rx="5.8" ry="6.6"/>' +
        '<circle class="m-iris" cx="22.8" cy="-28.6" r="3.8"/><circle class="m-pupille" cx="23.4" cy="-28.6" r="1.9"/>' +
        '<circle class="m-blanc" cx="24.6" cy="-30.4" r="1.1"/>' +
        '<ellipse class="m-fourrure m-paupiere" cx="20.4" cy="-29.4" rx="6.4" ry="7.2" transform="scale(1 0)"/>' +
        '<path class="m-detail" d="M14.6 -36.8 Q20.6 -40.4 26.4 -36.4"/>' +
        '<path class="m-detail" d="M30.4 -19.4 L29.4 -15.4"/>' +
        '<path class="m-bouche" d="M13.4 -14.6 C18.4 -12.4 26.4 -12.4 33.4 -15.6 C33.6 -6.4 27.6 -0.6 21.2 -0.6 C15.6 -0.6 12.4 -7 13.4 -14.6 Z"/>' +
        '<path class="m-langue" d="M16.4 -4.6 C18.6 -9 25.2 -9.4 28.6 -6.2 C27.4 -2 23.6 -0.2 20.4 -0.6 C18.2 -0.9 16.6 -2.6 16.4 -4.6 Z"/>' +
        '<path class="m-blanc" d="M16.6 -13.4 L18.4 -9.2 L20 -13 Z"/><path class="m-blanc" d="M28 -13.6 L29.2 -10 L30.6 -14.2 Z"/>' +
        '<ellipse class="m-nez" cx="30.6" cy="-22" rx="3.8" ry="2.7"/><ellipse class="m-blanc" cx="29.6" cy="-22.9" rx="1.1" ry="0.6"/>' +
      '</g>' +
      /* Tête de face, comme sur la couverture du calendrier : clin d'œil, grand sourire, langue rose. */
      '<g class="m-face" style="display:none" transform="translate(-16 0) scale(1.32)">' +
        '<path class="m-fourrure" d="M-15 -40 C-22 -52 -20 -63 -14 -66 C-5 -63 1 -57 3 -50 Z"/>' +
        '<path class="m-oreille" d="M-12.5 -47 C-16 -54 -14.6 -60 -12.4 -61.6 C-8 -59 -4.6 -55 -3 -51.4 Z"/>' +
        '<path class="m-fourrure" d="M15 -50 C19 -60 28 -66 35 -64 C37.6 -55 36 -45 31.6 -39 Z"/>' +
        '<path class="m-oreille" d="M19.6 -51.4 C22.6 -58.4 27.6 -62 31.6 -61.6 C32.6 -56 31.6 -50.4 29.4 -46.6 Z"/>' +
        '<path class="m-fourrure" d="M-21 -22 C-23 -40 -10 -53 8 -53 C26 -53 38 -40 37 -24 C36 -9 25 -1 8 -1 C-9 -1 -20 -9 -21 -22 Z"/>' +
        taches([[-12, -38, 3, 2.3, -30], [-3, -45, 3, 2.2, -10], [8, -47, 3.2, 2.2, 0], [19, -45, 2.8, 2.1, 15], [28, -38, 2.6, 2, 35], [-17, -28, 2.4, 2, -50], [32, -29, 2.3, 1.9, 50], [3, -40, 2, 1.5, 0], [14, -40, 2, 1.5, 0]], 'm-tache') +
        '<path class="m-creme" d="M-20 -20 L-27 -17.6 L-20.6 -14.6 L-25.6 -10.4 L-17.6 -9.6 L-19 -4 L-10 -5 C-13.6 -10 -16 -15 -20 -20 Z"/>' +
        '<path class="m-creme" d="M36 -20 L43 -17.6 L36.6 -14.6 L41.6 -10.4 L33.6 -9.6 L35 -4 L26 -5 C29.6 -10 32 -15 36 -20 Z"/>' +
        '<path class="m-creme" d="M-15 -15 C-13 -25 -2 -28 8 -27 C18 -28 29 -25 31 -15 C33 -5 22 2 8 2 C-6 2 -17 -5 -15 -15 Z"/>' +
        '<path class="m-detail" d="M-10 -31 Q-4 -36.4 2 -31"/><path class="m-detail" d="M-9 -30.2 Q-4 -28.4 1 -30.2"/>' +
        '<path class="m-detail" d="M-11 -37.4 Q-4.6 -40.6 1.6 -37.8"/><path class="m-detail" d="M11 -39.4 Q17.4 -42.6 23.6 -39"/>' +
        '<ellipse class="m-blanc" cx="17" cy="-31" rx="6" ry="7"/>' +
        '<circle class="m-iris" cx="15.2" cy="-30.4" r="4.2"/><circle class="m-pupille" cx="14.8" cy="-30.4" r="2.1"/>' +
        '<circle class="m-blanc" cx="16.6" cy="-32.6" r="1.2"/>' +
        '<ellipse class="m-fourrure m-paupiere" cx="17" cy="-31" rx="6.6" ry="7.6" transform="scale(1 0)"/>' +
        '<path class="m-detail" d="M5 -19.4 L5 -15.8"/>' +
        '<path class="m-bouche" d="M-6 -15.6 C-1 -13 11 -13 16 -15.6 C16.6 -6 11 0.4 5 0.4 C-1 0.4 -6.6 -6 -6 -15.6 Z"/>' +
        '<path class="m-langue" d="M-1.6 -4.4 C0.6 -8.6 9.4 -8.6 11.6 -4.4 C10 -0.8 6.6 0.4 5 0.4 C2.4 0.4 -0.4 -1.4 -1.6 -4.4 Z"/>' +
        '<path class="m-blanc" d="M-3.4 -14.6 L-2 -10.4 L-0.4 -14.2 Z"/><path class="m-blanc" d="M10.4 -14.2 L12 -10.4 L13.4 -14.6 Z"/>' +
        '<ellipse class="m-nez" cx="5" cy="-22" rx="3.8" ry="2.8"/><ellipse class="m-blanc" cx="3.8" cy="-23" rx="1.1" ry="0.6"/>' +
      '</g></g>' +
    '';

  var defs =
    '<defs>' +
      '<filter id="m-trait" x="-30%" y="-30%" width="160%" height="160%">' +
        '<feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="d"/>' +
        '<feFlood flood-color="#0e2618"/><feComposite in2="d" operator="in" result="c"/>' +
        '<feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>' +
      '<filter id="m-halo" x="-30%" y="-30%" width="160%" height="160%">' +
        '<feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="d"/>' +
        '<feFlood flood-color="#f1ead6"/><feComposite in2="d" operator="in" result="h"/>' +
        '<feMerge><feMergeNode in="h"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>' +
    '</defs>';

  var svg = racine.ownerSVGElement;
  svg.insertAdjacentHTML('afterbegin', defs);
  racine.innerHTML = bras('B', '-s') + jambe('B', '-s') + tronc + jambe('A', '') + bras('A', '') + '<g id="j-tete-g">' + tete + '</g>';
  racine.setAttribute('filter', 'url(#m-halo)');
  /* Postures de tir propres à la mascotte : sa tête est plus haute que la portée de son bras, le tir part donc
     vers l'avant (devant le museau) au lieu de passer au-dessus de la tête. */
  var P = window.Joueuse && window.Joueuse.P;
  if (P) {
    Object.assign(P.prise,     { brasA: -45,  avantA: -95, brasB: -55, avantB: -85 });
    Object.assign(P.appel,     { brasA: -72,  avantA: -80, brasB: -78, avantB: -78 });
    Object.assign(P.detente,   { brasA: -110, avantA: -50, brasB: -100, avantB: -55 });
    Object.assign(P.lacher,    { brasA: -118, avantA: -22, brasB: -96,  avantB: -40 });
    Object.assign(P.reception, { brasA: -112, avantA: -18, brasB: -50,  avantB: -30 });
    Object.assign(P.fin,       { brasA: -24,  avantA: -50, brasB: -14,  avantB: -30 });
  }
  /* Réglages pilotés par l'animation : tête de face, doigt levé, bras avant dessiné devant la tête. */
  var etatM = {};
  function voir(sel, oui){ var e = racine.querySelector(sel); if (e) e.style.display = oui ? '' : 'none'; }
  window.Mascotte = {
    regler: function(face, index, dessus){
      if (etatM.face !== face) { voir('.m-profil', !face); voir('.m-face', face); etatM.face = face; }
      if (etatM.index !== index) { voir('#j-coudeA .m-patte', !index); voir('#j-coudeA .m-index', index); etatM.index = index; }
      if (etatM.dessus !== dessus) {
        var b = document.getElementById('j-brasA'), t = document.getElementById('j-tete-g');
        if (dessus) racine.appendChild(b); else racine.insertBefore(b, t);
        etatM.dessus = dessus;
      }
    }
  };
  document.documentElement.classList.add('avec-mascotte');
})();
