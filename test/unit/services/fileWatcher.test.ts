import * as assert from 'assert';
import * as sinon from 'sinon';
import { debounce } from '../../../src/services/fileWatcher.js';

suite('fileWatcher', () => {
  let clock: sinon.SinonFakeTimers;

  setup(() => {
    clock = sinon.useFakeTimers();
  });

  teardown(() => {
    clock.restore();
  });

  suite('debounce', () => {
    test('calls fn after delay when invoked once', () => {
      const fn = sinon.spy();
      const debounced = debounce(fn, 150);

      debounced();
      assert.strictEqual(fn.callCount, 0, 'fn must not fire before delay');

      clock.tick(150);
      assert.strictEqual(fn.callCount, 1, 'fn must fire once after delay');
    });

    test('coalesces rapid calls into a single invocation', () => {
      const fn = sinon.spy();
      const debounced = debounce(fn, 150);

      debounced();
      clock.tick(50);
      debounced();
      clock.tick(50);
      debounced();
      clock.tick(50);
      assert.strictEqual(fn.callCount, 0, 'fn must not fire during quiet period resets');

      clock.tick(150);
      assert.strictEqual(fn.callCount, 1, 'fn must fire exactly once after final quiet period');
    });

    test('resets the timer on each call', () => {
      const fn = sinon.spy();
      const debounced = debounce(fn, 150);

      debounced();
      clock.tick(149);
      debounced(); // reset
      clock.tick(149);
      assert.strictEqual(fn.callCount, 0, 'fn must not fire because timer was reset');

      clock.tick(1);
      assert.strictEqual(fn.callCount, 1, 'fn fires after full delay from last call');
    });

    test('allows subsequent invocations after first fires', () => {
      const fn = sinon.spy();
      const debounced = debounce(fn, 150);

      debounced();
      clock.tick(150);
      assert.strictEqual(fn.callCount, 1);

      debounced();
      clock.tick(150);
      assert.strictEqual(fn.callCount, 2, 'debounced fn can be invoked again after first fires');
    });
  });
});
