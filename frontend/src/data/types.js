// 얼음땡 기획안 §6. 백엔드 app/constants.py의 TYPES와 동일하게 유지한다.
// O1(색+심볼) 미확정이라 테마 팔레트 기반 임시값.
export const TYPES = {
  T1: { name: '판 짜는 사람', subtitle: '다 보고 다 말하고 다 정한다', color: '#E85D4E', symbol: '🧭' },
  T2: { name: '확성기', subtitle: '말은 제일 많은데 남 얘긴 안 들림', color: '#F2A93B', symbol: '📢' },
  T3: { name: '뒷자리 판사', subtitle: '본인은 안 나서는데 판결은 다 내림', color: '#4E6FE8', symbol: '⚖️' },
  T4: { name: '직진', subtitle: '말은 아끼고 결정은 안 아낀다', color: '#C24EE8', symbol: '🚀' },
  T5: { name: '해설위원', subtitle: '다 알면서 정작 자기 패는 안 냄', color: '#2FB6A3', symbol: '🎙️' },
  T6: { name: '분위기 담당', subtitle: '무슨 말인지는 몰라도 재밌음', color: '#F2586B', symbol: '🎉' },
  T7: { name: 'CCTV', subtitle: '말은 없는데 다 보고 있었음', color: '#5B5FC7', symbol: '📹' },
  T8: { name: '정직한 무임승차', subtitle: '오늘은 그냥 앉아 있었음', color: '#8A8F98', symbol: '🛋️' },
}

export const ABILITY_LABELS = {
  DOM: '주도력',
  SPD: '순발력',
  EXP: '표현력',
  EMP: '공감력',
  OBS: '관찰력',
}

export const ABILITY_ORDER = ['DOM', 'SPD', 'EXP', 'EMP', 'OBS']
