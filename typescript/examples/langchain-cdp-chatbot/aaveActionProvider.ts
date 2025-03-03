import { ActionProvider, Action } from "@coinbase/agentkit";
import { ethers } from "ethers";
import { z } from "zod";
import { 
  getAavePoolAddress,
  getERC20Contract,
  ERC20_ABI,
  getEthAndWethBalance,
  BASE_SEPOLIA_WETH_ADDRESS
} from "./utils/aaveContract";

interface AaveActionProviderConfig {
  tokenAddress: string;
}

// Schema 定义
const amountSchema = z.object({
  amount: z.string().describe("金额"),
});

const emptySchema = z.object({});

// 精简的Aave动作列表
export const AAVE_ACTIONS = [
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
    name: "checkBalance",
    description: "检查钱包中的 ETH 和 WETH 余额",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "checkWeth",
    description: "检查用户的WETH余额",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "checkAllowance",
    description: "检查已授权Aave Pool使用的代币数量",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    }
  }
];

/**
 * Aave操作提供者类
 */
export class AaveActionProviderClass implements ActionProvider {
  private tokenAddress: string;
  private actions: Action<z.ZodType>[];
  
  // 添加必需的属性
  public actionProviders: ActionProvider[] = [];
  public supportsNetwork(network: any): boolean { return true; }
  
  constructor(config: AaveActionProviderConfig) {
    // 确保使用正确的WETH地址
    this.tokenAddress = config.tokenAddress || BASE_SEPOLIA_WETH_ADDRESS;
    
    // 创建操作列表
    this.actions = [
      ...AAVE_ACTIONS.map(action => {
        let schema: z.ZodType;
        switch (action.name) {
          case "approve":
            schema = amountSchema;
            break;
          case "checkBalance":
          case "checkAllowance":
          case "checkWeth":
            schema = emptySchema;
            break;
          default:
            throw new Error(`未知的动作: ${action.name}`);
        }
        
        return {
          name: action.name,
          description: action.description,
          schema,
          invoke: this.createActionInvoke(action.name)
        };
      })
    ];
  }
  
  // 获取当前操作提供者名称
  get name(): string {
    return "aave";
  }
  
  // 获取操作列表
  getActions(): Action<z.ZodType>[] {
    return this.actions;
  }
  
  // 创建操作的invoke函数
  private createActionInvoke(actionName: string): (args: any) => Promise<string> {
    return async (args: any): Promise<string> => {
      try {
        const { params, context } = args;
        
        // 初始化provider和用户地址
        let provider: ethers.JsonRpcProvider;
        let address: string;
        
        // 如果有钱包提供者，就使用它
        if (context && context.walletProvider) {
          const walletProvider = context.walletProvider;
          provider = new ethers.JsonRpcProvider(walletProvider.provider);
          address = walletProvider.getAddress();
        } else {
          // 否则使用默认提供者和地址
          provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://sepolia.base.org");
          address = params.address || "0x0000000000000000000000000000000000000000";
        }
        
        // 检查操作是否需要钱包提供者
        const requiresWalletProvider = ["approve"].includes(actionName);
        if (requiresWalletProvider && (!context || !context.walletProvider)) {
          return `${actionName}操作需要连接钱包才能执行`;
        }

        switch (actionName) {
          case "approve": {
            if (!context || !context.walletProvider) throw new Error("授权操作需要连接钱包");
            
            try {
              const walletProvider = context.walletProvider;
              
              // 获取Aave池地址
              const poolAddress = await getAavePoolAddress(provider).catch(() => {
                return "0x981bE4db78f96F76CC0082F744f9BaE3a4Dd15d7"; // 备用地址
              });
              
              // 检查当前授权
              const tokenContract = {
                address: this.tokenAddress as `0x${string}`,
                abi: [
                  "function allowance(address owner, address spender) view returns (uint256)",
                  "function approve(address spender, uint256 amount) returns (bool)"
                ]
              };
              
              // 读取当前授权额度
              const currentAllowance = await walletProvider.readContract({
                ...tokenContract,
                functionName: "allowance",
                args: [address, poolAddress]
              });
              
              // 计算授权金额
              const amount = params.amount === "MAX" 
                ? ethers.MaxUint256 
                : ethers.parseUnits(params.amount, 18);
              
              // 使用CDP的walletProvider发送approve交易
              const tx = await walletProvider.writeContract({
                ...tokenContract,
                functionName: "approve",
                args: [poolAddress, amount]
              });
              
              return `成功授权Aave Pool使用${params.amount}个代币，交易哈希：${tx.hash}`;
            } catch (error) {
              console.error("授权错误:", error);
              return `授权失败: ${error instanceof Error ? error.message : '未知错误'}`;
            }
          }
          
          case "checkAllowance": {
            try {
              const tokenContract = new ethers.Contract(
                this.tokenAddress,
                ERC20_ABI,
                provider
              );
              
              // 硬编码Base Sepolia上的Aave池地址 (根据测试网络情况可能需要更新)
              // 这是一个示例地址，实际使用时需要替换为正确的地址
              const poolAddress = await getAavePoolAddress(provider).catch(() => {
                return "0x981bE4db78f96F76CC0082F744f9BaE3a4Dd15d7"; // 示例地址
              });
              
              const currentAllowance = await tokenContract.allowance(address, poolAddress);
              const formattedAllowance = ethers.formatUnits(currentAllowance, 18);
              
              return `您已授权Aave Pool使用${formattedAllowance} WETH`;
            } catch (error) {
              console.error("检查授权额度错误:", error);
              return `检查授权额度失败: ${error instanceof Error ? error.message : '未知错误'}`;
            }
          }
          
          case "checkWeth": {
            try {
              // 创建WETH合约实例
              const wethContract = getERC20Contract(provider, this.tokenAddress);
              const balance = await wethContract.balanceOf(address);
              
              // 格式化余额，显示完整精度
              const formattedBalance = ethers.formatUnits(balance, 18);
              
              return `您的WETH余额为 ${formattedBalance} WETH`;
            } catch (error) {
              console.error("获取WETH余额错误:", error);
              return `获取WETH余额失败: ${error instanceof Error ? error.message : '未知错误'}`;
            }
          }
          
          case "checkBalance": {
            try {
              const walletBalance = await getEthAndWethBalance(provider, address).catch(() => {
                return { ethBalance: "无法获取", wethBalance: "无法获取" };
              });
            
              return `您的钱包余额：
- ETH: ${walletBalance.ethBalance} ETH
- WETH: ${walletBalance.wethBalance} WETH`;
            } catch (error) {
              console.error("获取余额错误:", error);
              return `获取余额失败: ${error instanceof Error ? error.message : '未知错误'}，请稍后再试`;
            }
          }
          
          // 确保所有case都有返回值，并且返回类型为string
          default:
            return `未知的动作: ${actionName}`;
        }
      } catch (error) {
        console.error("操作失败:", error);
        return `操作失败: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    };
  }
}

// 导出aaveActionProvider函数，以便chatbot.ts可以正确导入
export function aaveActionProvider(config: AaveActionProviderConfig): ActionProvider {
  return new AaveActionProviderClass(config);
}