import { ethers } from "ethers";

// Aave动作类型定义
export interface AaveAction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

// Aave合约接口
export type IAavePool = ethers.Contract;

// Aave动作列表
export const AAVE_ACTIONS: AaveAction[] = [
  {
    name: "approve",
    description: "授权Aave Pool合约使用指定代币",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "string",
          description: "授权金额，使用'MAX'表示最大授权",
        },
      },
      required: ["amount"],
    },
  },
  {
    name: "supply",
    description: "向Aave Pool存入代币，铸造等量的aToken",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "string",
          description: "存入金额",
        },
      },
      required: ["amount"],
    },
  },
  {
    name: "withdraw",
    description: "从Aave Pool提取代币，销毁等量的aToken",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "string",
          description: "提取金额",
        },
      },
      required: ["amount"],
    },
  },
  {
    name: "borrow",
    description: "从Aave Pool借款，需要足够的抵押品或信用委托",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "string",
          description: "借款金额",
        },
        interestRateMode: {
          type: "string",
          enum: ["STABLE", "VARIABLE"],
          description: "利率模式：STABLE（稳定利率）或VARIABLE（浮动利率）",
        },
      },
      required: ["amount", "interestRateMode"],
    },
  },
  {
    name: "repay",
    description: "向Aave Pool还款，销毁等量的债务代币",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "string",
          description: "还款金额",
        },
        interestRateMode: {
          type: "string",
          enum: ["STABLE", "VARIABLE"],
          description: "利率模式：STABLE（稳定利率）或VARIABLE（浮动利率）",
        },
      },
      required: ["amount", "interestRateMode"],
    },
  },
  {
    name: "getUserAccountData",
    description: "获取用户在Aave Pool的账户数据，包括抵押品、债务、健康因子等",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "checkBalance",
    description: "检查钱包中的 ETH 和 WETH 余额",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// Aave Pool ABI
const AAVE_POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256)",
  "function getUserAccountData(address user) external view returns (tuple(uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor))"
];

export enum InterestRateMode {
  NONE = 0,
  STABLE = 1,
  VARIABLE = 2
}

// Aave Pool Addresses Provider 合约地址
export const AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";

// Aave Pool Addresses Provider ABI
const AAVE_POOL_ADDRESSES_PROVIDER_ABI = [
  "function getPool() external view returns (address)",
  "function getPoolDataProvider() external view returns (address)",
  "function getPriceOracle() external view returns (address)",
  "function getACLManager() external view returns (address)",
  "function getMarketId() external view returns (string memory)"
];

// Aave Pool Data Provider ABI
const AAVE_POOL_DATA_PROVIDER_ABI = [
  "function getUserReservesData(address user) external view returns (tuple(address underlyingAsset, uint256 scaledATokenBalance, bool usageAsCollateralEnabledOnUser, uint256 scaledVariableDebt, uint256 principalStableDebt, uint256 stableBorrowLastUpdateTimestamp, uint256 stableBorrowRate, uint256 healthFactor)[] memory, uint8)",
  "function getReservesList() external view returns (address[] memory)",
  "function getReservesData() external view returns (tuple(address underlyingAsset, string name, string symbol, uint256 decimals, uint256 baseLTVasCollateral, uint256 reserveLiquidationThreshold, uint256 reserveLiquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool isActive, bool isFrozen, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 liquidityRate, uint128 variableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint256 availableLiquidity, uint256 totalScaledVariableDebt, uint256 priceInMarketReferenceCurrency, address priceOracle, uint256 variableRateSlope1, uint256 variableRateSlope2, uint256 baseVariableBorrowRate, uint256 optimalUsageRatio)[] memory, tuple(uint256 marketReferenceCurrencyUnit, int256 marketReferenceCurrencyPriceInUsd, int256 networkBaseTokenPriceInUsd, uint8 networkBaseTokenPriceDecimals))"
];

// 用户储备数据接口
export interface UserReserveData {
  underlyingAsset: string;
  scaledATokenBalance: bigint;
  usageAsCollateralEnabledOnUser: boolean;
  scaledVariableDebt: bigint;
  principalStableDebt: bigint;
  stableBorrowLastUpdateTimestamp: bigint;
  stableBorrowRate: bigint;
  healthFactor: bigint;
}

// 储备数据接口
export interface ReserveData {
  underlyingAsset: string;
  name: string;
  symbol: string;
  decimals: bigint;
  baseLTVasCollateral: bigint;
  reserveLiquidationThreshold: bigint;
  reserveLiquidationBonus: bigint;
  reserveFactor: bigint;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  isActive: boolean;
  isFrozen: boolean;
  liquidityIndex: bigint;
  variableBorrowIndex: bigint;
  liquidityRate: bigint;
  variableBorrowRate: bigint;
  lastUpdateTimestamp: bigint;
  aTokenAddress: string;
  variableDebtTokenAddress: string;
  interestRateStrategyAddress: string;
  availableLiquidity: bigint;
  totalScaledVariableDebt: bigint;
  priceInMarketReferenceCurrency: bigint;
  priceOracle: string;
  variableRateSlope1: bigint;
  variableRateSlope2: bigint;
  baseVariableBorrowRate: bigint;
  optimalUsageRatio: bigint;
}

