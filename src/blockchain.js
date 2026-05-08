import { createPublicClient, createWalletClient, custom, http, hexToBytes, concatBytes } from 'viem';
import { base, mainnet } from 'viem/chains';

// Configuration
export const BUILDER_CODE = 'bc_sjkexp2o';
export const ENCODED_BUILDER_STRING = '0x62635f736a6b657870326f0b0080218021802180218021802180218021';
export const BASE_CHAIN_ID = 8453;

// Placeholder address for demonstration (can be replaced with a real contract)
const APP_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; 

let walletClient = null;
let publicClient = null;
let userAddress = null;

export const initBlockchain = async () => {
  if (typeof window.ethereum !== 'undefined') {
    publicClient = createPublicClient({
      chain: base,
      transport: http()
    });
    return true;
  }
  return false;
};

export const connectWallet = async () => {
  if (!window.ethereum) throw new Error('No ethereum wallet found');
  
  try {
    walletClient = createWalletClient({
      chain: base,
      transport: custom(window.ethereum)
    });
    
    const [address] = await walletClient.requestAddresses();
    userAddress = address;
    return address;
  } catch (error) {
    console.error('Wallet connection failed:', error);
    throw error;
  }
};

export const checkNetwork = async () => {
  if (!window.ethereum) return null;
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  return parseInt(chainId, 16);
};

export const switchToBase = async () => {
  if (!window.ethereum) return;
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
    });
    return true;
  } catch (error) {
    // If chain is not added, try adding it
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
            chainName: 'Base',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          }],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Base network:', addError);
      }
    }
    console.error('Failed to switch to Base network:', error);
    return false;
  }
};

// Function to append Builder Code suffix to transaction data
const appendBuilderCode = (data = '0x') => {
  if (data === '0x') data = '0x00'; // Minimal data if empty
  // Ensure we append the encoded string correctly
  const suffix = ENCODED_BUILDER_STRING.startsWith('0x') ? ENCODED_BUILDER_STRING.slice(2) : ENCODED_BUILDER_STRING;
  return `${data}${suffix}`;
};

export const dailyCheckIn = async () => {
  if (!walletClient || !userAddress) throw new Error('Wallet not connected');
  
  try {
    // A daily check-in is a simple transaction to self or contract with builder code
    // We'll send 0 ETH to the user themselves with the builder code in data
    const hash = await walletClient.sendTransaction({
      account: userAddress,
      to: userAddress,
      value: 0n,
      data: appendBuilderCode()
    });
    
    return hash;
  } catch (error) {
    console.error('Check-in failed:', error);
    throw error;
  }
};

export const submitScore = async (score) => {
  if (!walletClient || !userAddress) throw new Error('Wallet not connected');
  
  try {
    // In a real app, this would call a contract function.
    // For this demo, we'll encode the score in the data along with the builder code.
    // We'll use a simple hex encoding for the score.
    const scoreHex = `0x${score.toString(16).padStart(8, '0')}`;
    const txData = appendBuilderCode(scoreHex);
    
    const hash = await walletClient.sendTransaction({
      account: userAddress,
      to: userAddress, // Sending to self for demo tracking
      value: 0n,
      data: txData
    });
    
    return hash;
  } catch (error) {
    console.error('Score submission failed:', error);
    throw error;
  }
};

export const waitForTransaction = async (hash) => {
  if (!publicClient) return;
  return await publicClient.waitForTransactionReceipt({ hash });
};
