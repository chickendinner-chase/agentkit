import { Action, ActionProvider, Network, WalletProvider } from "@coinbase/agentkit";
import { formatUnits, parseUnits } from "viem";
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
            
            // 准备WETH合约
            const wethContract = {
              address: config.WETH_ADDRESS.toLowerCase() as `0x${string}`,
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
              ],
            };
            
            // 查询余额
            const balance = await walletProvider.readContract({
              ...wethContract,
              functionName: 'balanceOf',
              args: [userAddress]
            });
            
            // 获取小数位数
            const decimals = await walletProvider.readContract({
              ...wethContract,
              functionName: 'decimals',
              args: []
            });
            
            // 转换为更易读的格式
            const formattedBalance = formatUnits(BigInt(balance.toString()), Number(decimals));
            
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
            
            const networkId = walletProvider.getNetworkId?.() || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            const userAddress = walletProvider.getAddress();
            
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
              ],
            };
            
            // 查询aToken余额
            const balance = await walletProvider.readContract({
              ...aTokenContract,
              functionName: 'balanceOf',
              args: [userAddress]
            });
            
            // 获取代币小数位数
            const decimals = await walletProvider.readContract({
              ...aTokenContract,
              functionName: 'decimals',
              args: []
            });
            
            // 转换为更易读的格式
            const formattedBalance = formatUnits(BigInt(balance.toString()), Number(decimals));
            
            return `您在Aave上的aWETH余额为: ${formattedBalance} aWETH`;
          } catch (error) {
            return `查询aWETH余额失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "approve_weth_for_aave",
        description: "授权Aave协议使用您的WETH",
        schema: AmountSchema,
        invoke: async (args: z.infer<typeof AmountSchema>) => {
          const { amount, walletProvider } = args as any;
          try {
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            const networkId = walletProvider.getNetworkId?.() || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            // 确保金额有效
            if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
              return "错误：请提供有效的金额";
            }
            
            // 转换为wei单位
            const amountInWei = parseUnits(amount.toString(), 18);
            
            // 使用viem方式构建交易
            const wethContract = {
              address: config.WETH_ADDRESS.toLowerCase() as `0x${string}`,
              abi: [
                {
                  name: 'approve',
                  type: 'function',
                  inputs: [
                    { name: 'spender', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                  ],
                  outputs: [{ type: 'bool' }],
                  stateMutability: 'nonpayable'
                }
              ],
            };
            
            // 发送授权交易
            const txHash = await walletProvider.writeContract({
              ...wethContract,
              functionName: 'approve',
              args: [
                config.AAVE_POOL_ADDRESS.toLowerCase() as `0x${string}`,  // spender (Aave Pool地址)
                amountInWei  // amount
              ]
            });
            
            return `已成功授权Aave使用您的 ${amount} WETH。交易哈希: ${txHash}`;
          } catch (error) {
            return `授权失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "supply_weth",
        description: "向Aave协议存入WETH资产以赚取利息",
        schema: AmountSchema,
        invoke: async (args: z.infer<typeof AmountSchema>) => {
          const { amount, walletProvider } = args as any;
          try {
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            const networkId = walletProvider.getNetworkId?.() || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            // 确保金额有效
            if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
              return "错误：请提供有效的金额";
            }
            
            const userAddress = walletProvider.getAddress();
            
            // 转换为合约需要的金额格式（以wei为单位）
            const amountInWei = parseUnits(amount.toString(), 18);
            
            // 使用viem的方式构建交易
            const poolContract = {
              address: config.AAVE_POOL_ADDRESS.toLowerCase() as `0x${string}`,
              abi: ABI.POOL_ABI.SUPPLY,
            };
            
            // 检查用户是否有足够的WETH
            const wethContract = {
              address: config.WETH_ADDRESS.toLowerCase() as `0x${string}`,
              abi: [
                {
                  name: 'balanceOf',
                  type: 'function',
                  inputs: [{ name: 'account', type: 'address' }],
                  outputs: [{ type: 'uint256' }],
                  stateMutability: 'view'
                },
                {
                  name: 'allowance',
                  type: 'function',
                  inputs: [
                    { name: 'owner', type: 'address' },
                    { name: 'spender', type: 'address' }
                  ],
                  outputs: [{ type: 'uint256' }],
                  stateMutability: 'view'
                },
                {
                  name: 'approve',
                  type: 'function',
                  inputs: [
                    { name: 'spender', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                  ],
                  outputs: [{ type: 'bool' }],
                  stateMutability: 'nonpayable'
                }
              ],
            };
            
            const wethBalance = await walletProvider.readContract({
              ...wethContract,
              functionName: 'balanceOf',
              args: [userAddress]
            });
            
            if (BigInt(wethBalance.toString()) < amountInWei) {
              return `错误：WETH余额不足。您当前有 ${formatUnits(BigInt(wethBalance.toString()), 18)} WETH，但需要 ${amount} WETH`;
            }
            
            // 检查授权状态
            const allowance = await walletProvider.readContract({
              ...wethContract,
              functionName: 'allowance',
              args: [userAddress, poolContract.address]
            });
            
            // 如果授权不足，先进行授权
            if (BigInt(allowance.toString()) < amountInWei) {
              // 发送授权交易
              const approveTxHash = await walletProvider.writeContract({
                ...wethContract,
                functionName: 'approve',
                args: [poolContract.address, amountInWei]
              });
              
              // 等待授权交易确认
              await walletProvider.waitForTransaction({ hash: approveTxHash });
            }
            
            // 发送supply交易
            const txHash = await walletProvider.writeContract({
              ...poolContract,
              functionName: 'supply',
              args: [
                wethContract.address,  // asset
                amountInWei,           // amount
                userAddress,           // onBehalfOf
                0                      // referralCode
              ]
            });
            
            return `已成功向Aave存入 ${amount} WETH。交易哈希: ${txHash}`;
          } catch (error) {
            return `向Aave存入WETH失败: ${error instanceof Error ? error.message : String(error)}`;
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
                2, // 使用可变利率
                0, // referralCode
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
                2, // 使用可变利率
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
            
            // 准备WETH合约
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
                },
                {
                  name: 'decimals',
                  type: 'function',
                  inputs: [],
                  outputs: [{ type: 'uint8' }],
                  stateMutability: 'view'
                }
              ],
            };
            
            // 获取Aave Pool地址
            const poolAddress = config.AAVE_POOL_ADDRESS.toLowerCase() as `0x${string}`;
            
            // 查询授权额度
            const allowance = await walletProvider.readContract({
              ...wethContract,
              functionName: 'allowance',
              args: [userAddress, poolAddress]
            });
            
            // 获取代币小数位数
            const decimals = await walletProvider.readContract({
              ...wethContract,
              functionName: 'decimals',
              args: []
            });
            
            // 转换为更易读的格式
            const formattedAllowance = formatUnits(BigInt(allowance.toString()), Number(decimals));
            
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