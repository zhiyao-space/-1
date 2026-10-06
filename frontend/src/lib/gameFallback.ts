import type { GameSession, TrpgState, TurtleState } from '../store/games'

export const FALLBACK_TRPG_EVENTS: string[] = [
  '你在{scene}附近留意到一条被踩出来的小径，顺着走下去，远处隐约有火光晃动。',
  '一阵怪风掠过{scene}，你的衣角被什么勾住了——低头一看，是一枚刻着陌生纹章的铜牌。',
  '你在{scene}的墙角发现一个半埋的木箱，撬开后得到一件能派上用场的东西。',
  '头顶传来石块摩擦的闷响，{scene}深处似乎有什么东西醒了。你屏住呼吸，慢慢后退。',
  '你在{scene}遇到一个裹着斗篷的旅人，他压低声音警告你前面有危险，随后消失在拐角。',
  '一条漆黑的水渠横在{scene}前，水面上漂着几片新鲜的落叶——说明有人不久前从这里经过。',
  '你在{scene}捡到一张浸了水的残页，字迹模糊，但能辨认出「不要回头」四个字。',
  '地面突然塌陷了一角，你险些跌进陷阱。爬起来时，你发现陷阱底部的骨架手里攥着一把钥匙。',
  '远处传来钟声，一共响了七下。{scene}的光线暗了下来，空气里多了一股铁锈味。',
  '你在{scene}的祭坛前驻足，供品竟像是昨夜才摆放的。你不敢久留，加快了脚步。',
  '一群乌鸦从{scene}的枯树上惊起，朝着同一个方向飞去。你决定跟着它们。',
  '你在一个背包里翻出几样物资和一张手绘地图，地图上圈出的位置正是你脚下的{scene}。',
  '寒意从脚底爬上来，你的手电开始闪烁。你感觉有视线落在自己背上，但回头只有风。',
  '你在{scene}发现一扇虚掩的门，门轴上的油还新鲜——有人希望你从这里进去。',
]

export interface FallbackTurtle {
  puzzle: string
  truth: string
  yesKeywords: string[]
  noKeywords: string[]
  closeKeywords: string[]
  coreKeywords: string[]
}

export const FALLBACK_TURTLES: FallbackTurtle[] = [
  {
    puzzle: '他推开家门，看到桌上摆着一碗热汤，转身就报了警。',
    truth: '他和双胞胎兄弟长相一样。桌上摆热汤说明"他"已经回家过一次了——可他根本没回过家，说明屋里还有另一个长得一样的人，而真正的家人已经遇害，做饭的是凶手。',
    yesKeywords: ['双胞胎', '长得一样', '另一个人', '不是他', '兄弟'],
    noKeywords: ['汤有毒', '烫', '妻子做的', '他自己做的'],
    closeKeywords: ['有人来过', '冒充', '家人出事'],
    coreKeywords: ['双胞胎', '长得一样', '冒充'],
  },
  {
    puzzle: '女人在深夜给陌生人打电话，对方一句话没说就挂了，女人却安心地睡着了。',
    truth: '她独居，深夜听到楼下有动静疑似有贼。她打电话给朋友，故意说"帮我带夜宵上来"，如果窃贼听到没动静会以为家里只有她一人。朋友沉默是因为听懂了她的话外音，直接报了警。',
    yesKeywords: ['独居', '报警', '朋友听懂', '暗示', '小偷'],
    noKeywords: ['男朋友', '电话骚扰', '失眠'],
    closeKeywords: ['有人在楼下', '话外音', '求救'],
    coreKeywords: ['报警', '小偷', '暗示'],
  },
  {
    puzzle: '男人走进一家餐厅，点了一份海鸥汤，喝了一口就冲出餐厅自杀了。',
    truth: '他曾在海难中漂流，同伴喂他喝"海鸥汤"活了下来。如今他尝到真正的海鸥汤味道，发现当年喝的根本不是海鸥——是同伴割下的自己的肉。他无法承受真相，选择结束生命。',
    yesKeywords: ['海难', '同伴', '人肉', '当年', '漂流'],
    noKeywords: ['食物中毒', '过敏', '汤里有毒'],
    closeKeywords: ['以前喝过', '味道不对', '海上'],
    coreKeywords: ['海难', '同伴的肉', '当年喝的'],
  },
  {
    puzzle: '雨夜，男人在公交站看到一个人撑伞走过，第二天他失业了。',
    truth: '他是天气预报台的实习生，播报"明日晴"后看到有人雨夜提前备伞出门，意识到自己搞错了天气系统，主动认错辞职了。',
    yesKeywords: ['天气预报', '播报', '认错', '辞职', '实习'],
    noKeywords: ['迟到', '打架', '得罪老板'],
    closeKeywords: ['天气', '雨', '工作失误'],
    coreKeywords: ['天气预报', '辞职', '认错'],
  },
  {
    puzzle: '她每天睡前都会数三个数字才敢关灯，直到有一天她数了四个。',
    truth: '她独居，睡前敲三下墙，隔壁邻居会敲回来回应，她才安心。那天她敲三下后没人回应，她就自己多敲了一下假装是邻居，给自己壮胆——因为隔壁出事了。',
    yesKeywords: ['独居', '邻居', '敲墙', '回应', '隔壁'],
    noKeywords: ['失眠', '数羊', '强迫症'],
    closeKeywords: ['习惯', '安全感', '出事'],
    coreKeywords: ['敲墙', '邻居', '没人回应'],
  },
  {
    puzzle: '男人在沙漠里发现一个装满水的背包，却哭着离开了。',
    truth: '那背包是他自己的——他和同伴迷路时把最后的水留给了走出去求救的同伴。发现背包原封不动，说明同伴没能走出沙漠，或者早已出事。',
    yesKeywords: ['同伴', '迷路', '自己的', '求救', '去世'],
    noKeywords: ['水有毒', '装错了', '他讨厌水'],
    closeKeywords: ['似曾相识', '有人死了', '沙漠求生'],
    coreKeywords: ['同伴', '求救', '自己的背包'],
  },
]

