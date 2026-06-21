import { logger } from "@core/infra/logger";

type ShutdownHandler = {
    name: string;
    disconnect: () => Promise<void>;
};

const handlers: ShutdownHandler[] = [];

export function registerShutdownHandler({ name, disconnect }: ShutdownHandler): void {
    handlers.push({ name, disconnect });
}

export async function runShutdownHandlers(): Promise<void> {
    for (const handler of handlers) {
        try {
            await handler.disconnect();
            logger.info(`${handler.name} disconnected`);
        } catch (err) {
            logger.error(err, `Failed to disconnect ${handler.name}`);
        }
    }
}
