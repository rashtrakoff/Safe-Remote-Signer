import SafeApiKit, { SafeInfoResponse } from "@safe-global/api-kit";
import Safe from "@safe-global/protocol-kit";
import { getChainConfig } from "../config/chains";
import { createPublicClient, http, PublicClient } from "viem";
import { SafeMultisigTransactionResponse } from "@safe-global/types-kit";
import { logger, logTransactionEvent, logChainEvent } from "../utils/logger";
import { SimpleSigner } from "./simpleSigner";
import { DenyListChecker } from "../security/denyList";
import { config, Config } from "../config";
import pLimit from "p-limit";

export interface PendingTransaction {
    chainId: number;
    safeTxHash: string;
    transaction: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- Use any to avoid type conflicts between API Kit versions
    nonce: string | number;
    confirmationsRequired: number;
    confirmations: number;
}

export interface PendingMessage {
    chainId: number;
    messageHash: string;
    message: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- Use any for message content flexibility
    confirmationsRequired: number;
    confirmations: number;
}

export class SafeService {
    private safeApiKits: Map<number, SafeApiKit> = new Map();
    private safeProtocolKits: Map<number, Safe> = new Map();
    private providers: Map<number, PublicClient> = new Map();
    private signer: SimpleSigner;
    private denyListChecker: DenyListChecker;
    private safeAddress: string;
    private enabledChains: number[];
    private apiRateLimit: ReturnType<typeof pLimit>;

    constructor(signerInstance: SimpleSigner, config: Config) {
        this.safeAddress = config.safeAddress;
        this.signer = signerInstance;
        this.denyListChecker = new DenyListChecker();
        this.enabledChains = config.enabledChains.map(Number);

        // Initialize rate limiter with configurable limit
        this.apiRateLimit = pLimit(config.apiRateLimit);

        logger.info("SafeService initialized", {
            safeAddress: this.safeAddress,
            signerAddress: this.signer.getAddress(),
            apiRateLimit: config.apiRateLimit,
            enabledChains: config.enabledChains.length,
        });
    }

    /**
     * Initialize Safe API kits for all enabled chains
     */
    async initialize(): Promise<void> {
        logger.info(
            "Initializing Safe services for chains:",
            this.enabledChains
        );

        for (const chainId of this.enabledChains) {
            try {
                const chainConfig = getChainConfig(chainId);

                // Initialize provider
                const provider = createPublicClient({
                    transport: http(chainConfig.rpcUrls.default.http[0]),
                    chain: chainConfig,
                });
                this.providers.set(chainId, provider);

                // Initialize Safe API Kit - auto-detects service URL based on chainId
                const safeApiKit = new SafeApiKit({
                    chainId: BigInt(chainId),
                    apiKey: config.safeApiKey,
                });
                this.safeApiKits.set(chainId, safeApiKit);

                // Initialize Safe Protocol Kit with private key signer
                const safeProtocolKit = await Safe.init({
                    provider: chainConfig.rpcUrls.default.http[0],
                    signer: this.signer.getPrivateKey(),
                    safeAddress: this.safeAddress,
                });
                this.safeProtocolKits.set(chainId, safeProtocolKit);

                logChainEvent(chainId, "initialized", {
                    rpcUrl: chainConfig.rpcUrls.default.http[0],
                });
            } catch (error) {
                logger.error(`Failed to initialize chain ${chainId}:`, error);
                throw error;
            }
        }

        logger.info(
            `Safe services initialized for ${this.enabledChains.length} chains`
        );
    }

    /**
     * Rate-limited wrapper for Safe API calls
     */
    private async rateLimitedApiCall<T>(
        apiCall: () => Promise<T>,
        operation: string,
        chainId: number
    ): Promise<T> {
        return this.apiRateLimit(async () => {
            try {
                const result = await apiCall();
                logger.debug(
                    `Rate-limited API call completed: ${operation} on chain ${chainId}`
                );
                return result;
            } catch (error) {
                logger.error(
                    `Rate-limited API call failed: ${operation} on chain ${chainId}:`,
                    error
                );
                throw error;
            }
        });
    }

