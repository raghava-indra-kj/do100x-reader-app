import "dotenv/config";
import { z } from "zod";

export enum AppEnvType {
    DEVELOPMENT = "development",
    TEST = "test",
    PRODUCTION = "production",
}

const EnvRawSchema = z.object({
    APP_ENV: z.enum(AppEnvType),
    PORT: z.coerce.number(),
    API_BODY_SIZE_LIMIT: z.string(),
    API_BASE_PATH: z.string(),
    DATABASE_HOST: z.string(),
    DATABASE_PORT: z.coerce.number(),
    DATABASE_USER: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_NAME: z.string(),
    DATABASE_CONNECTION_LIMIT: z.coerce.number().default(5),
});
type EnvRaw = z.infer<typeof EnvRawSchema>;

export type Env = {
    appEnv: AppEnvType;
    isDebug: boolean;
    server: {
        port: number;
    };
    api: {
        basePath: string;
        bodySizeLimit: string;
    };
    database: {
        host: string;
        port: number;
        user: string;
        password: string;
        name: string;
        connectionLimit: number;
    };
};

function rawEnvToEnv(rawEnv: EnvRaw): Env {
    return {
        appEnv: rawEnv.APP_ENV,
        isDebug: rawEnv.APP_ENV !== AppEnvType.PRODUCTION,
        server: {
            port: rawEnv.PORT,
        },
        api: {
            basePath: rawEnv.API_BASE_PATH,
            bodySizeLimit: rawEnv.API_BODY_SIZE_LIMIT,
        },
        database: {
            host: rawEnv.DATABASE_HOST,
            port: rawEnv.DATABASE_PORT,
            user: rawEnv.DATABASE_USER,
            password: rawEnv.DATABASE_PASSWORD,
            name: rawEnv.DATABASE_NAME,
            connectionLimit: rawEnv.DATABASE_CONNECTION_LIMIT,
        },
    };
}

function loadEnv(): Env {
    const parsed = EnvRawSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error("Invalid environment configuration:");
        for (const issue of parsed.error.issues) {
            console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        }
        process.exit(1);
    }
    return rawEnvToEnv(parsed.data);
}

export const env = Object.freeze(loadEnv());
