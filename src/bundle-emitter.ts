import { tmpdir } from 'os';
import * as path from 'path';
import * as tar from 'tar';

import { unlinkSync } from 'fs';
import { PackageIntegrityError } from './errors';
import { exists, readDir } from './fs';
import { NotificationType, Notifier } from './notifier';
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
          await this.startBundling(compiler);
          this.notifier.printNotification({
            kind: NotificationType.BundleCreated,
            location: this.fileTarget,
          });
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

  private async startBundling(compiler: any) {
    const projectPath = (await getProjectPath(compiler.context))!;
    const packageJson = await mustLoadPackageJson(projectPath);

    const output: string = compiler.outputPath;
    await this.verifyIntegrity(output);
    await this.createTarball(projectPath, output);
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
