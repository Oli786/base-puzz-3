import './style.css';
import { 
  initBlockchain, 
  getConnectors,
  connectToWallet,
  checkNetwork, 
  switchToBase, 
  dailyCheckIn, 
  submitScore, 
  waitForTransaction,
  watchWalletAccount,
  getWalletAccount,
  BASE_CHAIN_ID
} from './blockchain.js';
import { GameEngine } from './game.js';

// DOM Elements
const onboarding = document.getElementById('onboarding');
const gameScreen = document.getElementById('game-screen');
const connectBtn = document.getElementById('connect-wallet');
const startBtn = document.getElementById('start-game');
const usernameInput = document.getElementById('username');
const networkWarning = document.getElementById('network-warning');
const switchBtn = document.getElementById('switch-to-base');
const currentNetworkSpan = document.getElementById('current-network');
const displayUsername = document.getElementById('display-username');
const dailyCheckinBtn = document.getElementById('daily-checkin');

const levelVal = document.getElementById('level-val');
const movesVal = document.getElementById('moves-val');
const scoreVal = document.getElementById('score-val');
const targetVal = document.getElementById('target-val');
const gameGrid = document.getElementById('game-grid');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const nextLevelBtn = document.getElementById('next-level');
const retryBtn = document.getElementById('retry-level');
const submitScoreBtn = document.getElementById('submit-score');

const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');
const toastIcon = document.getElementById('toast-icon');

const walletModal = document.getElementById('wallet-modal');
const walletOptions = document.getElementById('wallet-options');
const closeWalletModal = document.getElementById('close-wallet-modal');

// State
let user = {
  address: null,
  username: '',
  currentLevel: 1,
  score: 0
};

const game = new GameEngine((update) => {
  if (update.score !== undefined) scoreVal.innerText = update.score;
  if (update.moves !== undefined) movesVal.innerText = update.moves;
  if (update.level !== undefined) levelVal.innerText = update.level;
  if (update.target !== undefined) targetVal.innerText = update.target;
  if (update.grid !== undefined) renderGrid(update.grid);
  if (update.status) handleGameStatus(update.status);
});

// Initialization
const init = async () => {
  const isAvailable = await initBlockchain();
  
  // Watch for account changes
  watchWalletAccount((account) => {
    if (account.address) {
      user.address = account.address;
      updateConnectButton(account.address);
      updateNetworkStatus(account.chainId);
    } else {
      user.address = null;
      resetConnectButton();
    }
  });

  const account = getWalletAccount();
  if (account.isConnected) {
    user.address = account.address;
    updateConnectButton(account.address);
    updateNetworkStatus(account.chainId);
    checkAutoStart(); 
  }
};

const checkAutoStart = () => {
  const username = usernameInput.value.trim();
  const account = getWalletAccount();
  
  if (username && account.isConnected && account.chainId === BASE_CHAIN_ID) {
    user.username = username;
    user.address = account.address;
    displayUsername.innerText = username;
    
    onboarding.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    game.initLevel(user.currentLevel);
    showToast(`Welcome back, ${username}!`, 'success');
  }
};

// UI Functions
const showToast = (msg, type = 'info', duration = 4000) => {
  toastMsg.innerText = msg;
  toastIcon.innerText = type === 'info' ? '⏳' : type === 'success' ? '✅' : '❌';
  toast.classList.remove('hidden');
  
  // Auto-hide unless it's a long processing toast
  if (duration > 0) {
    setTimeout(() => {
      if (toastMsg.innerText === msg) toast.classList.add('hidden');
    }, duration);
  }
};

const hideToast = () => toast.classList.add('hidden');

const updateConnectButton = (address) => {
  connectBtn.innerText = `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`;
  connectBtn.classList.add('btn-secondary');
};

const resetConnectButton = () => {
  connectBtn.innerText = 'Connect Wallet';
  connectBtn.classList.remove('btn-secondary');
};

const updateNetworkStatus = (chainId) => {
  if (chainId && chainId !== BASE_CHAIN_ID) {
    networkWarning.classList.remove('hidden');
    startBtn.classList.add('hidden');
    currentNetworkSpan.innerText = chainId === 1 ? 'Ethereum Mainnet' : `Chain ID ${chainId}`;
  } else {
    networkWarning.classList.add('hidden');
    if (user.address) startBtn.classList.remove('hidden');
  }
};

const handleGameStatus = (status) => {
  overlay.classList.remove('hidden');
  if (status === 'SUCCESS') {
    overlayTitle.innerText = 'Level Complete!';
    overlayMsg.innerText = `Amazing! You reached the target score of ${game.currentLevel.targetScore}.`;
    nextLevelBtn.classList.remove('hidden');
    retryBtn.classList.add('hidden');
    submitScoreBtn.classList.remove('hidden');
  } else {
    overlayTitle.innerText = 'Level Failed';
    overlayMsg.innerText = "You ran out of moves. Don't give up!";
    nextLevelBtn.classList.add('hidden');
    retryBtn.classList.remove('hidden');
    submitScoreBtn.classList.add('hidden');
  }
};

