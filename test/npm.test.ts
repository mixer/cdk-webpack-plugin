import { expect } from 'chai';
import * as path from 'path';

import { findPackageJson, findReadme, getProjectPath, mustLoadPackageJson } from '../src/npm';

describe('npm', () => {
  it('findPackageJson', async () => {
    expect(await findPackageJson(__dirname)).to.equal(path.join(__dirname, '..', 'package.json'));
    expect(await findPackageJson('/')).to.be.undefined;
  });

  it('mustLoadPackageJson', async () => {
    expect(await mustLoadPackageJson(__dirname)).to.containSubset({
      name: '@mixer/cdk-webpack-plugin',
    });

    try {
      await mustLoadPackageJson('/');
    } catch (e) {
      expect(e.message).to.match(/Could not find a package/);
    }
  });

  it('getProjectPath', async () => {
    expect(await getProjectPath(__dirname)).to.equal(path.join(__dirname, '..'));
    expect(await getProjectPath('/')).to.be.undefined;
  });

  it('findReadme', async () => {
    const projectDir = path.normalize(path.join(__dirname, '..'));

    expect(await findReadme('/')).to.be.undefined;
    expect(await findReadme(path.join(__dirname, '..'))).to.equal(
      path.join(projectDir, 'readme.md'),
    );
    expect(await findReadme(path.join(__dirname, 'fixtures/custom-readme'))).to.equal(
      path.join(projectDir, 'test', 'fixtures', 'custom-readme', 'manual.md'),
    );
  });
});
