// Plan doc §3: two-tier category structure (group/couple -> TP·MT/DY·NT)
export const CATEGORY_GROUPS = [
  {
    id: 'GROUP',
    label: '단체',
    size: '3~8인',
    leaves: [
      {
        code: 'TP',
        label: '팀플',
        desc: '같이 뭘 만들어야 하는 사이',
        size: '3~8인',
        frame: 'MANY',
      },
      {
        code: 'MT',
        label: '합석',
        desc: '오늘 처음 만난 남녀',
        size: '4~8인',
        frame: 'MANY',
      },
    ],
  },
  {
    id: 'COUPLE',
    label: '연인',
    size: '2인',
    leaves: [
      {
        code: 'DY',
        label: '낮',
        desc: '사귄 지 얼마 안 된 사이',
        size: '2인',
        frame: 'PAIR',
      },
      {
        code: 'NT',
        label: '밤',
        desc: '둘만 보는 화면',
        size: '2인',
        frame: 'PAIR',
      },
    ],
  },
]

export const DEFAULT_CATEGORY = CATEGORY_GROUPS[0].leaves[0]

export function findCategoryByCode(code) {
  for (const group of CATEGORY_GROUPS) {
    const leaf = group.leaves.find((l) => l.code === code)
    if (leaf) return leaf
  }
  return DEFAULT_CATEGORY
}
