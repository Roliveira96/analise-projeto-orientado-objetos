import type { ActivityDiagramModel, ActivityEdge, ActivityLane, ActivityNode, ActivityRegion, Point } from '../model/uml';
import { centeredLines, clipCircle, clipDiamond, clipRect, polyline, svgDocument, text, wrap } from './svg';

const ACTION_WIDTH: number = 200;
const LINE_HEIGHT: number = 15;
const DIAMOND_HALF: number = 18;
const CIRCLE_RADIUS: number = 12;
const BAR_HEIGHT: number = 8;
export const LANE_HEADER: number = 36;

/** Renders the activity diagram with swim lanes; edges are clipped at the node borders. */
export class ActivityDiagram {
  private readonly diagram: ActivityDiagramModel;
  private readonly nodes: Map<string, ActivityNode>;

  constructor(diagram: ActivityDiagramModel) {
    this.diagram = diagram;
    this.nodes = new Map(diagram.nodes.map((node: ActivityNode) => [node.id, node]));
  }

  public render(): string {
    const lanes: string = this.diagram.lanes.map((lane: ActivityLane) => this.lane(lane)).join('');
    const regions: string = this.diagram.regions.map((region: ActivityRegion) => this.region(region)).join('');
    const edges: string = this.diagram.edges.map((edge: ActivityEdge, i: number) => this.edge(edge, i)).join('');
    const nodes: string = this.diagram.nodes.map((node: ActivityNode) => this.node(node)).join('');
    const title: string = text(12, this.diagram.height - 12, this.diagram.title, 'uml-frame-title');
    return svgDocument(this.diagram.width, this.diagram.height, lanes + regions + edges + nodes + title + '<g class="tokens"></g>', this.diagram.title);
  }

  private node(node: ActivityNode): string {
    const { x, y } = node;
    let shape: string;
    switch (node.kind) {
      case 'initial':
        shape = '<circle class="uml-solid" cx="' + x + '" cy="' + y + '" r="' + CIRCLE_RADIUS + '"/>';
        break;
      case 'final':
        shape = '<circle class="uml-shape" cx="' + x + '" cy="' + y + '" r="' + CIRCLE_RADIUS + '"/>' +
          '<circle class="uml-solid" cx="' + x + '" cy="' + y + '" r="' + (CIRCLE_RADIUS - 5) + '"/>';
        break;
      case 'flowFinal': {
        const d: number = CIRCLE_RADIUS * 0.7;
        shape = '<circle class="uml-shape" cx="' + x + '" cy="' + y + '" r="' + CIRCLE_RADIUS + '"/>' +
          '<path class="uml-line" d="M' + (x - d) + ',' + (y - d) + ' L' + (x + d) + ',' + (y + d) + ' M' + (x + d) + ',' + (y - d) + ' L' + (x - d) + ',' + (y + d) + '"/>';
        break;
      }
      case 'decision':
      case 'merge':
        shape = '<path class="uml-shape" d="M' + x + ',' + (y - DIAMOND_HALF) + ' L' + (x + DIAMOND_HALF) + ',' + y + ' L' + x + ',' + (y + DIAMOND_HALF) + ' L' + (x - DIAMOND_HALF) + ',' + y + ' Z"/>';
        break;
      case 'fork':
      case 'join': {
        const width: number = node.width ?? 120;
        shape = '<rect class="uml-solid" x="' + (x - width / 2) + '" y="' + (y - BAR_HEIGHT / 2) + '" width="' + width + '" height="' + BAR_HEIGHT + '" rx="2"/>';
        break;
      }
      case 'action': {
        const { hw, hh } = this.actionSize(node);
        shape = '<rect class="uml-shape" x="' + (x - hw) + '" y="' + (y - hh) + '" width="' + hw * 2 + '" height="' + hh * 2 + '" rx="16"/>' +
          centeredLines(x, y, this.actionLines(node), LINE_HEIGHT, 'uml-label');
        break;
      }
    }
    return '<g class="uml-node uml-node-' + node.kind + '" data-id="' + node.id + '" tabindex="0">' + shape + '</g>';
  }

