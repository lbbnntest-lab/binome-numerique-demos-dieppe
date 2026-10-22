/* Formulaires publics (rejoindre, partenaires, espace partenaire) : erreur annoncée et reliée au champ, confirmation annoncée.
   La zone d'erreur (role="alert") existe dès le chargement de la page, vide : seul son texte change, et le lecteur d'écran le lit. */
window.BCRForm = (function () {
  'use strict';
  function zone(form) { return form.querySelector('.msg.erreur'); }
  function effacer(form) {
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (c) { c.removeAttribute('aria-invalid'); c.removeAttribute('aria-describedby'); });
    var z = zone(form); if (z) z.textContent = '';
  }
  function erreur(champ, texte) {
    var form = champ.form, z = zone(form), ok = form.querySelector('.msg[role="status"]');
    effacer(form);
    if (ok) ok.hidden = true;
    z.textContent = texte;
    champ.setAttribute('aria-invalid', 'true'); champ.setAttribute('aria-describedby', z.id);
    var retirer = function () { champ.removeAttribute('aria-invalid'); champ.removeAttribute('aria-describedby'); champ.removeEventListener('input', retirer); champ.removeEventListener('change', retirer); };
    champ.addEventListener('input', retirer); champ.addEventListener('change', retirer);
    champ.focus();
  }
  /* Confirmation : la zone est rendue visible d'abord, le texte arrive ensuite (sinon elle n'est pas annoncée). */
  function ok(msg, texte) {
    effacer(msg.form || msg.closest('form'));
    msg.className = 'msg'; msg.hidden = false; msg.textContent = '';
    setTimeout(function () { msg.textContent = texte; }, 60);
  }
  return { erreur: erreur, ok: ok, effacer: effacer };
})();
