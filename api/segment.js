const pinyinPro = require('pinyin-pro');

export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q) return res.json({ segments: [], ok: false });
  
  try {
    const segments = [];
    const han = /[\u4e00-\u9fa5]/;
    const punct = /[，。！？、；：,.!?;:\s]/;
    
    // Chia câu theo dấu câu trước
    const parts = q.split(/([，。！？、；：,.!?;:\s]+)/).filter(x => x);
    
    for (const part of parts) {
      if (!part) continue;
      
      // Nếu là dấu câu
      if (punct.test(part) && !han.test(part)) {
        for (const ch of part) {
          if (ch.trim()) segments.push({ w: ch, p: '', t: [], han: false });
        }
        continue;
      }
      
      // Tách từ ghép 2-3 chữ dùng pinyin-pro segment
      const chars = [...part];
      const pinyins = pinyinPro.pinyin(part, { toneType: 'symbol', type: 'array', nonZh: 'consecutive' });
      const nums = pinyinPro.pinyin(part, { toneType: 'num', type: 'array', nonZh: 'consecutive' });
      
      // Group theo cặp 2-3 chữ dựa trên heuristic
      let i = 0;
      while (i < chars.length) {
        if (!han.test(chars[i])) {
          segments.push({ w: chars[i], p: '', t: [], han: false });
          i++;
          continue;
        }
        
        // Kiểm tra từ ghép 3 chữ (noun + noun, verb + noun phổ biến)
        let len = 1;
        // Ưu tiên 2-3 chữ nếu có pinyin liên quan
        if (i + 2 < chars.length && han.test(chars[i+1]) && han.test(chars[i+2])) {
          len = 2; // Thử 2 chữ trước
        } else if (i + 1 < chars.length && han.test(chars[i+1])) {
          len = 2;
        }
        
        const word = chars.slice(i, i + len).join('');
        const pys = pinyins.slice(i, i + len);
        const tns = nums.slice(i, i + len).map(p => {
          const m = String(p).match(/[1-5]/);
          return m ? parseInt(m[0]) : 5;
        });
        
        segments.push({
          w: word,
          p: pys.join(' '),
          t: tns,
          han: true
        });
        i += len;
      }
    }
    
    res.json({ segments, ok: true });
  } catch (e) {
    console.error('segment error:', e);
    res.status(500).json({ error: e.message });
  }
}
