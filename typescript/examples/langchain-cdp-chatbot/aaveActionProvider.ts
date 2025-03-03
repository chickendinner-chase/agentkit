import { ActionProvider, Action } from "@coinbase/agentkit";
import { ethers } from "ethers";
import { z } from "zod";
import { 
  getAaveContract, 
  InterestRateMode, 
  IAavePool,
  AAVE_ACTIONS,
  getUserReservesData,
  getReservesData,
  getAavePoolAddress,
  getERC20Contract,
  ERC20_ABI,
  getEthAndWethBalance
} from "./utils/aaveContract";

interface AaveActionProviderConfig {
  tokenAddress: string;
}

interface ActionContext {
  wallet: {
    provider: string;
    privateKey: string;
    address: string;
  };
}

const amountSchema = z.object({
  amount: z.string().describe("金额"),
});

const interestRateSchema = z.object({
  amount: z.string().describe("金额"),
  interestRateMode: z.enum(["STABLE", "VARIABLE"]).describe("利率模式：STABLE（稳定利率）或VARIABLE（浮动利率）"),
});

const emptySchema = z.object({});

// 验证用户状态
async function validateUserState(
  provider: ethers.JsonRpcProvider, 
  userAddress: string, 
  action: string, 
  params: any,
  tokenAddress: string
) {
  const { userReservesData } = await getUserReservesData(provider, userAddress);
  const { reservesData } = await getReservesData(provider);
  
  const userReserve = userReservesData.find(r => r.underlyingAsset.toLowerCase() === tokenAddress.toLowerCase());
  const reserve = reservesData.find(r => r.underlyingAsset.toLowerCase() === tokenAddress.toLowerCase());

  if (!reserve) {
    throw new Error(`资产 ${tokenAddress} 不在Aave池中`);
  }

  switch (action) {
    case "supply": {
      if (!reserve.isActive) {
        throw new Error("该资产当前不可用");
      }
      if (reserve.isFrozen) {
        throw new Error("该资产已被冻结");
      }
      break;
    }

    case "withdraw": {
      if (!userReserve) {
        throw new Error("您没有该资产的存款");
      }
      if (userReserve.scaledATokenBalance <= 0n) {
        throw new Error("您的存款余额不足");
      }
      if (userReserve.usageAsCollateralEnabledOnUser && userReserve.healthFactor <= 1n) {
        throw new Error("您的健康因子过低，无法提款");
      }
      break;
    }

    case "borrow": {
      if (!reserve.borrowingEnabled) {
        throw new Error("该资产当前不可借款");
      }
      if (reserve.isFrozen) {
        throw new Error("该资产已被冻结");
      }
      if (reserve.availableLiquidity <= 0n) {
        throw new Error("该资产当前没有可用流动性");
      }
      if (userReserve && userReserve.healthFactor <= 1n) {
        throw new Error("您的健康因子过低，无法借款");
      }
      break;
    }

    case "repay": {
      if (!userReserve) {
        throw new Error("您没有该资产的借款");
      }
      if (userReserve.scaledVariableDebt <= 0n) {
        throw new Error("您的借款余额不足");
      }
      break;
    }
  }
}

