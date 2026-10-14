/**
 * Types of the UML model. The model itself (names, texts and layout) lives in src/content/model;
 * these types are what the renderers and the consistency checker understand.
 */

export interface Point {
  x: number;
  y: number;
}

// ===== Requirements =====

export type RequirementKind = 'functional' | 'rule';

export interface Requirement {
  id: string;
  kind: RequirementKind;
  title: string;
  text: string;
  /** Excerpt of the case study that justifies the requirement. */
  source: string;
  useCases: string[];
  /** Class elements that support it: "Class", "Class.operation" or "Class.attribute". */
  elements: string[];
}

// ===== Use cases =====

export interface Actor {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
}

export interface UseCase {
  id: string;
  name: string;
  summary: string;
  x: number;
  y: number;
  /** Actors directly associated with the use case. */
  actors: string[];
  /** Actors that only receive information (drawn the same way, listed apart in the panel). */
  secondaryActors?: string[];
}

export type UseCaseRelationKind = 'include' | 'extend';

export interface UseCaseRelation {
  kind: UseCaseRelationKind;
  /** Base use case for include, extending use case for extend: the arrow always starts here. */
  from: string;
  to: string;
  /** Extension point or reason shown in the panel. */
  note: string;
}

export interface UseCaseDiagramModel {
  systemName: string;
  width: number;
  height: number;
  boundary: { x: number; y: number; width: number; height: number };
  actors: Actor[];
  useCases: UseCase[];
  relations: UseCaseRelation[];
}

// ===== Use case specification =====

export interface SpecificationStep {
  number: string;
  actor: 'actor' | 'system';
  text: string;
  activity: string[];
  messages: string[];
  operations: string[];
  rules: string[];
}

export interface SpecificationFlow {
  id: string;
  title: string;
  /** Step of the main flow where this flow starts. */
  startsAt: string;
  steps: SpecificationStep[];
  /** How the flow ends: back to a main step or finishing the use case. */
  ending: string;
}

export interface UseCaseSpecification {
  useCase: string;
  goal: string;
  primaryActor: string;
  secondaryActors: string[];
  preconditions: string[];
  postconditions: string[];
  failurePostconditions: string[];
  mainFlow: SpecificationStep[];
  alternativeFlows: SpecificationFlow[];
  exceptionFlows: SpecificationFlow[];
  rules: string[];
  includes: string[];
  extendedBy: string[];
}

// ===== Activity diagram =====

export type ActivityNodeKind = 'initial' | 'final' | 'flowFinal' | 'action' | 'decision' | 'merge' | 'fork' | 'join';

export interface ActivityLane {
  id: string;
  name: string;
  x: number;
  width: number;
}

export interface ActivityNode {
  id: string;
  kind: ActivityNodeKind;
  lane: string;
  x: number;
  y: number;
  label?: string;
  /** Width of actions and bars; the other kinds have fixed sizes. */
  width?: number;
  /** Use case or class operation this node realizes, used by the traceability links. */
  realizes?: string[];
}

export interface ActivityEdge {
  from: string;
  to: string;
  guard?: string;
  /** Bend points between the two nodes; empty means a straight or single-elbow line. */
  via?: Point[];
  /** Where the guard label is drawn. */
  guardAt?: Point;
}

export interface ActivityRegion {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ActivityScenario {
  id: string;
  title: string;
  description: string;
  /** Nodes in the order the token visits them; an array means nodes visited in parallel. */
  path: Array<string | string[]>;
  /** Narration shown when the token reaches a node (falls back to the node label). */
  narration: Record<string, string>;
}

export interface ActivityDiagramModel {
  title: string;
  width: number;
  height: number;
  lanes: ActivityLane[];
  nodes: ActivityNode[];
  edges: ActivityEdge[];
  regions: ActivityRegion[];
  scenarios: ActivityScenario[];
}

// ===== Class diagram =====

export type Visibility = '+' | '-' | '#';

export interface UmlAttribute {
  name: string;
  type: string;
  visibility: Visibility;
  multiplicity?: string;
  derived?: boolean;
  note?: string;
}

export interface UmlParameter {
  name: string;
  type: string;
}

export interface UmlOperation {
  name: string;
  parameters: UmlParameter[];
  returns: string;
  visibility: Visibility;
  /** Shorter parameter list for the drawing when the full one does not fit. */
  shortParameters?: string;
  description: string;
}

export interface UmlClass {
  id: string;
  stereotype?: string;
  description: string;
  attributes: UmlAttribute[];
  operations: UmlOperation[];
  x: number;
  y: number;
}

export interface UmlEnumeration {
  id: string;
  description: string;
  literals: string[];
  x: number;
  y: number;
}

export type ClassRelationKind = 'association' | 'composition' | 'dependency';
export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface RelationEnd {
  element: string;
  side: Side;
  /** Position along the side, from 0 (top or left corner) to 1. */
  at: number;
  multiplicity?: string;
  role?: string;
}

export interface ClassRelation {
  id: string;
  kind: ClassRelationKind;
  /** For compositions, the whole (diamond side); for dependencies, the client. */
  from: RelationEnd;
  to: RelationEnd;
  label?: string;
  description: string;
  /** Bend points; without them the line is straight or gets one elbow. */
  via?: Point[];
  labelAt?: Point;
}

export interface ClassDiagramModel {
  width: number;
  height: number;
  classes: UmlClass[];
  enumerations: UmlEnumeration[];
  relations: ClassRelation[];
}

// ===== Sequence diagram =====

export interface Lifeline {
  id: string;
  /** Instance name shown before the colon; empty for anonymous instances. */
  instance: string;
  /** Class (or actor) of the lifeline. */
  classifier: string;
  isActor?: boolean;
  /** Message that creates the lifeline; it starts at that row. */
  createdBy?: string;
}

export type MessageKind = 'sync' | 'return' | 'create' | 'self';

export interface StateEffect {
  lifeline: string;
  attribute: string;
  value: string;
}

export interface SequenceMessage {
  id: string;
  number: string;
  kind: MessageKind;
  from: string;
  to: string;
  /** Operation name for calls; the returned value for returns. */
  operation: string;
  arguments?: string;
  narration: string;
  effects?: StateEffect[];
}

export type FragmentKind = 'break' | 'loop' | 'alt' | 'opt';

export interface CombinedFragment {
  kind: FragmentKind;
  guard: string;
  /** First and last message inside the fragment. */
  first: string;
  last: string;
  /** Lifelines the frame spans. */
  covers: [string, string];
}

export interface Activation {
  lifeline: string;
  first: string;
  last: string;
}

export interface ObjectState {
  lifeline: string;
  attributes: Record<string, string>;
}

export interface SequenceScenario {
  id: string;
  title: string;
  description: string;
  /** Messages exchanged in this scenario, in order. */
  messages: string[];
  initialState: ObjectState[];
}

export interface SequenceDiagramModel {
  title: string;
  useCase: string;
  lifelines: Lifeline[];
  messages: SequenceMessage[];
  fragments: CombinedFragment[];
  activations: Activation[];
  scenarios: SequenceScenario[];
}

// ===== Whole model =====

export interface UmlModel {
  requirements: Requirement[];
  useCaseDiagram: UseCaseDiagramModel;
  specification: UseCaseSpecification;
  activityDiagram: ActivityDiagramModel;
  classDiagram: ClassDiagramModel;
  sequenceDiagram: SequenceDiagramModel;
}
