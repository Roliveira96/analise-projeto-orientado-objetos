import type { Screen } from './Screen';
import type { ModelIndex } from '../model/ModelIndex';
import { Author } from './Author';
import { ConsistencyChecker } from '../model/ConsistencyChecker';
import type { CheckResult } from '../model/ConsistencyChecker';
import { T } from '../content/uiText';
import type { ArtifactCard } from '../content/uiText';
import { author, professor } from '../content/course';

/** Cover page: what was delivered, in the order of the evaluation sheet. */
export class MenuScreen implements Screen {
  private readonly index: ModelIndex;

  constructor(index: ModelIndex) {
    this.index = index;
  }

  public mount(root: HTMLElement): void {
    const results: CheckResult[] = new ConsistencyChecker(this.index.model).run();
    const passed: number = results.filter((result: CheckResult) => result.failures.length === 0).length;
    const cards: string = T.artifacts.map((card: ArtifactCard, i: number) => this.card(card, i)).join('');
    const how: string = T.menu.how.map((text: string, i: number) => '<div><b>' + (i + 1) + '</b><span>' + text + '</span></div>').join('');
    root.innerHTML =
      '<div class="menu">' +
      '  <div class="menu-backdrop" aria-hidden="true"><div class="menu-glow"></div>' + this.orbit() + '</div>' +
      '  <header class="menu-header">' +
      '    <div class="institution-box">' +
      '      <img src="/utfpr-logo.svg" alt="UTFPR" class="logo-utfpr" />' +
      '      <div class="institution-divider"></div>' +
      '      <img src="/tsi.png" alt="TSI UTFPR" class="logo-tsi" />' +
      '      <div class="institution-divider"></div>' +
      '      <div class="institution-names"><span class="institution-university">' + T.common.university + '</span>' +
      '        <span class="institution-campus">' + T.common.course + '</span></div>' +
      '    </div>' +
      '    <span class="menu-seal">' + T.menu.seal + ' · ' + professor.subject + '</span>' +
      '    <h1>' + T.menu.titleStart + ' <span class="gradient-text">' + T.menu.titleHighlight + '</span></h1>' +
      '    <p>' + T.menu.lead + '</p>' +
      '    <div class="menu-buttons">' +
      '      <a class="primary-button" href="#/sequence">' + T.menu.startButton + '</a>' +
      '      <a class="secondary-button" href="#/traceability">' + T.menu.traceButton + '</a>' +
      '      <a class="secondary-button" href="#/requirements">' + T.menu.statementButton + '</a>' +
      '    </div>' +
      '    <a class="checks-badge' + (passed === results.length ? ' ok' : '') + '" href="#/traceability">' +
      (passed === results.length ? '✔ ' : '✘ ') + T.menu.checksOk(passed, results.length) + '</a>' +
      '  </header>' +
      '  <section class="unit"><header class="unit-header"><span class="unit-number">UML</span>' +
      '    <div><h2>' + T.menu.deliverablesTitle + '</h2><p>' + T.menu.deliverablesLead + '</p></div></header>' +
      '    <nav class="menu-cards">' + cards + '</nav></section>' +
      '  <section class="menu-how">' + how + '</section>' +
      '  <div class="people">' + new Author(author, T.menu.authorCaption, T.menu.authorPhotoAlt).renderHtml() +
      '    <section class="professor"><div class="professor-monogram" aria-hidden="true">' + professor.monogram + '</div><div>' +
      '      <span class="author-caption">' + T.menu.professorCaption + '</span><h2>' + professor.name + '</h2>' +
      '      <p class="professor-subject">' + professor.subject + '</p>' +
      '      <p class="professor-note">' + professor.note + '</p></div></section>' +
      '  </div>' +
      '</div>';
  }

  public unmount(): void {
    // Nothing to release.
  }

  private card(card: ArtifactCard, index: number): string {
    return '<a class="card" href="#/' + card.route + '" style="--card-color: var(' + card.color + ');--i:' + index + '">' +
      '<span class="card-number">' + card.number + '</span>' +
      '<span class="card-icon">' + card.icon + '</span>' +
      '<small class="card-deliverable">' + card.deliverable + '</small>' +
      '<h3>' + card.title + '</h3>' +
      '<p>' + card.summary + '</p>' +
      '<div class="card-footer"><span></span><span class="card-open">' + T.menu.open + '</span></div></a>';
  }

  /** Decorative orbit behind the title: rings that rotate as whole elements (no repaint). */
  private orbit(): string {
    return '<div class="menu-orbit">' +
      '<span class="orbit-ring ring-large"><i></i><i></i><i></i></span>' +
      '<span class="orbit-ring ring-medium"><i></i><i></i></span>' +
      '<span class="orbit-ring ring-small"><i></i></span>' +
      '</div>';
  }
}
