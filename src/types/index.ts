import {
    SafeMultisigTransactionResponse,
    SafeMessage,
} from "@safe-global/types-kit";

export interface ChainConfig {
    chainId: number;
    rpcUrl: string;
    name: string;
}

export interface MultichainConfig {
    supportedChains: number[];
    chainConfigs: Record<number, ChainConfig>;
    safeAddress: string;
}

export interface BotConfig {
    pollingIntervalMinutes: number;
    maxGasPriceGwei: number;
    enableAutoSigning: boolean;
    enableDenyList: boolean;
    ownerChangeProtection: boolean;
    guardChangeProtection: boolean;
    moduleChangeProtection: boolean;
    logLevel: string;
    logFile: string;
}

export interface PendingTransaction {
    chainId: number;
    transaction: SafeMultisigTransactionResponse;
    isDenied: boolean;
    denyReason?: string;
}

export interface PendingMessage {
    chainId: number;
    message: SafeMessage;
    isDenied: boolean;
    denyReason?: string;
}

export interface SigningResult {
    chainId: number;
    txHash?: string;
    messageHash?: string;
    signature: string;
    success: boolean;
    error?: string;
}

export interface DenyListRule {
    type:
        | "function_selector"
        | "contract_address"
        | "value_threshold"
        | "custom";
    value: string;
    description: string;
    enabled: boolean;
}

export interface ChainStatus {
    chainId: number;
    name: string;
    isHealthy: boolean;
    lastChecked: Date;
    pendingTransactions: number;
    pendingMessages: number;
    error?: string;
}