    /**
     * Get pending transactions across all enabled chains
     */
    async getPendingTransactions(): Promise<PendingTransaction[]> {
        const allPendingTransactions: PendingTransaction[] = [];

        for (const chainId of this.enabledChains) {
            try {
                const safeApiKit = this.safeApiKits.get(chainId);
                if (!safeApiKit) {
                    logger.warn(`No Safe API kit for chain ${chainId}`);
                    continue;
                }

                const pendingTxs = await this.rateLimitedApiCall(
                    () => safeApiKit.getPendingTransactions(this.safeAddress),
                    "getPendingTransactions",
                    chainId
                );

                for (const tx of pendingTxs.results) {
                    const pendingTx: PendingTransaction = {
                        chainId,
                        safeTxHash: tx.safeTxHash,
                        transaction: tx,
                        nonce:
                            typeof tx.nonce === "string"
                                ? parseInt(tx.nonce)
                                : tx.nonce,
                        confirmationsRequired: tx.confirmationsRequired || 1,
                        confirmations: tx.confirmations?.length || 0,
                    };

                    allPendingTransactions.push(pendingTx);
                }

                logChainEvent(chainId, "pending_transactions_fetched", {
                    count: pendingTxs.results.length,
                });

                // Small delay between chain requests to spread out API calls
                if (
                    chainId !==
                    this.enabledChains[this.enabledChains.length - 1]
                ) {
                    await new Promise((resolve) => setTimeout(resolve, 250)); // 250ms delay
                }
            } catch (error) {
                logger.error(
                    `Failed to fetch pending transactions for chain ${chainId}:`,
                    error
                );
            }
        }

        return allPendingTransactions;
    }

    /**
     * Get pending messages across all enabled chains using getMessages API
     */
    async getPendingMessages(): Promise<PendingMessage[]> {
        const allPendingMessages: PendingMessage[] = [];

        for (const chainId of this.enabledChains) {
            try {
                const safeApiKit = this.safeApiKits.get(chainId);
                if (!safeApiKit) {
                    continue;
                }

                // Use getMessages to fetch messages for the Safe
                const messages = await this.rateLimitedApiCall(
                    () => safeApiKit.getMessages(this.safeAddress),
                    "getMessages",
                    chainId
                );

                for (const message of messages.results) {
                    // Only include messages that need more confirmations
                    // SafeMessage doesn't have confirmationsRequired, so we assume 2 for now
                    const confirmationsNeeded =
                        2 - (message.confirmations?.length || 0);
                    if (confirmationsNeeded > 0) {
                        const pendingMsg: PendingMessage = {
                            chainId,
                            messageHash: message.messageHash,
                            message: message,
                            confirmationsRequired: 2, // Default for messages
                            confirmations: message.confirmations?.length || 0,
                        };

                        allPendingMessages.push(pendingMsg);
                    }
                }

                logChainEvent(chainId, "pending_messages_fetched", {
                    count: messages.results.length,
                });

                // Small delay between chain requests to spread out API calls
                if (
                    chainId !==
                    this.enabledChains[this.enabledChains.length - 1]
                ) {
                    await new Promise((resolve) => setTimeout(resolve, 250)); // 250ms delay
                }
            } catch (error) {
                logger.error(
                    `Failed to fetch pending messages for chain ${chainId}:`,
                    error
                );
            }
        }

        return allPendingMessages;
    }

