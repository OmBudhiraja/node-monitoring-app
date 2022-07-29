import http from 'http';
import url from 'url';
import fs from 'fs';
import util from 'util';
import path from 'path';
import { StringDecoder } from 'string_decoder';
import appEnvVariables from './config.js';
import routeHandler from './routeHandler.js';
import helpers from './helpers.js';

const debug = util.debuglog('server');

class Server {
  static #httpPort = appEnvVariables.httpPort || 5000;
  static #decoder = new StringDecoder('utf-8');

  httpServer = http.createServer((req, res) => {
    this.requestHandler(req, res);
  });

  #processHandlerResponse(res, method, trimmedPath, statusCode, payload, contentType) {
    // defaults
    statusCode = typeof statusCode === 'number' ? statusCode : 200;
    if (contentType === 'json') {
      res.setHeader('Content-Type', 'application/json');
      payload = typeof payload === 'object' ? JSON.stringify(payload) : JSON.stringify({});
    }
    if (contentType === 'html') {
      res.setHeader('Content-Type', 'text/html');
      payload = typeof payload === 'string' ? payload : '';
    }

    res.writeHead(statusCode);
    res.end(payload);

    if (statusCode === 200) {
      debug(
        '\x1b[32m%s\x1b[0m',
        `${method.toUpperCase()} request at /${trimmedPath}: ${statusCode}`
      );
    } else {
      debug(
        '\x1b[31m%s\x1b[0m',
        `${method.toUpperCase()} request at /${trimmedPath}: ${statusCode}`
      );
    }
  }

  requestHandler(req, res) {
    // getting the parsed URL
    const parsedUrl = url.parse(req.url, true);
    // getting the path
    const pathname = parsedUrl.pathname;
    const trimmedPath = pathname.replace(/^\/+|\/+$/g, '');

    // getting the HTTP method
    const method = req.method.toUpperCase();

    // serving static assets from public folder
    if (trimmedPath.startsWith('public/') && method === 'GET') {
      const basePath = path.join(process.cwd(), trimmedPath);
      const contentType = helpers.getContentTypeForPublicAsset(path.extname(basePath));
      const stream = fs.createReadStream(basePath);
      stream.on('error', function () {
        res.writeHead(404);
        res.end();
      });
      stream.on('close', () => {
        res.end();
      });
      stream.pipe(res);
      res.setHeader('Content-Type', contentType);
      return;
    }

    // getting the query string as an object
    const queryStringObject = parsedUrl.query;

    // getting the headers
    const headers = req.headers;

    // getting the payload
    let buffer = '';

    req.on('data', function (data) {
      buffer += Server.#decoder.write(data);
    });

    req.on('end', () => {
      buffer += Server.#decoder.end();

      // choose the handler
      const chosenHandler = routeHandler[trimmedPath] ?? routeHandler.notFound;

      // constructing the data object to send to handler
      const data = {
        trimmedPath,
        queryStringObject,
        method,
        headers,
        payload: helpers.parseJsonToObject(buffer),
      };

      try {
        chosenHandler(data, (statusCode, payload, contentType = 'json') => {
          this.#processHandlerResponse(res, method, trimmedPath, statusCode, payload, contentType);
        });
      } catch (err) {
        debug(err);
        this.#processHandlerResponse(
          res,
          method,
          trimmedPath,
          500,
          {
            error: 'An Unknown error has occured',
          },
          'json'
        );
      }
    });
  }

  init() {
    this.httpServer.listen(process.env.$PORT || Server.#httpPort, function () {
      console.log('\x1b[35m%s\x1b[0m', `HTTP Server listening on port ${Server.#httpPort}`);
    });
  }
}

export default new Server();
