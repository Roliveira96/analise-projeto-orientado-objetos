import { DocumentScreen } from '../DocumentScreen';
import type { ScreenHeading } from '../ArtifactScreen';
import type { Requirement } from '../../model/uml';
import { T } from '../../content/uiText';
import { statement } from '../../content/statement';
import type { StatementBlock } from '../../content/statement';

/** The case study turned into functional requirements and business rules. */
export class RequirementsScreen extends DocumentScreen {
  protected heading(): ScreenHeading {
    return { icon: '📄', title: T.requirements.title, subtitle: T.requirements.subtitle, color: '--c-req' };
  }

  protected route(): string {
    return 'requirements';
  }

  protected body(): string {
    const t = T.requirements;
    const list = (items: string[]): string => '<ul class="plain-list">' + items.map((item: string) => '<li>' + item + '</li>').join('') + '</ul>';
    const requirements: Requirement[] = this.index.model.requirements;
    const text: string = statement
      .map((block: StatementBlock) => (block.kind === 'heading' ? '<h4>' + block.text + '</h4>' : '<p>' + block.text + '</p>'))
      .join('');
    return '<section class="doc-section scope-grid">' +
      '<div class="scope-box in"><h3>✅ ' + t.inScope + '</h3>' + list(t.inScopeItems) + '</div>' +
      '<div class="scope-box out"><h3>🚫 ' + t.outScope + '</h3>' + list(t.outScopeItems) + '</div></section>' +
      '<section class="doc-section"><h2>' + t.functional + '</h2><div class="requirement-grid">' +
      requirements.filter((item) => item.kind === 'functional').map((item) => this.card(item)).join('') + '</div></section>' +
      '<section class="doc-section"><h2>' + t.rules + '</h2><div class="requirement-grid">' +
      requirements.filter((item) => item.kind === 'rule').map((item) => this.card(item)).join('') + '</div></section>' +
      '<details class="doc-section statement"><summary>' + t.statementTitle + '</summary>' + text + '</details>';
  }

  private card(requirement: Requirement): string {
    return '<article class="requirement-card ' + requirement.kind + '" data-anchor="' + requirement.id + '">' +
      '<header><span class="requirement-id">' + requirement.id + '</span><h3>' + requirement.title + '</h3></header>' +
      '<p>' + requirement.text + '</p>' +
      '<blockquote><small>' + T.requirements.source + '</small>' + requirement.source + '</blockquote>' +
      '<div class="trace-row">' + this.chips.list(requirement.useCases, (item: string) => this.chips.useCase(item)) +
      this.chips.list(requirement.elements, (item: string) => this.chips.element(item)) + '</div>' +
      '</article>';
  }
}
