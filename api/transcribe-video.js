// Tắt bodyParser để đọc raw multipart
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Missing GROQ_API_KEY' });
  
  try {
    // Đọc raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    if (buffer.length < 100) {
      return res.status(400).json({ error: 'Empty body', len: buffer.length });
    }
    
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No boundary in content-type', ct: contentType });
    }
    
    const boundary = boundaryMatch[1].replace(/^"|"$/g, '');
    const parts = parseMultipart(buffer, boundary);
    const filePart = parts.find(p => p.name === 'audio' || p.name === 'video');
    if (!filePart || !filePart.data) {
      return res.status(400).json({ error: 'No file part', parts: parts.map(p => p.name) });
    }
    
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
      body: form,
    });
    
    if (!r.ok) {
      const errText = await r.text();
      console.error('[Groq error]', r.status, errText);
      return res.status(r.status).json({ error: errText });
    }
    
    const data = await r.json();
    const HALLU = ['當代中文課程', '臺灣當代中文', '以下是臺灣', '課程對話', '中文課程'];
    const segments = [];
    
    for (const seg of (data.segments || [])) {
      const txt = (seg.text || '').trim();
      if (!txt) continue;
      if (HALLU.some(kw => txt.includes(kw)) && txt.length < 30) continue;
      
      // Split câu theo dấu câu
      const sentences = txt.split(/(?<=[。！？!?])/).filter(s => s.trim());
      for (const s of sentences) {
        const clean = s.trim();
        if ((clean.match(/[\u4e00-\u9fa5]/g) || []).length >= 2) {
          segments.push({
            text: clean,
            start: Math.round(seg.start * 100) / 100,
            end: Math.round(seg.end * 100) / 100,
          });
        }
      }
    }
    
    res.json({ segments, ok: true, count: segments.length });
  } catch (e) {
    console.error('[transcribe error]', e);
    res.status(500).json({ error: e.message, stack: e.stack });
  }
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const sepStr = '--' + boundary;
  const sep = Buffer.from('\r\n' + sepStr);
  const firstSep = Buffer.from(sepStr);
  
  // Tìm đầu tiên
  let start = buffer.indexOf(firstSep);
  if (start === -1) return parts;
  start += firstSep.length;
  
  while (start < buffer.length) {
    // Bỏ qua \r\n sau boundary
    if (buffer[start] === 13 && buffer[start+1] === 10) start += 2;
    
    // Tìm boundary tiếp theo
    const next = buffer.indexOf(sep, start);
    if (next === -1) break;
    
    const part = buffer.slice(start, next);
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
        data: data,
      });
    }
    
    start = next + sep.length;
  }
  return parts;
}
