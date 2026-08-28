/**
 * Games that bring their own room system, so a player walks straight in.
 *
 * Shaped like the entries in `data/gameDemo/gameDemoData.js` so the games hub
 * can lay both kinds out with the same card, and grouped the same way — both
 * of these read a player's persona, so they belong with the persona games.
 */
export const STANDALONE_GAMES = [
  {
    id: 'mafia',
    path: '/games/mafia',
    group: 'Persona Games',
    emoji: '🕵️',
    title: '마피아',
    desc: '성향으로 직업이 정해지는 마피아 (4~8인)',
    standalone: true,
  },
  {
    id: 'marble',
    path: '/games/marble',
    group: 'Persona Games',
    emoji: '💞',
    title: '커플 브루마블',
    desc: '성향으로 만든 보드를 돌며 서로 맞히기 (2~8인)',
    standalone: true,
  },
]
