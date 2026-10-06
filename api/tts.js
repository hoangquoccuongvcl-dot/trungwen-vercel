export default async function handler(req, res) {
  const text = req.query.text || '';
  const voice = req.query.voice || 'zh-TW-HsiaoChenNeural';
  const rate = req.query.rate || '1.0';
  const pitch = req.query.pitch || '0';
  
  if (!text) return res.status(400).json({error:'Empty'});
  
  try {
    const { EdgeTTS } = require('edge-tts-universal');
    const tts = new EdgeTTS(text, voice, {
      rate: '+0%',
      pitch: '+0Hz'
    });
    const result = await tts.synthesize();
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.send(Buffer.from(result.audio));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
