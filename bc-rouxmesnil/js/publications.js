/* Publications des matchs (rôle Communication et bénévoles, et Président). Lié uniquement depuis dirigeants.html.
   - « Fin de match » : une publication par score saisi par le coach pendant la visite (sessionStorage « bcr-scores »).
   - « Publications du week-end » : un récapitulatif et une publication par match, pour un week-end dont tous les
     scores sont connus (3-4 octobre : affiches du club et FFBB, voir faits_verifies_bcr.md).
   Les textes ne reprennent que l'équipe, le niveau, l'adversaire, le lieu quand il est connu, la date et le score.
   Rien n'est publié ni envoyé : Valider et Publier sont simulés, Publier reste inactif tant que le texte n'est pas validé. */
(function () {
  'use strict';
  /* Libellés d'un changement signalé par le coach (report, annulation...), construits uniquement à partir de la saisie. */
  function heureFr(h) { return h ? h.replace(/^0/, '').replace(':00', ' h').replace(':', ' h ') : ''; }
  function dateFrCourte(iso) { var d = new Date(iso + 'T12:00'); if (isNaN(d)) return ''; return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }
  var ETIQ = { reporte: 'Reporté', annule: 'Annulé', horaire: 'Horaire modifié', salle: 'Salle modifiée', forfait: 'Forfait', autre: 'Changement' };
  function libelle(c) {
    if (c.statut === 'reporte') return 'Reporté ' + (c.nouvelleDate ? 'au ' + dateFrCourte(c.nouvelleDate) + (c.nouvelleHeure ? ', ' + heureFr(c.nouvelleHeure) : '') : ', date à fixer');
    if (c.statut === 'horaire') return 'Horaire modifié : ' + heureFr(c.nouvelleHeure);
    if (c.statut === 'salle') return 'Salle modifiée : ' + c.salle;
    if (c.statut === 'autre') return 'Changement : ' + c.autre;
    return ETIQ[c.statut] || 'Changement';
  }
  window.BCRPub = { libelle: libelle, etiquette: function (c) { return ETIQ[c.statut] || 'Changement'; } };

  var racine = document.getElementById('publications-matchs');
  if (!racine) return;

  function lire(cle, d) { try { var v = sessionStorage.getItem(cle); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrire(cle, v) { try { sessionStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function idSur(t) { return String(t).replace(/[^a-z0-9]+/gi, '-'); }
  function sigle(nom) {
    var m = nom.split(/[\s-]+/);
    if (/^[A-Z]{2,5}$/.test(m[0])) return m[0];
    return m.filter(function (x) { return /^[A-ZÉ]/.test(x); }).map(function (x) { return x.charAt(0); }).join('').slice(0, 4) || nom.slice(0, 3).toUpperCase();
  }
  function issue(b, a, courte) {
    if (b > a) return 'Victoire';
    if (b === a) return 'Match nul';
    return courte ? 'Courte défaite' : 'Défaite';
  }
  function dateFr(iso) {
    var d = new Date(iso + 'T12:00'); if (isNaN(d)) return '';
    var t = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /* Week-ends proposés. 3-4 octobre : tous les scores sont publiés. 17-18 octobre : scores pas encore saisis. */
  var WEEKENDS = [
    { id: 'we-3-4', titre: 'Week-end des 3 et 4 octobre', matchs: [
      { id: 'w1', equipe: 'U18 féminines', niv: 'Qualification pour la poule élite, 2e tour (poule C)', quand: 'Samedi 3 octobre, 15 h 30', lieu: 'à domicile', adv: 'Aplemont Le Havre Basket', logo: 'aplemont.webp', bcr: 30, ad: 32, courte: true },
      { id: 'w2', equipe: 'U18 féminines', niv: 'Qualification pour la poule élite, 2e tour (poule C)', quand: 'Samedi 3 octobre, 17 h', lieu: 'à domicile', adv: 'Cléon Basketball Academy', logo: 'cleon.webp', bcr: 38, ad: 22 },
      { id: 'w3', equipe: 'U21 masculins', niv: 'Région (RMU21)', quand: 'Week-end des 3 et 4 octobre', lieu: '', adv: 'Oissel Basket Seine', bcr: 71, ad: 70 },
      { id: 'w4', equipe: 'U18 département', niv: 'BCR 2', quand: 'Week-end des 3 et 4 octobre', lieu: 'à l\'extérieur', adv: 'US Forges-les-Eaux', bcr: 52, ad: 22 },
      { id: 'w5', equipe: 'U13 féminines', niv: 'Départementale (DFU13)', quand: 'Week-end des 3 et 4 octobre', lieu: '', adv: 'Seventy Six Belleville', bcr: 47, ad: 19 }
    ] },
    { id: 'we-17-18', titre: 'Week-end des 17 et 18 octobre', matchs: [
      { cle: 'u13|2026-10-17', equipe: 'U13 féminines (DFU13)', adv: 'CEP Saint-Nicolas-d\'Aliermont' },
      { cle: 'u15|2026-10-17', equipe: 'U15 féminines (DFU15)', adv: 'BC Offranville' },
      { equipe: 'U18 féminines (DFU18)', adv: 'CEP Saint-Nicolas-d\'Aliermont' },
      { equipe: 'U21 masculins (RMU21)', adv: 'SPN Vernon' },
      { equipe: 'Seniors féminines (DF2)', adv: 'Rouen Métropole Basket' },
      { equipe: 'Seniors féminines (DF3)', adv: 'Belbeuf' }
    ] }
  ];

  /* ---------- Visuels (cartes HTML aux couleurs du club) ---------- */
  function logoAdv(m) {
    return m.logo ? '<img class="pv-logo clair" src="img/logos/' + m.logo + '" alt="">' : '<span class="pv-sigle" aria-hidden="true">' + esc(sigle(m.adv)) + '</span>';
  }
  function visuelMatch(m) {
    var r = issue(m.bcr, m.ad, m.courte);
    return '<div class="pub-cadre"><div class="pub-visuel" role="img" aria-label="Visuel : ' + esc(m.equipe) + ', ' + r.toLowerCase() + ' ' + m.bcr + ' à ' + m.ad + ' contre ' + esc(m.adv) + '">'
      + '<span class="pv-biais" aria-hidden="true"></span>'
      + '<div class="pv-tete"><img class="pv-logo" src="img/logo-bcr-160.webp" alt=""><span>Basket Club<br>de Rouxmesnil</span></div>'
      + '<p class="pv-equipe">' + esc(m.equipe) + '</p><p class="pv-niv">' + esc(m.niv) + '</p>'
      + '<p class="pv-issue' + (m.bcr > m.ad ? ' v' : '') + '">' + r + '</p>'
      + '<div class="pv-score"><div><img class="pv-logo" src="img/logo-bcr-160.webp" alt=""><span>BCR</span><b>' + m.bcr + '</b></div>'
      + '<div>' + logoAdv(m) + '<span>' + esc(m.adv) + '</span><b>' + m.ad + '</b></div></div>'
      + '<p class="pv-quand">' + esc(m.quand) + (m.lieu ? ' · ' + esc(m.lieu) : '') + '</p>'
      + '<p class="pv-partenaire">Emplacement partenaire</p></div></div>';
  }
  function visuelGeneral(w) {
    return '<div class="pub-cadre"><div class="pub-visuel general" role="img" aria-label="Visuel : résultats du ' + esc(w.titre.toLowerCase()) + '">'
      + '<span class="pv-biais" aria-hidden="true"></span>'
      + '<div class="pv-tete"><img class="pv-logo" src="img/logo-bcr-160.webp" alt=""><span>Basket Club<br>de Rouxmesnil</span></div>'
      + '<p class="pv-equipe">Les résultats</p><p class="pv-issue">' + esc(w.titre) + '</p>'
      + '<ul class="pv-liste">' + w.matchs.map(function (m) {
        return '<li><span><b>' + esc(m.equipe) + '</b><small>contre ' + esc(m.adv) + '</small></span><strong class="' + (m.bcr > m.ad ? 'v' : 'd') + '">' + m.bcr + '-' + m.ad + '</strong></li>';
      }).join('') + '</ul>'
      + '<p class="pv-partenaire">Emplacement partenaire</p></div></div>';
  }

  /* ---------- Textes proposés : uniquement des faits ---------- */
  /* Première ligne : nom de l'équipe et sigle seulement (« U18 féminines (RFU18) ») ; « match amical » pour un amical. */
  function premiereLigne(eq, niv) {
    if (niv === 'Match amical') return eq + ', match amical';
    var s = /\(([A-Z][A-Z0-9]+)\)/.exec(niv || '');
    if (s) return eq + ' (' + s[1] + ')';
    return eq + ', ' + (/^[A-Z]{2}/.test(niv) ? niv : niv.charAt(0).toLowerCase() + niv.slice(1));
  }
  function texteMatch(m) {
    var r = issue(m.bcr, m.ad, m.courte).toLowerCase();
    var phrase = (m.quand + (m.lieu ? ', ' + m.lieu : '') + ' : ' + r + ' ' + m.bcr + '-' + m.ad + ' contre ' + m.adv + '.');
    var fin = m.bcr > m.ad ? 'Bravo à l\'équipe !' : m.bcr === m.ad ? 'Bravo à l\'équipe pour ce match.' : 'On reste derrière l\'équipe pour la suite.';
    return premiereLigne(m.equipe, m.niv) + '\n' + phrase + '\n' + fin + '\n\nBasket Club de Rouxmesnil';
  }
  function texteGeneral(w) {
    var v = w.matchs.filter(function (m) { return m.bcr > m.ad; }).length, d = w.matchs.length - v;
    return w.titre + ' au Basket Club de Rouxmesnil : ' + v + (v > 1 ? ' victoires' : ' victoire') + ' et ' + d + (d > 1 ? ' défaites.' : ' défaite.') + '\n\n'
      + w.matchs.map(function (m) { return m.equipe + ' : ' + issue(m.bcr, m.ad, m.courte).toLowerCase() + ' ' + m.bcr + '-' + m.ad + ' contre ' + m.adv + (m.lieu ? ' (' + m.lieu + ')' : '') + '.'; }).join('\n')
      + '\n\nBravo à toutes et à tous, et merci aux bénévoles et aux partenaires du club.\nPassion, esprit d\'équipe, respect, Rouxmesnil.';
  }

  /* ---------- Carte de publication : texte modifiable, Copier, Valider, Publier ---------- */
  var etats = lire('bcr-pub-etat', {}), textes = {};
  function sauver() { ecrire('bcr-pub-etat', etats); if (window.BCRRole && BCRRole.majPastilles) BCRRole.majPastilles(); }
  function carte(p) {
    var id = idSur(p.id), st = etats[p.id] || {}, t = textes[p.id] !== undefined ? textes[p.id] : p.texte;
    return '<article class="pub" id="pub-' + id + '" data-pub="' + esc(p.id) + '" aria-labelledby="pub-' + id + '-t">'
      + p.visuel
      + '<div class="pub-corps"><p class="pub-type">' + esc(p.type) + '</p><h4 id="pub-' + id + '-t">' + esc(p.titre) + '</h4>'
      + '<label for="pub-' + id + '-txt">Texte proposé (modifiable)</label>'
      + '<textarea id="pub-' + id + '-txt" rows="7" data-texte>' + esc(t) + '</textarea>'
      + '<div class="pub-boutons"><button type="button" class="bouton ligne petit" data-copier>Copier le texte</button>'
      + '<button type="button" class="bouton petit" data-valider' + (st.valide ? ' hidden' : '') + '>Valider</button>'
      + '<button type="button" class="bouton petit" data-publier aria-describedby="pub-' + id + '-aide"' + (st.valide && !st.publie ? '' : ' disabled') + '>Publier sur Facebook et Instagram</button></div>'
      + '<p class="aide" id="pub-' + id + '-aide">' + (st.publie ? 'Publication programmée (simulation).' : st.valide ? 'Validée : la publication est possible.' : 'Publier se débloque après validation.') + '</p>'
      + '<p class="pub-etat" role="status" aria-live="polite"></p></div></article>';
  }
  function annoncer(art, t) { art.querySelector('.pub-etat').textContent = t; }
  function majCarte(art) {
    var id = art.getAttribute('data-pub'), st = etats[id] || {};
    art.querySelector('[data-valider]').hidden = !!st.valide;
    art.querySelector('[data-publier]').disabled = !(st.valide && !st.publie);
    art.querySelector('.aide').textContent = st.publie ? 'Publication programmée (simulation).' : st.valide ? 'Validée : la publication est possible.' : 'Publier se débloque après validation.';
  }
  racine.addEventListener('input', function (e) {
    var ta = e.target.closest('[data-texte]'); if (!ta) return;
    var art = ta.closest('.pub'), id = art.getAttribute('data-pub');
    textes[id] = ta.value;
    if (etats[id] && etats[id].valide && !etats[id].publie) { etats[id].valide = false; sauver(); majCarte(art); annoncer(art, 'Texte modifié : à valider de nouveau avant publication.'); }
  });
  racine.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var art = b.closest('.pub'); if (!art) return;
    var id = art.getAttribute('data-pub'), ta = art.querySelector('[data-texte]');
    if (b.hasAttribute('data-copier')) {
      var repli = function () {
        try { ta.focus(); ta.select(); if (document.execCommand && document.execCommand('copy')) { annoncer(art, 'Texte copié.'); return; } } catch (x) {}
        annoncer(art, 'Le navigateur a refusé la copie : le texte est sélectionné, copiez-le avec Ctrl+C (ou un appui long sur téléphone).');
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(function () { annoncer(art, 'Texte copié dans le presse-papiers.'); }, repli);
        else repli();
      } catch (x) { repli(); }
    }
    if (b.hasAttribute('data-valider')) {
      if (!ta.value.trim()) { annoncer(art, 'Le texte est vide : écrivez-le avant de valider.'); ta.focus(); return; }
      etats[id] = { valide: true }; sauver(); majCarte(art);
      annoncer(art, 'Simulation : publication validée. Vous pouvez maintenant la publier.');
      art.querySelector('[data-publier]').focus();
    }
    if (b.hasAttribute('data-publier')) {
      if (!(etats[id] && etats[id].valide)) return;
      etats[id].publie = true; sauver(); majCarte(art);
      annoncer(art, 'Simulation : publication programmée après validation. Rien n\'est envoyé : sur le vrai site, elle partirait sur la page Facebook et le compte Instagram du club.');
      ta.focus();
    }
  });

  /* ---------- Changements de match signalés par le coach ---------- */
  function texteChangement(c) {
    var match = 'Le match du ' + dateFrCourte(c.date) + ' contre ' + (c.adv || 'l\'adversaire') + (c.amical ? ' (match amical)' : '');
    var phrase = c.statut === 'reporte' ? match + ' est reporté' + (c.nouvelleDate ? ' au ' + dateFrCourte(c.nouvelleDate) + (c.nouvelleHeure ? ', ' + heureFr(c.nouvelleHeure) : '') + '.' : ' ; la nouvelle date sera communiquée dès qu\'elle sera fixée.')
      : c.statut === 'annule' ? match + ' est annulé.'
      : c.statut === 'horaire' ? match + ' change d\'horaire : début à ' + heureFr(c.nouvelleHeure) + '.'
      : c.statut === 'salle' ? match + ' se jouera à : ' + c.salle + '.'
      : c.statut === 'forfait' ? match + ' n\'aura pas lieu (forfait).'
      : match + ' : ' + c.autre + '.';
    return premiereLigne(c.equipe, c.niv) + '\n' + phrase + (c.motif ? '\nMotif : ' + c.motif + '.' : '') + '\n\nBasket Club de Rouxmesnil';
  }
  function visuelChangement(c) {
    return '<div class="pub-cadre"><div class="pub-visuel" role="img" aria-label="Visuel : ' + esc(c.equipe) + ', ' + esc(libelle(c)) + '">'
      + '<span class="pv-biais" aria-hidden="true"></span>'
      + '<div class="pv-tete"><img class="pv-logo" src="img/logo-bcr-160.webp" alt=""><span>Basket Club<br>de Rouxmesnil</span></div>'
      + '<p class="pv-equipe">' + esc(c.equipe) + '</p><p class="pv-niv">' + esc(c.niv) + '</p>'
      + '<p class="pv-issue">' + esc(ETIQ[c.statut] || 'Changement') + '</p>'
      + '<p class="pv-quand">Match du ' + esc(dateFrCourte(c.date)) + '<br>contre ' + esc(c.adv || 'adversaire à compléter') + '</p>'
      + '<p class="pv-quand pv-fort">' + esc(libelle(c)) + '</p>'
      + '<p class="pv-partenaire">Emplacement partenaire</p></div></div>';
  }

  /* ---------- Fin de match : scores saisis par le coach pendant la visite ---------- */
  var finMatch = document.getElementById('pub-fin-match');
  function afficherFinMatch() {
    var s = lire('bcr-scores', []).slice().reverse(), ch = lire('bcr-changements', []).slice().reverse();
    var cartesChg = ch.map(function (c) { return carte({ id: 'ch-' + c.id, type: 'Changement de match · signalé par le coach', titre: c.equipe + ' contre ' + (c.adv || 'adversaire à compléter') + ' : ' + libelle(c), visuel: visuelChangement(c), texte: texteChangement(c) }); }).join('');
    finMatch.innerHTML = cartesChg + (s.length ? s.map(function (x) {
      var m = { equipe: x.equipe, niv: x.niv, adv: x.adv || 'adversaire à compléter', lieu: x.lieu, quand: x.date ? dateFr(x.date) : 'Date à compléter', bcr: x.bcr, ad: x.ad };
      return carte({ id: 'fm-' + x.id, type: 'Fin de match · score saisi par le coach', titre: m.equipe + ' contre ' + m.adv, visuel: visuelMatch(m), texte: texteMatch(m) });
    }).join('') : (ch.length ? '' : '<p class="vide-filtre">Aucun score saisi pour le moment. Dès qu\'un coach saisirait le score final d\'un match, sa publication apparaîtrait ici.</p>'));
  }
  ['bcr:score', 'bcr:changement'].forEach(function (t) { document.addEventListener(t, function () { afficherFinMatch(); if (window.BCRRole && BCRRole.majPastilles) BCRRole.majPastilles(); }); });

  /* ---------- Week-end ---------- */
  var choix = 'we-3-4', btn = document.getElementById('we-preparer'), etat = document.getElementById('we-etat'), zone = document.getElementById('we-pubs');
  var boutons = document.getElementById('we-choix');
  boutons.innerHTML = WEEKENDS.map(function (w) { return '<button type="button" data-we="' + w.id + '" aria-pressed="false">' + w.titre + '</button>'; }).join('');
  function majWeekend() {
    var w = WEEKENDS.filter(function (x) { return x.id === choix; })[0];
    boutons.querySelectorAll('[data-we]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-we') === choix)); });
    var scores = lire('bcr-scores', []), complet = w.matchs.every(function (m) { return typeof m.bcr === 'number'; });
    if (complet) {
      etat.innerHTML = '<span class="etat ok">Tous les scores sont connus</span> : ' + w.matchs.length + ' matchs (affiches du club et FFBB).';
      btn.disabled = false;
    } else {
      var n = w.matchs.filter(function (m) { return m.cle && scores.some(function (s) { return s.id === m.cle; }); }).length;
      etat.innerHTML = '<span class="etat attente">Scores pas encore saisis</span> : ' + n + ' sur ' + w.matchs.length + '. Le bouton se débloquerait quand tous les scores seraient là.'
        + '<ul class="we-attente">' + w.matchs.map(function (m) { return '<li>' + esc(m.equipe) + ' contre ' + esc(m.adv) + '</li>'; }).join('') + '</ul>';
      btn.disabled = true;
    }
    zone.innerHTML = '';
  }
  boutons.addEventListener('click', function (e) { var b = e.target.closest('[data-we]'); if (!b) return; choix = b.getAttribute('data-we'); majWeekend(); });
  btn.addEventListener('click', function () {
    var w = WEEKENDS.filter(function (x) { return x.id === choix; })[0];
    if (!w.matchs.every(function (m) { return typeof m.bcr === 'number'; })) return;
    zone.innerHTML = '<h4 class="we-sous-titre">Publication générale</h4>'
      + carte({ id: w.id + '-general', type: 'Publication générale · récapitulatif', titre: w.titre, visuel: visuelGeneral(w), texte: texteGeneral(w) })
      + '<h4 class="we-sous-titre">Une publication par match, dans l\'ordre du week-end</h4>'
      + (w.id === 'we-3-4' ? '<p class="aide" style="margin:-4px 0 12px">Les deux matchs des U18 féminines sont datés (samedi 3 octobre) ; pour les autres, seul le week-end est connu.</p>' : '')
      + w.matchs.map(function (m) { return carte({ id: w.id + '-' + m.id, type: 'Publication du match', titre: m.equipe + ' contre ' + m.adv, visuel: visuelMatch(m), texte: texteMatch(m) }); }).join('');
    document.getElementById('we-annonce').textContent = 'Publications préparées : 1 publication générale et ' + w.matchs.length + ' publications de match, à relire et valider.';
    var t = zone.querySelector('h4'); t.setAttribute('tabindex', '-1'); t.focus();
  });
  afficherFinMatch();
  majWeekend();
})();
