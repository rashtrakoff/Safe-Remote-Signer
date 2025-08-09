# Safe Remote Signer Bot

A multichain Gnosis Safe transaction signing bot designed for Raspberry Pi deployment. This bot monitors pending transactions across multiple blockchain networks and automatically signs them using a secure private key.

> [!WARNING]
> Use this remote signer only if you use another wallet (preferably a hardware wallet). Goes without saying but make sure you trust the other signer(s).

## Features

- 🔐 **Secure Signing**: Uses private key stored in environment variables for transaction signing
- 🌐 **Multichain Support**: Supports multiple chains with a single Safe address
- 🛡️ **Security Controls**: Built-in deny-list to prevent dangerous operations
- 🔄 **Automated Monitoring**: Continuous polling for pending transactions and messages
- 📊 **Comprehensive Logging**: Structured logging with multiple levels and outputs
- 🔧 **Configurable**: Environment-based configuration for easy deployment
- ⚡ **Rate Limited**: Built-in rate limiting to respect Safe API limits

## Supported Chains

- Ethereum Mainnet (Chain ID: 1)
- Polygon (Chain ID: 137)
- Arbitrum One (Chain ID: 42161)
- Optimism (Chain ID: 10)
- Gnosis Chain (Chain ID: 100)
- Base (Chain ID: 8453)

## Prerequisites

- Node.js 18+
- Gnosis Safe deployed on target chains
- Access to RPC endpoints for target chains
- Private key for signing (securely stored)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd safe-remote-signer
```

2. Install dependencies:
```bash
pnpm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Configure your environment variables (see Configuration section)

## Configuration

Create a `.env` file with the following required variables:

### Safe Configuration
```env
# The Gnosis Safe address to monitor (same across all chains)
SAFE_ADDRESS=0x1234567890123456789012345678901234567890

# Comma-separated list of chain IDs to monitor
ENABLED_CHAINS=1,137,42161

SAFE_API_KEY=your_safe_api_key
```

### Private Key Configuration
```env
# Private key for signing (64-character hex with 0x prefix)
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### Optional RPC URLs
```env
# Custom RPC URLs (optional, defaults provided)
ETHEREUM_RPC_URL=https://your-ethereum-rpc-url
POLYGON_RPC_URL=https://your-polygon-rpc-url
ARBITRUM_RPC_URL=https://your-arbitrum-rpc-url
OPTIMISM_RPC_URL=https://your-optimism-rpc-url
GNOSIS_RPC_URL=https://your-gnosis-rpc-url
BASE_RPC_URL=https://your-base-rpc-url
```

### Bot Configuration
```env
# Polling interval in milliseconds (default: 30000)
POLLING_INTERVAL=30000

# API rate limit for Safe Transaction Service (default: 4)
API_RATE_LIMIT=4

# Log level
LOG_LEVEL=info
```

### Security Configuration
```env
# Comma-separated list of trusted delegate call contracts
TRUSTED_DELEGATE_CONTRACTS=0xcontract1,0xcontract2
```

## Usage

### Development Mode
```bash
# Run with hot reload
pnpm run dev

# Run with watch mode
pnpm run watch
```

### Production Mode
```bash
# Build the project
pnpm run build

# Start the bot
pnpm start
```

### Other Commands
```bash
# Run tests
pnpm test

# Lint code
pnpm run lint

# Fix linting issues
pnpm run lint:fix
```

## Security Features

### Deny List Rules

The bot includes several built-in deny list rules to prevent dangerous operations:

1. **Safe Ownership Transfer**: Prevents signing transactions that modify Safe owners or threshold
2. **Module Management**: Prevents enabling/disabling Safe modules
3. **Guard Management**: Prevents changing Safe guards
4. **Fallback Handler**: Prevents changing the fallback handler
5. **Delegate Call Restriction**: Controls delegate calls to untrusted contracts

### Private Key Security

- Private key stored in environment variables.
- All signing operations performed locally using viem.
- No external service dependencies for signing.
- Private key never leaves the local environment.

## Monitoring and Logging

The bot provides comprehensive logging:

- **Console Output**: Real-time logging with colors
- **File Logging**: Persistent logs in `logs/` directory
- **Structured Logging**: JSON format for easy parsing
- **Log Rotation**: Automatic log file rotation

### Log Levels
- `error`: Critical errors that require attention
- `warn`: Warnings about potential issues
- `info`: General information about bot operations
- `debug`: Detailed debugging information

## Deployment

### Raspberry Pi Deployment

1. Install Node.js on your Raspberry Pi:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install pnpm:
```bash
npm install -g pnpm
```

3. Clone and setup the project:
```bash
git clone <repository-url>
cd safe-remote-signer
pnpm install
```

4. Create systemd service:
```bash
sudo cp scripts/safe-remote-signer.service /etc/systemd/system/
sudo systemctl enable safe-remote-signer
sudo systemctl start safe-remote-signer
```


## API Reference

The bot exposes a simple programmatic interface:

```typescript
import { SafeRemoteSigner } from './src/bot';

const bot = new SafeRemoteSigner();

// Start the bot
await bot.start();

// Get status
const status = bot.getStatus();

// Manual scan trigger
await bot.triggerScan();

// Get Safe info for all chains
const safeInfos = await bot.getSafeInfoForAllChains();

// Stop the bot
await bot.stop();
```

## Troubleshooting

### Common Issues

1. **Private Key Errors**
   - Ensure your private key is correctly formatted (64-character hex with 0x prefix)
   - Verify the private key corresponds to an owner of the Safe

2. **RPC Connection Issues**
   - Verify RPC URLs are correct and accessible
   - Check network connectivity from your deployment environment

3. **Safe Service API Errors**
   - Ensure the Safe address exists on the configured chains
   - Check that the Safe Service APIs are accessible

### Debug Mode

Enable debug logging to get more detailed information:

```env
LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Security

This project handles sensitive cryptographic operations. Please:

- Keep your private keys secure and never commit them to version control
- Use environment variables or secure secret management
- Monitor bot activity through logs
- Test thoroughly before production use

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the logs for error details
3. Open an issue on the repository
