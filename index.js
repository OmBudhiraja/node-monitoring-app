import server from './lib/server.js';
import workers from './lib/serviceWorkers.js';
import cli from './lib/cli.js';
import config from './lib/config.js';

class App {
  init(callback) {
    workers.init();
    setImmediate(() => {
      cli.init();
      callback && callback();
    });
    server.init();
  }
}

const app = new App();

if (config.envName !== 'testing') {
  app.init();
}

export default app;
