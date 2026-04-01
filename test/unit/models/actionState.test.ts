import * as assert from 'assert';
import { deriveActionState, ACTION_MESSAGES } from '../../../src/models/actionState.js';
import { WorkflowState } from '../../../src/models/workflowState.js';

suite('ActionState', () => {
  suite('deriveActionState', () => {
    test('New → needsAction true, label includes "Specify"', () => {
      const result = deriveActionState(WorkflowState.New);
      assert.strictEqual(result.needsAction, true);
      assert.ok(
        result.pendingActionLabel?.includes('Specify'),
        `Expected label to include "Specify", got: ${result.pendingActionLabel}`,
      );
    });

    test('Specified → needsAction true, label includes "plan"', () => {
      const result = deriveActionState(WorkflowState.Specified);
      assert.strictEqual(result.needsAction, true);
      assert.ok(
        result.pendingActionLabel?.toLowerCase().includes('plan'),
        `Expected label to include "plan", got: ${result.pendingActionLabel}`,
      );
    });

    test('Planned → needsAction true, label includes "tasks"', () => {
      const result = deriveActionState(WorkflowState.Planned);
      assert.strictEqual(result.needsAction, true);
      assert.ok(
        result.pendingActionLabel?.toLowerCase().includes('tasks') ||
          result.pendingActionLabel?.toLowerCase().includes('task'),
        `Expected label to include "tasks", got: ${result.pendingActionLabel}`,
      );
    });

    test('TasksDefined → needsAction true, label includes "implementation"', () => {
      const result = deriveActionState(WorkflowState.TasksDefined);
      assert.strictEqual(result.needsAction, true);
      assert.ok(
        result.pendingActionLabel?.toLowerCase().includes('implementation'),
        `Expected label to include "implementation", got: ${result.pendingActionLabel}`,
      );
    });

    test('Implementing → needsAction false, label undefined', () => {
      const result = deriveActionState(WorkflowState.Implementing);
      assert.strictEqual(result.needsAction, false);
      assert.strictEqual(result.pendingActionLabel, undefined);
    });

    test('Complete → needsAction false, label undefined', () => {
      const result = deriveActionState(WorkflowState.Complete);
      assert.strictEqual(result.needsAction, false);
      assert.strictEqual(result.pendingActionLabel, undefined);
    });

    test('Unknown → needsAction false, label undefined', () => {
      const result = deriveActionState(WorkflowState.Unknown);
      assert.strictEqual(result.needsAction, false);
      assert.strictEqual(result.pendingActionLabel, undefined);
    });

    test('pendingActionLabel is undefined when needsAction is false (consistency)', () => {
      for (const [state, label] of ACTION_MESSAGES.entries()) {
        const result = deriveActionState(state);
        if (!result.needsAction) {
          assert.strictEqual(
            result.pendingActionLabel,
            undefined,
            `State ${state}: pendingActionLabel must be undefined when needsAction is false`,
          );
        } else {
          assert.ok(
            typeof result.pendingActionLabel === 'string' && result.pendingActionLabel.length > 0,
            `State ${state}: pendingActionLabel must be a non-empty string when needsAction is true`,
          );
        }
        // Ensure ACTION_MESSAGES is used (map has entry for every state)
        assert.ok(ACTION_MESSAGES.has(state), `ACTION_MESSAGES must have entry for state ${state}`);
        assert.strictEqual(
          result.pendingActionLabel,
          label,
          `State ${state}: deriveActionState must use ACTION_MESSAGES value`,
        );
      }
    });
  });
});
