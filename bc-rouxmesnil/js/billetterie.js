/* Événements du club et billetterie (maquette BCR).
   - Lit « bcr-evenements » (sessionStorage, créé par les dirigeants dans dirigeants.html) :
     [{id, titre, date:'AAAA-MM-JJ', heure, lieu, prix:number|null, places:int|null, description, publie:bool, reservations:[{nom, nb}], ex:bool}]
     et affiche les événements publiés ; une réservation ajoute {nom, nb} à « reservations ».
   - Affiche aussi les deux événements publiés par le club (journée d'arbitrage du 21 octobre, stage d'octobre),
     sauf si les dirigeants les ont déjà créés eux-mêmes (même date, même sujet).
   - Ce qui est passé quitte « À venir ». Paramètre de test facultatif : ?aujourdhui=AAAA-MM-JJTHH:MM. */
(function () {
  'use strict';
  var CLE = 'bcr-evenements';
  var m = /[?&]aujourdhui=(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(location.search);
  var MAINTENANT = m ? new Date(m[1]).getTime() : Date.now();
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function jour(s) { return new Date(s + 'T12:00'); }
  function dateLongue(s) { var d = jour(s); return JOURS[d.getDay()] + ' ' + (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + MOIS[d.getMonth()]; }
  function finJour(s, hh) { return new Date(s + 'T' + (hh || '23:59')).getTime(); }
  function euros(n) { return (Math.round(n * 100) / 100).toString().replace('.', ',') + ' €'; }
  function lire() {
    try { var v = JSON.parse(sessionStorage.getItem(CLE) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function ecrire(l) { try { sessionStorage.setItem(CLE, JSON.stringify(l)); return true; } catch (e) { return false; } }
  function reserves(ev) { return (ev.reservations || []).reduce(function (t, r) { return t + (+r.nb || 0); }, 0); }
  function restantes(ev) { return ev.places == null ? null : Math.max(0, (+ev.places || 0) - reserves(ev)); }

  /* Événements publiés par le club (affiches de la page Facebook). */
  var STAGE_JOURS = [
    { d: '2026-10-19', lib: 'U11, lundi 19 octobre' },
    { d: '2026-10-20', lib: 'U13, mardi 20 octobre' },
    { d: '2026-10-22', lib: 'U15, jeudi 22 octobre' }
  ];
  var REELS = [
    { reel: 'arbitrage', titre: "Journée d'initiation à l'arbitrage", date: '2026-10-21', debut: '2026-10-21', fin: '2026-10-21T16:30',
      heure: '10 h - 16 h 30', lieu: 'Salle Alexandre-Cheruel, Rouxmesnil-Bouteilles',
      description: "Proposée par la Ligue de Normandie et le comité de Seine-Maritime (CD76), accueillie par le BCR. Pour les licenciés de U13 à seniors, filles et garçons ; ouverte aux autres clubs." },
    { reel: 'stage', titre: "Stage basket des vacances d'octobre", date: '2026-10-19', debut: '2026-10-19', fin: '2026-10-22T16:30',
      heure: '10 h - 16 h 30', lieu: '',
      description: "Ouvert aux licenciés et aux non-licenciés. Pique-nique à apporter pour le déjeuner, goûter offert jusqu'à 17 h. Licencié au BCR : 6 € la journée, 3 € la demi-journée ; non licencié : 10 € la journée, 5 € la demi-journée." }
  ];

  var liste = document.getElementById('evts-avenir'), passesBloc = document.getElementById('evts-passes'), passes = document.getElementById('evts-passes-liste');
  var origine = document.getElementById('evts-origine');

  function boiteJour(s, passe) {
    var d = jour(s);
    return '<div class="jour' + (passe ? ' passe' : '') + '" aria-hidden="true">' + JOURS[d.getDay()].slice(0, 3) + '.<b>' + d.getDate() + '</b>' + MOIS_C[d.getMonth()] + '</div>';
  }

  function carteReelle(r, passe) {
    var etat, encours = MAINTENANT >= finJour(r.debut, '00:00') && MAINTENANT < new Date(r.fin).getTime();
    etat = passe ? '<span class="etat-evt passe">Terminé</span>' : (encours ? '<span class="etat-evt encours">' + (r.reel === 'stage' ? 'En cours' : "Aujourd'hui") + '</span>' : '<span class="etat-evt">À venir</span>');
    var quand = r.reel === 'stage' ? 'Du lundi 19 au jeudi 22 octobre, ' + r.heure : dateLongue(r.date) + ', ' + r.heure + (r.lieu ? ' · ' + r.lieu : '');
    var cote;
    if (r.reel === 'stage') {
      var restent = 0;
      var jours = STAGE_JOURS.map(function (j) {
        var fini = MAINTENANT >= finJour(j.d, '16:30'), auj = !fini && MAINTENANT >= finJour(j.d, '00:00');
        if (!fini) restent++;
        return '<li class="' + (fini ? 'fini' : '') + '"><span>' + j.lib + '</span><em>' + (fini ? 'terminé' : (auj ? "aujourd'hui" : 'à venir')) + '</em></li>';
      }).join('');
      cote = '<div class="resa"><p class="places">Une journée par catégorie</p><ul class="jours-stage">' + jours + '</ul>'
        + (restent && !passe ? '<a class="bouton" href="inscription.html#stage">Réserver une journée</a>' : '<p class="info" style="margin-top:10px">Toutes les journées sont passées.</p>') + '</div>';
    } else {
      cote = '<div class="resa"><p class="places">Sans billetterie</p><p class="info">Inscription auprès de Bertrand, au club.</p></div>';
    }
    return '<li class="evt" data-reel="' + r.reel + '">' + boiteJour(r.date, passe) + '<div>' + etat + '<h3>' + esc(r.titre) + '</h3><p class="quand">' + esc(quand) + '</p><p class="desc">' + esc(r.description) + '</p>'
      + '<p class="info" style="margin:0;font-size:.9rem;color:var(--ink-soft)">Publié par le club sur sa page Facebook.</p></div>' + cote + '</li>';
  }

  function carteClub(ev, passe) {
    var reste = restantes(ev), gratuit = !(+ev.prix > 0);
    var prix = gratuit ? 'Gratuit' : euros(+ev.prix) + ' la place';
    var quand = dateLongue(ev.date) + (ev.heure ? ', ' + ev.heure : '') + (ev.lieu ? ' · ' + ev.lieu : '');
    var cote;
    if (passe) cote = '<div class="resa"><p class="places">Événement passé</p><p class="info">' + reserves(ev) + ' place' + (reserves(ev) > 1 ? 's' : '') + ' réservée' + (reserves(ev) > 1 ? 's' : '') + '.</p></div>';
    else if (reste === 0) cote = '<div class="resa"><p class="places complet">Complet</p><p class="info">Toutes les places sont réservées.</p></div>';
    else {
      var max = reste == null ? 10 : Math.min(10, reste);
      cote = '<form class="resa" data-resa="' + esc(ev.id) + '" novalidate>'
        + '<p class="places">' + prix + '</p>'
        + '<p class="info" data-restantes>' + (reste == null ? 'Places sans limite fixée' : reste + ' place' + (reste > 1 ? 's' : '') + ' restante' + (reste > 1 ? 's' : '') + ' sur ' + ev.places) + '</p>'
        + '<label for="nom-' + esc(ev.id) + '">Nom pour la réservation</label><input type="text" id="nom-' + esc(ev.id) + '" name="nom" autocomplete="name" maxlength="60">'
        + '<label for="nb-' + esc(ev.id) + '">Nombre de places</label><input type="number" id="nb-' + esc(ev.id) + '" name="nb" min="1" max="' + max + '" value="1" inputmode="numeric">'
        + (gratuit ? '' : '<p class="total" data-total>Total : ' + euros(+ev.prix) + '</p>')
        + '<button type="submit" class="bouton">' + (gratuit ? 'Réserver' : 'Payer et réserver (simulation)') + '</button>'
        + '<p class="msg" data-msg role="status" hidden></p></form>';
    }
    return '<li class="evt" data-evt="' + esc(ev.id) + '">' + boiteJour(ev.date, passe) + '<div>'
      + (passe ? '<span class="etat-evt passe">Terminé</span>' : '<span class="etat-evt">À venir</span>')
      + '<h3>' + esc(ev.titre) + (ev.ex ? ' <span class="etiquette-ex">exemple</span>' : '') + '</h3><p class="quand">' + esc(quand) + '</p>'
      + (ev.description ? '<p class="desc">' + esc(ev.description) + '</p>' : '') + '</div>' + cote + '</li>';
  }

  function rendre(msgPour, msgTexte) {
    var club = lire().filter(function (e) { return e && e.publie && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''); });
    var tout = club.map(function (e) { return { t: 'club', ev: e, date: e.date, finT: finJour(e.date) }; });
    REELS.forEach(function (r) {
      var doublon = club.some(function (e) {
        var t = (e.titre || '').toLowerCase();
        return r.reel === 'arbitrage' ? (e.date === '2026-10-21' && /arbitr/.test(t)) : (/stage/.test(t) && e.date >= '2026-10-19' && e.date <= '2026-10-22');
      });
      if (!doublon) tout.push({ t: 'reel', ev: r, date: r.date, finT: new Date(r.fin).getTime() });
    });
    tout.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
    var avenir = tout.filter(function (x) { return x.finT > MAINTENANT; }), anciens = tout.filter(function (x) { return x.finT <= MAINTENANT; }).reverse();
    var html = function (x, p) { return x.t === 'club' ? carteClub(x.ev, p) : carteReelle(x.ev, p); };
    liste.innerHTML = avenir.length ? avenir.map(function (x) { return html(x, false); }).join('') : '<li class="evt"><div style="grid-column:1/-1"><p class="desc" style="margin:0">Aucun événement à venir pour le moment. Les prochains seront annoncés ici et sur la page Facebook du club.</p></div></li>';
    passesBloc.hidden = !anciens.length;
    passes.innerHTML = anciens.map(function (x) { return html(x, true); }).join('');
    origine.textContent = club.length
      ? club.length + ' événement' + (club.length > 1 ? 's' : '') + ' publié' + (club.length > 1 ? 's' : '') + " depuis l'espace dirigeants pendant cette visite, avec les événements annoncés par le club."
      : "Événements annoncés par le club sur sa page Facebook. Ceux que les dirigeants publieront depuis leur espace s'ajouteront ici.";
    brancher();
    if (msgPour) {
      var f = liste.querySelector('[data-evt="' + msgPour + '"]');
      var cible = f && (f.querySelector('[data-msg]') || f.querySelector('.resa'));
      if (cible) {
        if (cible.hasAttribute('data-msg')) { cible.textContent = msgTexte; cible.hidden = false; }
        else cible.insertAdjacentHTML('beforeend', '<p class="msg" role="status">' + esc(msgTexte) + '</p>');
      }
    }
  }

  function brancher() {
    Array.prototype.forEach.call(liste.querySelectorAll('form[data-resa]'), function (f) {
      var id = f.getAttribute('data-resa'), nb = f.querySelector('[name=nb]'), tot = f.querySelector('[data-total]'), msg = f.querySelector('[data-msg]');
      var evt = function () { return lire().filter(function (e) { return String(e.id) === id; })[0]; };
      nb.addEventListener('input', function () {
        var e = evt(); if (!e || !tot) return;
        var n = Math.max(1, parseInt(nb.value, 10) || 1); tot.textContent = 'Total : ' + euros(n * (+e.prix));
      });
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var l = lire(), e = l.filter(function (x) { return String(x.id) === id; })[0];
        var erreur = function (t) { msg.className = 'msg erreur'; msg.textContent = t; msg.hidden = false; };
        if (!e || !e.publie) return erreur("Cet événement n'est plus proposé.");
        var nom = f.querySelector('[name=nom]').value.trim(), n = parseInt(nb.value, 10);
        if (nom.length < 2) return erreur('Indiquez le nom pour la réservation.');
        if (!(n >= 1) || n > 10 || String(n) !== String(nb.value).trim()) return erreur('Choisissez entre 1 et 10 places.');
        var r = restantes(e);
        /* Contrôle au moment de valider : une autre réservation a pu passer entre-temps. */
        if (r !== null && n > r) return r === 0 ? erreur("C'est complet : il ne reste plus de place.") : erreur('Il ne reste que ' + r + ' place' + (r > 1 ? 's' : '') + '.');
        e.reservations = Array.isArray(e.reservations) ? e.reservations : [];
        e.reservations.push({ nom: nom, nb: n });
        if (!ecrire(l)) return erreur("La réservation n'a pas pu être enregistrée dans ce navigateur.");
        var paye = +e.prix > 0;
        rendre(id, 'Simulation : ' + n + ' place' + (n > 1 ? 's' : '') + ' réservée' + (n > 1 ? 's' : '') + ' au nom de ' + nom + '.'
          + (paye ? ' Total ' + euros(n * (+e.prix)) + " ; aucun paiement n'est encaissé dans cette maquette." : ''));
      });
    });
  }

  window.addEventListener('storage', function (e) { if (e.key === CLE) rendre(); });
  rendre();
})();
