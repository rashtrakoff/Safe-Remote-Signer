import Joi from "joi";

const configSchema = Joi.object({
    // Safe Configuration
    SAFE_ADDRESS: Joi.string()
        .required()
        .description(
            "The Gnosis Safe address to monitor (same across all chains)"
        ),

    SAFE_API_KEY: Joi.string()
        .required()
        .description("API key for Safe service"),

    // Chain Configuration
    ENABLED_CHAINS: Joi.string()
        .required()
        .description("Comma-separated list of chain IDs to monitor"),

    // RPC URLs (optional, will use defaults if not provided)
    ETHEREUM_RPC_URL: Joi.string().uri().optional(),
    POLYGON_RPC_URL: Joi.string().uri().optional(),
    ARBITRUM_RPC_URL: Joi.string().uri().optional(),
    OPTIMISM_RPC_URL: Joi.string().uri().optional(),
    GNOSIS_RPC_URL: Joi.string().uri().optional(),
    BASE_RPC_URL: Joi.string().uri().optional(),
    SONIC_RPC_URL: Joi.string().uri().optional(),

    // Private Key Configuration
    PRIVATE_KEY: Joi.string()
        .required()
        .regex(/^0x[a-fA-F0-9]{64}$/)
        .description("64-character hexadecimal private key (with 0x prefix)"),

    // Bot Configuration
    POLLING_INTERVAL: Joi.number()
        .integer()
        .min(5000)
        .default(30000)
        .description("Polling interval in milliseconds"),

    API_RATE_LIMIT: Joi.number()
        .integer()
        .min(1)
        .max(10)
        .default(4)
        .description("Max concurrent API requests to Safe Transaction Service"),

    // Logging Configuration
    LOG_LEVEL: Joi.string()
        .valid("error", "warn", "info", "debug")
        .default("info"),

    // Node Environment
    NODE_ENV: Joi.string()
        .valid("development", "production", "test")
        .default("development"),
});

export interface Config {
    // Safe Configuration
    safeAddress: string;
    safeApiKey: string;
    enabledChains: string[];

    // Private Key Configuration
    privateKey: string;

    // Bot Configuration
    pollingInterval: number;
    apiRateLimit: number;

    // Logging Configuration
    logLevel: string;
}

export const validateConfig = (): Config => {
    const { error, value } = configSchema.validate(process.env, {
        allowUnknown: true,
        stripUnknown: false,
    });

    if (error) {
        throw new Error(
            `Configuration validation error: ${error.details
                .map((x) => x.message)
                .join(", ")}`
        );
    }

    // Map environment variables to config interface
    return {
        safeAddress: value.SAFE_ADDRESS,
        safeApiKey: value.SAFE_API_KEY,
        enabledChains: value.ENABLED_CHAINS.split(",").map((chain: string) =>
            chain.trim()
        ),
        privateKey: value.PRIVATE_KEY,
        pollingInterval: value.POLLING_INTERVAL,
        apiRateLimit: value.API_RATE_LIMIT,
        logLevel: value.LOG_LEVEL,
    };
};

export const config = validateConfig();
