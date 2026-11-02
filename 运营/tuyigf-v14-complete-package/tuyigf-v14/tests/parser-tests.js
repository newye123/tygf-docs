function parseDelimited(text) {
  const sample = String(text || '').slice(0, 12000);
  const first = sample.split(/\r?\n/)[0] || '';
  const delimiter = (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? '\t' : ',';
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < sample.length; i++) {
    const c = sample[i], next = sample[i + 1];
    if (c === '"' && quoted && next === '"') { cell += '"'; i++; continue; }
    if (c === '"') { quoted = !quoted; continue; }
    if (c === delimiter && !quoted) { row.push(cell); cell = ''; continue; }
    if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some(v => v.trim())) rows.push(row);
      row = []; cell = ''; continue;
    }
    cell += c;
  }
  row.push(cell);
  if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('need header and data');
  return { headers: rows.shift().map(v => v.trim()), rows };
}

const csv = 'source,DE,FR,JA\n"Buy, now","Jetzt kaufen","Acheter","今すぐ購入"\n"Size","","Taille","サイズ"\n"Buy, now","Jetzt bestellen","Acheter","今すぐ購入"';
const parsed = parseDelimited(csv);
if (parsed.rows.length !== 3) throw new Error('CSV row count');
if (parsed.headers.length !== 4) throw new Error('CSV headers');
const duplicates = parsed.rows.reduce((a, r) => (a[r[0]] = (a[r[0]] || 0) + 1, a), {});
if (duplicates['Buy, now'] !== 2) throw new Error('duplicate source detection');
const empty = parsed.rows.filter(r => !r[1].trim()).length;
if (empty !== 1) throw new Error('empty translation detection');
const tsv = parseDelimited('source\tDE\tJA\nBuy now\tJetzt kaufen\t今すぐ購入');
if (tsv.rows.length !== 1 || tsv.headers[1] !== 'DE') throw new Error('TSV parsing');
console.log('PASS: quoted CSV, delimiter detection, duplicate source and empty cell checks');
