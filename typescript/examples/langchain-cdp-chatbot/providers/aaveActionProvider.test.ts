import { describe, it, expect, jest } from '@jest/globals';
import { aaveActionProvider } from './aaveActionProvider';
import { Network } from '@coinbase/agentkit';

describe('aaveActionProvider', () => {
  const provider = aaveActionProvider();

  it('should have correct name', () => {
    expect(provider.name).toBe('aave');
  });

  it('should support EVM networks', () => {
    const evmNetwork: Network = {
      networkId: 'base-sepolia',
      chainId: '0x14a34',
      protocolFamily: 'evm',
    };
    expect(provider.supportsNetwork(evmNetwork)).toBe(true);
  });

  it('should not support non-EVM networks', () => {
    const solanaNetwork: Network = {
      networkId: 'solana-devnet',
      chainId: '103',
      protocolFamily: 'solana',
    };
    expect(provider.supportsNetwork(solanaNetwork)).toBe(false);
  });

  it('should return actions', () => {
    const actions = provider.getActions({} as any); // 添加模拟的钱包提供者
    expect(actions).toHaveLength(6);
    
    // 验证所有操作都存在
    const actionNames = actions.map(action => action.name);
    expect(actionNames).toContain('check_atoken_balance');
    expect(actionNames).toContain('approve_weth_for_aave');
    expect(actionNames).toContain('supply_weth');
    expect(actionNames).toContain('withdraw_weth');
    expect(actionNames).toContain('borrow_weth');
    expect(actionNames).toContain('repay_weth');
  });

  // 这里可以添加更多测试，例如模拟钱包提供者和测试每个操作的执行
  // 由于这些操作需要与区块链交互，你可能需要使用模拟对象来模拟这些交互
}); 