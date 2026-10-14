import type { Activation, CombinedFragment, Lifeline, SequenceDiagramModel, SequenceMessage } from '../model/uml';
import { CHAR_WIDTH, polyline, svgDocument, text } from './svg';

const FIRST_X: number = 110;
const SPACING: number = 178;
const HEAD_Y: number = 46;
const HEAD_HEIGHT: number = 44;
const FIRST_ROW: number = 146;
const ROW: number = 42;
const SELF_ROW: number = 60;
const CREATE_ROW: number = 64;
const FRAGMENT_TOP: number = 46;
const FRAGMENT_BOTTOM: number = 16;
const ACTIVATION_HALF: number = 6;

/** Text written over a message arrow. */
export function messageLabel(message: SequenceMessage): string {
  if (message.kind === 'return') return message.operation;
  if (message.kind === 'create') return message.number + ': «create»';
  return message.number + ': ' + message.operation + '(' + (message.arguments ?? '') + ')';
}

/** Renders the sequence diagram; rows, activations and fragments are laid out from the message list. */
export class SequenceDiagram {
  private readonly diagram: SequenceDiagramModel;
  private readonly rows: Map<string, number> = new Map<string, number>();
  private readonly height: number;

  constructor(diagram: SequenceDiagramModel) {
    this.diagram = diagram;
    let cursor: number = FIRST_ROW;
    for (const message of diagram.messages) {
      if (diagram.fragments.some((fragment: CombinedFragment) => fragment.first === message.id)) cursor += FRAGMENT_TOP;
      this.rows.set(message.id, cursor);
      cursor += message.kind === 'self' ? SELF_ROW : message.kind === 'create' ? CREATE_ROW : ROW;
      const closing: number = diagram.fragments.filter((fragment: CombinedFragment) => fragment.last === message.id).length;
      cursor += closing * FRAGMENT_BOTTOM;
    }
    this.height = cursor + 30;
  }

  public get width(): number {
    return FIRST_X * 2 + SPACING * (this.diagram.lifelines.length - 1);
  }

  public render(): string {
    const fragments: string = this.diagram.fragments.map((fragment: CombinedFragment) => this.fragment(fragment)).join('');
    const lifelines: string = this.diagram.lifelines.map((lifeline: Lifeline) => this.lifeline(lifeline)).join('');
    const activations: string = this.diagram.activations.map((activation: Activation) => this.activation(activation)).join('');
    const messages: string = this.diagram.messages.map((message: SequenceMessage) => this.message(message)).join('');
    const frame: string =
      '<rect class="uml-frame" x="6" y="6" width="' + (this.width - 12) + '" height="' + (this.height - 12) + '" rx="4"/>' +
      '<path class="uml-frame-tab" d="M6,6 H' + (16 + this.diagram.title.length * CHAR_WIDTH) + ' V22 L' + (6 + this.diagram.title.length * CHAR_WIDTH) + ',32 H6 Z"/>' +
      text(14, 24, this.diagram.title, 'uml-frame-title');
    return svgDocument(this.width, this.height, frame + fragments + lifelines + activations + messages, this.diagram.title);
  }

  public rowOf(messageId: string): number {
    const row: number | undefined = this.rows.get(messageId);
    if (row === undefined) throw new Error('Unknown message: ' + messageId);
    return row;
  }

  public lifelineX(lifelineId: string): number {
    const index: number = this.diagram.lifelines.findIndex((lifeline: Lifeline) => lifeline.id === lifelineId);
    if (index < 0) throw new Error('Unknown lifeline: ' + lifelineId);
    return FIRST_X + index * SPACING;
  }

  private headTop(lifeline: Lifeline): number {
    return lifeline.createdBy === undefined ? HEAD_Y : this.rowOf(lifeline.createdBy) - HEAD_HEIGHT / 2;
  }

