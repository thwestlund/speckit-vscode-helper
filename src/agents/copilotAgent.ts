import { AgentAdapter } from './agentRegistry.js';

export class CopilotAgent implements AgentAdapter {
  readonly id = 'copilot';
  readonly displayName = 'GitHub Copilot';
  readonly chatParticipant = '@github';

  buildPrompt(step: string, featureName: string): string {
    const featurePart = featureName ? ` ${featureName}` : '';
    return `@github /speckit.${step}${featurePart}`;
  }
}
