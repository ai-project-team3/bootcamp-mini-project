// Plan doc §9-2 (MANY) / §9-3 (PAIR) stage flow.
// No real game logic here — just metadata for entry-screen routing.
export const STAGES_BY_FRAME = {
  MANY: [
    { n: 1, title: '이지선다', desc: '취향 이지선다 동시 공개', duration: '4분' },
    { n: 2, title: '텔레파시', desc: '매치율 상위 짝과 같은 답 맞히기', duration: '5분' },
    { n: 3, title: '나 이런 사람이야', desc: '익명으로 내 얘기 하나 남기기', duration: '5분' },
    { n: 4, title: '누가 했을까', desc: '방금 그 얘기, 누구 얘기였을까', duration: '5분' },
  ],
  PAIR: [
    { n: 1, title: '동시 선택', desc: '같은 질문에 동시에 답하기', duration: '4분' },
    { n: 2, title: '몰래 예측', desc: '상대는 뭐라고 답했을까', duration: '5분' },
    { n: 3, title: '한 걸음', desc: '오프라인 액션 + 직후 온라인 응답', duration: '5분' },
    { n: 4, title: '마지막 선택', desc: '함께 갈지, 혼자 갈지', duration: '3분' },
  ],
}

export function getStages(frame) {
  return STAGES_BY_FRAME[frame] ?? STAGES_BY_FRAME.MANY
}

export function getStage(frame, n) {
  const stages = getStages(frame)
  return stages.find((s) => s.n === Number(n)) ?? stages[0]
}
