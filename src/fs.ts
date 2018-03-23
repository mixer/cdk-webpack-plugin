import * as fs from 'fs';

/**
 * Takes a function that wants a callback, and resolves when that callback
 * is resolved upon or errored.
 */
export async function promiseCallback<R = any>(
  fn: (callback: (err?: Error, result?: R) => void) => void,
): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    fn((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Promisified fs.readFile
 */
export async function readFile(file: string): Promise<string> {
  return promiseCallback<string>(callback => {
    fs.readFile(file, 'utf8', callback);
  });
}

/**
 * Promisified fs.exists
 */
export async function exists(file: string): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    fs.exists(file, resolve);
  });
}
