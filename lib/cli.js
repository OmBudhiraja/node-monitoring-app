import util from 'util';
import readline from 'readline';
import { EventEmitter } from 'events';
import os from 'os';
import v8 from 'v8';
import _data from './data.js';
import _logs from '../services/log.js';
import path from 'path';
import fs from 'fs';
import helpers from './helpers.js';

const debug = util.debuglog('cli');

class CLI {
  #uniqueOptions;
  #responders;
  constructor() {
    this.#uniqueOptions = [
      'man',
      'help',
      'exit',
      'stats',
      'list users',
      'more user info',
      'list checks',
      'more check info',
      'list logs',
      'more log info',
    ];

    this.eventEmitter = new EventEmitter();
    this.#responders = new CLIResponsers();
  }

  static drawHorizontalLine() {}
  static makeVerticalSpace() {}
  static makeCentered() {}

  #bindEventsToCommands() {
    this.#uniqueOptions.forEach((option) => {
      this.eventEmitter.on(option, (userStr) => {
        this.#responders[option](userStr);
        setTimeout(() => console.log(''), 50);
      });
    });
  }

  processInput(str) {
    if (typeof str === 'string' && str.trim().length) {
      for (let i = 0; i < this.#uniqueOptions.length; i++) {
        if (str.trim().toLowerCase().indexOf(this.#uniqueOptions[i]) > -1) {
          this.eventEmitter.emit(this.#uniqueOptions[i], str);
          return;
        }
      }
      console.log('This commannd is not recognized.');
    }
  }

  init() {
    console.log('\x1b[34m%s\x1b[0m', `The CLI is running`);

    this.#bindEventsToCommands();

    const _interface = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '>',
    });

    _interface.prompt();

    _interface.on('line', (str) => {
      this.processInput(str);
      _interface.prompt();
    });

    _interface.on('close', function () {
      process.exit(0);
    });
  }
}

class CLIResponsers {
  #cliHelpers;
  constructor() {
    this['man'] = this.helpHandler.bind(this);
    this['help'] = this.helpHandler.bind(this);
    this['exit'] = this.exitHandler.bind(this);
    this['stats'] = this.statsHandler.bind(this);
    this['list users'] = this.listUsersHandler.bind(this);
    this['more user info'] = this.moreUserInfoHandler.bind(this);
    this['list checks'] = this.listCheckstHandler.bind(this);
    this['more check info'] = this.moreCheckInfoHandler.bind(this);
    this['list logs'] = this.listLogsHandler.bind(this);
    this['more log info'] = this.moreLogInfoHandler.bind(this);

    this.#cliHelpers = new CLIHelpers();
  }

  #showStyledOutputInConsole(object, headerText) {
    if (typeof object !== 'object' || !object) return;
    this.#cliHelpers.verticalSpace();
    this.#cliHelpers.horizontalLine();
    this.#cliHelpers.centered(headerText);
    this.#cliHelpers.horizontalLine();
    this.#cliHelpers.verticalSpace(2);

