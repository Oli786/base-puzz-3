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
    
    // If already connected to this connector, just return the address
    if (account.isConnected && account.connector?.id === connector.id) {
      return account.address;
    }

    const result = await connect(config, { connector });
    return result.accounts[0];
  } catch (error) {
    // If the error is 'Connector already connected', we can safely ignore it and return the current address
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
  if (data === '0x' || data === '') return `0x${suffix}`;
  return `${data}${suffix}`;
};

export const dailyCheckIn = async () => {
  const account = getAccount(config);
  if (!account.isConnected) throw new Error('Wallet not connected');
  
  const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
  
  try {
    // Sending a 0 ETH transaction to Burn Address with Builder Code
    const txParams = {
      account: account.address,
      to: BURN_ADDRESS,
      value: 0n,
      data: appendBuilderCode(),
      chainId: BASE_CHAIN_ID,
      gas: 50000n
    };
    console.log('Sending Check-in Transaction to Burn Address:', txParams);
    const hash = await sendTransaction(config, txParams);
    
    return hash;
  } catch (error) {
    console.error('FULL ERROR OBJECT:', error); // Added full log
    const errorMessage = parseError(error);
    console.error('Check-in failed (parsed):', errorMessage);
    throw new Error(errorMessage);
  }
};

export const submitScore = async (score) => {
  const account = getAccount(config);
  if (!account.isConnected) throw new Error('Wallet not connected');
  
  try {
    const scoreHex = `0x${score.toString(16).padStart(8, '0')}`;
    const txData = appendBuilderCode(scoreHex);
    
    const txParams = {
      account: account.address,
      to: account.address, // Sending to self for demo tracking
      value: 0n,
      data: txData,
      chainId: BASE_CHAIN_ID,
      gas: 100000n
    };
    
    console.log('Submitting Score with params:', txParams);
    const hash = await sendTransaction(config, txParams);
    
    return hash;
  } catch (error) {
    console.error('FULL SUBMISSION ERROR OBJECT:', error); // Added full log
    const errorMessage = parseError(error);
    console.error('Submission failed (parsed):', errorMessage);
    throw new Error(errorMessage);
  }
};

export const waitForTransaction = async (hash) => {
  return await waitForTransactionReceipt(config, { hash });
};

// Helper to parse Wagmi/Viem errors into human-readable messages
const parseError = (error) => {
  console.log('Original Error Object:', error);
  if (error.message?.includes('User rejected')) return 'User rejected the transaction';
  if (error.message?.includes('insufficient funds')) return 'Insufficient funds (You need a small amount of ETH for gas)';
  if (error.message?.includes('Internal JSON-RPC error')) return 'Node error. Please try again later.';
  if (error.shortMessage) return error.shortMessage;
  if (error.details) return error.details;
  return error.message || 'Unknown blockchain error';
};

export const watchWalletAccount = (callback) => {
  return watchAccount(config, {
    onChange: callback
  });
};

export const getWalletAccount = () => {
  return getAccount(config);
};
