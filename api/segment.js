const pinyinPro = require('pinyin-pro');

export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q) return res.json({ segments: [], ok: false });
  
  try {
    const segments = [];
    // Chia câu theo dấu câu trước
    const parts = q.split(/([，。！？、；：,.!?;:])/).filter(x => x);
    
    for (const part of parts) {
      if (/[\u4e00-\u9fa5]/.test(part)) {
        // Lấy pinyin từng chữ
        const pys = pinyinPro.pinyin(part, { toneType: 'symbol', type: 'array', nonZh: 'consecutive' });
        const nums = pinyinPro.pinyin(part, { toneType: 'num', type: 'array', nonZh: 'consecutive' });
        const tones = nums.map(p => {
          const m = String(p).match(/[1-5]/);
          return m ? parseInt(m[0]) : 5;
        });
        segments.push({
          w: part,
          p: pys.join(' '),
          t: tones,
          han: true
        });
      } else if (part.trim()) {
        segments.push({ w: part, p: '', t: [], han: false });
      }
    }
    
    res.json({ segments, ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
