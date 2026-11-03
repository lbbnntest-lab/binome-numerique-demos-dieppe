/* Espace dirigeants, bloc « Un article Merci à notre partenaire » (démonstration). Lié uniquement depuis dirigeants.html.
   - Le club choisit un rythme (chaque semaine, toutes les deux semaines, chaque mois), gardé dans l'onglet (sessionStorage, clé « bcr-merci »).
   - Un article de remerciement est préparé pour le partenaire suivant, pris à tour de rôle dans les 31 partenaires du calendrier 2026 du club
     (même liste que partenaires.html ; la commune en dernier). Texte : le nom, le métier, la commune quand ils sont connus, et le fait que le partenaire
     soutient le club. Rien d'autre (ni horaires, ni note, ni adresse, ni citation).
   - Un dirigeant relit (case à cocher), corrige si besoin, puis publie : l'article paraît sur la page Vie du club et en dernier article de
     l'accueil, par le même mécanisme que js/articles.js (clé « bcr-articles »). Il peut aussi l'exporter pour Facebook (js/export-facebook.js).
   - Dates : heure locale (jamais new Date('AAAA-MM-JJ')). Paramètre facultatif ?aujourdhui=AAAA-MM-JJ pour essayer une autre date.
   - La date du prochain article part du dernier article publié (rythme choisi) ; sans article publié, le premier est pour aujourd'hui.
     Après une publication, la date suivante est toujours postérieure à la date de publication. Rien n'est envoyé. */
