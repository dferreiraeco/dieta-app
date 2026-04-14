#!/usr/bin/env node
// v2.1.84: gera legal-docs.js a partir de PRIVACY.md e TERMS.md.
// Embeds os docs como strings no JS pra eliminar a necessidade de fetch
// (que sofre com SW stale, Jekyll, cache, etc). Rode manualmente sempre
// que atualizar os .md:
//
//   node scripts/build-legal-docs.js
//
// Resultado: legal-docs.js na raiz do projeto, incluído via <script>
// em index.html antes de app.js.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const files = {
  terms:   path.join(ROOT, 'TERMS.md'),
  privacy: path.join(ROOT, 'PRIVACY.md'),
};
const out = path.join(ROOT, 'legal-docs.js');

const docs = {};
for (const [key, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    console.error('MISSING:', file);
    process.exit(1);
  }
  docs[key] = fs.readFileSync(file, 'utf-8');
}

// JSON.stringify é o jeito seguro de escapar strings pra JS literal
// (escapa quebras de linha, aspas, backslashes, unicode, tudo)
const js =
  '// AUTO-GERADO por scripts/build-legal-docs.js — NÃO EDITAR MANUALMENTE\n' +
  '// Execute: node scripts/build-legal-docs.js sempre que atualizar os .md\n' +
  'const LEGAL_DOCS = ' + JSON.stringify(docs, null, 2) + ';\n';

fs.writeFileSync(out, js, 'utf-8');
const kb = (js.length / 1024).toFixed(1);
console.log('Gerado ' + out + ' (' + kb + ' KB)');
