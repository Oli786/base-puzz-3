import { 
  createConfig, 
  http, 
  connect, 
  disconnect, 
  reconnect, 
  getAccount, 
  watchAccount, 
  switchChain,
  sendTransaction,
  waitForTransactionReceipt
} from '@wagmi/core';
import { base } from '@wagmi/core/chains';
import { injected, coinbaseWallet, walletConnect } from '@wagmi/connectors';

// Configuration
export const BUILDER_CODE = 'bc_sjkexp2o';
export const ENCODED_BUILDER_STRING = '0x62635f736a6b657870326f0b0080218021802180218021802180218021';
export const BASE_CHAIN_ID = 8453;

// WalletConnect Project ID (Placeholder - User should replace this)
const WALLETCONNECT_PROJECT_ID = '9ba631e80816915f01e6727271424d86'; 

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Base Puzz 3' }),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
  transports: {
    [base.id]: http(),
  },
});

// Initialization
export const initBlockchain = async () => {
  try {
    reconnect(config);
    return true;
  } catch (error) {
    console.error('Blockchain init failed:', error);
    return false;
  }
};

export const getConnectors = () => config.connectors;

export const connectToWallet = async (connector) => {
  try {
    const account = getAccount(config);
    if (account.isConnected && account.connector?.id === connector.id) {
      return account.address;
    }
    const result = await connect(config, { connector });
    return result.accounts[0];
  } catch (error) {
    if (error.message?.includes('already connected')) {
      const account = getAccount(config);
      return account.address;
    }
    console.error('Wallet connection failed:', error);
    throw error;
  }
};

export const disconnectWallet = async () => {
  await disconnect(config);
};

export const checkNetwork = async () => {
  const account = getAccount(config);
  return account.chainId;
};

export const switchToBase = async () => {
  try {
    await switchChain(config, { chainId: BASE_CHAIN_ID });
    return true;
  } catch (error) {
    console.error('Failed to switch to Base network:', error);
    return false;
  }
};

// Function to append Builder Code suffix to transaction data
const appendBuilderCode = (data = '0x') => {
  const suffix = ENCODED_BUILDER_STRING.startsWith('0x') ? ENCODED_BUILDER_STRING.slice(2) : ENCODED_BUILDER_STRING;
  if (data === '0x' || data === '' || data === '0x00') return `0x${suffix}`;
  return `${data}${suffix}`;
};

export const dailyCheckIn = async () => {
  const account = getAccount(config);
  if (!account.isConnected) throw new Error('Wallet not connected');
  
  // FORCE RULE: Ensure on Base Mainnet
  if (account.chainId !== BASE_CHAIN_ID) {
    const success = await switchToBase();
    if (!success) throw new Error('Switch to Base Mainnet required.');
  }

  const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
  
  try {
    // FORCE RULE: Manual Gas 100k, Value 0, Valid Hex Data
    const txParams = {
      to: BURN_ADDRESS,
      value: 0n,
      data: appendBuilderCode(),
      gas: 100000n
    };
    
    console.log('FORCE SENDING CHECK-IN:', txParams);
    const hash = await sendTransaction(config, txParams);
    return hash;
  } catch (error) {
    // FORCE RULE: Detailed Logging
    console.error('FORCE FIX ERROR LOG:', {
      message: error.message,
      data: error.data,
      reason: error.reason,
      code: error.code
    });
    const errorMessage = parseError(error);
    throw new Error(errorMessage);
  }
};

export const submitScore = async (score) => {
  const account = getAccount(config);
  if (!account.isConnected) throw new Error('Wallet not connected');
  
  if (account.chainId !== BASE_CHAIN_ID) {
    await switchToBase();
  }

  try {
    const scoreHex = `0x${score.toString(16).padStart(8, '0')}`;
    const txParams = {
      to: account.address,
      value: 0n,
      data: appendBuilderCode(scoreHex),
      gas: 100000n
    };
    
    console.log('FORCE SENDING SCORE:', txParams);
    const hash = await sendTransaction(config, txParams);
    return hash;
  } catch (error) {
    console.error('FORCE SCORE ERROR LOG:', error);
    const errorMessage = parseError(error);
    throw new Error(errorMessage);
  }
};

export const waitForTransaction = async (hash) => {
  return await waitForTransactionReceipt(config, { hash });
};

const parseError = (error) => {
  if (error.message?.includes('User rejected')) return 'User rejected the transaction';
  if (error.message?.includes('insufficient funds')) return 'Insufficient ETH for gas';
  if (error.shortMessage) return error.shortMessage;
  return error.message || 'Unknown blockchain error';
};

export const watchWalletAccount = (callback) => {
  return watchAccount(config, { onChange: callback });
};

export const getWalletAccount = () => getAccount(config);
