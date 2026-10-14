import type { Point } from '../model/uml';
import { escapeHtml } from '../app/html';

/** Width of one character of the monospaced diagram font at 12px (JetBrains Mono is 0.6em wide). */
export const CHAR_WIDTH: number = 7.22;

export function attributes(values: Record<string, string | number | undefined>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => name + '="' + escapeHtml(String(value)) + '"')
    .join(' ');
}

export function text(x: number, y: number, content: string, className: string, extra: Record<string, string | number | undefined> = {}): string {
  return '<text ' + attributes({ x: round(x), y: round(y), class: className, ...extra }) + '>' + escapeHtml(content) + '</text>';
}

export function polyline(points: Point[], className: string, extra: Record<string, string | number | undefined> = {}): string {
  const list: string = points.map((point: Point) => round(point.x) + ',' + round(point.y)).join(' ');
  return '<polyline ' + attributes({ points: list, class: className, fill: 'none', ...extra }) + '/>';
}

export function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Breaks a label into lines of at most maxChars characters, keeping words whole. */
export function wrap(label: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current: string = '';
  for (const word of label.split(' ')) {
    if (current !== '' && (current + ' ' + word).length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current === '' ? word : current + ' ' + word;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
}

/** Multi-line text centered on (x, y). */
export function centeredLines(x: number, y: number, lines: string[], lineHeight: number, className: string): string {
  const top: number = y - ((lines.length - 1) * lineHeight) / 2;
  return lines
    .map((line: string, i: number) => text(x, top + i * lineHeight, line, className, { 'text-anchor': 'middle', 'dominant-baseline': 'central' }))
    .join('');
}

/** Point where the segment from the center of an ellipse towards target leaves the ellipse. */
export function clipEllipse(center: Point, rx: number, ry: number, target: Point): Point {
  const dx: number = target.x - center.x;
  const dy: number = target.y - center.y;
  const scale: number = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

/** Same as clipEllipse for an axis-aligned rectangle with half sizes hw and hh. */
export function clipRect(center: Point, hw: number, hh: number, target: Point): Point {
  const dx: number = target.x - center.x;
  const dy: number = target.y - center.y;
  const scale: number = Math.min(dx === 0 ? Infinity : hw / Math.abs(dx), dy === 0 ? Infinity : hh / Math.abs(dy));
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

/** Same for a diamond (decision and merge nodes). */
export function clipDiamond(center: Point, half: number, target: Point): Point {
  const dx: number = target.x - center.x;
  const dy: number = target.y - center.y;
  const scale: number = half / (Math.abs(dx) + Math.abs(dy));
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

export function clipCircle(center: Point, radius: number, target: Point): Point {
  const dx: number = target.x - center.x;
  const dy: number = target.y - center.y;
  const length: number = Math.hypot(dx, dy);
  return { x: center.x + (dx / length) * radius, y: center.y + (dy / length) * radius };
}

/** Middle of the longest segment of a polyline, with the segment direction. */
export function longestSegmentMiddle(points: Point[]): { point: Point; horizontal: boolean } {
  let best: number = 0;
  let index: number = 0;
  for (let i = 1; i < points.length; i++) {
    const length: number = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (length > best) {
      best = length;
      index = i;
    }
  }
  const a: Point = points[Math.max(0, index - 1)];
  const b: Point = points[index];
  return { point: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, horizontal: Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) };
}

/** Arrowheads and diamonds shared by every diagram. */
export function markers(): string {
  return (
    '<defs>' +
    '<marker id="m-open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
    '<path d="M1,1 L11,6 L1,11" class="marker-open"/></marker>' +
    '<marker id="m-filled" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
    '<path d="M1,1 L11,6 L1,11 Z" class="marker-filled"/></marker>' +
    '<marker id="m-diamond" viewBox="0 0 20 12" refX="19" refY="6" markerWidth="20" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
    '<path d="M1,6 L10,1 L19,6 L10,11 Z" class="marker-filled"/></marker>' +
    '</defs>'
  );
}

export function svgDocument(width: number, height: number, body: string, label: string): string {
  return (
    '<svg class="uml" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" role="img" aria-label="' + escapeHtml(label) + '">' +
    markers() +
    body +
    '</svg>'
  );
}
