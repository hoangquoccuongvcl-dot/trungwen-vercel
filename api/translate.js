export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q) return res.json({text: '', ok: false});
  
  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=vi&dt=t&q=' + encodeURIComponent(q);
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!r.ok) return res.json({text: '', ok: false});
    const data = await r.json();
    const out = (data[0] || []).map(p => p[0]).filter(Boolean).join('').trim();
    res.json({ text: out, ok: !!out });
  } catch (e) {
    res.json({ text: '', ok: false, error: e.message });
  }
}
