import { pinyin } from 'pinyin-pro';

const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'word' });

const MERGE = [
  '同生共死','百貨公司','馬馬虎虎','七手八腳','一清二楚','三心二意',
  '莫名其妙','亂七八糟','興高采烈','千方百計','一心一意',
  '有時候','的時候','一個人','為什麼','對不起','不好意思','沒關係',
  '台灣人','越南人','中國人','美國人','日本人','韓國人','外國人',
  '怎麼樣','怎麼辦','多少錢','什麼事','什麼時候','什麼東西',
  '差不多','不一樣','有一天','每一次','每個人','一個月','兩個月',
  '台灣話','火車站','高鐵站','捷運站','公車站','圖書館','電影院',
  '便利商店','小吃店','飲料店','不知道','不認識','看得懂','聽得懂',
  '很喜歡','很開心','很高興','很生氣','很難過','很無聊','很有意思',
  '但是','有時','時候','已經','幾個','特別','晚上','一個','個人',
  '我們','你們','他們','大家','什麼','怎麼','因為','所以','如果',
  '雖然','不過','可是','然後','後來','以後','以前','今天','明天',
  '昨天','早上','中午','下午','這個','那個','哪個','每個','一些',
  '這些','那些','這裡','那裡','哪裡','裡面','外面','上面','下面',
  '餐廳','學校','公司','醫院','咖啡','紅茶','綠茶','奶茶','可樂','果汁',
  '米飯','麵條','包子','餃子','水餃','炒飯','炒麵','喜歡','討厭',
  '好吃','難吃','好喝','工作','唸書','讀書','寫字','說話','聊天',
  '逛街','旅行','游泳','跑步','知道','覺得','認為','希望','打算',
  '準備','決定','忘記','記得','想起','看見','聽見','看到','聽到',
  '遇到','碰見','發現','感覺','開心','難過','生氣','高興','擔心',
  '緊張','無聊','有趣','好玩','好看','漂亮','可愛','溫柔','聰明',
  '努力','認真','小心','星期','禮拜','週末','假日','生日','過年',
  '台灣','臺灣','中國','美國','越南','日本','韓國','香港','台北',
  '爸爸','媽媽','哥哥','弟弟','姐姐','妹妹','爺爺','奶奶','叔叔',
  '阿姨','東西','事情','問題','方法','辦法','地方','時間','日子',
  '機會','理由','心情','想法','意見','故事','消息','新聞','廣告',
  '節目','電影','手機','電腦','電視','冰箱','冷氣','房間','客廳',
  '廚房','廁所','衣服','鞋子','褲子','帽子','袋子','錢包','鑰匙',
  '眼鏡','手錶','雨傘','朋友','同學','同事','老闆','客人','醫生',
  '護士','警察','司機','店員'
];

const MERGE_SORTED = [...MERGE].sort((a, b) => b.length - a.length);

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

export default async function handler(req, res) {
  const q = req.query.q || '';
  if (!q) return res.json({ segments: [], ok: false });

  try {
    // Bật polyphone để nhận diện đa âm theo ngữ cảnh
    const items = pinyin(q, { 
      toneType: 'symbol', 
      type: 'all',
      mode: 'polyphone'  // ← QUAN TRỌNG
    });

    const charMap = new Map();
    let idx = 0;
    for (const it of items) {
      const origin = it.origin || '';
      for (let k = 0; k < Math.max(origin.length, 1); k++) {
        charMap.set(idx + k, {
          p: k === 0 ? (it.pinyin || '') : '',
          t: k === 0 ? (it.num || 5) : 5,
          isHan: !!it.isZh
        });
      }
      idx += Math.max(origin.length, 1);
    }

    const rawTokens = Array.from(segmenter.segment(q)).map(x => x.segment);
    const mergedTokens = mergeWords(rawTokens);

    const segments = [];
    let charPointer = 0;

    for (const token of mergedTokens) {
      const tokenLen = token.length;
      const hasAnyHan = /[\u4e00-\u9fa5]/.test(token);

      if (hasAnyHan) {
        const pys = [];
        const tones = [];
        for (let i = 0; i < tokenLen; i++) {
          const info = charMap.get(charPointer + i);
          if (info && info.isHan && info.p) {
            pys.push(info.p);
            tones.push(info.t);
          }
        }
        segments.push({
          w: token,
          p: pys.join(' '),
          t: tones,
          han: true
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

    res.json({ segments, ok: true, engine: 'intl+pinyin-polyphone' });
  } catch (e) {
    res.status(500).json({ error: e.message, ok: false });
  }
}
