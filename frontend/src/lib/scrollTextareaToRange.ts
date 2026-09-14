function copyTextareaMirrorStyles(
  textarea: HTMLTextAreaElement,
  mirror: HTMLDivElement,
): void {
  const style = textarea.ownerDocument.defaultView?.getComputedStyle(textarea);
  if (!style) return;

  mirror.style.boxSizing = style.boxSizing;
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontSize = style.fontSize;
  mirror.style.fontWeight = style.fontWeight;
  mirror.style.fontStyle = style.fontStyle;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.tabSize = style.tabSize;
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflowWrap = "break-word";
}

export function measureTextareaOffsetTop(
  textarea: HTMLTextAreaElement,
  offset: number,
): number {
  const doc = textarea.ownerDocument;
  const mirror = doc.createElement("div");
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.top = "0";
  mirror.style.left = "0";
  copyTextareaMirrorStyles(textarea, mirror);

  const value = textarea.value;
  const safeOffset = Math.max(0, Math.min(offset, value.length));
  mirror.appendChild(doc.createTextNode(value.slice(0, safeOffset)));
  const marker = doc.createElement("span");
  marker.textContent = value.slice(safeOffset, safeOffset + 1) || "\u200b";
  mirror.appendChild(marker);

  doc.body.appendChild(mirror);
  const top = marker.offsetTop;
  doc.body.removeChild(mirror);
  return top;
}

export function scrollTextareaToRange(
  textarea: HTMLTextAreaElement,
  start: number,
  _end: number,
): void {
  const style = textarea.ownerDocument.defaultView?.getComputedStyle(textarea);
  if (!style) return;

  const targetTop = measureTextareaOffsetTop(textarea, start);
  const lineHeight =
    Number.parseFloat(style.lineHeight) ||
    measureTextareaOffsetTop(
      textarea,
      Math.min(start + 1, textarea.value.length),
    ) - targetTop ||
    20;
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
  const visibleHeight = textarea.clientHeight - paddingTop - paddingBottom;

  textarea.scrollTop = Math.max(
    0,
    targetTop - visibleHeight / 2 + lineHeight / 2,
  );
}

export function applyTextareaFindMatch(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number,
): void {
  const safeStart = Math.max(0, Math.min(start, textarea.value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, textarea.value.length));

  scrollTextareaToRange(textarea, safeStart, safeEnd);
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(safeStart, safeEnd);
}
