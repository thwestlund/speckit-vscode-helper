import * as vscode from 'vscode';

export interface AgentAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly chatParticipant: string;
  buildPrompt(step: string, featureName: string): string;
}

const registry = new Map<string, AgentAdapter>();

const AGENT_EXTENSION_IDS: Readonly<Record<string, string>> = {
  copilot: 'github.copilot-chat',
  claude: 'anthropic.claude-for-vscode',
};

export function registerAgent(agent: AgentAdapter): void {
  registry.set(agent.id, agent);
}

export function getAgent(id: string): AgentAdapter | undefined {
  return registry.get(id);
}

export function listAgents(): AgentAdapter[] {
  return Array.from(registry.values());
}

export function checkAvailability(agentId: string): boolean {
  const extensionId = AGENT_EXTENSION_IDS[agentId];
  if (!extensionId) {
    return false;
  }
  return vscode.extensions.getExtension(extensionId) !== undefined;
}
