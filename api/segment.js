export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q.trim()) return res.json({ segments: [], ok: false });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment variables', ok: false });
  }

  try {
    const prompt = `Bạn là chuyên gia ngôn ngữ tiếng Trung Phồn thể. Hãy phân tích câu sau:
Câu: "${q}"

Nhiệm vụ:
1. Tách từ (Word Segmentation) thành các từ ghép có nghĩa hoàn chỉnh, không chia vụn (ví dụ: "有時候", "回過神來", "書桌", "匆忙得").
2. Phiên âm Pinyin chuẩn ngữ cảnh, đặc biệt chú ý chữ đa âm (多音字) như "得" (trợ từ kết cấu đọc là "de"), "長", "行", "樂".
3. Xác định mảng tone số (1-5, khinh thanh là 5) tương ứng từng chữ Hán trong từ.
4. Giữ nguyên dấu câu (dấu câu để han: false, p: "", t: []).

Bắt buộc trả về đúng định dạng JSON Array mẫu:
[
  {"w": "有時候", "p": "yǒu shí hòu", "t": [3, 2, 4], "han": true},
  {"w": "，", "p": "", "t": [], "han": false}
]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const aiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      throw new Error(`Gemini API error: ${aiRes.status} - ${errBody}`);
    }

    const aiData = await aiRes.json();
    const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const segments = JSON.parse(rawText);

    res.json({ segments, ok: true, engine: 'gemini-flash' });
  } catch (e) {
    res.status(500).json({ error: e.message, ok: false });
  }
}
