export const DEMO_PLAYERS = [
  { id: 'seojun', name: '서준', emoji: '⚡' },
  { id: 'yuna', name: '유나', emoji: '🧭' },
  { id: 'jian', name: '지안', emoji: '💬' },
  { id: 'daon', name: '다온', emoji: '👀' },
]

export const DEMO_PERSONAS = {
  seojun: { title: '즉흥적인 해결사', traits: ['빠른 결정', '즉흥', '도전'] },
  yuna: { title: '신중한 플래너', traits: ['계획', '확인', '안정'] },
  jian: { title: '분위기 연결자', traits: ['조율', '표현', '관계'] },
  daon: { title: '차분한 관찰자', traits: ['관찰', '독립', '차분'] },
}

export const IMPOSTOR_QUESTIONS_PER_ROUND = 3

export const FLAVOR_GAME_IDS = [
  'persona-impostor',
  'persona-prediction',
  'liar',
  'charades',
  'telepathy',
]

export const FLAVORED_GAME_CONTENT = {
  'persona-impostor': {
    mild: [
      { text: '여행 중 예약했던 식당이 갑자기 휴무입니다. 어떻게 할 건가요?', options: ['근처 괜찮아 보이는 곳에 바로 들어간다.', '저장해 둔 다른 후보를 확인한다.', '일행에게 어디 갈지 물어본다.'] },
      { text: '모임 시간이 갑자기 두 시간 미뤄졌습니다. 무엇을 할 건가요?', options: ['근처를 구경하며 기다린다.', '집에 다녀올 수 있는지 계산한다.', '친구 한 명을 먼저 불러낸다.'] },
      { text: '친구가 생일 선물을 직접 골라 달라고 합니다. 무엇을 고를 건가요?', options: ['당장 필요한 실용적인 물건을 고른다.', '오래 기억에 남을 특별한 물건을 고른다.', '같이 즐길 수 있는 경험을 고른다.'] },
      { text: '주말 약속이 갑자기 취소되었습니다. 남은 하루를 어떻게 보낼 건가요?', options: ['바로 다른 약속을 잡는다.', '원래 계획했던 일을 혼자 한다.', '집에서 아무것도 하지 않고 쉰다.'] },
      { text: '친구들과 여행지를 정하는데 의견이 모두 다릅니다. 어떻게 할 건가요?', options: ['내가 가고 싶은 곳을 적극적으로 설득한다.', '장단점을 정리한 뒤 투표한다.', '다른 사람들이 가장 원하는 곳을 따른다.'] },
    ],
    spicy: [
      { text: '데이트가 끝나려는데 상대가 “조금 더 같이 있을래?”라고 묻습니다. 어떻게 할 건가요?', options: ['근처 조용한 장소를 찾아본다.', '다음 날 일정을 먼저 확인한다.', '상대가 무엇을 하고 싶은지 묻는다.'] },
      { text: '나란히 걷던 상대가 슬쩍 손을 내밉니다. 어떻게 할 건가요?', options: ['자연스럽게 바로 손을 잡는다.', '웃으면서 정말 잡아도 되는지 확인한다.', '장난스럽게 왜 그러냐고 물어본다.'] },
      { text: '새벽에 호감 있는 사람에게 “보고 싶다”는 연락이 왔습니다. 어떻게 할 건가요?', options: ['지금 만날 수 있는지 묻는다.', '전화를 걸어 목소리를 듣는다.', '아침까지 기다렸다가 답한다.'] },
      { text: '연인과 다툰 뒤 상대가 먼저 포옹하며 화해하자고 합니다. 어떻게 할 건가요?', options: ['포옹을 받아주고 분위기부터 푼다.', '먼저 서로의 생각을 이야기한다.', '농담으로 긴장을 풀고 천천히 대화한다.'] },
      { text: '데이트 중 분위기가 좋아졌을 때 먼저 하기 편한 행동은 무엇인가요?', options: ['자연스럽게 손을 내민다.', '어깨에 살짝 기대본다.', '상대의 반응을 조금 더 지켜본다.'] },
      { text: '상대가 “오늘 나한테 설렌 순간이 있었어?”라고 묻습니다. 어떻게 답할 건가요?', options: ['있었던 순간을 바로 말해준다.', '상대에게 먼저 같은 질문을 돌려준다.', '부끄러워서 장난으로 넘어간다.'] },
    ],
  },
  'persona-prediction': {
    mild: [
      { hostId: 'yuna', text: '갑자기 하루의 자유 시간이 생겼다.', options: ['집에서 푹 쉰다.', '가보고 싶던 장소에 혼자 간다.', '친구에게 연락해 즉석 약속을 잡는다.', '밀린 일을 모두 끝낸다.'] },
      { hostId: 'jian', text: '친구들과 여행 계획을 세우기 시작했다.', options: ['교통편부터 바로 예약한다.', '예산과 일정을 표로 정리한다.', '모두가 원하는 활동부터 묻는다.', '여행 후기와 사진을 천천히 찾아본다.'] },
      { hostId: 'daon', text: '처음 보는 사람이 많은 모임에 도착했다.', options: ['먼저 여러 사람에게 말을 건다.', '아는 사람 옆에서 자연스럽게 합류한다.', '분위기와 사람들을 먼저 관찰한다.', '모두 함께할 수 있는 게임을 제안한다.'] },
      { hostId: 'seojun', text: '친구가 갑자기 고민 상담을 요청했다.', options: ['현실적인 해결 방법을 제시한다.', '판단하지 않고 끝까지 들어준다.', '밖으로 데리고 나가 기분을 전환시킨다.', '생각을 정리할 시간을 준 뒤 다시 연락한다.'] },
      { hostId: 'yuna', text: '계획에 없던 여행 제안을 받았다.', options: ['날짜만 맞으면 바로 수락한다.', '비용과 일정을 먼저 계산한다.', '같이 가는 사람들의 의견을 확인한다.', '이번에는 거절하고 다음 기회를 잡는다.'] },
    ],
    spicy: [
      { hostId: 'yuna', text: '은은한 조명 아래 단둘이 홈 데이트를 하게 됐다.', options: ['함께 요리하며 자연스럽게 시간을 보낸다.', '와인과 영화를 준비해 분위기를 만든다.', '음악을 틀고 오래 대화한다.', '밖으로 나가 늦은 산책을 제안한다.'] },
      { hostId: 'seojun', text: '데이트가 끝난 뒤 상대가 “조금 더 같이 있고 싶다”고 말한다.', options: ['나도 그렇다고 솔직하게 표현한다.', '근처에서 조금 더 걸을 장소를 찾는다.', '다음 데이트를 바로 약속하고 집에 간다.', '다음 날 일정을 확인한 뒤 결정한다.'] },
      { hostId: 'jian', text: '연인과 다툰 뒤 먼저 화해해야 한다.', options: ['솔직한 대화부터 시작한다.', '포옹해도 되는지 먼저 물어본다.', '손편지나 작은 선물로 마음을 표현한다.', '서로 진정할 시간을 가진 뒤 연락한다.'] },
      { hostId: 'daon', text: '호감 있는 사람의 귓가에 한마디를 속삭일 수 있다.', options: ['“오늘 계속 보고 싶었어.”', '“너랑 있으면 정말 편해.”', '“조금 더 가까이 있어도 돼?”', '말하지 않고 웃으며 바라본다.'] },
      { hostId: 'yuna', text: '상대가 갑자기 손깍지를 끼었다.', options: ['자연스럽게 손을 마주 잡는다.', '장난으로 놀리며 분위기를 푼다.', '부끄러워하면서도 그대로 있는다.', '괜찮은지 서로의 반응을 확인한다.'] },
      { hostId: 'jian', text: '친구들이 최근 보낸 가장 설레는 메시지를 보여 달라고 한다.', options: ['당당하게 보여준다.', '일부만 가리고 보여준다.', '내용만 말로 설명한다.', '끝까지 비밀로 한다.'] },
    ],
  },
  liar: {
    mild: [
      { word: '붕어빵', category: '음식' },
      { word: '마라탕', category: '음식' },
      { word: '회전초밥', category: '음식' },
      { word: '놀이공원', category: '장소' },
      { word: '노래방', category: '장소' },
      { word: '제주도', category: '장소' },
      { word: '편의점', category: '장소' },
      { word: '워터파크', category: '장소' },
      { word: '캠핑', category: '활동' },
      { word: '보드게임', category: '놀거리' },
      { word: '볼링', category: '활동' },
      { word: '방탈출', category: '놀거리' },
    ],
    spicy: [
      { word: '커플링', category: '물건' },
      { word: '소개팅', category: '만남' },
      { word: '러브레터', category: '물건' },
      { word: '애칭', category: '표현' },
      { word: '귓속말', category: '행동' },
      { word: '커플 사진', category: '기록' },
      { word: '프러포즈', category: '행동' },
      { word: '립스틱 자국', category: '흔적' },
      { word: '손등 입맞춤', category: '행동' },
      { word: '청첩장', category: '문서' },
    ],
  },
  charades: {
    mild: [
      { emoji: '🐘', word: '코끼리', category: '동물', accepted: ['코끼리 흉내'] },
      { emoji: '🏊', word: '수영', category: '스포츠', accepted: ['헤엄치기'] },
      { emoji: '🍜', word: '라면 먹기', category: '행동', accepted: ['면 먹기'] },
      { emoji: '🎸', word: '기타 연주', category: '취미', accepted: ['기타 치기'] },
      { emoji: '🏀', word: '농구', category: '스포츠', accepted: ['농구하기'] },
      { emoji: '📷', word: '사진 찍기', category: '행동', accepted: ['카메라 촬영'] },
      { emoji: '🪥', word: '양치', category: '행동', accepted: ['이 닦기'] },
      { emoji: '🦟', word: '모기 잡기', category: '행동', accepted: ['벌레 잡기'] },
      { emoji: '🎢', word: '롤러코스터', category: '놀이기구', accepted: ['놀이기구 타기'] },
      { emoji: '🔥', word: '뜨거운 음식', category: '상황', accepted: ['뜨거운 것 먹기'] },
      { emoji: '🌧️', word: '비 맞고 뛰기', category: '상황', accepted: ['빗속 달리기'] },
      { emoji: '🧳', word: '무거운 가방', category: '상황', accepted: ['무거운 짐 들기'] },
    ],
    spicy: [
      { emoji: '🤝', word: '손깍지', category: '스킨십', accepted: ['손깍지 끼기'] },
      { emoji: '🤗', word: '포옹', category: '스킨십', accepted: ['안기', '안아주기'] },
      { emoji: '🗣️', word: '귓속말', category: '스킨십', accepted: ['귀에 속삭이기'] },
      { emoji: '😊', word: '볼 뽀뽀', category: '스킨십', accepted: ['볼에 입맞춤'] },
      { emoji: '🫶', word: '어깨 기대기', category: '스킨십', accepted: ['어깨에 기대기'] },
      { emoji: '💋', word: '손등 입맞춤', category: '스킨십', accepted: ['손등에 뽀뽀'] },
      { emoji: '📸', word: '커플 사진', category: '연애 행동', accepted: ['커플 사진 찍기'] },
      { emoji: '💍', word: '반지 끼워주기', category: '연애 행동', accepted: ['반지 선물'] },
      { emoji: '💪', word: '팔짱', category: '스킨십', accepted: ['팔짱 끼기'] },
      { emoji: '💌', word: '손편지', category: '연애 행동', accepted: ['편지 건네기', '손편지 주기'] },
      { emoji: '💐', word: '꽃다발 고백', category: '연애 행동', accepted: ['꽃을 건네며 고백하기'] },
      { emoji: '🚶', word: '손잡고 걷기', category: '스킨십', accepted: ['손을 잡고 산책하기'] },
    ],
  },
  telepathy: {
    mild: [
      '대표적인 야식 메뉴 하나는?',
      '여름 하면 떠오르는 대표 과일은?',
      '여행 갈 때 꼭 챙기는 물건 하나는?',
      '비 오는 날 가장 생각나는 음식은?',
      '편의점에서 가장 먼저 떠오르는 음식은?',
      '놀이공원에서 가장 먼저 타고 싶은 놀이기구는?',
      '스트레스받을 때 가장 생각나는 음식은?',
      '갑자기 휴일이 생기면 가장 먼저 하고 싶은 것은?',
      '영화관에서 가장 먼저 떠오르는 간식은?',
      '겨울 하면 가장 먼저 떠오르는 간식은?',
    ],
    spicy: [
      '가장 설레는 스킨십은?',
      '연인에게 받고 싶은 기념일 선물 하나는?',
      '홈 데이트에서 같이 보고 싶은 영화 장르는?',
      '커플 사진을 찍는다면 가장 먼저 떠오르는 포즈는?',
      '연인과 함께 듣고 싶은 음악 장르는?',
      '가장 먼저 떠오르는 커플 아이템은?',
      '연인 사이의 대표적인 애칭 하나는?',
      '연인과 화해할 때 가장 먼저 하고 싶은 행동은?',
      '첫 데이트에 가장 무난한 음식 메뉴는?',
      '데이트가 끝날 때 가장 먼저 떠오르는 스킨십은?',
    ],
  },
}

