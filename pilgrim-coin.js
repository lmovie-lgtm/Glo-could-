// Global Pilgrim Bank - Pilgrim Coin System JavaScript

const PILGRIM_COIN_CONFIG = {
    name: "Pilgrim Coin",
    symbol: "PGM",
    price: 0.50, // $0.50 per PGM
    decimals: 8,
    miningRate: 0.000002,
    walletPrefix: "PGM",
    owner: "Olawale Abdul-Ganiyu Adeshina"
};

const MINING_STEPS = [
    0.0000001,
    0.000005,
    0.000010,
    0.000150,
    0.000200,
    0.002500,
    0.050000,
    0.100000,
    1.000000
];

let currentWallet = null;
let miningInterval = null;

// ============================================
// WALLET FUNCTIONS
// ============================================

function generateWallet() {
    const timestamp = Date.now().toString(36);
    const random = generateRandomString(30);
    const walletAddress = PILGRIM_COIN_CONFIG.walletPrefix + timestamp + random;
    
    currentWallet = {
        address: walletAddress,
        balance: 0,
        miningActive: true,
        currentStep: 0,
        accumulated: 0,
        transactions: [],
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('pilgrimWallet', JSON.stringify(currentWallet));
    
    updateWalletDisplay();
    showToast('Pilgrim Coin wallet generated successfully!', 'success');
    
    // Start auto mining
    startAutoMining();
    
    alert(`Your Pilgrim Coin Wallet has been created!\n\nWallet Address: ${walletAddress}\nMining: Active\n\nStart mining to earn PGM!`);
}

function loadWallet() {
    const walletData = localStorage.getItem('pilgrimWallet');
    if (walletData) {
        currentWallet = JSON.parse(walletData);
        updateWalletDisplay();
        loadCoinTransactions();
        
        if (currentWallet.miningActive) {
            startAutoMining();
        }
    }
}

function updateWalletDisplay() {
    if (!currentWallet) {
        document.getElementById('walletDisplay').innerHTML = `
            <p style="color: #94a3b8;">Generate a wallet to start mining</p>
        `;
        return;
    }
    
    document.getElementById('walletDisplay').innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.1); padding: 15px; border-radius: 8px; border: 1px solid #f59e0b;">
            <p style="color: #94a3b8; font-size: 0.85rem;">Wallet Address</p>
            <p style="color: #f59e0b; font-size: 1.1rem; word-break: break-all;">${currentWallet.address}</p>
            <p style="color: #94a3b8; margin-top: 10px; font-size: 0.85rem;">Status: <span style="color: #22c55e;">${currentWallet.miningActive ? 'MINING ACTIVE' : 'MINING PAUSED'}</span></p>
        </div>
    `;
    
    // Update balances
    document.getElementById('pgmBalance').textContent = currentWallet.balance.toFixed(8);
    document.getElementById('usdValue').textContent = '$' + (currentWallet.balance * PILGRIM_COIN_CONFIG.price).toFixed(2);
}

// ============================================
// MINING FUNCTIONS
// ============================================

function mineNow() {
    if (!currentWallet) {
        showToast('Please generate a wallet first', 'error');
        return;
    }
    
    const miningAmount = PILGRIM_COIN_CONFIG.miningRate;
    currentWallet.balance += miningAmount;
    currentWallet.accumulated += miningAmount;
    
    // Check if mining cycle completes
    if (currentWallet.accumulated >= 1.0) {
        currentWallet.accumulated = 0;
        currentWallet.currentStep = 0;
        
        // Bonus for completing a cycle
        currentWallet.balance += 0.1;
        
        showToast('Mining cycle completed! +0.1 bonus PGM', 'success');
    }
    
    // Add transaction record
    addTransaction('mining', miningAmount, 'Manual mining');
    
    saveWallet();
    updateWalletDisplay();
    loadCoinTransactions();
    
    showToast(`Mined ${miningAmount} PGM ($${(miningAmount * PILGRIM_COIN_CONFIG.price).toFixed(6)})`, 'success');
}

function startAutoMining() {
    if (miningInterval) {
        clearInterval(miningInterval);
    }
    
    miningInterval = setInterval(() => {
        if (currentWallet && currentWallet.miningActive) {
            const stepValue = MINING_STEPS[currentWallet.currentStep % MINING_STEPS.length];
            currentWallet.balance += stepValue;
            currentWallet.accumulated += stepValue;
            currentWallet.currentStep++;
            
            // Check if mining cycle completes
            if (currentWallet.accumulated >= 1.0) {
                currentWallet.accumulated = 0;
                currentWallet.currentStep = 0;
                
                // Bonus for completing a cycle
                currentWallet.balance += 0.1;
                
                showToast('Auto mining cycle completed! +0.1 bonus PGM', 'success');
            }
            
            // Add transaction record
            addTransaction('auto_mining', stepValue, 'Auto mining - Step ' + currentWallet.currentStep);
            
            saveWallet();
            updateWalletDisplay();
            loadCoinTransactions();
        }
    }, 60000); // Auto mine every minute
}

function stopAutoMining() {
    if (currentWallet) {
        currentWallet.miningActive = false;
        saveWallet();
        updateWalletDisplay();
        
        if (miningInterval) {
            clearInterval(miningInterval);
            miningInterval = null;
        }
        
        showToast('Auto mining stopped', 'success');
    }
}

// ============================================
// ROBOT TRADING
// ============================================

function robotTrade() {
    if (!currentWallet) {
        showToast('Please generate a wallet first', 'error');
        return;
    }
    
    // Robot trades 0.5% of current balance
    const tradeAmount = currentWallet.balance * 0.005;
    
    if (tradeAmount > 0) {
        currentWallet.balance += tradeAmount;
        
        addTransaction('robot_trade', tradeAmount, 'Robot trading profit (0.5%)');
        
        saveWallet();
        updateWalletDisplay();
        loadCoinTransactions();
        
        showToast(`Robot trade completed! +${tradeAmount.toFixed(8)} PGM`, 'success');
    } else {
        showToast('Insufficient balance for robot trading', 'error');
    }
}

// ============================================
// TRANSACTION FUNCTIONS
// ============================================

function addTransaction(type, amount, description) {
    const transaction = {
        id: generateTransactionId(),
        type: type,
        amount: amount,
        description: description,
        timestamp: new Date().toISOString(),
        usdValue: amount * PILGRIM_COIN_CONFIG.price
    };
    
    currentWallet.transactions.unshift(transaction);
}

function loadCoinTransactions() {
    const transactionsDiv = document.getElementById('coinTransactions');
    
    if (!currentWallet || !currentWallet.transactions || currentWallet.transactions.length === 0) {
        transactionsDiv.innerHTML = '<p style="color: #94a3b8;">No transactions yet</p>';
        return;
    }
    
    let transactionsHTML = '';
    currentWallet.transactions.slice(0, 20).forEach(tx => {
        const typeColor = tx.type === 'mining' || tx.type === 'auto_mining' || tx.type === 'robot_trade' ? '#22c55e' : '#f59e0b';
        
        transactionsHTML += `
            <div style="padding: 12px; margin-bottom: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; border-left: 3px solid ${typeColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="color: ${typeColor}; font-weight: 600; font-size: 0.9rem;">${tx.type.toUpperCase().replace('_', ' ')}</p>
                        <p style="color: #94a3b8; font-size: 0.8rem;">${tx.description}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="color: #f59e0b; font-weight: 600;">+${tx.amount.toFixed(8)} PGM</p>
                        <p style="color: #22c55e; font-size: 0.8rem;">$${tx.usdValue.toFixed(6)}</p>
                    </div>
                </div>
                <p style="color: #64748b; font-size: 0.75rem; margin-top: 8px;">${new Date(tx.timestamp).toLocaleString()}</p>
            </div>
        `;
    });
    
    transactionsDiv.innerHTML = transactionsHTML;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function saveWallet() {
    localStorage.setItem('pilgrimWallet', JSON.stringify(currentWallet));
}

function generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = generateRandomString(8);
    return 'PGM' + timestamp + random;
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = type === 'success' ? '#16a34a' : '#ef4444';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadWallet();
    console.log('Pilgrim Coin System Initialized');
    console.log('Owner: ' + PILGRIM_COIN_CONFIG.owner);
    console.log('Current Price: $' + PILGRIM_COIN_CONFIG.price);
});