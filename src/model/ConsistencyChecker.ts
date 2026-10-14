import { ModelIndex } from './ModelIndex';
import type { ActivityEdge, ActivityNode, SequenceMessage, UmlModel, UmlOperation } from './uml';

export type CheckId =
  | 'sequenceOperations'
  | 'sequenceLifelines'
  | 'sequenceEffects'
  | 'sequenceScenarios'
  | 'sequenceCoverage'
  | 'specificationLinks'
  | 'requirementUseCases'
  | 'requirementElements'
  | 'useCaseCoverage'
  | 'activityRealizes'
  | 'activityStructure'
  | 'activityScenarios'
  | 'declaredTypes'
  | 'statusLiterals';

export interface CheckResult {
  id: CheckId;
  /** How many items were inspected. */
  inspected: number;
  failures: string[];
}

/**
 * Cross-checks the artifacts against each other: the same rules a reviewer applies when looking for
 * traceability gaps. Runs in the browser (traceability screen) and in the test suite.
 */
export class ConsistencyChecker {
  private readonly index: ModelIndex;
  private readonly model: UmlModel;

  constructor(model: UmlModel) {
    this.model = model;
    this.index = new ModelIndex(model);
  }

  public run(): CheckResult[] {
    return [
      this.sequenceOperations(),
      this.sequenceLifelines(),
      this.sequenceEffects(),
      this.sequenceScenarios(),
      this.sequenceCoverage(),
      this.specificationLinks(),
      this.requirementUseCases(),
      this.requirementElements(),
      this.useCaseCoverage(),
      this.activityRealizes(),
      this.activityStructure(),
      this.activityScenarios(),
      this.declaredTypes(),
      this.statusLiterals(),
    ];
  }

  /** Every call in the sequence diagram is an operation of the class of the receiving lifeline. */
  private sequenceOperations(): CheckResult {
    const calls: SequenceMessage[] = this.model.sequenceDiagram.messages.filter((message) => message.kind === 'sync' || message.kind === 'self');
    const failures: string[] = calls
      .filter((message) => this.index.operation(this.index.lifelineClass(message.to) + '.' + message.operation) === undefined)
      .map((message) => message.number + ': ' + this.index.lifelineClass(message.to) + '.' + message.operation);
    const creations: SequenceMessage[] = this.model.sequenceDiagram.messages.filter((message) => message.kind === 'create');
    for (const message of creations) {
      const lifeline = this.model.sequenceDiagram.lifelines.find((item) => item.id === message.to);
      if (lifeline?.createdBy !== message.id) failures.push(message.number + ': ' + message.to);
    }
    return { id: 'sequenceOperations', inspected: calls.length + creations.length, failures };
  }

  /** Every lifeline is an instance of a class in the class diagram. */
  private sequenceLifelines(): CheckResult {
    const lifelines = this.model.sequenceDiagram.lifelines;
    const failures: string[] = lifelines.filter((lifeline) => this.index.classById(lifeline.classifier) === undefined).map((lifeline) => lifeline.classifier);
    return { id: 'sequenceLifelines', inspected: lifelines.length, failures };
  }

  /** State changes shown by the simulator use real attributes and literals of their enumeration. */
  private sequenceEffects(): CheckResult {
    const failures: string[] = [];
    let inspected: number = 0;
    const states = this.model.sequenceDiagram.scenarios.flatMap((scenario) =>
      scenario.initialState.flatMap((state) => Object.entries(state.attributes).map(([attribute, value]) => ({ lifeline: state.lifeline, attribute, value }))),
    );
    const effects = this.model.sequenceDiagram.messages.flatMap((message) => message.effects ?? []);
    for (const effect of [...states, ...effects]) {
      inspected++;
      const owner: string | undefined = this.index.lifelineClass(effect.lifeline);
      const attribute = this.index.attribute(owner + '.' + effect.attribute);
      if (attribute === undefined) {
        failures.push(owner + '.' + effect.attribute);
        continue;
      }
      const enumeration = this.index.enumerationById(attribute.type);
      if (enumeration !== undefined && !enumeration.literals.includes(effect.value)) failures.push(attribute.type + '.' + effect.value);
    }
    return { id: 'sequenceEffects', inspected, failures };
  }

  /** Scenarios only use existing messages, in diagram order. */
  private sequenceScenarios(): CheckResult {
    const order: string[] = this.model.sequenceDiagram.messages.map((message) => message.id);
    const failures: string[] = [];
    for (const scenario of this.model.sequenceDiagram.scenarios) {
      const positions: number[] = scenario.messages.map((id: string) => order.indexOf(id));
      if (positions.some((position: number) => position < 0)) failures.push(scenario.id + ': unknown message');
      if (positions.some((position: number, i: number) => i > 0 && position <= positions[i - 1])) failures.push(scenario.id + ': out of order');
    }
    return { id: 'sequenceScenarios', inspected: this.model.sequenceDiagram.scenarios.length, failures };
  }

