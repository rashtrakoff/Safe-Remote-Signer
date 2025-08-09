import "dotenv/config";
import { SafeRemoteSigner } from "./bot";
import { logger } from "./utils/logger";

async function main(): Promise<void> {
    try {
        logger.info("Starting Safe Remote Signer Bot...");

        const bot = new SafeRemoteSigner();
        await bot.start();

        // Keep the process running
        logger.info("Bot is running. Press Ctrl+C to stop.");

        // Handle graceful shutdown
        const shutdown = async (): Promise<void> => {
            logger.info("Shutting down bot...");
            await bot.stop();
            process.exit(0);
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    } catch (error) {
        logger.error("Failed to start bot:", error);
        process.exit(1);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}
