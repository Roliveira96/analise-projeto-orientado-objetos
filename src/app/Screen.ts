/** Every screen knows how to mount into a container and clean up when leaving. */
export interface Screen {
  mount(root: HTMLElement): void;
  unmount(): void;
  /** Called when the route stays the same and only the focused element changes (#/classes/Veiculo). */
  focus?: (argument: string | null) => void;
}
