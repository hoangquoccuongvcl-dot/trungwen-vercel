const pinyinPro = require('pinyin-pro');
export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q) return res.json({ segments: [], ok: false });
  const segments = [];
  const han = /[\u4e00-\u9fa5]/;
  for (const ch of q) {
    if (han.test(ch)) {
      const p = pinyinPro.pinyin(ch, { toneType: 'symbol', type: 'string' });
      const n = pinyinPro.pinyin(ch, { toneType: 'num', type: 'string' });
      const m = String(n).match(/[1-5]/);
      segments.push({ w: ch, p: p || '', t: [m ? parseInt(m[0]) : 5], han: true });
    } else if (ch.trim()) {
      segments.push({ w: ch, p: '', t: [], han: false });
    }
  }
  res.json({ segments, ok: true });
}
