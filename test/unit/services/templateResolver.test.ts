import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { resolveTemplate } from '../../../src/services/templateResolver.js';

// vscode.workspace.fs.readFile is non-configurable and cannot be stubbed with sinon.
// These tests use the real filesystem via the test fixture workspace and a temporary
// override directory, which is the integration-appropriate approach for this resolver.

suite('templateResolver', () => {
  // Workspace with fixture templates (Tier 4: .specify/templates/spec-template.md + plan-template.md)
  let fixtureRoot: vscode.Uri;

  suiteSetup(() => {
    const workspaceFolder = vscode.workspace.workspaceFolders![0];
    fixtureRoot = workspaceFolder.uri;
  });

  test('Tier 4 project template returned for "spec" step', async () => {
    const result = await resolveTemplate('spec', fixtureRoot);
    // fixture has .specify/templates/spec-template.md starting with "# Spec Template"
    assert.ok(result.length > 0, 'spec template must be non-empty');
    assert.ok(
      result.includes('Spec Template') || result.includes('Feature'),
      `fixture spec template should contain "Spec Template" or "Feature", got: ${result.slice(0, 80)}`,
    );
  });

  test('Tier 4 project template returned for "plan" step', async () => {
    const result = await resolveTemplate('plan', fixtureRoot);
    assert.ok(result.length > 0, 'plan template must be non-empty');
    assert.ok(
      result.includes('Plan Template') || result.includes('Implementation'),
      `fixture plan template should contain "Plan Template" or "Implementation", got: ${result.slice(0, 80)}`,
    );
  });

  test('built-in fallback for a step with no project template (tasks)', async () => {
    // fixture has no tasks-template.md, so should fall through to built-in
    const result = await resolveTemplate('tasks', fixtureRoot);
    assert.ok(result.length > 0, 'built-in tasks template must be non-empty');
  });

  test('all built-in steps return non-empty strings when no project templates present', async () => {
    // Use a non-existent root so all file reads fail → built-ins used
    const emptyRoot = vscode.Uri.file('/tmp/nonexistent-workspace-xyz');
    const steps = ['specify', 'plan', 'tasks', 'implement', 'clarify', 'analyze', 'checklist'];
    for (const step of steps) {
      const result = await resolveTemplate(step, emptyRoot);
      assert.ok(result.length > 0, `Built-in template for "${step}" must not be empty`);
    }
  });

  test('unknown step returns empty string when no project template exists', async () => {
    const emptyRoot = vscode.Uri.file('/tmp/nonexistent-workspace-xyz');
    const result = await resolveTemplate('unknown-step-xyz', emptyRoot);
    assert.strictEqual(result, '');
  });

  test('Tier 1 override wins when override file is present on real filesystem', async () => {
    // Write a real override file, resolve, then remove it
    const overrideDir = path.join(fixtureRoot.fsPath, '.specify', 'templates', 'overrides');
    const overrideFile = path.join(overrideDir, 'plan-template.md');
    const overrideContent = 'OVERRIDE CONTENT FOR TEST';

    fs.mkdirSync(overrideDir, { recursive: true });
    fs.writeFileSync(overrideFile, overrideContent, 'utf-8');

    try {
      const result = await resolveTemplate('plan', fixtureRoot);
      assert.strictEqual(result, overrideContent);
    } finally {
      fs.rmSync(overrideDir, { recursive: true, force: true });
    }
  });
});