    /**
     * Process and potentially sign a pending transaction
     * Checks: 1) Already signed, 2) Deny list
     */
    async processTransaction(pendingTx: PendingTransaction): Promise<boolean> {
        const { chainId, safeTxHash, transaction } = pendingTx;

        try {
            logTransactionEvent(chainId, safeTxHash, "processing_started");

            // Check if we've already signed this transaction
            if (this.hasAlreadySigned(transaction)) {
                logTransactionEvent(chainId, safeTxHash, "already_signed");
                return false;
            }

            // Check deny list
            const denyCheck = this.denyListChecker.isDenied({
                to: transaction.to,
                value: transaction.value,
                data: transaction.data || "0x",
                operation: transaction.operation,
            });

            if (denyCheck.denied) {
                logTransactionEvent(chainId, safeTxHash, "denied", {
                    reasons: denyCheck.reasons,
                });
                return false;
            }

            // Sign the transaction using Safe protocol kit
            const signature = await this.signTransaction(safeTxHash, chainId);

            // Submit the signature
            const safeApiKit = this.safeApiKits.get(chainId)!;
            await this.rateLimitedApiCall(
                () => safeApiKit.confirmTransaction(safeTxHash, signature),
                "confirmTransaction",
                chainId
            );

            logTransactionEvent(chainId, safeTxHash, "signed_and_submitted");
            return true;
        } catch (error) {
            logger.error(
                `Failed to process transaction ${safeTxHash} on chain ${chainId}:`,
                error
            );
            logTransactionEvent(chainId, safeTxHash, "processing_failed", {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    /**
     * Process and potentially sign a pending message
     * Checks: 1) Already signed
     */
    async processMessage(pendingMsg: PendingMessage): Promise<boolean> {
        const { chainId, messageHash, message } = pendingMsg;

        try {
            logger.info(
                `Processing message ${messageHash} on chain ${chainId}`
            );

            // Check if we've already signed this message
            if (this.hasAlreadySignedMessage(message)) {
                logger.info(
                    `Already signed message ${messageHash} on chain ${chainId}`
                );
                return false;
            }

            // For messages, we can use Safe protocol kit or simple signing
            // Using Safe protocol kit for consistency
            const safeProtocolKit = this.safeProtocolKits.get(chainId);
            if (!safeProtocolKit) {
                throw new Error(`No Safe protocol kit for chain ${chainId}`);
            }

            const signature = await safeProtocolKit.signHash(messageHash);

            // Submit the signature using addMessageSignature
            const safeApiKit = this.safeApiKits.get(chainId)!;
            await this.rateLimitedApiCall(
                () =>
                    safeApiKit.addMessageSignature(messageHash, signature.data),
                "addMessageSignature",
                chainId
            );

            logger.info(
                `Signed and submitted message ${messageHash} on chain ${chainId}`
            );
            return true;
        } catch (error) {
            logger.error(
                `Failed to process message ${messageHash} on chain ${chainId}:`,
                error
            );
            return false;
        }
    }

    /**
     * Sign a Safe transaction using Safe protocol kit for proper signature generation
     */
    private async signTransaction(
        safeTxHash: string,
        chainId: number
    ): Promise<string> {
        const safeProtocolKit = this.safeProtocolKits.get(chainId);
        if (!safeProtocolKit) {
            throw new Error(`No Safe protocol kit for chain ${chainId}`);
        }

        try {
            // Use Safe protocol kit to sign the transaction hash
            const signature = await safeProtocolKit.signHash(safeTxHash);
            return signature.data;
        } catch (error) {
            logger.error(
                `Failed to sign transaction hash ${safeTxHash} on chain ${chainId}:`,
                error
            );
            throw error;
        }
    }

    /**
     * Check if we've already signed a transaction
     */
    private hasAlreadySigned(
        transaction: SafeMultisigTransactionResponse
    ): boolean {
        const signerAddress = this.signer.getAddress().toLowerCase();

        return (
            transaction.confirmations?.some(
                (confirmation) =>
                    confirmation.owner.toLowerCase() === signerAddress
            ) || false
        );
    }

    /**
     * Check if we've already signed a message
     */
    private hasAlreadySignedMessage(message: any): boolean {
        const signerAddress = this.signer.getAddress().toLowerCase();

        return (
            message.confirmations?.some(
                (
                    confirmation: any // eslint-disable-line @typescript-eslint/no-explicit-any -- Confirmation structure varies
                ) => confirmation.owner.toLowerCase() === signerAddress
            ) || false
        );
    }

    /**
     * Get Safe information for a specific chain
     */
    async getSafeInfo(chainId: number): Promise<SafeInfoResponse> {
        const safeApiKit = this.safeApiKits.get(chainId);
        if (!safeApiKit) {
            throw new Error(`No Safe API kit for chain ${chainId}`);
        }

        return await this.rateLimitedApiCall(
            () => safeApiKit.getSafeInfo(this.safeAddress),
            "getSafeInfo",
            chainId
        );
    }
}
