import { pinyin } from 'pinyin-pro';
import { POLYPHONE, MERGE_WORDS } from './polyphone.js';

const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'word' });
const MERGE_SORTED = [...MERGE_WORDS].sort((a, b) => b.length - a.length);

// Normalize token — bỏ zero-width, trim
function norm(s) {
  return String(s || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

// Build POLYPHONE với key đã normalize
const POLY_NORM = {};
for (const [k, v] of Object.entries(POLYPHONE)) {
  POLY_NORM[norm(k)] = v;
}

function mergeWords(tokens) {
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    const remaining = tokens.slice(i).join('');
    for (const phrase of MERGE_SORTED) {
      if (remaining.startsWith(phrase)) {
        let acc = '', used = 0;
        while (used < tokens.length - i && acc.length < phrase.length) {
          acc += tokens[i + used];
          used++;
        }
        if (acc === phrase) {
          result.push(phrase);
          i += used;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      result.push(tokens[i]);
      i++;
    }
  }
  return result;
}

const TONE_MAP = {
  'ā':1,'á':2,'ǎ':3,'à':4,'ē':1,'é':2,'ě':3,'è':4,
  'ī':1,'í':2,'ǐ':3,'ì':4,'ō':1,'ó':2,'ǒ':3,'ò':4,
  'ū':1,'ú':2,'ǔ':3,'ù':4,'ǖ':1,'ǘ':2,'ǚ':3,'ǜ':4
};

function getTone(py) {
  for (const c of py) {
    if (TONE_MAP[c]) return TONE_MAP[c];
  }
  return 5;
}

export default async function handler(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ segments: [], ok: false });
  if (q.length > 500) return res.status(400).json({ error: 'Max 500 chars' });

  try {
    const items = pinyin(q, { 
      toneType: 'symbol', 
      type: 'all',
      mode: 'polyphone'
    });

    const charMap = new Map();
    let idx = 0;
    for (const it of items) {
      const origin = norm(it.origin || '');
      for (let k = 0; k < Math.max(origin.length, 1); k++) {
        charMap.set(idx + k, {
          p: k === 0 ? (it.pinyin || '') : '',
          t: k === 0 ? (it.num || 5) : 5,
          isHan: !!it.isZh
        });
      }
      idx += Math.max(origin.length, 1);
    }

    const rawTokens = Array.from(segmenter.segment(q)).map(x => norm(x.segment)).filter(x => x);
    const mergedTokens = mergeWords(rawTokens);

    const segments = [];
    let charPointer = 0;

    for (const token of mergedTokens) {
      const tokenLen = token.length;
      const hasAnyHan = /[\u4e00-\u9fa5]/.test(token);

      if (hasAnyHan) {
        const pys = [];
        const tones = [];
        
        // Check POLYPHONE với token đã norm
        const override = POLY_NORM[token];
        
        if (override) {
          for (let i = 0; i < tokenLen; i++) {
            const ch = token[i];
            if (override[ch]) {
              const py = override[ch];
              pys.push(py);
              tones.push(getTone(py));
            } else {
              const info = charMap.get(charPointer + i);
              if (info && info.isHan && info.p) {
                pys.push(info.p);
                tones.push(info.t);
              }
            }
          }
        } else {
          for (let i = 0; i < tokenLen; i++) {
            const info = charMap.get(charPointer + i);
            if (info && info.isHan && info.p) {
              pys.push(info.p);
              tones.push(info.t);
            }
          }
        }
        
        segments.push({
          w: token,
          p: pys.join(' '),
          t: tones,
          han: true,
          override: override ? Object.keys(override).join(',') : null
        });
      } else {
        for (const ch of token) {
          if (ch.trim()) {
            segments.push({ w: ch, p: '', t: [], han: false });
          }
        }
      }
      charPointer += tokenLen;
    }

    res.json({ 
      segments, 
      ok: true, 
      engine: 'intl+dict500-v2',
      _debug: {
        mergeCount: MERGE_SORTED.length,
        polyCount: Object.keys(POLY_NORM).length,
        tokenCount: mergedTokens.length
      }
    });
  } catch (e) {
    console.error('segment error:', e);
    res.status(500).json({ error: e.message });
  }
}