    // show command in yellow and its explatation in white
    const width = process.stdout.columns;
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        const value = object[key];
        const coloredKey = '\x1b[33m' + key.trim() + '\x1b[0m';
        let line = coloredKey;
        const padding = 60 - line.length;
        for (let i = 0; i < padding; i++) {
          line += ' ';
        }
        line += value;
        let formattedLine = line;
        if (line.length > width) {
          const firstPart = line.slice(0, width);
          const endPart = line.slice(width);
          let nextSpace = '';
          for (let i = 0; i < padding + coloredKey.length; i++) {
            nextSpace += ' ';
          }
          formattedLine = firstPart + nextSpace + endPart;
        }
        console.log(formattedLine);
        this.#cliHelpers.verticalSpace();
      }
    }

    this.#cliHelpers.horizontalLine();
    this.#cliHelpers.verticalSpace();
  }

  helpHandler() {
    const commands = {
      'exit ': 'Kill the CLI (and the rest of the App)',
      'man ': 'Show this help page',
      'help ': 'Alias of the "man" command',
      'stats ':
        'Get statistics on the underlying operating system and resource utilization',
      'list users':
        'Show a list of all the registered (undeleted) users in the system',
      'more user info --{userId}': 'Show details of a specific user',
      'list checks --up|down ':
        'Show a list of all the checks in the system, including their state. The "--up" and "--down" flags are both optional',
      'more check info --{checkId}': 'Show details of a specific check.',
      'list logs --ucmp|cmp':
        'Show a list of all log files available in the system. The "--ucmp" flag only lists uncompressed logs and "--cmp" lists compressed logs only. ',
      'more log info --{fileName}': 'Show details of a specific log file.',
    };

    this.#showStyledOutputInConsole(commands, 'CLI Manual');
  }

  exitHandler() {
    process.exit(0);
  }

  statsHandler() {
    const stats = {
      'Load Average': os.loadavg().join(' '),
      'CPU Count': os.cpus().length,
      'Free Memory': os.freemem(),
      'Current Malloced Memory': v8.getHeapStatistics().malloced_memory,
      'Peak Malloced Memory': v8.getHeapStatistics().peak_malloced_memory,
      'Allocated Heap Used (%)': Math.round(
        (v8.getHeapStatistics().used_heap_size /
          v8.getHeapStatistics().total_heap_size) *
          100
      ),
      'Available Heap Allocated (%)': Math.round(
        (v8.getHeapStatistics().total_heap_size /
          v8.getHeapStatistics().heap_size_limit) *
          100
      ),
      'Uptime ': os.uptime() + ' Seconds',
    };
    this.#showStyledOutputInConsole(stats, 'SYSTEM STATISTICS');
  }

  listUsersHandler() {
    _data.list('users', (err, userIds) => {
      if (err || !userIds || !userIds.length) {
        return console.log('No users found!');
      }
      this.#cliHelpers.verticalSpace();

      userIds.forEach((userId) => {
        _data.read('users', userId, (err, userData) => {
          if (err || !userData) {
            return;
          }

          let line = `  Name: ${userData.name}, Phone: ${
            userData.phone
          }, Checks: ${userData.checks ? userData.checks.length : 0}`;
          console.log(line);
          this.#cliHelpers.verticalSpace();
        });
      });
    });
  }

  moreUserInfoHandler(userStr) {
    const [, userId] = userStr.split('--');
    if (!userId || !userId.trim().length) {
      console.log('The command is incorrect');
      console.log('\x1b[31m%s\x1b[0m', `use "more user info --{userId}"`);
      return;
    }

    _data.read('users', userId, (err, userData) => {
      if (err || !userData) {
        console.log('No user found with this UserId');
        return;
      }

      delete userData.hashedPassword;

      this.#cliHelpers.verticalSpace();
      console.dir(userData, { colors: true });
      this.#cliHelpers.verticalSpace();
    });
  }

  listCheckstHandler(userStr) {
    _data.list('checks', (err, checkIds) => {
      if (err || !checkIds || !checkIds.length) {
        console.log('No checks found');
        return;
      }
      this.#cliHelpers.verticalSpace();

      checkIds.forEach((checkId) => {
        _data.read('checks', checkId, (err, checkData) => {
          if (err || !checkData) return;

          const state = (checkData.state ?? 'unknown').trim();

          const [, userParam] = userStr.toLowerCase().split('--');
          if (
            !userParam ||
            userParam.trim() === state ||
            (userParam === 'down' && state === 'unknown')
          ) {
            console.log(
              ` ID: ${checkId}, ${checkData.method.toUpperCase()} ${
                checkData.protocol
              }://${checkData.url}, State: ${state}`
            );
            this.#cliHelpers.verticalSpace();
          }
        });
      });
    });
  }

  moreCheckInfoHandler(userStr) {
    const [, checkId] = userStr.split('--');
    if (!checkId || !checkId.trim().length) {
      console.log('The command is incorrect');
      console.log('\x1b[31m%s\x1b[0m', `use "more check info --{checkId}"`);
      return;
    }

    _data.read('checks', checkId, (err, checkData) => {
      if (err || !checkData) {
        console.log('No check found with this CheckId');
        return;
      }

      this.#cliHelpers.verticalSpace();
      console.dir(checkData, { colors: true });
      this.#cliHelpers.verticalSpace();
    });
  }

  listLogsHandler(userStr) {
    const flag = userStr.toLowerCase().split('--')[1];
    const showAll = !flag || flag.trim() === 'cmp';
    _logs.list(showAll, (err, logFilesName) => {
      if (err || !logFilesName || !logFilesName.length) {
        console.log('No logs found');
        return;
      }

      this.#cliHelpers.verticalSpace();
      logFilesName.forEach((file) => {
        if (!flag) {
          console.log(file.replace('compressedLogs/', ''));
        } else {
          if (flag.trim() === 'cmp' && file.split('-')[1]) {
            console.log(file);
          } else if (flag.trim() === 'ucmp' && !file.split('-')[1]) {
            console.log(file);
          }
        }
      });
    });
  }

  moreLogInfoHandler(userStr) {
    const logId = userStr.split('--')[1];
    if (!logId || !logId.trim()) {
      console.log('The command is incorrect');
      console.log('\x1b[31m%s\x1b[0m', `use "more log info --{logId}"`);
      return;
    }

    const isIdForCompressedFile = !!logId.split('-')[1];
    if (!isIdForCompressedFile) {
      const readPath = path.join(process.cwd(), '.logs', logId) + '.log';
      fs.readFile(readPath, 'utf-8', (err, data) => {
        if (err || !data) {
          console.log('No log found with the specified logId');
          return;
        }
        this.#cliHelpers.verticalSpace();
        const arr = data.split('\n');
        arr.forEach((line) => {
          const logObject = helpers.parseJsonToObject(line);
          if (logObject && JSON.stringify(logObject) !== '{}') {
            console.dir(logObject, { colors: true });
            this.#cliHelpers.verticalSpace();
          }
        });
      });
    } else {
      _logs.decompress(logId.trim(), (err, data) => {
        if (err || !data) {
          console.log('Could not read data from the log file');
          return;
        }
        this.#cliHelpers.verticalSpace();
        const arr = data.split('\n');
        arr.forEach((line) => {
          const logObject = helpers.parseJsonToObject(line);
          if (logObject && JSON.stringify(logObject) !== '{}') {
            console.dir(logObject, { colors: true });
            this.#cliHelpers.verticalSpace();
          }
        });
      });
    }
  }
}

class CLIHelpers {
  horizontalLine() {
    const width = process.stdout.columns;
    let line = '';
    for (let i = 0; i < width; i++) {
      line += '-';
    }
    console.log(line);
  }

  verticalSpace(lines = 1) {
    if (typeof lines === 'number') {
      lines = lines > 0 ? lines : 1;
      for (let i = 0; i < lines; i++) {
        console.log('');
      }
    }
  }
  centered(text) {
    const width = process.stdout.columns;
    const leftPadding = Math.floor((width - text.toString().trim().length) / 2);
    let space = '';
    for (let i = 0; i < leftPadding; i++) {
      space += ' ';
    }
    console.log(space + text.trim());
  }
}

export default new CLI();
