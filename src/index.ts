import * as glob from 'glob';
import * as parse5 from 'parse5';
import * as path from 'path';

import { IPackageConfig } from '@mixer/cdk-std/dist/internal';
import { BundleEmitter } from './bundle-emitter';
import { MixerPluginError, PackageIntegrityError } from './errors';
import { exists, readFile } from './fs';
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
  locales?: string;
}

/**
 * MixerPlugin is the webpack plugin to handle packaging Interactive output
 * to ship and develop with. Primarily, it modifies the user-provided
 * HTML page to insert the Mixer standard library and additional controls
 * in development mode.
 */
export class MixerPlugin {
  private package!: IPackageConfig;
  private notifier = new Notifier();
  private bundle = new BundleEmitter(this.notifier);

  constructor(private readonly options: IPluginOptions) {}

  public apply(compiler: any) {
    if (!compiler.hooks) {
      throw new Error(
        'The cdk webpack plugin requires Webpack version 4. ' +
          'Please run "npm install --save-dev webpack@^4.0.0" to update.',
      );
    }

    this.notifier.apply(compiler);
    this.bundle.apply(compiler);

    compiler.hooks.emit.tapPromise('MiixWebpackPlugin#plugin', async (compilation: any) => {
      const projectPath = await getProjectPath(compiler.context);
      if (!projectPath) {
        throw new Error('Could not find your project path, are you missing a package.json?');
      }

      const jsonPath = (await findPackageJson(projectPath))!;
      addFilesToCompilation(compilation, jsonPath);

      const packageJson = await mustLoadPackageJson(projectPath);
      this.package = await createPackage(packageJson, projectPath);
      this.notifier.updateMetadata(this.package);

      await this.addProductionFiles(compiler, compilation);
    });
  }

  private async addProductionFiles(compiler: any, compilation: any): Promise<void> {
    const packager = new LocalePackager(compilation);
    const locales = await packager.compile(this.options.locales);
    const homepagePath = path.resolve(compiler.context, this.options.homepage);
    if (!await exists(homepagePath)) {
      throw new PackageIntegrityError(
        `We couldn't find your homepage in ${homepagePath}. Make sure the "homepage" ` +
          `options is configured correctly in the MixerPlugin config in your webpack.config.js`,
      );
    }

    await Promise.all([
      new HomepageRenderer(
        path.resolve(compiler.context, this.options.homepage),
        this.package,
        Object.keys(locales),
      )
        .render(compiler)
        .then(result => {
          compilation.assets['index.html'] = contentsToAsset(result);
        }),
    ]);
  }

  private async addFiles(compilation: any, files: { [assetName: string]: string }): Promise<void> {
    return Promise.all(
      Object.keys(files).map(async assetName => {
        const asset = await fileToAsset(files[assetName]);
        compilation.assets[assetName] = asset;
        addFilesToCompilation(compilation, files[assetName]);
      }),
    ).then(() => undefined);
  }
}
