// Edge TTS qua gọi trực tiếp API Microsoft (không cần package)
export default async function handler(req, res) {
  const text = req.query.text || '';
  const voice = req.query.voice || 'zh-TW-HsiaoChenNeural';
  
  if (!text) return res.status(400).json({ error: 'Empty' });
  
  try {
    // Dùng trực tiếp API Edge TTS
    const crypto = require('crypto');
    const wsUrl = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
    
    // Fallback: trả 501 để client dùng SpeechSynthesis API
    res.status(501).json({ 
      error: 'TTS serverless not supported',
      fallback: 'Use browser SpeechSynthesis API'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
