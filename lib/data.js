import fs from 'fs';
import path from 'path';
import helpers from './helpers.js';

class Lib {
  #baseDir;
  constructor() {
    this.#baseDir = path.join(process.cwd(), '.data');
  }

  #getFilePath(dir, file) {
    return path.join(this.#baseDir, dir, file) + '.json';
  }

  create(dir, file, data, callback) {
    const writeFilePath = this.#getFilePath(dir, file);
    fs.open(writeFilePath, 'wx', function (err, fileDiscriptor) {
      if (!err && fileDiscriptor) {
        fs.write(fileDiscriptor, JSON.stringify(data), function (err) {
          if (err) {
            callback('Error writing to new file', null);
          } else {
            fs.close(fileDiscriptor, function (err) {
              if (err) {
                callback('Error closing new file', null);
              } else {
                callback(false, data);
              }
            });
          }
        });
      } else {
        callback('Could not create new file, it may already exists.', null);
      }
    });
  }

  read(dir, file, callback) {
    const readFilePath = this.#getFilePath(dir, file);
    fs.readFile(readFilePath, 'utf-8', function (err, data) {
      if (!err && data) {
        const parsedData = helpers.parseJsonToObject(data);
        callback(false, parsedData);
      } else {
        callback(err, data);
      }
    });
  }

  update(dir, file, data, callback) {
    const updateFilePath = this.#getFilePath(dir, file);
    fs.open(updateFilePath, 'r+', function (err, fileDiscriptor) {
      if (!err && fileDiscriptor) {
        fs.ftruncate(fileDiscriptor, function (err) {
          if (err) {
            callback('Error truncating the existing file', null);
          } else {
            fs.write(fileDiscriptor, JSON.stringify(data), function (err) {
              if (err) {
                callback('Error writing to existing file', null);
              } else {
                fs.close(fileDiscriptor, function (err) {
                  if (err) {
                    callback('Error closing existing file', null);
                  } else {
                    callback(false, data);
                  }
                });
              }
            });
          }
        });
      } else {
        callback(
          'Could not open the file for updating, it may not exist yet.',
          null
        );
      }
    });
  }

  delete(dir, file, callback) {
    const deleteFilePath = this.#getFilePath(dir, file);
    fs.unlink(deleteFilePath, function (err) {
      if (err) {
        callback('Error deleting the file', null);
      } else {
        callback(false, null);
      }
    });
  }

  list(dir, callback) {
    const listPath = path.join(this.#baseDir, dir, '/');
    fs.readdir(listPath, function (err, data) {
      if (!err && data && data.length) {
        const trimmedFilePaths = data.map((file) => file.replace('.json', ''));
        callback(false, trimmedFilePaths);
      } else {
        callback(err, data);
      }
    });
  }
}
// new Lib().list('users');
export default new Lib();
