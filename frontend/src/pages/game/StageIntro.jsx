// 기획안 §13-3 — 단계가 바뀔 때 이름이 화면을 가로질러 쓸려 들어온다.
// 0.6초를 넘기지 않는다. 아홉 단계라 전환이 길면 그게 다 진행 시간이 된다.
export default function StageIntro({ label }) {
  return (
    <div className="stage-intro" role="presentation">
      <span>{label}</span>
    </div>
  )
}
