import { ActionProvider } from "@coinbase/agentkit";
import { ethers } from "ethers";
import { z } from "zod";

// Aave V3 合约地址 (Base Sepolia)
const AAVE_POOL_ADDRESS = "0x6aCC8F7AF8EC783e129cc4412e3984414b953B01";
// aWETH代币地址 (Base Sepolia) - 需要替换为实际地址
const AWETH_TOKEN_ADDRESS = "0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f";
// Base Sepolia WETH地址
const WETH_ADDRESS = "0x4200000000000000000000000000000000000023";

// 简化版Aave操作提供者
export function aaveActionProvider() {
  const actions = [
    {
      name: "check_atoken_balance",
      description: "查询用户在Aave上的aToken余额",
      schema: z.object({}),
      invoke: async (args: any, { walletProvider }) => {
        try {
          console.log("调用check_atoken_balance方法");
          
          if (!walletProvider) {
            return "错误：钱包提供者未初始化";
          }
          
          const userAddress = walletProvider.getAddress();
          
          // aToken合约定义
          const aTokenContract = {
            address: AWETH_TOKEN_ADDRESS as `0x${string}`,
            abi: [
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
            ]
          };
          
          // 查询aToken余额
          const balance = await walletProvider.readContract({
            ...aTokenContract,
            functionName: "balanceOf",
            args: [userAddress]
          });
          
          // 查询代币小数位
          const decimals = await walletProvider.readContract({
            ...aTokenContract,
            functionName: "decimals",
            args: []
          });
          
          // 格式化余额显示
          const formattedBalance = ethers.formatUnits(balance, decimals);
          
          return `您在Aave上的aWETH余额为: ${formattedBalance} aWETH`;
        } catch (error) {
          console.error("查询aToken余额错误:", error);
          return `查询aToken余额失败: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
    },
    {
      name: "approve_weth_for_aave",
      description: "授权Aave合约使用WETH代币",
      schema: z.object({
        amount: z.string().describe("要授权的WETH数量")
      }),
      invoke: async (args: any, { walletProvider }) => {
        try {
          console.log("调用approve_weth_for_aave方法");
          console.log("参数:", args);
          
          const { params } = args;
          let amount = params.amount;
          
          // 尝试清理输入，移除可能的"weth"文本
          if (amount.includes("weth")) {
            amount = amount.replace(/weth/i, "").trim();
          }
          
          if (!walletProvider) {
            return "错误：钱包提供者未初始化";
          }
          
          console.log(`处理后的金额: ${amount}`);
          
          // 将数量转为Wei单位
          const weiAmount = ethers.parseEther(amount);
          
          // ERC20 approve函数接口
          const erc20Interface = new ethers.Interface([
            "function approve(address spender, uint256 amount) returns (bool)"
          ]);
          
          // 编码approve调用
          const data = erc20Interface.encodeFunctionData("approve", [
            AAVE_POOL_ADDRESS,
            weiAmount
          ]) as `0x${string}`;
          
          // 发送交易
          const txHash = await walletProvider.sendTransaction({
            to: WETH_ADDRESS as `0x${string}`,
            data: data,
            gas: 100000n
          });
          
          return `授权交易已发送！交易哈希: ${txHash}\n您已授权Aave合约使用 ${amount} WETH`;
        } catch (error) {
          console.error("授权错误:", error);
          return `授权操作失败: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
    },
    // 添加supply功能
    {
      name: "supply_weth",
      description: "向Aave存入WETH",
      schema: z.object({
        amount: z.string().describe("要存入的WETH数量")
      }),
      invoke: async (args: any, { walletProvider }) => {
        try {
          console.log("调用supply_weth方法");
          
          if (!walletProvider) {
            return "错误：钱包提供者未初始化";
          }
          
          const { params } = args;
          let amount = params.amount;
          
          // 清理输入
          if (amount.includes("weth")) {
            amount = amount.replace(/weth/i, "").trim();
          }
          
          // 将数量转为Wei单位
          const weiAmount = ethers.parseEther(amount);
          
          // Aave Pool接口 - supply函数
          const poolInterface = new ethers.Interface([
            "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external"
          ]);
          
          // 编码supply函数调用
          // 参数：asset, amount, onBehalfOf, referralCode
          const data = poolInterface.encodeFunctionData("supply", [
            WETH_ADDRESS,
            weiAmount,
            walletProvider.getAddress(),
            0 // referralCode
          ]) as `0x${string}`;
          
          // 发送交易
          const txHash = await walletProvider.sendTransaction({
            to: AAVE_POOL_ADDRESS as `0x${string}`,
            data: data,
            gas: 300000n
          });
          
          return `存款交易已发送！交易哈希: ${txHash}\n您已向Aave存入 ${amount} WETH`;
      } catch (error) {
          console.error("存款错误:", error);
          return `存款操作失败: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
    },
    // 添加withdraw功能
    {
      name: "withdraw_weth",
      description: "从Aave提取WETH",
      schema: z.object({
        amount: z.string().describe("要提取的WETH数量")
      }),
      invoke: async (args: any, { walletProvider }) => {
        try {
          console.log("调用withdraw_weth方法");
          
          if (!walletProvider) {
            return "错误：钱包提供者未初始化";
          }
          
          const { params } = args;
          let amount = params.amount;
          
          // 清理输入
          if (amount.includes("weth")) {
            amount = amount.replace(/weth/i, "").trim();
          }
          
          // 将数量转为Wei单位
          const weiAmount = ethers.parseEther(amount);
          
          // Aave Pool接口 - withdraw函数
          const poolInterface = new ethers.Interface([
            "function withdraw(address asset, uint256 amount, address to) external returns (uint256)"
          ]);
          
          // 编码withdraw函数调用
          // 参数：asset, amount, to
          const data = poolInterface.encodeFunctionData("withdraw", [
            WETH_ADDRESS,
            weiAmount,
            walletProvider.getAddress()
          ]) as `0x${string}`;
          
          // 发送交易
          const txHash = await walletProvider.sendTransaction({
            to: AAVE_POOL_ADDRESS as `0x${string}`,
            data: data,
            gas: 300000n
          });
          
          return `提款交易已发送！交易哈希: ${txHash}\n您已从Aave提取 ${amount} WETH`;
                } catch (error) {
          console.error("提款错误:", error);
          return `提款操作失败: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
    },
    // 添加borrow功能
    {
      name: "borrow_weth",
      description: "从Aave借出WETH",
      schema: z.object({
        amount: z.string().describe("要借出的WETH数量")
      }),
      invoke: async (args: any, { walletProvider }) => {
        try {
          console.log("调用borrow_weth方法");
          
          if (!walletProvider) {
            return "错误：钱包提供者未初始化";
          }
          
          const { params } = args;
          let amount = params.amount;
          
          // 清理输入
          if (amount.includes("weth")) {
            amount = amount.replace(/weth/i, "").trim();
          }
          
          // 将数量转为Wei单位
          const weiAmount = ethers.parseEther(amount);
          
          // Aave Pool接口 - borrow函数
          const poolInterface = new ethers.Interface([
            "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external"
          ]);
          
          // 编码borrow函数调用
          // 参数：asset, amount, interestRateMode(1=稳定,2=可变), referralCode, onBehalfOf
          const data = poolInterface.encodeFunctionData("borrow", [
            WETH_ADDRESS,
            weiAmount,
            2, // 使用可变利率
            0, // referralCode
            walletProvider.getAddress()
          ]) as `0x${string}`;
          
          // 发送交易
          const txHash = await walletProvider.sendTransaction({
            to: AAVE_POOL_ADDRESS as `0x${string}`,
            data: data,
            gas: 300000n
          });
          
          return `借款交易已发送！交易哈希: ${txHash}\n您已从Aave借出 ${amount} WETH`;
        } catch (error) {
          console.error("借款错误:", error);
          return `借款操作失败: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
    },
    // 添加repay功能
    {
      name: "repay_weth",
      description: "向Aave偿还WETH借款",
      schema: z.object({
        amount: z.string().describe("要偿还的WETH数量")
      }),
      invoke: async (args: any, { walletProvider }) => {
        try {
          console.log("调用repay_weth方法");
          
          if (!walletProvider) {
            return "错误：钱包提供者未初始化";
          }
          
          const { params } = args;
          let amount = params.amount;
          
          // 清理输入
          if (amount.includes("weth")) {
            amount = amount.replace(/weth/i, "").trim();
          }
          
          // 将数量转为Wei单位
          const weiAmount = ethers.parseEther(amount);
          
          // Aave Pool接口 - repay函数
          const poolInterface = new ethers.Interface([
            "function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) external returns (uint256)"
          ]);
          
          // 编码repay函数调用
          // 参数：asset, amount, rateMode(1=稳定,2=可变), onBehalfOf
          const data = poolInterface.encodeFunctionData("repay", [
            WETH_ADDRESS,
            weiAmount,
            2, // 使用可变利率
            walletProvider.getAddress()
          ]) as `0x${string}`;
          
          // 发送交易
          const txHash = await walletProvider.sendTransaction({
            to: AAVE_POOL_ADDRESS as `0x${string}`,
            data: data,
            gas: 300000n
          });
          
          return `还款交易已发送！交易哈希: ${txHash}\n您已向Aave偿还 ${amount} WETH`;
        } catch (error) {
          console.error("还款错误:", error);
          return `还款操作失败: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
    }
  ];

  return {
    name: "aave",
    actions,
    getActions: () => actions,
    supportsNetwork: () => true,
  } as unknown as ActionProvider;
} 