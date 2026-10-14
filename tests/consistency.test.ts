import { describe, expect, it } from 'vitest';
import { ConsistencyChecker } from '../src/model/ConsistencyChecker';
import type { CheckResult } from '../src/model/ConsistencyChecker';
import { model } from '../src/content/model';

/** The artifacts must agree with each other: this is the main grading criterion of the exam. */
const results: CheckResult[] = new ConsistencyChecker(model).run();

describe('traceability between artifacts', () => {
  it.each(results)('$id passes', (result: CheckResult) => {
    expect(result.inspected).toBeGreaterThan(0);
    expect(result.failures).toEqual([]);
  });
});

/** Breaks a copy of the model on purpose and expects the checker to notice. */
function failuresAfter(change: (copy: typeof model) => void): Record<string, string[]> {
  const copy: typeof model = structuredClone(model);
  change(copy);
  const failing: Record<string, string[]> = {};
  for (const result of new ConsistencyChecker(copy).run()) if (result.failures.length > 0) failing[result.id] = result.failures;
  return failing;
}

describe('the checker catches the mistakes found in the first drafts', () => {
  it('a sequence message whose operation is missing from the class', () => {
    const failing = failuresAfter((copy) => {
      copy.sequenceDiagram.messages.find((message) => message.id === 'm11')!.operation = 'recusarConcorrentes';
    });
    expect(failing.sequenceOperations).toEqual(['9.2: PropostaComercial.recusarConcorrentes']);
  });

  it('a state that does not exist in the enumeration', () => {
    const failing = failuresAfter((copy) => {
      copy.sequenceDiagram.messages.find((message) => message.id === 'm14')!.effects = [{ lifeline: 'a', attribute: 'status', value: 'CONFIRMADO' }];
    });
    expect(failing.sequenceEffects).toEqual(['StatusAgendamento.CONFIRMADO']);
  });

  it('a status literal never used by the behavior', () => {
    const failing = failuresAfter((copy) => {
      copy.classDiagram.enumerations.find((item) => item.id === 'StatusProposta')!.literals.push('REVOGADA');
    });
    expect(failing.statusLiterals).toEqual(['StatusProposta.REVOGADA']);
  });

  it('a use case that no requirement asks for', () => {
    const failing = failuresAfter((copy) => {
      copy.useCaseDiagram.useCases.push({ id: 'UC99', name: 'Extra', summary: '', x: 0, y: 0, actors: ['owner'] });
    });
    expect(failing.useCaseCoverage).toEqual(['UC99: no requirement']);
  });

  it('an activity scenario that jumps over a missing edge', () => {
    const failing = failuresAfter((copy) => {
      copy.activityDiagram.edges = copy.activityDiagram.edges.filter((edge) => !(edge.from === 'a15' && edge.to === 'mg'));
    });
    expect(failing.activityScenarios).toEqual(['expired: a15 → mg']);
  });

  it('an undeclared type', () => {
    const failing = failuresAfter((copy) => {
      copy.classDiagram.classes.find((item) => item.id === 'ItemManutencao')!.attributes[1].type = 'TipoPeca';
    });
    expect(failing.declaredTypes).toEqual(['ItemManutencao: TipoPeca', 'TipoItem: unused']);
  });

  it('a sequence message that the specification never explains', () => {
    const failing = failuresAfter((copy) => {
      copy.specification.mainFlow.find((step) => step.number === '10')!.messages = [];
    });
    expect(failing.sequenceCoverage).toEqual(['12 notificar']);
  });
});
