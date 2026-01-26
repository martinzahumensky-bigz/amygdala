export { BaseAgent } from './base';
export type { AgentContext, AgentRunResult, AgentStatus, DetectedIssue } from './base';
export { SpotterAgent, getSpotterAgent } from './spotter';

// Agent registry
import { getSpotterAgent } from './spotter';

export type AgentName = 'spotter' | 'debugger' | 'quality' | 'trust' | 'documentarist' | 'transformation';

export function getAgent(name: AgentName) {
  switch (name) {
    case 'spotter':
      return getSpotterAgent();
    default:
      throw new Error(`Agent "${name}" not implemented yet`);
  }
}

export function getAvailableAgents(): AgentName[] {
  return ['spotter']; // Add more as they're implemented
}
