import { Action, ActionProvider } from "@coinbase/agentkit";
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
import { Network } from "../../network";
import { WalletProvider } from "../../wallet-providers";

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
              address: config.AWETH_TOKEN_ADDRESS as `0x${string}`,
              abi: ABI.ATOKEN_ABI,
            };
            
            // 查询aToken余额
            const balance = await walletProvider.readContract({
              ...aTokenContract,
              functionName: "balanceOf",
              args: [userAddress],
            });
            
            // 查询代币小数位
            const decimals = await walletProvider.readContract({
              ...aTokenContract,
              functionName: "decimals",
              args: [],
            });
            
            // 格式化余额显示
            const formattedBalance = formatUnits(balance as bigint, Number(decimals));
            
            return `您在Aave上的aWETH余额为: ${formattedBalance} aWETH`;
          } catch (error) {
            return `查询aToken余额失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "approve_weth_for_aave",
        description: "授权Aave合约使用WETH代币",
        schema: ApproveSchema,
        invoke: async (args: z.infer<typeof ApproveSchema>) => {
          const walletProvider = (args as any).walletProvider;
          const params = (args as any).params;
          try {
            let amount = params.amount;
            
            // 尝试清理输入，移除可能的"weth"文本
            if (amount.includes("weth")) {
              amount = amount.replace(/weth/i, "").trim();
            }
            
            if (!walletProvider) {
              return "错误：钱包提供者未初始化";
            }
            
            const networkId = walletProvider.getNetworkId?.() || DEFAULT_NETWORK_ID;
            const config = NETWORK_CONFIG[networkId as keyof typeof NETWORK_CONFIG] || NETWORK_CONFIG[DEFAULT_NETWORK_ID];
            
            // 将数量转为Wei单位
            const weiAmount = parseUnits(amount, 18);
            
            // ERC20 approve函数接口
            const interfaceData = {
              abi: ABI.ERC20_APPROVE_ABI,
              functionName: "approve",
              args: [config.AAVE_POOL_ADDRESS, weiAmount],
            };
            
            // 编码approve调用
            const data = walletProvider.encodeDeployData 
              ? walletProvider.encodeDeployData(interfaceData) as `0x${string}`
              : "0x" as `0x${string}`;
            
            // 发送交易
            const txHash = await walletProvider.sendTransaction({
              to: config.WETH_ADDRESS as `0x${string}`,
              data,
              gas: GAS_LIMITS.APPROVE,
            });
            
            return `授权交易已发送！交易哈希: ${txHash}\n您已授权Aave合约使用 ${amount} WETH`;
          } catch (error) {
            return `授权操作失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      },
      
      {
        name: "supply_weth",
        description: "向Aave存入WETH",
        schema: SupplySchema,
        invoke: async (args: z.infer<typeof SupplySchema>) => {
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
            
            // Aave Pool接口 - supply函数
            const interfaceData = {
              abi: ABI.POOL_ABI.SUPPLY,
              functionName: "supply",
              args: [
                config.WETH_ADDRESS,
                weiAmount,
                walletProvider.getAddress(),
                0 // referralCode
              ],
            };
            
            // 编码supply函数调用
            const data = walletProvider.encodeDeployData 
              ? walletProvider.encodeDeployData(interfaceData) as `0x${string}`
              : "0x" as `0x${string}`;
            
            // 发送交易
            const txHash = await walletProvider.sendTransaction({
              to: config.AAVE_POOL_ADDRESS as `0x${string}`,
              data,
              gas: GAS_LIMITS.SUPPLY,
            });
            
            return `存款交易已发送！交易哈希: ${txHash}\n您已向Aave存入 ${amount} WETH`;
          } catch (error) {
            return `存款操作失败: ${error instanceof Error ? error.message : String(error)}`;
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