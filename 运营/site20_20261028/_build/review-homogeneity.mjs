import { variants } from './data.mjs';
import fs from 'node:fs';
import path from 'node:path';

const sets = variants.map((v) => ({ id: v.id, m: new Set(v.modules), layout: v.layout, visual: v.visual, angle: v.angle }));
const uni = new Set();
variants.forEach((v) => v.modules.forEach((m) => uni.add(m)));
const rows = [...uni].map((m) => ({ module: m, n: sets.filter((s) => s.m.has(m)).length }));
rows.sort((a, b) => b.n - a.n);
console.log('modules used by how many of 20:');
console.log(rows.map((r) => r.module + ':' + r.n).join('  '));

let pairs = 0, sum = 0, max = { j: 0 };
for (let i = 0; i < sets.length; i++) {
  for (let j = i + 1; j < sets.length; j++) {
    const a = sets[i].m, b = sets[j].m;
    let inter = 0;
    a.forEach((x) => { if (b.has(x)) inter++; });
    const jac = inter / (a.size + b.size - inter);
    sum += jac; pairs++;
    if (jac > max.j) max = { j: jac, a: sets[i].id, b: sets[j].id };
  }
}
console.log('avg module Jaccard', (sum / pairs).toFixed(3), 'max', max.j.toFixed(3), max.a, max.b);

const seq = {};
variants.forEach((v) => { const k = v.modules.join('>'); seq[k] = (seq[k] || 0) + 1; });
console.log('repeated full module sequences:', Object.values(seq).filter((n) => n > 1).length);

console.log('layouts:', JSON.stringify(variants.reduce((a, v) => ((a[v.layout] = (a[v.layout] || 0) + 1), a), {})));
console.log('visuals:', new Set(variants.map((v) => v.visual)).size, 'distinct of', variants.length);
console.log('angles:', new Set(variants.map((v) => v.angle)).size);
