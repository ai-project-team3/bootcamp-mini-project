// 카카오톡 앱 키가 없어 Kakao SDK 대신 브라우저 표준 Web Share API를 쓴다.
// 모바일에서 호출하면 OS 공유 시트가 뜨고, 카카오톡이 설치돼 있으면 그 목록에
// 카카오톡이 뜬다 — 공유 대상 등록은 OS/카카오톡 쪽 몫이라 앱 키가 필요 없다.
// Web Share API가 없는 환경(대부분의 데스크톱 브라우저)에서는 링크를 클립보드에
// 복사하는 것으로 대신한다.
export async function shareCurrentPage(title, text) {
  const url = window.location.href

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'
      // 공유 시트 자체가 실패하면 링크 복사로 대신 시도한다.
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