  /** Every message of the sequence diagram is explained by a step of the specification. */
  private sequenceCoverage(): CheckResult {
    const referenced: Set<string> = new Set(this.index.specificationSteps().flatMap((step) => step.messages));
    const messages = this.model.sequenceDiagram.messages.filter((message) => message.kind !== 'return' || message.to === 'owner');
    const failures: string[] = messages.filter((message) => !referenced.has(message.id)).map((message) => message.number + ' ' + message.operation);
    return { id: 'sequenceCoverage', inspected: messages.length, failures };
  }

  /** Steps of the specification point at existing activity nodes, messages, operations and rules. */
  private specificationLinks(): CheckResult {
    const failures: string[] = [];
    let inspected: number = 0;
    const ruleIds: Set<string> = new Set(this.model.requirements.map((requirement) => requirement.id));
    for (const step of this.index.specificationSteps()) {
      for (const node of step.activity) {
        inspected++;
        if (this.index.node(node) === undefined) failures.push(step.number + ' → ' + node);
      }
      for (const message of step.messages) {
        inspected++;
        if (this.index.message(message) === undefined) failures.push(step.number + ' → ' + message);
      }
      for (const operation of step.operations) {
        inspected++;
        if (this.index.operation(operation) === undefined) failures.push(step.number + ' → ' + operation);
      }
      for (const rule of step.rules) {
        inspected++;
        if (!ruleIds.has(rule)) failures.push(step.number + ' → ' + rule);
      }
    }
    return { id: 'specificationLinks', inspected, failures };
  }

  private requirementUseCases(): CheckResult {
    const failures: string[] = [];
    for (const requirement of this.model.requirements) {
      if (requirement.useCases.length === 0) failures.push(requirement.id);
      for (const useCase of requirement.useCases) if (this.index.useCase(useCase) === undefined) failures.push(requirement.id + ' → ' + useCase);
    }
    return { id: 'requirementUseCases', inspected: this.model.requirements.length, failures };
  }

  private requirementElements(): CheckResult {
    const failures: string[] = [];
    let inspected: number = 0;
    for (const requirement of this.model.requirements) {
      if (requirement.elements.length === 0) failures.push(requirement.id);
      for (const element of requirement.elements) {
        inspected++;
        if (!this.index.resolves(element)) failures.push(requirement.id + ' → ' + element);
      }
    }
    return { id: 'requirementElements', inspected, failures };
  }

  /** Every use case comes from a functional requirement and is reached by an actor or a relation. */
  private useCaseCoverage(): CheckResult {
    const diagram = this.model.useCaseDiagram;
    const traced: Set<string> = new Set(this.model.requirements.filter((item) => item.kind === 'functional').flatMap((item) => item.useCases));
    const related: Set<string> = new Set(diagram.relations.flatMap((relation) => [relation.from, relation.to]));
    const failures: string[] = [];
    for (const useCase of diagram.useCases) {
      if (!traced.has(useCase.id)) failures.push(useCase.id + ': no requirement');
      if (useCase.actors.length === 0 && !related.has(useCase.id)) failures.push(useCase.id + ': unreachable');
    }
    for (const relation of diagram.relations) {
      if (this.index.useCase(relation.from) === undefined || this.index.useCase(relation.to) === undefined) failures.push(relation.from + ' → ' + relation.to);
    }
    const actorIds: Set<string> = new Set(diagram.actors.map((actor) => actor.id));
    for (const useCase of diagram.useCases) {
      for (const actor of [...useCase.actors, ...(useCase.secondaryActors ?? [])]) if (!actorIds.has(actor)) failures.push(useCase.id + ' → ' + actor);
    }
    return { id: 'useCaseCoverage', inspected: diagram.useCases.length, failures };
  }

  private activityRealizes(): CheckResult {
    const failures: string[] = [];
    let inspected: number = 0;
    for (const node of this.model.activityDiagram.nodes) {
      for (const reference of node.realizes ?? []) {
        inspected++;
        const known: boolean = /^UC\d+$/.test(reference) ? this.index.useCase(reference) !== undefined : this.index.operation(reference) !== undefined;
        if (!known) failures.push(node.id + ' → ' + reference);
      }
    }
    return { id: 'activityRealizes', inspected, failures };
  }

