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
 * Data emitted on the console.
 */
export interface INotification {
  state: CompilationState;
}

/**
 * The Notifier is loaded in development mode. It'll print a friendly blob
 * of JSON on the console that the UI will be able to read to signal
 * status of the compilation.
 *
 * Webpack compiler docs are sparse, of course, this is
 * inspired by {@link https://git.io/vxB3O}.
 */
export class Notifier {
  public apply(compiler: any) {
    if (!process.env[notificationEnv]) {
      return;
    }

    this.printStatus(CompilationState.Started);

    compiler.plugin('invalid', () => {
      this.printStatus(CompilationState.Started);
    });

    compiler.plugin('done', (stats: { hasErrors(): boolean }) => {
      if (stats.hasErrors()) {
        this.printStatus(CompilationState.Error);
      } else {
        this.printStatus(CompilationState.Success);
      }
    });
  }

  private printStatus(state: CompilationState) {
    // \n before just in case whoever came before us didn't clean up
    // after themselves, or is writing an async stream.
    process.stderr.write(`\n${notificationPrefix}${JSON.stringify({ state })}\n`);
  }
}
