import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { launchPrompt } from '../../../src/services/promptLauncher.js';
import { registerAgent, type AgentAdapter } from '../../../src/agents/agentRegistry.js';
import { CopilotAgent } from '../../../src/agents/copilotAgent.js';

function makeWorkspaceRoot(): vscode.Uri {
  return vscode.workspace.workspaceFolders![0].uri;
}

function makeFeature(branchName: string) {
  return {
    number: '001',
    shortName: branchName,
    branchName,
    directoryPath: '/fake/path',
    state: 0 as never,
    artifacts: [],
    actionState: { needsAction: false, pendingActionLabel: undefined },
    worktreeSource: { path: '/repo/main', branch: 'main', isCurrentWorkspace: true },
  };
}

suite('promptLauncher', () => {
  let executeCommandStub: sinon.SinonStub;
  let getConfigStub: sinon.SinonStub;
  let getExtensionStub: sinon.SinonStub;
  let showErrorMessageStub: sinon.SinonStub;

  setup(() => {
    executeCommandStub = sinon.stub(vscode.commands, 'executeCommand').resolves(undefined);
    getExtensionStub = sinon
      .stub(vscode.extensions, 'getExtension')
      .returns({ id: 'github.copilot-chat' } as vscode.Extension<unknown>);

    const mockConfig = {
      get: sinon.stub().callsFake((key: string, defaultValue?: unknown) => {
        if (key === 'speckit.aiAgent') return 'copilot';
        return defaultValue;
      }),
    };
    getConfigStub = sinon
      .stub(vscode.workspace, 'getConfiguration')
      .returns(mockConfig as unknown as vscode.WorkspaceConfiguration);

    showErrorMessageStub = sinon
      .stub(vscode.window, 'showErrorMessage')
      .resolves(undefined as never);

    registerAgent(new CopilotAgent());
  });

  teardown(() => {
    sinon.restore();
  });

  suite('happy path', () => {
    test('calls workbench.action.chat.open for a known step', async () => {
      const feature = makeFeature('001-my-feature');
      await launchPrompt('plan', feature, makeWorkspaceRoot());

      const chatCall = executeCommandStub.getCalls().find(
        (c) => c.args[0] === 'workbench.action.chat.open',
      );
      assert.ok(chatCall, 'workbench.action.chat.open must have been called');
    });

    test('query includes the feature branch name', async () => {
      const feature = makeFeature('001-my-feature');
      await launchPrompt('plan', feature, makeWorkspaceRoot());

      const chatCall = executeCommandStub.getCalls().find(
        (c) => c.args[0] === 'workbench.action.chat.open',
      );
      assert.ok(chatCall, 'chat command must have been called');
      const opts = chatCall.args[1] as { query: string };
      assert.ok(
        opts.query.includes('001-my-feature'),
        `query must include feature name, got: ${opts.query}`,
      );
    });

    test('sets isPartialQuery: true (no auto-submit) by default', async () => {
      const feature = makeFeature('001-my-feature');
      await launchPrompt('plan', feature, makeWorkspaceRoot());

      const chatCall = executeCommandStub.getCalls().find(
        (c) => c.args[0] === 'workbench.action.chat.open',
      );
      const opts = chatCall!.args[1] as { isPartialQuery: boolean };
      assert.strictEqual(opts.isPartialQuery, true);
    });

    test('works with undefined feature (no branch name in query)', async () => {
      await launchPrompt('specify', undefined, makeWorkspaceRoot());

      const chatCall = executeCommandStub.getCalls().find(
        (c) => c.args[0] === 'workbench.action.chat.open',
      );
      assert.ok(chatCall, 'chat command must still be called when feature is undefined');
    });
  });

  suite('unavailable agent (TT010)', () => {
    setup(() => {
      sinon.restore();
      // Restore stubs with a clean slate; extension is NOT available
      executeCommandStub = sinon.stub(vscode.commands, 'executeCommand').resolves(undefined);
      getExtensionStub = sinon.stub(vscode.extensions, 'getExtension').returns(undefined);
      showErrorMessageStub = sinon
        .stub(vscode.window, 'showErrorMessage')
        .resolves(undefined as never);

      const mockConfig = {
        get: sinon.stub().callsFake((key: string, defaultValue?: unknown) => {
          if (key === 'speckit.aiAgent') return 'copilot';
          return defaultValue;
        }),
      };
      sinon
        .stub(vscode.workspace, 'getConfiguration')
        .returns(mockConfig as unknown as vscode.WorkspaceConfiguration);
    });

    test('shows error message when agent extension missing', async () => {
      const feature = makeFeature('001-my-feature');
      await launchPrompt('plan', feature, makeWorkspaceRoot());

      assert.ok(showErrorMessageStub.calledOnce, 'showErrorMessage must be called');
      const message = showErrorMessageStub.firstCall.args[0] as string;
      assert.ok(
        message.includes('github.copilot-chat'),
        `error message must include extension ID, got: ${message}`,
      );
    });

    test('does NOT call workbench.action.chat.open when agent unavailable', async () => {
      const feature = makeFeature('001-my-feature');
      await launchPrompt('plan', feature, makeWorkspaceRoot());

      const chatCall = executeCommandStub.getCalls().find(
        (c) => c.args[0] === 'workbench.action.chat.open',
      );
      assert.strictEqual(chatCall, undefined, 'chat must NOT open when agent is unavailable');
    });

    test('opens extensions marketplace when user clicks "Open Extensions"', async () => {
      showErrorMessageStub.resolves('Open Extensions' as never);
      const feature = makeFeature('001-my-feature');
      await launchPrompt('plan', feature, makeWorkspaceRoot());

      const searchCall = executeCommandStub.getCalls().find(
        (c) => c.args[0] === 'workbench.extensions.search',
      );
      assert.ok(searchCall, 'workbench.extensions.search must be called on "Open Extensions"');
    });
  });
});