export const PROMPT_ONLY_GAME_CONTENT = {
  'name-chain': [
    { starter: '김연아', prompt: '아로 시작하는 실존 인물' },
    { starter: '손흥민', prompt: '민으로 시작하는 실존 인물' },
    { starter: '아이유', prompt: '유로 시작하는 실존 인물' },
    { starter: '강동원', prompt: '원으로 시작하는 실존 인물' },
    { starter: '박지성', prompt: '성으로 시작하는 실존 인물' },
    { starter: '김고은', prompt: '은으로 시작하는 실존 인물' },
    { starter: '전지현', prompt: '현으로 시작하는 실존 인물' },
    { starter: '김민지', prompt: '지로 시작하는 실존 인물' },
    { starter: '차은우', prompt: '우로 시작하는 실존 인물' },
    { starter: '이정재', prompt: '재로 시작하는 실존 인물' },
  ],
  'category-market': [
    { topic: '치킨집 메뉴', chant: '치킨집에 가면~' },
    { topic: '햄버거집 메뉴', chant: '햄버거집에 가면~' },
    { topic: '분식집 메뉴', chant: '분식집에 가면~' },
    { topic: '카페 메뉴', chant: '카페에 가면~' },
    { topic: '중국집 메뉴', chant: '중국집에 가면~' },
    { topic: '영화관 매점에서 파는 것', chant: '영화관에 가면~' },
    { topic: '빵집에서 파는 것', chant: '빵집에 가면~' },
    { topic: '초밥집 메뉴', chant: '초밥집에 가면~' },
    { topic: '고깃집에서 주문할 수 있는 것', chant: '고깃집에 가면~' },
    { topic: '편의점에서 판매하는 것', chant: '편의점에 가면~' },
    { topic: '아이스크림 가게 메뉴', chant: '아이스크림 가게에 가면~' },
    { topic: 'PC방에서 판매하는 음식', chant: 'PC방에 가면~' },
    { topic: '피자집 메뉴', chant: '피자집에 가면~' },
    { topic: '포장마차 메뉴', chant: '포장마차에 가면~' },
    { topic: '샐러드 가게 메뉴', chant: '샐러드 가게에 가면~' },
    { topic: '횟집에서 주문할 수 있는 것', chant: '횟집에 가면~' },
  ],
  'forbidden-word': {
    high: ['아니', '근데', '진짜', '그냥', '너무', '맞아'],
    medium: ['약간', '일단', '사실', '원래', '뭔가', '솔직히', '아무튼', '그래서'],
    topic: ['친구', '오늘', '게임', '지금', '카페', '여행', '음식', '주말'],
  },
}

