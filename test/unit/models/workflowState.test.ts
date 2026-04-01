import * as assert from 'assert';
import { deriveState, WorkflowState, STATE_ORDER } from '../../../src/models/workflowState.js';
import { Artifact, ArtifactType } from '../../../src/models/artifact.js';

function makeArtifact(artifactType: ArtifactType, exists: boolean): Artifact {
  return { fileName: '', filePath: '', exists, artifactType };
}

function artifacts(present: ArtifactType[]): Artifact[] {
  const all = Object.values(ArtifactType);
  return all.map((t) => makeArtifact(t, present.includes(t)));
}

suite('WorkflowState', () => {
  suite('deriveState', () => {
    test('no artifacts → New', () => {
      assert.strictEqual(deriveState(artifacts([])), WorkflowState.New);
    });

    test('spec.md only → Specified', () => {
      assert.strictEqual(deriveState(artifacts([ArtifactType.Spec])), WorkflowState.Specified);
    });

    test('spec.md + plan.md → Planned', () => {
      assert.strictEqual(
        deriveState(artifacts([ArtifactType.Spec, ArtifactType.Plan])),
        WorkflowState.Planned,
      );
    });

    test('tasks.md present, no content → TasksDefined', () => {
      assert.strictEqual(
        deriveState(artifacts([ArtifactType.Spec, ArtifactType.Plan, ArtifactType.Tasks])),
        WorkflowState.TasksDefined,
      );
    });

    test('tasks.md with zero checkbox items and content provided → TasksDefined', () => {
      const result = deriveState(
        artifacts([ArtifactType.Spec, ArtifactType.Plan, ArtifactType.Tasks]),
        'No checkboxes here',
      );
      assert.strictEqual(result, WorkflowState.TasksDefined);
    });

    test('tasks.md with some checked items → Implementing', () => {
      const content = '- [x] done\n- [ ] pending';
      assert.strictEqual(
        deriveState(
          artifacts([ArtifactType.Spec, ArtifactType.Plan, ArtifactType.Tasks]),
          content,
        ),
        WorkflowState.Implementing,
      );
    });

    test('tasks.md with all items checked → Complete', () => {
      const content = '- [x] done\n- [x] also done';
      assert.strictEqual(
        deriveState(
          artifacts([ArtifactType.Spec, ArtifactType.Plan, ArtifactType.Tasks]),
          content,
        ),
        WorkflowState.Complete,
      );
    });

    test('tasks.md with all items unchecked → TasksDefined', () => {
      const content = '- [ ] pending\n- [ ] also pending';
      assert.strictEqual(
        deriveState(
          artifacts([ArtifactType.Spec, ArtifactType.Plan, ArtifactType.Tasks]),
          content,
        ),
        WorkflowState.TasksDefined,
      );
    });

    test('plan.md without spec.md → Planned (plan presence takes precedence)', () => {
      assert.strictEqual(deriveState(artifacts([ArtifactType.Plan])), WorkflowState.Planned);
    });

    test('tasks.md without spec.md or plan.md → TasksDefined (tasks presence takes precedence)', () => {
      assert.strictEqual(deriveState(artifacts([ArtifactType.Tasks])), WorkflowState.TasksDefined);
    });

    test('case-insensitive [X] treated as complete', () => {
      const content = '- [X] upper\n- [x] lower';
      assert.strictEqual(
        deriveState(
          artifacts([ArtifactType.Spec, ArtifactType.Plan, ArtifactType.Tasks]),
          content,
        ),
        WorkflowState.Complete,
      );
    });
  });

  suite('STATE_ORDER', () => {
    test('contains all non-Unknown states', () => {
      const expected = [
        WorkflowState.New,
        WorkflowState.Specified,
        WorkflowState.Planned,
        WorkflowState.TasksDefined,
        WorkflowState.Implementing,
        WorkflowState.Complete,
      ];
      assert.deepStrictEqual(STATE_ORDER, expected);
    });

    test('Unknown is not in STATE_ORDER', () => {
      assert.ok(!STATE_ORDER.includes(WorkflowState.Unknown));
    });
  });
});
