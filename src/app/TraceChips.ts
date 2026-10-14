import type { ModelIndex } from '../model/ModelIndex';
import type { ActivityNode } from '../model/uml';
import { escapeHtml } from './html';
import { T } from '../content/uiText';

/** Links between artifacts, drawn as small colored chips that navigate to the target element. */
export class TraceChips {
  private readonly index: ModelIndex;

  constructor(index: ModelIndex) {
    this.index = index;
  }

  public requirement(id: string): string {
    const requirement = this.index.model.requirements.find((item) => item.id === id);
    return this.chip('req', '#/requirements/' + id, id, requirement?.title);
  }

  public useCase(id: string): string {
    return this.chip('uc', '#/use-cases/' + id, id, this.index.useCase(id)?.name);
  }

  public step(number: string): string {
    return this.chip('spec', '#/specification/' + number, T.trace.step(number));
  }

  public message(id: string): string {
    const message = this.index.message(id);
    const label: string = message === undefined ? id : T.trace.message(message.number);
    return this.chip('seq', '#/sequence/' + id, label, message?.operation);
  }

  public node(id: string): string {
    const node: ActivityNode | undefined = this.index.node(id);
    const label: string = node?.label ?? (node?.kind === 'decision' ? '◇ ' + this.decisionLabel(id) : id);
    return this.chip('act', '#/activity/' + id, label.length > 34 ? label.slice(0, 32) + '…' : label);
  }

  /** "Class", "Class.operation" or "Class.attribute". */
  public element(reference: string): string {
    const isOperation: boolean = this.index.operation(reference) !== undefined;
    return this.chip('cls', '#/classes/' + reference, reference + (isOperation ? '()' : ''));
  }

  /** Use case ids and class references mixed, as in ActivityNode.realizes. */
  public any(reference: string): string {
    return /^UC\d+$/.test(reference) ? this.useCase(reference) : this.element(reference);
  }

  public list(items: string[], render: (item: string) => string): string {
    return items.length === 0 ? '<span class="muted">' + T.traceability.none + '</span>' : '<span class="trace-list">' + items.map(render).join('') + '</span>';
  }

  private decisionLabel(id: string): string {
    const guards: string[] = this.index.model.activityDiagram.edges.filter((edge) => edge.from === id && edge.guard !== undefined).map((edge) => edge.guard as string);
    return guards.join(' / ');
  }

  private chip(kind: string, href: string, label: string, title?: string): string {
    return '<a class="trace-chip trace-' + kind + '" href="' + href + '"' + (title === undefined ? '' : ' title="' + escapeHtml(title) + '"') + '>' + escapeHtml(label) + '</a>';
  }
}
