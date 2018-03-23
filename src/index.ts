import * as glob from 'glob';
import * as parse5 from 'parse5';
import * as path from 'path';

import { IPackageConfig } from '@mcph/miix-std/dist/internal';
import { MixerPluginError } from './errors';
import { readFile } from './fs';
import { HomepageRenderer } from './html-renderer';
import { LocalePackager } from './locale-packager';
import { createPackage } from './metadata/metadata';
import { Notifier } from './notifier';
import { findPackageJson, getProjectPath, mustLoadPackageJson } from './npm';
import { addFilesToCompilation, contentsToAsset, fileToAsset } from './webpack-tools';

// webpack typings are pretty much useless here :(

export interface IPluginOptions {
  /**
   * Path to the HTML page to serve content from.
   */
  homepage: string;

  /**
   * glob for the locale json files.
   */
  locales: string;
}

/**
 * MixerPlugin is the webpack plugin to handle packaging Interactive output
 * to ship and develop with. Primarily, it modifies the user-provided
 * HTML page to insert the Mixer standard library and additional controls
 * in development mode.
 */
export class MixerPlugin {
  private package!: IPackageConfig;

  constructor(private readonly options: IPluginOptions) {}

  public apply(compiler: any) {
    const projectPath = getProjectPath(compiler.context);
    if (!projectPath) {
      throw new Error('Could not find your project path, are you missing a package.json?');
    }

    new Notifier().apply(compiler);

    compiler.plugin('emit', async (compilation: any, callback: any) => {
      try {
        const jsonPath = findPackageJson(projectPath)!;
        addFilesToCompilation(compilation, jsonPath);
        const packageJson = mustLoadPackageJson(projectPath);
        this.package = await createPackage(packageJson, projectPath);
        await this.addProductionFiles(compiler, compilation);
      } catch (e) {
        callback(e);
        return;
      }

      callback();
    });
  }

  private async addProductionFiles(compiler: any, compilation: any): Promise<void> {
    const packager = new LocalePackager(compilation);
    const locales = await packager.compile(this.options.locales);

    await Promise.all([
      new HomepageRenderer(this.options.homepage, this.package, Object.keys(locales))
        .render(compiler)
        .then(result => {
          compilation.assets['index.html'] = contentsToAsset(result);
        }),
    ]);
  }

  private async addFiles(compilation: any, files: { [assetName: string]: string }): Promise<void> {
    return Promise.all(
      Object.keys(files).map(async assetName =>
        fileToAsset(files[assetName]).then(asset => {
          compilation.assets[assetName] = asset;
          compilation.fileDependencies.push(files[assetName]);
        }),
      ),
    ).then(() => undefined);
  }
}
