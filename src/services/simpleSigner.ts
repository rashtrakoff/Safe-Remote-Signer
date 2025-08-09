import { privateKeyToAccount, PrivateKeyAccount } from "viem/accounts";
import { Config } from "../config";
import { logger } from "../utils/logger";

export class SimpleSigner {
    private account: PrivateKeyAccount;
    private privateKey: string;

    constructor(config: Config) {
        try {
            // Store the private key for Safe protocol kit usage
            this.privateKey = config.privateKey;

            // Create account from private key for viem operations
            this.account = privateKeyToAccount(
                config.privateKey as `0x${string}`
            );

            logger.info("SimpleSigner initialized", {
                address: this.account.address,
            });
        } catch (error) {
            logger.error("Failed to initialize SimpleSigner:", error);
            throw new Error("Invalid private key provided");
        }
    }

    /**
     * Get the Ethereum address for this signer
     */
    getAddress(): string {
        return this.account.address;
    }

    /**
     * Get the private key for use with Safe protocol kit
     * Safe protocol kit can directly use private key strings
     */
    getPrivateKey(): string {
        return this.privateKey;
    }

    /**
     * Get the viem account object for direct viem operations
     */
    getAccount(): PrivateKeyAccount {
        return this.account;
    }

    /**
     * Sign a message hash
     */
    async signMessage(messageHash: string): Promise<string> {
        try {
            const signature = await this.account.signMessage({
                message: { raw: messageHash as `0x${string}` },
            });

            logger.debug("Message signed successfully", {
                messageHash,
                signature,
            });

            return signature;
        } catch (error) {
            logger.error("Failed to sign message:", error);
            throw error;
        }
    }

    /**
     * Sign a transaction hash
     */
    async signHash(hash: string): Promise<string> {
        try {
            const signature = await this.account.signMessage({
                message: { raw: hash as `0x${string}` },
            });

            logger.debug("Hash signed successfully", {
                hash,
                signature,
            });

            return signature;
        } catch (error) {
            logger.error("Failed to sign hash:", error);
            throw error;
        }
    }
}
