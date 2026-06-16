import { z } from 'zod';

export const EnvSchema = z.object({

});

export type Env = z.infer<typeof EnvSchema>;

let _env: Env;

export async function loadEnv(): Promise<Env> {
    const response = await fetch('/env.json');
    const data = await response.json();
    _env = EnvSchema.parse(data);
    return _env;
}

export const env = new Proxy({} as Env, {
    get(_, prop) {
        return (_env as any)[prop];
    },
});