import * as vscode from 'vscode';
import { Feature } from '../models/feature.js';
import { getAgent, checkAvailability } from '../agents/agentRegistry.js';
import { resolveTemplate } from './templateResolver.js';
import { SETTING_KEYS } from '../constants.js';

const AGENT_EXTENSION_IDS: Readonly<Record<string, string>> = {
  copilot: 'github.copilot-chat',
  claude: 'anthropic.claude-for-vscode',
};

export async function launchPrompt(
  step: string,
  feature: Feature | undefined,
  workspaceRoot: vscode.Uri,
  autoSubmit = false,
): Promise<void> {
  const agentId = vscode.workspace
    .getConfiguration()
    .get<string>(SETTING_KEYS.aiAgent, 'copilot');

  if (!checkAvailability(agentId)) {
    await handleUnavailableAgent(agentId);
    return;
  }

  const agent = getAgent(agentId);
  if (!agent) {
    return;
  }

  const featureName = feature?.branchName ?? '';
  const template = await resolveTemplate(step, workspaceRoot);
  const basePrompt = agent.buildPrompt(step, featureName);
  const query = template ? `${basePrompt}\n\n${template}` : basePrompt;

  await vscode.commands.executeCommand('workbench.action.chat.open', {
    query,
    isPartialQuery: !autoSubmit,
  });
}

async function handleUnavailableAgent(agentId: string): Promise<void> {
  const extId = AGENT_EXTENSION_IDS[agentId] ?? agentId;
  const action = await vscode.window.showErrorMessage(
    `The AI agent "${agentId}" is not available. Install the required extension: ${extId}`,
    'Open Extensions',
  );
  if (action === 'Open Extensions') {
    await vscode.commands.executeCommand('workbench.extensions.search', extId);
  }
}
