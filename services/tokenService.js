import util from 'util';
import { performance, PerformanceObserver } from 'perf_hooks';
import _data from './../lib/data.js';
import helpers from '../lib/helpers.js';
import validate from './validate.js';

const debug = util.debuglog('performance');

class TokenRouteService {
  #tokenLength;
  constructor() {
    this.#tokenLength = 40;
    this['GET'] = this.getHandler.bind(this);
    this['POST'] = this.postHandler.bind(this);
    this['PUT'] = this.putHandler.bind(this);
    this['DELETE'] = this.deleteHandler.bind(this);

    this.initPerformanceObserver();
  }

  initPerformanceObserver() {
    const obs = new PerformanceObserver((perfObserverList, observer) => {
      perfObserverList.getEntriesByType('measure').forEach((measurement) => {
        debug(
          '\x1b[33m%s\x1b[0m',
          measurement.name + ': ' + measurement.duration
        );
      });
    });

    obs.observe({ entryTypes: ['measure'] });
  }

  getHandler(data, callback) {
    const { id: token } = data.queryStringObject;
    const tokenError = validate(token)
      .required()
      .toBe('string')
      .minLength(this.#tokenLength)
      .maxLength(this.#tokenLength)
      .check();

    if (tokenError) {
      console.log(token, token.length);
      callback(400, { error: 'Missing required fields.' });
    } else {
      _data.read('tokens', token, function (err, tokenData) {
        if (!err && tokenData) {
          callback(200, tokenData);
        } else {
          callback(404, {
            error: 'No token found.',
          });
        }
      });
    }
  }

  postHandler(data, callback) {
    performance.mark('entered function');

    const { phone, password } = data.payload;
    const phoneError = validate(phone)
      .required()
      .toBe('string')
      .minLength(10)
      .maxLength(10)
      .check();

    const passwordError = validate(password)
      .required()
      .toBe('string')
      .minLength(5)
      .check();

    performance.mark('inputs validated');

    const tokenLength = this.#tokenLength;
    if (phoneError || passwordError) {
      callback(400, { error: 'Missing required fields' });
    } else {
      performance.mark('beginning user lookup');

      _data.read('users', phone, function (err, userData) {
        performance.mark('user lookup complete');

        if (!err && userData) {
          performance.mark('beginning password verification');

          const passwordMatch = helpers.verifyPassword(
            password,
            userData.hashedPassword
          );
          performance.mark('password verification complete');

          if (passwordMatch) {
            performance.mark('creating TokenId');

            const tokenId = helpers.createRandomString(tokenLength / 2);
            const expires = Date.now() + 1000 * 60 * 60;
            const tokenObject = { phone, id: tokenId, expires };

            performance.mark('beginning token storing');

            _data.create('tokens', tokenId, tokenObject, (err, data) => {
              performance.mark('storing token complete');

              // gather all the measurements
              performance.measure(
                'Beginning to end',
                'entered function',
                'storing token complete'
              );

              performance.measure(
                'Validating User Input',
                'entered function',
                'inputs validated'
              );

              performance.measure(
                'User lookup',
                'beginning user lookup',
                'user lookup complete'
              );

              performance.measure(
                'Password Verification',
                'beginning password verification',
                'password verification complete'
              );

              performance.measure(
                'Token Id Creation',
                'creating TokenId',
                'beginning token storing'
              );

              performance.measure(
                'Token Storing',
                'beginning token storing',
                'storing token complete'
              );

              if (err) {
                callback(500, { error: 'Could not create a new token.' });
              } else {
                callback(201, tokenObject);
              }
            });
          } else {
            callback(400, { error: 'Invalid Password' });
          }
        } else {
          callback(404, { error: 'No user found with the specified number.' });
        }
      });
    }
  }
  putHandler(data, callback) {
    const { id: token, extend } = data.payload;

    const tokenError = validate(token)
      .required()
      .toBe('string')
      .minLength(this.#tokenLength)
      .maxLength(this.#tokenLength)
      .check();

    const extendError = validate(extend)
      .required()
      .toBe('boolean')
      .value(true)
      .check();

    if (tokenError || extendError) {
      callback(400, { error: 'Missing required fields' });
    } else {
      _data.read('tokens', token, function (err, tokenData) {
        if (!err && tokenData) {
          if (tokenData.expires > Date.now()) {
            tokenData.expires = Date.now() + 1000 * 60 * 60;

            _data.update(
              'tokens',
              token,
              tokenData,
              function (err, updatedData) {
                if (!err) {
                  callback(200, updatedData);
                } else {
                  callback(500, {
                    error: "Could not update the token's expiration.",
                  });
                }
              }
            );
          } else {
            _data.delete('tokens', token, function () {
              callback(400, {
                error: 'Token already expired and cannot be extended',
              });
            });
          }
        } else {
          callback(404, { error: 'Specified token does not exist' });
        }
      });
    }
  }

  deleteHandler(data, callback) {
    const { id: token } = data.queryStringObject;
    const tokenError = validate(token)
      .required()
      .toBe('string')
      .minLength(this.#tokenLength)
      .maxLength(this.#tokenLength)
      .check();

    if (tokenError) {
      console.log(token, token.length);
      callback(400, { error: 'Missing required fields.' });
    } else {
      _data.read('tokens', token, function (err, tokenData) {
        if (!err && tokenData) {
          _data.delete('tokens', token, function (err) {
            if (err) callback(500, { error: 'Could not delete the token' });
            else callback(200);
          });
        } else {
          callback(404, {
            error: 'No token found.',
          });
        }
      });
    }
  }

  verifyToken(token, phone, callback) {
    const tokenError = validate(token)
      .required()
      .toBe('string')
      .minLength(this.#tokenLength)
      .maxLength(this.#tokenLength)
      .check();

    if (tokenError) {
      callback(false);
      return;
    }

    const _this = this;

    _data.read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        if (tokenData.phone === phone) {
          if (tokenData.expires > Date.now()) {
            callback(true);
          } else {
            this.deleteHandler(
              { queryStringObject: { id: token } },
              function () {
                callback(false);
              }
            );
          }
        } else {
          callback(false);
        }
      } else {
        callback(false);
      }
    });
  }
}

export default new TokenRouteService();
