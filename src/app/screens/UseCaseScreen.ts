import { ArtifactScreen } from '../ArtifactScreen';
import type { ScreenHeading } from '../ArtifactScreen';
import { UseCaseDiagram } from '../../diagrams/UseCaseDiagram';
import type { Actor, UseCase, UseCaseRelation } from '../../model/uml';
import { escapeHtml } from '../html';
import { T } from '../../content/uiText';

/** Use case diagram with the details of the selected actor or use case. */
export class UseCaseScreen extends ArtifactScreen {
  protected heading(): ScreenHeading {
    return { icon: '🎭', title: T.useCases.title, subtitle: T.useCases.subtitle, color: '--c-uc' };
  }

  protected diagram(): string {
    return new UseCaseDiagram(this.index.model.useCaseDiagram).render();
  }

  protected defaultPanel(): string {
    const legend: string = T.useCases.legend.map(([term, text]) => '<dt>' + term + '</dt><dd>' + text + '</dd>').join('');
    const actors: string = this.index.model.useCaseDiagram.actors
      .map((actor: Actor) => '<li><a href="#/use-cases/' + actor.id + '"><b>' + actor.name + '</b></a> ' + actor.description + '</li>')
      .join('');
    return '<h2>' + T.useCases.legendTitle + '</h2><dl class="legend">' + legend + '</dl>' +
      '<h3>' + T.useCases.actorsLabel + '</h3><ul class="plain-list">' + actors + '</ul>' +
      '<p class="muted">' + T.common.nothingSelected + '</p>';
  }

  protected select(id: string): void {
    const diagram = this.index.model.useCaseDiagram;
    const actor: Actor | undefined = diagram.actors.find((item: Actor) => item.id === id);
    const useCase: UseCase | undefined = this.index.useCase(id);
    if (actor === undefined && useCase === undefined) return;
    this.clearSelection();
    const target: Element | undefined = this.svgQuery('[data-id="' + id + '"]')[0];
    target?.classList.add('is-selected');
    for (const line of this.svgQuery('[data-ends~="' + id + '"]')) {
      line.classList.add('is-related');
      for (const end of (line.getAttribute('data-ends') ?? '').split(' ')) {
        if (end !== id) this.svgQuery('[data-id="' + end + '"]')[0]?.classList.add('is-related');
      }
    }
    this.reveal(target);
    this.setPanel(actor !== undefined ? this.actorPanel(actor) : this.useCasePanel(useCase as UseCase));
  }

  private actorPanel(actor: Actor): string {
    const useCases: UseCase[] = this.index.model.useCaseDiagram.useCases.filter((item: UseCase) =>
      item.actors.includes(actor.id) || (item.secondaryActors ?? []).includes(actor.id));
    return '<span class="panel-kicker">' + T.useCases.actorsLabel + '</span><h2>' + actor.name + '</h2><p>' + actor.description + '</p>' +
      '<h3>' + T.common.usedIn + '</h3>' + this.chips.list(useCases.map((item: UseCase) => item.id), (item: string) => this.chips.useCase(item));
  }

  private useCasePanel(useCase: UseCase): string {
    const diagram = this.index.model.useCaseDiagram;
    const actorName = (id: string): string => diagram.actors.find((actor: Actor) => actor.id === id)?.name ?? id;
    const actors: string[] = [
      ...useCase.actors.map((id: string) => actorName(id) + ' · ' + T.useCases.primary),
      ...(useCase.secondaryActors ?? []).map((id: string) => actorName(id) + ' · ' + T.useCases.secondary),
    ];
    const relations: string = diagram.relations
      .filter((relation: UseCaseRelation) => relation.from === useCase.id || relation.to === useCase.id)
      .map((relation: UseCaseRelation) =>
        '<li><code>' + relation.from + ' «' + relation.kind + '» ' + relation.to + '</code> ' + escapeHtml(relation.note) + '</li>')
      .join('');
    const requirements: string[] = this.index.model.requirements.filter((item) => item.useCases.includes(useCase.id)).map((item) => item.id);
    const nodes: string[] = this.index.model.activityDiagram.nodes.filter((node) => (node.realizes ?? []).includes(useCase.id)).map((node) => node.id);
    const spec: string = this.index.model.specification.useCase === useCase.id ? '<a class="primary-button panel-cta" href="#/specification">' + T.useCases.openSpec + '</a>' : '';
    return '<span class="panel-kicker">' + useCase.id + '</span><h2>' + useCase.name + '</h2><p>' + useCase.summary + '</p>' + spec +
      '<h3>' + T.useCases.actorsLabel + '</h3>' +
      (actors.length === 0 ? '<p class="muted">' + T.useCases.included + '</p>' : '<ul class="plain-list">' + actors.map((item) => '<li>' + item + '</li>').join('') + '</ul>') +
      (relations === '' ? '' : '<h3>' + T.useCases.relations + '</h3><ul class="plain-list">' + relations + '</ul>') +
      '<h3>' + T.useCases.tracedBy + '</h3>' + this.chips.list(requirements, (item: string) => this.chips.requirement(item)) +
      '<h3>' + T.useCases.realizedBy + '</h3>' + this.chips.list(nodes, (item: string) => this.chips.node(item));
  }
}
