import { IPackageConfig } from '@mcph/miix-std/dist/package';

/**
 * Prefix shown before notification lines before the JSON-encoded INotification.
 */
export const notificationPrefix = 'miix-status:';

/**
 * Environment variable set when the plugin is run from the miix UI.
 * If set, the Notifier will emit.
 */
export const notificationEnv = 'MIIX_UI_HOSTED';

/**
 * State of the compilation.
 */
export const enum CompilationState {
  Started,
  Success,
  Error,
}

/**
 * Type of emitted notification.
 */
export const enum NotificationType {
  Status,
  Metadata,
  BundleCreated,
  BundleFailed,
}

/**
 * Fired when the compilation state changes.
 */
export interface IStateNotification {
  state: CompilationState;
  kind: NotificationType.Status;
}

/**
 * Fired when the project metadata changes.
 */
export interface IMetadataNotification {
  metadata: IPackageConfig;
  kind: NotificationType.Metadata;
}

/**
 * Emits that a bundle has been created. Contains the location of the
 * tarball on the filesystem.
 */
export interface IBundleCreated {
  kind: NotificationType.BundleCreated;
  location: string;
}

/**
 * Emits that bundle creation has failed.
 */
export interface IBundleFailed {
  kind: NotificationType.BundleFailed;
  error: string;
}

export type Notification =
  | IStateNotification
  | IMetadataNotification
  | IBundleCreated
  | IBundleFailed;

/**
 * The Notifier is loaded in development mode. It'll print a friendly blob
 * of JSON on the console that the UI will be able to read to signal
 * status of the compilation.
 *
 * Webpack compiler docs are sparse, of course, this is
 * inspired by {@link https://git.io/vxB3O}.
 */
export class Notifier {
  constructor(public readonly isEnabled: boolean = !!process.env[notificationEnv]) {}

  /**
   * Attaches the Notifier to compiler states.
   */
  public apply(compiler: any) {
    this.printStatus(CompilationState.Started);

    compiler.hooks.invalid.tap('MiixWebpackPlugin#notifier', () => {
      this.printStatus(CompilationState.Started);
    });

    compiler.hooks.done.tap('MiixWebpackPlugin#notifier', (stats: { hasErrors(): boolean }) => {
      if (stats.hasErrors()) {
        this.printStatus(CompilationState.Error);
      } else {
        this.printStatus(CompilationState.Success);
      }
    });
  }

  /**
   * Writes a notification to the console out.
   */
  public printNotification(notification: Notification) {
    if (!this.isEnabled) {
      return;
    }

    // \n before just in case whoever came before us didn't clean up
    // after themselves, or is writing an async stream.
    process.stderr.write(`\n${notificationPrefix}${JSON.stringify(notification)}\n`);
  }

  /**
   * Should be called when project metadata changes, or is re-inspected.
   */
  public updateMetadata(metadata: IPackageConfig) {
    this.printNotification({ kind: NotificationType.Metadata, metadata });
  }

  private printStatus(state: CompilationState) {
    this.printNotification({ kind: NotificationType.Status, state });
  }
}

/**
 * Reads the notification from the console output line. Returns null if
 * the line does not contain a notification.
 */
export function readNotification(line: string): Notification | null {
  line = line.trim();

  if (!line.startsWith(notificationPrefix)) {
    return null;
  }

  return JSON.parse(line.slice(notificationPrefix.length));
}
