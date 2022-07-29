// import _url from 'url';
import dns from 'dns';
import _data from '../lib/data.js';
import validate from './validate.js';
import config from '../lib/config.js';
import helpers from '../lib/helpers.js';
import tokenService from './tokenService.js';

class ChecksService {
  #acceptedMethod;
  #checkIdLength;
  constructor() {
    this.#acceptedMethod = ['GET', 'POST', 'PUT', 'DELETE'];
    this.#checkIdLength = 20;
    this['GET'] = this.getHandler.bind(this);
    this['POST'] = this.postHandler.bind(this);
    this['PUT'] = this.putHandler.bind(this);
    this['DELETE'] = this.deleteHandler.bind(this);
  }

  getHandler(data, callback) {
    const { id: checkId } = data.queryStringObject;
    const checkIdError = validate(checkId)
      .required()
      .toBe('string')
      .minLength(this.#checkIdLength)
      .maxLength(this.#checkIdLength)
      .check();

    if (checkIdError) {
      callback(400, { error: 'Missing required fields.' });
    } else {
      _data.read('checks', checkId, function (err, checkData) {
        if (!err && checkData) {
          const { token } = data.headers;
          tokenService.verifyToken(
            token,
            checkData.userPhone,
            function (isTokenValid) {
              if (!isTokenValid) {
                callback(403, {
                  error:
                    'Missing required token in header, or token is invalid',
                });
              } else {
                callback(200, checkData);
              }
            }
          );
        } else {
          callback(404, { error: 'No check found with the specified ID.' });
        }
      });
    }
  }

  postHandler(data, callback) {
    const { protocol, url, method, successCodes, timeoutSeconds } =
      data.payload;

    const protocolError = validate(protocol)
      .required()
      .toBe('string')
      .value('http', 'https')
      .check();

    const urlError = validate(url).required().toBe('string').check();
    const methodError = validate(method)
      .required()
      .toBe('string')
      .value(...this.#acceptedMethod)
      .check();

    const successCodesError = validate(successCodes)
      .required()
      .toBe('object')
      .minLength(1)
      .check();

    const timeoutSecondsError = validate(timeoutSeconds)
      .required()
      .toBe('number')
      .min(1)
      .max(5)
      .check();

    if (
      protocolError ||
      urlError ||
      methodError ||
      successCodesError ||
      timeoutSecondsError
    ) {
      callback(400, {
        error: 'Missing required inputs, or inputs are invalid',
      });
    } else {
      const { token } = data.headers;
      _data.read('tokens', token, function (err, tokenData) {
        if (!err && tokenData) {
          const userPhone = tokenData.phone;

          _data.read('users', userPhone, function (err, userData) {
            if (!err && userData) {
              const userChecks = userData.checks || [];
              if (userChecks.length < config.maxChecks) {
                // const hostName = _url.parse(url);
                const hostName = new URL(`${protocol}://${url}`).hostname;

                dns.resolve(hostName, (err, records) => {
                  if (err || !records) {
                    return callback(500, {
                      error: 'The specified URL is invalid',
                    });
                  }

                  const checkId = helpers.createRandomString(10);
                  const checkObject = {
                    id: checkId,
                    userPhone,
                    protocol,
                    url,
                    method,
                    successCodes,
                    timeoutSeconds,
                  };

                  _data.create('checks', checkId, checkObject, function (err) {
                    if (!err) {
                      userChecks.push(checkId);
                      userData.checks = userChecks;

                      _data.update(
                        'users',
                        userPhone,
                        userData,
                        function (err) {
                          if (!err) {
                            callback(201, checkObject);
                          } else {
                            callback(500, {
                              error: 'Could not create a new check.',
                            });
                          }
                        }
                      );
                    } else {
                      callback(500, { error: 'Could not create a new check.' });
                    }
                  });
                });
              } else {
                callback(400, {
                  error: `The user already has maximum number of checks. (${config.maxChecks})`,
                });
              }
            } else {
              callback(403);
            }
          });
        } else {
          callback(403);
        }
      });
    }
  }

  putHandler(data, callback) {
    const {
      id: checkId,
      protocol,
      url,
      method,
      successCodes,
      timeoutSeconds,
    } = data.payload;

    const checkIdError = validate(checkId)
      .required()
      .toBe('string')
      .minLength(this.#checkIdLength)
      .maxLength(this.#checkIdLength)
      .check();

    if (checkIdError) {
      callback(400, { error: 'Missing required fields.' });
      return;
    }

    const protocolError = validate(protocol)
      .required()
      .toBe('string')
      .value('http', 'https')
      .check();

    const urlError = validate(url).required().toBe('string').check();
    const methodError = validate(method)
      .required()
      .toBe('string')
      .value(...this.#acceptedMethod)
      .check();

    const successCodesError = validate(successCodes)
      .required()
      .toBe('object')
      .minLength(1)
      .check();

    const timeoutSecondsError = validate(timeoutSeconds)
      .required()
      .toBe('number')
      .min(1)
      .max(5)
      .check();

    if (
      protocolError &&
      urlError &&
      methodError &&
      successCodesError &&
      timeoutSecondsError
    ) {
      callback(400, { error: 'Missing fields to update' });
    } else {
      _data.read('checks', checkId, function (err, checkData) {
        if (!err && checkData) {
          const { token } = data.headers;
          tokenService.verifyToken(
            token,
            checkData.userPhone,
            function (isTokenValid) {
              if (!isTokenValid) {
                callback(403, {
                  error:
                    'Missing required token in header, or token is invalid',
                });
              } else {
                if (!protocolError) {
                  checkData.protocol = protocol;
                }
                if (!urlError) {
                  checkData.url = url;
                }
                if (!methodError) {
                  checkData.method = method;
                }
                if (!successCodesError) {
                  checkData.successCodes = successCodes;
                }
                if (!timeoutSecondsError) {
                  checkData.timeoutSeconds = timeoutSeconds;
                }

                _data.update(
                  'checks',
                  checkId,
                  checkData,
                  function (err, userData) {
                    if (!err && userData) {
                      callback(200, checkData);
                    } else {
                      callback(500, {
                        error: 'Could not update the Check.',
                      });
                    }
                  }
                );
              }
            }
          );
        } else {
          callback(404, { error: 'No check found with the specified ID.' });
        }
      });
    }
  }

  deleteHandler(data, callback) {
    const { id: checkId } = data.queryStringObject;
    const checkIdError = validate(checkId)
      .required()
      .toBe('string')
      .minLength(this.#checkIdLength)
      .maxLength(this.#checkIdLength)
      .check();

    if (checkIdError) {
      callback(400, { error: 'Missing required fields.' });
      return;
    }

    _data.read('checks', checkId, function (err, checkData) {
      if (!err && checkData) {
        const { token } = data.headers;
        tokenService.verifyToken(
          token,
          checkData.userPhone,
          function (isTokenValid) {
            if (!isTokenValid) {
              callback(403, {
                error: 'Missing required token in header, or token is invalid',
              });
            } else {
              _data.delete('checks', checkId, function (err) {
                if (err) callback(500, { error: 'Could not delete the check' });
                else {
                  _data.read(
                    'users',
                    checkData.userPhone,
                    function (err, userData) {
                      if (!err && userData) {
                        userData.checks = (userData.checks || []).filter(
                          (c) => c !== checkId
                        );

                        _data.update(
                          'users',
                          checkData.userPhone,
                          userData,
                          function (err) {
                            if (err)
                              callback(500, 'Could not delete the check.');
                            else callback(200);
                          }
                        );
                      } else {
                        callback(404, {
                          error: 'No user found for the given check ID.',
                        });
                      }
                    }
                  );
                }
              });
            }
          }
        );
      } else {
        callback(404, {
          error: 'Check with given ID does not exist',
        });
      }
    });
  }
}

export default new ChecksService();
