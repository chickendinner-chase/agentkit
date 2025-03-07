import { aaveActionProvider } from './aaveActionProvider';
import { WalletProvider } from '@coinbase/agentkit';

describe('Aave Action Provider', () => {
  const MOCK_ADDRESS = '0x1234567890123456789012345678901234567890';
  const MOCK_EVM_NETWORK = {
    networkId: 'base-sepolia',
    chainId: '0x14a34',
    protocolFamily: 'evm',
  };
  const MOCK_SOLANA_NETWORK = {
    networkId: 'solana-devnet',
    chainId: '103',
    protocolFamily: 'solana',
  };

  let mockWallet: jest.Mocked<WalletProvider>;
  const provider = aaveActionProvider();

  beforeEach(() => {
    mockWallet = {
      getAddress: jest.fn().mockReturnValue(MOCK_ADDRESS),
      getNetworkId: jest.fn().mockReturnValue('base-sepolia'),
      getNetwork: jest.fn().mockReturnValue({ networkId: 'base-sepolia' }),
    } as unknown as jest.Mocked<WalletProvider>;
  });

  describe('provider metadata', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('aave');
    });

    it('should not have actionProviders', () => {
      expect(provider.actionProviders).toEqual([]);
    });
  });

  describe('supportsNetwork', () => {
    it('should support EVM networks', () => {
      expect(provider.supportsNetwork(MOCK_EVM_NETWORK)).toBe(true);
    });

    it('should not support non-EVM networks', () => {
      expect(provider.supportsNetwork(MOCK_SOLANA_NETWORK)).toBe(false);
    });
  });

  describe('getActions', () => {
    it('should return all expected actions', () => {
      const actions = provider.getActions(mockWallet);
      
      // 验证返回了正确数量的操作
      expect(actions.length).toBe(10);
      
      // 验证所有必要的操作都存在
      const actionNames = actions.map(action => action.name);
      expect(actionNames).toContain('check_weth_balance');
      expect(actionNames).toContain('check_atoken_balance');
      expect(actionNames).toContain('check_debt_balance');
      expect(actionNames).toContain('check_weth_allowance');
      expect(actionNames).toContain('approve_weth_for_aave');
      expect(actionNames).toContain('supply_weth');
      expect(actionNames).toContain('withdraw_weth');
      expect(actionNames).toContain('borrow_weth');
      expect(actionNames).toContain('repay_weth');
      expect(actionNames).toContain('repay_all_weth');
    });

    it('should have proper descriptions for all actions', () => {
      const actions = provider.getActions(mockWallet);
      
      // 验证每个操作都有描述
      actions.forEach(action => {
        expect(action.description).toBeDefined();
        expect(typeof action.description).toBe('string');
        expect(action.description.length).toBeGreaterThan(0);
      });
    });

    it('should have proper schema for all actions', () => {
      const actions = provider.getActions(mockWallet);
      
      // 验证每个操作都有schema
      actions.forEach(action => {
        expect(action.schema).toBeDefined();
      });
    });
  });

  // 注意：本文件仅包含单元测试
  // 集成测试和真实交易测试位于 ../test-aave.ts 文件中
  // 运行集成测试请使用: npx ts-node ../test-aave.ts
}); 