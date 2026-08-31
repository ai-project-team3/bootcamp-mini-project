// 카카오톡 앱 키가 없어 Kakao SDK 대신 브라우저 표준 Web Share API를 쓴다.
// 모바일에서 호출하면 OS 공유 시트가 뜨고, 카카오톡이 설치돼 있으면 그 목록에
// 카카오톡이 뜬다 — 공유 대상 등록은 OS/카카오톡 쪽 몫이라 앱 키가 필요 없다.
//
// 다만 `navigator.share`도 `navigator.clipboard`도 **보안 컨텍스트**에서만 있다.
// HTTPS이거나 localhost여야 한다는 뜻이다. 그런데 팀원들은 같은 Wi-Fi에서
// `http://192.168.x.x:5173`으로 들어온다 — 평문 HTTP라 둘 다 없다.
// 방을 만든 사람은 localhost로 보고 있어서 멀쩡하고, 들어온 사람만 실패했다.
// 그래서 평문 HTTP에서도 되는 마지막 수단을 하나 더 둔다.

/** 공유 시트 → 클립보드 순으로 시도한다. 'shared' | 'copied' | 'cancelled' | 'failed' */
export async function shareCurrentPage(title, text) {
  const url = window.location.href

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'
      // 공유 시트 자체가 실패하면 아래 복사로 대신 시도한다.
    }
  }

  // 공유 시트는 제목·본문·주소를 함께 보낸다. 복사로 대신할 때도 같이 담아야
  // 받는 사람이 무슨 링크인지 안다. 링크만 있으면 같은 Wi-Fi 밖에서는
  // 열리지도 않는 주소 한 줄만 남는다.
  return (await copyText(`${text}\n${url}`)) ? 'copied' : 'failed'
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // 권한 거부나 포커스 없음. 아래 방법으로 한 번 더.
    }
  }
  return legacyCopy(value)
}

/**
 * `document.execCommand('copy')`. 오래된 방법이지만 **평문 HTTP에서도 된다.**
 * 같은 Wi-Fi로 들어온 팀원에게는 이 경로뿐이다.
 */
function legacyCopy(value) {
  const area = document.createElement('textarea')
  area.value = value
  // 화면 밖으로 밀되 `display: none`은 안 된다 — 선택이 안 되면 복사도 안 된다.
  area.setAttribute('readonly', '')
  area.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0;'
  document.body.appendChild(area)

  try {
    // iOS Safari는 select()만으로는 선택이 잡히지 않는다. Range로 잡아준 뒤
    // setSelectionRange까지 해야 복사가 된다.
    area.select()
    const range = document.createRange()
    range.selectNodeContents(area)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    area.setSelectionRange(0, value.length)

    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    area.remove()
  }
}
