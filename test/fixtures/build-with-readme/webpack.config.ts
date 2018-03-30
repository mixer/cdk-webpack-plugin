import { MixerPlugin } from '../../../src/index';

module.exports = {
  entry: './index.js',
  output: {
    path: `${__dirname}/dist`,
    filename: 'bundle.js',
  },
  plugins: [new MixerPlugin({ homepage: 'index.html' })],
};
