import type { Screen } from './Screen';
import type { ModelIndex } from '../model/ModelIndex';
import { TraceChips } from './TraceChips';
import { screenHeader } from './ArtifactScreen';
import type { ScreenHeading } from './ArtifactScreen';
import { query } from './html';

/** Text screens (requirements, specification, traceability): one readable column with anchors. */
export abstract class DocumentScreen implements Screen {
  protected readonly index: ModelIndex;
  protected readonly chips: TraceChips;
  private readonly initialFocus: string | null;
  private root: HTMLElement | null = null;

  constructor(index: ModelIndex, focus: string | null) {
    this.index = index;
    this.chips = new TraceChips(index);
    this.initialFocus = focus;
  }

  protected abstract heading(): ScreenHeading;
  protected abstract route(): string;
  protected abstract body(): string;

  public mount(root: HTMLElement): void {
    this.root = root;
    const heading: ScreenHeading = this.heading();
    root.innerHTML = '<div class="screen document-screen" style="--topic-color: var(' + heading.color + ')">' +
      screenHeader(heading, this.route()) + '<main class="document">' + this.body() + '</main></div>';
    if (this.initialFocus !== null) this.focus(this.initialFocus);
  }

  public unmount(): void {
    this.root = null;
  }

  /** Highlights the block with data-anchor equal to the argument and scrolls to it. */
  public focus(argument: string | null): void {
    if (this.root === null) return;
    for (const element of Array.from(this.root.querySelectorAll('.is-focused'))) element.classList.remove('is-focused');
    if (argument === null) return;
    const target: Element | null = this.root.querySelector('[data-anchor="' + CSS.escape(argument) + '"]');
    if (target === null) return;
    target.classList.add('is-focused');
    const scroller: HTMLElement = query(this.root, '.document');
    const offset: number = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 90;
    scroller.scrollBy({ top: offset, behavior: 'smooth' });
    window.scrollBy({ top: target.getBoundingClientRect().top - 120, behavior: 'smooth' });
  }
}
