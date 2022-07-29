import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

class Log {
  #baseDir;
  #compressedLogDirName;
  constructor() {
    this.#baseDir = path.join(process.cwd(), '.logs');
    this.#compressedLogDirName = 'compressedLogs';
  }

  #getFilePath(file) {
    return path.join(this.#baseDir, file) + '.log';
  }
  append(fileName, strData, callback) {
    const logFilePath = this.#getFilePath(fileName);
    fs.open(logFilePath, 'a', function (err, fileDiscriptor) {
      if (err || !fileDiscriptor)
        return callback('Could not open file for appending');

      fs.appendFile(fileDiscriptor, strData + '\n', function (err) {
        if (err) return callback('Error appending to file.');

        fs.close(fileDiscriptor, function (err) {
          if (err)
            return callback('Error closing file that was being appended.');

          callback(false);
        });
      });
    });
  }

  list(listCompressedFiles, callback) {
    fs.readdir(this.#baseDir, (err, files) => {
      if (err) {
        callback(err, []);
        return;
      }
      const baseLogFiles = files
        .filter((f) => f !== this.#compressedLogDirName)
        .map((f) => f.replace('.log', ''));
      if (!listCompressedFiles) {
        callback(false, baseLogFiles);
        return;
      }

      fs.readdir(
        path.join(this.#baseDir, this.#compressedLogDirName),
        (err, compressedFiles) => {
          if (err) {
            callback(err, []);
            return;
          }

          const allFiles = [
            ...baseLogFiles,
            ...compressedFiles.map(
              (f) => this.#compressedLogDirName + '/' + f.replace('.log.gz', '')
            ),
          ];
          callback(false, allFiles);
        }
      );
    });
  }

  compress(prevLogId, newLogId, callback) {
    const currentFilePath = this.#getFilePath(prevLogId);
    const newPath =
      path.join(this.#baseDir, this.#compressedLogDirName, newLogId) +
      '.log.gz';
    const gzip = zlib.createGzip();
    const inp = fs.createReadStream(currentFilePath);
    const out = fs.createWriteStream(newPath);
    inp.pipe(gzip).pipe(out);
    callback(false);
  }

  decompress(fileId, callback) {
    const filePath =
      path.join(this.#baseDir, this.#compressedLogDirName, fileId) + '.log.gz';

    fs.readFile(filePath, function (err, str) {
      if (!err && str) {
        // Inflate the data
        var inputBuffer = Buffer.from(str, 'base64');
        zlib.gunzip(inputBuffer, function (err, outputBuffer) {
          if (!err && outputBuffer) {
            // Callback
            var str = outputBuffer.toString();
            callback(false, str);
          } else {
            callback(err);
          }
        });
      } else {
        callback(err);
      }
    });
  }

  truncate(logId, callback) {
    const fileToTruncatePath = this.#getFilePath(logId);
    fs.truncate(fileToTruncatePath, 0, function (err) {
      if (!err) {
        callback(false);
      } else {
        callback(err);
      }
    });
  }
}

export default new Log();
