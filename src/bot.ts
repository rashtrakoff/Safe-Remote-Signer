import { CronJob } from "cron";
import { SimpleSigner } from "./services/simpleSigner";
import { SafeService } from "./services/safeService";
import { config } from "./config";
import { getEnabledChains, validateEnabledChains } from "./config/chains";
import { logger } from "./utils/logger";

export class SafeRemoteSigner {
    private safeService: SafeService;
    private signer: SimpleSigner;
    private pollingJob: CronJob | undefined;
    private isRunning: boolean = false;
    private enabledChains: number[];

    constructor() {
        // Validate configuration
        validateEnabledChains();
        this.enabledChains = getEnabledChains();

        // Initialize services
        this.signer = new SimpleSigner(config);
        this.safeService = new SafeService(this.signer, config);
    }

    /**
     * Initialize the bot
     */
    async initialize(): Promise<void> {
        try {
            logger.info("Initializing Safe Remote Signer Bot...");

            logger.info(
                `Bot will sign with address: ${this.signer.getAddress()}`
            );

            // Initialize Safe services
            await this.safeService.initialize();

            // Log configuration
            logger.info("Safe Remote Signer initialized", {
                safeAddress: config.safeAddress,
                enabledChains: config.enabledChains,
                pollingInterval: config.pollingInterval,
            });
            logger.info("Safe Remote Signer Bot initialized successfully");
        } catch (error) {
            logger.error("Failed to initialize bot:", error);
            throw error;
        }
    }

    /**
     * Start the bot
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn("Bot is already running");
            return;
        }

        try {
            await this.initialize();

            // Start polling for pending transactions
            this.startPolling();

            this.isRunning = true;
            logger.info("Safe Remote Signer Bot started successfully");

            // Perform initial scan
            await this.scanAndProcess();
        } catch (error) {
            logger.error("Failed to start bot:", error);
            throw error;
        }
    }

    /**
     * Stop the bot
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            logger.warn("Bot is not running");
            return;
        }

        try {
            // Stop polling
            if (this.pollingJob) {
                this.pollingJob.stop();
                this.pollingJob = undefined;
            }

            this.isRunning = false;
            logger.info("Safe Remote Signer Bot stopped");
        } catch (error) {
            logger.error("Failed to stop bot:", error);
            throw error;
        }
    }

    /**
     * Start polling for pending transactions
     */
    private startPolling(): void {
        const intervalInSeconds = Math.ceil(config.pollingInterval / 1000);
        const cronPattern = `*/${intervalInSeconds} * * * * *`;

        this.pollingJob = new CronJob(
            cronPattern,
            async () => {
                try {
                    await this.scanAndProcess();
                } catch (error) {
                    logger.error("Error during polling cycle:", error);
                }
            },
            null,
            true,
            "UTC"
        );

        logger.info(
            `Polling started with interval: ${config.pollingInterval}ms`
        );
    }

    /**
     * Scan for pending transactions and messages, then process them
     */
    private async scanAndProcess(): Promise<void> {
        try {
            logger.debug(
                "Starting scan for pending transactions and messages..."
            );

            // Scan for pending transactions
            const pendingTransactions =
                await this.safeService.getPendingTransactions();
            logger.info(
                `Found ${pendingTransactions.length} pending transactions across all chains`
            );

            // Process each pending transaction
            let processedCount = 0;
            for (const pendingTx of pendingTransactions) {
                const processed = await this.safeService.processTransaction(
                    pendingTx
                );
                if (processed) {
                    processedCount++;
                }
            }

            // Scan for pending messages
            const pendingMessages = await this.safeService.getPendingMessages();
            logger.info(
                `Found ${pendingMessages.length} pending messages across all chains`
            );

            // Process each pending message
            let processedMessageCount = 0;
            for (const pendingMsg of pendingMessages) {
                const processed = await this.safeService.processMessage(
                    pendingMsg
                );
                if (processed) {
                    processedMessageCount++;
                }
            }

            if (processedCount > 0 || processedMessageCount > 0) {
                logger.info(
                    `Processed ${processedCount} transactions and ${processedMessageCount} messages`
                );
            } else {
                logger.debug(
                    "No transactions or messages processed in this cycle"
                );
            }
        } catch (error) {
            logger.error("Error during scan and process:", error);
        }
    }

    /**
     * Get bot status
     */
    getStatus(): {
        isRunning: boolean;
        signerAddress: string | null;
        enabledChains: number[];
        safeAddress: string;
        pollingInterval: number;
    } {
        return {
            isRunning: this.isRunning,
            signerAddress: this.isRunning ? this.signer.getAddress() : null,
            enabledChains: this.enabledChains,
            safeAddress: config.safeAddress,
            pollingInterval: config.pollingInterval,
        };
    }

    /**
     * Manual trigger for scanning and processing
     */
    async triggerScan(): Promise<void> {
        if (!this.isRunning) {
            throw new Error("Bot is not running. Start the bot first.");
        }

        logger.info("Manual scan triggered");
        await this.scanAndProcess();
    }

    /**
     * Get Safe information for all enabled chains
     */
    async getSafeInfoForAllChains(): Promise<any[]> {
        const safeInfos = [];

        for (const chainId of this.enabledChains) {
            try {
                const safeInfo = await this.safeService.getSafeInfo(chainId);
                safeInfos.push({
                    chainId,
                    ...safeInfo,
                });
            } catch (error) {
                logger.error(
                    `Failed to get Safe info for chain ${chainId}:`,
                    error
                );
                safeInfos.push({
                    chainId,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }

        return safeInfos;
    }
}

// Graceful shutdown handling
process.on("SIGINT", async () => {
    logger.info("Received SIGINT signal, shutting down gracefully...");
    process.exit(0);
});

process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM signal, shutting down gracefully...");
    process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
    process.exit(1);
});
