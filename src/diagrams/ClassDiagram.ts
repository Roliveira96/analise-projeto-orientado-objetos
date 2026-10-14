import type {
  ClassDiagramModel,
  ClassRelation,
  Point,
  RelationEnd,
  UmlAttribute,
  UmlClass,
  UmlEnumeration,
  UmlOperation,
} from '../model/uml';
import { CHAR_WIDTH, longestSegmentMiddle, polyline, svgDocument, text } from './svg';

const LINE_HEIGHT: number = 17;
const PADDING_X: number = 12;
const COMPARTMENT_PADDING: number = 7;
const NAME_HEIGHT: number = 30;
const STEREOTYPE_HEIGHT: number = 14;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function attributeLine(attribute: UmlAttribute): string {
  const name: string = (attribute.derived === true ? '/' : '') + attribute.name;
  const multiplicity: string = attribute.multiplicity === undefined ? '' : ' [' + attribute.multiplicity + ']';
  return attribute.visibility + ' ' + name + ': ' + attribute.type + multiplicity;
}

/** Operation as drawn: void returns are omitted and long parameter lists use their short form. */
export function operationLine(operation: UmlOperation): string {
  const parameters: string =
    operation.shortParameters ?? operation.parameters.map((parameter) => parameter.name + ': ' + parameter.type).join(', ');
  const returns: string = operation.returns === 'void' ? '' : ': ' + operation.returns;
  return operation.visibility + ' ' + operation.name + '(' + parameters + ')' + returns;
}

/** Full signature, used in the detail panel. */
export function operationSignature(operation: UmlOperation): string {
  const parameters: string = operation.parameters.map((parameter) => parameter.name + ': ' + parameter.type).join(', ');
  return operation.visibility + ' ' + operation.name + '(' + parameters + '): ' + operation.returns;
}

/** Renders the class diagram from the model: boxes are sized by their text, lines are orthogonal. */
export class ClassDiagram {
  private readonly diagram: ClassDiagramModel;
  private readonly boxes: Map<string, Box> = new Map<string, Box>();

  constructor(diagram: ClassDiagramModel) {
    this.diagram = diagram;
    for (const item of diagram.classes) this.boxes.set(item.id, ClassDiagram.classBox(item));
    for (const item of diagram.enumerations) this.boxes.set(item.id, ClassDiagram.enumerationBox(item));
  }

  public static classBox(item: UmlClass): Box {
    const lines: string[] = [...item.attributes.map(attributeLine), ...item.operations.map(operationLine)];
    const longest: number = Math.max(item.id.length * 1.08, ...lines.map((line: string) => line.length));
    const header: number = NAME_HEIGHT + (item.stereotype === undefined ? 0 : STEREOTYPE_HEIGHT);
    const attributes: number = ClassDiagram.compartment(item.attributes.length);
    const operations: number = ClassDiagram.compartment(item.operations.length);
    return { x: item.x, y: item.y, width: Math.ceil(longest * CHAR_WIDTH + PADDING_X * 2), height: header + attributes + operations };
  }

  public static enumerationBox(item: UmlEnumeration): Box {
    const longest: number = Math.max(item.id.length * 1.08, '«enumeration»'.length, ...item.literals.map((literal: string) => literal.length));
    return {
      x: item.x,
      y: item.y,
      width: Math.ceil(longest * CHAR_WIDTH + PADDING_X * 2),
      height: NAME_HEIGHT + STEREOTYPE_HEIGHT + ClassDiagram.compartment(item.literals.length),
    };
  }

  private static compartment(lines: number): number {
    return lines === 0 ? 12 : COMPARTMENT_PADDING * 2 + lines * LINE_HEIGHT - 4;
  }

  public box(id: string): Box {
    const found: Box | undefined = this.boxes.get(id);
    if (found === undefined) throw new Error('Unknown element: ' + id);
    return found;
  }

  public allBoxes(): Array<{ id: string; box: Box }> {
    return Array.from(this.boxes.entries()).map(([id, box]) => ({ id, box }));
  }

