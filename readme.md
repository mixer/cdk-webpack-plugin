# cdk-webpack-plugin [![Build Status](https://travis-ci.org/mixer/cdk-webpack-plugin.svg?branch=master)](https://travis-ci.org/mixer/cdk-webpack-plugin)

This plugin is used for developing with custom controls. All custom control bundles are built with Webpack, and this plugin provides hooks for the CDK to collect data and upload bundles correctly.

### Usage

This plugin requires Webpack version 4. You should import it, then add it to the `plugins` array in the `webpack.config.js`. Check out the [HTML starter code](https://github.com/mixer/cdk-html-starter/blob/master/webpack.config.js) for an example:

```js
const { MixerPlugin } = require('@mixer/cdk-webpack-plugin');

// ...

plugins: [
  // The Mixer plugin hooks up all the ✨magic✨ for the development server
  // and uploading to mixer.com.
  new MixerPlugin({ homepage: 'src/index.html' }),
  // ...
```

### Options

#### `homepage` (string) **Required**

Should point to your entry point, canonically called the `index.html`. This is the page loaded and embedded in a Mixer webpage when viewers navigate to the channel.

#### `locales` (string)

You can pass a glob to load folder of locale data. For more information about dealing with translations, check out the [docs on our dev site](https:/dev.mixer.com/reference/interactive_next/quickstart-preact.html#internationalization).
