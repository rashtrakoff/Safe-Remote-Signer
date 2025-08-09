import {
    mainnet,
    polygon,
    arbitrum,
    optimism,
    gnosis,
    base,
    Chain,
} from "viem/chains";

// Define Sonic blockchain manually as it's not in viem/chains yet
export const sonic: Chain = {
    id: 146,
    name: "Sonic",
    nativeCurrency: {
        decimals: 18,
        name: "Sonic",
        symbol: "S",
    },
    rpcUrls: {
        default: {
            http: ["https://rpc.soniclabs.com"],
        },
    },
    blockExplorers: {
        default: {
            name: "Sonic Explorer",
            url: "https://explorer.soniclabs.com",
        },
    },
    testnet: false,
};

// Supported chains configuration using viem's built-in chains
export const CHAIN_CONFIGS: Record<number, Chain> = {
    [mainnet.id]: {
        ...mainnet,
        rpcUrls: {
            ...mainnet.rpcUrls,
            default: {
                http: [
                    process.env["ETHEREUM_RPC_URL"] ||
                        "https://eth.blockrazor.xyz",
                ],
            },
        },
    },
    [polygon.id]: {
        ...polygon,
        rpcUrls: {
            ...polygon.rpcUrls,
            default: {
                http: [
                    process.env["POLYGON_RPC_URL"] ||
                        "https://polygon.drpc.org",
                ],
            },
        },
    },
    [arbitrum.id]: {
        ...arbitrum,
        rpcUrls: {
            ...arbitrum.rpcUrls,
            default: {
                http: [
                    process.env["ARBITRUM_RPC_URL"] ||
                        "https://arbitrum.drpc.org",
                ],
            },
        },
    },
    [optimism.id]: {
        ...optimism,
        rpcUrls: {
            ...optimism.rpcUrls,
            default: {
                http: [process.env["OPTIMISM_RPC_URL"] || "https://1rpc.io/op"],
            },
        },
    },
    [gnosis.id]: {
        ...gnosis,
        rpcUrls: {
            ...gnosis.rpcUrls,
            default: {
                http: [
                    process.env["GNOSIS_RPC_URL"] || "https://gnosis.drpc.org",
                ],
            },
        },
    },
    [base.id]: {
        ...base,
        rpcUrls: {
            ...base.rpcUrls,
            default: {
                http: [
                    process.env["BASE_RPC_URL"] ||
                        "https://base-rpc.publicnode.com",
                ],
            },
        },
    },
    [sonic.id]: {
        ...sonic,
        rpcUrls: {
            ...sonic.rpcUrls,
            default: {
                http: [
                    process.env["SONIC_RPC_URL"] || "https://sonic.drpc.org",
                ],
            },
        },
    },
};

// Get enabled chains from environment variable
export const getEnabledChains = (): number[] => {
    const enabledChains = process.env["ENABLED_CHAINS"];
    if (!enabledChains) {
        // Default to Ethereum and Polygon if not specified
        return [mainnet.id, polygon.id];
    }

    return enabledChains
        .split(",")
        .map((chainId) => parseInt(chainId.trim(), 10))
        .filter((chainId) => CHAIN_CONFIGS[chainId]);
};

// Validate that all enabled chains are supported
export const validateEnabledChains = (): void => {
    const enabledChains = getEnabledChains();
    const unsupportedChains = enabledChains.filter(
        (chainId) => !CHAIN_CONFIGS[chainId]
    );

    if (unsupportedChains.length > 0) {
        throw new Error(
            `Unsupported chain IDs: ${unsupportedChains.join(", ")}`
        );
    }

    if (enabledChains.length === 0) {
        throw new Error("No enabled chains configured");
    }
};

export const getChainConfig = (chainId: number): Chain => {
    const config = CHAIN_CONFIGS[chainId];
    if (!config) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return config;
};
