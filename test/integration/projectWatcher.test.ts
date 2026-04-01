import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { FileWatcher } from '../../src/services/fileWatcher.js';

// We test the project watcher's debounced notification callback by stubbing
// vscode.workspace.createFileSystemWatcher and capturing the registered handlers.

suite('projectWatcher notification (TT011)', () => {
  let clock: sinon.SinonFakeTimers;
  let createWatcherStub: sinon.SinonStub;
  let capturedHandlers: Array<(uri: vscode.Uri) => void>;

  setup(() => {
    clock = sinon.useFakeTimers();
    capturedHandlers = [];

    const mockWatcher = {
      onDidCreate: (fn: (uri: vscode.Uri) => void) => {
        capturedHandlers.push(fn);
        return { dispose: () => { /* no-op */ } };
      },
      onDidChange: (fn: (uri: vscode.Uri) => void) => {
        capturedHandlers.push(fn);
        return { dispose: () => { /* no-op */ } };
      },
      onDidDelete: (fn: (uri: vscode.Uri) => void) => {
        capturedHandlers.push(fn);
        return { dispose: () => { /* no-op */ } };
      },
      dispose: () => { /* no-op */ },
    };

    createWatcherStub = sinon
      .stub(vscode.workspace, 'createFileSystemWatcher')
      .returns(mockWatcher as unknown as vscode.FileSystemWatcher);

    sinon
      .stub(vscode.window, 'showInformationMessage')
      .resolves(undefined as never);
  });

  teardown(() => {
    clock.restore();
    sinon.restore();
  });

  test('createProjectWatcher registers handlers for .specify/templates pattern', () => {
    const workspaceRoot = vscode.Uri.file('/workspace');
    const onChanged = sinon.spy();

    const disposable = FileWatcher.createProjectWatcher(workspaceRoot, onChanged);

    // Three patterns × 3 events each = 9 handlers minimum
    assert.ok(
      createWatcherStub.callCount >= 3,
      `createFileSystemWatcher must be called at least 3 times (one per pattern), got ${createWatcherStub.callCount}`,
    );

    disposable.dispose();
  });

  test('debounced callback fires once after 150 ms quiet period', () => {
    const workspaceRoot = vscode.Uri.file('/workspace');
    const onChanged = sinon.spy();

    const disposable = FileWatcher.createProjectWatcher(workspaceRoot, onChanged);

    // Simulate rapid file events from multiple handlers
    const fakeUri = vscode.Uri.file('/workspace/.specify/templates/spec-template.md');
    capturedHandlers.forEach((handler) => handler(fakeUri));

    assert.strictEqual(onChanged.callCount, 0, 'callback must not fire before debounce delay');

    clock.tick(150);

    assert.strictEqual(onChanged.callCount, 1, 'callback must fire exactly once after debounce');

    disposable.dispose();
  });
});
