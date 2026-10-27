const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'Deployment');
const build = path.join(root, 'client/build');
// Only replace the generated deployment directory inside this workspace.
if (path.dirname(output) !== root || path.basename(output) !== 'Deployment') throw new Error('Invalid output path');
if (fs.existsSync(output)) throw new Error('Deployment already exists. Move it aside before packaging to preserve any hosting configuration.');
// Always rebuild with deployment settings instead of shipping a stale local build.
const result = spawnSync(process.execPath, [require.resolve('react-scripts/scripts/build', { paths: [path.join(root, 'client')] })], {
  cwd: path.join(root, 'client'),
  env: { ...process.env, NODE_ENV: 'production', REACT_APP_API_URL: '/api', GENERATE_SOURCEMAP: 'false', PUBLIC_URL: '/' },
  stdio: 'inherit'
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error('Production frontend build failed; Deployment was not created');
if (!fs.existsSync(path.join(build, 'index.html'))) throw new Error('Production frontend build is missing');
fs.mkdirSync(output);
for (const name of ['config', 'controllers', 'middleware', 'models', 'routes', 'utils', 'assets', 'scripts']) {
  fs.cpSync(path.join(root, 'server', name), path.join(output, name), { recursive: true });
}
for (const name of ['server.js', 'app.js']) fs.copyFileSync(path.join(root, 'server', name), path.join(output, name));
fs.cpSync(build, path.join(output, 'public'), { recursive: true, filter: source => !source.endsWith('.map') });
fs.mkdirSync(path.join(output, 'uploads'));
if (fs.existsSync(path.join(root, 'server/uploads'))) fs.cpSync(path.join(root, 'server/uploads'), path.join(output, 'uploads'), { recursive: true });
// Preserve notice image fallbacks referenced by seeded database records.
const noticeAssets = path.join(root, 'docs/assets/notices');
if (fs.existsSync(noticeAssets)) {
  fs.mkdirSync(path.join(output, 'uploads/notices'), { recursive: true });
  for (const name of fs.readdirSync(noticeAssets)) {
    const destination = path.join(output, 'uploads/notices', name);
    if (!fs.existsSync(destination) && /\.(?:jpe?g|png|webp)$/i.test(name)) {
      fs.copyFileSync(path.join(noticeAssets, name), destination);
    }
  }
}
fs.mkdirSync(path.join(output, 'tmp'));
fs.writeFileSync(path.join(output, 'tmp/.gitkeep'), '');
fs.writeFileSync(path.join(output, 'uploads/.gitkeep'), '');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'server/package.json')));
delete pkg.devDependencies;
pkg.scripts = { start: 'node app.js', 'check:config': 'node -e "require(\'dotenv\').config(); require(\'./config/production\').validateProductionEnv(); console.log(\'Production configuration valid\')"', 'create:admin': 'node scripts/createAdmin.js' };
pkg.engines = { node: '>=22 <27' };
pkg.scripts['check:db'] = 'node scripts/checkDatabase.js';
fs.writeFileSync(path.join(output, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'server/package-lock.json')));
delete lock.packages[''].devDependencies;
lock.packages[''].engines = pkg.engines;
for (const [name, entry] of Object.entries(lock.packages)) if (entry.dev) delete lock.packages[name];
fs.writeFileSync(path.join(output, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
fs.copyFileSync(path.join(root, 'docs/deployment.env.example'), path.join(output, '.env.example'));
fs.copyFileSync(path.join(root, 'docs/CPANEL.md'), path.join(output, 'README.md'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(output, 'LICENSE'));
const entries = [];
function inventory(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) inventory(file);
    else entries.push({ file: path.relative(output, file).replace(/\\/g, '/'), bytes: fs.statSync(file).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
  }
}
inventory(output);
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({ files: entries }, null, 2) + '\n');
console.log(`Deployment prepared: ${entries.length} files; no local environment files or node_modules included.`);
