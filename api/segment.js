const pinyinPro = require('pinyin-pro');
const { Segment, useDefault } = require('segmentit');

const segment = useDefault(new Segment());

export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q) return res.json({ segments: [], ok: false });
  
  try {
    const segs = segment.doSegment(q, { simple: true });
    const segments = [];
    const han = /[\u4e00-\u9fa5]/;
    
    for (const word of segs) {
      if (han.test(word)) {
        const pys = pinyinPro.pinyin(word, { toneType: 'symbol', type: 'array', nonZh: 'consecutive' });
        const nums = pinyinPro.pinyin(word, { toneType: 'num', type: 'array', nonZh: 'consecutive' });
        const tones = nums.map(p => {
          const m = String(p).match(/[1-5]/);
          return m ? parseInt(m[0]) : 5;
        });
        segments.push({
          w: word,
          p: pys.join(' '),
          t: tones,
          han: true
        });
      } else if (word.trim()) {
        segments.push({ w: word, p: '', t: [], han: false });
      }
    }
    
    res.json({ segments, ok: true });
  } catch (e) {
    console.error('segment error:', e);
    res.status(500).json({ error: e.message });
  }
}