  public render(): string {
    const relations: string = this.diagram.relations.map((relation: ClassRelation) => this.relation(relation)).join('');
    const classes: string = this.diagram.classes.map((item: UmlClass) => this.classShape(item)).join('');
    const enumerations: string = this.diagram.enumerations.map((item: UmlEnumeration) => this.enumerationShape(item)).join('');
    return svgDocument(this.diagram.width, this.diagram.height, relations + classes + enumerations, 'Diagrama de classes');
  }

  /** Point on the border of a box. */
  public anchor(end: RelationEnd): Point {
    const box: Box = this.box(end.element);
    switch (end.side) {
      case 'top':
        return { x: box.x + box.width * end.at, y: box.y };
      case 'bottom':
        return { x: box.x + box.width * end.at, y: box.y + box.height };
      case 'left':
        return { x: box.x, y: box.y + box.height * end.at };
      case 'right':
        return { x: box.x + box.width, y: box.y + box.height * end.at };
    }
  }

  /** Orthogonal route between the two ends: straight when aligned, otherwise one or two elbows. */
  public route(relation: ClassRelation): Point[] {
    const start: Point = this.anchor(relation.from);
    const end: Point = this.anchor(relation.to);
    if (relation.via !== undefined) return [start, ...relation.via, end];
    const horizontal = (side: string): boolean => side === 'left' || side === 'right';
    const fromHorizontal: boolean = horizontal(relation.from.side);
    const toHorizontal: boolean = horizontal(relation.to.side);
    if (Math.abs(start.x - end.x) < 0.5 || Math.abs(start.y - end.y) < 0.5) return [start, end];
    if (fromHorizontal && toHorizontal) {
      const middle: number = (start.x + end.x) / 2;
      return [start, { x: middle, y: start.y }, { x: middle, y: end.y }, end];
    }
    if (!fromHorizontal && !toHorizontal) {
      const middle: number = (start.y + end.y) / 2;
      return [start, { x: start.x, y: middle }, { x: end.x, y: middle }, end];
    }
    return fromHorizontal ? [start, { x: end.x, y: start.y }, end] : [start, { x: start.x, y: end.y }, end];
  }

  private relation(relation: ClassRelation): string {
    const points: Point[] = this.route(relation);
    const extra: Record<string, string> = {};
    if (relation.kind === 'composition') extra['marker-start'] = 'url(#m-diamond)';
    if (relation.kind === 'dependency') extra['marker-end'] = 'url(#m-open)';
    const className: string = 'uml-line' + (relation.kind === 'dependency' ? ' uml-dashed' : '');
    let labels: string = this.endLabels(relation.from, points[0]) + this.endLabels(relation.to, points[points.length - 1]);
    if (relation.label !== undefined) {
      const middle = relation.labelAt === undefined ? longestSegmentMiddle(points) : { point: relation.labelAt, horizontal: true };
      // Below horizontal lines and left of vertical ones: the multiplicities take the other side.
      labels += middle.horizontal
        ? text(middle.point.x, middle.point.y + 16, relation.label, 'uml-assoc-name', { 'text-anchor': 'middle' })
        : text(middle.point.x - 8, middle.point.y + 4, relation.label, 'uml-assoc-name', { 'text-anchor': 'end' });
    }
    return '<g class="uml-class-relation" data-id="' + relation.id + '" data-ends="' + relation.from.element + ' ' + relation.to.element + '">' +
      polyline(points, 'uml-hit') + polyline(points, className, extra) + labels + '</g>';
  }

  /** Multiplicity on one side of the line end and the role name on the other. */
  private endLabels(end: RelationEnd, point: Point): string {
    const offset: number = 22;
    let multiplicity: Point;
    let role: Point;
    let anchor: string = 'start';
    switch (end.side) {
      case 'right':
        multiplicity = { x: point.x + 8, y: point.y - 7 };
        role = { x: point.x + 8, y: point.y + 15 };
        break;
      case 'left':
        multiplicity = { x: point.x - 8, y: point.y - 7 };
        role = { x: point.x - 8, y: point.y + 15 };
        anchor = 'end';
        break;
      case 'top':
        multiplicity = { x: point.x + 7, y: point.y - 8 };
        role = { x: point.x - 7, y: point.y - offset };
        break;
      case 'bottom':
        multiplicity = { x: point.x + 7, y: point.y + 16 };
        role = { x: point.x - 7, y: point.y + 16 };
        break;
    }
    let result: string = '';
    if (end.multiplicity !== undefined) result += text(multiplicity.x, multiplicity.y, end.multiplicity, 'uml-multiplicity', { 'text-anchor': anchor });
    if (end.role !== undefined) {
      const roleAnchor: string = end.side === 'top' || end.side === 'bottom' ? 'end' : anchor;
      result += text(role.x, role.y, end.role, 'uml-role', { 'text-anchor': roleAnchor });
    }
    return result;
  }

