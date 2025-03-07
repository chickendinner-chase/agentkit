import { CdpWalletProvider } from "@coinbase/agentkit";
import { aaveActionProvider } from "./providers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { formatEther } from "viem";

dotenv.config();

// 钱包数据文件
const WALLET_DATA_FILE = "wallet_data.txt";

/**
 * 当前测试阶段
 */
let currentTestStage = "初始化";

/**
 * 显示当前测试阶段
 */
function showTestStage(stage: string) {
  currentTestStage = stage;
  console.log("\n===========================================================");
  console.log(`当前测试阶段: ${stage}`);
  console.log("===========================================================\n");
}

/**
 * 测试Aave操作提供者
 */
async function testAaveProvider() {
  showTestStage("开始测试 Aave 操作提供者");
  
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

    showTestStage("初始化钱包");
    const walletProvider = await CdpWalletProvider.configureWithWallet(config);
    
    // 获取钱包地址
    const address = walletProvider.getAddress();
    console.log(`钱包地址: ${address}`);
    
    // 查询ETH余额
    console.log("\n查询ETH余额:");
    try {
      const ethBalance = await walletProvider.getBalance();
      const formattedEthBalance = formatEther(ethBalance as bigint);
      console.log(`ETH余额: ${formattedEthBalance} ETH`);
    } catch (error) {
      console.error("查询ETH余额失败:", error);
    }
    
    // 初始化Aave提供者
    showTestStage("初始化 Aave 提供者");
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
    showTestStage("测试 WETH 余额查询");
    try {
      const checkWethAction = actions.find(a => a.name === "check_weth_balance");
      if (checkWethAction) {
        const result = await checkWethAction.invoke({ walletProvider: walletProvider });
        console.log(result);
      } else {
        console.log("未找到check_weth_balance操作");
      }
    } catch (error) {
      console.error("执行check_weth_balance失败:", error);
    }
    
    // 测试check_debt_balance操作
    showTestStage("测试 债务代币 余额查询");
    try {
      const checkDebtAction = actions.find(a => a.name === "check_debt_balance");
      if (checkDebtAction) {
        const result = await checkDebtAction.invoke({ walletProvider: walletProvider });
        console.log(result);
      } else {
        console.log("未找到check_debt_balance操作");
      }
    } catch (error) {
      console.error("执行check_debt_balance失败:", error);
    }
    
    // 测试check_weth_allowance操作
    showTestStage("测试 WETH 授权查询");
    try {
      const checkAllowanceAction = actions.find(a => a.name === "check_weth_allowance");
      if (checkAllowanceAction) {
        const result = await checkAllowanceAction.invoke({ walletProvider: walletProvider });
        console.log(result);
      } else {
        console.log("未找到check_weth_allowance操作");
      }
    } catch (error) {
      console.error("执行check_weth_allowance失败:", error);
    }
    
    // ==========================================
    // ===== 真实交易操作 ============
    // ==========================================
    
    // =============================================================
    // ===== 1. 测试approve_weth_for_aave操作 (授权Aave使用WETH) =====
    // =============================================================
    
    showTestStage("测试操作: 授权 WETH (approve_weth_for_aave)");
    try {
      const approveAction = actions.find(a => a.name === "approve_weth_for_aave");
      if (approveAction) {
        // 定义要授权的WETH数量
        const approveAmount = "0.001"; // 增加授权金额以确保足够偿还
        
        console.log(`准备授权Aave使用 ${approveAmount} WETH...`);
        
        const result = await approveAction.invoke({ 
          walletProvider: walletProvider,
          amount: approveAmount
        });
        
        console.log(result);
        
        // 等待10秒，确保交易被确认
        console.log("等待交易确认...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 交易确认后再次查询授权状态
        console.log("\n授权后再次查询WETH授权状态:");
        const checkAllowanceAction = actions.find(a => a.name === "check_weth_allowance");
        if (checkAllowanceAction) {
          const allowanceResult = await checkAllowanceAction.invoke({ walletProvider: walletProvider });
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
    
    // =============================================================
    // ===== 5. 测试repay_weth操作 (偿还Aave借出的WETH) ===========
    // =============================================================
    
    showTestStage("测试操作: 偿还 WETH (repay_weth)");
    try {
      const repayAction = actions.find(a => a.name === "repay_weth");
      if (repayAction) {
        // 定义要偿还的WETH数量 - 可以尝试偿还所有债务
        const repayAmount = "0.000002";
        
        console.log(`准备偿还 ${repayAmount} WETH到Aave...`);
        
        const result = await repayAction.invoke({ 
          walletProvider: walletProvider,
          params: { amount: repayAmount }
        });
        
        console.log(result);
        
        // 等待10秒，确保交易被确认
        console.log("等待交易确认...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 偿还后查询WETH余额
        console.log("\n偿还后查询WETH余额:");
        const checkWethAction = actions.find(a => a.name === "check_weth_balance");
        if (checkWethAction) {
          const wethResult = await checkWethAction.invoke({ walletProvider: walletProvider });
          console.log(wethResult);
        }
        
        // 偿还后查询债务代币余额
        console.log("\n偿还后查询债务代币余额:");
        const checkDebtAction = actions.find(a => a.name === "check_debt_balance");
        if (checkDebtAction) {
          const debtResult = await checkDebtAction.invoke({ walletProvider: walletProvider });
          console.log(debtResult);
        }
      } else {
        console.log("未找到repay_weth操作");
      }
    } catch (error) {
      console.error("执行repay_weth失败:", error);
    }
    
    // =============================================================
    // ===== 6. 测试repay_all_weth操作 (全部偿还Aave借款) ==========
    // =============================================================
    
    showTestStage("测试操作: 全额偿还 WETH (repay_all_weth)");
    try {
      const repayAllAction = actions.find(a => a.name === "repay_all_weth");
      if (repayAllAction) {
        console.log(`准备全额偿还WETH到Aave...`);
        
        const result = await repayAllAction.invoke({ 
          walletProvider: walletProvider
        });
        
        console.log(result);
        
        // 等待10秒，确保交易被确认
        console.log("等待交易确认...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 偿还后查询WETH余额
        console.log("\n全额偿还后查询WETH余额:");
        const checkWethAction = actions.find(a => a.name === "check_weth_balance");
        if (checkWethAction) {
          const wethResult = await checkWethAction.invoke({ walletProvider: walletProvider });
          console.log(wethResult);
        }
        
        // 偿还后查询债务代币余额
        console.log("\n全额偿还后查询债务代币余额:");
        const checkDebtAction = actions.find(a => a.name === "check_debt_balance");
        if (checkDebtAction) {
          const debtResult = await checkDebtAction.invoke({ walletProvider: walletProvider });
          console.log(debtResult);
        }
      } else {
        console.log("未找到repay_all_weth操作");
      }
    } catch (error) {
      console.error("执行repay_all_weth失败:", error);
    }
    
    // 只保留一次测试完成的显示
    console.log("\n===========================================================");
    console.log("当前测试阶段: 测试完成");
    console.log("===========================================================\n");
    console.log("Aave操作提供者功能测试已完成！");
  } catch (error) {
    console.error("测试失败:", error);
  }
}

// 运行测试
testAaveProvider().catch(console.error); 