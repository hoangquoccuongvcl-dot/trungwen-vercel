export default async function handler(req, res) {
  const text = req.query.text || '';
  if (!text) return res.status(400).json({ error: 'Empty text' });
  if (text.length > 200) return res.status(400).json({ error: 'Max 200 chars' });
  
  try {
    const gurl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-TW&client=tw-ob&ttsspeed=0.9`;
    const r = await fetch(gurl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });
    if (!r.ok) return res.status(r.status).json({ error: 'TTS fail ' + r.status });
    const ab = await r.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.send(Buffer.from(ab));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