export const PARTY_CATALOG = [
  { id: 'name-chain', emoji: '🔤', title: '이름 끝말잇기', desc: '실존 인물 이름으로 이어가기' },
  { id: 'category-market', emoji: '🛒', title: '카테고리 시장에 가면~', desc: '랜덤 카테고리 기억 게임' },
  { id: 'liar', emoji: '🕵️', title: '라이어게임', desc: '제시어를 모르는 한 명 찾기' },
  { id: 'charades', emoji: '🎭', title: '몸으로 말해요', desc: '말없이 제시어 표현하기' },
  { id: 'forbidden-word', emoji: '🚫', title: '금지어 게임', desc: '내 금지어만 모른 채 대화하기' },
  { id: 'telepathy', emoji: '🧠', title: '통했나?', desc: '우리 답이 얼마나 통하는지 확인하기' },
]

export const DEMO_GAME_CATALOG = [
  { path: '/games/demo/persona-impostor', group: 'Persona Games', emoji: '🕵️', title: '너 누구야?', desc: 'Persona를 훔친 Impostor 찾기' },
  { path: '/games/demo/persona-prediction', group: 'Persona Games', emoji: '🔮', title: '너라면?', desc: 'Persona를 보고 실제 선택 예측하기' },
  ...PARTY_CATALOG.map((game) => ({ ...game, group: 'Party Games', path: `/games/demo/party?game=${game.id}` })),
]
