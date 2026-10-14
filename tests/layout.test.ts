import { describe, expect, it } from 'vitest';
import { model } from '../src/content/model';
import { USE_CASE_RX, USE_CASE_RY, UseCaseDiagram } from '../src/diagrams/UseCaseDiagram';
import type { Segment } from '../src/diagrams/UseCaseDiagram';
import type { Point } from '../src/model/uml';

/** Margin kept between a line and any shape it does not connect. */
const CLEARANCE: number = 6;

function segmentsCross(a: Segment, b: Segment): boolean {
  const cross = (o: Point, p: Point, q: Point): number => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1: number = cross(b.from, b.to, a.from);
  const d2: number = cross(b.from, b.to, a.to);
  const d3: number = cross(a.from, a.to, b.from);
  const d4: number = cross(a.from, a.to, b.to);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

describe('use case diagram layout', () => {
  const diagram: UseCaseDiagram = new UseCaseDiagram(model.useCaseDiagram);
  const segments: Segment[] = [...diagram.associationSegments(), ...diagram.relationSegments()];
  const { useCases, boundary } = model.useCaseDiagram;

  it('no line runs through a use case it does not connect', () => {
    const problems: string[] = [];
    for (const segment of segments) {
      for (const useCase of useCases.filter((item) => !segment.ends.includes(item.id))) {
        for (let t = 0; t <= 1; t += 0.01) {
          const x: number = segment.from.x + (segment.to.x - segment.from.x) * t;
          const y: number = segment.from.y + (segment.to.y - segment.from.y) * t;
          if (((x - useCase.x) / (USE_CASE_RX + CLEARANCE)) ** 2 + ((y - useCase.y) / (USE_CASE_RY + CLEARANCE)) ** 2 < 1) {
            problems.push(segment.ends.join('-') + ' over ' + useCase.id);
            break;
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('lines do not cross each other', () => {
    const problems: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        if (segments[i].ends.some((end: string) => segments[j].ends.includes(end))) continue;
        if (segmentsCross(segments[i], segments[j])) problems.push(segments[i].ends.join('-') + ' x ' + segments[j].ends.join('-'));
      }
    }
    expect(problems).toEqual([]);
  });

  it('use cases do not overlap and stay inside the system boundary', () => {
    const problems: string[] = [];
    for (const a of useCases) {
      if (a.x - USE_CASE_RX < boundary.x || a.x + USE_CASE_RX > boundary.x + boundary.width) problems.push(a.id + ' outside');
      if (a.y - USE_CASE_RY < boundary.y + 34 || a.y + USE_CASE_RY > boundary.y + boundary.height) problems.push(a.id + ' outside');
      for (const b of useCases.filter((item) => item.id > a.id)) {
        if (Math.abs(a.x - b.x) < 2 * USE_CASE_RX + 10 && Math.abs(a.y - b.y) < 2 * USE_CASE_RY + 10) problems.push(a.id + ' x ' + b.id);
      }
    }
    expect(problems).toEqual([]);
  });
});

import { ClassDiagram } from '../src/diagrams/ClassDiagram';
import type { Box } from '../src/diagrams/ClassDiagram';

describe('class diagram layout', () => {
  const diagram: ClassDiagram = new ClassDiagram(model.classDiagram);
  const boxes = diagram.allBoxes();
  const inside = (point: Point, box: Box, margin: number): boolean =>
    point.x > box.x - margin && point.x < box.x + box.width + margin && point.y > box.y - margin && point.y < box.y + box.height + margin;

  it('boxes fit the canvas and keep a gap between them', () => {
    const problems: string[] = [];
    for (const { id, box } of boxes) {
      if (box.x + box.width > model.classDiagram.width - 10 || box.y + box.height > model.classDiagram.height - 10) problems.push(id + ' outside');
      for (const other of boxes.filter((item) => item.id > id)) {
        const gap: number = 30;
        const apart: boolean =
          box.x + box.width + gap <= other.box.x || other.box.x + other.box.width + gap <= box.x ||
          box.y + box.height + gap <= other.box.y || other.box.y + other.box.height + gap <= box.y;
        if (!apart) problems.push(id + ' x ' + other.id);
      }
    }
    expect(problems).toEqual([]);
  });

  it('relations are orthogonal and never cross a box they do not connect', () => {
    const problems: string[] = [];
    for (const relation of model.classDiagram.relations) {
      const points: Point[] = diagram.route(relation);
      for (let i = 1; i < points.length; i++) {
        const a: Point = points[i - 1];
        const b: Point = points[i];
        if (Math.abs(a.x - b.x) > 0.5 && Math.abs(a.y - b.y) > 0.5) problems.push(relation.id + ' diagonal');
        for (const { id, box } of boxes.filter((item) => item.id !== relation.from.element && item.id !== relation.to.element)) {
          for (let t = 0; t <= 1; t += 0.02) {
            if (inside({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, box, 8)) {
              problems.push(relation.id + ' over ' + id);
              break;
            }
          }
        }
      }
    }
    expect([...new Set(problems)]).toEqual([]);
  });
});
