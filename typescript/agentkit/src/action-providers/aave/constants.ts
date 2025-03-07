// Aave V3 合约地址和配置

// Base Sepolia测试网地址
export const BASE_SEPOLIA = {
  // Aave V3 Pool地址
  AAVE_POOL_ADDRESS: "0x6aCC8F7AF8EC783e129cc4412e3984414b953B01",
  // aWETH代币地址
  AWETH_TOKEN_ADDRESS: "0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f",
  // WETH地址
  WETH_ADDRESS: "0x4200000000000000000000000000000000000023",
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
    // supply函数
    SUPPLY: [
      "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external"
    ],
    // withdraw函数
    WITHDRAW: [
      "function withdraw(address asset, uint256 amount, address to) external returns (uint256)"
    ],
    // borrow函数
    BORROW: [
      "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external"
    ],
    // repay函数
    REPAY: [
      "function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) external returns (uint256)"
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