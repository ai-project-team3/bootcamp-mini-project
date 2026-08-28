// 얼음땡 기획안 §7. 백엔드 app/constants.py의 TYPES와 동일하게 유지한다.
// image는 public/types/ 아래 파일. 없으면 화면이 symbol로 대신 그린다.
export const TYPES = {
  T1: { name: '셀프 사회자', subtitle: '아무도 안 시켰는데 진행도 발언도 판단도 본인이', color: '#FF2E88', symbol: '🎤', image: '/types/T1.png' },
  T2: { name: '직구 마스터', subtitle: '할 말은 다 하는데 남 표정은 안 봅니다', color: '#FF6B35', symbol: '⚾', image: '/types/T2.png' },
  T3: { name: '뒷자리 미어캣', subtitle: '조용히 보다가 결정은 제일 먼저 냅니다', color: '#FFC531', symbol: '👀', image: '/types/T3.png' },
  T4: { name: '무면허 라이더', subtitle: '앞은 안 보고 액셀만 밟습니다', color: '#FF4757', symbol: '🏍️', image: '/types/T4.png' },
  T5: { name: '방구석 박사', subtitle: '다 알고 다 말하는데 정작 본인은 안 나섭니다', color: '#7B61FF', symbol: '🎓', image: '/types/T5.png' },
  T6: { name: 'MZ 응원단장', subtitle: '판은 못 읽는데 텐션은 제일 높습니다', color: '#C6FF4E', symbol: '📣', image: '/types/T6.png' },
  T7: { name: '은둔형 명탐정', subtitle: '말 한마디 없이 다 맞혔습니다', color: '#2E86FF', symbol: '🔍', image: '/types/T7.png' },
  T8: { name: '평화성애자', subtitle: '아무하고도 안 부딪혔습니다. 아무것도 안 해서요', color: '#7FD8C9', symbol: '🕊️', image: '/types/T8.png' },
}

export const ABILITY_LABELS = {
  DOM: '주도력',
  SPD: '순발력',
  EXP: '표현력',
  EMP: '공감력',
  OBS: '관찰력',
}

export const ABILITY_ORDER = ['DOM', 'SPD', 'EXP', 'EMP', 'OBS']
