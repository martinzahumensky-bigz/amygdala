export { BaseAgent } from './base';
export type { AgentContext, AgentRunResult, AgentStatus, DetectedIssue } from './base';
export { SpotterAgent, getSpotterAgent } from './spotter';
export { DocumentaristAgent, getDocumentaristAgent } from './documentarist';
export { DebuggerAgent, getDebuggerAgent } from './debugger';
export { OperatorAgent, getOperatorAgent } from './operator';
export { TrustAgent, getTrustAgent } from './trust';
export { QualityAgent, getQualityAgent } from './quality';
export { TransformationAgent, getTransformationAgent } from './transformation';
export type { OperationType, OperationRequest, OperationResult } from './operator';
export type { TrustChangeEvent } from './trust';
export type { QualityRule, QualityValidationResult } from './quality';
export type {
  TransformationType,
  TransformationRequest,
  TransformationPlan,
  TransformationPreview,
  IterationResult,
} from './transformation';

// Agent registry
import { getSpotterAgent } from './spotter';
import { getDocumentaristAgent } from './documentarist';
import { getDebuggerAgent } from './debugger';
import { getOperatorAgent } from './operator';
import { getTrustAgent } from './trust';
import { getQualityAgent } from './quality';
import { getTransformationAgent } from './transformation';

export type AgentName = 'spotter' | 'debugger' | 'quality' | 'trust' | 'documentarist' | 'transformation' | 'operator';

export function getAgent(name: AgentName) {
  switch (name.toLowerCase()) {
    case 'spotter':
      return getSpotterAgent();
    case 'documentarist':
      return getDocumentaristAgent();
    case 'debugger':
      return getDebuggerAgent();
    case 'operator':
      return getOperatorAgent();
    case 'trust':
      return getTrustAgent();
    case 'quality':
      return getQualityAgent();
    case 'transformation':
      return getTransformationAgent();
    default:
      throw new Error(`Agent "${name}" not implemented yet`);
  }
}

export function getAvailableAgents(): AgentName[] {
  return ['spotter', 'documentarist', 'debugger', 'operator', 'trust', 'quality', 'transformation'];
}
