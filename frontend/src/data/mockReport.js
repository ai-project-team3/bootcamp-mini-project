// Dummy data copied from the plan doc §10 pipeline example (Jonghoon · TP).
// No real axis calculation / LLM report generation — layout check only.
export const MOCK_REPORT = {
  name: '종훈',
  type: {
    name: '선빵 불도저',
    quote: '일단 만들어 왔어요',
    quoteSub: '아무도 시킨 적 없음',
    strength: '아무도 안 움직일 때 첫 삽을 뜬다',
  },
  badges: ['마이웨이', '첫인상 배신자'],
  axes: [
    { code: 'DOM', label: '판을 끌고 간다', self: 4.7, impression: 3.9 },
    { code: 'SPD', label: '일단 지른다', self: 4.5, impression: 4.0 },
    { code: 'EXP', label: '할 말은 한다', self: 4.1, impression: 2.8 },
    { code: 'PLN', label: '정해두고 움직인다', self: 1.2, impression: 1.8 },
    { code: 'OPN', label: '새로운 방식', self: 3.8, impression: 3.5 },
    { code: 'EMP', label: '사람 먼저', self: 2.0, impression: 2.2 },
    { code: 'TP_DDL', label: '나눠서 미리', self: 1.0, impression: 1.0 },
    { code: 'TP_CFL', label: '그 자리에서 짚는다', self: 4.2, impression: 4.0 },
    { code: 'TP_ROL', label: '맡는다', self: 4.5, impression: 4.3 },
  ],
  compat: [
    { with: '서연', grade: 'S', total: 0.84 },
    { with: '지호', grade: 'F', total: 0.22 },
    { with: '민준', grade: 'B', total: 0.51 },
    { with: '유나', grade: 'A', total: 0.7 },
  ],
  gameLog: [
    { stage: 1, fact: "소수파 3회. '민초'는 6명 중 혼자" },
    { stage: 2, fact: '텔레파시 1/5' },
    { stage: 3, fact: "'해외 산 적 있다' — 3명이 나도" },
  ],
  narrative:
    '주도 4.7에 계획 1.2. 팀에서 가장 먼저 움직이고 가장 나중에 문서를 엽니다. 1단계에서 소수파를 세 번 골랐고 그중 하나는 6명 중 혼자였습니다.',
}

export const GRADE_LABEL = {
  S: '소울메이트',
  A: '척하면 척',
  B: '무난',
  C: '노력형',
  F: '상극',
}
