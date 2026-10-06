export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q.trim()) return res.json({ segments: [], ok: false });

  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    try {
      const prompt = `Phân tích câu tiếng Trung Phồn thể sau thành các TỪ GHÉP có nghĩa (Word Segmentation), KHÔNG ngắt rời từng chữ đơn lẻ nếu chúng đi liền với nhau thành một từ (ví dụ: "臺灣", "已經", "幾個月", "書桌", "回過神來").
Kèm theo Pinyin chuẩn và số thứ tự thanh điệu (1-5, khinh thanh là 5).

Câu: "${q}"

Bắt buộc trả về đúng định dạng JSON Array mẫu:
[
  {"w": "我", "p": "wǒ", "t": [3], "han": true},
  {"w": "來", "p": "lái", "t": [2], "han": true},
  {"w": "臺灣", "p": "tái wān", "t": [2, 1], "han": true},
  {"w": "已經", "p": "yǐ jīng", "t": [3, 1], "han": true},
  {"w": "幾個月", "p": "jǐ gè yuè", "t": [3, 4, 4], "han": true},
  {"w": "了", "p": "le", "t": [5], "han": true}
]`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '{}';
        let parsed = JSON.parse(content);
        let segments = Array.isArray(parsed) ? parsed : (parsed.segments || parsed.words || Object.values(parsed)[0]);
        if (Array.isArray(segments) && segments.length > 0) {
          return res.json({ segments, ok: true, engine: 'groq' });
        }
      }
    } catch (err) {
      console.error('Groq error:', err);
    }
  }

  // Fallback dùng Intl.Segmenter chuẩn tiếng Trung nếu mạng lỗi
  const segmenter = new Intl.Segmenter('zh-Hant', { granularity: 'word' });
  const segments = Array.from(segmenter.segment(q)).map(s => ({
    w: s.segment,
    p: '',
    t: [],
    han: /[\u4e00-\u9fa5]/.test(s.segment)
  }));

  return res.json({ segments, ok: true, engine: 'intl-fallback' });
}
