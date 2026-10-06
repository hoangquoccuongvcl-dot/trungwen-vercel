export default function handler(req, res) {
  res.json({
    voices: [
      { id: 'zh-TW-HsiaoChenNeural', name: '曉臻 — Nữ Đài Loan', quality: 'best' },
      { id: 'zh-TW-HsiaoYuNeural', name: '曉雨 — Nữ Đài Loan', quality: 'best' },
      { id: 'zh-TW-YunJheNeural', name: '雲哲 — Nam Đài Loan', quality: 'best' }
    ],
    default: 'zh-TW-HsiaoChenNeural'
  });
}
