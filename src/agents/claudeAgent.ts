import { AgentAdapter } from './agentRegistry.js';

export class ClaudeAgent implements AgentAdapter {
  readonly id = 'claude';
  readonly displayName = 'Claude';
  readonly chatParticipant = '@claude';

  buildPrompt(step: string, featureName: string): string {
    const featurePart = featureName ? ` ${featureName}` : '';
    return `@claude /speckit.${step}${featurePart}`;
  }
}
