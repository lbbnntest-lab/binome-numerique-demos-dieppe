/* Espace dirigeants : choix du rôle (démonstration). Lié uniquement depuis dirigeants.html et medias.html.
   - Le rôle se lit dans l'adresse (#role=coach&equipe=u18), sinon dans l'onglet (sessionStorage), sinon Président.
   - Un élément [data-roles="tresorier coach"] n'est visible que pour ces rôles ET pour le président (qui voit tout).
   - Un élément [data-roles-sauf="president coach"] est masqué pour ces rôles (message « pas dans votre espace »).
   - Chaque changement envoie l'évènement « bcr:role » (detail : role, equipe) aux scripts de la page.
   Dans la maquette, l'élément masqué reste dans la page ; sur le vrai site, il ne serait pas envoyé au navigateur. */
(function () {
  'use strict';
  var ROLES = [
    ['president', 'Président'], ['tresorier', 'Trésorier'], ['secretaire', 'Secrétaire'],
    ['coach', 'Coach'], ['stages', 'Responsable des stages'], ['communication', 'Communication et bénévoles']
  ];
  var EQUIPES = [['u13', 'U13 F (DFU13)'], ['u15', 'U15 F (DFU15)'], ['u18', 'U18 F élite (RFU18)'], ['rf2', 'Seniors F, régionale 2 (RF2)']];
  var VUE = {
    president: 'tout l\'espace, et les décisions qui attendent votre accord.',
    tresorier: 'cotisations, encaissements du stage, commande groupée, attestations de paiement et export pour la comptabilité.',
    secretaire: 'licences fédérales, dossiers incomplets et rappels, demandes des familles, documents, chiffres des subventions.',
    coach: 'votre équipe seulement : effectif, prochains matchs et matchs amicaux, présences, convocation, scores de fin de match, absences et médias.',
    stages: 'la liste du stage d\'octobre et les inscriptions.',
    communication: 'table de marque, photos et vidéos à valider, publications de fin de match et du week-end.'
  };
  function nom(liste, id) { for (var i = 0; i < liste.length; i++) if (liste[i][0] === id) return liste[i][1]; return ''; }
  function valide(liste, id) { return !!nom(liste, id); }
  function lireAdresse() {
    var r = /(?:^#|&)role=([a-z]+)/.exec(location.hash), e = /(?:^#|&)equipe=([a-z0-9]+)/.exec(location.hash);
    return { role: r && valide(ROLES, r[1]) ? r[1] : null, equipe: e && valide(EQUIPES, e[1]) ? e[1] : null };
  }
  function lire(cle) { try { return sessionStorage.getItem(cle); } catch (x) { return null; } }
  function ecrire(cle, v) { try { sessionStorage.setItem(cle, v); } catch (x) {} }

  var a = lireAdresse();
  var etat = {
    role: a.role || (valide(ROLES, lire('bcr-role')) ? lire('bcr-role') : 'president'),
    equipe: a.equipe || (valide(EQUIPES, lire('bcr-equipe')) ? lire('bcr-equipe') : 'u18')
  };

  /* Sélecteur, rendu dans chaque conteneur [data-choix-role]. */
  var conteneurs = document.querySelectorAll('[data-choix-role]');
  Array.prototype.forEach.call(conteneurs, function (c, k) {
    c.innerHTML = '<div class="roles-ligne"><p class="roles-lib" id="roles-lib-' + k + '">Connecté en tant que <span class="etiquette-ex">démonstration</span></p>'
      + '<div class="roles-boutons" role="group" aria-labelledby="roles-lib-' + k + '">'
      + ROLES.map(function (r) { return '<button type="button" data-role="' + r[0] + '" aria-pressed="false">' + r[1] + '</button>'; }).join('')
      + '</div></div>'
      + '<div class="roles-ligne roles-equipe" hidden><p class="roles-lib" id="eq-lib-' + k + '">Votre équipe</p>'
      + '<div class="roles-boutons" role="group" aria-labelledby="eq-lib-' + k + '">'
      + EQUIPES.map(function (e) { return '<button type="button" data-equipe="' + e[0] + '" aria-pressed="false">' + e[1] + '</button>'; }).join('')
      + '</div></div>'
      + '<p class="roles-vue" aria-live="polite"></p>';
  });

  function appliquer(annoncer) {
    var role = etat.role;
    document.body.setAttribute('data-role-actif', role);
    Array.prototype.forEach.call(document.querySelectorAll('[data-roles]'), function (el) {
      var l = el.getAttribute('data-roles').split(/\s+/);
      el.hidden = !(role === 'president' || l.indexOf(role) >= 0);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-roles-sauf]'), function (el) {
      el.hidden = el.getAttribute('data-roles-sauf').split(/\s+/).indexOf(role) >= 0;
    });
    Array.prototype.forEach.call(conteneurs, function (c) {
      Array.prototype.forEach.call(c.querySelectorAll('[data-role]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-role') === role)); });
      Array.prototype.forEach.call(c.querySelectorAll('[data-equipe]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-equipe') === etat.equipe)); });
      c.querySelector('.roles-equipe').hidden = role !== 'coach';
      var v = c.querySelector('.roles-vue');
      var texte = (annoncer ? 'Vous êtes connecté en tant que ' : '') + nom(ROLES, role)
        + (role === 'coach' ? ', équipe ' + nom(EQUIPES, etat.equipe) : '') + '. Vous voyez : ' + VUE[role];
      v.textContent = texte;
    });
    /* Fond alterné des sections visibles (page dirigeants), pour garder le rythme quel que soit le rôle. */
    var main = document.querySelector('main[data-alterner]');
    if (main) {
      var n = 0;
      Array.prototype.forEach.call(main.querySelectorAll(':scope > section.bloc'), function (s) {
        if (s.hidden) return;
        s.classList.toggle('clair', n % 2 === 1); n++;
      });
    }
    try { document.dispatchEvent(new CustomEvent('bcr:role', { detail: { role: role, equipe: etat.equipe } })); } catch (x) {}
    if (window.ScrollTrigger) setTimeout(function () { window.ScrollTrigger.refresh(); }, 50);
  }

  function choisir(role, equipe, annoncer) {
    if (role) etat.role = role;
    if (equipe) etat.equipe = equipe;
    ecrire('bcr-role', etat.role); ecrire('bcr-equipe', etat.equipe);
    var h = '#role=' + etat.role + (etat.role === 'coach' ? '&equipe=' + etat.equipe : '');
    try { history.replaceState(null, '', h); } catch (x) {}
    appliquer(annoncer);
  }

  Array.prototype.forEach.call(conteneurs, function (c) {
    c.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-role')) choisir(b.getAttribute('data-role'), null, true);
      if (b.hasAttribute('data-equipe')) choisir(null, b.getAttribute('data-equipe'), true);
    });
  });
  /* Un lien direct (#role=…) ouvert pendant la visite change le rôle ; une ancre ordinaire (#resume) ne le change pas. */
  window.addEventListener('hashchange', function () {
    var x = lireAdresse(); if (x.role) choisir(x.role, x.equipe, true);
  });

  /* Pastille sur le bouton Communication : publications de fin de match et de changement de match pas encore validées (saisies pendant la visite). */
  function majPastilles() {
    var n = 0;
    try {
      var sc = JSON.parse(sessionStorage.getItem('bcr-scores') || '[]'), et = JSON.parse(sessionStorage.getItem('bcr-pub-etat') || '{}');
      var ch = JSON.parse(sessionStorage.getItem('bcr-changements') || '[]');
      n = sc.filter(function (x) { var e = et['fm-' + x.id]; return !(e && e.valide); }).length
        + ch.filter(function (x) { var e = et['ch-' + x.id]; return !(e && e.valide); }).length;
    } catch (x) { n = 0; }
    Array.prototype.forEach.call(conteneurs, function (c) {
      var b = c.querySelector('[data-role="communication"]'); if (!b) return;
      var p = b.querySelector('.pastille-role');
      if (!n) { if (p) p.parentNode.removeChild(p); return; }
      if (!p) { p = document.createElement('span'); p.className = 'pastille-role'; b.appendChild(p); }
      p.innerHTML = '<span class="visuellement-cache">, </span>' + n + (n > 1 ? ' publications à valider' : ' publication à valider');
    });
  }

  window.BCRRole = {
    majPastilles: majPastilles,
    role: function () { return etat.role; },
    equipe: function () { return etat.equipe; },
    nomRole: function (r) { return nom(ROLES, r || etat.role); },
    nomEquipe: function (e) { return nom(EQUIPES, e || etat.equipe); },
    lien: function (page, r, e) { r = r || etat.role; return page + '#role=' + r + (r === 'coach' ? '&equipe=' + (e || etat.equipe) : ''); }
  };
  if (a.role) { ecrire('bcr-role', etat.role); ecrire('bcr-equipe', etat.equipe); }
  appliquer(false);
  majPastilles();
})();
