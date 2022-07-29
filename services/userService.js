import validate from './validate.js';
import _data from '../lib/data.js';
import helpers from '../lib/helpers.js';
import tokenService from './tokenService.js';

class UserRouteService {
  constructor() {
    this['GET'] = this.getHandler.bind(this);
    this['POST'] = this.postHandler.bind(this);
    this['PUT'] = this.putHandler.bind(this);
    this['DELETE'] = this.deleteHandler.bind(this);
  }
  getHandler(data, callback) {
    const { phone } = data.queryStringObject;
    const phoneError = validate(phone)
      .required()
      .toBe('string')
      .minLength(10)
      .maxLength(10)
      .check();

    if (phoneError) {
      callback(400, { error: 'Missing required fields.' });
    } else {
      const { token } = data.headers;
      tokenService.verifyToken(token, phone, function (isTokenValid) {
        if (!isTokenValid) {
          callback(403, {
            error: 'Missing required token in header, or token is invalid',
          });
        } else {
          _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
              delete userData.hashedPassword;
              callback(200, userData);
            } else {
              callback(404, {
                error: 'User with given Phone Number does not exist',
              });
            }
          });
        }
      });
    }
  }

  postHandler(data, callback) {
    const { name, password, phone, tosAggrement } = data.payload;
    const nameError = validate(name)
      .required()
      .toBe('string')
      .minLength(2)
      .maxLength(40)
      .check();

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

    const tosAggrementError = validate(tosAggrement)
      .required()
      .toBe('boolean')
      .value(true)
      .check();

    if (nameError || phoneError || passwordError || tosAggrementError) {
      console.log({ nameError, phoneError, passwordError, tosAggrementError });
      callback(400, { error: 'Missing fields required.' });
    } else {
      _data.read('users', phone, function (err, data) {
        if (err) {
          const hashedPassword = helpers.hashPassword(password);
          if (!hashedPassword) {
            return callback(500, { error: 'Could not create a new user.' });
          }
          const userObject = {
            name,
            phone,
            hashedPassword,
            tosAggrement: true,
          };

          _data.create('users', phone, userObject, function (err, data) {
            if (!err) {
              delete data.hashedPassword;
              callback(201, data);
            } else {
              console.log(err);
              callback(500, { error: 'Could not create a new user.' });
            }
          });
        } else {
          callback(400, {
            error: 'A user with this phone number already exists',
          });
        }
      });
    }
  }

  putHandler(data, callback) {
    const { name, password, phone } = data.payload;
    const nameError = validate(name)
      .required()
      .toBe('string')
      .minLength(2)
      .maxLength(40)
      .check();

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

    if (phoneError) {
      callback(400, { error: 'Missing required fields.' });
    } else {
      if (nameError && passwordError) {
        callback(400, { error: 'Missing fields to update' });
      } else {
        const { token } = data.headers;
        tokenService.verifyToken(token, phone, function (isTokenValid) {
          if (!isTokenValid) {
            callback(403, {
              error: 'Missing required token in header, or token is invalid',
            });
          } else {
            _data.read('users', phone, function (err, userData) {
              if (!err && userData) {
                if (!nameError) {
                  userData.name = name;
                }
                if (!passwordError) {
                  userData.hashedPassword = helpers.hashPassword(password);
                }

                _data.update(
                  'users',
                  phone,
                  userData,
                  function (err, updatedData) {
                    if (!err && updatedData) {
                      delete updatedData.hashedPassword;
                      callback(200, updatedData);
                    } else {
                      console.log(err);
                      callback(500, { error: 'Could not update the user.' });
                    }
                  }
                );
              } else {
                callback(404, {
                  error: 'User with given Phone Number does not exist',
                });
              }
            });
          }
        });
      }
    }
  }

  deleteHandler(data, callback) {
    const { phone } = data.queryStringObject;
    const phoneError = validate(phone)
      .required()
      .toBe('string')
      .minLength(10)
      .maxLength(10)
      .check();

    if (phoneError) {
      callback(400, { error: 'Missing required fields.' });
    } else {
      const { token } = data.headers;
      tokenService.verifyToken(token, phone, function (isTokenValid) {
        if (!isTokenValid) {
          callback(403, {
            error: 'Missing required token in header, or token is invalid',
          });
        } else {
          _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
              _data.delete('users', phone, function (err) {
                if (err) callback(500, { err });
                else {
                  const checks = userData.checks || [];
                  if (checks.length) {
                    const checksDeleted = 0;
                    const deletionError = false;

                    checks.forEach((c) => {
                      _data.delete('checks', c, function (err) {
                        if (err) {
                          deletionError = true;
                        }
                        checksDeleted++;
                        if (checksDeleted === checks.length) {
                          if (deletionError) {
                            callback(500, {
                              error:
                                'Errors encountered while attempting to delete user checks.',
                            });
                          } else {
                            callback(200);
                          }
                        }
                      });
                    });
                  } else {
                    callback(200);
                  }
                }
              });
            } else {
              callback(404, {
                error: 'User with given Phone Number does not exist',
              });
            }
          });
        }
      });
    }
  }
}

export default new UserRouteService();