  /** Points of an edge, from the border of the source to the border of the target. */
  public edgePoints(edge: ActivityEdge): Point[] {
    const from: ActivityNode = this.find(edge.from);
    const to: ActivityNode = this.find(edge.to);
    const via: Point[] = edge.via ?? [];
    // Next to a bar the edge must be vertical, so it aims at the point of the bar right above or below.
    const start: Point = this.attach(from, via[0] ?? (ActivityDiagram.isBar(to) ? this.attach(to, from) : to));
    const end: Point = this.attach(to, via[via.length - 1] ?? (ActivityDiagram.isBar(from) ? start : from));
    return [start, ...via, end];
  }

  private static isBar(node: ActivityNode): boolean {
    return node.kind === 'fork' || node.kind === 'join';
  }

  public find(id: string): ActivityNode {
    const node: ActivityNode | undefined = this.nodes.get(id);
    if (node === undefined) throw new Error('Unknown activity node: ' + id);
    return node;
  }

  private edge(edge: ActivityEdge, index: number): string {
    const points: Point[] = this.edgePoints(edge);
    let guard: string = '';
    if (edge.guard !== undefined) {
      const at: Point = edge.guardAt ?? { x: (points[0].x + points[1].x) / 2 + 6, y: (points[0].y + points[1].y) / 2 - 6 };
      guard = text(at.x, at.y, edge.guard, 'uml-guard', { 'text-anchor': 'middle' });
    }
    return '<g class="uml-edge" data-edge="' + index + '" data-from="' + edge.from + '" data-to="' + edge.to + '">' +
      polyline(points, 'uml-line', { 'marker-end': 'url(#m-open)' }) + guard + '</g>';
  }

  /** Where an edge touches a node when it comes from (or goes to) the given point. */
  private attach(node: ActivityNode, toward: Point): Point {
    const center: Point = { x: node.x, y: node.y };
    switch (node.kind) {
      case 'initial':
      case 'final':
      case 'flowFinal':
        return clipCircle(center, CIRCLE_RADIUS, toward);
      case 'decision':
      case 'merge':
        return clipDiamond(center, DIAMOND_HALF, toward);
      case 'fork':
      case 'join': {
        // Bars are wide: the edge leaves vertically at the x of the other end.
        const half: number = (node.width ?? 120) / 2;
        const x: number = Math.min(node.x + half - 4, Math.max(node.x - half + 4, toward.x));
        return { x, y: node.y + (toward.y > node.y ? BAR_HEIGHT / 2 : -BAR_HEIGHT / 2) };
      }
      case 'action': {
        const { hw, hh } = this.actionSize(node);
        return clipRect(center, hw, hh, toward);
      }
    }
  }

  private actionLines(node: ActivityNode): string[] {
    const width: number = node.width ?? ACTION_WIDTH;
    return wrap(node.label ?? '', Math.floor((width - 24) / 7.3));
  }

  public actionSize(node: ActivityNode): { hw: number; hh: number } {
    const lines: number = this.actionLines(node).length;
    return { hw: (node.width ?? ACTION_WIDTH) / 2, hh: Math.max(22, (lines * LINE_HEIGHT + 16) / 2) };
  }

  private lane(lane: ActivityLane): string {
    return '<g class="uml-lane">' +
      '<rect class="uml-lane-body" x="' + lane.x + '" y="0" width="' + lane.width + '" height="' + (this.diagram.height - 30) + '"/>' +
      '<rect class="uml-lane-head" x="' + lane.x + '" y="0" width="' + lane.width + '" height="' + LANE_HEADER + '"/>' +
      text(lane.x + lane.width / 2, 23, lane.name, 'uml-lane-title', { 'text-anchor': 'middle' }) + '</g>';
  }

  private region(region: ActivityRegion): string {
    return '<g class="uml-region"><rect class="uml-region-box" x="' + region.x + '" y="' + region.y + '" width="' + region.width + '" height="' + region.height + '" rx="14"/>' +
      wrap(region.label, 18).map((line: string, i: number) => text(region.x + 12, region.y + 18 + i * 14, line, 'uml-stereotype')).join('') + '</g>';
  }
}
