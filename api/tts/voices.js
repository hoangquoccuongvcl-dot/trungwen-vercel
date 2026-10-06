export default function handler(req, res) {
  res.json({
    voices: [
      { id: 'zh-TW-HsiaoChenNeural', name: '曉臻 — Nữ Đài Loan', quality: 'best' },
      { id: 'zh-TW-HsiaoYuNeural', name: '曉雨 — Nữ Đài Loan', quality: 'best' },
      { id: 'zh-TW-YunJheNeural', name: '雲哲 — Nam Đài Loan', quality: 'best' },
      { id: 'zh-CN-XiaoxiaoNeural', name: '曉曉 — Nữ Bắc Kinh', quality: 'good' },
      { id: 'zh-CN-YunxiNeural', name: '雲希 — Nam Bắc Kinh', quality: 'good' }
    ],
    default: 'zh-TW-HsiaoChenNeural'
  });
}
