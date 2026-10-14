import { ArtifactScreen } from '../ArtifactScreen';
import type { ScreenHeading } from '../ArtifactScreen';
import { StepControls } from '../StepControls';
import { SequenceDiagram, messageLabel } from '../../diagrams/SequenceDiagram';
import type { Lifeline, ObjectState, SequenceMessage, SequenceScenario } from '../../model/uml';
import { escapeHtml, query, queryAll } from '../html';
import { T } from '../../content/uiText';

type ObjectSnapshot = Map<string, Map<string, string>>;

/** Sequence diagram played message by message, with the state of each object beside it. */
export class SequenceScreen extends ArtifactScreen {
  private readonly controls: StepControls = new StepControls((direction) => this.step(direction), () => this.restart(), 2200);
  private scenario: SequenceScenario = this.index.model.sequenceDiagram.scenarios[0];
  private position: number = -1;

  protected heading(): ScreenHeading {
    return { icon: '📨', title: T.sequence.title, subtitle: T.sequence.subtitle, color: '--c-seq' };
  }

  protected diagram(): string {
    return new SequenceDiagram(this.index.model.sequenceDiagram).render();
  }

  protected toolbar(): string {
    return this.controls.html();
  }

  protected defaultPanel(): string {
    const scenarios: string = this.index.model.sequenceDiagram.scenarios
      .map((scenario: SequenceScenario) =>
        '<button class="chip' + (scenario === this.scenario ? ' active' : '') + '" data-scenario="' + scenario.id + '">' + scenario.title + '</button>')
      .join('');
    const legend: string = T.sequence.legend.map(([term, text]) => '<dt>' + term + '</dt><dd>' + text + '</dd>').join('');
    return '<h2>' + T.sequence.scenarios + '</h2><div class="chips scenario-chips">' + scenarios + '</div>' +
      '<p class="scenario-description">' + this.scenario.description + '</p>' +
      '<div class="narration" data-message-card></div>' +
      '<h3>' + T.sequence.objects + '</h3><div class="object-states" data-objects></div>' +
      '<h3>' + T.sequence.legendTitle + '</h3><dl class="legend">' + legend + '</dl>';
  }

  protected afterMount(root: HTMLElement): void {
    this.controls.bind(root);
    this.bindScenarioChips(root);
    this.restart();
  }

  public unmount(): void {
    this.controls.stop();
    super.unmount();
  }

  public focus(argument: string | null): void {
    if (argument !== null) this.select(argument);
  }

  /** Jumps to a message, switching to a scenario that contains it when needed. */
  protected select(id: string): void {
    if (this.index.message(id) === undefined) return;
    this.controls.stop();
    if (!this.scenario.messages.includes(id)) {
      const scenario: SequenceScenario | undefined = this.index.model.sequenceDiagram.scenarios.find((item) => item.messages.includes(id));
      if (scenario === undefined) return;
      this.useScenario(scenario);
    }
    this.goTo(this.scenario.messages.indexOf(id));
  }

  private bindScenarioChips(root: HTMLElement): void {
    for (const chip of queryAll(root, '[data-scenario]')) {
      chip.addEventListener('click', () => {
        const scenario: SequenceScenario | undefined = this.index.model.sequenceDiagram.scenarios.find((item) => item.id === chip.dataset.scenario);
        if (scenario === undefined) return;
        this.controls.stop();
        this.useScenario(scenario);
        this.controls.play();
      });
    }
  }

  private useScenario(scenario: SequenceScenario): void {
    this.scenario = scenario;
    this.setPanel(this.defaultPanel());
    if (this.root !== null) this.bindScenarioChips(this.root);
    this.restart();
  }

  private restart(): void {
    this.goTo(-1);
  }

  private step(direction: 1 | -1): boolean {
    const next: number = this.position + direction;
    if (next < -1 || next >= this.scenario.messages.length) return false;
    this.goTo(next);
    return true;
  }