  private classShape(item: UmlClass): string {
    const box: Box = this.box(item.id);
    const center: number = box.x + box.width / 2;
    let y: number = box.y;
    let header: string = '';
    if (item.stereotype !== undefined) {
      header += text(center, y + 17, '«' + item.stereotype + '»', 'uml-stereotype', { 'text-anchor': 'middle' });
      y += STEREOTYPE_HEIGHT;
    }
    header += text(center, y + 20, item.id, 'uml-class-name', { 'text-anchor': 'middle' });
    y += NAME_HEIGHT;
    const attributesTop: number = y;
    const attributes: string = item.attributes
      .map((attribute: UmlAttribute, i: number) =>
        '<g class="uml-member" data-member="' + item.id + '.' + attribute.name + '">' +
        text(box.x + PADDING_X, attributesTop + COMPARTMENT_PADDING + 11 + i * LINE_HEIGHT, attributeLine(attribute), 'uml-member-text' + (attribute.derived === true ? ' uml-derived' : '')) +
        '</g>')
      .join('');
    y += ClassDiagram.compartment(item.attributes.length);
    const operationsTop: number = y;
    const operations: string = item.operations
      .map((operation: UmlOperation, i: number) =>
        '<g class="uml-member" data-member="' + item.id + '.' + operation.name + '">' +
        '<rect class="uml-member-hit" x="' + (box.x + 2) + '" y="' + (operationsTop + COMPARTMENT_PADDING - 2 + i * LINE_HEIGHT) + '" width="' + (box.width - 4) + '" height="' + LINE_HEIGHT + '" rx="3"/>' +
        text(box.x + PADDING_X, operationsTop + COMPARTMENT_PADDING + 11 + i * LINE_HEIGHT, operationLine(operation), 'uml-member-text') +
        '</g>')
      .join('');
    return '<g class="uml-class' + (item.stereotype === undefined ? '' : ' uml-' + item.stereotype) + '" data-id="' + item.id + '" tabindex="0">' +
      '<rect class="uml-shape" x="' + box.x + '" y="' + box.y + '" width="' + box.width + '" height="' + box.height + '" rx="3"/>' +
      '<line class="uml-line" x1="' + box.x + '" x2="' + (box.x + box.width) + '" y1="' + attributesTop + '" y2="' + attributesTop + '"/>' +
      '<line class="uml-line" x1="' + box.x + '" x2="' + (box.x + box.width) + '" y1="' + operationsTop + '" y2="' + operationsTop + '"/>' +
      header + attributes + operations + '</g>';
  }

  private enumerationShape(item: UmlEnumeration): string {
    const box: Box = this.box(item.id);
    const center: number = box.x + box.width / 2;
    const top: number = box.y + NAME_HEIGHT + STEREOTYPE_HEIGHT;
    const literals: string = item.literals
      .map((literal: string, i: number) => text(box.x + PADDING_X, top + COMPARTMENT_PADDING + 11 + i * LINE_HEIGHT, literal, 'uml-member-text'))
      .join('');
    return '<g class="uml-class uml-enumeration" data-id="' + item.id + '" tabindex="0">' +
      '<rect class="uml-shape" x="' + box.x + '" y="' + box.y + '" width="' + box.width + '" height="' + box.height + '" rx="3"/>' +
      text(center, box.y + 17, '«enumeration»', 'uml-stereotype', { 'text-anchor': 'middle' }) +
      text(center, box.y + STEREOTYPE_HEIGHT + 20, item.id, 'uml-class-name', { 'text-anchor': 'middle' }) +
      '<line class="uml-line" x1="' + box.x + '" x2="' + (box.x + box.width) + '" y1="' + top + '" y2="' + top + '"/>' +
      literals + '</g>';
  }
}
