/* 算候选色的 WCAG 对比度，挑出在亮底与暗底都过 4.5:1 的档位。 */
const lum = (hex) => {
  const n = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const cr = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

const CAND = {
  d0: { bg: '#ffffff', surf: '#f7f8f7', try: ['#6b7168', '#646a62', '#5f665e'] },
  d1: { bg: '#f2f3f5', surf: '#ffffff', try: ['#616a75', '#5b636e', '#6a737e'] },
  d2: { bg: '#0b0d10', surf: '#12151a', try: ['#7c8794', '#8892a0', '#737e8b'] },
  d3: { bg: '#fbfaf8', surf: '#f4f2ee', try: ['#6a6f77', '#63676f', '#71767e'] }
};
for (const [k, v] of Object.entries(CAND)) {
  console.log('==', k, 'bg', v.bg, '/ surface', v.surf);
  for (const c of v.try) console.log('   ', c, 'bg', (Math.round(cr(c, v.bg) * 100) / 100), '| surf', Math.round(cr(c, v.surf) * 100) / 100);
}