  private goTo(position: number): void {
    this.position = position;
    const done: Set<string> = new Set(this.scenario.messages.slice(0, Math.max(0, position)));
    const current: string | undefined = position >= 0 ? this.scenario.messages[position] : undefined;
    for (const element of this.svgQuery('[data-message]')) {
      const id: string = element.getAttribute('data-message') ?? '';
      element.classList.toggle('is-muted', !this.scenario.messages.includes(id));
      element.classList.toggle('is-done', done.has(id));
      element.classList.toggle('is-current', id === current);
    }
    const fragments: Element[] = this.svgQuery('.uml-fragment');
    for (const fragment of fragments) fragment.classList.toggle('is-muted', !this.scenario.messages.includes(fragment.getAttribute('data-first') ?? ''));
    if (current !== undefined) this.reveal(this.svgQuery('[data-message="' + current + '"]')[0]);
    this.renderMessage(current);
    this.renderObjects(position);
  }

  private renderMessage(id: string | undefined): void {
    if (this.root === null) return;
    const card: HTMLElement = query(this.root, '[data-message-card]');
    const message: SequenceMessage | undefined = id === undefined ? undefined : this.index.message(id);
    if (message === undefined) {
      card.innerHTML = '<span class="panel-kicker">' + T.sequence.message + '</span><p>' + T.sequence.start + '</p>';
      return;
    }
    const steps: string[] = this.index.specificationSteps().filter((step) => step.messages.includes(message.id)).map((step) => step.number);
    const target: string | undefined = this.index.lifelineClass(message.to);
    const operation: string[] = message.kind === 'sync' || message.kind === 'self' ? [target + '.' + message.operation] : message.kind === 'create' ? [target ?? ''] : [];
    card.innerHTML =
      '<span class="panel-kicker">' + T.sequence.message + ' · ' + (this.position + 1) + '/' + this.scenario.messages.length + '</span>' +
      '<h3 class="code-title">' + escapeHtml(messageLabel(message)) + '</h3><p>' + message.narration + '</p>' +
      '<div class="usage-grid"><span>' + T.sequence.explains + '</span>' + this.chips.list(steps, (item: string) => this.chips.step(item)) +
      '<span>' + T.sequence.calls + '</span>' + this.chips.list(operation, (item: string) => this.chips.element(item)) + '</div>';
  }

  /** Applies the effects of the messages already sent to the scenario's initial state. */
  private snapshot(position: number): { states: ObjectSnapshot; changed: Set<string>; created: Set<string> } {
    const states: ObjectSnapshot = new Map();
    for (const state of this.scenario.initialState as ObjectState[]) states.set(state.lifeline, new Map(Object.entries(state.attributes)));
    const changed: Set<string> = new Set();
    const created: Set<string> = new Set();
    this.scenario.messages.slice(0, position + 1).forEach((id: string, i: number) => {
      const message: SequenceMessage | undefined = this.index.message(id);
      if (message?.kind === 'create') created.add(message.to);
      for (const effect of message?.effects ?? []) {
        if (!states.has(effect.lifeline)) states.set(effect.lifeline, new Map());
        states.get(effect.lifeline)?.set(effect.attribute, effect.value);
        if (i === position) changed.add(effect.lifeline + '.' + effect.attribute);
      }
    });
    return { states, changed, created };
  }

  private renderObjects(position: number): void {
    if (this.root === null) return;
    const { states, changed, created } = this.snapshot(position);
    const lifelines: Lifeline[] = this.index.model.sequenceDiagram.lifelines.filter((lifeline: Lifeline) =>
      states.has(lifeline.id) || lifeline.createdBy !== undefined);
    query(this.root, '[data-objects]').innerHTML = lifelines
      .map((lifeline: Lifeline) => {
        const name: string = lifeline.instance + ':' + lifeline.classifier;
        const exists: boolean = lifeline.createdBy === undefined || created.has(lifeline.id);
        const rows: string = exists
          ? Array.from(states.get(lifeline.id)?.entries() ?? [])
            .map(([attribute, value]) =>
              '<div class="object-row' + (changed.has(lifeline.id + '.' + attribute) ? ' changed' : '') + '"><span>' + attribute + '</span><b>' + value + '</b></div>')
            .join('')
          : '<div class="object-row muted">' + T.sequence.notCreated + '</div>';
        return '<div class="object-card' + (exists ? '' : ' ghost') + '"><u>' + name + '</u>' + rows + '</div>';
      })
      .join('');
  }
}
