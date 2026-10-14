import { ArtifactScreen } from '../ArtifactScreen';
import type { ScreenHeading } from '../ArtifactScreen';
import { StepControls } from '../StepControls';
import { ActivityDiagram } from '../../diagrams/ActivityDiagram';
import type { ActivityEdge, ActivityNode, ActivityScenario, Point } from '../../model/uml';
import { escapeHtml, prefersReducedMotion, query, queryAll } from '../html';
import { T } from '../../content/uiText';

const SVG_NS: string = 'http://www.w3.org/2000/svg';
const TOKEN_SPEED: number = 0.9; // pixels per millisecond

/** Activity diagram with a token that walks each scenario through the swim lanes. */
export class ActivityScreen extends ArtifactScreen {
  private readonly renderer: ActivityDiagram = new ActivityDiagram(this.index.model.activityDiagram);
  private readonly controls: StepControls = new StepControls((direction) => this.step(direction), () => this.restart(), 1700);
  private scenario: ActivityScenario = this.index.model.activityDiagram.scenarios[0];
  private position: number = -1;

  protected heading(): ScreenHeading {
    return { icon: '🔀', title: T.activity.title, subtitle: T.activity.subtitle, color: '--c-act' };
  }

  protected diagram(): string {
    return this.renderer.render();
  }

  protected toolbar(): string {
    return this.controls.html();
  }

  protected defaultPanel(): string {
    const scenarios: string = this.index.model.activityDiagram.scenarios
      .map((scenario: ActivityScenario) =>
        '<button class="chip' + (scenario === this.scenario ? ' active' : '') + '" data-scenario="' + scenario.id + '">' + scenario.title + '</button>')
      .join('');
    const legend: string = T.activity.legend.map(([term, text]) => '<dt>' + term + '</dt><dd>' + text + '</dd>').join('');
    return '<h2>' + T.activity.scenarios + '</h2><div class="chips scenario-chips">' + scenarios + '</div>' +
      '<p class="scenario-description">' + this.scenario.description + '</p>' +
      '<div class="narration"><span class="panel-kicker">' + T.activity.narration + '</span><p data-narration>' + T.sequence.start + '</p><small data-progress></small></div>' +
      '<div data-node-detail></div>' +
      '<h3>' + T.activity.legendTitle + '</h3><dl class="legend">' + legend + '</dl>';
  }

  protected afterMount(root: HTMLElement): void {
    this.controls.bind(root);
    this.bindScenarioChips(root);
  }

  public unmount(): void {
    this.controls.stop();
    super.unmount();
  }

  public focus(argument: string | null): void {
    if (argument === null) return;
    this.select(argument);
  }

  protected select(id: string): void {
    const node: ActivityNode | undefined = this.index.node(id);
    if (node === undefined || this.root === null) return;
    this.clearSelection();
    const element: Element | undefined = this.svgQuery('[data-id="' + id + '"]')[0];
    element?.classList.add('is-selected');
    this.reveal(element);
    const steps: string[] = this.index.specificationSteps().filter((step) => step.activity.includes(id)).map((step) => step.number);
    const title: string = node.label ?? node.kind;
    query(this.root, '[data-node-detail]').innerHTML =
      '<div class="node-detail"><span class="panel-kicker">' + node.kind + '</span><h3>' + escapeHtml(title) + '</h3>' +
      '<div class="usage-grid"><span>' + T.activity.realizes + '</span>' + this.chips.list(node.realizes ?? [], (item: string) => this.chips.any(item)) +
      '<span>UC08</span>' + this.chips.list(steps, (item: string) => this.chips.step(item)) + '</div></div>';
  }

  private bindScenarioChips(root: HTMLElement): void {
    for (const chip of queryAll(root, '[data-scenario]')) {
      chip.addEventListener('click', () => {
        const scenario: ActivityScenario | undefined = this.index.model.activityDiagram.scenarios.find((item) => item.id === chip.dataset.scenario);
        if (scenario === undefined) return;
        this.controls.stop();
        this.scenario = scenario;
        this.setPanel(this.defaultPanel());
        this.bindScenarioChips(root);
        this.restart();
        this.controls.play();
      });
    }
  }

  private restart(): void {
    this.position = -1;
    for (const element of this.svgQuery('.is-current, .is-done')) element.classList.remove('is-current', 'is-done');
    this.svgQuery('.tokens')[0]?.replaceChildren();
    this.updateNarration(null);
  }

  /** Moves one node forward or back along the scenario; returns false at either end. */
  private step(direction: 1 | -1): boolean {
    const next: number = this.position + direction;
    if (next < 0 || next >= this.scenario.path.length) return false;
    if (direction === -1) {
      // Going back replays the scenario up to the previous node without animation.
      this.restart();
      for (let i = 0; i <= next; i++) this.visit(i, false);
    } else {
      this.visit(next, true);
    }
    return true;
  }

  private visit(position: number, animate: boolean): void {
    const current: string[] = ([] as string[]).concat(this.scenario.path[position]);
    const previous: string[] = position === 0 ? [] : ([] as string[]).concat(this.scenario.path[position - 1]);
    for (const element of this.svgQuery('.uml-node.is-current')) {
      element.classList.remove('is-current');
      element.classList.add('is-done');
    }
    for (const id of current) {
      this.svgQuery('.uml-node[data-id="' + id + '"]')[0]?.classList.add('is-current');
      for (const from of previous) {
        const edges: ActivityEdge[] = this.index.model.activityDiagram.edges;
        const index: number = edges.findIndex((edge: ActivityEdge) => edge.from === from && edge.to === id);
        if (index < 0) continue;
        this.svgQuery('[data-edge="' + index + '"]')[0]?.classList.add('is-done');
        if (animate) this.moveToken(this.renderer.edgePoints(edges[index]));
      }
    }
    this.position = position;
    this.updateNarration(current);
  }

  /** A dot that slides along the edge; only its transform changes, so it never repaints the diagram. */
  private moveToken(points: Point[]): void {
    const layer: Element | undefined = this.svgQuery('.tokens')[0];
    if (layer === undefined) return;
    const token: SVGCircleElement = document.createElementNS(SVG_NS, 'circle') as SVGCircleElement;
    token.setAttribute('r', '7');
    token.setAttribute('class', 'token');
    layer.appendChild(token);
    const end: Point = points[points.length - 1];
    if (prefersReducedMotion()) {
      token.style.transform = 'translate(' + end.x + 'px,' + end.y + 'px)';
    } else {
      let length: number = 0;
      for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      const frames: Keyframe[] = points.map((point: Point) => ({ transform: 'translate(' + point.x + 'px,' + point.y + 'px)' }));
      const animation: Animation = token.animate(frames, { duration: Math.min(1300, Math.max(350, length / TOKEN_SPEED)), easing: 'ease-in-out', fill: 'forwards' });
      animation.onfinish = (): void => token.remove();
      return;
    }
    window.setTimeout(() => token.remove(), 300);
  }

  private updateNarration(current: string[] | null): void {
    if (this.root === null) return;
    const narration: HTMLElement = query(this.root, '[data-narration]');
    const progress: HTMLElement = query(this.root, '[data-progress]');
    if (current === null) {
      narration.textContent = T.sequence.start;
      progress.textContent = '';
      return;
    }
    const text: string = current
      .map((id: string) => this.scenario.narration[id] ?? this.index.node(id)?.label ?? id)
      .join(' · ');
    narration.textContent = text;
    progress.textContent = T.activity.step(this.position + 1, this.scenario.path.length);
    if (current.length === 1) this.select(current[0]);
  }
}
