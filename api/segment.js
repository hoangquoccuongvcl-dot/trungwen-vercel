// Bảng ánh xạ thanh điệu từ ký tự có dấu
const TONE_MAP = {
  'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
  'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
  'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
  'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
  'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
  'ǖ': ['v', 1], 'ǘ': ['v', 2], 'ǚ': ['v', 3], 'ǜ': ['v', 4]
};

function getToneFromPinyin(py) {
  for (const [char, [_, tone]] of Object.entries(TONE_MAP)) {
    if (py.includes(char)) return tone;
  }
  return 5; // Khinh thanh / không dấu
}

export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q.trim()) return res.json({ segments: [], ok: false });

  try {
    let pinyinFn;
    try {
      const pinyinModule = await import('pinyin-pro');
      pinyinFn = pinyinModule.pinyin;
    } catch (e) {
      pinyinFn = null;
    }

    const segmenter = new Intl.Segmenter('zh-Hant', { granularity: 'word' });
    const rawSegments = Array.from(segmenter.segment(q)).map(s => s.segment);

    const MERGE_WORDS = [
      '有時候', '書桌上', '書桌', '回過神來', '回過神',
      '幾個月', '一個月', '臺灣', '已經', '過得', '慢得', '忙得'
    ];

    const merged = [];
    let i = 0;
    while (i < rawSegments.length) {
      let matched = false;
      for (let len = 4; len >= 2; len--) {
        if (i + len <= rawSegments.length) {
          const candidate = rawSegments.slice(i, i + len).join('');
          if (MERGE_WORDS.includes(candidate)) {
            merged.push(candidate);
            i += len;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        merged.push(rawSegments[i]);
        i++;
      }
    }

    const segments = merged.map(w => {
      const isHan = /[\u4e00-\u9fa5]/.test(w);
      if (!isHan) {
        return { w, p: '', t: [], han: false };
      }

      let py = '';
      let tones = [];

      if (pinyinFn) {
        py = pinyinFn(w, { toneType: 'symbol', type: 'string' });
        const pyArray = pinyinFn(w, { toneType: 'symbol', type: 'array' });
        tones = pyArray.map(item => getToneFromPinyin(item));
      }

      // Xử lý các từ đa âm thông dụng (như 得 sau động từ/tính từ)
      if (w.endsWith('得') && py.includes('dé')) {
        py = py.replace(/dé$/, 'de');
        if (tones.length > 0) tones[tones.length - 1] = 5;
      }

      return {
        w,
        p: py,
        t: tones,
        han: true
      };
    });

    return res.json({ segments, ok: true, engine: 'native-segmenter' });
  } catch (err) {
    return res.status(500).json({ error: err.message, ok: false });
  }
}
