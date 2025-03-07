# Aave Protocol Integration - AgentKit

This project integrates the Aave protocol into Coinbase's AgentKit framework, enabling AI assistants to perform basic DeFi operations such as checking balances, supplying, borrowing, and repaying.

## Project Overview

By integrating with the Aave protocol, this project demonstrates how to build AI assistants with DeFi capabilities using AgentKit. Users can interact with the Aave protocol through natural language without understanding the underlying technical details.

## Implementation Status

### Completed Features

We have successfully implemented and tested the following Aave operations:

- ✅ Token Balance Queries
  - WETH balance check
  - aWETH (interest-bearing token) balance check
  - Variable debt token balance check
  
- ✅ Allowance Management
  - Query allowance for Aave protocol
  - Approve WETH for Aave operations
  
- ✅ Supply and Withdrawal
  - Supply WETH to Aave
  - Withdraw WETH from Aave
  
- ✅ Borrowing and Repayment
  - Borrow WETH from Aave (variable interest rate)
  - Repay specific amount of WETH debt
  - Repay all WETH debt (using max uint256 value)

### Supported Tokens

- **WETH** (Wrapped ETH) - Base asset for supply and borrow operations
- **aWETH** (Aave interest-bearing WETH) - Received when supplying WETH
- **variableDebtWETH** - Represents variable rate debt position

### Current Challenges

- **Wallet Provider Compatibility**: Working on optimizing the integration between AgentKit's WalletProvider interface and blockchain interaction libraries.
- **Library Selection**: Currently using both viem (for most operations) and ethers.js (for adapter functionality). Need to standardize on one library.
- **Error Handling**: Improving the handling of specific Aave error codes (currently mapped to number-based errors).
- **Gas Estimation**: Occasional issues with gas estimation for certain operations that require additional configuration.

## Features

- Query WETH and aWETH token balances
- Query debt token balances
- Check authorization limits
- Authorize Aave to use WETH
- Supply WETH to Aave
- Withdraw WETH from Aave
- Borrow WETH from Aave
- Repay partial or full WETH debt

## Tech Stack

- TypeScript
- AgentKit framework
- Viem library for blockchain interactions
- Aave V3 protocol (Base Sepolia testnet)

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd agentkit/typescript/examples/langchain-cdp-chatbot
```

2. Install dependencies
```bash
npm install
```

3. Install Aave integration dependencies
```bash
npm install viem ethers@5
```

## Configuration

1. Create a `.env` file and set the following environment variables
```
CDP_API_KEY_NAME=your_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key
NETWORK_ID=base-sepolia
```

2. Ensure you have some Base Sepolia testnet ETH and WETH in your wallet

## Usage

### Running the test script

Use the following command to test Aave functionality:

```bash
npx ts-node test-aave.ts
```

### Available Aave operations

- `check_weth_balance`: Query WETH balance
- `check_atoken_balance`: Query aWETH balance
- `check_debt_balance`: Query debt token balance
- `check_weth_allowance`: Check authorization limits
- `approve_weth_for_aave`: Authorize Aave to use WETH
- `supply_weth`: Supply WETH to Aave
- `withdraw_weth`: Withdraw WETH from Aave
- `borrow_weth`: Borrow WETH from Aave
- `repay_weth`: Repay specific amount of WETH debt
- `repay_all_weth`: Repay all WETH debt

## Aave Integration Details

This project interacts with Aave in two ways:

1. Direct contract calls using the `viem` library
2. Transaction construction using `encodeFunctionData`

Main contract addresses (Base Sepolia testnet):
- Aave Pool: 0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b
- WETH: 0x4200000000000000000000000000000000000006
- aWETH: 0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f
- Variable rate debt WETH: 0xf0f0025dc51f532ab84c33eb9d01583eaa0f74c7

## Notes

- This project uses the Base Sepolia testnet and is not suitable for mainnet
- Ensure your wallet has sufficient testnet ETH and WETH before performing operations
- You must supply collateral (WETH) before borrowing
- When repaying borrowed assets, ensure you use the correct interest rate mode

## Contributing

Pull Requests and Issues are welcome to improve this project.

## License

[MIT License](LICENSE)
