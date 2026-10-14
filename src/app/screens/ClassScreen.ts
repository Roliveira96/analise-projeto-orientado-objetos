import { ArtifactScreen } from '../ArtifactScreen';
import type { ScreenHeading } from '../ArtifactScreen';
import { ClassDiagram, attributeLine, operationSignature } from '../../diagrams/ClassDiagram';
import type { ClassRelation, UmlAttribute, UmlClass, UmlEnumeration, UmlOperation } from '../../model/uml';
import { escapeHtml } from '../html';
import { T } from '../../content/uiText';

/** Class diagram; selecting a class, a member or a relation shows its meaning and where it is used. */
export class ClassScreen extends ArtifactScreen {
  protected heading(): ScreenHeading {
    return { icon: '🧱', title: T.classes.title, subtitle: T.classes.subtitle, color: '--c-cls' };
  }

  protected diagram(): string {
    return new ClassDiagram(this.index.model.classDiagram).render();
  }

  protected defaultPanel(): string {
    const legend: string = T.classes.legend.map(([term, text]) => '<dt>' + term + '</dt><dd>' + text + '</dd>').join('');
    const decisions: string = T.classes.decisions.map(([term, text]) => '<dt>' + term + '</dt><dd>' + text + '</dd>').join('');
    return '<h2>' + T.classes.legendTitle + '</h2><dl class="legend">' + legend + '</dl>' +
      '<h3>' + T.classes.decisionsTitle + '</h3><dl class="legend">' + decisions + '</dl>' +
      '<p class="muted">' + T.common.nothingSelected + '</p>';
  }

  protected select(id: string): void {
    const owner: string = id.split('.')[0];
    const relation: ClassRelation | undefined = this.index.model.classDiagram.relations.find((item: ClassRelation) => item.id === id);
    const item: UmlClass | undefined = this.index.classById(owner);
    const enumeration: UmlEnumeration | undefined = this.index.enumerationById(owner);
    if (relation === undefined && item === undefined && enumeration === undefined) return;
    this.clearSelection();
    if (relation !== undefined) {
      this.svgQuery('[data-id="' + id + '"]')[0]?.classList.add('is-selected');
      for (const end of [relation.from.element, relation.to.element]) this.svgQuery('[data-id="' + end + '"]')[0]?.classList.add('is-related');
      this.reveal(this.svgQuery('[data-id="' + id + '"]')[0]);
      this.setPanel(this.relationPanel(relation));
      return;
    }
    const box: Element | undefined = this.svgQuery('[data-id="' + owner + '"]')[0];
    box?.classList.add('is-selected');
    for (const line of this.svgQuery('[data-ends~="' + owner + '"]')) line.classList.add('is-related');
    if (id.includes('.')) this.svgQuery('[data-member="' + id + '"]')[0]?.classList.add('is-selected');
    this.reveal(box);
    if (enumeration !== undefined) {
      this.setPanel(this.enumerationPanel(enumeration));
      return;
    }
    const classItem: UmlClass = item as UmlClass;
    this.setPanel(id.includes('.') ? this.memberPanel(classItem, id) : this.classPanel(classItem));
  }

  private classPanel(item: UmlClass): string {
    const attributes: string = item.attributes
      .map((attribute: UmlAttribute) =>
        '<li><a href="#/classes/' + item.id + '.' + attribute.name + '"><code>' + escapeHtml(attributeLine(attribute)) + '</code></a>' +
        (attribute.note === undefined ? '' : '<small>' + attribute.note + '</small>') + '</li>')
      .join('');
    const operations: string = item.operations
      .map((operation: UmlOperation) =>
        '<li><a href="#/classes/' + item.id + '.' + operation.name + '"><code>' + escapeHtml(operationSignature(operation)) + '</code></a><small>' + operation.description + '</small></li>')
      .join('');
    const relations: string = this.index.model.classDiagram.relations
      .filter((relation: ClassRelation) => relation.from.element === item.id || relation.to.element === item.id)
      .map((relation: ClassRelation) => '<li><a href="#/classes/' + relation.id + '"><b>' + this.relationTitle(relation) + '</b></a><small>' + relation.description + '</small></li>')
      .join('');
    return '<span class="panel-kicker">' + (item.stereotype === undefined ? 'class' : '«' + item.stereotype + '»') + '</span><h2>' + item.id + '</h2><p>' + item.description + '</p>' +
      '<h3>' + T.classes.attributes + '</h3><ul class="member-list">' + (attributes || '<li class="muted">—</li>') + '</ul>' +
      '<h3>' + T.classes.operations + '</h3><ul class="member-list">' + operations + '</ul>' +
      (relations === '' ? '' : '<h3>' + T.classes.relation + '</h3><ul class="member-list">' + relations + '</ul>') +
      this.usages(item.id);
  }

  private memberPanel(item: UmlClass, reference: string): string {
    const operation: UmlOperation | undefined = this.index.operation(reference);
    const attribute: UmlAttribute | undefined = this.index.attribute(reference);
    const signature: string = operation !== undefined ? operationSignature(operation) : attributeLine(attribute as UmlAttribute);
    const description: string = operation?.description ?? attribute?.note ?? '';
    return '<span class="panel-kicker"><a href="#/classes/' + item.id + '">' + item.id + '</a></span>' +
      '<h2 class="code-title">' + escapeHtml(signature) + '</h2><p>' + description + '</p>' + this.usages(reference);
  }

  private enumerationPanel(item: UmlEnumeration): string {
    const users: string[] = this.index.model.classDiagram.classes.flatMap((owner: UmlClass) =>
      owner.attributes.filter((attribute: UmlAttribute) => attribute.type === item.id).map((attribute: UmlAttribute) => owner.id + '.' + attribute.name));
    return '<span class="panel-kicker">«enumeration»</span><h2>' + item.id + '</h2><p>' + item.description + '</p>' +
      '<h3>' + T.classes.literals + '</h3><p class="literal-list">' + item.literals.map((literal: string) => '<code>' + literal + '</code>').join(' ') + '</p>' +
      '<h3>' + T.common.usedIn + '</h3>' + this.chips.list(users, (reference: string) => this.chips.element(reference));
  }

  private relationPanel(relation: ClassRelation): string {
    return '<span class="panel-kicker">' + relation.kind + '</span><h2>' + this.relationTitle(relation) + '</h2><p>' + relation.description + '</p>' +
      '<p class="relation-ends">' + this.chips.element(relation.from.element) + ' <b>' + (relation.from.multiplicity ?? '') + '</b> — <b>' +
      (relation.to.multiplicity ?? '') + '</b> ' + this.chips.element(relation.to.element) + '</p>';
  }

  private relationTitle(relation: ClassRelation): string {
    const label: string = relation.label ?? relation.to.role ?? relation.id;
    return relation.from.element + ' → ' + relation.to.element + ' (' + label.replace(/[▸▾◂▴]/g, '').trim() + ')';
  }

  private usages(reference: string): string {
    const used = this.index.usagesOf(reference);
    return '<h3>' + T.common.usedIn + '</h3><div class="usage-grid">' +
      '<span>' + T.trace.requirement + '</span>' + this.chips.list(used.requirements, (item: string) => this.chips.requirement(item)) +
      '<span>UC08</span>' + this.chips.list(used.steps, (item: string) => this.chips.step(item)) +
      '<span>' + T.trace.node + '</span>' + this.chips.list(used.nodes, (item: string) => this.chips.node(item)) +
      '<span>' + T.sequence.title + '</span>' + this.chips.list(used.messages, (item: string) => this.chips.message(item)) +
      '</div>';
  }
}