  private lifeline(lifeline: Lifeline): string {
    const x: number = this.lifelineX(lifeline.id);
    const top: number = this.headTop(lifeline);
    const name: string = (lifeline.instance === '' ? '' : lifeline.instance) + ':' + lifeline.classifier;
    const width: number = Math.max(120, name.length * CHAR_WIDTH + 20);
    let head: string;
    if (lifeline.isActor === true) {
      head =
        '<circle cx="' + x + '" cy="' + (top + 6) + '" r="7" class="uml-shape"/>' +
        '<path class="uml-line" d="M' + x + ',' + (top + 13) + ' V' + (top + 28) + ' M' + (x - 11) + ',' + (top + 18) + ' H' + (x + 11) +
        ' M' + x + ',' + (top + 28) + ' L' + (x - 9) + ',' + (top + 40) + ' M' + x + ',' + (top + 28) + ' L' + (x + 9) + ',' + (top + 40) + '"/>' +
        text(x, top + 56, ':' + lifeline.classifier, 'uml-label uml-strong', { 'text-anchor': 'middle' });
    } else {
      head =
        '<rect class="uml-shape" x="' + (x - width / 2) + '" y="' + top + '" width="' + width + '" height="' + HEAD_HEIGHT + '" rx="3"/>' +
        text(x, top + 27, name, 'uml-lifeline-name', { 'text-anchor': 'middle' });
    }
    const lineTop: number = top + (lifeline.isActor === true ? 64 : HEAD_HEIGHT);
    return '<g class="uml-lifeline" data-id="' + lifeline.id + '" data-class="' + lifeline.classifier + '">' +
      '<line class="uml-line uml-dashed" x1="' + x + '" x2="' + x + '" y1="' + lineTop + '" y2="' + (this.height - 20) + '"/>' +
      head + '</g>';
  }

  /** Nesting level of an activation inside others of the same lifeline. */
  private depth(activation: Activation): number {
    const order: string[] = this.diagram.messages.map((message: SequenceMessage) => message.id);
    const first: number = order.indexOf(activation.first);
    const last: number = order.indexOf(activation.last);
    return this.diagram.activations.filter((other: Activation) =>
      other !== activation && other.lifeline === activation.lifeline &&
      order.indexOf(other.first) <= first && order.indexOf(other.last) >= last).length;
  }

  private activationBounds(activation: Activation): { x: number; top: number; bottom: number } {
    const last: SequenceMessage = this.find(activation.last);
    const extra: number = last.kind === 'self' ? 40 : last.kind === 'return' ? 0 : 8;
    if (last.kind === 'self' && activation.first === activation.last) {
      // The nested activation of a self call starts where the looping arrow comes back.
      const row: number = this.rowOf(activation.first);
      return { x: this.lifelineX(activation.lifeline) - ACTIVATION_HALF + this.depth(activation) * ACTIVATION_HALF, top: row + 20, bottom: row + 40 };
    }
    return {
      x: this.lifelineX(activation.lifeline) - ACTIVATION_HALF + this.depth(activation) * ACTIVATION_HALF,
      top: this.rowOf(activation.first) - 4,
      bottom: this.rowOf(activation.last) + extra,
    };
  }

  private activation(activation: Activation): string {
    const bounds = this.activationBounds(activation);
    return '<rect class="uml-activation" data-lifeline="' + activation.lifeline + '" x="' + bounds.x + '" y="' + bounds.top + '" width="' + ACTIVATION_HALF * 2 + '" height="' + Math.max(12, bounds.bottom - bounds.top) + '"/>';
  }

  /** x where a message touches a lifeline at a row: the border of the innermost open activation. */
  private edgeX(lifelineId: string, row: number, towardRight: boolean): number {
    const center: number = this.lifelineX(lifelineId);
    let best: { x: number } | null = null;
    let bestDepth: number = -1;
    for (const activation of this.diagram.activations.filter((item: Activation) => item.lifeline === lifelineId)) {
      const bounds = this.activationBounds(activation);
      if (row < bounds.top - 1 || row > bounds.bottom + 1) continue;
      const depth: number = this.depth(activation);
      if (depth > bestDepth) {
        bestDepth = depth;
        best = { x: bounds.x };
      }
    }
    if (best === null) return center;
    return towardRight ? best.x + ACTIVATION_HALF * 2 : best.x;
  }

