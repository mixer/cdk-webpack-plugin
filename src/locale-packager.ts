import { addFilesToCompilation, contentsToAsset } from './webpack-tools';

import * as glob from 'glob';
import * as json5 from 'json5';
import * as path from 'path';

import { MixerPluginError } from './errors';
import { readFile } from './fs';

/**
 * The LocalePackager takes a glob on the filesystem and returns a map of
 * locale names to their parsed data.
 */
export class LocalePackager {
  constructor(private readonly compilation: any) {}

  /**
   * compile loads locales matching the glob pattern to a map of locales
   * (from the file basenames) to their contents.
   */
  public async compile(pattern?: string): Promise<{ [locale: string]: object }> {
    if (!pattern) {
      return {};
    }

    const { context } = this.compilation.compiler;
    const files = glob.sync(pattern, { cwd: context });
    const output: { [locale: string]: object } = {};

    await Promise.all(
      files.map(async file => {
        if (!path.isAbsolute(file)) {
          file = path.resolve(context, file);
        } else {
          file = path.resolve(file);
        }

        const contents = await readFile(file);

        let parsed: object;
        try {
          parsed = json5.parse(contents);
        } catch (err) {
          throw new MixerPluginError(`Could not parse ${file}: ${err.message || err}`);
        }

        addFilesToCompilation(this.compilation, file);
        output[path.basename(file, path.extname(file))] = parsed;
      }),
    );

    return output;
  }
}
