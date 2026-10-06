export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({error:'Missing GROQ_API_KEY'});
  
  try {
    // Đọc raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    
    // Parse multipart
    const boundary = req.headers['content-type'].split('boundary=')[1];
    const parts = parseMultipart(buffer, boundary);
    const filePart = parts.find(p => p.name === 'audio' || p.name === 'video');
    if (!filePart) return res.status(400).json({error:'No file'});
    
    // Gửi lên Groq
    const form = new FormData();
    const blob = new Blob([filePart.data], { type: filePart.type || 'audio/mp3' });
    form.append('file', blob, filePart.filename || 'audio.mp3');
    form.append('model', 'whisper-large-v3');
    form.append('language', 'zh');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY },
      body: form
    });
    
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({error: err});
    }
    
    const data = await r.json();
    const segments = [];
    const HALLU = ['當代中文課程','臺灣當代中文','以下是臺灣','課程對話','中文課程'];
    
    for (const seg of (data.segments || [])) {
      const txt = (seg.text || '').trim();
      if (!txt) continue;
      if (HALLU.some(kw => txt.includes(kw)) && txt.length < 30) continue;
      
      // Split câu
      const parts = txt.split(/(?<=[。！？!?])/).filter(p => p.trim());
      for (const s of parts) {
        const clean = s.trim();
        if ((clean.match(/[\u4e00-\u9fa5]/g) || []).length >= 2) {
          segments.push({
            text: clean,
            start: Math.round(seg.start * 100) / 100,
            end: Math.round(seg.end * 100) / 100
          });
        }
      }
    }
    
    res.json({ segments, ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const sep = Buffer.from('--' + boundary);
  const endSep = Buffer.from('--' + boundary + '--');
  
  let start = buffer.indexOf(sep) + sep.length;
  while (start > sep.length) {
    start += 2; // skip \r\n
    const next = buffer.indexOf(sep, start);
    if (next === -1) break;
    
    const part = buffer.slice(start, next - 2);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) { start = next + sep.length; continue; }
    
    const headers = part.slice(0, headerEnd).toString();
    const data = part.slice(headerEnd + 4);
    
    const nameMatch = headers.match(/name="([^"]+)"/);
    const fileMatch = headers.match(/filename="([^"]+)"/);
    const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    
    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: fileMatch ? fileMatch[1] : null,
        type: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
        data
      });
    }
    
    start = next + sep.length;
  }
  return parts;
}