// 获取 Aave Pool Addresses Provider 合约实例
export function getAavePoolAddressesProvider(provider: ethers.JsonRpcProvider): ethers.Contract {
  return new ethers.Contract(
    AAVE_POOL_ADDRESSES_PROVIDER_ADDRESS,
    AAVE_POOL_ADDRESSES_PROVIDER_ABI,
    provider
  );
}

// 获取 Aave Pool 合约地址
export async function getAavePoolAddress(provider: ethers.JsonRpcProvider): Promise<string> {
  try {
    const addressesProvider = getAavePoolAddressesProvider(provider);
    const poolAddress = await addressesProvider.getPool();
    console.log(`Retrieved Aave Pool address: ${poolAddress}`);
    return poolAddress;
  } catch (error) {
    console.error("Error getting Aave Pool address:", error);
    throw new Error(`获取 Aave Pool 地址失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 获取 Aave Pool Data Provider 合约地址
export async function getAavePoolDataProviderAddress(provider: ethers.JsonRpcProvider): Promise<string> {
  const addressesProvider = getAavePoolAddressesProvider(provider);
  return await addressesProvider.getPoolDataProvider();
}

// 获取 Aave Price Oracle 合约地址
export async function getAavePriceOracleAddress(provider: ethers.JsonRpcProvider): Promise<string> {
  const addressesProvider = getAavePoolAddressesProvider(provider);
  return await addressesProvider.getPriceOracle();
}

// 获取 Aave ACL Manager 合约地址
export async function getAaveACLManagerAddress(provider: ethers.JsonRpcProvider): Promise<string> {
  const addressesProvider = getAavePoolAddressesProvider(provider);
  return await addressesProvider.getACLManager();
}

// 获取 Aave 市场 ID
export async function getAaveMarketId(provider: ethers.JsonRpcProvider): Promise<string> {
  const addressesProvider = getAavePoolAddressesProvider(provider);
  return await addressesProvider.getMarketId();
}

// 获取 Aave Pool 合约实例
export async function getAaveContract(provider: ethers.JsonRpcProvider): Promise<IAavePool> {
  const poolAddress = await getAavePoolAddress(provider);
  return new ethers.Contract(poolAddress, AAVE_POOL_ABI, provider) as IAavePool;
}

// 获取 Aave Pool Data Provider 合约实例
export async function getAavePoolDataProvider(provider: ethers.JsonRpcProvider): Promise<ethers.Contract> {
  const dataProviderAddress = await getAavePoolDataProviderAddress(provider);
  return new ethers.Contract(
    dataProviderAddress,
    AAVE_POOL_DATA_PROVIDER_ABI,
    provider
  );
}

// 获取用户储备数据
export async function getUserReservesData(provider: ethers.JsonRpcProvider, userAddress: string): Promise<{
  userReservesData: UserReserveData[];
  userEModeCategoryId: number;
}> {
  const dataProvider = await getAavePoolDataProvider(provider);
  const [userReservesData, userEModeCategoryId] = await dataProvider.getUserReservesData(userAddress);
  return { userReservesData, userEModeCategoryId };
}

// 获取储备列表
export async function getReservesList(provider: ethers.JsonRpcProvider): Promise<string[]> {
  const dataProvider = await getAavePoolDataProvider(provider);
  return await dataProvider.getReservesList();
}

// 获取储备数据
export async function getReservesData(provider: ethers.JsonRpcProvider): Promise<{
  reservesData: ReserveData[];
  baseCurrencyInfo: {
    marketReferenceCurrencyUnit: bigint;
    marketReferenceCurrencyPriceInUsd: bigint;
    networkBaseTokenPriceInUsd: bigint;
    networkBaseTokenPriceDecimals: number;
  };
}> {
  const dataProvider = await getAavePoolDataProvider(provider);
  const [reservesData, baseCurrencyInfo] = await dataProvider.getReservesData();
  return { reservesData, baseCurrencyInfo };
}

// ERC20 基本 ABI
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)"
];

// 获取 ERC20 合约实例
export function getERC20Contract(provider: ethers.JsonRpcProvider, tokenAddress: string): ethers.Contract {
  return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
}

// Base Sepolia 测试网络上的 WETH 地址
export const BASE_SEPOLIA_WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

// 获取 ETH 和 WETH 余额
export async function getEthAndWethBalance(provider: ethers.JsonRpcProvider, address: string): Promise<{
  ethBalance: string;
  wethBalance: string;
}> {
  try {
    // 获取 ETH 余额
    const ethBalance = await provider.getBalance(address);
    
    // 获取 WETH 余额
    const wethContract = getERC20Contract(provider, BASE_SEPOLIA_WETH_ADDRESS);
    const wethBalance = await wethContract.balanceOf(address);
    
    return {
      ethBalance: ethers.formatEther(ethBalance),
      wethBalance: ethers.formatEther(wethBalance)
    };
  } catch (error) {
    console.error("Error getting balances:", error);
    throw new Error(`获取余额失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
} 