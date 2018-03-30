/**
 * MixerPluginError is thrown when there's an error in the webpack MixerPlugin.
 */
export class MixerPluginError extends Error {}

/**
 * A PackageIntegrityError is thrown during the bundling process if something
 * is amiss in the project output.
 */
export class PackageIntegrityError extends Error {}
