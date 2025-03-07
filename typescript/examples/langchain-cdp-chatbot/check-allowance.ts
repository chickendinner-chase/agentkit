import { CdpWalletProvider } from "@coinbase/agentkit";
import { aaveActionProvider } from "./providers";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

// 钱包数据文件
const WALLET_DATA_FILE = "wallet_data.txt";

/**
 * 查询WETH对Aave的授权状态
 */
async function checkAllowance() {
  console.log("=== 查询WETH授权状态 ===");
  
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
    
    // 初始化Aave提供者
    console.log("\n初始化Aave提供者:");
    const aaveProvider = aaveActionProvider();
    
    // 获取操作
    const actions = aaveProvider.getActions(walletProvider);
    
    // 查询WETH余额
    console.log("\n当前WETH余额:");
    const checkWethAction = actions.find(a => a.name === "check_weth_balance");
    if (checkWethAction) {
      const wethResult = await checkWethAction.invoke({ walletProvider });
      console.log(wethResult);
    }
    
    // 查询Aave授权状态
    console.log("\n当前Aave授权状态:");
    const checkAllowanceAction = actions.find(a => a.name === "check_weth_allowance");
    if (checkAllowanceAction) {
      const allowanceResult = await checkAllowanceAction.invoke({ walletProvider });
      console.log(allowanceResult);
    } else {
      console.log("未找到check_weth_allowance操作");
    }
    
    // 查询aToken余额
    console.log("\n当前aToken余额:");
    const checkAtokenAction = actions.find(a => a.name === "check_atoken_balance");
    if (checkAtokenAction) {
      const atokenResult = await checkAtokenAction.invoke({ walletProvider });
      console.log(atokenResult);
    }
    
  } catch (error) {
    console.error("查询失败:", error);
  }
}

// 运行查询
checkAllowance().catch(console.error); 