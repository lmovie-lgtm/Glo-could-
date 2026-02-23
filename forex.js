// Global Pilgrim Bank - Forex Trading System JavaScript

const FOREX_CONFIG = {
    accountNumber: "0001234567",
    server: "6G-001",
    cscsAccount: "CSCS12345",
    bvn: "22203477535",
    owner: "Olawale Abdul-Ganiyu Adeshina",
    email: "adegan95@gmail.com"
};

let tradingAccount = {
    mainBalance: 0,
    profitBalance: 0,
    openTrades: 0,
    totalProfit: 0,
    trades: []
};

let autoTradingInterval = null;
let selectedPair = null;

// ============================================
// FOREX ACCOUNT FUNCTIONS
// ============================================

function initializeForexAccount() {
    // Load from localStorage or initialize
    const savedAccount = localStorage.getItem('forexAccount');
    if (savedAccount) {
        tradingAccount = JSON.parse(savedAccount);
    } else {
        // Initialize with default balance from bank
        const bankBalance = parseFloat(localStorage.getItem('mainBalance')) || 0;
        tradingAccount.mainBalance = bankBalance;
        saveForexAccount();
    }
    
    updateForexDisplay();
    loadTradingHistory();
}

function saveForexAccount() {
    localStorage.setItem('forexAccount', JSON.stringify(tradingAccount));
}

function updateForexDisplay() {
    document.getElementById('mainBalance').textContent = '$' + tradingAccount.mainBalance.toFixed(2);
    document.getElementById('profitBalance').textContent = '$' + tradingAccount.profitBalance.toFixed(2);
    document.getElementById('openTrades').textContent = tradingAccount.openTrades;
    document.getElementById('totalProfit').textContent = '$' + tradingAccount.totalProfit.toFixed(2);
}

// ============================================
// TRADING FUNCTIONS
// ============================================

function startAutoTrading() {
    if (autoTradingInterval) {
        showToast('Auto trading is already running', 'error');
        return;
    }
    
    showToast('Auto trading started! Robot will trade all pairs simultaneously.', 'success');
    
    autoTradingInterval = setInterval(() => {
        executeAllTrades();
    }, 6000); // Trade every 6 seconds as specified
}

function stopAutoTrading() {
    if (autoTradingInterval) {
        clearInterval(autoTradingInterval);
        autoTradingInterval = null;
        tradingAccount.openTrades = 0;
        saveForexAccount();
        updateForexDisplay();
        showToast('Auto trading stopped', 'success');
    } else {
        showToast('Auto trading is not running', 'error');
    }
}

function executeAllTrades() {
    // Simulate trading on all pairs simultaneously
    const allPairs = [
        'GBP/USD', 'EUR/USD', 'USD/JPY', 'USD/CHF', 
        'AUD/USD', 'USD/CAD', 'USD/NGN', 'NZD/USD',
        'BTC/ETH', 'ETH/BNB', 'BTC/USDT', 'ETH/USDT',
        'SOL/USDT', 'XRP/USDT', 'ADA/USDT', 'PGM/USDT'
    ];
    
    let totalProfit = 0;
    
    allPairs.forEach(pair => {
        const tradeResult = simulateTrade(pair);
        totalProfit += tradeResult;
        
        if (tradeResult > 0) {
            addTradeRecord(pair, tradeResult, 'auto');
        }
    });
    
    // Update balances
    if (totalProfit > 0) {
        tradingAccount.mainBalance += totalProfit;
        tradingAccount.profitBalance += totalProfit;
        tradingAccount.totalProfit += totalProfit;
        tradingAccount.openTrades = allPairs.length;
        
        saveForexAccount();
        updateForexDisplay();
        loadTradingHistory();
        
        // Also update bank balance
        updateBankBalance(totalProfit);
        
        showToast(`Auto trading cycle completed! Profit: $${totalProfit.toFixed(2)}`, 'success');
    }
}

