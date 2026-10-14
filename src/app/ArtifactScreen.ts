import type { Screen } from './Screen';
import type { ModelIndex } from '../model/ModelIndex';
import { TraceChips } from './TraceChips';
import { query, queryAll } from './html';
import { T } from '../content/uiText';

export interface ScreenHeading {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
}

/** Header with the way back, the title and a shortcut to every artifact. */
export function screenHeader(heading: ScreenHeading, activeRoute: string): string {
  const navigation: string = T.artifacts
    .map((card) =>
      '<a class="nav-dot' + (card.route === activeRoute ? ' active' : '') + '" href="#/' + card.route + '" title="' + card.title + '" style="--dot: var(' + card.color + ')">' + card.icon + '</a>')
    .join('');
  return '<header class="screen-header">' +
    '<a class="back-button" href="#/">' + T.common.menu + '</a>' +
    '<div class="screen-title"><span class="screen-icon">' + heading.icon + '</span><div><h1>' + heading.title + '</h1><p>' + heading.subtitle + '</p></div></div>' +
    '<nav class="artifact-nav">' + navigation + '</nav>' +
    '<span class="brand-utfpr"><img src="/utfpr-logo.svg" alt="UTFPR"><span>' + T.common.brand + '</span></span>' +
    '</header>';
}

/**
 * Layout shared by the diagram screens: header, the diagram stage on the left (with zoom) and the
 * detail panel on the right. Subclasses fill the stage and react to clicks on diagram elements.
 */
export abstract class ArtifactScreen implements Screen {
  protected readonly index: ModelIndex;
  protected readonly chips: TraceChips;
  protected root: HTMLElement | null = null;
  protected initialFocus: string | null;

  constructor(index: ModelIndex, focus: string | null) {
    this.index = index;
    this.chips = new TraceChips(index);
    this.initialFocus = focus;
  }

  protected abstract heading(): ScreenHeading;
  protected abstract diagram(): string;
  /** Panel shown before anything is selected. */
  protected abstract defaultPanel(): string;
  /** Click on an element of the diagram that carries data-id. */
  protected abstract select(id: string): void;

  public focus(argument: string | null): void {
    if (argument === null) {
      this.clearSelection();
      this.setPanel(this.defaultPanel());
      return;
    }
    this.select(argument);
  }

  public mount(root: HTMLElement): void {
    this.root = root;
    const heading: ScreenHeading = this.heading();
    root.innerHTML =
      '<div class="screen" style="--topic-color: var(' + heading.color + ')">' +
      screenHeader(heading, this.route()) +
      '<div class="artifact-layout">' +
      '  <section class="stage">' +
      '    <div class="stage-toolbar">' + this.toolbar() +
      '      <button class="secondary-button zoom-button" data-action="zoom">' + T.common.actualSize + '</button></div>' +
      '    <div class="stage-scroll fit">' + this.diagram() + '</div>' +
      '  </section>' +
      '  <aside class="panel">' + this.defaultPanel() + '</aside>' +
      '</div></div>';
    query(root, '[data-action="zoom"]').addEventListener('click', (event: Event) => this.toggleZoom(event.currentTarget as HTMLButtonElement));
    query(root, '.stage-scroll').addEventListener('click', (event: Event) => {
      const target: Element | null = (event.target as Element).closest('[data-member], [data-id], [data-message]');
      if (target === null) return;
      const id: string | null = target.getAttribute('data-member') ?? target.getAttribute('data-id') ?? target.getAttribute('data-message');
      if (id !== null) window.location.hash = '#/' + this.route() + '/' + id;
    });
    this.afterMount(root);
    if (this.initialFocus !== null) this.select(this.initialFocus);
  }

  public unmount(): void {
    this.root = null;
  }

  /** Extra controls placed left of the zoom button. */
  protected toolbar(): string {
    return '<span class="stage-hint">' + T.common.nothingSelected + '</span>';
  }

  protected afterMount(_root: HTMLElement): void {
    // Subclasses wire their own controls here.
  }

  protected route(): string {
    return window.location.hash.replace(/^#\/?/, '').split('/')[0];
  }

  protected setPanel(html: string): void {
    if (this.root === null) return;
    const panel: HTMLElement = query(this.root, '.panel');
    panel.innerHTML = html;
    panel.scrollTop = 0;
  }

  protected svgQuery(selector: string): Element[] {
    return this.root === null ? [] : queryAll<Element>(this.root, '.stage-scroll ' + selector);
  }

  protected clearSelection(): void {
    for (const element of this.svgQuery('.is-selected, .is-related')) element.classList.remove('is-selected', 'is-related');
  }

  /** Scrolls the stage so the element is visible, without moving the page. */
  protected reveal(element: Element | undefined): void {
    if (element === undefined || this.root === null) return;
    const stage: HTMLElement = query(this.root, '.stage-scroll');
    const box: DOMRect = element.getBoundingClientRect();
    const view: DOMRect = stage.getBoundingClientRect();
    stage.scrollBy({
      left: box.left + box.width / 2 - (view.left + view.width / 2),
      top: box.top + box.height / 2 - (view.top + view.height / 2),
      behavior: 'smooth',
    });
  }

  private toggleZoom(button: HTMLButtonElement): void {
    if (this.root === null) return;
    const stage: HTMLElement = query(this.root, '.stage-scroll');
    const fit: boolean = stage.classList.toggle('fit');
    button.textContent = fit ? T.common.actualSize : T.common.fit;
  }
}
