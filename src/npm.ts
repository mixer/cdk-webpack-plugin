import * as fs from 'fs';
import * as path from 'path';

import { exists, readDir, readFile } from './fs';

/**
 * Finds the nearest package.json relative to the given directory, returning
 * undefined if it's not found.
 */
export async function findPackageJson(dir: string): Promise<string | undefined> {
  const parts = path.resolve(dir).split(path.sep);
  while (parts.length > 0) {
    const packagePath = [...parts, 'package.json'].join(path.sep);
    if (await exists(packagePath)) {
      return packagePath;
    }

    parts.pop();
  }

  return undefined;
}

/**
 * Loads data from the project's package.json, throwing an error if it can't
 * be loaded.
 */
export async function mustLoadPackageJson(dir: string): Promise<any> {
  const jsonPath = await findPackageJson(dir);
  if (jsonPath) {
    return JSON.parse(await readFile(jsonPath)); // tslint:disable-line
  }

  throw new Error(
    'Could not find a package.json in your current folder, ' +
      'make sure to `cd` into your project directory!',
  );
}

/**
 * Returns the base path of a project nested in the given directory (the
 * folder containing the package.json).
 */
export async function getProjectPath(dir: string): Promise<string | undefined> {
  const json = await findPackageJson(dir);
  return json ? path.dirname(json) : undefined;
}

/**
 * Finds the readme for the project in the given directory. Uses a similar
 * process to npm.
 */
export async function findReadme(dir: string): Promise<string | undefined> {
  const fname = (await readDir(dir)).find(f => /^readme\.?/i.test(f));
  if (fname) {
    return path.join(dir, fname);
  }

  try {
    const packageJson = await mustLoadPackageJson(dir);
    return packageJson && path.normalize(path.resolve(dir, packageJson.readmeFile));
  } catch (e) {
    return undefined;
  }
}

/**
 * Copies a file from one place to another.
 */
export async function copy(source: string, destination: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs
      .createReadStream(source)
      .pipe(fs.createWriteStream(destination))
      .on('error', reject)
      .on('close', resolve);
  });
}