  private message(message: SequenceMessage): string {
    const y: number = this.rowOf(message.id);
    const fromX: number = this.lifelineX(message.from);
    const toX: number = this.lifelineX(message.to);
    const label: string = messageLabel(message);
    let body: string;
    if (message.kind === 'self') {
      const start: number = this.edgeX(message.from, y - 22, true);
      body =
        polyline([{ x: start, y }, { x: start + 40, y }, { x: start + 40, y: y + 26 }, { x: start + ACTIVATION_HALF, y: y + 26 }], 'uml-line', { 'marker-end': 'url(#m-filled)' }) +
        text(start + 48, y + 16, label, 'uml-message');
    } else {
      const right: boolean = toX > fromX;
      const start: number = this.edgeX(message.from, y, right);
      let end: number = message.kind === 'create' ? toX + (right ? -60 : 60) : this.edgeX(message.to, y + 2, !right);
      if (message.kind === 'create') {
        const lifeline: Lifeline | undefined = this.diagram.lifelines.find((item: Lifeline) => item.id === message.to);
        const name: string = (lifeline?.instance ?? '') + ':' + (lifeline?.classifier ?? '');
        end = toX - (right ? 1 : -1) * Math.max(120, name.length * CHAR_WIDTH + 20) / 2;
      }
      const dashed: boolean = message.kind === 'return' || message.kind === 'create';
      body =
        polyline([{ x: start, y }, { x: end, y }], 'uml-line' + (dashed ? ' uml-dashed' : ''), { 'marker-end': dashed ? 'url(#m-open)' : 'url(#m-filled)' }) +
        (message.kind === 'return'
          ? text((start + end) / 2, y - 7, label, 'uml-message uml-return', { 'text-anchor': 'middle' })
          : text(Math.min(start, end) + 10, y - 7, label, 'uml-message'));
    }
    return '<g class="uml-msg uml-msg-' + message.kind + '" data-message="' + message.id + '">' + body + '</g>';
  }

  private fragment(fragment: CombinedFragment): string {
    const left: number = Math.min(this.lifelineX(fragment.covers[0]), this.lifelineX(fragment.covers[1])) - 64;
    const right: number = Math.max(this.lifelineX(fragment.covers[0]), this.lifelineX(fragment.covers[1])) + 64;
    const top: number = this.rowOf(fragment.first) - FRAGMENT_TOP + 4;
    const last: SequenceMessage = this.find(fragment.last);
    const bottom: number = this.rowOf(fragment.last) + (last.kind === 'self' ? 40 : 12);
    const tab: number = fragment.kind.length * CHAR_WIDTH + 16;
    return '<g class="uml-fragment uml-fragment-' + fragment.kind + '" data-first="' + fragment.first + '">' +
      '<rect class="uml-fragment-box" x="' + left + '" y="' + top + '" width="' + (right - left) + '" height="' + (bottom - top) + '" rx="3"/>' +
      '<path class="uml-frame-tab" d="M' + left + ',' + top + ' H' + (left + tab) + ' V' + (top + 12) + ' L' + (left + tab - 8) + ',' + (top + 20) + ' H' + left + ' Z"/>' +
      text(left + 7, top + 14, fragment.kind, 'uml-fragment-kind') +
      text(left + tab + 8, top + 14, fragment.guard, 'uml-guard') + '</g>';
  }

  private find(id: string): SequenceMessage {
    const message: SequenceMessage | undefined = this.diagram.messages.find((item: SequenceMessage) => item.id === id);
    if (message === undefined) throw new Error('Unknown message: ' + id);
    return message;
  }
}
