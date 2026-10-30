/* Espace dirigeants, bloc « Le score arrive tout seul » (démonstration). Lié uniquement depuis dirigeants.html.
   - Personne ne tape le score : le résultat officiel (celui de la feuille de marque, publié par la fédération) « arrive ».
     Le bouton de démonstration simule cette arrivée ; le score à montrer se règle avant de cliquer (champ vide par défaut).
   - Dès l'arrivée : score « sur le site » (aperçu), visuel de fin de match avec le logo d'UN partenaire à tour de rôle,
     deux phrases. Il reste un seul geste : « Publier sur Facebook » (simulé).
   - Le dimanche soir : visuel « Résultats du week-end » préparé de la même façon (trois résultats réels déjà joués).
   - Solution de secours : si la fédération ne donne pas son accord, un bénévole tape le score (même formulaire que « Fin de match »).
   Données : donnees_ffbb_30-10.md et faits_verifies_bcr.md (Binome-Numerique/docs/strategie/partenariat_bc_rouxmesnil/).
   Rien n'est envoyé ni publié. Clés de l'onglet (sessionStorage) toutes préfixées « bcr- » : « Remettre la démonstration à zéro » les efface. */
(function () {
  'use strict';
  var racine = document.getElementById('score-final');
  var zone = document.getElementById('sf-liste');
  if (!racine || !zone) return;

  /* Les 31 partenaires du calendrier 2026 (même liste, même ordre que partenaires.html ; Le Binôme Numérique n'en fait pas partie). */
  var PART = [["commune-rouxmesnil","Commune de Rouxmesnil-Bouteilles"],["mekabulle","Mekabulle"],["chaumont","Michael Chaumont"],["demare","SAS Demare Luc"],["proxi","Proxi Super"],["salon-m","Le salon M"],["stadium","Sport Solidaire Stadium"],["abrafer","Abrafer"],["diamant","SAS Diamant Fermetures"],["auchan","Auchan Dieppe"],["ligny-gaspary","Ligny-Gaspary Immobilier"],["dequesne","SAS Dequesne"],["trianon","Le Trianon"],["atelier","L'atelier"],["bigmat","BigMat Roger"],["wlc","WLC Automobiles"],["art-mony","Art Mony Pub"],["ongles","Les Ongles en Gel in A."],["hysope","Hysope Fleurs"],["leader","Leader actual emploi"],["bayeux","EURL Bayeux Maçonnerie"],["boulangerie-prieure","Boulangerie du Prieuré"],["etria","Etria"],["eph","EPH publicité"],["bistrot-barrieres","Bistrot des Barrières"],["franck-provost","Franck Provost"],["brico-depot","Brico Dépôt"],["samp","SAMP Services"],["carbon","Carbon Decor · Carbon Meta"],["regates","Les Régates"],["feron","Boucherie charcuterie Feron"]];

  /* Matchs de la démonstration. Le premier est le vrai match du samedi 31 octobre : le score se règle à la main avant de cliquer.
     Le second est déjà joué (FFBB, relevé du 30/10) : son score est connu. */
  var MATCHS = [
    { id: 'dfu18-2026-10-31', equipe: 'U18 féminines', code: 'DFU18', niv: 'Départementale, équipe 2', adv: 'US Bacqueville', lieu: 'à domicile',
      quand: 'Samedi 31 octobre, 15 h 30', court: 'samedi 31 octobre', jeune: true, page: 'equipes.html#dfu18', reel: null, lib: 'Match réel : samedi 31 octobre' },
    { id: 'rm3-2026-10-18', equipe: 'Seniors masculins', code: 'RM3', niv: 'Régionale 3', adv: 'Pacy-Ménilles', lieu: 'à l\'extérieur',
      quand: 'Dimanche 18 octobre', court: 'dimanche 18 octobre', jeune: false, reel: [117, 88], lib: 'Match déjà joué : dimanche 18 octobre' }
  ];
  /* Les seuls résultats datés et chiffrés du week-end des 17 et 18 octobre dans le relevé FFBB du 30/10. */
  var WEEKEND = { dates: '17 et 18 octobre', lignes: [
    { equipe: 'U15 féminines', code: 'DFU15', adv: 'BC Offranville', bcr: 42, ad: 27, jeune: true },
    { equipe: 'Seniors masculins', code: 'RM3', adv: 'Pacy-Ménilles', bcr: 117, ad: 88, jeune: false },
    { equipe: 'Seniors féminines', code: 'RF2', adv: 'Sainte-Marie', bcr: 34, ad: 41, jeune: false } ] };
  var ECART_JEUNES = 30;

  function lire(c, d) { try { var v = sessionStorage.getItem(c); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrire(c, v) { try { sessionStorage.setItem(c, JSON.stringify(v)); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function idSur(t) { return String(t).replace(/[^a-z0-9]+/gi, '-'); }
  function sigle(nom) {
    var m = nom.split(/[\s-]+/);
    if (/^[A-Z]{2,5}$/.test(m[0])) return m[0];
    return m.filter(function (x) { return /^[A-ZÉ]/.test(x); }).map(function (x) { return x.charAt(0); }).join('').slice(0, 4) || nom.slice(0, 3).toUpperCase();
  }
  function issue(b, a) { return b > a ? 'Victoire' : b === a ? 'Match nul' : 'Défaite'; }
  function maj1(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  var recs = lire('bcr-score-auto', {});        /* id du match (ou « we ») -> { bcr, ad, part, source, masque, texte, publie } */
  var rot = lire('bcr-rotation', { next: 0, app: {} });
  var enCours = {};
  function sauver() { ecrire('bcr-score-auto', recs); ecrire('bcr-rotation', rot); }
  var annonce = document.getElementById('sf-annonce');
  function annoncer(t) { if (annonce) { annonce.textContent = ''; setTimeout(function () { annonce.textContent = t; }, 60); } }

  /* Rotation équitable : chaque partenaire à son tour, dans l'ordre de la liste. */
  function prochainPartenaire() {
    if (!PART.length) return -1;
    var i = rot.next % PART.length; rot.next = rot.next + 1; return i;
  }
  function apparitions(i) { return (rot.app && rot.app[i]) || 0; }

  /* ---------- Textes : uniquement des faits (équipe, niveau, adversaire, lieu, date, score, partenaire) ---------- */
  function ecartJeunes(m, r) { return m.jeune && Math.abs(r.bcr - r.ad) >= ECART_JEUNES; }
  function textePhrases(m, r) {
    var p = r.part >= 0 ? PART[r.part] : null, iss = issue(r.bcr, r.ad).toLowerCase();
    var score = ecartJeunes(m, r) ? '' : ' ' + r.bcr + '-' + r.ad;
    var f1 = m.equipe + ' (' + m.code + '), ' + m.court + ' ' + m.lieu + ' : ' + iss + score + ' contre ' + m.adv + '.';
    var fin = r.bcr > r.ad ? 'Bravo à l\'équipe !' : r.bcr === r.ad ? 'Bravo à l\'équipe pour ce match.' : 'On reste derrière l\'équipe pour la suite.';
    var f2 = fin + (p ? ' Merci à notre partenaire : ' + p[1] + '.' : '') + (ecartJeunes(m, r) ? ' Le score est sur le site du club.' : '');
    return f1 + '\n' + f2;
  }
  function texteWeekend(r) {
    var v = WEEKEND.lignes.filter(function (l) { return l.bcr > l.ad; }).length, d = WEEKEND.lignes.length - v, p = r.part >= 0 ? PART[r.part] : null;
    return 'Résultats connus du week-end des ' + WEEKEND.dates + ' pour le Basket Club de Rouxmesnil : sur ces ' + WEEKEND.lignes.length + ' résultats, ' + v + (v > 1 ? ' victoires' : ' victoire') + ' et ' + d + (d > 1 ? ' défaites' : ' défaite') + '.\n'
      + WEEKEND.lignes.map(function (l) { return l.equipe + ' (' + l.code + ') : ' + issue(l.bcr, l.ad).toLowerCase() + ' ' + l.bcr + '-' + l.ad + ' contre ' + l.adv + '.'; }).join('\n')
      + (p ? '\nMerci à notre partenaire : ' + p[1] + '.' : '');
  }

  /* ---------- Visuels (cartes HTML aux couleurs du club ; styles de espaces.css et exemples.css) ---------- */
  function emplacement(r) {
    var p = r.part >= 0 ? PART[r.part] : null;
    if (!p) return '<p class="pv-partenaire">Emplacement partenaire</p>';
    return '<div class="pv-part"><span>Avec le soutien de</span><span class="pv-part-logo"><img src="img/partenaires/' + p[0] + '.jpg" alt=""></span></div>';
  }
  function tete() { return '<span class="pv-biais" aria-hidden="true"></span><div class="pv-tete"><img class="pv-logo" src="img/logo-bcr-160.webp" alt=""><span>Basket Club<br>de Rouxmesnil</span></div>'; }
  function visuelMatch(m, r) {
    var iss = issue(r.bcr, r.ad), p = r.part >= 0 ? PART[r.part] : null;
    var etiq = m.equipe + ', ' + iss.toLowerCase() + (r.masque ? '' : ' ' + r.bcr + ' à ' + r.ad) + ' contre ' + m.adv + (p ? ', avec le soutien de ' + p[1] : '');
    return '<div class="pub-cadre" data-visuel><div class="pub-visuel" role="img" aria-label="Visuel : ' + esc(etiq) + '">' + tete()
      + '<p class="pv-equipe">' + esc(m.equipe) + '</p><p class="pv-niv">' + esc(m.niv + ' (' + m.code + ')') + '</p>'
      + '<p class="pv-issue' + (r.bcr > r.ad ? ' v' : '') + '">' + iss + '</p>'
      + '<div class="pv-score"><div><img class="pv-logo" src="img/logo-bcr-160.webp" alt=""><span>BCR</span>' + (r.masque ? '' : '<b>' + r.bcr + '</b>') + '</div>'
      + '<div><span class="pv-sigle" aria-hidden="true">' + esc(sigle(m.adv)) + '</span><span>' + esc(m.adv) + '</span>' + (r.masque ? '' : '<b>' + r.ad + '</b>') + '</div></div>'
      + '<p class="pv-quand">' + esc(m.quand) + ' · ' + esc(m.lieu) + (r.masque ? '<br>Le score est sur le site du club' : '') + '</p>'
      + emplacement(r) + '</div></div>';
  }
  function visuelWeekend(r) {
    var p = r.part >= 0 ? PART[r.part] : null;
    return '<div class="pub-cadre" data-visuel><div class="pub-visuel general" role="img" aria-label="Visuel : résultats du week-end des ' + WEEKEND.dates + ', ' + WEEKEND.lignes.length + ' résultats' + (p ? ', avec le soutien de ' + esc(p[1]) : '') + '">' + tete()
      + '<p class="pv-equipe">Résultats du week-end</p><p class="pv-issue">' + WEEKEND.dates + '</p>'
      + '<ul class="pv-liste">' + WEEKEND.lignes.map(function (l) {
        return '<li><span><b>' + esc(l.equipe) + '</b><small>contre ' + esc(l.adv) + '</small></span><strong class="' + (l.bcr > l.ad ? 'v' : 'd') + '">' + l.bcr + '-' + l.ad + '</strong></li>';
      }).join('') + '</ul>' + emplacement(r) + '</div></div>';
  }

  /* ---------- Cartes : attente, puis résultat ---------- */
  function entete(titreId, type, titre, pastille) {
    return '<header class="sf-tete"><div><p class="pub-type">' + esc(type) + '</p><h3 id="' + titreId + '">' + esc(titre) + '</h3></div>' + pastille + '</header>';
  }
  function attenteMatch(m) {
    var f = idSur(m.id), pas = m.reel === null;
    return entete('sf-' + f + '-t', m.lib + ' · ' + m.equipe + ' (' + m.code + ')', m.adv + ', ' + m.quand.toLowerCase() + ', ' + m.lieu, '<span class="etat pastille attente">En attente du résultat officiel</span>')
      + '<div class="sf-attente">'
      + (pas
        ? '<details class="sf-reglage" open><summary>Régler le score de démonstration</summary>'
          + '<p class="aide" id="sf-' + f + '-aide">À remplir avant de cliquer : le score réel du match, à montrer au bureau. Seul le bouton de démonstration est ici ; en vrai, personne ne le tape.</p>'
          + '<div class="score-champs"><div><label for="sf-b-' + f + '">BCR</label><input id="sf-b-' + f + '" type="text" inputmode="numeric" autocomplete="off" maxlength="3" data-sc="b" aria-describedby="sf-' + f + '-aide sf-e-' + f + '"></div>'
          + '<span class="score-tiret" aria-hidden="true">-</span>'
          + '<div><label for="sf-a-' + f + '">' + esc(m.adv) + '</label><input id="sf-a-' + f + '" type="text" inputmode="numeric" autocomplete="off" maxlength="3" data-sc="a" aria-describedby="sf-' + f + '-aide sf-e-' + f + '"></div></div></details>'
        : '<p class="aide">Ce match est déjà joué : le résultat officiel de la fédération (relevé du 30 octobre) est connu, rien à régler. <span class="etiquette-ex">résultat réel</span></p>')
      + '<p class="erreur" id="sf-e-' + f + '" role="alert"></p>'
      + '<div class="actions"><button type="button" class="bouton" data-arrivee="' + esc(m.id) + '">Montrer l\'arrivée du score officiel</button> <span class="etiquette-ex">démonstration</span></div></div>';
  }
  function attenteWeekend() {
    return entete('sf-we-t', 'Chaque dimanche soir', 'Résultats du week-end des ' + WEEKEND.dates, '<span class="etat pastille attente">Dimanche soir, en attente</span>')
      + '<div class="sf-attente"><p class="aide">Exemple avec trois résultats réels déjà joués (relevé FFBB du 30 octobre) ; chaque dimanche, toutes les équipes dont le résultat est connu y seraient. <span class="etiquette-ex">démonstration</span></p>'
      + '<div class="actions"><button type="button" class="bouton" data-arrivee="we">Montrer le dimanche soir</button></div></div>';
  }

  function apercuSite(m, r) {
    var date = m.court.replace(/^[a-zé]+ /, '');
    return '<div class="sf-site"><p class="sf-site-t">Sur le site, tout de suite <span class="etiquette-ex">aperçu</span></p>'
      + '<dl><div><dt>Page de l\'équipe</dt><dd>' + esc(m.equipe) + ' (' + esc(m.code) + ') · dernier résultat, ' + esc(m.court) + ' : <strong>BCR ' + r.bcr + ' - ' + r.ad + '</strong> contre ' + esc(m.adv) + (m.page ? ' · <a href="' + m.page + '">Voir la page de l\'équipe</a>' : '') + '</dd></div>'
      + '<div><dt>Accueil, résultats récents</dt><dd>' + esc(m.equipe) + ' · ' + esc(m.code) + ' · ' + esc(date) + ' : <strong>' + r.bcr + ' - ' + r.ad + '</strong></dd></div></dl></div>';
  }
  function apercuWeekend() {
    return '<div class="sf-site"><p class="sf-site-t">Sur le site <span class="etiquette-ex">aperçu</span></p><dl><div><dt>Page de chaque équipe</dt><dd>Chaque résultat est déjà sur la page de son équipe ; le visuel les réunit pour les réseaux.</dd></div></dl></div>';
  }
  function etapes(libs, publie) {
    return '<ol class="sf-etapes">' + libs.map(function (l) { return '<li><span class="etat pastille ok">Fait</span> ' + esc(l) + '</li>'; }).join('')
      + '<li>' + (publie ? '<span class="etat pastille ok">Fait</span> Publié sur Facebook (simulation)' : '<span class="etat pastille attente">Votre geste</span> Un dirigeant relit et publie') + '</li></ol>';
  }
  function partenaireInfo(r) {
    var p = r.part >= 0 ? PART[r.part] : null;
    if (!p) return '<p class="aide">Aucun partenaire à afficher : l\'emplacement reste vide.</p>';
    var n = apparitions(r.part);
    return '<p class="aide sf-part">Logo à l\'écran : <strong>' + esc(p[1]) + '</strong>, partenaire du club (calendrier 2026), à son tour dans la rotation. '
      + 'Apparitions de ce partenaire sur les visuels publiés de cette démonstration : <strong>' + n + '</strong>' + (r.publie ? '' : ' ; une de plus une fois ce visuel publié') + '.</p>';
  }
  function resultat(id) {
    var r = recs[id], f = idSur(id);
    if (id === 'we') {
      return entete('sf-we-t', 'Chaque dimanche soir', 'Résultats du week-end des ' + WEEKEND.dates, '<span class="etat pastille ok">Préparé tout seul</span>')
        + '<div class="sf-resultat">' + etapes(['Résultats du week-end rassemblés', 'Visuel et texte préparés'], r.publie)
        + '<div class="pub">' + visuelWeekend(r) + '<div class="pub-corps">' + apercuWeekend()
        + corpsPublication(id, f, r, '', 'Exemple avec trois résultats réels déjà joués (relevé FFBB du 30 octobre).') + '</div></div></div>';
    }
    var m = MATCHS.filter(function (x) { return x.id === id; })[0];
    var secours = r.source === 'saisi';
    return entete('sf-' + f + '-t', m.lib + ' · ' + m.equipe + ' (' + m.code + ')', m.adv + ', ' + m.quand.toLowerCase() + ', ' + m.lieu, '<span class="etat pastille ok">' + (secours ? 'Score tapé par un bénévole' : 'Préparé tout seul') + '</span>')
      + '<div class="sf-resultat">' + etapes([secours ? 'Score tapé par un bénévole (solution de secours)' : 'Résultat officiel reçu : BCR ' + r.bcr + ' - ' + r.ad, 'Score sur le site', 'Visuel et deux phrases préparés'], r.publie)
      + (r.bcr === r.ad ? '<p class="avertissement" role="status">Les deux scores sont égaux : au basket, c\'est rare. Vérifiez avec la feuille de marque avant de publier.</p>' : '')
      + '<div class="pub">' + visuelMatch(m, r) + '<div class="pub-corps">' + apercuSite(m, r)
      + corpsPublication(id, f, r, ecartJeunes(m, r) ? '<label class="choix"><input type="checkbox" data-montrer-score' + (r.masque ? '' : ' checked') + (r.publie ? ' disabled' : '') + '> Montrer le score sur le visuel</label><p class="aide">Écart important chez les jeunes : par prudence, le score n\'est pas mis en avant sur le visuel ni dans le texte ; vous pouvez le montrer.</p>' : '', '') + '</div></div></div>';
  }
  function corpsPublication(id, f, r, extra, note) {
    return '<label for="sf-txt-' + f + '">Texte prêt (modifiable)</label>'
      + '<textarea id="sf-txt-' + f + '" rows="' + (id === 'we' ? 9 : 4) + '" data-texte' + (r.publie ? ' readonly' : '') + '>' + esc(r.texte) + '</textarea>'
      + extra + partenaireInfo(r) + (note ? '<p class="aide">' + esc(note) + '</p>' : '')
      + '<div class="pub-boutons"><button type="button" class="bouton" data-publier="' + esc(id) + '"' + (r.publie ? ' disabled' : '') + '>' + (r.publie ? 'Publié (simulation)' : 'Publier sur Facebook') + '</button>'
      + '<button type="button" class="bouton ligne petit" data-rejouer="' + esc(id) + '">Rejouer la démonstration</button></div>'
      + '<p class="aide">Un dirigeant relit et publie : rien ne part sans ce geste, et c\'est ce que nous conseillons pour les réseaux. Le bureau peut aussi choisir de publier sans validation les seuls visuels de score, qui ne portent aucun nom ni aucune photo.</p>'
      + '<p class="pub-etat" role="status" aria-live="polite">' + (r.publie ? 'Simulation : publication faite. Rien n\'a été envoyé : sur le vrai site, elle partirait sur la page Facebook du club.' : '') + '</p>';
  }

  function carte(id) {
    var attend = !recs[id];
    if (id === 'we') return attend ? attenteWeekend() : resultat('we');
    var m = MATCHS.filter(function (x) { return x.id === id; })[0];
    return attend ? attenteMatch(m) : resultat(id);
  }
  function emplacementCarte(id) { return document.getElementById('sf-carte-' + idSur(id)); }
  function dessiner(id, focus) {
    var el = emplacementCarte(id); if (!el) return;
    el.innerHTML = carte(id);
    if (focus) { var t = el.querySelector('h3'); if (t) { t.setAttribute('tabindex', '-1'); t.focus(); } }
  }

  /* ---------- Contrôle des deux nombres ---------- */
  function nombre(v) { v = String(v).trim(); return /^\d{1,3}$/.test(v) && +v <= 200 ? +v : null; }

  /* ---------- Arrivée du résultat ---------- */
  function arriver(id, bcr, ad, source) {
    if (enCours[id]) return;
    enCours[id] = true;
    var el = emplacementCarte(id), btn = el.querySelector('[data-arrivee]');
    if (btn) { btn.disabled = true; btn.textContent = 'Réception du résultat officiel…'; }
    annoncer('Réception du résultat officiel en cours.');
    setTimeout(function () {
      var r;
      if (id === 'we') { r = { part: prochainPartenaire(), publie: false }; r.texte = texteWeekend(r); }
      else {
        var m = MATCHS.filter(function (x) { return x.id === id; })[0];
        r = { bcr: bcr, ad: ad, source: source || 'officiel', part: prochainPartenaire(), publie: false };
        r.masque = ecartJeunes(m, r); r.texte = textePhrases(m, r);
      }
      recs[id] = r; sauver(); enCours[id] = false;
      dessiner(id, true);
      annoncer(id === 'we' ? 'Le visuel des résultats du week-end est prêt, avec son texte. Il ne reste qu\'à le publier.'
        : (source === 'saisi' ? 'Score enregistré' : 'Résultat officiel reçu') + ' : BCR ' + bcr + ' - ' + ad + '. Le site est à jour, le visuel et les deux phrases sont prêts. Il ne reste qu\'à publier.');
    }, 700);
  }

  racine.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-arrivee')) {
      var id = b.getAttribute('data-arrivee'), art = emplacementCarte(id);
      if (id === 'we') { arriver('we'); return; }
      var m = MATCHS.filter(function (x) { return x.id === id; })[0], bcr, ad;
      if (m.reel) { bcr = m.reel[0]; ad = m.reel[1]; }
      else {
        var cb = art.querySelector('[data-sc="b"]'), ca = art.querySelector('[data-sc="a"]'), err = art.querySelector('.erreur');
        [cb, ca].forEach(function (c) { c.removeAttribute('aria-invalid'); });
        bcr = nombre(cb.value); ad = nombre(ca.value);
        var faux = [bcr === null ? cb : null, ad === null ? ca : null].filter(Boolean);
        if (faux.length) {
          faux.forEach(function (c) { c.setAttribute('aria-invalid', 'true'); });
          err.textContent = faux.length === 2 && !cb.value.trim() && !ca.value.trim()
            ? 'Réglez d\'abord le score de démonstration : tapez les deux nombres, puis cliquez.'
            : 'Le score doit être fait de deux nombres entiers, de 0 à 200.';
          faux[0].focus(); return;
        }
        err.textContent = '';
      }
      arriver(id, bcr, ad);
    }
    if (b.hasAttribute('data-publier')) {
      var pid = b.getAttribute('data-publier'), r = recs[pid]; if (!r || r.publie) return;
      r.publie = true;
      if (r.part >= 0) rot.app[r.part] = apparitions(r.part) + 1;
      sauver(); dessiner(pid, false);
      var st = emplacementCarte(pid).querySelector('.pub-etat'); if (st) { st.setAttribute('tabindex', '-1'); st.focus(); }
      annoncer('Simulation : publication faite. Rien n\'a été envoyé.');
    }
    if (b.hasAttribute('data-rejouer')) {
      var rid = b.getAttribute('data-rejouer'), ancien = recs[rid];
      if (ancien && ancien.publie && ancien.part >= 0 && rot.app[ancien.part]) rot.app[ancien.part] -= 1;
      delete recs[rid]; sauver(); dessiner(rid, false);
      var bt = emplacementCarte(rid).querySelector('[data-arrivee]'); if (bt) bt.focus();
      annoncer('Démonstration remise en attente.');
    }
  });
  racine.addEventListener('change', function (e) {
    var c = e.target.closest('[data-montrer-score]'); if (!c) return;
    var art = c.closest('[data-carte]'), id = art.getAttribute('data-carte'), r = recs[id], m = MATCHS.filter(function (x) { return x.id === id; })[0];
    r.masque = !c.checked; sauver();
    var cadre = art.querySelector('[data-visuel]'); cadre.outerHTML = visuelMatch(m, r);
    annoncer(r.masque ? 'Le score n\'apparaît plus sur le visuel.' : 'Le score apparaît sur le visuel.');
  });
  racine.addEventListener('input', function (e) {
    var t = e.target.closest('[data-texte]'); if (!t) return;
    var id = t.closest('[data-carte]').getAttribute('data-carte'); if (recs[id]) { recs[id].texte = t.value; sauver(); }
  });

  /* ---------- Solution de secours : un bénévole tape le score (même circuit ensuite) ---------- */
  var sec = document.getElementById('sf-secours-form');
  if (sec) sec.addEventListener('submit', function (e) {
    e.preventDefault();
    var cb = sec.querySelector('[data-sc="b"]'), ca = sec.querySelector('[data-sc="a"]'), err = sec.querySelector('.erreur');
    [cb, ca].forEach(function (c) { c.removeAttribute('aria-invalid'); });
    var b = nombre(cb.value), a = nombre(ca.value), faux = [b === null ? cb : null, a === null ? ca : null].filter(Boolean);
    if (faux.length) { faux.forEach(function (c) { c.setAttribute('aria-invalid', 'true'); }); err.textContent = 'Saisissez deux nombres entiers, de 0 à 200.'; faux[0].focus(); return; }
    err.textContent = '';
    cb.value = ''; ca.value = '';
    arriver(MATCHS[0].id, b, a, 'saisi');
    emplacementCarte(MATCHS[0].id).scrollIntoView({ block: 'start' });
  });

  /* ---------- Mise en place (relit l'onglet : un rechargement garde les scores arrivés) ---------- */
  var ordre = MATCHS.map(function (m) { return m.id; }).concat(['we']);
  zone.innerHTML = ordre.map(function (id) {
    return '<article class="sf-match" id="sf-carte-' + idSur(id) + '" data-carte="' + esc(id) + '"></article>';
  }).join('');
  ordre.forEach(function (id) { dessiner(id, false); });

  if (/[?&]demo=score/.test(location.search)) {
    setTimeout(function () { racine.scrollIntoView({ block: 'start' }); }, 120);
  }
})();
