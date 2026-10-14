import type { Screen } from './Screen';
import { MenuScreen } from './MenuScreen';
import { RequirementsScreen } from './screens/RequirementsScreen';
import { UseCaseScreen } from './screens/UseCaseScreen';
import { SpecificationScreen } from './screens/SpecificationScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { ClassScreen } from './screens/ClassScreen';
import { SequenceScreen } from './screens/SequenceScreen';
import { TraceabilityScreen } from './screens/TraceabilityScreen';
import { ModelIndex } from '../model/ModelIndex';
import { model } from '../content/model';

type ScreenFactory = (index: ModelIndex, argument: string | null) => Screen;

const ROUTES: Record<string, ScreenFactory> = {
  requirements: (index, argument) => new RequirementsScreen(index, argument),
  'use-cases': (index, argument) => new UseCaseScreen(index, argument),
  specification: (index, argument) => new SpecificationScreen(index, argument),
  activity: (index, argument) => new ActivityScreen(index, argument),
  classes: (index, argument) => new ClassScreen(index, argument),
  sequence: (index, argument) => new SequenceScreen(index, argument),
  traceability: (index) => new TraceabilityScreen(index),
};

/** Switches screens based on the address: #/<artifact>/<focused element>. */
export class Application {
  private readonly root: HTMLElement;
  private readonly index: ModelIndex = new ModelIndex(model);
  private currentScreen: Screen | null = null;
  private currentRoute: string | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  public start(): void {
    window.addEventListener('hashchange', () => this.navigate());
    this.navigate();
  }

  private navigate(): void {
    const parts: string[] = window.location.hash.replace(/^#\/?/, '').split('/');
    const route: string = parts[0] ?? '';
    const argument: string | null = parts.length > 1 && parts[1] !== '' ? decodeURIComponent(parts.slice(1).join('/')) : null;
    if (route === this.currentRoute && this.currentScreen?.focus !== undefined) {
      this.currentScreen.focus(argument);
      return;
    }
    this.currentRoute = route;
    const factory: ScreenFactory | undefined = ROUTES[route];
    this.show(factory === undefined ? new MenuScreen(this.index) : factory(this.index, argument));
  }

  private show(screen: Screen): void {
    this.currentScreen?.unmount();
    this.currentScreen = screen;
    this.root.innerHTML = '';
    screen.mount(this.root);
    window.scrollTo(0, 0);
  }
}
