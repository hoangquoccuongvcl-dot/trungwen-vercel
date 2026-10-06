export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q.trim()) return res.json({ segments: [], ok: false });

  try {
    // 1. Dùng Intl.Segmenter chuẩn tiếng Trung Phồn Thể để gom cụm từ
    const segmenter = new Intl.Segmenter('zh-Hant', { granularity: 'word' });
    const rawSegments = Array.from(segmenter.segment(q)).map(s => s.segment);

    // 2. Danh sách cụm từ ưu tiên ghép lại (không để bị chia vụn)
    const MERGE_WORDS = [
      '有時候', '書桌上', '書桌', '回過神來', '回過神',
      '幾個月', '一個月', '臺灣', '已經', '過得', '慢得', '忙得'
    ];

    const merged = [];
    let i = 0;
    while (i < rawSegments.length) {
      let matched = false;
      // Thử ghép 4 từ, 3 từ, 2 từ
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

    // 3. Trả về cấu trúc cho frontend render khối
    const segments = merged.map(w => {
      const isHan = /[\u4e00-\u9fa5]/.test(w);
      return {
        w: w,
        p: '', // Frontend hoặc pinyin-pro sẽ map pinyin theo từng cụm w này
        t: [],
        han: isHan
      };
    });

    return res.json({ segments, ok: true, engine: 'native-segmenter' });
  } catch (err) {
    return res.status(500).json({ error: err.message, ok: false });
  }
}
