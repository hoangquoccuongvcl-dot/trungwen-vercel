const pinyinPro = require('pinyin-pro');
const { Segment, useDefault } = require('segmentit');

let segment = null;
try {
  segment = useDefault(new Segment());
} catch (e) {
  console.error('segmentit init error:', e);
}

export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q) return res.json({ segments: [], ok: false });
  
  try {
    const segments = [];
    const han = /[\u4e00-\u9fa5]/;
    let words = [];
    
    // Dùng segmentit để tách từ chuẩn
    if (segment) {
      try {
        words = segment.doSegment(q, { simple: true });
      } catch (e) {
        console.error('segment fail:', e);
        words = [...q];
      }
    } else {
      words = [...q];
    }
    
    for (const word of words) {
      if (!word) continue;
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
      } else {
        // Dấu câu, khoảng trắng — tách từng ký tự
        for (const ch of word) {
          if (ch.trim()) {
            segments.push({ w: ch, p: '', t: [], han: false });
          }
        }
      }
    }
    
    res.json({ segments, ok: true });
  } catch (e) {
    console.error('segment error:', e);
    res.status(500).json({ error: e.message });
  }
}
