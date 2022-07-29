import { pbkdf2Sync, randomBytes } from 'crypto';
import { URLSearchParams } from 'url';
import https from 'https';
import fs from 'fs';
import path from 'path';
import _data from './data.js';
import config from './config.js';
import validate from '../services/validate.js';

class Helpers {
  hashPassword(password) {
    if (!password) {
      return null;
    }
    const hasedPass = pbkdf2Sync(
      password,
      config.hashingSalt,
      1000,
      64,
      'sha512'
    ).toString('hex');
    return hasedPass;
  }

  verifyPassword(inputPassword, storedPassword) {
    const hasedPass = pbkdf2Sync(
      inputPassword,
      config.hashingSalt,
      1000,
      64,
      'sha512'
    ).toString('hex');
    return hasedPass === storedPassword;
  }

  parseJsonToObject(payload) {
    try {
      const jsonPayload = JSON.parse(payload);
      if (!jsonPayload) return {};
      return jsonPayload;
    } catch (e) {
      return {};
    }
  }

  createRandomString(length = 10) {
    return randomBytes(Math.min(length, 50)).toString('hex');
  }

  sendTwilioSms(phone, msg, callback) {
    const phoneError = validate(phone)
      .required()
      .toBe('string')
      .minLength(10)
      .maxLength(10)
      .check();

    const msgError = validate(msg)
      .required()
      .toBe('string')
      .minLength(3)
      .check();

    if (phoneError || msgError) {
      callback('Given parameters were missing or invalid.');
      return;
    }

    const payload = {
      From: config.twilio.fromPhone,
      To: `+91${phone}`,
      Body: msg,
    };

    const stringPayloadForUrl = new URLSearchParams(payload).toString();

    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayloadForUrl),
      },
    };

    // instantiating the request object
    const req = https.request(requestDetails, function (res) {
      console.log('here', res.url, typeof res.url, res.url.length);
      const { statusCode } = res;
      if (statusCode === 200 || statusCode === 201) {
        callback(false);
      } else {
        callback(`Status code returned was ${statusCode}`);
      }
      res.setEncoding('utf8');
      res.on('data', function (data) {
        console.log('Body', data);
      });
    });

    req.on('error', function (err) {
      console.log(err);
    });

    req.write(stringPayloadForUrl);
    req.end();
  }

  #getMainTemplateStr(templateName, data, callback) {
    const templateNameError = validate(templateName)
      .required()
      .toBe('string')
      .check();

    const dataError = validate(data).required().toBe('object').check();

    if (templateNameError || dataError) {
      callback('A invalid template name or data object was specified');
      return;
    }

    const templatesDir = path.join(process.cwd(), 'templates');
    const templateFilePath = path.join(templatesDir, templateName) + '.html';
    fs.readFile(templateFilePath, 'utf-8', (err, str) => {
      if (!err && str && str.length) {
        const interpolatedStr = this.#interPolateTemplate(str, data);
        callback(false, interpolatedStr);
      } else {
        callback('No template found with this name.');
      }
    });
  }

  getTemplate(templateName, data, callback) {
    this.#getMainTemplateStr(templateName, data, (err, tempStr) => {
      if (err || !tempStr) return callback(err);
      this.#addUniversalTemplate(tempStr, data, (err, finalTemplate) => {
        if (err || !finalTemplate) return callback(err);
        callback(false, finalTemplate);
      });
    });
  }

  #interPolateTemplate(str = '', data = {}) {
    // fill in data object with the templates global variables
    Object.keys(config.templateGlobals).forEach((key) => {
      data[`global.${key}`] = config.templateGlobals[key];
    });

    Object.keys(data).forEach((key) => {
      if (typeof data[key] !== 'string') return;

      const replaceWith = data[key];
      const find = `{${key}}`;
      str = str.replace(find, replaceWith);
    });

    return str;
  }

  #addUniversalTemplate(str, data, callback) {
    // get base template
    this.#getMainTemplateStr('common/base', data, (err, baseStr) => {
      if (err || !baseStr) return callback('Could not get base template');
      // get header template
      this.#getMainTemplateStr('common/header', data, (err, headerStr) => {
        if (err || !headerStr) return callback('Could not get header template');
        // get footer template
        this.#getMainTemplateStr('common/footer', data, (err, footerStr) => {
          if (err || !footerStr)
            return callback('Could not get footer template');
          const variablesObj = {
            headerSection: headerStr,
            contentSection: str,
            footerSection: footerStr,
          };
          const fullTemplate = this.#interPolateTemplate(baseStr, variablesObj);
          callback(false, fullTemplate);
        });
      });
    });
  }

  getContentTypeForPublicAsset(fileExtension) {
    let contentType = 'text/html';
    switch (fileExtension) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
        contentType = 'image/jpg';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.ico':
        contentType = 'image/x-icon';
        break;
    }

    return contentType;
  }
}

export default new Helpers();
