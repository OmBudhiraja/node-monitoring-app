import userService from '../services/userService.js';
import tokenService from '../services/tokenService.js';
import checksService from '../services/checksService.js';
import helpers from './helpers.js';

class RouteHandler {
  #acceptableMethods;
  constructor() {
    this.#acceptableMethods = ['GET', 'POST', 'PUT', 'DELETE'];

    // client facing routes
    this[''] = this.index.bind(this);
    this['account/create'] = this.accountCreateHandler.bind(this);
    this['account/edit'] = this.accountEditHandler.bind(this);
    this['session/create'] = this.sessionCreateHandler.bind(this);
    this['checks/all'] = this.checksAllHandler.bind(this);
    this['checks/create'] = this.checksCreateHandler.bind(this);
    this['checks/edit'] = this.checksEditHandler.bind(this);

    // api routes
    this['ping'] = this.pingHandler.bind(this);
    this['api/user'] = this.userHandler.bind(this);
    this['api/token'] = this.tokenHandler.bind(this);
    this['api/checks'] = this.checksHandler.bind(this);
    this['notFound'] = this.notFoundHandler.bind(this);
  }

  index(data, callback) {
    if (data.method === 'GET') {
      const templateData = {
        'head.title': 'Uptime Monitoring - Made Simple',
        'head.description':
          "We offer free, simple uptime monitoring for HTTP/HTTPS sites of all kinds. We'll send you the text to let you know. ",
        'body.class': 'index',
      };

      helpers.getTemplate('index', templateData, function (err, str) {
        if (!err && str) {
          callback(200, str, 'html');
        } else {
          callback(500, undefined, 'html');
        }
      });
    } else {
      callback(405, null, 'html');
    }
  }
  accountCreateHandler(data, callback) {
    if (data.method === 'GET') {
      const templateData = {
        'head.title': 'Create an account',
        'head.description': 'Signup is easy and only takes a few seconds.',
        'body.class': 'accountCreate',
      };

      helpers.getTemplate('accountCreate', templateData, function (err, str) {
        if (!err && str) {
          callback(200, str, 'html');
        } else {
          callback(500, undefined, 'html');
        }
      });
    } else {
      callback(405, null, 'html');
    }
  }
  accountEditHandler(data, callback) {
    if (data.method === 'GET') {
      const templateData = {
        'head.title': 'Account Settings',
        'body.class': 'accountEdit',
      };

      helpers.getTemplate('accountEdit', templateData, function (err, str) {
        if (!err && str) {
          callback(200, str, 'html');
        } else {
          callback(500, undefined, 'html');
        }
      });
    } else {
      callback(405, null, 'html');
    }
  }

  sessionCreateHandler(data, callback) {
    if (data.method === 'GET') {
      const templateData = {
        'head.title': 'Login',
        'head.description':
          'Please enter your Phone Number and password to access your account.',
        'body.class': 'sessionCreate',
      };

      helpers.getTemplate('sessionCreate', templateData, function (err, str) {
        if (!err && str) {
          callback(200, str, 'html');
        } else {
          callback(500, undefined, 'html');
        }
      });
    } else {
      callback(405, null, 'html');
    }
  }
  checksAllHandler(data, callback) {
    if (data.method === 'GET') {
      const templateData = {
        'head.title': 'Dashboard',
        'body.class': 'checksList',
      };

      helpers.getTemplate('checksList', templateData, function (err, str) {
        if (!err && str) {
          callback(200, str, 'html');
        } else {
          callback(500, undefined, 'html');
        }
      });
    } else {
      callback(405, null, 'html');
    }
  }
  checksCreateHandler(data, callback) {
    if (data.method === 'GET') {
      const templateData = {
        'head.title': 'Create a new Check',
        'body.class': 'checksCreate',
      };

      helpers.getTemplate('checksCreate', templateData, function (err, str) {
        if (!err && str) {
          callback(200, str, 'html');
        } else {
          callback(500, undefined, 'html');
        }
      });
    } else {
      callback(405, null, 'html');
    }
  }

  checksEditHandler(data, callback) {
    if (data.method === 'GET') {
      const templateData = {
        'head.title': 'Check Details',
        'body.class': 'checksEdit',
      };

      helpers.getTemplate('checksEdit', templateData, function (err, str) {
        if (!err && str) {
          callback(200, str, 'html');
        } else {
          callback(500, undefined, 'html');
        }
      });
    } else {
      callback(405, null, 'html');
    }
  }

  pingHandler(data, callback) {
    callback(200);
  }

  userHandler(data, callback) {
    if (this.#acceptableMethods.includes(data.method)) {
      userService[data.method](data, callback);
    } else {
      callback(405);
    }
  }

  tokenHandler(data, callback) {
    if (this.#acceptableMethods.includes(data.method)) {
      tokenService[data.method](data, callback);
    } else {
      callback(405);
    }
  }

  checksHandler(data, callback) {
    if (this.#acceptableMethods.includes(data.method)) {
      checksService[data.method](data, callback);
    } else {
      callback(405);
    }
  }

  notFoundHandler(data, callback) {
    callback(404);
  }
}

export default new RouteHandler();
