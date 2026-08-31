"""Is the Gemini key wired up? Prints yes/no and never the key itself.

    python scripts/check_gemini.py

Answers three questions in order, because they fail in three different ways
and only the last one costs a call:

  1. Is `GEMINI_API_KEY` set in the environment or `backend/.env`?
  2. Is the SDK installed? (it is in requirements, but a venv can drift)
  3. Does the key actually work? — one small generation, live.

Every failure here is survivable: the app falls back to the written question
set and the written report sentences. This script tells you which of those
you are looking at, so nobody spends an afternoon rewriting a prompt that is
never being sent.

**Never prints the key.** Only its length, so a truncated paste is visible.
"""

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402


def main() -> int:
    key = (settings.gemini_api_key or "").strip()
    if not key:
        print("[  없음  ] GEMINI_API_KEY 가 안 잡힙니다.")
        print("           backend/.env 에 GEMINI_API_KEY=... 를 넣고 다시 실행하세요.")
        print("           문항과 리포트가 전부 기본 문장으로 나갑니다.")
        return 1
    print(f"[  설정  ] 키가 잡혔습니다 (길이 {len(key)}자).")

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("[  실패  ] google-genai 가 이 venv 에 없습니다.")
        print("           pip install -r requirements.txt")
        return 1
    print("[  설치  ] google-genai 확인.")

    # SDK가 매번 띄우는 안내 로그는 여기서 볼 이유가 없다.
    logging.getLogger("google_genai").setLevel(logging.ERROR)

    try:
        client = genai.Client(api_key=key)
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents="한 단어로만 답해라: 얼음",
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=1),
                http_options=types.HttpOptions(timeout=20000),
            ),
        )
    except Exception as error:  # noqa: BLE001 — 무엇이 틀렸든 사람에게 보여준다
        # 구글이 돌려주는 본문은 길다. 사람이 읽을 한 줄만 남긴다.
        text = str(error)
        # 한도 초과는 "키가 틀렸다"와 완전히 다른 이야기다. 같은 문구로 안내하면
        # 멀쩡한 키를 지우고 다시 발급받게 된다.
        if "RESOURCE_EXHAUSTED" in text or "429" in text[:20]:
            print("[ 한도초과 ] 키는 멀쩡한데 오늘 몫을 다 썼습니다.")
            print("           무료 한도는 모델·프로젝트당 하루 20회입니다.")
            print("           한 세션이 두 번 부르니 하루 열 판입니다. 내일 다시 찹니다.")
            print("           지우고 새로 발급받아도 같은 프로젝트면 소용없습니다.")
            return 1
        if "UNAVAILABLE" in text or "503" in text[:20]:
            print("[  붐빔  ] 키는 멀쩡한데 모델 쪽이 지금 몰려 있습니다.")
            print("           잠깐 뒤에 다시 해보세요. 앱은 그동안 기본 문장으로 넘어갑니다.")
            return 1
        print(f"[  실패  ] 호출이 안 됩니다: {type(error).__name__}: {text.splitlines()[0][:150]}")
        print("           키가 틀렸거나, 만료됐거나, 네트워크가 막혀 있습니다.")
        return 1

    print(f"[ 사용가능 ] 응답 받음: {(response.text or '').strip()[:40]!r}")
    print("           문항 생성과 리포트 생성이 실제로 돕니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
