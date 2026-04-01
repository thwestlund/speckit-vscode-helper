import * as assert from 'assert';
import { parseFeatureDirectory } from '../../../src/models/feature.js';

suite('Feature', () => {
  suite('parseFeatureDirectory', () => {
    test('standard numeric prefix "001-my-feature"', () => {
      const result = parseFeatureDirectory('001-my-feature');
      assert.strictEqual(result.number, '001');
      assert.strictEqual(result.shortName, 'my-feature');
    });

    test('multi-word kebab name "001-speckit-visual-extension"', () => {
      const result = parseFeatureDirectory('001-speckit-visual-extension');
      assert.strictEqual(result.number, '001');
      assert.strictEqual(result.shortName, 'speckit-visual-extension');
    });

    test('timestamp prefix "20260319-143022-my-feature"', () => {
      const result = parseFeatureDirectory('20260319-143022-my-feature');
      assert.strictEqual(result.number, '20260319-143022');
      assert.strictEqual(result.shortName, 'my-feature');
    });

    test('non-standard name returns full name as both fields', () => {
      const result = parseFeatureDirectory('no-number-prefix');
      assert.strictEqual(result.number, 'no-number-prefix');
      assert.strictEqual(result.shortName, 'no-number-prefix');
    });

    test('plain word without dash returns full name as both fields', () => {
      const result = parseFeatureDirectory('myfeature');
      assert.strictEqual(result.number, 'myfeature');
      assert.strictEqual(result.shortName, 'myfeature');
    });

    test('feature number with many digits "99999-feature"', () => {
      const result = parseFeatureDirectory('99999-feature');
      assert.strictEqual(result.number, '99999');
      assert.strictEqual(result.shortName, 'feature');
    });

    test('shortName when number === shortName signals non-standard (fallback used by label logic)', () => {
      const result = parseFeatureDirectory('unknown-dir');
      assert.strictEqual(result.number, result.shortName);
    });
  });
});
