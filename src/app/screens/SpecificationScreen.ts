import { DocumentScreen } from '../DocumentScreen';
import type { ScreenHeading } from '../ArtifactScreen';
import type { SpecificationFlow, SpecificationStep } from '../../model/uml';
import { T } from '../../content/uiText';

/** Textual specification of UC08, every step linked to the other artifacts. */
export class SpecificationScreen extends DocumentScreen {
  protected heading(): ScreenHeading {
    return { icon: '📝', title: T.specification.title, subtitle: T.specification.subtitle, color: '--c-spec' };
  }

  protected route(): string {
    return 'specification';
  }

  protected body(): string {
    const t = T.specification;
    const spec = this.index.model.specification;
    const useCase = this.index.useCase(spec.useCase);
    const actorName = (id: string): string => this.index.model.useCaseDiagram.actors.find((actor) => actor.id === id)?.name ?? id;
    const list = (items: string[]): string => '<ol class="condition-list">' + items.map((item: string) => '<li>' + item + '</li>').join('') + '</ol>';
    const card: string =
      '<table class="spec-table"><tbody>' +
      '<tr><th>' + t.identifier + '</th><td><b>' + spec.useCase + '</b></td></tr>' +
      '<tr><th>' + t.name + '</th><td>' + (useCase?.name ?? '') + '</td></tr>' +
      '<tr><th>' + t.goal + '</th><td>' + spec.goal + '</td></tr>' +
      '<tr><th>' + t.actors + '</th><td>' + actorName(spec.primaryActor) + ' (' + t.primary + '), ' +
      spec.secondaryActors.map((id: string) => actorName(id) + ' (' + t.secondary + ')').join(', ') + '</td></tr>' +
      '<tr><th>' + t.relations + '</th><td>' + t.includes + ' ' + spec.includes.map((id: string) => this.chips.useCase(id)).join(' ') +
      ' · ' + t.extendedBy + ' ' + spec.extendedBy.map((id: string) => this.chips.useCase(id)).join(' ') + '</td></tr>' +
      '<tr><th>' + t.rules + '</th><td>' + spec.rules.map((id: string) => this.chips.requirement(id)).join(' ') + '</td></tr>' +
      '<tr><th>' + t.preconditions + '</th><td>' + list(spec.preconditions) + '</td></tr>' +
      '<tr><th>' + t.postconditions + '</th><td>' + list(spec.postconditions) + '</td></tr>' +
      '<tr><th>' + t.failure + '</th><td>' + list(spec.failurePostconditions) + '</td></tr>' +
      '</tbody></table>';
    return '<section class="doc-section"><div class="why-box"><b>' + t.why + '</b><p>' + t.whyText + '</p></div>' + card + '</section>' +
      '<section class="doc-section"><h2>' + t.mainFlow + '</h2>' + this.steps(spec.mainFlow) + '</section>' +
      '<section class="doc-section"><h2>' + t.alternative + '</h2>' + spec.alternativeFlows.map((flow) => this.flow(flow)).join('') + '</section>' +
      '<section class="doc-section"><h2>' + t.exception + '</h2>' + spec.exceptionFlows.map((flow) => this.flow(flow)).join('') + '</section>';
  }

  private flow(flow: SpecificationFlow): string {
    return '<article class="flow-card" data-anchor="' + flow.id + '"><header><span class="requirement-id">' + flow.id + '</span><h3>' + flow.title + '</h3>' +
      '<small>' + T.specification.startsAt(flow.startsAt) + '</small></header>' + this.steps(flow.steps) + '<p class="flow-ending">↳ ' + flow.ending + '</p></article>';
  }

  private steps(steps: SpecificationStep[]): string {
    return '<ol class="step-list">' + steps
      .map((step: SpecificationStep) => {
        const links: string[] = [
          ...step.activity.map((id: string) => this.chips.node(id)),
          ...step.messages.map((id: string) => this.chips.message(id)),
          ...step.operations.map((reference: string) => this.chips.element(reference)),
          ...step.rules.map((id: string) => this.chips.requirement(id)),
        ];
        return '<li class="step ' + step.actor + '" data-anchor="' + step.number + '">' +
          '<span class="step-number">' + step.number + '</span>' +
          '<div><span class="step-who">' + (step.actor === 'actor' ? T.specification.actor : T.specification.system) + '</span>' +
          '<p>' + step.text + '</p>' + (links.length === 0 ? '' : '<div class="trace-list">' + links.join('') + '</div>') + '</div></li>';
      })
      .join('') + '</ol>';
  }
}
