export { BaseAgent } from './base';
export type { AgentContext, AgentRunResult, AgentStatus, DetectedIssue } from './base';
export { SpotterAgent, getSpotterAgent } from './spotter';
export { DocumentaristAgent, getDocumentaristAgent } from './documentarist';
export { DebuggerAgent, getDebuggerAgent } from './debugger';
export { OperatorAgent, getOperatorAgent } from './operator';
export type { OperationType, OperationRequest, OperationResult } from './operator';

// Agent registry
import { getSpotterAgent } from './spotter';
import { getDocumentaristAgent } from './documentarist';
import { getDebuggerAgent } from './debugger';
import { getOperatorAgent } from './operator';

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
    default:
      throw new Error(`Agent "${name}" not implemented yet`);
  }
}

export function getAvailableAgents(): AgentName[] {
  return ['spotter', 'documentarist', 'debugger', 'operator'];
}
