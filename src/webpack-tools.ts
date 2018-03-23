import * as path from 'path';
import { readFile } from './fs';

/**
 * Adds a file by path as a dependency of the compilation, if it doesn't
 * already exist.
 */
export function addFilesToCompilation(compilation: any, files: string[] | string) {
  if (!(files instanceof Array)) {
    files = [files];
  }

  files.forEach(file => {
    if (!path.isAbsolute(file)) {
      throw new Error(`Expected path to be absolute: ${file}`);
    }

    if (!compilation.fileDependencies.includes(file)) {
      compilation.fileDependencies.push(file);
    }
  });
}

/**
 * Base interface for one webpack file.
 */
export interface IWebpackFile {
  source(): string | Buffer;
  size(): number;
}

/**
 * Converts the data to a webpack asset.
 */
export function contentsToAsset(contents: string | Buffer): IWebpackFile {
  return {
    source: () => contents,
    size: () => contents.length,
  };
}

/**
 * Converts the given file to a webpack asset.
 */
export async function fileToAsset(...segments: string[]): Promise<IWebpackFile> {
  return readFile(path.resolve(...segments)).then(contentsToAsset);
}
