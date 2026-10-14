import type {
  ActivityNode,
  SequenceMessage,
  SpecificationStep,
  UmlAttribute,
  UmlClass,
  UmlEnumeration,
  UmlModel,
  UmlOperation,
  UseCase,
} from './uml';

/** Built-in types that need no declaration in the class diagram. */
export const PRIMITIVE_TYPES: Set<string> = new Set<string>([
  'UUID',
  'String',
  'int',
  'double',
  'boolean',
  'BigDecimal',
  'LocalDate',
  'LocalDateTime',
  'void',
]);

/** Fast lookups over the model, shared by the checker, the renderers and the screens. */
export class ModelIndex {
  public readonly model: UmlModel;
  private readonly classes: Map<string, UmlClass>;
  private readonly enumerations: Map<string, UmlEnumeration>;
  private readonly useCases: Map<string, UseCase>;
  private readonly messages: Map<string, SequenceMessage>;
  private readonly nodes: Map<string, ActivityNode>;

  constructor(model: UmlModel) {
    this.model = model;
    this.classes = new Map(model.classDiagram.classes.map((item: UmlClass) => [item.id, item]));
    this.enumerations = new Map(model.classDiagram.enumerations.map((item: UmlEnumeration) => [item.id, item]));
    this.useCases = new Map(model.useCaseDiagram.useCases.map((item: UseCase) => [item.id, item]));
    this.messages = new Map(model.sequenceDiagram.messages.map((item: SequenceMessage) => [item.id, item]));
    this.nodes = new Map(model.activityDiagram.nodes.map((item: ActivityNode) => [item.id, item]));
  }

  public classById(id: string): UmlClass | undefined {
    return this.classes.get(id);
  }

  public enumerationById(id: string): UmlEnumeration | undefined {
    return this.enumerations.get(id);
  }

  public useCase(id: string): UseCase | undefined {
    return this.useCases.get(id);
  }

  public message(id: string): SequenceMessage | undefined {
    return this.messages.get(id);
  }

  public node(id: string): ActivityNode | undefined {
    return this.nodes.get(id);
  }

  /** "Class.member" or "Class" → the operation or attribute it names, if any. */
  public operation(reference: string): UmlOperation | undefined {
    const [owner, member] = reference.split('.');
    return this.classes.get(owner)?.operations.find((operation: UmlOperation) => operation.name === member);
  }

  public attribute(reference: string): UmlAttribute | undefined {
    const [owner, member] = reference.split('.');
    return this.classes.get(owner)?.attributes.find((attribute: UmlAttribute) => attribute.name === member);
  }

  /** True when the reference names a class, an enumeration, an operation or an attribute. */
  public resolves(reference: string): boolean {
    if (!reference.includes('.')) return this.classes.has(reference) || this.enumerations.has(reference);
    return this.operation(reference) !== undefined || this.attribute(reference) !== undefined;
  }

  /** True when the type is primitive, declared, or a List of one of those. */
  public isKnownType(type: string): boolean {
    const list: RegExpMatchArray | null = type.match(/^List<(.+)>$/);
    const inner: string = list === null ? type : list[1];
    return PRIMITIVE_TYPES.has(inner) || this.classes.has(inner) || this.enumerations.has(inner);
  }

  /** Every step of the specification, main flow first. */
  public specificationSteps(): SpecificationStep[] {
    const spec = this.model.specification;
    return [
      ...spec.mainFlow,
      ...spec.alternativeFlows.flatMap((flow) => flow.steps),
      ...spec.exceptionFlows.flatMap((flow) => flow.steps),
    ];
  }

  /** Classifier (class id) of a lifeline. */
  public lifelineClass(lifelineId: string): string | undefined {
    return this.model.sequenceDiagram.lifelines.find((lifeline) => lifeline.id === lifelineId)?.classifier;
  }

  /** Everything that points at a class member, for the "where is it used" panel. */
  public usagesOf(reference: string): { requirements: string[]; steps: string[]; messages: string[]; nodes: string[] } {
    const owner: string = reference.split('.')[0];
    const isClass: boolean = !reference.includes('.');
    const matches = (candidate: string): boolean => (isClass ? candidate.split('.')[0] === owner : candidate === reference);
    const member: string | undefined = reference.split('.')[1];
    return {
      requirements: this.model.requirements.filter((item) => item.elements.some(matches)).map((item) => item.id),
      steps: this.specificationSteps().filter((step) => step.operations.some(matches)).map((step) => step.number),
      messages: this.model.sequenceDiagram.messages
        .filter((message) => message.kind !== 'return' && this.lifelineClass(message.to) === owner && (isClass || message.operation === member))
        .map((message) => message.id),
      nodes: this.model.activityDiagram.nodes.filter((node) => (node.realizes ?? []).some(matches)).map((node) => node.id),
    };
  }
}
