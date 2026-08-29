// 얼음땡 기획안 §6. 백엔드 app/constants.py의 TYPES와 동일하게 유지한다.
// O1(색+심볼) 미확정이라 테마 팔레트 기반 임시값.
export const TYPES = {
  T1: { name: '즉석 팀장', subtitle: '묻지도 않았는데 회의를 이끈다', color: '#E85D4E', symbol: '🧭' },
  T2: { name: '마이크 독점러', subtitle: '남 얘기 끝나기 전에 다음 말 준비 중', color: '#F2A93B', symbol: '📢' },
  T3: { name: '그림자 결재권자', subtitle: '말은 없어도 결정은 이 사람 몫', color: '#4E6FE8', symbol: '⚖️' },
  T4: { name: '불도저', subtitle: '질문은 안 받고 통보만 한다', color: '#C24EE8', symbol: '🚀' },
  T5: { name: '만능 관전러', subtitle: '분석은 완벽한데 참전은 안 한다', color: '#2FB6A3', symbol: '🎙️' },
  T6: { name: '분위기 메이커', subtitle: '무슨 얘기였는진 몰라도 일단 웃겼다', color: '#F2586B', symbol: '🎉' },
  T7: { name: '인간 CCTV', subtitle: '존재감은 없어도 다 기억하고 있다', color: '#5B5FC7', symbol: '📹' },
  T8: { name: '인간 배경', subtitle: '오늘 여기 있었다는 것만은 확실하다', color: '#8A8F98', symbol: '🛋️' },
}

export const ABILITY_LABELS = {
  DOM: '주도력',
  SPD: '순발력',
  EXP: '표현력',
  EMP: '공감력',
  OBS: '관찰력',
}

export const ABILITY_ORDER = ['DOM', 'SPD', 'EXP', 'EMP', 'OBS']
