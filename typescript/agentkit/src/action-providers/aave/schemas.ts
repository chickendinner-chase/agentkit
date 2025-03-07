import { z } from "zod";

// 余额查询模式
export const BalanceSchema = z.object({});

// 授权模式
export const ApproveSchema = z.object({
  amount: z.string().describe("要授权的WETH数量"),
});

// 存款模式
export const SupplySchema = z.object({
  amount: z.string().describe("要存入的WETH数量"),
});

// 提款模式
export const WithdrawSchema = z.object({
  amount: z.string().describe("要提取的WETH数量"),
});

// 借款模式
export const BorrowSchema = z.object({
  amount: z.string().describe("要借出的WETH数量"),
});

// 还款模式
export const RepaySchema = z.object({
  amount: z.string().describe("要偿还的WETH数量"),
}); 