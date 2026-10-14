import { T } from '../content/uiText';
import { query } from './html';

/** Previous / play / next / restart buttons with autoplay, shared by the animated diagrams. */
export class StepControls {
  private timer: number | null = null;
  private readonly onStep: (direction: 1 | -1) => boolean;
  private readonly onRestart: () => void;
  private readonly intervalMs: number;
  private root: HTMLElement | null = null;

  constructor(onStep: (direction: 1 | -1) => boolean, onRestart: () => void, intervalMs: number = 1900) {
    this.onStep = onStep;
    this.onRestart = onRestart;
    this.intervalMs = intervalMs;
  }

  public html(): string {
    const s = T.common.step;
    return '<div class="step-controls">' +
      '<button class="secondary-button" data-step="restart" title="' + s.restart + '">⏮</button>' +
      '<button class="secondary-button" data-step="previous" title="' + s.previous + '">◀</button>' +
      '<button class="primary-button" data-step="play" title="' + s.play + '">▶ ' + s.play + '</button>' +
      '<button class="secondary-button" data-step="next" title="' + s.next + '">' + s.next + ' ▶</button>' +
      '</div>';
  }

  public bind(root: HTMLElement): void {
    this.root = root;
    query(root, '[data-step="restart"]').addEventListener('click', () => {
      this.stop();
      this.onRestart();
    });
    query(root, '[data-step="previous"]').addEventListener('click', () => {
      this.stop();
      this.onStep(-1);
    });
    query(root, '[data-step="next"]').addEventListener('click', () => {
      this.stop();
      this.onStep(1);
    });
    query(root, '[data-step="play"]').addEventListener('click', () => (this.timer === null ? this.play() : this.stop()));
  }

  public play(): void {
    if (this.timer !== null) return;
    if (!this.onStep(1)) {
      // At the end: start over.
      this.onRestart();
      this.onStep(1);
    }
    this.timer = window.setInterval(() => {
      if (!this.onStep(1)) this.stop();
    }, this.intervalMs);
    this.updateButton();
  }

  public stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.updateButton();
  }

  private updateButton(): void {
    if (this.root === null) return;
    const button: HTMLElement = query(this.root, '[data-step="play"]');
    button.textContent = this.timer === null ? '▶ ' + T.common.step.play : '⏸ ' + T.common.step.pause;
  }
}
