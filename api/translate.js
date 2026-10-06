export default async function handler(req, res) {
  const q = req.query.q || '';
  const to = req.query.to || 'vi';

  if (!q.trim()) {
    return res.json({ text: '', ok: false });
  }

  // 1. Thử nguồn Google Translate API (client=gtx - miễn phí, không cần key)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(q)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && data[0]) {
        const translatedText = data[0].map(item => item[0]).filter(Boolean).join('');
        if (translatedText) {
          return res.json({ text: translatedText, ok: true, source: 'google' });
        }
      }
    }
  } catch (err) {
    // Bỏ qua lỗi để nhảy sang nguồn dự phòng
  }

  // 2. Nguồn dự phòng (Fallback): MyMemory API
  try {
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=zh|${to}`;
    const mmRes = await fetch(mmUrl);
    if (mmRes.ok) {
      const mmData = await mmRes.json();
      if (mmData && mmData.responseData && mmData.responseData.translatedText) {
        return res.json({ text: mmData.responseData.translatedText, ok: true, source: 'mymemory' });
      }
    }
  } catch (err) {
    // Bỏ qua lỗi
  }

  return res.json({ text: '', ok: false, error: 'All providers failed' });
}