(function () {
  'use strict';
  var zone = document.getElementById('mp-zone');
  if (!zone) return;

  /* Les 31 partenaires du calendrier 2026 : [fichier du logo, nom, métier, commune, pluriel]. Métier et commune seulement quand le site les donne. */
  var P = [
    ['commune-rouxmesnil', 'Commune de Rouxmesnil-Bouteilles', null, 'Rouxmesnil-Bouteilles', false, true],
    ['mekabulle', 'Mekabulle', 'graphiste illustratrice', null],
    ['chaumont', 'Michael Chaumont', 'boucherie, charcuterie et traiteur', 'Neuville-lès-Dieppe'],
    ['demare', 'SAS Demare Luc', 'charpente et menuiserie', 'Avremesnil'],
    ['proxi', 'Proxi Super', 'supérette', null],
    ['salon-m', 'Le salon M', 'coiffure mixte', 'Envermeu'],
    ['stadium', 'Sport Solidaire Stadium', null, null],
    ['abrafer', 'Abrafer', 'fer et métaux', null],
    ['diamant', 'SAS Diamant Fermetures', 'fermetures', null],
    ['auchan', 'Auchan Dieppe', 'hypermarché', 'Dieppe'],
    ['ligny-gaspary', 'Ligny-Gaspary Immobilier', 'immobilier', null],
    ['dequesne', 'SAS Dequesne', 'paysagiste et élagueur', null],
    ['trianon', 'Le Trianon', 'bar', null],
    ['atelier', 'L\'atelier', 'coiffure mixte', 'Rouxmesnil-Bouteilles'],
    ['bigmat', 'BigMat Roger', 'matériaux de construction', null],
    ['wlc', 'WLC Automobiles', 'garage automobile', 'Martin-Église'],
    ['art-mony', 'Art Mony Pub', 'agence de publicité', null],
    ['ongles', 'Les Ongles en Gel in A.', 'onglerie', null],
    ['hysope', 'Hysope Fleurs', 'fleuriste', 'Arques-la-Bataille'],
    ['leader', 'Leader actual emploi', 'agence d\'emploi', null],
    ['bayeux', 'EURL Bayeux Maçonnerie', 'rénovation et carrelage', null],
    ['boulangerie-prieure', 'Boulangerie du Prieuré', 'boulangerie', 'Rouxmesnil-Bouteilles'],
    ['etria', 'Etria', null, null],
    ['eph', 'EPH publicité', 'publicité', null],
    ['bistrot-barrieres', 'Bistrot des Barrières', 'bistrot', 'Dieppe'],
    ['franck-provost', 'Franck Provost', 'coiffure', 'Dieppe'],
    ['brico-depot', 'Brico Dépôt', 'bricolage', 'Dieppe'],
    ['samp', 'SAMP Services', 'mécanique de précision', null],
    ['carbon', 'Carbon Decor · Carbon Meta', null, null, true],
    ['regates', 'Les Régates', 'restaurant et bar', 'Pourville'],
    ['feron', 'Boucherie charcuterie Feron', 'boucherie et charcuterie', 'Dieppe (Janval)']
  ].map(function (x) { return { slug: x[0], nom: x[1], metier: x[2], ville: x[3], pluriel: !!x[4] || /^Les /.test(x[1]), commune: !!x[5] }; });
  /* Le métier n'est écrit que s'il apprend quelque chose : « Boulangerie du Prieuré, boulangerie » ou « EPH publicité, publicité » seraient redondants. */
  function mots(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(function (m) { return m.length >= 5; }); }
  P.forEach(function (p) {
    var dans = mots(p.nom);
    if (p.metier && mots(p.metier).some(function (m) { return dans.indexOf(m) >= 0; })) p.metier = null;
  });
  P.push(P.shift());   /* la commune (argent public) passe en dernier : la démonstration de l'article commence par un partenaire privé */
  var N = P.length;

  var RYTHMES = {
    semaine: { lib: 'Chaque semaine', jours: 7, cadence: '31 semaines, soit environ 7 mois' },
    quinzaine: { lib: 'Toutes les deux semaines', jours: 14, cadence: '62 semaines, soit environ 14 mois' },
    mois: { lib: 'Chaque mois', mois: 1, cadence: '31 mois' }
  };

  /* ---------- Petits outils ---------- */
  function lire(c, d) { try { var v = sessionStorage.getItem(c); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrire(c, v) { try { sessionStorage.setItem(c, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function maj1(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function jour(s) { var a = s.slice(0, 10).split('-'); return new Date(+a[0], +a[1] - 1, +a[2], 12); }
  function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function plusJ(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); }
  /* Même quantième dans k mois (ramené à la fin du mois si le mois est plus court). */
  function plusMois(d, k) {
    var m = d.getMonth() + k, a = d.getFullYear() + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
    var dernier = new Date(a, mm + 1, 0, 12).getDate();
    return new Date(a, mm, Math.min(d.getDate(), dernier), 12);
  }
  function dateLongue(s) { var d = jour(s); return JOURS[d.getDay()] + ' ' + (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + MOIS[d.getMonth()]; }
  var testee = false, AUJ;
  (function () {
    var m = /[?&]aujourdhui=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    if (m && iso(jour(m[1])) === m[1]) { AUJ = m[1]; testee = true; } else AUJ = iso(new Date());
  })();

  /* ---------- Mémoire de l'onglet ---------- */
  var st = lire('bcr-merci', null);
  if (!st || !RYTHMES[st.rythme]) st = { rythme: 'semaine', rang: 0, derniere: '', edit: null, dernier: null };
  if (typeof st.rang !== 'number' || st.rang < 0) st.rang = 0;
  function sauver() { ecrire('bcr-merci', st); }

  /* ---------- Calendrier ---------- */
  function avancer(dateIso, k) {
    var r = RYTHMES[st.rythme], d = jour(dateIso);
    return iso(r.mois ? plusMois(d, r.mois * k) : plusJ(d, r.jours * k));
  }
  /* Dates des trois prochains articles : la première est la date prévue (ou aujourd'hui si elle est passée ou s'il n'y a pas eu d'article). */
  function dates() {
    var base = AUJ;
    if (st.derniere) { var prevue = avancer(st.derniere, 1); base = prevue > AUJ ? prevue : AUJ; }
    return [base, avancer(base, 1), avancer(base, 2)];
  }
  function ecartJours(a, b) { return Math.round((jour(b).getTime() - jour(a).getTime()) / 86400000); }
  function partenaire(k) { return P[(st.rang + k) % N]; }

  /* ---------- Texte de l'article : uniquement des faits connus ---------- */
  function aLe(p) {
    var n = p.nom;
    if (p.commune) return 'à la commune de ' + n.slice(11);
    if (/^Les /.test(n)) return 'aux ' + n.slice(4);
    if (/^Le /.test(n)) return 'au ' + n.slice(3);
    if (/^L'/.test(n)) return 'à l\'' + n.slice(2);
    return 'à ' + n;
  }
  function finir(t) { return /[.!?]$/.test(t) ? t : t + '.'; }
  function detailTexte(p) {
    if (p.commune) return '';
    if (p.metier && p.ville) return ', ' + p.metier + ' à ' + p.ville + ',';
    if (p.metier) return ', ' + p.metier + ',';
    if (p.ville) return ', à ' + p.ville + ',';
    return '';
  }
  function detailImage(p) {
    if (p.commune) return 'Commune · ' + p.ville;
    return [p.metier ? maj1(p.metier) : '', p.ville || ''].filter(Boolean).join(' · ');
  }
  function sujet(p) { return p.commune ? 'La commune de ' + p.nom.slice(11) : p.nom; }
  function soutient(p) { return p.pluriel ? 'soutiennent' : 'soutient'; }
  function sonSoutien(p) { return p.pluriel ? 'leur soutien' : 'son soutien'; }
  function article(p, rang) {
    var titre = 'Merci ' + aLe(p), v = rang % 3, sou = sujet(p) + detailTexte(p) + ' ' + soutient(p) + ' le club.', fin;
    var equipes = 'faire jouer toutes ses équipes, des plus jeunes aux seniors';
    var corps;
    if (v === 0) {
      corps = ['Aujourd\'hui, le Basket Club de Rouxmesnil dit merci ' + aLe(p) + '.', sou,
        'Grâce à ses partenaires, le club peut ' + equipes + '. Merci ' + aLe(p) + ' pour ' + sonSoutien(p) + '.'];
    } else if (v === 1) {
      corps = [sou.replace(/ le club\.$/, ' le Basket Club de Rouxmesnil.'),
        'Le soutien de ses partenaires aide le club à ' + equipes + '.', 'Merci ' + aLe(p) + ' pour ' + sonSoutien(p) + ' !'];
    } else {
      corps = ['Cette fois, c\'est ' + aLe(p) + ' que va notre merci.', sou,
        'Le club peut ' + equipes + ', grâce au soutien de ses partenaires.'];
    }
    fin = v === 2 ? 'Tous nos partenaires sont à retrouver sur la page Partenaires du site.' : 'Retrouvez tous nos partenaires sur la page Partenaires du site.';
    corps.push(fin);
    return { titre: titre, corps: corps.map(finir).join('\n\n').replace(/\.\./g, '.') };
  }

  /* ---------- Mise en page, une seule fois ---------- */
  zone.innerHTML =
    '<div class="mp-rythme" role="group" aria-labelledby="mp-rythme-t"><p class="mp-lib" id="mp-rythme-t">Rythme des articles</p>'
    + '<div class="filtres" id="mp-rythmes">' + Object.keys(RYTHMES).map(function (k) { return '<button type="button" data-rythme="' + k + '" aria-pressed="false">' + RYTHMES[k].lib + '</button>'; }).join('') + '</div>'
    + '<p class="aide" id="mp-cadence"></p>'
    + '<p class="aide mp-option">Option « partenaire numérique » : l’article est préparé pour chaque partenaire qui la prend. Pour la démonstration, les 31 partenaires du calendrier passent à tour de rôle.</p></div>'
    + '<div class="mp-courant">'
    + '<h3 id="mp-statut-t">Article à relire</h3><p class="mp-statut" id="mp-statut"></p>'
    + '<div class="pub mp-pub"><div class="pub-cadre mp-cadre"><div class="mp-apercu" id="mp-apercu" role="img" aria-label="Image pour Facebook"></div>'
    + '<p class="aide">Image pour Facebook, carrée, telle qu’elle sera téléchargée.</p></div>'
    + '<div class="pub-corps"><p class="mp-qui" id="mp-qui"></p>'
    + '<label for="mp-titre">Titre</label><input type="text" id="mp-titre" maxlength="100" autocomplete="off">'
    + '<label for="mp-corps">Texte (modifiable)</label><textarea id="mp-corps" rows="9" maxlength="2000"></textarea>'
    + '<label class="case"><input type="checkbox" id="mp-relu"> J’ai relu l’article : le nom, le métier et la commune sont justes.</label>'
    + '<div class="pub-boutons"><button type="button" class="bouton" id="mp-publier" disabled>Publier sur le site</button>'
    + '<button type="button" class="bouton ligne petit" id="mp-suivant">Passer au partenaire suivant</button>'
    + '<button type="button" class="bouton ligne petit" id="mp-reinit" hidden>Revenir au texte préparé</button></div>'
    + '<div id="mp-export"></div>'
    + '<div class="resultat" id="mp-etat" role="status" aria-live="polite" hidden></div></div></div></div>'
    + '<h3 id="mp-prochains-t">Les trois prochains articles</h3><ol class="mp-prochains" id="mp-prochains" aria-labelledby="mp-prochains-t"></ol>';

  function $(id) { return document.getElementById(id); }
  var titreC = $('mp-titre'), corpsC = $('mp-corps'), relu = $('mp-relu'), btnPub = $('mp-publier'), btnReinit = $('mp-reinit'), etat = $('mp-etat');

  function majBouton() { btnPub.disabled = !(relu.checked && titreC.value.trim() && corpsC.value.trim()); }
  function dire(html, focus) {
    etat.hidden = false; etat.textContent = '';
    setTimeout(function () { etat.innerHTML = html; }, 50);
    if (focus) { etat.setAttribute('tabindex', '-1'); etat.focus(); }
  }
  var jeton = 0;
  function apercu(p) {
    var mon = ++jeton, c = $('mp-apercu');
    c.setAttribute('aria-label', 'Image pour Facebook : merci à ' + p.nom + (detailImage(p) ? ', ' + detailImage(p) : ''));
    if (!window.BCRExport) { c.textContent = ''; return; }
    window.BCRExport.dessiner(specImage(p)).then(function (cv) {
      if (mon !== jeton) return;
      cv.setAttribute('aria-hidden', 'true'); c.textContent = ''; c.appendChild(cv);
    });
  }
  function specImage(p) {
    return { type: 'partenaire', accroche: 'Merci à notre partenaire', nom: p.nom, detail: detailImage(p), cartouche: 'img/partenaires/' + p.slug + '.jpg', pied: 'Partenaire du Basket Club de Rouxmesnil' };
  }

  /* Remplit la zone pour le partenaire du rang courant ; le texte corrigé par le dirigeant est gardé tant qu'on reste sur ce partenaire. */
  function remplir(garderEtat) {
    var p = partenaire(0), d = dates(), a = article(p, st.rang), edit = st.edit && st.edit.rang === st.rang ? st.edit : null;
    titreC.value = edit ? edit.titre : a.titre; corpsC.value = edit ? edit.corps : a.corps; relu.checked = false;
    btnReinit.hidden = !edit; majBouton();
    $('mp-qui').innerHTML = 'Partenaire ' + ((st.rang % N) + 1) + ' sur ' + N + ' : <strong>' + esc(p.nom) + '</strong>' + (detailImage(p) ? ' · ' + esc(detailImage(p)) : '');
    $('mp-statut').textContent = d[0] === AUJ ? 'À publier aujourd’hui, ' + dateLongue(AUJ) + '.'
      : 'Prochain article prévu le ' + dateLongue(d[0]) + ' (dans ' + ecartJours(AUJ, d[0]) + ' jours). Vous pouvez aussi le publier dès maintenant.';
    $('mp-export').innerHTML = window.BCRExport ? window.BCRExport.boutons('merci', 'courant') : '';
    apercu(p);
    if (!garderEtat) { etat.hidden = true; etat.textContent = ''; }
    majListe();
  }
  function majListe() {
    var d = dates();
    Array.prototype.forEach.call($('mp-rythmes').querySelectorAll('[data-rythme]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-rythme') === st.rythme)); });
    $('mp-cadence').textContent = 'À ce rythme, dans la démonstration, les ' + N + ' partenaires ont chacun leur article en ' + RYTHMES[st.rythme].cadence + '.';
    $('mp-prochains').innerHTML = [0, 1, 2].map(function (k) {
      var p = partenaire(k);
      return '<li><span class="mp-date">' + esc(maj1(dateLongue(d[k]))) + '</span><span class="mp-logo"><img src="img/partenaires/' + p.slug + '.jpg" alt="" width="64" height="40" loading="lazy"></span>'
        + '<span class="mp-nom"><strong>' + esc(p.nom) + '</strong>' + (detailImage(p) ? '<small>' + esc(detailImage(p)) + '</small>' : '') + '</span>'
        + (k === 0 ? '<span class="etat pastille attente">À relire ci-dessus</span>' : '<span class="etat pastille">Préparé le jour venu</span>') + '</li>';
    }).join('');
  }

  /* ---------- Gestes ---------- */
  $('mp-rythmes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rythme]'); if (!b) return;
    st.rythme = b.getAttribute('data-rythme'); sauver(); majListe();
    var d = dates();
    $('mp-statut').textContent = d[0] === AUJ ? 'À publier aujourd’hui, ' + dateLongue(AUJ) + '.'
      : 'Prochain article prévu le ' + dateLongue(d[0]) + ' (dans ' + ecartJours(AUJ, d[0]) + ' jours). Vous pouvez aussi le publier dès maintenant.';
  });
  function noterEdition() { st.edit = { rang: st.rang, titre: titreC.value, corps: corpsC.value }; sauver(); btnReinit.hidden = false; relu.checked = false; majBouton(); }
  titreC.addEventListener('input', noterEdition); corpsC.addEventListener('input', noterEdition);
  relu.addEventListener('change', majBouton);
  btnReinit.addEventListener('click', function () { st.edit = null; sauver(); remplir(false); titreC.focus(); });
  $('mp-suivant').addEventListener('click', function () {
    st.rang += 1; st.edit = null; sauver(); remplir(false);
    dire('Partenaire suivant : ' + esc(partenaire(0).nom) + '.', false);
  });
  btnPub.addEventListener('click', function () {
    if (btnPub.disabled) return;
    var p = partenaire(0), titre = titreC.value.trim(), corps = corpsC.value.trim();
    if (!titre || !corps || !relu.checked) { majBouton(); return; }
    btnPub.disabled = true;
    var id = 'merci-' + p.slug + '-' + AUJ + '-' + Math.floor(st.rang / N);
    var l = lire('bcr-articles', []); if (!Array.isArray(l)) l = [];
    if (l.some(function (x) { return x.id === id; })) { dire('Cet article est déjà publié sur le site (simulation).', true); return; }
    l.push({ id: id, titre: titre, corps: corps, photo: '', logo: 'img/partenaires/' + p.slug + '.jpg', logoAlt: 'Logo de ' + p.nom, date: AUJ });
    if (!ecrire('bcr-articles', l)) {
      btnPub.disabled = false;
      dire('L’article n’a pas pu être gardé par cet appareil (la démonstration en a besoin). Rien n’est publié ; essayez dans un onglet normal.', true); return;
    }
    st.dernier = { slug: p.slug, nom: p.nom, detail: detailImage(p), titre: titre, corps: corps, id: id };
    st.derniere = AUJ; st.rang += 1; st.edit = null; sauver();
    remplir(true);
    dire('Simulation : l’article « ' + esc(titre) + ' » est publié sur le site. Rien n’est envoyé. '
      + '<a href="vie-du-club.html#art-' + esc(id) + '">Voir la page Vie du club</a> · <a href="index.html#titre-vie">Voir l’accueil</a>. '
      + 'Prochain article : ' + esc(dateLongue(dates()[0])) + ', ' + esc(partenaire(0).nom) + '.'
      + (window.BCRExport ? '<span class="mp-apres">Pour cet article : ' + window.BCRExport.boutons('merci', 'publie') + '</span>' : ''), true);
  });

  /* ---------- Export pour Facebook ---------- */
  if (window.BCRExport) {
    window.BCRExport.enregistrer('merci', function (id) {
      if (id === 'publie') {
        var d = st.dernier; if (!d) return null;
        var pp = P.filter(function (x) { return x.slug === d.slug; })[0];
        return { spec: specImage(pp), fichier: 'bcr-merci-' + d.slug + '-' + AUJ, texte: d.titre + '\n\n' + d.corps };
      }
      var p = partenaire(0);
      return { spec: specImage(p), fichier: 'bcr-merci-' + p.slug + '-' + AUJ, texte: titreC.value.trim() + '\n\n' + corpsC.value.trim() };
    });
  }

  remplir(false);
  /* Les polices se chargent après le premier dessin : l'aperçu est redessiné une fois qu'elles sont là. */
  if (window.BCRExport && document.fonts && document.fonts.ready) document.fonts.ready.then(function () { apercu(partenaire(0)); });
  if (/[?&]demo=merci/.test(location.search)) setTimeout(function () { var s = document.getElementById('merci-partenaires'); if (s) s.scrollIntoView({ block: 'start' }); }, 120);
})();