const renderGrid = (grid) => {
  gameGrid.innerHTML = '';
  grid.forEach((row, r) => {
    row.forEach((tile, c) => {
      if (!tile) return;
      const tileEl = document.createElement('div');
      tileEl.className = `tile tile-${tile.type} ${tile.clearing ? 'clearing' : ''} ${tile.isNew ? 'new' : ''}`;
      tileEl.dataset.r = r;
      tileEl.dataset.c = c;
      
      tileEl.addEventListener('click', () => {
        if (game.isProcessing) return;
        if (game.selectedTile) {
          const r1 = parseInt(game.selectedTile.dataset.r);
          const c1 = parseInt(game.selectedTile.dataset.c);
          game.swapTiles(r1, c1, r, c);
          game.selectedTile.classList.remove('selected');
          game.selectedTile = null;
        } else {
          game.selectedTile = tileEl;
          tileEl.classList.add('selected');
        }
      });
      gameGrid.appendChild(tileEl);
    });
  });
};

const openWalletSelection = () => {
  const connectors = getConnectors();
  walletOptions.innerHTML = '';
  
  connectors.forEach(connector => {
    const btn = document.createElement('button');
    btn.className = 'wallet-option-btn';
    
    // Get icon
    let iconUrl = 'https://raw.githubusercontent.com/wagmi-dev/wagmi/main/packages/connectors/src/icons/injected.svg';
    if (connector.name.toLowerCase().includes('coinbase')) iconUrl = 'https://raw.githubusercontent.com/wagmi-dev/wagmi/main/packages/connectors/src/icons/coinbase.svg';
    if (connector.name.toLowerCase().includes('walletconnect')) iconUrl = 'https://raw.githubusercontent.com/wagmi-dev/wagmi/main/packages/connectors/src/icons/walletconnect.svg';
    
    btn.innerHTML = `
      <div class="wallet-icon"><img src="${iconUrl}" alt="${connector.name}"></div>
      <span>${connector.name}</span>
    `;
    
    btn.onclick = async () => {
      try {
        const currentAccount = getWalletAccount();
        if (currentAccount.isConnected && currentAccount.connector?.id === connector.id) {
          walletModal.classList.add('hidden');
          checkAutoStart();
          return;
        }

        walletModal.classList.add('hidden');
        showToast(`Connecting to ${connector.name}...`);
        await connectToWallet(connector);
        hideToast();
        checkAutoStart();
      } catch (err) {
        // Only show toast if it's not the 'already connected' error which we handle internally
        if (!err.message?.includes('already connected')) {
          showToast(err.message || 'Connection failed', 'error');
        }
      }
    };
    walletOptions.appendChild(btn);
  });
  
  walletModal.classList.remove('hidden');
};

// Event Listeners
connectBtn.addEventListener('click', openWalletSelection);
closeWalletModal.addEventListener('click', () => walletModal.classList.add('hidden'));

switchBtn.addEventListener('click', async () => {
  const success = await switchToBase();
  if (!success) {
    showToast('Please switch to Base Mainnet manually in your wallet.', 'error');
  }
});

startBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (!username) {
    showToast('Please enter a username', 'error');
    return;
  }
  user.username = username;
  displayUsername.innerText = username;
  
  onboarding.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  game.initLevel(user.currentLevel);
});

usernameInput.addEventListener('input', checkAutoStart);

dailyCheckinBtn.addEventListener('click', async () => {
  try {
    showToast('Processing Check-in on Base...', 'info', 0);
    const hash = await dailyCheckIn();
    showToast('Waiting for confirmation...', 'info', 0);
    await waitForTransaction(hash);
    showToast('Daily Check-in Successful!', 'success');
  } catch (err) {
    console.error('Check-in error details:', err);
    showToast(`Check-in failed: ${err.message}`, 'error', 6000);
  }
});

submitScoreBtn.addEventListener('click', async () => {
  try {
    showToast('Submitting Score to Base...', 'info', 0);
    const hash = await submitScore(game.score);
    showToast('Waiting for confirmation...', 'info', 0);
    await waitForTransaction(hash);
    showToast('Score Submitted Successfully!', 'success');
  } catch (err) {
    console.error('Submission error:', err);
    showToast(`Submission failed: ${err.message}`, 'error', 5000);
  }
});

nextLevelBtn.addEventListener('click', () => {
  user.currentLevel++;
  if (user.currentLevel > 30) user.currentLevel = 1;
  overlay.classList.add('hidden');
  game.initLevel(user.currentLevel);
});

retryBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');
  game.initLevel(user.currentLevel);
});

init();

// Mobile Touch Support
let touchStart = null;
gameGrid.addEventListener('touchstart', (e) => {
  const tile = e.target.closest('.tile');
  if (tile) {
    touchStart = {
      r: parseInt(tile.dataset.r),
      c: parseInt(tile.dataset.c),
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }
}, { passive: true });

gameGrid.addEventListener('touchend', (e) => {
  if (!touchStart || game.isProcessing) return;
  const touchEnd = {
    x: e.changedTouches[0].clientX,
    y: e.changedTouches[0].clientY
  };
  const dx = touchEnd.x - touchStart.x;
  const dy = touchEnd.y - touchStart.y;
  const threshold = 30;
  let r2 = touchStart.r;
  let c2 = touchStart.c;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) > threshold) c2 = dx > 0 ? touchStart.c + 1 : touchStart.c - 1;
  } else {
    if (Math.abs(dy) > threshold) r2 = dy > 0 ? touchStart.r + 1 : touchStart.r - 1;
  }
  if (r2 !== touchStart.r || c2 !== touchStart.c) {
    if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) game.swapTiles(touchStart.r, touchStart.c, r2, c2);
  }
  touchStart = null;
}, { passive: true });
