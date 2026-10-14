/** Small DOM and array helpers shared by screens and labs. */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Fisher-Yates shuffle that leaves the input untouched. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy: T[] = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j: number = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function query<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const found: T | null = root.querySelector<T>(selector);
  if (found === null) throw new Error('Missing element: ' + selector);
  return found;
}

export function queryAll<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** Writes text only when it changed, so unchanged cells do not trigger layout and repaint. */
export function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Formats seconds as mm:ss. */
export function formatClock(totalSeconds: number): string {
  const safe: number = Math.max(0, Math.floor(totalSeconds));
  const minutes: string = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds: string = String(safe % 60).padStart(2, '0');
  return minutes + ':' + seconds;
}

/** Formats a number the Brazilian way (comma as decimal separator). */
export function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals).replace('.', ',');
}

/** Counts a displayed number up or down to its new value. */
export function animateNumber(element: HTMLElement, target: number, decimals: number = 1, durationMs: number = 450): void {
  const from: number = Number(element.dataset.value ?? '0');
  element.dataset.value = String(target);
  if (prefersReducedMotion() || from === target || durationMs <= 0) {
    element.textContent = formatNumber(target, decimals);
    return;
  }
  const start: number = performance.now();
  const frame = (now: number): void => {
    const progress: number = Math.min(1, (now - start) / durationMs);
    const eased: number = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatNumber(from + (target - from) * eased, decimals);
    // A newer animation took over when the stored target changed.
    if (progress < 1 && element.dataset.value === String(target)) window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame(frame);
}
