# 얼음땡 기획안 §5-4 "넘으면 안 되는 선"의 반례에서 뽑은 초기 금지어 목록.
# O3(금지어 목록의 초기 항목)은 기획안이 미확정으로 남긴 항목이라 임의로 시드했다 —
# 생성된 문항 텍스트에 아래 단어가 하나라도 섞이면 검증 실패로 처리해 기본 세트로
# 폴백한다. 실제 운영하며 걸러지지 않는 사례가 나오면 이 리스트만 늘리면 된다.
DENYLIST = (
    # 개발/기술 용어
    "백엔드", "프론트엔드", "API", "목 데이터", "목데이터", "Mock",
    "리액트", "React", "바닐라", "Vue", "Angular", "Next.js",
    "자바스크립트", "JavaScript", "파이썬", "Python", "타입스크립트", "TypeScript",
    "데이터베이스", "DB", "서버", "배포", "깃허브", "GitHub", "커밋", "PR", "코드리뷰",
    # 디자인 도구
    "피그마", "Figma", "스케치", "Sketch", "어도비", "Adobe",
    # 평가/전략 판단(성향이 아니라 지식·전략을 묻는 표현)
    "심사 기준", "창의성", "완성도", "심사위원",
)


def contains_banned_word(*texts: str) -> bool:
    return any(word in text for text in texts for word in DENYLIST)
