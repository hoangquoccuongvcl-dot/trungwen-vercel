// Edge TTS qua WebSocket - pure JS, không cần binary
export default async function handler(req, res) {
  const text = req.query.text || '';
  const voice = req.query.voice || 'zh-TW-HsiaoChenNeural';
  const rate = req.query.rate || '1.0';
  const pitch = req.query.pitch || '0';
  
  if (!text) return res.status(400).json({ error: 'Empty text' });
  if (text.length > 300) return res.status(400).json({ error: 'Text too long (max 300)' });
  
  try {
    // Gọi Microsoft Edge TTS qua HTTP endpoint chính thức
    const wsUrl = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
    
    // Format SSML
    const ratePercent = rate === '1.0' ? '+0%' : (rate > 1 ? '+' : '') + Math.round((rate - 1) * 100) + '%';
    const pitchHz = pitch === '0' ? '+0Hz' : (pitch > 0 ? '+' : '') + Math.round(pitch) + 'Hz';
    
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-TW'><voice name='${voice}'><prosody rate='${ratePercent}' pitch='${pitchHz}'>${escapeXml(text)}</prosody></voice></speak>`;
    
    // Không thể dùng WebSocket trong serverless → dùng API proxy của bên thứ 3
    // Cách 1: Dùng Google Translate TTS (miễn phí, chất lượng thấp hơn)
    const chunks = [];
    const MAX = 200;
    for (let i = 0; i < text.length; i += MAX) {
      chunks.push(text.slice(i, i + MAX));
    }
    
    const audioBuffers = [];
    for (const chunk of chunks) {
      const gurl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=zh-TW&client=tw-ob&ttsspeed=0.9`;
      const r = await fetch(gurl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://translate.google.com/'
        }
      });
      if (!r.ok) {
        console.error('Google TTS error:', r.status);
        return res.status(500).json({ error: 'TTS failed', status: r.status });
      }
      const ab = await r.arrayBuffer();
      audioBuffers.push(Buffer.from(ab));
    }
    
    const finalAudio = Buffer.concat(audioBuffers);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.send(finalAudio);
  } catch (e) {
    console.error('TTS error:', e);
    res.status(500).json({ error: e.message });
  }
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
}
