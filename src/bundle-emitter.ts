import * as marked from 'marked';
import { tmpdir } from 'os';
import * as path from 'path';
import * as tar from 'tar';

import { unlinkSync } from 'fs';
import { PackageIntegrityError } from './errors';
import { exists, readDir, readFile } from './fs';
import { Notification, NotificationType, Notifier } from './notifier';
import { copy, findPackageJson, findReadme, getProjectPath, mustLoadPackageJson } from './npm';

/**
 * Environment variable set when the plugin is run and intended to emit
 * a bundle.
 */
export const bundleEnv = 'MIIX_PLZ_BUNDLE';

/**
 * The BundleEmitted packages everything up nicely and emits it to the
 * provided Notifier after the webpack compilation succeeds.
 */
export class BundleEmitter {
  /**
   * Target file to write the tarball into.
   */
  private readonly fileTarget = path.join(tmpdir(), `miix-bundle-${Date.now()}.tar.gz`);

  constructor(
    private readonly notifier: Notifier,
    private readonly isEnabled: boolean = !!process.env[bundleEnv],
  ) {}

  /**
   * Attaches the emitted to the webpack compiler.
   */
  public apply(compiler: any) {
    if (!this.isEnabled) {
      return;
    }

    compiler.hooks.done.tapPromise(
      'MiixWebpackPlugin#bundleEmitter',
      async (stats: { hasErrors(): boolean }) => {
        if (stats.hasErrors()) {
          return;
        }

        try {
          this.notifier.printNotification(await this.startBundling(compiler));
        } catch (err) {
          try {
            unlinkSync(this.fileTarget);
          } catch (e) {
            // ignored
          }
          this.notifier.printNotification({
            kind: NotificationType.BundleFailed,
            error: err.stack || err.message || err,
          });
        }
      },
    );
  }

  private async startBundling(compiler: any): Promise<Notification> {
    const projectPath = (await getProjectPath(compiler.context))!;
    const packageJson = await mustLoadPackageJson(projectPath);

    const output: string = compiler.outputPath;
    await this.verifyIntegrity(output);
    await this.createTarball(projectPath, output);

    return {
      kind: NotificationType.BundleCreated,
      location: this.fileTarget,
      readme: await this.renderReadme(projectPath),
    };
  }

  /**
   * Throws an PackageIntegrityError if there are any obvious problems with
   * the bundler output.
   */
  private async verifyIntegrity(output: string): Promise<void> {
    const home = path.join(output, 'index.html');
    if (!await exists(home)) {
      throw new PackageIntegrityError(
        `An index.html is missing in your project output (${home} should exist)`,
      );
    }
  }

  /**
   * Tries to render the readme in the project, returning the HTML
   * if it's able to do so.
   */
  private async renderReadme(projectPath: string): Promise<string | null> {
    const readme = await findReadme(projectPath);
    if (!readme) {
      return null;
    }

    const contents = await readFile(readme);
    return marked(contents);
  }

  /**
   * Compresses the output dir into the target tarball.
   */
  private async createTarball(projectPath: string, output: string): Promise<void> {
    const readme = await findReadme(projectPath);
    if (readme) {
      await copy(readme, path.join(output, 'readme.md'));
    }

    await copy((await findPackageJson(projectPath))!, path.join(output, 'package.json'));

    await tar.create(
      {
        file: this.fileTarget,
        gzip: { level: 9 },
        cwd: output,
      },
      await readDir(output),
    );
  }
}
