import path from 'path';
import fs, { stat } from 'fs';
import https from 'https';
import http from 'http';
import url from 'url';
import util from 'util';
import helpers from './helpers.js';
import _data from './data.js';
import _log from '../services/log.js';
import validate from '../services/validate.js';

const debug = util.debuglog('workers');

class ServiceWorkers {
  #workerExecutionIntervalTime;
  #logCompressionIntervalTime;
  constructor() {
    this.#workerExecutionIntervalTime = 60; // in seconds
    this.#logCompressionIntervalTime = 60 * 60 * 24; // in seconds
  }

  loop() {
    setInterval(() => {
      this.gatherAllChecks();
    }, 1000 * this.#workerExecutionIntervalTime);
  }

  gatherAllChecks() {
    _data.list('checks', (err, checks) => {
      if (err) {
        debug('Error: Could not gather checks list', err);
        return;
      }

      if (checks && checks instanceof Array && checks.length) {
        checks.forEach((checkId) => {
          _data.read('checks', checkId, (err, checkData) => {
            if (err || !checkData) {
              debug(`Error reading the  check with ID: ${checkId}`);
              return;
            }

            this.validateCheckData(checkData);
          });
        });
      } else {
        debug('Warning: Could not find any checks to process');
      }
    });
  }

  validateCheckData(checkData) {
    const originalCheckData =
      typeof checkData === 'object' && checkData ? { ...checkData } : {};

    const {
      id: checkId,
      userPhone,
      protocol,
      url,
      method,
      successCodes,
      timeoutSeconds,
    } = originalCheckData;

    const acceptedMethod = ['GET', 'POST', 'PUT', 'DELETE'];

    const checkIdError = validate(checkId).required().toBe('string').check();

    const userPhoneError = validate(userPhone)
      .required()
      .toBe('string')
      .minLength(10)
      .maxLength(10)
      .check();
    const protocolError = validate(protocol)
      .required()
      .toBe('string')
      .value('http', 'https')
      .check();

    const urlError = validate(url).required().toBe('string').check();

    const methodError = validate(method)
      .required()
      .toBe('string')
      .value(...acceptedMethod)
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

    // Set the keys that may not be set (if the workers have never seen this check before)
    originalCheckData.state =
      typeof originalCheckData.state == 'string' &&
      ['up', 'down'].indexOf(originalCheckData.state) > -1
        ? originalCheckData.state
        : 'down';
    originalCheckData.lastChecked =
      typeof originalCheckData.lastChecked == 'number' &&
      originalCheckData.lastChecked > 0
        ? originalCheckData.lastChecked
        : false;

    if (
      (checkIdError || userPhoneError || protocolError,
      urlError || methodError || successCodesError || timeoutSecondsError)
    ) {
      debug(
        `Error: one of the checks with ID: ${checkId} is not properly formatted. Skipping.`
      );
    } else {
      this.performCheck(originalCheckData);
    }
  }

  performCheck(checkData) {
    const checkOutcome = {
      error: false,
      responseCode: null,
    };

    let outcomeSent = false;

    const parsedUrl = url.parse(
      `${checkData.protocol}://${checkData.url}`,
      true
    );
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path; // Using path not pathname because we want the query string

    // Construct the request options
    const requestDetails = {
      protocol: checkData.protocol + ':',
      hostname: hostName,
      method: checkData.method.toUpperCase(),
      path: path,
      timeout: checkData.timeoutSeconds * 1000,
    };
    const _moduleToUse = checkData.protocol == 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, (res) => {
      const { statusCode } = res;
      checkOutcome.responseCode = statusCode;
      if (!outcomeSent) {
        this.processCheckOutcome(checkData, checkOutcome);
        outcomeSent = true;
      }
    });

    req.on('error', (err) => {
      checkOutcome.error = {
        error: true,
        value: err,
      };
      if (!outcomeSent) {
        this.processCheckOutcome(checkData, checkOutcome);
        outcomeSent = true;
      }
    });

    req.on('timeout', (err) => {
      checkOutcome.error = {
        error: true,
        value: 'timeout',
      };
      if (!outcomeSent) {
        this.processCheckOutcome(checkData, checkOutcome);
        outcomeSent = true;
      }
    });

    req.end();
  }

  processCheckOutcome(checkData, checkOutcome) {
    const state =
      !checkOutcome.error &&
      checkOutcome.responseCode &&
      checkData.successCodes.includes(checkOutcome.responseCode)
        ? 'up'
        : 'down';

    const alertNeeded = checkData.lastChecked && checkData.state !== state;

    const timeOfCheck = Date.now();
    this.log(checkData, checkOutcome, state, alertNeeded, timeOfCheck);

    const newCheckData = checkData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    _data.update('checks', newCheckData.id, newCheckData, (err) => {
      if (err) {
        debug(
          `Error trying to save updates to the check with ID: ${newCheckData.id}`
        );
        return;
      }

      if (!alertNeeded) {
        debug('Check outcome has not changed, no alert needed.');
        return;
      }

      this.alertUserToStatusChange(newCheckData);
    });
  }

  alertUserToStatusChange(checkData) {
    const msg = `Alert: Your check for ${checkData.method.toUpperCase()} method at ${
      checkData.protocol
    }://${checkData.url} is currently "${checkData.state}"`;

    helpers.sendTwilioSms(checkData.userPhone, msg, function (err) {
      if (err) {
        debug(
          `Error: Could not send sms to alert to user check with ID: ${checkData.id}, error: ${err}`
        );
        return;
      }
      debug(
        `Success: User was alerted to a status change in their check, via sms: ${msg}`
      );
    });
  }

  log(checkData, checkOutcome, state, alertNeeded, timeOfCheck) {
    const logData = {
      check: checkData,
      outcome: checkOutcome,
      state,
      alert: alertNeeded,
      time: timeOfCheck,
    };

    _log.append(checkData.id, JSON.stringify(logData), function (err) {
      if (!err) debug('Logging to file succeeded');
      else debug('Logging to file failed');
    });
  }

  rotateLogs() {
    _log.list(false, function (err, logs) {
      if (err || !logs || !logs.length) {
        debug('Error: Could not find any logs to rotate.');
        return;
      }

      logs.forEach((logName) => {
        const logId = logName.replace('.log', '');
        const newLogId = logId + '-' + Date.now();

        _log.compress(logId, newLogId, function (err) {
          if (err) {
            debug(`Error compressing the log file with ID: ${logId}`);
            return;
          }

          _log.truncate(logId, function (err) {
            if (err) {
              debug(`Error truncating log file with ID: ${logId}`);
            } else {
              debug('Success truncating log file');
            }
          });
        });
      });
    });
  }

  logRotationLoop() {
    setInterval(() => {
      this.rotateLogs();
    }, 1000 * this.#logCompressionIntervalTime);
  }

  init() {
    // Execute all the checks immidiately
    this.gatherAllChecks();

    // looping over all the checks every variable seconds
    this.loop();

    // compress all the logs immidiately
    this.rotateLogs();

    // call the compression loop so logs will be compressed later on
    this.logRotationLoop();

    console.log('\x1b[33m%s\x1b[0m', 'Background Workers are running!');
  }
}

export default new ServiceWorkers();
