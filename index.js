import cluster from 'cluster';
import os from 'os';
import server from './lib/server.js';
import workers from './lib/serviceWorkers.js';
import cli from './lib/cli.js';
import config from './lib/config.js';

class App {
  init(callback) {
    if (cluster.isMaster) {
      // workers.init();
      setImmediate(() => {
        cli.init();
        callback && callback();
      });

      for (let i = 0; i < os.cpus().length; i++) {
        cluster.fork();
      }
    } else {
      server.init();
    }
  }
}

const app = new App();

if (config.envName !== 'testing') {
  app.init();
}

export default app;

// import server from './lib/server.js';
// import workers from './lib/serviceWorkers.js';
// import cli from './lib/cli.js';
// import config from './lib/config.js';

// class App {
//   init(callback) {
//     workers.init();
//     setImmediate(() => {
//       cli.init();
//       callback && callback();
//     });
//     server.init();
//   }
// }

// const app = new App();

// if (config.envName !== 'testing') {
//   app.init();
// }

// export default app;
