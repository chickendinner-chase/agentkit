// Aave V3 合约地址和配置

// Base Sepolia测试网地址
export const BASE_SEPOLIA = {
  // Aave V3 Pool地址 - 从成功交易中确认
  AAVE_POOL_ADDRESS: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b",
  // aWETH代币地址 - 已确认
  AWETH_TOKEN_ADDRESS: "0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f",
  // WETH地址 - Base Sepolia预部署合约
  WETH_ADDRESS: "0x4200000000000000000000000000000000000006",
};

// 网络ID到网络配置的映射
export const NETWORK_CONFIG = {
  "base-sepolia": BASE_SEPOLIA,
};

// 默认网络ID
export const DEFAULT_NETWORK_ID = "base-sepolia";

// ABI定义
export const ABI = {
  // aToken ABI
  ATOKEN_ABI: [
    {
      type: "function",
      name: "balanceOf",
      inputs: [
        { name: "account", type: "address" }
      ],
      outputs: [{ type: "uint256" }],
      stateMutability: "view"
    },
    {
      type: "function",
      name: "decimals",
      inputs: [],
      outputs: [{ type: "uint8" }],
      stateMutability: "view"
    }
  ],
  
  // ERC20 approve ABI
  ERC20_APPROVE_ABI: [
    "function approve(address spender, uint256 amount) returns (bool)"
  ],
  
  // Aave Pool ABI
  POOL_ABI: {
    // supply方法
    SUPPLY: [
      {
        name: 'supply',
        type: 'function',
        inputs: [
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'onBehalfOf', type: 'address' },
          { name: 'referralCode', type: 'uint16' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }
    ],
    // withdraw方法
    WITHDRAW: [
      {
        name: 'withdraw',
        type: 'function',
        inputs: [
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'to', type: 'address' }
        ],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'nonpayable'
      }
    ],
    // borrow方法
    BORROW: [
      {
        name: 'borrow',
        type: 'function',
        inputs: [
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'interestRateMode', type: 'uint256' },
          { name: 'referralCode', type: 'uint16' },
          { name: 'onBehalfOf', type: 'address' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }
    ],
    // repay方法
    REPAY: [
      {
        name: 'repay',
        type: 'function',
        inputs: [
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'rateMode', type: 'uint256' },
          { name: 'onBehalfOf', type: 'address' }
        ],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'nonpayable'
      }
    ],
    // getUserAccountData方法
    GET_USER_ACCOUNT_DATA: [
      {
        name: 'getUserAccountData',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
          { name: 'totalCollateralBase', type: 'uint256' },
          { name: 'totalDebtBase', type: 'uint256' },
          { name: 'availableBorrowsBase', type: 'uint256' },
          { name: 'currentLiquidationThreshold', type: 'uint256' },
          { name: 'ltv', type: 'uint256' },
          { name: 'healthFactor', type: 'uint256' }
        ],
        stateMutability: 'view'
      }
    ]
  }
};

// Gas限制配置
export const GAS_LIMITS = {
  APPROVE: 100000n,
  SUPPLY: 300000n,
  WITHDRAW: 300000n,
  BORROW: 300000n,
  REPAY: 300000n
}; 