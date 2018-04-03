import { expect } from 'chai';
import { join } from 'path';
import { LocalePackager } from '../src/locale-packager';

describe('Locale packager', () => {
  function checkOutput(cmp: any, results: { [key: string]: object }) {
    expect(cmp.fileDependencies.sort()).to.deep.equal([
      join(__dirname, 'fixtures', 'locales', 'en.json'),
      join(__dirname, 'fixtures', 'locales', 'es.json'),
    ]);

    expect(results).to.deep.equal({
      en: {
        hello: 'world',
      },
      es: {
        hola: 'mundo',
      },
    });
  }

  it('loads locales correctly with an absolute glob', async () => {
    const cmp = { fileDependencies: [], assets: {}, compiler: { context: __dirname } };
    const results = await new LocalePackager(cmp).compile(`${__dirname}/fixtures/locales/*.json`);
    checkOutput(cmp, results);
  });

  it('loads locales correctly with a relative glob', async () => {
    const cmp = { fileDependencies: [], assets: {}, compiler: { context: __dirname } };
    const results = await new LocalePackager(cmp).compile(`fixtures/locales/*.json`);
    checkOutput(cmp, results);
  });

  it('loads locales correctly with a weird glob', async () => {
    const cmp = { fileDependencies: [], assets: {}, compiler: { context: `${__dirname}/wut` } };
    const results = await new LocalePackager(cmp).compile(`../fixtures/locales/*.json`);
    checkOutput(cmp, results);
  });
});
