import {
  AgentKit,
  CdpWalletProvider,
  walletActionProvider,
  erc20ActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import { BaseMessage } from "@langchain/core/messages";
import { ActionProvider } from "@coinbase/agentkit";
import { z } from "zod";
import { ethers } from "ethers";
import { aaveActionProvider } from "./aaveActionProvider";

dotenv.config();

/**
 * 验证必要的环境变量
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  // 检查所需的变量
  const requiredVars = [
    "OPENAI_API_KEY", 
    "CDP_API_KEY_NAME", 
    "CDP_API_KEY_PRIVATE_KEY"
  ];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    throw new Error(`缺少环境变量: ${missingVars.join(", ")}。请添加到.env文件中。`);
  }
}

// 验证环境变量
validateEnvironment();

// 配置文件以持久化存储CDP钱包数据
const WALLET_DATA_FILE = "wallet_data.txt";

// Base Sepolia WETH 地址
const BASE_SEPOLIA_WETH = "0x4200000000000000000000000000000000000006";

// WETH ABI
const WETH_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function deposit() payable",
  "function withdraw(uint256 amount)",
];

// 自定义 WETH provider
function customWethProvider(): ActionProvider {
  const actions = [
    {
      name: "get_weth_balance",
      description: "获取 WETH 余额",
      schema: z.object({}),
      invoke: async (args: any) => {
        try {
          console.log("调用 get_weth_balance 方法");
          
          // 使用默认提供者和硬编码的钱包地址
          // 这是从wallet_data.txt中读取的同一个钱包地址
          const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
          const address = "0x15266fe88F98bE7415ee14873Cd64dd280d74AFa";
          console.log("查询地址:", address);
          
          // 创建WETH合约
          const wethContract = new ethers.Contract(
            BASE_SEPOLIA_WETH,
            [
              "function balanceOf(address) view returns (uint256)",
              "function decimals() view returns (uint8)"
            ],
            provider
          );
          
          // 读取WETH余额和小数位
          const balance = await wethContract.balanceOf(address);
          const decimals = await wethContract.decimals();
          
          console.log("WETH 余额:", balance.toString());
          console.log("WETH 小数位:", decimals.toString());
          
          // 格式化余额 - 显示更多小数位
          const formattedBalance = ethers.formatUnits(balance, decimals);
          // 转换为数字，然后格式化为固定的18位小数，确保显示所有小数位
          const fullPrecisionBalance = Number(formattedBalance).toFixed(18);
          
          // 格式化余额
          return `您的 WETH 余额为 ${fullPrecisionBalance} WETH`;
        } catch (error: any) {
          console.error("获取WETH余额错误:", error);
          return `获取WETH余额失败: ${error?.message || '未知错误'}`;
        }
      },
    },
    {
      name: "wrap_eth",
      description: "将 ETH 转换为 WETH",
      schema: z.object({
        amount: z.string().describe("要转换的 ETH 数量"),
      }),
      invoke: async (args: any) => {
        try {
          console.log("调用 wrap_eth 方法");
          console.log("参数:", JSON.stringify(args, null, 2));
          
          // LangChain工具可能以不同方式传递参数
          let amount;
          if (args.params && args.params.amount) {
            amount = args.params.amount;
          } else if (args.amount) {
            amount = args.amount;
          } else {
            console.log("无法获取amount参数");
            return "未提供转换金额。请输入要转换的ETH数量，例如：'将0.0001 ETH转换为WETH'";
          }
          
          console.log("转换金额:", amount);
          
          // 读取CDP钱包文件
          const walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf-8");
          const config = {
            apiKeyName: process.env.CDP_API_KEY_NAME,
            apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
            cdpWalletData: walletDataStr,
            networkId: process.env.NETWORK_ID || "base-sepolia",
          };
          
          // 配置CDP钱包
          const walletProvider = await CdpWalletProvider.configureWithWallet(config);
          const weiAmount = ethers.parseEther(amount);
          
          // 发送交易
          const tx = await walletProvider.sendTransaction({
            to: BASE_SEPOLIA_WETH as `0x${string}`,
            value: weiAmount,
            data: "0xd0e30db0", // deposit() 函数的签名
          });

          // 简化输出，避免类型问题
          return `交易已提交，${amount} ETH已转换为WETH，请查看区块链浏览器确认详情`;
        } catch (error: any) {
          console.error("转换ETH错误:", error);
          return `转换ETH失败: ${error?.message || '未知错误'}`;
        }
      },
    },
    {
      name: "unwrap_weth",
      description: "将 WETH 转换回 ETH",
      schema: z.object({
        amount: z.string().describe("要转换的 WETH 数量"),
      }),
      invoke: async (args: any) => {
        try {
          console.log("调用 unwrap_weth 方法");
          console.log("参数:", JSON.stringify(args, null, 2));
          
          // LangChain工具可能以不同方式传递参数
          let amount;
          if (args.params && args.params.amount) {
            amount = args.params.amount;
          } else if (args.amount) {
            amount = args.amount;
          } else {
            console.log("无法获取amount参数");
            return "未提供转换金额。请输入要转换的WETH数量，例如：'将0.0001 WETH转换为ETH'";
          }
          
          console.log("转换金额:", amount);
          
          // 读取CDP钱包文件
          const walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf-8");
          const config = {
            apiKeyName: process.env.CDP_API_KEY_NAME,
            apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
            cdpWalletData: walletDataStr,
            networkId: process.env.NETWORK_ID || "base-sepolia",
          };
          
          // 配置CDP钱包
          const walletProvider = await CdpWalletProvider.configureWithWallet(config);
          const weiAmount = ethers.parseEther(amount);
          
          // 发送交易
          const tx = await walletProvider.sendTransaction({
            to: BASE_SEPOLIA_WETH as `0x${string}`,
            data: `0x2e1a7d4d${weiAmount.toString(16).padStart(64, '0')}`, // withdraw(uint256) 函数的签名
          });

          // 简化输出，避免类型问题
          return `交易已提交，${amount} WETH已转换回ETH，请查看区块链浏览器确认详情`;
        } catch (error: any) {
          console.error("转换WETH错误:", error);
          return `转换WETH失败: ${error?.message || '未知错误'}`;
        }
      },
    },
  ];

  return {
    name: "weth",
    actions,
    actionProviders: [],
    getActions: () => actions,
    supportsNetwork: () => true,
  } as unknown as ActionProvider;
}

/**
 * 初始化Agent
 */
async function initializeAgent() {
  // 初始化LLM
  const llm = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || "gpt-4",
    temperature: 0,
  });

  // 初始化CDP钱包
  let walletDataStr: string | null = null;
  try {
    if (fs.existsSync(WALLET_DATA_FILE)) {
      walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf-8");
      console.log('已加载现有钱包数据');
    }
  } catch (error) {
    console.error('读取钱包数据失败:', error);
  }

  // 配置钱包
  const config = {
    apiKeyName: process.env.CDP_API_KEY_NAME,
    apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
    cdpWalletData: walletDataStr || undefined,
    networkId: process.env.NETWORK_ID || "base-sepolia",
  };

  const walletProvider = await CdpWalletProvider.configureWithWallet(config);

  // 如果是新钱包，保存钱包数据到文件
  if (!walletDataStr) {
    try {
      const walletData = await walletProvider.exportWallet();
      await fs.promises.writeFile(WALLET_DATA_FILE, JSON.stringify(walletData, null, 2));
      console.log('新钱包数据已保存到wallet_data.txt');
    } catch (error) {
      console.error('保存钱包数据失败:', error);
    }
  }

  // 初始化AgentKit
  const agentkit = await AgentKit.from({
    walletProvider,
    actionProviders: [
      walletActionProvider(),
      erc20ActionProvider(),
      customWethProvider(),
      
    ],
  });

  const tools = await getLangChainTools(agentkit);

  // 存储对话历史
  const memory = new MemorySaver();
  const agentConfig = { configurable: { thread_id: "CDP AgentKit Chatbot Simple Example" } };

  // 创建Agent
  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: memory,
    messageModifier: (messages: BaseMessage[]) => {
      const systemMessage = new SystemMessage(`你是一个帮助用户进行以太坊钱包操作的AI助手。你可以执行以下操作:

1. 查询ETH余额:
   - 使用walletActionProvider的get_balance方法查询原生ETH余额

2. WETH操作:
   - 使用customWethProvider进行WETH相关操作:
     * get_weth_balance: 查询WETH余额
     * wrap_eth: 将ETH转换为WETH 
     * unwrap_weth: 将WETH转换回ETH

3. Aave操作:
   - 使用aaveActionProvider进行Aave相关操作:
     * approve: 授权Aave合约使用WETH
     * check_allowance: 查询已授权的WETH额度
     
4. ERC20操作:
   - 使用erc20ActionProvider进行标准ERC20代币操作

请使用适当的命令帮助用户。记住我们在Base Sepolia测试网上运行。`);

      return [systemMessage, ...messages];
    },
  });

  return { agent, agentConfig, memory };
}

/**
 * 运行聊天模式
 */
async function runChatMode(agent: any, config: any) {
  console.log("欢迎使用简化版CDP聊天机器人!");
  console.log("========================================================");
  console.log("你可以查询ETH余额、WETH余额，以及执行WETH转换操作。");
  console.log("输入'exit'退出");
  console.log("========================================================");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  try {
    while (true) {
      const input = await question("\n> ");
      
      if (input.toLowerCase() === "exit") {
        console.log("再见!");
        break;
      }

      const response = await agent.invoke(
        {
          messages: [new HumanMessage(input)],
        },
        config,
      );

      const lastMessage = response.messages[response.messages.length - 1];
      console.log(`\n${lastMessage.content}`);
    }
  } catch (error) {
    console.error("错误:", error);
  } finally {
    rl.close();
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log("初始化中...");
    const { agent, agentConfig, memory } = await initializeAgent();
    
    await runChatMode(agent, agentConfig);
  } catch (error) {
    console.error("程序错误:", error);
  }
}

// 启动程序
main();