export function aaveActionProvider(config: AaveActionProviderConfig): ActionProvider {
  const actions: Action<z.ZodType>[] = AAVE_ACTIONS.map(action => {
    let schema: z.ZodType;
    switch (action.name) {
      case "approve":
      case "supply":
      case "withdraw":
        schema = amountSchema;
        break;
      case "borrow":
      case "repay":
        schema = interestRateSchema;
        break;
      case "getUserAccountData":
        schema = emptySchema;
        break;
      default:
        throw new Error(`未知的动作: ${action.name}`);
    }

    return {
      name: action.name,
      description: action.description,
      schema,
      invoke: async (args: any) => {
        try {
          const { params, context } = args;
          
          // 检查 context 和 wallet
          if (!context || !context.wallet) {
            throw new Error("钱包未连接或未初始化。请先检查钱包状态。");
          }

          const { wallet } = context;
          if (!wallet.provider || !wallet.privateKey || !wallet.address) {
            throw new Error("钱包配置不完整。请确保钱包已正确初始化。");
          }

          const provider = new ethers.JsonRpcProvider(wallet.provider);
          const signer = new ethers.Wallet(wallet.privateKey, provider);

          // 在执行操作前验证用户状态
          if (action.name !== "approve" && action.name !== "getUserAccountData") {
            await validateUserState(provider, wallet.address, action.name, params, config.tokenAddress);
          }

          switch (action.name) {
            case "approve": {
              try {
                const tokenContract = new ethers.Contract(
                  config.tokenAddress,
                  ERC20_ABI,
                  signer
                );

                // 获取 Aave Pool 地址
                const poolAddress = await getAavePoolAddress(provider);
                console.log(`Aave Pool address: ${poolAddress}`);

                // 检查当前授权额度
                const currentAllowance = await tokenContract.allowance(wallet.address, poolAddress);
                console.log(`Current allowance: ${ethers.formatUnits(currentAllowance, 18)}`);

                const amount = params.amount === "MAX" 
                  ? ethers.MaxUint256 
                  : ethers.parseUnits(params.amount, 18);

                console.log(`Approving amount: ${ethers.formatUnits(amount, 18)}`);

                const tx = await tokenContract.approve(poolAddress, amount);
                console.log(`Approval transaction sent: ${tx.hash}`);
                
                await tx.wait();
                console.log(`Approval transaction confirmed: ${tx.hash}`);

                return `成功授权Aave Pool使用${params.amount}个代币，交易哈希：${tx.hash}`;
              } catch (error) {
                console.error("Approval error details:", error);
                throw new Error(`授权失败: ${error instanceof Error ? error.message : '未知错误'}`);
              }
            }

            case "supply": {
              const poolContract = await getAaveContract(provider) as unknown as {
                connect: (signer: ethers.Wallet) => {
                  supply: (asset: string, amount: bigint, onBehalfOf: string, referralCode: number) => Promise<ethers.ContractTransactionResponse>;
                };
              };
              const amount = ethers.parseUnits(params.amount, 18);

              const tx = await poolContract.connect(signer).supply(
                config.tokenAddress,
                amount,
                wallet.address,
                0
              );
              await tx.wait();

              return `成功存入${params.amount}个代币到Aave Pool，交易哈希：${tx.hash}`;
            }

            case "withdraw": {
              const poolContract = await getAaveContract(provider) as unknown as {
                connect: (signer: ethers.Wallet) => {
                  withdraw: (asset: string, amount: bigint, to: string) => Promise<ethers.ContractTransactionResponse>;
                };
              };
              const amount = ethers.parseUnits(params.amount, 18);

              const tx = await poolContract.connect(signer).withdraw(
                config.tokenAddress,
                amount,
                wallet.address
              );
              await tx.wait();

              return `成功从Aave Pool提取${params.amount}个代币，交易哈希：${tx.hash}`;
            }

            case "borrow": {
              const poolContract = await getAaveContract(provider) as unknown as {
                connect: (signer: ethers.Wallet) => {
                  borrow: (asset: string, amount: bigint, interestRateMode: number, referralCode: number, onBehalfOf: string) => Promise<ethers.ContractTransactionResponse>;
                };
              };
              const amount = ethers.parseUnits(params.amount, 18);
              const interestRateMode = params.interestRateMode === "STABLE" 
                ? InterestRateMode.STABLE 
                : InterestRateMode.VARIABLE;

              const tx = await poolContract.connect(signer).borrow(
                config.tokenAddress,
                amount,
                interestRateMode,
                0,
                wallet.address
              );
              await tx.wait();

              return `成功从Aave Pool借款${params.amount}个代币，交易哈希：${tx.hash}`;
            }

            case "repay": {
              const poolContract = await getAaveContract(provider) as unknown as {
                connect: (signer: ethers.Wallet) => {
                  repay: (asset: string, amount: bigint, interestRateMode: number, onBehalfOf: string) => Promise<ethers.ContractTransactionResponse>;
                };
              };
              const amount = ethers.parseUnits(params.amount, 18);
              const interestRateMode = params.interestRateMode === "STABLE" 
                ? InterestRateMode.STABLE 
                : InterestRateMode.VARIABLE;

              const tx = await poolContract.connect(signer).repay(
                config.tokenAddress,
                amount,
                interestRateMode,
                wallet.address
              );
              await tx.wait();

              return `成功归还${params.amount}个代币到Aave Pool，交易哈希：${tx.hash}`;
            }

            case "getUserAccountData": {
              const poolContract = await getAaveContract(provider) as unknown as {
                getUserAccountData: (userAddress: string) => Promise<{
                  totalCollateralBase: bigint;
                  totalDebtBase: bigint;
                  availableBorrowsBase: bigint;
                  currentLiquidationThreshold: bigint;
                  ltv: bigint;
                  healthFactor: bigint;
                }>;
              };

              const accountData = await poolContract.getUserAccountData(wallet.address);
              return `您的Aave账户数据：
总抵押品：${ethers.formatUnits(accountData.totalCollateralBase, 8)} USD
总债务：${ethers.formatUnits(accountData.totalDebtBase, 8)} USD
可借额度：${ethers.formatUnits(accountData.availableBorrowsBase, 8)} USD
清算阈值：${ethers.formatUnits(accountData.currentLiquidationThreshold, 4)}%
贷款价值比：${ethers.formatUnits(accountData.ltv, 4)}%
健康因子：${ethers.formatUnits(accountData.healthFactor, 18)}`;
            }

            default:
              throw new Error(`未知的动作: ${action.name}`);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          throw new Error(`${action.name}失败: ${errorMessage}`);
        }
      },
    };
  });

  return {
    name: "aave",
    actions,
    actionProviders: [],
    getActions: () => actions,
    supportsNetwork: () => true,
  } as unknown as ActionProvider;
} 