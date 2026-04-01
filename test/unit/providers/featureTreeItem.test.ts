import * as assert from 'assert';
import * as vscode from 'vscode';
import { FeatureTreeItem } from '../../../src/providers/featureTreeItem.js';
import { Feature } from '../../../src/models/feature.js';
import { WorkflowState } from '../../../src/models/workflowState.js';
import { STATE_ICONS } from '../../../src/constants.js';

const CURRENT_WORKTREE = { path: '/repo/main', branch: 'main', isCurrentWorkspace: true };

function makeFeature(
  state: WorkflowState,
  needsAction: boolean,
  pendingActionLabel?: string,
): Feature {
  return {
    number: '004',
    shortName: 'specified',
    branchName: '004-specified',
    directoryPath: '/fixture/004-specified',
    state,
    artifacts: [],
    actionState: { needsAction, pendingActionLabel },
    worktreeSource: CURRENT_WORKTREE,
  };
}

suite('FeatureTreeItem', () => {
  suite('Icon logic (US1)', () => {
    test('needsAction true → warning ThemeIcon with list.warningForeground color', () => {
      const feature = makeFeature(WorkflowState.Specified, true, 'Next step: Create a plan');
      const item = new FeatureTreeItem(feature);

      assert.ok(item.iconPath instanceof vscode.ThemeIcon, 'iconPath must be a ThemeIcon');
      const icon = item.iconPath as vscode.ThemeIcon;
      assert.strictEqual(icon.id, 'warning');
      assert.ok(icon.color instanceof vscode.ThemeColor, 'icon.color must be a ThemeColor');
      assert.strictEqual(
        (icon.color as vscode.ThemeColor).id,
        'list.warningForeground',
      );
    });

    test('needsAction false → STATE_ICONS icon for the feature state', () => {
      const feature = makeFeature(WorkflowState.Complete, false, undefined);
      const item = new FeatureTreeItem(feature);

      const expectedIcon = STATE_ICONS.get(WorkflowState.Complete);
      assert.strictEqual(item.iconPath, expectedIcon);
    });

    test('needsAction false with Implementing state → STATE_ICONS icon', () => {
      const feature = makeFeature(WorkflowState.Implementing, false, undefined);
      const item = new FeatureTreeItem(feature);

      const expectedIcon = STATE_ICONS.get(WorkflowState.Implementing);
      assert.strictEqual(item.iconPath, expectedIcon);
    });

    test('needsAction true with New state → warning icon regardless of state', () => {
      const feature = makeFeature(
        WorkflowState.New,
        true,
        'Next step: Specify this feature',
      );
      const item = new FeatureTreeItem(feature);

      assert.ok(item.iconPath instanceof vscode.ThemeIcon);
      assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'warning');
    });
  });

  suite('Tooltip logic (US3)', () => {
    test('needsAction true → tooltip is MarkdownString containing branch/state and action label', () => {
      const feature = makeFeature(WorkflowState.Specified, true, 'Next step: Create a plan');
      const item = new FeatureTreeItem(feature);

      assert.ok(
        item.tooltip instanceof vscode.MarkdownString,
        'tooltip must be a MarkdownString when needsAction is true',
      );
      const md = item.tooltip as vscode.MarkdownString;
      assert.ok(
        md.value.includes('004-specified'),
        `tooltip must include branchName, got: ${md.value}`,
      );
      assert.ok(
        md.value.includes('Next step: Create a plan'),
        `tooltip must include pendingActionLabel, got: ${md.value}`,
      );
    });

    test('needsAction false → tooltip is a plain string (not MarkdownString)', () => {
      const feature = makeFeature(WorkflowState.Complete, false, undefined);
      const item = new FeatureTreeItem(feature);

      assert.strictEqual(
        typeof item.tooltip,
        'string',
        'tooltip must be a plain string when needsAction is false',
      );
      assert.ok(
        !(item.tooltip instanceof vscode.MarkdownString),
        'tooltip must not be a MarkdownString when needsAction is false',
      );
    });

    test('needsAction true tooltip includes state label', () => {
      const feature = makeFeature(WorkflowState.Planned, true, 'Next step: Generate tasks');
      const item = new FeatureTreeItem(feature);

      const md = item.tooltip as vscode.MarkdownString;
      assert.ok(
        md.value.includes('Planned'),
        `tooltip must include state label "Planned", got: ${md.value}`,
      );
    });
  });
});
