import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

suite('openFeatureInChat command (US2)', () => {
  let executeCommandStub: sinon.SinonStub;

  suiteSetup(async () => {
    // Ensure the extension has fully activated before checking command registry
    const ext = vscode.extensions.getExtension('ForgeIT.vscode-speckit-helper');
    await ext?.activate();
  });

  setup(() => {
    executeCommandStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
  });

  teardown(() => {
    sinon.restore();
  });

  test('command speckit.openFeatureInChat is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('speckit.openFeatureInChat'),
      'speckit.openFeatureInChat must be registered',
    );
  });

  test('executing speckit.openFeatureInChat calls workbench.action.chat.open with skeleton and newSession:true', async () => {
    // Reset stub to allow the real command dispatch first, then track workbench call
    sinon.restore();
    executeCommandStub = sinon.stub(vscode.commands, 'executeCommand');
    // Let the real openFeatureInChat registered command run, but capture subsequent workbench call
    executeCommandStub.callThrough();

    await vscode.commands.executeCommand('speckit.openFeatureInChat');

    const chatOpenCall = executeCommandStub.getCalls().find(
      (c) => c.args[0] === 'workbench.action.chat.open',
    );
    assert.ok(chatOpenCall, 'workbench.action.chat.open must be called');

    const opts = chatOpenCall.args[1] as Record<string, unknown>;
    assert.strictEqual(opts['isPartialQuery'], true, 'isPartialQuery must be true (no auto-send)');
    assert.strictEqual(opts['newSession'], true, 'newSession must be true');
    assert.ok(
      typeof opts['query'] === 'string' && (opts['query'] as string).includes('## User Story 1'),
      `query must include "## User Story 1", got: ${String(opts['query']).slice(0, 100)}`,
    );
    assert.ok(
      typeof opts['query'] === 'string' &&
        (opts['query'] as string).includes('### Acceptance Criteria'),
      `query must include "### Acceptance Criteria", got: ${String(opts['query']).slice(0, 100)}`,
    );
  });
});
