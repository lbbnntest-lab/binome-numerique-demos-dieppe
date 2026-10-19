/* Espace dirigeants, côté équipe : licences (qui peut jouer), annonces du coach, appel aux entraînements,
   contacts d'urgence le jour du match, covoiturage, maillots et matériel. Lié uniquement depuis dirigeants.html,
   chargé avant les scripts de la page (BCRLicences sert à la sélection du match) ; l'affichage attend la fin du chargement.
   Tout est simulé : rien n'est envoyé. Données de la visite dans sessionStorage, clés bcr- :
   - bcr-annonces (contrat commun, lu par l'espace des familles) ; bcr-covoit (contrat commun, écrit par les familles, lu ici) ;
   - bcr-licences, bcr-appels, bcr-materiel (propres à cette page).
   Sur le vrai site, chaque rôle ne recevrait que ses données ; ici, l'affichage par rôle passe par js/roles.js. */
(function () {
  'use strict';
  function lire(cle, d) { try { var v = sessionStorage.getItem(cle); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrire(cle, v) { try { sessionStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function deux(n) { return (n < 10 ? '0' : '') + n; }
  function aujourdhui() { var d = new Date(); return d.getFullYear() + '-' + deux(d.getMonth() + 1) + '-' + deux(d.getDate()); }
  function dateFr(iso, court) {
    if (!iso) return '';
    var d = new Date(iso.slice(0, 10) + 'T12:00'); if (isNaN(d)) return iso;
    var t = d.toLocaleDateString('fr-FR', court ? { day: 'numeric', month: 'long' } : { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function annoncer(id, texte) { var p = document.getElementById(id); if (!p) return; p.hidden = false; p.textContent = texte; }
  var CODE = { u13: 'U13', u15: 'U15', u18: 'U18', rf2: 'RF2' };
  var COURT = { u13: 'U13 F', u15: 'U15 F', u18: 'U18 F', rf2: 'Seniors F (RF2)' };

  /* 1. Licences : qui peut jouer. Joueuses d'exemple dont la licence est en attente (cohérent avec le suivi des inscriptions). */
  var ATTENTE = { u13: ['Iris N.'], u15: ['Juliette C.'], u18: ['Inès M.', 'Chloé R.'], rf2: ['Virginie C.'] };
  var MESSAGE_LICENCE = 'Licence en attente : elle ne peut pas être inscrite sur la feuille de match.';
  function licenceValide(eq, nom) {
    if ((ATTENTE[eq] || []).indexOf(nom) < 0) return true;
    return !!lire('bcr-licences', {})[eq + '|' + nom];
  }
  window.BCRLicences = {
    MESSAGE: MESSAGE_LICENCE,
    valide: licenceValide,
    enAttente: function (eq) { return (ATTENTE[eq] || []).filter(function (n) { return !licenceValide(eq, n); }); },
    /* Validée pendant la visite (par le secrétaire), toutes équipes confondues. */
    valideeParNom: function (nom) { var v = lire('bcr-licences', {}); return Object.keys(v).some(function (k) { return v[k] && k.split('|')[1] === nom; }); },
    valider: function (eq, nom) {
      var v = lire('bcr-licences', {}); v[eq + '|' + nom] = true; ecrire('bcr-licences', v);
      try { document.dispatchEvent(new CustomEvent('bcr:licence', { detail: { equipe: eq, nom: nom } })); } catch (x) {}
    }
  };

  function demarrer() {
    var R = window.BCRRole, D = window.BCRDir;
    if (!D) return;
    function role() { return R ? R.role() : 'president'; }
    function eqId() { return R ? R.equipe() : 'u18'; }
    function effectif(id) { return D.equipes[id].effectif; }

    /* ---------- Secrétaire : qui peut jouer ---------- */
    var qpj = document.getElementById('qpj-liste');
    function rendreQpj() {
      if (!qpj) return;
      qpj.innerHTML = Object.keys(CODE).map(function (id) {
        var e = D.equipes[id], att = window.BCRLicences.enAttente(id), n = e.effectif.length;
        return '<li><div><strong>' + esc(e.titre) + '</strong><span>' + (n - att.length) + ' licences validées sur ' + n + ' joueuses' + (att.length ? '' : ' : toute l\'équipe peut jouer') + '.</span>'
          + (att.length ? '<ul class="qpj-attente">' + att.map(function (nom) {
            return '<li><span><b>' + esc(nom) + '</b> · <span class="etat attente">Licence en attente</span></span>'
              + '<button type="button" class="bouton ligne petit" data-valider-lic="' + id + '|' + esc(nom) + '">Noter la licence validée<span class="visuellement-cache"> pour ' + esc(nom) + '</span></button></li>';
          }).join('') + '</ul>' : '') + '</div>'
          + '<div class="geste"><span class="etat pastille ' + (att.length ? 'attente">' + att.length + ' en attente' : 'ok">Complet') + '</span></div></li>';
      }).join('');
    }
    if (qpj) qpj.addEventListener('click', function (e) {
      var b = e.target.closest('[data-valider-lic]'); if (!b) return;
      var p = b.getAttribute('data-valider-lic').split('|');
      window.BCRLicences.valider(p[0], p[1]);
      annoncer('qpj-etat', 'Simulation : licence de ' + p[1] + ' notée validée. Le coach peut maintenant l\'inscrire sur la feuille de match.');
      (document.querySelector('#qpj-liste [data-valider-lic]') || document.getElementById('qpj-etat')).focus();
    });

    /* ---------- Coach : annonces à l'équipe ---------- */
    /* Annonce d'exemple de chaque équipe, jamais écrite dans bcr-annonces ; U15 et U13 : mêmes textes que l'espace des familles (js/famille.js). */
    var EX_ANNONCES = {
      u15: { date: '2026-10-14', texte: 'Pour chaque match, prévoyez une gourde et soyez là à l\'heure du rendez-vous indiquée dans la convocation. Merci à tous !' },
      u13: { date: '2026-10-15', texte: 'Pensez à indiquer dans votre espace les jours d\'absence des vacances : cela m\'aide à préparer les prochains matchs.' },
      u18: { date: '2026-10-14', texte: 'Rappel : gourde et tenue de rechange à chaque entraînement. Merci aux familles qui accompagnent l\'équipe en voiture.' },
      rf2: { date: '2026-10-14', texte: 'Rappel : gourde et tenue de rechange à chaque entraînement. Merci à celles qui proposent leur voiture pour les déplacements.' }
    };
    function annonces(id) { return lire('bcr-annonces', []).filter(function (a) { return a && a.equipe === id; }); }
    function rendreAnnonces() {
      var id = eqId(), l = annonces(id).slice().reverse();
      document.getElementById('an-equipe').textContent = COURT[id];
      document.getElementById('vie-sur').textContent = 'Coach · ' + D.equipes[id].niv;
      var n = effectif(id).length;
      document.getElementById('an-liste').innerHTML = l.map(function (a) {
        return '<li><p class="an-tete"><strong>' + esc(a.auteur || ('Coach ' + CODE[id])) + '</strong><span>Envoyée ' + (a.date === aujourdhui() ? 'aujourd\'hui' : 'le ' + esc(dateFr(a.date).toLowerCase())) + '</span><span class="etiquette-ex">envoyée pendant cette visite</span></p>'
          + '<p class="dm-texte">' + esc(a.texte) + '</p><p class="aide">Notification dans l\'espace et sur le téléphone des ' + n + ' familles de l\'équipe (simulation).</p></li>';
      }).join('') + '<li><p class="an-tete"><strong>Coach ' + CODE[id] + '</strong><span>Envoyée le ' + dateFr(EX_ANNONCES[id].date).toLowerCase() + '</span><span class="etiquette-ex">exemple</span></p><p class="dm-texte">' + esc(EX_ANNONCES[id].texte) + '</p></li>';
    }
    document.getElementById('an-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var t = document.getElementById('an-texte'), err = document.getElementById('an-erreur'), v = t.value.trim();
      t.removeAttribute('aria-invalid'); err.textContent = '';
      if (v.length < 3) { t.setAttribute('aria-invalid', 'true'); err.textContent = 'Écrivez le message avant de l\'envoyer.'; t.focus(); return; }
      var id = eqId(), l = lire('bcr-annonces', []);
      l.push({ id: 'an' + Date.now(), equipe: id, texte: v, date: aujourdhui(), auteur: 'Coach ' + CODE[id], ex: false });
      ecrire('bcr-annonces', l);
      t.value = '';
      rendreAnnonces();
      annoncer('an-etat', 'Simulation : annonce envoyée aux ' + effectif(id).length + ' familles de l\'équipe ' + COURT[id] + ', par une notification dans leur espace et sur leur téléphone. Rien n\'est envoyé dans cette maquette.');
      document.getElementById('an-etat').focus();
    });

    /* ---------- Coach : covoiturage (proposé par les familles, lu ici) ---------- */
    /* Offre d'exemple de chaque équipe (U15 et U13 : la même que dans l'espace des familles), affichée tant que
       les familles ne l'ont pas reprise dans bcr-covoit (identifiant « cv-ex-<équipe> »). */
    var COVOIT_EX = {
      u15: { conducteur: 'Parent de Camille T.', places: 3, depart: 'Parking de la salle Alexandre-Cheruel', reservations: ['Lina P.'] },
      u13: { conducteur: 'Parent de Zoé D.', places: 3, depart: 'Parking de la salle Alexandre-Cheruel', reservations: [] },
      u18: { conducteur: 'Parent de Manon L.', places: 4, depart: 'Parking de la salle Alexandre-Cheruel', reservations: ['Alice B.', 'Pauline D.'] }
    };
    function rendreCovoit() {
      var id = eqId(), z = document.getElementById('covoit');
      var l = lire('bcr-covoit', []).filter(function (c) { return c && c.equipe === id; });
      var x = COVOIT_EX[id];
      if (x && !l.some(function (c) { return c.id === 'cv-ex-' + id; })) {
        var ext = D.matchsDe(id).av.filter(function (m) { return !m.dom; })[0];
        l.push({ id: 'cv-ex-' + id, matchId: ext ? 'ex' : id + '|a-completer', matchLib: ext ? ext.txt + ', à l\'extérieur' : 'Prochain match à l\'extérieur, date et adversaire à compléter', date: ext ? ext.d.slice(0, 10) : '', equipe: id,
          conducteur: x.conducteur, places: x.places, depart: x.depart, reservations: x.reservations.slice() });
      }
      if (!l.length) { z.innerHTML = '<p class="covoit-vide">Aucun covoiturage proposé pour l\'instant par les familles de l\'équipe.</p>'; return; }
      var groupes = {}, ordre = [];
      l.forEach(function (c) { var k = c.matchId || c.matchLib; if (!groupes[k]) { groupes[k] = []; ordre.push(k); } groupes[k].push(c); });
      ordre.sort(function (a, b) { var x = groupes[a][0].date || '9', y = groupes[b][0].date || '9'; return x < y ? -1 : x > y ? 1 : 0; });
      z.innerHTML = ordre.map(function (k) {
        var g = groupes[k], c0 = g[0];
        return '<div class="covoit-match"><p class="covoit-lib">' + (c0.date ? esc(dateFr(c0.date)) + ' · ' : '') + esc(c0.matchLib || 'Match') + '</p><ul class="covoit-offres">'
          + g.map(function (c) {
            var r = Array.isArray(c.reservations) ? c.reservations : [], p = parseInt(c.places, 10) || 0, libre = Math.max(p - r.length, 0);
            return '<li><span><b>' + esc(c.conducteur) + '</b> conduit' + (c.depart ? ' · départ : ' + esc(c.depart) : '') + (String(c.id).indexOf('cv-ex-') === 0 ? ' <span class="etiquette-ex">exemple</span>' : '') + '</span>'
              + '<span class="etat ' + (libre ? 'ok' : 'attente') + '">' + (libre ? libre + (libre > 1 ? ' places libres' : ' place libre') + ' sur ' + p : 'Complet (' + p + (p > 1 ? ' places)' : ' place)')) + '</span>'
              + '<span class="covoit-resa">' + (r.length ? 'Places réservées pour : ' + r.map(esc).join(', ') : 'Aucune place réservée') + '</span></li>';
          }).join('') + '</ul></div>';
      }).join('');
    }

    /* ---------- Coach : appel aux entraînements ---------- */
    var appel = {};   /* par équipe : { date, p: { nom: 'present' | 'absent' | 'excuse' } } */
    var LIB = { present: 'Présente', absent: 'Absente', excuse: 'Excusée' };
    function indispo(id, nom, date) { var d = D.dispo(id, nom, date); return d.t === 'indispo'; }
    function etatAppel(id) {
      if (!appel[id]) appel[id] = { date: aujourdhui(), p: {} };
      return appel[id];
    }
    function precocher(id) {
      var a = etatAppel(id); a.p = {}; a.pre = {};
      effectif(id).forEach(function (nom) { if (indispo(id, nom, a.date)) { a.p[nom] = 'excuse'; a.pre[nom] = true; } });
    }
    function compteurAppel(msg) {
      var id = eqId(), a = etatAppel(id), c = { present: 0, absent: 0, excuse: 0 }, n = effectif(id).length, faits = 0;
      effectif(id).forEach(function (nom) { if (a.p[nom]) { c[a.p[nom]]++; faits++; } });
      document.getElementById('ap-compteur').textContent = (msg ? msg + ' ' : '') + c.present + ' présentes, ' + c.absent + ' absentes, ' + c.excuse + ' excusées' + (faits < n ? ' ; ' + (n - faits) + ' à cocher.' : '.');
    }
    function rendreAppel() {
      var id = eqId(), a = etatAppel(id);
      if (!a.pre) precocher(id);
      document.getElementById('ap-date').value = a.date;
      document.getElementById('ap-heure').value = a.heure || '';
      document.getElementById('ap-liste').innerHTML = effectif(id).map(function (nom, i) {
        var v = a.p[nom] || '';
        return '<li><fieldset class="appel-ligne"><legend>' + esc(nom) + (a.pre[nom] ? '<small> · indisponibilité déclarée par la famille</small>' : '') + '</legend><div class="appel-choix">'
          + ['present', 'absent', 'excuse'].map(function (k) {
            return '<label class="ap-' + k + '"><input type="radio" name="ap-' + i + '" value="' + k + '" data-ap="' + i + '"' + (v === k ? ' checked' : '') + '><span>' + LIB[k] + '</span></label>';
          }).join('') + '</div></fieldset></li>';
      }).join('');
      document.getElementById('ap-erreur').textContent = '';
      compteurAppel();
      rendreAssiduite();
    }
    /* Assiduité : base d'exemple (12 séances) + appels enregistrés pendant la visite. */
    var BASE_ABS = [0, 1, 0, 2, 1, 0, 3, 0, 1, 0, 2, 1], BASE_EXC = [1, 0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 0], BASE_SEANCES = 12;
    function rendreAssiduite() {
      var id = eqId(), appels = lire('bcr-appels', []).filter(function (x) { return x.equipe === id; });
      var seances = BASE_SEANCES + appels.length;
      document.getElementById('ap-seances').textContent = seances + ' séances' + (appels.length ? ', dont ' + appels.length + ' enregistrée' + (appels.length > 1 ? 's' : '') + ' pendant cette visite' : '');
      document.getElementById('ap-assiduite').innerHTML = effectif(id).map(function (nom, i) {
        var ab = BASE_ABS[i % 12], ex = BASE_EXC[i % 12], pr = BASE_SEANCES - ab - ex;
        appels.forEach(function (x) { var v = x.presences[nom]; if (v === 'present') pr++; else if (v === 'absent') ab++; else if (v === 'excuse') ex++; });
        var taux = Math.round(pr * 100 / seances);
        return '<tr><td>' + esc(nom) + '</td><td>' + pr + '</td><td>' + ab + '</td><td>' + ex + '</td><td><span class="etat ' + (taux >= 80 ? 'ok' : 'attente') + '">' + taux + ' %</span></td></tr>';
      }).join('');
    }
    document.getElementById('ap-date').addEventListener('change', function () {
      var id = eqId(), a = etatAppel(id); a.date = this.value; precocher(id); rendreAppel();
      document.getElementById('ap-date').focus();
    });
    document.getElementById('ap-heure').addEventListener('input', function () { etatAppel(eqId()).heure = this.value; });
    document.getElementById('ap-liste').addEventListener('change', function (e) {
      var r = e.target.closest('[data-ap]'); if (!r) return;
      var id = eqId(); etatAppel(id).p[effectif(id)[+r.getAttribute('data-ap')]] = r.value; compteurAppel();
    });
    document.getElementById('ap-tous').addEventListener('click', function () {
      var id = eqId(), a = etatAppel(id), ex = 0;
      effectif(id).forEach(function (nom) { if (a.p[nom] === 'excuse') ex++; else a.p[nom] = 'present'; });
      rendreAppel();
      compteurAppel('Tout le monde est noté présent' + (ex ? ', sauf ' + (ex > 1 ? 'les ' + ex + ' joueuses excusées' : 'la joueuse excusée') : '') + '.');
    });
    document.getElementById('ap-ok').addEventListener('click', function () {
      var id = eqId(), a = etatAppel(id), err = document.getElementById('ap-erreur'), date = document.getElementById('ap-date');
      date.removeAttribute('aria-invalid');
      if (!a.date) { date.setAttribute('aria-invalid', 'true'); err.textContent = 'Choisissez la date de la séance.'; date.focus(); return; }
      var manque = effectif(id).filter(function (nom) { return !a.p[nom]; });
      if (manque.length) {
        err.textContent = manque.length + (manque.length > 1 ? ' joueuses ne sont pas encore cochées : ' : ' joueuse n\'est pas encore cochée : ') + manque.join(', ') + '.';
        var r = document.querySelector('#ap-liste [data-ap="' + effectif(id).indexOf(manque[0]) + '"]'); if (r) r.focus(); return;
      }
      err.textContent = '';
      var l = lire('bcr-appels', []).filter(function (x) { return !(x.equipe === id && x.date === a.date && (x.heure || '') === (a.heure || '')); });
      var pres = {}; effectif(id).forEach(function (nom) { pres[nom] = a.p[nom]; });
      l.push({ equipe: id, date: a.date, heure: a.heure || '', presences: pres }); ecrire('bcr-appels', l);
      rendreAssiduite();
      var c = { present: 0, absent: 0, excuse: 0 }; effectif(id).forEach(function (nom) { c[a.p[nom]]++; });
      annoncer('ap-etat', 'Simulation : appel du ' + dateFr(a.date).toLowerCase() + (a.heure ? ', ' + a.heure : '') + ' enregistré (' + c.present + ' présentes, ' + c.absent + ' absentes, ' + c.excuse + ' excusées). Le tableau d\'assiduité est à jour.');
      document.getElementById('ap-etat').focus();
    });

    /* ---------- Coach et président : contacts d'urgence, le jour du match seulement ---------- */
    var urg = { simu: {}, ouvert: false };
    /* Numéros saisis dans l'espace des familles (js/famille.js, clé bcr-urgence { lea:{tel1, tel2}, elsa:{…} }). */
    var SAISIS = { 'Léa B.': 'lea', 'Elsa B.': 'elsa' };
    function matchDuJour(id) {
      var mm = D.matchsDe(id), t = aujourdhui();
      return mm.av.concat(mm.passes).filter(function (m) { return m.d.slice(0, 10) === t; })[0] || null;
    }
    function rendreUrgence() {
      var id = eqId(), z = document.getElementById('urg-corps'), jour = matchDuJour(id), m = D.matchCourant();
      var actif = !!jour || !!urg.simu[id];
      if (!actif) {
        urg.ouvert = false;
        z.innerHTML = '<p>Le bouton apparaît le jour du match seulement' + (m.date ? ' (prochain : ' + esc(dateFr(m.date).toLowerCase()) + ')' : '') + '.</p>'
          + '<button type="button" class="bouton ligne petit" id="urg-simu">Démonstration : se placer au jour du match</button>';
        return;
      }
      var lib = jour ? 'Match d\'aujourd\'hui, ' + jour.txt : m.date ? 'Match du ' + dateFr(m.date).toLowerCase() + (m.adv ? ', contre ' + m.adv : '') : 'Jour du match' + (m.adv ? ' contre ' + m.adv : '') + ', date à compléter dans la sélection';
      var conv = window.BCRSel ? window.BCRSel.convocations().filter(function (c) { return c.id === D.cle(); })[0] : null;
      var liste = conv ? conv.joueuses : effectif(id);
      var html = '<p>' + esc(lib) + (urg.simu[id] && !jour ? ' <span class="etiquette-ex">démonstration</span>' : '') + '</p>'
        + '<button type="button" class="bouton" id="urg-bouton" aria-expanded="' + urg.ouvert + '" aria-controls="urg-liste">Contacts d\'urgence</button>';
      if (urg.ouvert) {
        html += '<div id="urg-liste"><p class="aide">' + (conv ? 'Les ' + liste.length + ' joueuses convoquées' : 'Toute l\'équipe (aucune convocation envoyée pour ce match)') + ' · <span class="etiquette-ex">exemple, numéros fictifs</span></p><ul class="urg-liste">'
          + liste.map(function (nom) {
            var i = effectif(id).indexOf(nom), a = '06 00 00 00 ' + deux(2 * i + 1), b = '06 00 00 00 ' + deux(2 * i + 2);
            var f = SAISIS[nom] ? lire('bcr-urgence', {})[SAISIS[nom]] : null;
            if (f && f.tel1) { a = f.tel1; b = f.tel2 || 'non renseigné'; }
            return '<li><b>' + esc(nom) + '</b><span>Parent 1 : ' + esc(a) + '</span><span>Parent 2 : ' + esc(b) + '</span>' + (f && f.tel1 ? '<small>Numéros saisis par la famille pendant cette visite</small>' : '') + '</li>';
          }).join('') + '</ul><button type="button" class="bouton ligne petit" id="urg-fermer">Masquer les contacts</button></div>';
      }
      z.innerHTML = html;
    }
    document.getElementById('urg-corps').addEventListener('click', function (e) {
      var id = eqId();
      if (e.target.closest('#urg-simu')) { urg.simu[id] = true; urg.ouvert = false; rendreUrgence(); document.getElementById('urg-bouton').focus(); return; }
      if (e.target.closest('#urg-bouton')) { urg.ouvert = !urg.ouvert; rendreUrgence(); document.getElementById('urg-bouton').focus(); return; }
      if (e.target.closest('#urg-fermer')) { urg.ouvert = false; rendreUrgence(); document.getElementById('urg-bouton').focus(); }
    });

    /* ---------- Maillots et matériel (président, secrétaire ; le coach voit son équipe et le matériel commun) ---------- */
    function tailles(id) {
      var t = id === 'u13' ? ['12 ans', '12 ans', '12 ans', '12 ans', '14 ans', '14 ans', '14 ans', '14 ans', '14 ans', '14 ans', 'S', 'S']
        : id === 'u15' ? ['14 ans', '14 ans', 'S', 'S', 'S', 'S', 'S', 'S', 'M', 'M', 'M', 'M']
        : ['S', 'S', 'S', 'S', 'M', 'M', 'M', 'M', 'M', 'L', 'L', 'L'];
      return t.map(function (x, i) { return 'n° ' + (i + 4) + ' : ' + x; }).join(' · ');
    }
    var MATERIEL = [
      { id: 'mj-u13', equipe: 'u13', lib: 'Jeu de maillots U13 F', detail: '12 maillots et shorts', tailles: tailles('u13'), confie: 'Coach U13' },
      { id: 'mj-u15', equipe: 'u15', lib: 'Jeu de maillots U15 F', detail: '12 maillots et shorts', tailles: tailles('u15'), confie: 'Famille B. (lavage)' },
      { id: 'mj-u18', equipe: 'u18', lib: 'Jeu de maillots U18 F', detail: '12 maillots et shorts', tailles: tailles('u18'), confie: '' },
      { id: 'mj-rf2', equipe: 'rf2', lib: 'Jeu de maillots seniors F (RF2)', detail: '12 maillots et shorts', tailles: tailles('rf2'), confie: 'Coach RF2' },
      { id: 'ballons-u18', equipe: 'u18', lib: 'Ballons de match U18 F', detail: '6 ballons', confie: 'Coach U18' },
      { id: 'trousse-u15', equipe: 'u15', lib: 'Trousse de secours U15 F', detail: 'Vérifiée en septembre', confie: 'Coach U15' },
      { id: 'ballons', equipe: '', lib: 'Ballons d\'entraînement', detail: '20 ballons, dans le local', confie: '' },
      { id: 'chasubles', equipe: '', lib: 'Chasubles', detail: '2 jeux de 10', confie: '' },
      { id: 'sacs', equipe: '', lib: 'Sacs de matériel', detail: '4 sacs (plots, pompe, sifflets)', confie: '' }
    ];
    var pretOuvert = null;
    function etatMat(m) { var o = lire('bcr-materiel', {})[m.id]; return o ? o : { confie: m.confie }; }
    function visibleMat(m) { return role() !== 'coach' || !m.equipe || m.equipe === eqId(); }
    function rendreMateriel() {
      var l = MATERIEL.filter(visibleMat), prets = l.filter(function (m) { return etatMat(m).confie; });
      document.getElementById('mat-alerte').innerHTML = prets.length
        ? '<strong>À rendre en fin de saison</strong><span>' + prets.length + (prets.length > 1 ? ' articles sont prêtés' : ' article est prêté') + ' : ' + prets.map(function (m) { return esc(m.lib) + ' (' + esc(etatMat(m).confie) + ')'; }).join(', ') + '. Date de fin de saison à fixer par le club.</span>'
        : '<strong>Tout est rendu</strong><span>Aucun article prêté en ce moment.</span>';
      document.getElementById('mat-rappel').hidden = !prets.length;
      document.getElementById('mat-liste').innerHTML = l.map(function (m) {
        var s = etatMat(m), fid = 'mat-' + m.id;
        return '<li id="' + fid + '"><div class="mat-info"><strong>' + esc(m.lib) + '</strong><span>' + esc(m.detail) + ' <span class="etiquette-ex">exemple</span></span>'
          + (m.tailles ? '<details><summary>Numéros et tailles</summary><p>' + esc(m.tailles) + '</p></details>' : '') + '</div>'
          + '<div class="geste">' + (s.confie
            ? '<span class="etat pastille attente">Confié à ' + esc(s.confie) + '</span><button type="button" class="bouton petit" data-rendu="' + m.id + '">Rendu<span class="visuellement-cache"> : ' + esc(m.lib) + '</span></button>'
            : '<span class="etat pastille ok">Au club</span><button type="button" class="bouton ligne petit" data-preter="' + m.id + '" aria-expanded="' + (pretOuvert === m.id) + '" aria-controls="pret-' + m.id + '">Prêter<span class="visuellement-cache"> : ' + esc(m.lib) + '</span></button>') + '</div>'
          + (pretOuvert === m.id ? '<form class="mat-pret" id="pret-' + m.id + '" data-pret-form="' + m.id + '" novalidate><label for="pret-qui">Confié à</label>'
            + '<input type="text" id="pret-qui" autocomplete="off" value="' + (role() === 'coach' ? 'Coach ' + CODE[eqId()] : '') + '" aria-describedby="pret-aide pret-err"><p class="aide" id="pret-aide">Un coach ou une famille, par exemple « Famille D. (lavage) ».</p><p class="erreur" id="pret-err"></p>'
            + '<div class="actions" style="margin-top:8px"><button type="submit" class="bouton petit">Confirmer le prêt</button><button type="button" class="bouton ligne petit" data-pret-annuler>Annuler</button></div></form>' : '')
          + '</li>';
      }).join('');
    }
    function majMat(id, confie) { var o = lire('bcr-materiel', {}); o[id] = { confie: confie }; ecrire('bcr-materiel', o); }
    var ml = document.getElementById('mat-liste');
    ml.addEventListener('click', function (e) {
      var p = e.target.closest('[data-preter]'), r = e.target.closest('[data-rendu]'), an = e.target.closest('[data-pret-annuler]');
      if (p) { var pid = p.getAttribute('data-preter'); pretOuvert = pretOuvert === pid ? null : pid; rendreMateriel(); var q = document.getElementById('pret-qui'); if (q) q.focus(); return; }
      if (an) { var aid = pretOuvert; pretOuvert = null; rendreMateriel(); var bt = ml.querySelector('[data-preter="' + aid + '"]'); if (bt) bt.focus(); return; }
      if (r) {
        var id = r.getAttribute('data-rendu'), m = MATERIEL.filter(function (x) { return x.id === id; })[0], avant = etatMat(m).confie;
        majMat(id, ''); rendreMateriel();
        annoncer('mat-etat', 'Simulation : ' + m.lib + ' rendu par ' + avant + ', noté au club.');
        var b2 = ml.querySelector('[data-preter="' + id + '"]'); if (b2) b2.focus();
      }
    });
    ml.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-pret-form]'); if (!f) return; e.preventDefault();
      var id = f.getAttribute('data-pret-form'), q = document.getElementById('pret-qui'), v = q.value.trim(), m = MATERIEL.filter(function (x) { return x.id === id; })[0];
      if (!v) { q.setAttribute('aria-invalid', 'true'); document.getElementById('pret-err').textContent = 'Indiquez à qui le matériel est confié.'; q.focus(); return; }
      majMat(id, v); pretOuvert = null; rendreMateriel();
      annoncer('mat-etat', 'Simulation : ' + m.lib + ' confié à ' + v + '. Il apparaît dans la liste « à rendre en fin de saison ».');
      var b3 = ml.querySelector('[data-rendu="' + id + '"]'); if (b3) b3.focus();
    });
    document.getElementById('mat-rappel').addEventListener('click', function () {
      var n = MATERIEL.filter(visibleMat).filter(function (m) { return etatMat(m).confie; }).length;
      annoncer('mat-etat', 'Simulation : rappel de fin de saison préparé pour ' + n + (n > 1 ? ' articles prêtés' : ' article prêté') + '. Il partirait aux personnes concernées, dans leur espace et sur leur téléphone, après accord d\'un dirigeant.');
    });

    /* ---------- Rafraîchissements ---------- */
    function tout() { rendreQpj(); rendreAnnonces(); rendreCovoit(); rendreAppel(); rendreUrgence(); rendreMateriel(); }
    document.addEventListener('bcr:role', function () { urg.ouvert = false; pretOuvert = null; ['an-etat', 'ap-etat', 'mat-etat'].forEach(function (i) { document.getElementById(i).hidden = true; }); tout(); });
    document.addEventListener('bcr:licence', function () { rendreQpj(); if (D.rafraichir) D.rafraichir(); });
    /* La sélection du match change (autre match, convocation) : les contacts d'urgence suivent. */
    document.getElementById('coach-matchs').addEventListener('click', function () { setTimeout(rendreUrgence, 0); });
    document.getElementById('coach-conv').addEventListener('click', function () { setTimeout(rendreUrgence, 0); });
    window.addEventListener('pageshow', function () { rendreCovoit(); rendreAnnonces(); });
    tout();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
