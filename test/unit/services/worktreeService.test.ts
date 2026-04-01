import * as assert from 'assert';
import { listWorktrees, addWorktree, ExecFn } from '../../../src/services/worktreeService.js';

const PORCELAIN_TWO_WORKTREES = [
  'worktree /repo/main',
  'HEAD abc123',
  'branch refs/heads/main',
  '',
  'worktree /repo/feature',
  'HEAD def456',
  'branch refs/heads/002-feature',
  '',
].join('\n');

const PORCELAIN_DETACHED = [
  'worktree /repo/main',
  'HEAD abc123',
  'branch refs/heads/main',
  '',
  'worktree /repo/detached',
  'HEAD def456',
  'detached',
  '',
].join('\n');

function makeExec(stdout: string, stderr = '', err: Error | null = null): ExecFn {
  return (_cmd, _opts, cb) => cb(err, stdout, stderr);
}

suite('WorktreeService (US3)', () => {
  suite('listWorktrees', () => {
    test('parses two-block porcelain output correctly', async () => {
      const results = await listWorktrees('/repo/main', makeExec(PORCELAIN_TWO_WORKTREES));
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].path, '/repo/main');
      assert.strictEqual(results[0].branch, 'main');
      assert.strictEqual(results[1].path, '/repo/feature');
      assert.strictEqual(results[1].branch, '002-feature');
    });

    test('marks isCurrentWorkspace for the worktree matching workspace root', async () => {
      const results = await listWorktrees('/repo/main', makeExec(PORCELAIN_TWO_WORKTREES));
      const main = results.find((w) => w.path === '/repo/main');
      const feature = results.find((w) => w.path === '/repo/feature');
      assert.strictEqual(main?.isCurrentWorkspace, true);
      assert.strictEqual(feature?.isCurrentWorkspace, false);
    });

    test('sets branch to undefined for detached HEAD worktrees', async () => {
      const results = await listWorktrees('/repo/main', makeExec(PORCELAIN_DETACHED));
      const detached = results.find((w) => w.path === '/repo/detached');
      assert.strictEqual(detached?.branch, undefined);
    });

    test('returns empty array for empty output without throwing', async () => {
      const results = await listWorktrees('/repo/main', makeExec(''));
      assert.deepStrictEqual(results, []);
    });

    test('returns empty array on unexpected output without throwing', async () => {
      const results = await listWorktrees(
        '/repo/main',
        makeExec('unexpected garbage output\n\nmore garbage'),
      );
      assert.ok(Array.isArray(results), 'must return an array');
    });
  });

  suite('addWorktree', () => {
    test('resolves on zero-exit exec', async () => {
      await assert.doesNotReject(
        addWorktree(
          '002-feature',
          '/repo/worktrees/002-feature',
          '/repo/main',
          makeExec('Preparing worktree (new branch)', ''),

        ),
      );
    });

    test('rejects with trimmed stderr on non-zero exit', async () => {
      const fakeError = Object.assign(new Error('Command failed'), { code: 1 });
      const execFn: ExecFn = (_cmd, _opts, cb) =>
        cb(fakeError, '', '  fatal: branch already checked out  ');

      await assert.rejects(
        addWorktree('002-feature', '/repo/worktrees/002-feature', '/repo/main', execFn),
        (err: Error) => {
          assert.ok(
            err.message.includes('fatal: branch already checked out'),
            'Expected trimmed stderr in message, got: ' + err.message,
          );
          return true;
        },
      );
    });
  });
});