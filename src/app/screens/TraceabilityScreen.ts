import { DocumentScreen } from '../DocumentScreen';
import type { ScreenHeading } from '../ArtifactScreen';
import type { ModelIndex } from '../../model/ModelIndex';
import { ConsistencyChecker } from '../../model/ConsistencyChecker';
import type { CheckResult } from '../../model/ConsistencyChecker';
import type { Requirement } from '../../model/uml';
import { escapeHtml } from '../html';
import { T } from '../../content/uiText';

/** Traceability matrix plus the automatic consistency checks, run live in the browser. */
export class TraceabilityScreen extends DocumentScreen {
  constructor(index: ModelIndex) {
    super(index, null);
  }

  protected heading(): ScreenHeading {
    return { icon: '🔗', title: T.traceability.title, subtitle: T.traceability.subtitle, color: '--c-trace' };
  }

  protected route(): string {
    return 'traceability';
  }

  protected body(): string {
    const t = T.traceability;
    const results: CheckResult[] = new ConsistencyChecker(this.index.model).run();
    const checks: string = results
      .map((result: CheckResult) => {
        const ok: boolean = result.failures.length === 0;
        return '<li class="check ' + (ok ? 'ok' : 'fail') + '"><span class="check-mark">' + (ok ? '✔' : '✘') + '</span>' +
          '<div><b>' + T.checks[result.id] + '</b><small>' + t.inspected(result.inspected) + '</small>' +
          (ok ? '' : '<code>' + escapeHtml(result.failures.join(', ')) + '</code>') + '</div></li>';
      })
      .join('');
    const header: string = '<tr>' + t.columns.map((column: string) => '<th>' + column + '</th>').join('') + '</tr>';
    const rows: string = this.index.model.requirements.map((requirement: Requirement) => this.row(requirement)).join('');
    return '<section class="doc-section"><h2>' + t.checksTitle + '</h2><p>' + t.checksLead + '</p><ul class="check-list">' + checks + '</ul></section>' +
      '<section class="doc-section"><h2>' + t.matrixTitle + '</h2><p>' + t.matrixLead + '</p>' +
      '<div class="matrix-scroll"><table class="matrix"><thead>' + header + '</thead><tbody>' + rows + '</tbody></table></div></section>' +
      '<section class="doc-section"><h2>' + t.decisionsTitle + '</h2><ul class="decision-list">' +
      t.decisions.map((decision: string) => '<li>' + decision + '</li>').join('') + '</ul></section>';
  }

  /** One requirement and everything that realizes it, gathered from the elements it names. */
  private row(requirement: Requirement): string {
    const steps: Set<string> = new Set();
    const nodes: Set<string> = new Set();
    const messages: Set<string> = new Set();
    for (const element of requirement.elements.filter((item: string) => item.includes('.'))) {
      const used = this.index.usagesOf(element);
      used.steps.forEach((item: string) => steps.add(item));
      used.nodes.forEach((item: string) => nodes.add(item));
      used.messages.forEach((item: string) => messages.add(item));
    }
    for (const node of this.index.model.activityDiagram.nodes) {
      if (requirement.useCases.some((useCase: string) => (node.realizes ?? []).includes(useCase))) nodes.add(node.id);
    }
    return '<tr data-anchor="' + requirement.id + '"><td>' + this.chips.requirement(requirement.id) + '<small>' + requirement.title + '</small></td>' +
      '<td>' + this.chips.list(requirement.useCases, (item: string) => this.chips.useCase(item)) + '</td>' +
      '<td>' + this.chips.list([...steps], (item: string) => this.chips.step(item)) + '</td>' +
      '<td>' + this.chips.list([...nodes], (item: string) => this.chips.node(item)) + '</td>' +
      '<td>' + this.chips.list(requirement.elements, (item: string) => this.chips.element(item)) + '</td>' +
      '<td>' + this.chips.list([...messages], (item: string) => this.chips.message(item)) + '</td></tr>';
  }
}
