import { expect } from 'chai';
import * as path from 'path';

import { findPackageJson, getProjectPath, mustLoadPackageJson } from '../src/npm';

describe('npm', () => {
  it('findPackageJson', () => {
    expect(findPackageJson(__dirname)).to.equal(path.join(__dirname, '..', 'package.json'));
    expect(findPackageJson('/')).to.be.undefined;
  });

  it('mustLoadPackageJson', () => {
    expect(mustLoadPackageJson(__dirname)).to.containSubset({ name: '@mcph/miix-webpack-plugin' });
    expect(() => mustLoadPackageJson('/')).to.throw(/Could not find a package/);
  });

  it('getProjectPath', () => {
    expect(getProjectPath(__dirname)).to.equal(path.join(__dirname, '..'));
    expect(getProjectPath('/')).to.be.undefined;
  });
});