  /** Well-formed activity: valid edges, guarded decisions, merges with several inputs, everything reachable. */
  private activityStructure(): CheckResult {
    const { nodes, edges } = this.model.activityDiagram;
    const failures: string[] = [];
    const outgoing = (id: string): ActivityEdge[] => edges.filter((edge) => edge.from === id);
    const incoming = (id: string): ActivityEdge[] => edges.filter((edge) => edge.to === id);
    for (const edge of edges) {
      if (this.index.node(edge.from) === undefined || this.index.node(edge.to) === undefined) failures.push(edge.from + ' → ' + edge.to);
    }
    for (const node of nodes) {
      const out: ActivityEdge[] = outgoing(node.id);
      const into: ActivityEdge[] = incoming(node.id);
      if (node.kind === 'decision' && (out.length < 2 || out.some((edge) => edge.guard === undefined))) failures.push(node.id + ': decision');
      if (node.kind === 'merge' && into.length < 2) failures.push(node.id + ': merge');
      if (node.kind === 'fork' && out.length < 2) failures.push(node.id + ': fork');
      if (node.kind === 'join' && into.length < 2) failures.push(node.id + ': join');
      if ((node.kind === 'final' || node.kind === 'flowFinal') && out.length > 0) failures.push(node.id + ': final with output');
      if (node.kind === 'initial' && into.length > 0) failures.push(node.id + ': initial with input');
      if (!this.model.activityDiagram.lanes.some((lane) => lane.id === node.lane)) failures.push(node.id + ': lane');
    }
    const initial: ActivityNode | undefined = nodes.find((node) => node.kind === 'initial');
    const reached: Set<string> = new Set();
    const pending: string[] = initial === undefined ? [] : [initial.id];
    while (pending.length > 0) {
      const id: string = pending.pop() as string;
      if (reached.has(id)) continue;
      reached.add(id);
      for (const edge of outgoing(id)) pending.push(edge.to);
    }
    for (const node of nodes) if (!reached.has(node.id)) failures.push(node.id + ': unreachable');
    return { id: 'activityStructure', inspected: nodes.length + edges.length, failures };
  }

  /** Each scenario walks along existing edges, from the initial node to a final one. */
  private activityScenarios(): CheckResult {
    const { edges, scenarios } = this.model.activityDiagram;
    const failures: string[] = [];
    const linked = (from: string, to: string): boolean => edges.some((edge) => edge.from === from && edge.to === to);
    for (const scenario of scenarios) {
      const path: Array<string | string[]> = scenario.path;
      for (let i = 1; i < path.length; i++) {
        const previous: string[] = ([] as string[]).concat(path[i - 1]);
        const current: string[] = ([] as string[]).concat(path[i]);
        const ok: boolean = current.every((to: string) => previous.some((from: string) => linked(from, to)));
        if (!ok) failures.push(scenario.id + ': ' + previous.join('|') + ' → ' + current.join('|'));
      }
      const first = this.index.node(String(path[0]));
      const last = this.index.node(String(path[path.length - 1]));
      if (first?.kind !== 'initial') failures.push(scenario.id + ': start');
      if (last === undefined || (last.kind !== 'final' && last.kind !== 'flowFinal')) failures.push(scenario.id + ': end');
    }
    return { id: 'activityScenarios', inspected: scenarios.length, failures };
  }

  /** Attribute, parameter and return types are primitives or declared in the diagram. */
  private declaredTypes(): CheckResult {
    const failures: string[] = [];
    let inspected: number = 0;
    for (const item of this.model.classDiagram.classes) {
      const types: string[] = [
        ...item.attributes.map((attribute) => attribute.type),
        ...item.operations.flatMap((operation: UmlOperation) => [operation.returns, ...operation.parameters.map((parameter) => parameter.type)]),
      ];
      for (const type of types) {
        inspected++;
        if (!this.index.isKnownType(type)) failures.push(item.id + ': ' + type);
      }
    }
    for (const relation of this.model.classDiagram.relations) {
      inspected++;
      if (!this.index.resolves(relation.from.element) || !this.index.resolves(relation.to.element)) failures.push(relation.id);
    }
    const usedTypes: Set<string> = new Set(this.model.classDiagram.classes.flatMap((item) => item.attributes.map((attribute) => attribute.type)));
    for (const enumeration of this.model.classDiagram.enumerations) {
      inspected++;
      if (!usedTypes.has(enumeration.id)) failures.push(enumeration.id + ': unused');
    }
    return { id: 'declaredTypes', inspected, failures };
  }

  /** Every status literal shows up in the behavior (specification, activity or sequence); no state is left orphan. */
  private statusLiterals(): CheckResult {
    const spec = this.model.specification;
    const behavior: string = [
      ...spec.preconditions,
      ...spec.postconditions,
      ...spec.failurePostconditions,
      ...this.index.specificationSteps().map((step) => step.text),
      ...this.model.activityDiagram.nodes.map((node) => node.label ?? ''),
      ...this.model.sequenceDiagram.messages.map((message) => message.narration),
      ...this.model.classDiagram.classes.flatMap((item) => item.operations.map((operation) => operation.description)),
    ].join(' ');
    const failures: string[] = [];
    let inspected: number = 0;
    for (const enumeration of this.model.classDiagram.enumerations.filter((item) => item.id.startsWith('Status'))) {
      for (const literal of enumeration.literals) {
        inspected++;
        if (!new RegExp('\\b' + literal + '\\b').test(behavior)) failures.push(enumeration.id + '.' + literal);
      }
    }
    return { id: 'statusLiterals', inspected, failures };
  }
}
