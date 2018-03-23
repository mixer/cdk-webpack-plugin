import * as fs from 'fs';
import * as path from 'path';

import { existsSync } from 'fs';

/**
 * Finds the nearest package.json relative to the given directory, returning
 * undefined if it's not found.
 */
export function findPackageJson(dir: string): string | undefined {
  const parts = path.resolve(dir).split(path.sep);
  while (parts.length > 0) {
    const packagePath = [...parts, 'package.json'].join(path.sep);
    if (fs.existsSync(packagePath)) {
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
export function mustLoadPackageJson(dir: string): any {
  const jsonPath = findPackageJson(dir);
  if (jsonPath) {
    return require(jsonPath); // tslint:disable-line
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
export function getProjectPath(dir: string): string | undefined {
  const json = findPackageJson(dir);
  return json ? path.dirname(json) : undefined;
}
