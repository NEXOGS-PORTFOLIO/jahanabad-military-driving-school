import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import bangla from './ui.bn.json';

const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? files(target) : entry.name.endsWith('.js') && !entry.name.endsWith('.test.js') ? [target] : [];
});

test('all UI translation calls have Bangla text and preserve interpolation variables', () => {
  const missing = [];
  for (const file of files(path.join(__dirname, '..'))) {
    traverse(parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] }), {
      CallExpression({ node }) {
        if (node.callee.name === 'tr' && node.arguments[0]?.type === 'StringLiteral') {
          const key = node.arguments[0].value;
          if (!bangla[key]) missing.push(`${file}: ${key}`);
        }
      }
    });
  }
  expect(missing).toEqual([]);
  const placeholders = value => (value.match(/\{\{[^}]+\}\}/g) || []).sort();
  Object.entries(bangla).forEach(([english, translated]) => {
    expect(translated).toMatch(/[\u0980-\u09ff]/);
    expect(placeholders(translated)).toEqual(placeholders(english));
  });
});