function roll20(): number {
  return Math.floor(Math.random() * 20) + 1
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function localTurn(session: GameSession, userText: string): { narrative: string; patch: Partial<TrpgState> } {
  const st = session.trpg as TrpgState
  const dice = roll20()
  const success = dice >= 11
  const advance = Math.floor(Math.random() * 10) + 6
  const progress = Math.min(100, st.progress + advance)
  const events: string[] = []
  events.push(`（离线模式）你掷出了 ${dice} 点，${success ? '行动顺利' : '过程磕磕绊绊'}。`)
  events.push(pick(FALLBACK_TRPG_EVENTS).replaceAll('{scene}', st.scene || '此地'))
  let hp = st.hp
  if (!success && Math.random() < 0.5) {
    hp = Math.max(0, hp - 1)
    events.push('你受了一点擦伤，体力略有下降。')
  }
  const items = [...st.items]
  if (success && Math.random() < 0.35) {
    const found = pick(['旧铜钥匙', '一卷绷带', '手绘地图', '小刀', '火折子'])
    items.push(found)
    events.push(`你把「${found}」收进了行囊。`)
  }
  if (progress >= 100) events.push('前方的光越来越亮——你隐约觉得，出口就在附近了。')
  const patch: Partial<TrpgState> = { hp, items, progress, scene: st.act }
  return { narrative: events.join('\n'), patch }
}

export function localTurtleTurn(
  session: GameSession,
  userText: string
): { narrative: string; patch: Partial<TurtleState>; solved?: boolean } {
  const st = session.turtle as TurtleState
  const data = FALLBACK_TURTLES.find((t) => t.puzzle === st.puzzle)
  const text = userText.trim()
  const isGuess = /猜|真相|答案|汤底|真相是/.test(text) || text.length > 22
  if (isGuess && data) {
    const hit = data.coreKeywords.some((k) => text.includes(k))
    if (hit) {
      return {
        narrative: '（离线模式）"……你把关键都点到了。"它盯着你看了几秒，缓缓点头，"没错，真相就是这样。"于是它把一切原原本本讲了出来。',
        patch: { solved: true, revealed: st.truth },
        solved: true,
      }
    }
    if (data.closeKeywords.some((k) => text.includes(k))) {
      return { narrative: '（离线模式）"接近了，但差一口气。"它摇摇头，"往刚才那个方向再想想。"', patch: {} }
    }
    return { narrative: '（离线模式）"方向偏了。"它敲了敲桌面，"再听一遍汤面，注意那些容易被忽略的细节。"', patch: {} }
  }
  if (data) {
    if (data.yesKeywords.some((k) => text.includes(k))) {
      return { narrative: '（离线模式）"是。"它简短地确认，目光里多了一丝赞许。', patch: {} }
    }
    if (data.noKeywords.some((k) => text.includes(k))) {
      return { narrative: '（离线模式）"不是。"它摇头，"这条线索堵死了，换个角度。"', patch: {} }
    }
    if (data.closeKeywords.some((k) => text.includes(k))) {
      return { narrative: '（离线模式）"算是擦边。"它顿了顿，"离真相近了一步，但核心还在别处。"', patch: {} }
    }
  }
  return { narrative: '（离线模式）"无关。"它摊了摊手，"这个问题对解开汤面帮助有限。"', patch: {} }
}
