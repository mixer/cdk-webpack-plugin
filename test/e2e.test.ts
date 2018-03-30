import { expect } from 'chai';
import { SpawnOptions, spawnSync } from 'child_process';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as tar from 'tar';
import * as webpack from 'webpack';

import { unlinkSync } from 'fs';
import { Writable } from 'stream';
import { bundleEnv } from '../src/bundle-emitter';
import { promiseCallback } from '../src/fs';
import {
  CompilationState,
  Notification,
  notificationEnv,
  NotificationType,
  readNotification,
} from '../src/notifier';

function interceptStream(stream: Writable) {
  const oldWrite = stream.write;
  let data = '';
  (<any>stream).write = (d: string | Buffer) => {
    data += d.toString();
  };

  return () => {
    stream.write = oldWrite;
    return data;
  };
}

interface IPackResults {
  stdout: string;
  stderr: string;
  tarLocation: string;
  notifications: Notification[];
}

/**
 * Runs webpack on a directory, intercepting and returning stdout/err. Yes,
 * this is a terrible function :)
 */
async function packDirectory(dir: string): Promise<IPackResults> {
  const restoreStdout = interceptStream(process.stdout);
  const restoreStderr = interceptStream(process.stderr);

  Object.assign(process.env, {
    [notificationEnv]: 1,
    [bundleEnv]: 1,
  });

  const context = path.join(__dirname, 'fixtures', dir);
  // tslint:disable-next-line
  const config = require(path.join(context, 'webpack.config.ts'));
  const compiler = webpack({ ...config, context });
  await promiseCallback(callback => {
    compiler.run(callback);
  });

  const stdout = restoreStdout();
  const stderr = restoreStderr();
  const notifications = stderr
    .split('\n')
    .map(readNotification)
    .filter(notification => !!notification)
    .map(notification => <Notification>notification);

  const tarNotification = notifications.find(n => n.kind === NotificationType.BundleCreated);
  const tarLocation = tarNotification && (<any>tarNotification).location;

  return { stdout, stderr, notifications, tarLocation };
}

async function listTarballFiles(filename: string) {
  const entries: string[] = [];

  await tar.list(
    {
      file: filename,
      strict: true,
      onentry(entry) {
        entries.push(String(entry.path));
      },
    },
    [],
  );

  return entries.sort();
}

function clearDirectory(dir: string) {
  rimraf.sync(path.join(__dirname, 'fixtures', dir, 'dist'));
}

describe('e2e', () => {
  describe('simple-build', () => {
    let results: IPackResults;
    before(async () => {
      results = await packDirectory('simple-build');
    });

    after(() => {
      clearDirectory('simple-build');
      unlinkSync(results.tarLocation);
    });

    it('emits notifications correctly', async () => {
      expect(results.notifications).to.deep.equal([
        {
          kind: NotificationType.Status,
          state: CompilationState.Started,
        },
        {
          kind: NotificationType.Metadata,
          metadata: { name: 'hello-world', version: '0.1.0', controls: {}, scenes: {} },
        },
        {
          kind: NotificationType.Status,
          state: CompilationState.Success,
        },
        {
          kind: NotificationType.BundleCreated,
          location: results.tarLocation,
          readme: null,
        },
      ]);
    });

    it('builds bundle outputs', async () => {
      expect(await listTarballFiles(results.tarLocation)).to.deep.equal([
        'bundle.js',
        'index.html',
        'package.json',
      ]);
    });
  });

  describe('build-with-readme', () => {
    let results: IPackResults;
    before(async () => {
      results = await packDirectory('build-with-readme');
    });

    after(() => {
      clearDirectory('build-with-readme');
      unlinkSync(results.tarLocation);
    });

    it('emits notifications correctly', async () => {
      expect(results.notifications).to.deep.equal([
        {
          kind: NotificationType.Status,
          state: CompilationState.Started,
        },
        {
          kind: NotificationType.Metadata,
          metadata: { name: 'hello-world', version: '0.1.0', controls: {}, scenes: {} },
        },
        {
          kind: NotificationType.Status,
          state: CompilationState.Success,
        },
        {
          kind: NotificationType.BundleCreated,
          location: results.tarLocation,
          readme: '<h1 id="build-with-readme">build-with-readme</h1>\n',
        },
      ]);
    });

    it('builds bundle outputs', async () => {
      expect(await listTarballFiles(results.tarLocation)).to.deep.equal([
        'bundle.js',
        'index.html',
        'package.json',
        'readme.md',
      ]);
    });
  });

  describe('invalid build', () => {
    let results: IPackResults;
    before(async () => {
      results = await packDirectory('invalid-build');
    });

    it('emits notifications correctly', async () => {
      expect(results.notifications).to.deep.equal([
        {
          kind: NotificationType.Status,
          state: CompilationState.Started,
        },
        {
          kind: NotificationType.Status,
          state: CompilationState.Error,
        },
      ]);
    });
  });
});
