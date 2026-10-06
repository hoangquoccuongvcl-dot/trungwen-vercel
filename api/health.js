export default function handler(req, res) {
  res.json({ status: 'ok', whisper: true, tts: true, translate: true });
}
