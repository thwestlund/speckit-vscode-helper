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
    test('uses -b flag when branch does not exist (new branch path)', async () => {
      const commands: string[] = [];
      // First call (rev-parse) fails → branch does not exist; second call (worktree add -b) succeeds
      const execFn: ExecFn = (cmd, _opts, cb) => {
        commands.push(cmd);
        if (cmd.includes('rev-parse')) {
          cb(new Error('unknown revision'), '', 'unknown revision');
        } else {
          cb(null, 'Preparing worktree (new branch)', '');
        }
      };

      await assert.doesNotReject(
        addWorktree('004-smart-login-redirect', '/repo/worktrees/004-smart-login-redirect', '/repo/main', execFn),
      );
      assert.ok(commands.some((c) => c.includes('-b')), 'must use -b when branch is new');
    });

    test('omits -b flag when branch already exists', async () => {
      const commands: string[] = [];
      // First call (rev-parse) succeeds → branch exists; second call (worktree add) succeeds
      const execFn: ExecFn = (cmd, _opts, cb) => {
        commands.push(cmd);
        cb(null, 'abc123', '');
      };

      await assert.doesNotReject(
        addWorktree('002-feature', '/repo/worktrees/002-feature', '/repo/main', execFn),
      );
      const addCmd = commands.find((c) => c.includes('worktree add'));
      assert.ok(addCmd && !addCmd.includes(' -b '), 'must NOT use -b when branch already exists');
    });

    test('rejects with trimmed stderr on non-zero exit', async () => {
      const fakeError = Object.assign(new Error('Command failed'), { code: 1 });
      // rev-parse succeeds (branch exists), then worktree add fails
      let callCount = 0;
      const execFn: ExecFn = (_cmd, _opts, cb) => {
        callCount++;
        if (callCount === 1) {
          cb(null, 'abc123', ''); // rev-parse succeeds
        } else {
          cb(fakeError, '', '  fatal: branch already checked out  ');
        }
      };

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