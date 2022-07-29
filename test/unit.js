import { strict as assert } from 'assert';
import logs from '../services/log.js';

// test function
function getANumber() {
  return 1;
}

class UnitTest {
  constructor() {
    this.unitTests = {};
    this.init();
  }
  init() {
    this.unitTests['getANumber should return a number'] = function (done) {
      const val = getANumber();
      assert.equal(typeof val, 'number');
      done();
    };

    this.unitTests['getANumber should return 1'] = function (done) {
      const val = getANumber();
      assert.equal(val, 1);
      done();
    };

    this.unitTests['getANumber should return 2'] = function (done) {
      const val = getANumber();
      assert.equal(val, 2);
      done();
    };

    this.unitTests[
      'logs.list should callback a false error and an array of log filenames'
    ] = function (done) {
      logs.list(false, (err, logFiles) => {
        assert.equal(err, false);
        assert.ok(logFiles instanceof Array);
        assert.ok(logFiles.length > 1);
        done();
      });
    };
    this.unitTests[
      'logs.truncate should not throw if logId does not exist. It should callback an error instead'
    ] = function (done) {
      assert.doesNotThrow(() => {
        logs.truncate('I do not exist', function (err) {
          assert.ok(err);
          done();
        });
      }, TypeError);
    };
  }
}

export default new UnitTest().unitTests;
