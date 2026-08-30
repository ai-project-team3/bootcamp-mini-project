// 기획안 §13-3 — 단계가 바뀔 때 이름이 화면을 가로질러 쓸려 들어온다.
// 0.6초를 넘기지 않는다. 아홉 단계라 전환이 길면 그게 다 진행 시간이 된다.
//
// 이름 밑에 한 줄을 같이 띄운다. 어차피 화면을 가리고 있는 시간이라 여기서
// 규칙을 말하면 시간이 더 들지 않는다 — 눈치 게임과 라이어 게임은 안 해본
// 사람이 있을 수 있고, 그 사람이 규칙을 처음 보는 자리가 게임 도중이면 늦다.
export default function StageIntro({ label, rule }) {
  return (
    <div className="stage-intro" role="presentation">
      <span>{label}</span>
      {rule && <small>{rule}</small>}
    </div>
  )
}
