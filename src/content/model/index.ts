import type { UmlModel } from '../../model/uml';
import { activityDiagram } from './activity';
import { classDiagram } from './classes';
import { requirements } from './requirements';
import { sequenceDiagram } from './sequence';
import { specification } from './specification';
import { useCaseDiagram } from './useCases';

/** The complete solution: every artifact delivered for the exam. */
export const model: UmlModel = {
  requirements,
  useCaseDiagram,
  specification,
  activityDiagram,
  classDiagram,
  sequenceDiagram,
};