function simulateTrade(pair) {
    // Simulate market movement
    const marketDirection = Math.random() > 0.5 ? 'up' : 'down';
    const volatility = Math.random() * 2 + 0.5; // 0.5 to 2.5
    
    // Robot logic: buy when market goes up, sell when market goes down
    // Profit accumulates from $0.001 as specified
    let profit = 0;
    
    if (marketDirection === 'up') {
        profit = volatility * 0.1; // Buy profit
    } else {
        profit = volatility * 0.08; // Sell profit
    }
    
    // Random factor for realism
    profit += (Math.random() * 0.5 - 0.25);
    
    // Ensure minimum profit
    if (profit < 0.001) {
        profit = 0.001 + Math.random() * 0.005;
    }
    
    return profit;
}

function manualTrade() {
    if (!selectedPair) {
        showToast('Please select a trading pair first', 'error');
        return;
    }
    
    const profit = simulateTrade(selectedPair);
    
    tradingAccount.mainBalance += profit;
    tradingAccount.profitBalance += profit;
    tradingAccount.totalProfit += profit;
    
    addTradeRecord(selectedPair, profit, 'manual');
    
    saveForexAccount();
    updateForexDisplay();
    loadTradingHistory();
    updateBankBalance(profit);
    
    showToast(`Manual trade on ${selectedPair} completed! Profit: $${profit.toFixed(2)}`, 'success');
}

function selectPair(pair) {
    selectedPair = pair;
    showToast(`${pair} selected for trading`, 'success');
}

// ============================================
// TRANSFER FUNCTIONS
// ============================================

function transferToBank() {
    if (tradingAccount.profitBalance <= 0) {
        showToast('No profit balance to transfer', 'error');
        return;
    }
    
    const transferAmount = tradingAccount.profitBalance;
    
    // Transfer to bank
    let mainBankBalance = parseFloat(localStorage.getItem('mainBalance')) || 0;
    mainBankBalance += transferAmount;
    localStorage.setItem('mainBalance', mainBankBalance.toString());
    
    // Clear profit balance
    tradingAccount.profitBalance = 0;
    
    saveForexAccount();
    updateForexDisplay();
    
    showToast(`$${transferAmount.toFixed(2)} transferred to bank account`, 'success');
}

function updateBankBalance(amount) {
    let mainBankBalance = parseFloat(localStorage.getItem('mainBalance')) || 0;
    mainBankBalance += amount;
    localStorage.setItem('mainBalance', mainBankBalance.toString());
}

// ============================================
// TRADING HISTORY
// ============================================

function addTradeRecord(pair, profit, type) {
    const trade = {
        id: generateTradeId(),
        pair: pair,
        profit: profit,
        type: type,
        timestamp: new Date().toISOString(),
        status: 'completed'
    };
    
    tradingAccount.trades.unshift(trade);
    
    // Keep only last 100 trades
    if (tradingAccount.trades.length > 100) {
        tradingAccount.trades = tradingAccount.trades.slice(0, 100);
    }
}

function loadTradingHistory() {
    const historyDiv = document.getElementById('tradingHistory');
    
    if (!tradingAccount.trades || tradingAccount.trades.length === 0) {
        historyDiv.innerHTML = '<p style="color: #94a3b8;">No trading history yet</p>';
        return;
    }
    
    let historyHTML = '';
    tradingAccount.trades.slice(0, 50).forEach(trade => {
        const typeColor = trade.type === 'auto' ? '#8b5cf6' : '#f59e0b';
        
        historyHTML += `
            <div style="padding: 15px; margin-bottom: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; border-left: 3px solid ${typeColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="color: #8b5cf6; font-weight: 600; font-size: 1rem;">${trade.pair}</p>
                        <p style="color: #94a3b8; font-size: 0.85rem;">${trade.type.toUpperCase()} Trade</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="color: #22c55e; font-weight: 600; font-size: 1.1rem;">+$${trade.profit.toFixed(4)}</p>
                        <p style="color: #94a3b8; font-size: 0.8rem;">${new Date(trade.timestamp).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    historyDiv.innerHTML = historyHTML;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateTradeId() {
    const timestamp = Date.now().toString(36);
    const random = generateRandomString(8);
    return 'FX' + timestamp + random;
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
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
    initializeForexAccount();
    console.log('Forex Trading System Initialized');
    console.log('Account: ' + FOREX_CONFIG.accountNumber);
    console.log('Server: ' + FOREX_CONFIG.server);
    console.log('Owner: ' + FOREX_CONFIG.owner);
});