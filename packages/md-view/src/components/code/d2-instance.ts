import type { D2, CompileRequest, Diagram, RenderOptions } from "@d2lang/d2";
import { createSerialExecutor } from '../../utils/serial-executor';

/** The upstream worker has one pending response slot, so serialize every request. */
export function createD2Client(load: () => Promise<D2>, timeoutMs = 60_000): D2 {
  let instance: Promise<D2> | null = null;
  const enqueue = createSerialExecutor();
  const run = <T,>(operation: (engine: D2) => Promise<T>): Promise<T> => enqueue(async () => {
    const current = instance ??= load();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        current.then(operation),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            instance = null;
            // @d2lang/d2 0.1.33 exposes its worker at runtime, but has no public dispose API.
            void current.then(engine => (engine as D2 & { worker?: { terminate(): void } }).worker?.terminate()).catch(() => undefined);
            reject(new Error('This diagram took too long to render. Simplify it and try again.'));
          }, timeoutMs);
        }),
      ]);
    } catch (error) {
      // Loading failures should be retryable; ordinary compile errors keep the healthy worker.
      void current.catch(() => { if (instance === current) instance = null; });
      throw error;
    } finally { clearTimeout(timer); }
  });
  const compile = (input: string | CompileRequest, options?: Omit<CompileRequest, 'fs'>) =>
    run(engine => typeof input === 'string' ? engine.compile(input, options) : engine.compile(input));
  return { compile: compile as D2['compile'], render: (diagram: Diagram, options?: RenderOptions) => run(engine => engine.render(diagram, options)) };
}

let client: D2 | undefined;

/**
 * Returns a shared, lazily initialized instance of the D2 compiler and renderer.
 * The WebAssembly module and JS wrapper are loaded on-demand on the first call.
 */
export function getD2Instance(): Promise<D2> {
  client ??= createD2Client(() => import('@d2lang/d2').then(mod => new mod.D2()));
  return Promise.resolve(client);
}
