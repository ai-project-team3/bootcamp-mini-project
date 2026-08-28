/**
 * Games that bring their own room system, so a player can walk straight in.
 *
 * Kept beside the demo catalog in `data/gameDemo/gameDemoData.js` so the games
 * hub reads both from data rather than hardcoding cards in the screen.
 */
export const STANDALONE_GAMES = [
  {
    id: 'mafia',
    path: '/games/mafia',
    emoji: '🕵️',
    title: '마피아',
    desc: '성향 데이터로 직업이 정해지는 아이스브레이킹 마피아',
    players: '4~8인',
  },
  {
    id: 'marble',
    path: '/games/marble',
    emoji: '💞',
    title: '커플 브루마블',
    desc: '성향으로 만든 보드를 돌며 서로를 맞히는 게임',
    players: '2~8인',
  },
]
