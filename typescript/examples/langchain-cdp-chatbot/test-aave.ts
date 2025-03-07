import { CdpWalletProvider } from "@coinbase/agentkit";
import { aaveActionProvider } from "./providers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { ethers } from "ethers";

dotenv.config();

// 钱包数据文件
const WALLET_DATA_FILE = "wallet_data.txt";

/**
 * 测试Aave操作提供者
 */
async function testAaveProvider() {
  console.log("=== 测试Aave操作提供者 ===");
  
  // 加载钱包数据
  let walletDataStr: string | null = null;
  try {
    if (fs.existsSync(WALLET_DATA_FILE)) {
      walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf-8");
      console.log('已加载现有钱包数据');
    }
  } catch (error) {
    console.error('读取钱包数据失败:', error);
    return;
  }

  if (!walletDataStr) {
    console.error('没有找到钱包数据');
    return;
  }

  try {
    // 配置钱包
    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
      cdpWalletData: walletDataStr,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    console.log("初始化钱包...");
    const walletProvider = await CdpWalletProvider.configureWithWallet(config);
    
    // 获取钱包地址
    const address = walletProvider.getAddress();
    console.log(`钱包地址: ${address}`);
    
    // 查询ETH余额
    console.log("\n查询ETH余额:");
    try {
      const ethBalance = await walletProvider.getBalance();
      const formattedEthBalance = ethers.formatEther(ethBalance.toString());
      console.log(`ETH余额: ${formattedEthBalance} ETH`);
    } catch (error) {
      console.error("查询ETH余额失败:", error);
    }
    
    // ========== 测试Aave操作提供者 ==========
    
    console.log("\n========== Aave操作提供者测试 ==========");
    
    // 初始化Aave提供者
    console.log("\n初始化Aave提供者:");
    const aaveProvider = aaveActionProvider();
    console.log(`Aave提供者名称: ${aaveProvider.name}`);
    
    // 获取并列出所有操作
    const actions = aaveProvider.getActions(walletProvider);
    console.log(`Aave操作数量: ${actions.length}`);
    
    console.log("\n可用的Aave操作:");
    actions.forEach(action => {
      console.log(`- ${action.name}: ${action.description}`);
    });
    
    // 测试check_weth_balance操作
    console.log("\n测试check_weth_balance操作:");
    try {
      const checkWethAction = actions.find(a => a.name === "check_weth_balance");
      if (checkWethAction) {
        const result = await checkWethAction.invoke({ walletProvider });
        console.log(result);
      } else {
        console.log("未找到check_weth_balance操作");
      }
    } catch (error) {
      console.error("执行check_weth_balance失败:", error);
    }
    
    // 测试check_atoken_balance操作
    console.log("\n测试check_atoken_balance操作:");
    try {
      const checkBalanceAction = actions.find(a => a.name === "check_atoken_balance");
      if (checkBalanceAction) {
        const result = await checkBalanceAction.invoke({ walletProvider });
        console.log(result);
      } else {
        console.log("未找到check_atoken_balance操作");
      }
    } catch (error) {
      console.error("执行check_atoken_balance失败:", error);
    }
    
    // 测试check_weth_allowance操作
    console.log("\n测试check_weth_allowance操作:");
    try {
      const checkAllowanceAction = actions.find(a => a.name === "check_weth_allowance");
      if (checkAllowanceAction) {
        const result = await checkAllowanceAction.invoke({ walletProvider });
        console.log(result);
      } else {
        console.log("未找到check_weth_allowance操作");
      }
    } catch (error) {
      console.error("执行check_weth_allowance失败:", error);
    }
    
    // 测试网络兼容性
    console.log("\n测试网络兼容性:");
    
    // Base Sepolia (应该支持)
    const baseSepolia = {
      networkId: "base-sepolia",
      chainId: "0x14a34",
      protocolFamily: "evm"
    };
    console.log(`是否支持Base Sepolia: ${aaveProvider.supportsNetwork(baseSepolia)}`);
    
    // Solana (不应该支持)
    const solana = {
      networkId: "solana-devnet",
      chainId: "103",
      protocolFamily: "solana"
    };
    console.log(`是否支持Solana: ${aaveProvider.supportsNetwork(solana)}`);
    
    // ==========================================
    // ===== 真实交易操作 ============
    // ==========================================
    
    /*
    // =============================================================
    // ===== 1. 测试approve_weth_for_aave操作 (授权Aave使用WETH) =====
    // =============================================================
    
    console.log("\n测试approve_weth_for_aave操作 (将执行交易):");
    try {
      const approveAction = actions.find(a => a.name === "approve_weth_for_aave");
      if (approveAction) {
        // 定义要授权的WETH数量 - 建议使用小额
        // 0.0002 WETH是一个合理的测试金额 (改为之前的两倍，便于验证)
        const approveAmount = "0.0002";
        
        console.log(`准备授权Aave使用 ${approveAmount} WETH...`);
        
        const result = await approveAction.invoke({ 
          walletProvider,
          params: { amount: approveAmount } 
        });
        
        console.log(result);
        
        // 等待10秒，确保交易被确认
        console.log("等待交易确认...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 交易确认后再次查询授权状态
        console.log("\n授权后再次查询WETH授权状态:");
        const checkAllowanceAction = actions.find(a => a.name === "check_weth_allowance");
        if (checkAllowanceAction) {
          const allowanceResult = await checkAllowanceAction.invoke({ walletProvider });
          console.log(allowanceResult);
        } else {
          console.log("未找到check_weth_allowance操作");
        }
      } else {
        console.log("未找到approve_weth_for_aave操作");
      }
    } catch (error) {
      console.error("执行approve_weth_for_aave失败:", error);
    }
    */
    
    // =============================================================
    // ===== 2. 测试supply_weth操作 (向Aave存入WETH) ===============
    // =============================================================
    
    console.log("\n测试supply_weth操作 (将执行交易):");
    try {
      const supplyAction = actions.find(a => a.name === "supply_weth");
      if (supplyAction) {
        // 定义要存入的WETH数量 - 使用实际可用余额
        const supplyAmount = "0.0001"; // 修改为小于实际余额(0.0001001)的金额
        
        console.log(`准备向Aave存入 ${supplyAmount} WETH...`);
        
        const result = await supplyAction.invoke({ 
          walletProvider,
          params: { amount: supplyAmount } 
        });
        
        console.log(result);
        
        // 等待10秒，确保交易被确认
        console.log("等待交易确认...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 存款后再次查询aToken余额，看是否增加
        console.log("\n存款后查询aToken余额:");
        const checkBalanceAction = actions.find(a => a.name === "check_atoken_balance");
        if (checkBalanceAction) {
          const balanceResult = await checkBalanceAction.invoke({ walletProvider });
          console.log(balanceResult);
        }
      } else {
        console.log("未找到supply_weth操作");
      }
    } catch (error) {
      console.error("执行supply_weth失败:", error);
    }
    
    console.log("\n测试完成！Aave操作提供者功能正常。");
  } catch (error) {
    console.error("测试失败:", error);
  }
}

// 运行测试
testAaveProvider().catch(console.error); 