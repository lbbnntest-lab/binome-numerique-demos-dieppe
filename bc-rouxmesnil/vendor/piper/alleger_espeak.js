// Fabrique une version « français seul » des données du phonémiseur espeak-ng (18 Mo → < 1 Mo).
// Garde tous les fichiers communs (phonèmes, intonations, voix) et seulement les dictionnaires fr_dict et en_dict (espeak bascule en anglais sur certains mots).
// node alleger_espeak.js <dossier piper source> <dossier sortie>
const fs = require('fs'), path = require('path');
const [src, dst] = process.argv.slice(2); fs.mkdirSync(dst, { recursive: true });
let js = fs.readFileSync(path.join(src, 'piper_phonemize.js'), 'utf8'); const data = fs.readFileSync(path.join(src, 'piper_phonemize.data'));
const m = js.match(/loadPackage\((\{"files":.*?"remote_package_size":\d+\})\)/s); const meta = JSON.parse(m[1]);
const garder = (f) => !/_dict$/.test(f.filename) || /\/(fr|en)_dict$/.test(f.filename);
const morceaux = []; const files = []; let o = 0;
for (const f of meta.files.filter(garder)) { const b = data.subarray(f.start, f.end); morceaux.push(b); files.push({ ...f, start: o, end: o + b.length }); o += b.length; }
const neuf = { ...meta, files, remote_package_size: o };
js = js.replace(m[1], JSON.stringify(neuf));
fs.writeFileSync(path.join(dst, 'piper_phonemize.js'), js); fs.writeFileSync(path.join(dst, 'piper_phonemize.data'), Buffer.concat(morceaux));
fs.copyFileSync(path.join(src, 'piper_phonemize.wasm'), path.join(dst, 'piper_phonemize.wasm'));
console.log(JSON.stringify({ fichiers_avant: meta.files.length, fichiers_apres: files.length, octets_avant: data.length, octets_apres: o }));
