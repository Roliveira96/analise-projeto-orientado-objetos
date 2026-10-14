import type { Actor, Point, UseCase, UseCaseDiagramModel, UseCaseRelation } from '../model/uml';
import { centeredLines, clipEllipse, polyline, svgDocument, text, wrap } from './svg';

export const USE_CASE_RX: number = 118;
export const USE_CASE_RY: number = 36;
/** Distance from the actor center where association lines start (clear of the stick figure). */
const ACTOR_CLEARANCE: number = 30;

export interface Segment {
  from: Point;
  to: Point;
  /** Elements the segment connects, so a geometry check can ignore them. */
  ends: string[];
}

/** Renders the use case diagram and exposes the line geometry for layout checks. */
export class UseCaseDiagram {
  private readonly diagram: UseCaseDiagramModel;

  constructor(diagram: UseCaseDiagramModel) {
    this.diagram = diagram;
  }

  public render(): string {
    const { boundary } = this.diagram;
    const frame: string =
      '<rect class="uml-boundary" x="' + boundary.x + '" y="' + boundary.y + '" width="' + boundary.width + '" height="' + boundary.height + '" rx="6"/>' +
      text(boundary.x + 16, boundary.y + 26, this.diagram.systemName, 'uml-boundary-title');
    const associations: string = this.associationSegments()
      .map((segment: Segment) =>
        '<g class="uml-assoc" data-ends="' + segment.ends.join(' ') + '">' + polyline([segment.from, segment.to], 'uml-line') + '</g>')
      .join('');
    const relations: string = this.diagram.relations.map((relation: UseCaseRelation) => this.relation(relation)).join('');
    const useCases: string = this.diagram.useCases.map((useCase: UseCase) => this.useCase(useCase)).join('');
    const actors: string = this.diagram.actors.map((actor: Actor) => this.actor(actor)).join('');
    return svgDocument(this.diagram.width, this.diagram.height, frame + associations + relations + useCases + actors, this.diagram.systemName);
  }

  /** Lines between actors and use cases, clipped at the ellipse border. */
  public associationSegments(): Segment[] {
    const segments: Segment[] = [];
    for (const useCase of this.diagram.useCases) {
      for (const actorId of [...useCase.actors, ...(useCase.secondaryActors ?? [])]) {
        const actor: Actor | undefined = this.diagram.actors.find((item: Actor) => item.id === actorId);
        if (actor === undefined) continue;
        const center: Point = { x: useCase.x, y: useCase.y };
        const to: Point = clipEllipse(center, USE_CASE_RX, USE_CASE_RY, actor);
        const length: number = Math.hypot(to.x - actor.x, to.y - actor.y);
        const from: Point = { x: actor.x + ((to.x - actor.x) / length) * ACTOR_CLEARANCE, y: actor.y + ((to.y - actor.y) / length) * ACTOR_CLEARANCE };
        segments.push({ from, to, ends: [actor.id, useCase.id] });
      }
    }
    return segments;
  }

  /** Dashed include and extend arrows, from the ellipse border of one use case to the other. */
  public relationSegments(): Segment[] {
    return this.diagram.relations.map((relation: UseCaseRelation) => {
      const from: UseCase = this.find(relation.from);
      const to: UseCase = this.find(relation.to);
      return {
        from: clipEllipse(from, USE_CASE_RX, USE_CASE_RY, to),
        to: clipEllipse(to, USE_CASE_RX, USE_CASE_RY, from),
        ends: [from.id, to.id],
      };
    });
  }

  private relation(relation: UseCaseRelation): string {
    const segment: Segment = this.relationSegments()[this.diagram.relations.indexOf(relation)];
    const middle: Point = { x: (segment.from.x + segment.to.x) / 2, y: (segment.from.y + segment.to.y) / 2 };
    const label: string = relation.kind === 'include' ? '«include»' : '«extend»';
    return '<g class="uml-relation" data-ends="' + segment.ends.join(' ') + '">' +
      polyline([segment.from, segment.to], 'uml-line uml-dashed', { 'marker-end': 'url(#m-open)' }) +
      text(middle.x + 10, middle.y + 4, label, 'uml-stereotype') +
      '</g>';
  }

  private useCase(useCase: UseCase): string {
    const lines: string[] = wrap(useCase.name, 24);
    return '<g class="uml-usecase" data-id="' + useCase.id + '" tabindex="0">' +
      '<ellipse cx="' + useCase.x + '" cy="' + useCase.y + '" rx="' + USE_CASE_RX + '" ry="' + USE_CASE_RY + '" class="uml-shape"/>' +
      text(useCase.x, useCase.y - 6 - (lines.length - 1) * 8, useCase.id, 'uml-id', { 'text-anchor': 'middle' }) +
      centeredLines(useCase.x, useCase.y + 8, lines, 15, 'uml-label') +
      '</g>';
  }

  private actor(actor: Actor): string {
    const { x, y } = actor;
    const figure: string =
      '<circle cx="' + x + '" cy="' + (y - 26) + '" r="10" class="uml-shape"/>' +
      '<path class="uml-line" d="M' + x + ',' + (y - 16) + ' V' + (y + 10) + ' M' + (x - 16) + ',' + (y - 6) + ' H' + (x + 16) +
      ' M' + x + ',' + (y + 10) + ' L' + (x - 13) + ',' + (y + 30) + ' M' + x + ',' + (y + 10) + ' L' + (x + 13) + ',' + (y + 30) + '"/>';
    return '<g class="uml-actor" data-id="' + actor.id + '" tabindex="0">' + figure +
      centeredLines(x, y + 48, wrap(actor.name, 12), 15, 'uml-label uml-strong') + '</g>';
  }

  private find(id: string): UseCase {
    const found: UseCase | undefined = this.diagram.useCases.find((item: UseCase) => item.id === id);
    if (found === undefined) throw new Error('Unknown use case: ' + id);
    return found;
  }
}
