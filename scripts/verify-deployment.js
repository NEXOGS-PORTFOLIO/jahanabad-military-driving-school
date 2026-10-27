const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../Deployment');
const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
const actual = [];
function inspect(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    const relative = path.relative(output, file).replace(/\\/g, '/');
    assert(!item.isSymbolicLink(), `Unexpected symlink: ${relative}`);
    assert(!['node_modules', 'tests', 'seeders', '.git', 'src'].includes(item.name), `Development directory: ${relative}`);
    assert(!/^(?:\.env(?:\..+)?|.*\.(?:map|log|zip|test\.js))$/.test(item.name) || item.name === '.env.example', `Unnecessary or sensitive file: ${relative}`);
    if (item.isDirectory()) inspect(file);
    else if (relative !== 'manifest.json') actual.push(relative);
  }
}
inspect(output);
assert.deepEqual(actual.sort(), manifest.files.map(entry => entry.file).sort(), 'Manifest file list mismatch');
for (const entry of manifest.files) {
  const content = fs.readFileSync(path.join(output, entry.file));
  assert.equal(content.length, entry.bytes, `Size mismatch: ${entry.file}`);
  assert.equal(crypto.createHash('sha256').update(content).digest('hex'), entry.sha256, `Hash mismatch: ${entry.file}`);
}
const pkg = JSON.parse(fs.readFileSync(path.join(output, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(output, 'package-lock.json'), 'utf8'));
assert(!pkg.devDependencies, 'Development dependencies included');
assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies, 'Lockfile dependencies differ');
assert(!Object.values(lock.packages).some(entry => entry.dev), 'Development packages in lockfile');
for (const file of ['app.js', 'server.js', '.env.example', 'README.md', 'public/index.html', 'assets/Untitled-1.svg']) {
  assert(fs.existsSync(path.join(output, file)), `Required file missing: ${file}`);
}
const html = fs.readFileSync(path.join(output, 'public/index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(\/[^"?#]+)(?:[?#][^"]*)?"/g)) {
  assert(fs.existsSync(path.join(output, 'public', match[1])), `Frontend asset missing: ${match[1]}`);
}
console.log(`Deployment verified: ${actual.length} files, matching SHA-256 hashes, required assets present, no secrets or development dependencies.`);
