import { Action, ActionProvider, Network, WalletProvider } from "@coinbase/agentkit";
import { 
  formatUnits, 
  parseUnits, 
  encodeFunctionData, 
  createPublicClient, 
  http 
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { z } from "zod";
import {
  ABI,
  DEFAULT_NETWORK_ID,
  GAS_LIMITS,
  NETWORK_CONFIG,
} from "./constants";
import {
  BalanceSchema,
  ApproveSchema,
  SupplySchema,
  WithdrawSchema,
  BorrowSchema,
  RepaySchema,
} from "./schemas";

// 导入Aave contract-helpers
import { 
  Pool, 
  PoolInterface, 
  EthereumTransactionTypeExtended, 
  InterestRate 
} from '@aave/contract-helpers';
import { providers, Wallet } from 'ethers';

// 添加AmountSchema定义
const AmountSchema = z.object({
  amount: z.string().min(1, "请输入金额"),
});

// 更可靠的WETH地址 - Base Sepolia网络上的WETH地址
const CORRECT_WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

/**
 * Aave操作提供者 - 提供与Aave协议交互的功能
 * 支持存款、提款、借款、还款等基本操作
 */
export function aaveActionProvider(): ActionProvider {
  // 创建adapter以兼容ethers和WalletProvider
  function createAdapter(walletProvider: WalletProvider): providers.JsonRpcProvider {
    // 创建一个最小的包装，使WalletProvider可以与ethers配合使用
    const adapter = new providers.JsonRpcProvider();
    
    // 原始的发送方法
    const originalSend = adapter.send;

    // 重写发送方法
    adapter.send = async function (method, params) {
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
        return [walletProvider.getAddress()];
      }
      
      if (method === 'eth_chainId') {
        // 从networkId推断chainId
        const networkId = walletProvider.getNetwork?.()?.networkId || DEFAULT_NETWORK_ID;
        // 使用之前在constants.ts中定义的网络对应的chainId
        if (networkId === 'base-sepolia') {
          return '0x14a34'; // Base Sepolia的chainId
        }
        // 默认返回Sepolia Chain ID
        return '0x14a34';
      }

      // 其他方法使用原始实现
      return originalSend.call(adapter, method, params);
    };

    return adapter;
  }

  // 创建Aave Pool实例
  async function createAavePool(walletProvider: WalletProvider): Promise<Pool> {
    try {
      // 获取网络ID
      const networkId = walletProvider.getNetwork?.()?.networkId || DEFAULT_NETWORK_ID;
      const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
      
      // 直接使用已确认的Pool地址
      const poolAddress = config.AAVE_POOL_ADDRESS;
      
      console.log("创建Aave Pool实例, 地址:", poolAddress);
      
      // 创建简单的ethers provider
      const provider = new providers.JsonRpcProvider('https://sepolia.base.org');
      
      // 创建Aave Pool实例
      const pool = new Pool(provider, {
        POOL: poolAddress,
        WETH_GATEWAY: '', // 暂时不使用WETH_GATEWAY
      });
      
      return pool;
    } catch (error) {
      console.error("创建Aave Pool实例失败:", error);
      throw error;
    }
  }

  /**
   * 实现Aave操作提供者
   */
  class AaveActionProvider implements ActionProvider {
    public readonly name = "aave";
    public readonly actionProviders: ActionProvider[] = [];

    private readonly actions: Action[] = [
      {
        name: "check_weth_balance",
        description: "查询您的WETH余额",
        schema: BalanceSchema,
        invoke: async (args: z.infer<typeof BalanceSchema>) => {
          const walletProvider = (args as any).walletProvider;
          try {
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            const networkId = walletProvider.getNetworkId?.() || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            const userAddress = walletProvider.getAddress();
            
            // WETH合约定义
            const wethContract = {
              address: config.WETH_ADDRESS.toLowerCase() as `0x${string}`,
              abi: [
                {
                  name: 'balanceOf',
                  type: 'function',
                  inputs: [{ name: 'account', type: 'address' }],
                  outputs: [{ type: 'uint256' }],
                  stateMutability: 'view'
                }
              ]
            };
            
            // 查询WETH余额
            let balance;
            try {
              balance = await walletProvider.readContract({
                ...wethContract,
                functionName: 'balanceOf',
                args: [userAddress],
              });
            } catch (error) {
              return `查询WETH余额失败: ${error instanceof Error ? error.message : String(error)}`;
            }
            
            // 格式化余额显示
            const formattedBalance = formatUnits(BigInt(balance.toString()), 18);
            
            return `您的WETH余额为: ${formattedBalance} WETH`;
          } catch (error) {
            return `查询WETH余额失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "check_atoken_balance",
        description: "查询用户在Aave上的aToken余额",
        schema: BalanceSchema,
        invoke: async (args: z.infer<typeof BalanceSchema>) => {
          const walletProvider = (args as any).walletProvider;
          try {
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            // 修改为与approve和supply相同的网络ID获取方式
            const networkId = walletProvider.getNetwork?.()?.networkId || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            const userAddress = walletProvider.getAddress();
            
            // 打印aToken地址和用户地址以便调试
            console.log("aWETH地址:", config.AWETH_TOKEN_ADDRESS);
            console.log("用户地址:", userAddress);
            
            // aToken合约定义
            const aTokenContract = {
              address: config.AWETH_TOKEN_ADDRESS.toLowerCase() as `0x${string}`,
              abi: [
                {
                  name: 'balanceOf',
                  type: 'function',
                  inputs: [{ name: 'account', type: 'address' }],
                  outputs: [{ type: 'uint256' }],
                  stateMutability: 'view'
                },
                {
                  name: 'decimals',
                  type: 'function',
                  inputs: [],
                  outputs: [{ type: 'uint8' }],
                  stateMutability: 'view'
                }
              ]
            };
            
            // 查询aToken余额
            let balance;
            try {
              balance = await walletProvider.readContract({
                ...aTokenContract,
                functionName: 'balanceOf',
                args: [userAddress],
              });
              console.log("原始aToken余额:", balance.toString());
            } catch (error) {
              console.error("查询aToken余额错误:", error);
              return `查询aToken余额失败: ${error instanceof Error ? error.message : String(error)}`;
            }
            
            // 查询代币小数位
            let decimals;
            try {
              decimals = await walletProvider.readContract({
                ...aTokenContract,
                functionName: 'decimals',
                args: [],
              });
            } catch (error) {
              return `查询代币小数位失败: ${error instanceof Error ? error.message : String(error)}`;
            }
            
            // 格式化余额显示
            const formattedBalance = formatUnits(BigInt(balance.toString()), Number(decimals));
            
            return `您在Aave上的aWETH余额为: ${formattedBalance} aWETH`;
          } catch (error) {
            return `查询aToken余额失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "approve_weth_for_aave",
        description: "授权Aave协议操作您的WETH",
        schema: ApproveSchema,
        invoke: async (args: z.infer<typeof ApproveSchema>) => {
          const walletProvider = (args as any).walletProvider;
          const { amount } = args;
          
          try {
            // 验证钱包提供者
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            // 验证金额
            if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
              return "错误：请提供有效的金额";
            }
            
            // 获取网络配置
            const networkId = walletProvider.getNetwork?.()?.networkId || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            // 将金额转换为wei（确保有18位小数）
            const amountInWei = parseUnits(amount, 18);
            
            // 确保地址格式正确（添加0x前缀如果需要）
            const wethAddress = config.WETH_ADDRESS.startsWith('0x') 
              ? config.WETH_ADDRESS.toLowerCase() as `0x${string}`
              : `0x${config.WETH_ADDRESS}`.toLowerCase() as `0x${string}`;
              
            const poolAddress = config.AAVE_POOL_ADDRESS.startsWith('0x')
              ? config.AAVE_POOL_ADDRESS.toLowerCase() as `0x${string}`
              : `0x${config.AAVE_POOL_ADDRESS}`.toLowerCase() as `0x${string}`;
            
            console.log("授权Aave Pool操作WETH...");
            console.log("WETH地址:", wethAddress);
            console.log("Pool地址:", poolAddress);
            console.log("授权金额:", amountInWei.toString());
            
            // 使用viem的encodeFunctionData编码approve函数调用
            const data = encodeFunctionData({
              abi: [{
                name: 'approve',
                type: 'function',
                inputs: [
                  { name: 'spender', type: 'address' },
                  { name: 'amount', type: 'uint256' }
                ],
                outputs: [{ type: 'bool' }],
                stateMutability: 'nonpayable'
              }],
              functionName: 'approve',
              args: [poolAddress, amountInWei]
            });
            
            console.log("编码后的交易数据:", data);
            
            // 发送交易
            const txHash = await walletProvider.sendTransaction({
              to: wethAddress,
              data,
              gas: GAS_LIMITS.APPROVE,
            });
            
            console.log("交易已发送，哈希:", txHash);
            
            return `已成功授权Aave协议操作 ${amount} WETH，交易哈希：${txHash}`;
          } catch (error) {
            console.error("授权WETH失败:", error);
            return `授权WETH失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "supply_weth",
        description: "向Aave供应WETH（需要先授权）",
        schema: SupplySchema,
        invoke: async (args: z.infer<typeof SupplySchema>) => {
          const walletProvider = (args as any).walletProvider;
          const { amount } = args;
          
          try {
            // 验证钱包提供者
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            // 验证金额
            if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
              return "错误：请提供有效的金额";
            }
            
            // 获取网络配置
            const networkId = walletProvider.getNetwork?.()?.networkId || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            // 获取用户地址
            const userAddress = walletProvider.getAddress();
            
            // 将金额转换为wei（确保有18位小数）
            const amountInWei = parseUnits(amount, 18);
            
            console.log("准备供应WETH到Aave...");
            
            // 准备资产地址
            const assetAddress = config.WETH_ADDRESS.toLowerCase() as `0x${string}`;
            
            // 直接使用配置的Pool地址
            const poolAddress = config.AAVE_POOL_ADDRESS.toLowerCase() as `0x${string}`;
            
            console.log("WETH地址:", assetAddress);
            console.log("Pool地址:", poolAddress);
            console.log("用户地址:", userAddress);
            console.log("供应金额:", amountInWei.toString());
            
            // 编码supply函数调用数据
            const data = encodeFunctionData({
              abi: ABI.POOL_ABI.SUPPLY,
              functionName: 'supply',
              args: [
                assetAddress,
                amountInWei,
                userAddress,
                0 // referralCode
              ]
            });
            
            console.log("编码后的交易数据:", data);
            
            // 发送交易
            const txHash = await walletProvider.sendTransaction({
              to: poolAddress,
              data,
              gas: GAS_LIMITS.SUPPLY,
            });
            
            console.log("交易已发送，哈希:", txHash);
            
            return `已成功供应 ${amount} WETH 到Aave，交易哈希：${txHash}`;
          } catch (error) {
            console.error("供应WETH失败:", error);
            return `供应WETH失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "withdraw_weth",
        description: "从Aave提取WETH",
        schema: WithdrawSchema,
        invoke: async (args: z.infer<typeof WithdrawSchema>) => {
          const walletProvider = (args as any).walletProvider;
          const params = (args as any).params;
          try {
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            let amount = params.amount;
            
            // 清理输入
            if (amount.includes("weth")) {
              amount = amount.replace(/weth/i, "").trim();
            }
            
            const networkId = walletProvider.getNetworkId?.() || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            // 将数量转为Wei单位
            const weiAmount = parseUnits(amount, 18);
            
            // Aave Pool接口 - withdraw函数
            const interfaceData = {
              abi: ABI.POOL_ABI.WITHDRAW,
              functionName: "withdraw",
              args: [
                config.WETH_ADDRESS,
                weiAmount,
                walletProvider.getAddress()
              ],
            };
            
            // 编码withdraw函数调用
            const data = walletProvider.encodeDeployData 
              ? walletProvider.encodeDeployData(interfaceData) as `0x${string}`
              : "0x" as `0x${string}`;
            
            // 发送交易
            const txHash = await walletProvider.sendTransaction({
              to: config.AAVE_POOL_ADDRESS as `0x${string}`,
              data,
              gas: GAS_LIMITS.WITHDRAW,
            });
            
            return `提款交易已发送！交易哈希: ${txHash}\n您已从Aave提取 ${amount} WETH`;
          } catch (error) {
            return `提款操作失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "borrow_weth",
        description: "从Aave借出WETH",
        schema: BorrowSchema,
        invoke: async (args: z.infer<typeof BorrowSchema>) => {
          const walletProvider = (args as any).walletProvider;
          const params = (args as any).params;
          try {
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            let amount = params.amount;
            
            // 清理输入
            if (amount.includes("weth")) {
              amount = amount.replace(/weth/i, "").trim();
            }
            
            const networkId = walletProvider.getNetworkId?.() || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            // 将数量转为Wei单位
            const weiAmount = parseUnits(amount, 18);
            
            // Aave Pool接口 - borrow函数
            const interfaceData = {
              abi: ABI.POOL_ABI.BORROW,
              functionName: "borrow",
              args: [
                config.WETH_ADDRESS,
                weiAmount,
                1, // 变动利率模式
                0, // 推荐码
                walletProvider.getAddress()
              ],
            };
            
            // 编码borrow函数调用
            const data = walletProvider.encodeDeployData 
              ? walletProvider.encodeDeployData(interfaceData) as `0x${string}`
              : "0x" as `0x${string}`;
            
            // 发送交易
            const txHash = await walletProvider.sendTransaction({
              to: config.AAVE_POOL_ADDRESS as `0x${string}`,
              data,
              gas: GAS_LIMITS.BORROW,
            });
            
            return `借款交易已发送！交易哈希: ${txHash}\n您已从Aave借出 ${amount} WETH`;
          } catch (error) {
            return `借款操作失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "repay_weth",
        description: "向Aave偿还WETH借款",
        schema: RepaySchema,
        invoke: async (args: z.infer<typeof RepaySchema>) => {
          const walletProvider = (args as any).walletProvider;
          const params = (args as any).params;
          try {
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            let amount = params.amount;
            
            // 清理输入
            if (amount.includes("weth")) {
              amount = amount.replace(/weth/i, "").trim();
            }
            
            const networkId = walletProvider.getNetworkId?.() || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            // 将数量转为Wei单位
            const weiAmount = parseUnits(amount, 18);
            
            // Aave Pool接口 - repay函数
            const interfaceData = {
              abi: ABI.POOL_ABI.REPAY,
              functionName: "repay",
              args: [
                config.WETH_ADDRESS,
                weiAmount,
                1, // 变动利率模式
                walletProvider.getAddress()
              ],
            };
            
            // 编码repay函数调用
            const data = walletProvider.encodeDeployData 
              ? walletProvider.encodeDeployData(interfaceData) as `0x${string}`
              : "0x" as `0x${string}`;
            
            // 发送交易
            const txHash = await walletProvider.sendTransaction({
              to: config.AAVE_POOL_ADDRESS as `0x${string}`,
              data,
              gas: GAS_LIMITS.REPAY,
            });
            
            return `还款交易已发送！交易哈希: ${txHash}\n您已向Aave偿还 ${amount} WETH`;
          } catch (error) {
            return `还款操作失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "check_weth_allowance",
        description: "检查您授权Aave使用的WETH数量",
        schema: BalanceSchema,
        invoke: async (args: z.infer<typeof BalanceSchema>) => {
          const walletProvider = (args as any).walletProvider;
          try {
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            const networkId = walletProvider.getNetworkId?.() || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            const userAddress = walletProvider.getAddress();
            
            // WETH合约定义
            const wethContract = {
              address: config.WETH_ADDRESS.toLowerCase() as `0x${string}`,
              abi: [
                {
                  name: 'allowance',
                  type: 'function',
                  inputs: [
                    { name: 'owner', type: 'address' },
                    { name: 'spender', type: 'address' }
                  ],
                  outputs: [{ type: 'uint256' }],
                  stateMutability: 'view'
                }
              ]
            };
            
            // 查询授权额度
            let allowance;
            try {
              allowance = await walletProvider.readContract({
                ...wethContract,
                functionName: 'allowance',
                args: [userAddress, config.AAVE_POOL_ADDRESS.toLowerCase() as `0x${string}`],
              });
            } catch (error) {
              return `查询授权额度失败: ${error instanceof Error ? error.message : String(error)}`;
            }
            
            // 格式化授权额度显示
            const formattedAllowance = formatUnits(BigInt(allowance.toString()), 18);
            
            return `您已授权Aave使用 ${formattedAllowance} WETH`;
          } catch (error) {
            return `查询授权额度失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }
    ];

    /**
     * 获取所有Aave操作
     */
    getActions(_walletProvider: WalletProvider) {
      return this.actions;
    }

    /**
     * 检查是否支持指定网络
     */
    supportsNetwork(network: Network): boolean {
      // 目前仅支持Base网络
      return network.protocolFamily === "evm";
    }
  }

  return new AaveActionProvider();
} 