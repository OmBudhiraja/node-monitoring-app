import { strict as assert } from 'assert';
import https from 'https';
import config from './../lib/config.js';
import app from './../index.js';

const basePath = `https://localhost:${config.httpsPort}`;

class ApiTest {
  constructor() {
    this.apiTests = {};
    this.init();
  }

  #makeGetRequest(path, callback) {
    const req = https.get(`${basePath}${path}`, (res) => {
      callback(res);
    });
    req.on('error', function (e) {
      console.log(e);
      // callback(e);
      callback({ statusCode: 500 });
    });
  }

  init() {
    this.apiTests['app.init should start without throwing'] = function (done) {
      assert.doesNotThrow(function () {
        app.init(function (err) {
          done();
        });
      }, TypeError);
    };

    this.apiTests['/ping should respond to GET with 200'] = (done) => {
      this.#makeGetRequest('/ping', function (res) {
        assert.equal(res.statusCode, 200);
        done();
      });
    };

    this.apiTests['/api/user should respond to GET with 400'] = (done) => {
      this.#makeGetRequest('/api/user', function (res) {
        assert.equal(res.statusCode, 400);
        done();
      });
    };

    this.apiTests['/randompath should start without throwing'] = (done) => {
      this.#makeGetRequest('/randompath', function (res) {
        assert.equal(res.statusCode, 404);
        done();
      });
    };
  }
}

export default new ApiTest().apiTests;
