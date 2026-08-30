/**
 * Copy text to the clipboard, including on a plain-http page.
 *
 * Everyone plays on their own phone over the LAN, which is not a secure
 * context, and `navigator.clipboard` does not exist there — the invite button
 * silently did nothing. The textarea + execCommand path still works, so it is
 * used as the fallback. Returns whether the copy actually happened so the UI
 * can offer the link to copy by hand instead of claiming success.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path below.
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    // Keep it out of view without display:none, which would break selection.
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
