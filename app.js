// Global Pilgrim Bank - Main Application JavaScript
// Owner: Olawale Abdul-Ganiyu Adeshina (Adegan95)

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const ADMIN_CONFIG = {
    account: "22203477535", // BVN
    phone: "+2349030277275",
    pin: "9595",
    name: "Olawale Abdul-Ganiyu Adeshina",
    alias: "Adegan95",
    email: "adegan95@gmail.com",
    secondaryEmail: "olawalzte@gmail.com"
};

const BANK_INFO = {
    name: "Global Pilgrim Bank",
    code: "Agb 999",
    account: "0001234567",
    bvn: "22203477535",
    swift: "GPBNGNLA",
    cscs: "CSCS12345"
};

const EXCHANGE_RATES = {
    USD: 1,
    NGN: 1500,
    EUR: 0.92,
    GBP: 0.78,
    CHF: 0.88,
    CAD: 1.36,
    AUD: 1.53,
    JPY: 149.50
};

const TRANSACTION_TYPES = {
    CREDIT: "credit",
    DEBIT: "debit",
    TRANSFER: "transfer",
    MINING: "mining",
    ROBOT_TRADE: "robot_trade",
    WITHDRAWAL: "withdrawal",
    DEPOSIT: "deposit",
    SWIFT: "swift_transfer",
    LOCAL: "local_transfer"
};

// Bank Network Configuration
const BANK_NETWORK = {
    local: {
        GTB: { name: "Guaranty Trust Bank", code: "058" },
        FBN: { name: "First Bank of Nigeria", code: "011" },
        UBA: { name: "United Bank for Africa", code: "033" },
        Access: { name: "Access Bank", code: "044" },
        Zenith: { name: "Zenith Bank", code: "057" },
        Fidelity: { name: "Fidelity Bank", code: "070" },
        Wema: { name: "Wema Bank", code: "035" },
        OPay: { name: "OPay", code: "999" },
        PalmPay: { name: "PalmPay", code: "998" },
        Moniepoint: { name: "Moniepoint", code: "997" },
        Kuda: { name: "Kuda Bank", code: "50211" },
        Sterling: { name: "Sterling Bank", code: "232" }
    },
    international: {
        US: { name: "United States", swift: "US" },
        UK: { name: "United Kingdom", swift: "GB" },
        EU: { name: "Eurozone", swift: "EU" },
        CH: { name: "Switzerland", swift: "CH" },
        CA: { name: "Canada", swift: "CA" },
        AU: { name: "Australia", swift: "AU" },
        JP: { name: "Japan", swift: "JP" }
    }
};

// ============================================
// DATA STORAGE INITIALIZATION
// ============================================

function initializeStorage() {
    if (!localStorage.getItem('customers')) {
        localStorage.setItem('customers', JSON.stringify([]));
    }
    if (!localStorage.getItem('transactions')) {
        localStorage.setItem('transactions', JSON.stringify([]));
    }
    if (!localStorage.getItem('profit')) {
        localStorage.setItem('profit', '0');
    }
    if (!localStorage.getItem('mainBalance')) {
        localStorage.setItem('mainBalance', '0');
    }
    if (!localStorage.getItem('attempts')) {
        localStorage.setItem('attempts', JSON.stringify([]));
    }
    if (!localStorage.getItem('networkLogs')) {
        localStorage.setItem('networkLogs', JSON.stringify([]));
    }
    if (!localStorage.getItem('terminalLogs')) {
        localStorage.setItem('terminalLogs', JSON.stringify([]));
    }
    if (!localStorage.getItem('signalLogs')) {
        localStorage.setItem('signalLogs', JSON.stringify([]));
    }
    if (!localStorage.getItem('pendingTransfers')) {
        localStorage.setItem('pendingTransfers', JSON.stringify([]));
    }
    if (!localStorage.getItem('bankConnections')) {
        localStorage.setItem('bankConnections', JSON.stringify([]));
    }
}

// Initialize on load
initializeStorage();

// ============================================
// NETWORK SIGNAL TERMINAL
// ============================================

function logToTerminal(message, type = 'info', source = 'SYSTEM') {
    const terminalLogs = JSON.parse(localStorage.getItem('terminalLogs')) || [];
    
    terminalLogs.push({
        id: generateLogId(),
        timestamp: new Date().toISOString(),
        message: message,
        type: type,
        source: source,
        ip: getCurrentIP(),
        status: 'logged'
    });
    
    // Keep only last 500 logs
    if (terminalLogs.length > 500) {
        terminalLogs.splice(0, terminalLogs.length - 500);
    }
    
    localStorage.setItem('terminalLogs', JSON.stringify(terminalLogs));
    
    // Display in terminal if exists
    const terminalDiv = document.getElementById('terminal');
    if (terminalDiv) {
        const colorMap = {
            'info': '#22c55e',
            'success': '#16a34a',
            'warning': '#f59e0b',
            'error': '#ef4444',
            'signal': '#8b5cf6',
            'transfer': '#3b82f6'
        };
        
        const logEntry = document.createElement('p');
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span style="color: #64748b;">[${timestamp}]</span> <span style="color: ${colorMap[type]};">[${source}]</span> <span style="color: ${colorMap[type]};">${message}</span>`;
        terminalDiv.appendChild(logEntry);
        terminalDiv.scrollTop = terminalDiv.scrollHeight;
    }
}

function logSignalTransfer(transferData, status) {
    const signalLogs = JSON.parse(localStorage.getItem('signalLogs')) || [];
    
    signalLogs.push({
        id: generateLogId(),
        timestamp: new Date().toISOString(),
        transferId: transferData.id,
        source: transferData.sourceBank,
        destination: transferData.destinationBank,
        amount: transferData.amount,
        currency: transferData.currency,
        status: status,
        signal: generateSignal(transferData),
        account: transferData.accountNumber
    });
    
    localStorage.setItem('signalLogs', JSON.stringify(signalLogs));
    
    logToTerminal(`Signal Transfer: ${transferData.sourceBank} -> ${transferData.destinationBank} | Amount: ${transferData.amount} ${transferData.currency} | Status: ${status}`, 'signal', 'SIGNAL_TERMINAL');
}

function generateSignal(transferData) {
    // Generate unique signal for interbank communication
    const timestamp = Date.now().toString(36);
    const random = generateRandomString(16);
    const bankCode = BANK_INFO.swift;
    return `${bankCode}-${timestamp}-${random}`;
}

// ============================================
// BANK NETWORK CONNECTIONS
// ============================================

function addBankConnection(bankCode, bankName, type) {
    const connections = JSON.parse(localStorage.getItem('bankConnections')) || [];
    
    // Check if connection exists
    if (connections.find(c => c.bankCode === bankCode)) {
        logToTerminal(`Bank connection already exists: ${bankName}`, 'warning', 'NETWORK');
        return false;
    }
    
    const connection = {
        id: generateConnectionId(),
        bankCode: bankCode,
        bankName: bankName,
        type: type, // 'local' or 'international'
        status: 'connected',
        latency: Math.floor(Math.random() * 100) + 20,
        connectedAt: new Date().toISOString(),
        lastSignal: new Date().toISOString()
    };
    
    connections.push(connection);
    localStorage.setItem('bankConnections', JSON.stringify(connections));
    
    logToTerminal(`New bank connection established: ${bankName} (${type})`, 'success', 'NETWORK');
    return true;
}

function testAllBankConnections() {
    const connections = JSON.parse(localStorage.getItem('bankConnections')) || [];
    
    logToTerminal('Starting bank connection test...', 'info', 'NETWORK_TEST');
    
    connections.forEach(connection => {
        // Simulate connection test
        const testResult = testConnection(connection);
        
        logToTerminal(`Testing ${connection.bankName}: ${testResult.status} (${testResult.latency}ms)`, 
            testResult.status === 'success' ? 'success' : 'error', 
            'NETWORK_TEST');
        
        // Update last signal
        connection.lastSignal = new Date().toISOString();
        connection.latency = testResult.latency;
    });
    
    localStorage.setItem('bankConnections', JSON.stringify(connections));
    logToTerminal(`Bank connection test completed. ${connections.length} connections tested.`, 'success', 'NETWORK_TEST');
}

function testConnection(connection) {
    // Simulate connection test with random latency
    const latency = Math.floor(Math.random() * 150) + 30;
    const success = latency < 200;
    
    return {
        status: success ? 'success' : 'failed',
        latency: latency
    };
}

function sendSignalToBank(bankCode, signalData) {
    const connections = JSON.parse(localStorage.getItem('bankConnections')) || [];
    const connection = connections.find(c => c.bankCode === bankCode);
    
    if (!connection) {
        logToTerminal(`Bank not connected: ${bankCode}`, 'error', 'SIGNAL');
        return false;
    }
    
    logToTerminal(`Sending signal to ${connection.bankName}: ${signalData.type}`, 'signal', 'SIGNAL');
    
    // Simulate signal transmission
    setTimeout(() => {
        logToTerminal(`Signal received by ${connection.bankName}`, 'success', 'SIGNAL');
        connection.lastSignal = new Date().toISOString();
        localStorage.setItem('bankConnections', JSON.stringify(connections));
    }, connection.latency);
    
    return true;
}

// ============================================
// ADMIN AUTHENTICATION
// ============================================

function adminLogin() {
    const account = document.getElementById('account').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const pin = document.getElementById('pin').value.trim();
    
    const errorDiv = document.getElementById('error');
    
    // Validate against all accepted credentials
    const isValidAccount = (account === ADMIN_CONFIG.account || 
                          account === ADMIN_CONFIG.account.replace(/\s/g, '') ||
                          account === BANK_INFO.account);
    
    const isValidPhone = (phone === ADMIN_CONFIG.phone || 
                        phone === ADMIN_CONFIG.phone.replace('+', '') ||
                        phone === "Adegan95" ||
                        phone === "adegan95");
    
    const isValidPin = pin === ADMIN_CONFIG.pin;
    
    if (isValidAccount && isValidPhone && isValidPin) {
        // Successful login
        localStorage.setItem('admin', 'true');
        localStorage.setItem('adminName', ADMIN_CONFIG.name);
        localStorage.setItem('adminLoginTime', new Date().toISOString());
        
        logNetworkActivity('ADMIN_LOGIN', 'SUCCESS', account);
        logToTerminal(`Admin login successful: ${ADMIN_CONFIG.name}`, 'success', 'AUTH');
        
        showToast('Welcome, ' + ADMIN_CONFIG.name + '!', 'success');
        
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 1000);
    } else {
        // Failed login attempt
        const errorMsg = '⛔ ACCESS DENIED: Invalid credentials provided.';
        errorDiv.innerText = errorMsg;
        
        logUnauthorizedAttempt(account, phone);
        logNetworkActivity('ADMIN_LOGIN', 'FAILED', account);
        logToTerminal(`Failed admin login attempt from IP: ${getCurrentIP()}`, 'error', 'AUTH');
        
        setTimeout(() => {
            errorDiv.innerText = '';
        }, 5000);
    }
}

function logout() {
    logNetworkActivity('ADMIN_LOGOUT', 'SUCCESS', localStorage.getItem('adminName'));
    logToTerminal(`Admin logged out: ${localStorage.getItem('adminName')}`, 'info', 'AUTH');
    localStorage.removeItem('admin');
    window.location.href = 'index.html';
}

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

function generateAccountNumber() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return "GPB" + timestamp.toUpperCase() + random.toUpperCase();
}

function generateSerialNumber() {
    const letters = ['GP', 'AD', 'PL', 'BN'];
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const numbers = Math.floor(10000000 + Math.random() * 90000000);
    return letter + numbers;
}

function generateTenDigitAccount() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function createCustomer() {
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const bvn = document.getElementById('custBVN').value.trim();
    const nin = document.getElementById('custNIN').value.trim();
    const accountType = document.getElementById('accountType').value; // commercial, microfinance
    
    // Validation
    if (!name || !phone || !email) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    
    // Check if customer already exists
    const existingCustomer = customers.find(c => c.phone === phone || c.email === email);
    if (existingCustomer) {
        showToast('Customer with this phone or email already exists', 'error');
        return;
    }
    
    const newCustomer = {
        id: Date.now(),
        name: name,
        phone: phone,
        email: email,
        bvn: bvn || 'Not Provided',
        nin: nin || 'Not Provided',
        account: generateAccountNumber(),
        serial: generateSerialNumber(),
        tenDigitAccount: generateTenDigitAccount(),
        loginPin: generatePin(),
        balance: 0,
        currency: 'NGN',
        balanceUSD: 0,
        balanceEUR: 0,
        balanceGBP: 0,
        status: 'active',
        accountType: accountType,
        kycLevel: 1,
        amlScore: Math.floor(Math.random() * 30),
        createdAt: new Date().toISOString(),
        ledger: [],
        virtualCards: [],
        pilgrimWallet: null,
        pilgrimBalance: 0,
        profitBalance: 0,
        forexAccount: null
    };
    
    customers.push(newCustomer);
    localStorage.setItem('customers', JSON.stringify(customers));
    
    // Log transaction
    logTransaction(newCustomer.account, 'ACCOUNT_CREATION', 0, 'Customer account created');
    logToTerminal(`New customer created: ${name} (${accountType})`, 'success', 'CUSTOMER');
    
    showToast('Customer Created Successfully!', 'success');
    alert(`Customer Created:\n\nName: ${name}\nAccount: ${newCustomer.account}\nSerial: ${newCustomer.serial}\n10-Digit Account: ${newCustomer.tenDigitAccount}\nLogin PIN: ${newCustomer.loginPin}\n\nPlease save these details for the customer.`);
    
    // Clear form
    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    document.getElementById('custEmail').value = '';
    document.getElementById('custBVN').value = '';
    document.getElementById('custNIN').value = '';
    
    // Reload customer list
    loadCustomers();
    loadDashboard();
}

function generatePin() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function searchCustomer() {
    const input = document.getElementById('searchInput').value.trim();
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    
    const result = customers.find(c => 
        c.account === input || 
        c.name.toLowerCase().includes(input.toLowerCase()) ||
        c.phone === input ||
        c.serial === input ||
        c.tenDigitAccount === input
    );
    
    if (result) {
        const resultHTML = `
            <div style="background: rgba(34, 197, 94, 0.1); padding: 20px; border-radius: 10px; border: 1px solid #22c55e; margin-top: 15px;">
                <h3 style="color: #22c55e;">✅ Customer Found</h3>
                <p><strong>Name:</strong> ${result.name}</p>
                <p><strong>Account:</strong> ${result.account}</p>
                <p><strong>10-Digit Account:</strong> ${result.tenDigitAccount}</p>
                <p><strong>Serial:</strong> ${result.serial}</p>
                <p><strong>Phone:</strong> ${result.phone}</p>
                <p><strong>Email:</strong> ${result.email}</p>
                <p><strong>BVN:</strong> ${result.bvn}</p>
                <p><strong>NIN:</strong> ${result.nin}</p>
                <p><strong>Account Type:</strong> ${result.accountType.toUpperCase()}</p>
                <p><strong>Balance (NGN):</strong> ₦${result.balance.toLocaleString('en-NG', {minimumFractionDigits: 2})}</p>
                <p><strong>Balance (USD):</strong> $${result.balanceUSD.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                <p><strong>Profit Balance:</strong> $${(result.profitBalance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                <p><strong>Status:</strong> <span class="status status-success">${result.status.toUpperCase()}</span></p>
                <p><strong>KYC Level:</strong> ${result.kycLevel}</p>
                <p><strong>AML Score:</strong> ${result.amlScore}</p>
                <p><strong>Created:</strong> ${new Date(result.createdAt).toLocaleString()}</p>
                <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="editCustomer('${result.account}')" style="width: auto; padding: 8px 20px;">Edit Profile</button>
                    <button onclick="viewTransactions('${result.account}')" style="width: auto; padding: 8px 20px;">View Transactions</button>
                    <button onclick="creditCustomer('${result.account}')" style="width: auto; padding: 8px 20px; background: linear-gradient(135deg, #16a34a, #22c55e);">Credit</button>
                    <button onclick="debitCustomer('${result.account}')" style="width: auto; padding: 8px 20px; background: linear-gradient(135deg, #ef4444, #dc2626);">Debit</button>
                    <button onclick="deleteCustomer('${result.account}')" style="width: auto; padding: 8px 20px; background: linear-gradient(135deg, #ef4444, #dc2626);">Delete Account</button>
                </div>
            </div>
        `;
        document.getElementById('searchResult').innerHTML = resultHTML;
    } else {
        document.getElementById('searchResult').innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.1); padding: 20px; border-radius: 10px; border: 1px solid #ef4444; margin-top: 15px;">
                <p style="color: #ef4444;">❌ Customer Not Found</p>
            </div>
        `;
    }
}

function creditCustomer(account) {
    const amount = prompt('Enter amount to credit (NGN):');
    if (!amount || isNaN(amount)) {
        showToast('Invalid amount', 'error');
        return;
    }
    
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === account);
    
    if (customerIndex !== -1) {
        customers[customerIndex].balance += parseFloat(amount);
        customers[customerIndex].ledger.push({
            date: new Date().toISOString(),
            type: 'credit',
            amount: parseFloat(amount),
            currency: 'NGN',
            description: 'Admin credit'
        });
        
        localStorage.setItem('customers', JSON.stringify(customers));
        logTransaction(account, 'CREDIT', parseFloat(amount), 'Admin credit', 'NGN');
        logToTerminal(`Customer credited: ${customers[customerIndex].name} - ₦${amount}`, 'success', 'ADMIN');
        
        showToast(`₦${parseFloat(amount).toLocaleString()} credited successfully`, 'success');
        searchCustomer();
    }
}

function debitCustomer(account) {
    const amount = prompt('Enter amount to debit (NGN):');
    if (!amount || isNaN(amount)) {
        showToast('Invalid amount', 'error');
        return;
    }
    
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === account);
    
    if (customerIndex !== -1) {
        if (customers[customerIndex].balance < parseFloat(amount)) {
            showToast('Insufficient balance', 'error');
            return;
        }
        
        customers[customerIndex].balance -= parseFloat(amount);
        customers[customerIndex].ledger.push({
            date: new Date().toISOString(),
            type: 'debit',
            amount: parseFloat(amount),
            currency: 'NGN',
            description: 'Admin debit'
        });
        
        localStorage.setItem('customers', JSON.stringify(customers));
        logTransaction(account, 'DEBIT', parseFloat(amount), 'Admin debit', 'NGN');
        logToTerminal(`Customer debited: ${customers[customerIndex].name} - ₦${amount}`, 'warning', 'ADMIN');
        
        showToast(`₦${parseFloat(amount).toLocaleString()} debited successfully`, 'success');
        searchCustomer();
    }
}

function editCustomer(account) {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customer = customers.find(c => c.account === account);
    
    if (!customer) {
        showToast('Customer not found', 'error');
        return;
    }
    
    const newName = prompt('Enter new name:', customer.name);
    const newPhone = prompt('Enter new phone:', customer.phone);
    const newEmail = prompt('Enter new email:', customer.email);
    const newStatus = prompt('Enter status (active/suspended/closed):', customer.status);
    
    if (newName) customer.name = newName;
    if (newPhone) customer.phone = newPhone;
    if (newEmail) customer.email = newEmail;
    if (newStatus) customer.status = newStatus;
    
    localStorage.setItem('customers', JSON.stringify(customers));
    logToTerminal(`Customer updated: ${customer.name}`, 'info', 'ADMIN');
    showToast('Customer profile updated successfully', 'success');
    searchCustomer();
}

function deleteCustomer(account) {
    if (!confirm('Are you sure you want to delete this customer account? This action cannot be undone.')) {
        return;
    }
    
    let customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customer = customers.find(c => c.account === account);
    customers = customers.filter(c => c.account !== account);
    localStorage.setItem('customers', JSON.stringify(customers));
    
    logTransaction(account, 'ACCOUNT_DELETION', 0, 'Customer account deleted by admin');
    logToTerminal(`Customer deleted: ${customer.name}`, 'warning', 'ADMIN');
    
    showToast('Customer account deleted successfully', 'success');
    document.getElementById('searchResult').innerHTML = '';
    loadCustomers();
    loadDashboard();
}

// ============================================
// TRANSACTION MANAGEMENT
// ============================================

function processTransaction() {
    const account = document.getElementById('transAccount').value.trim();
    const amount = parseFloat(document.getElementById('transAmount').value);
    const currency = document.getElementById('transCurrency').value;
    const type = document.getElementById('transType').value;
    const description = document.getElementById('transDesc').value.trim() || 'Admin transaction';
    
    if (!account || !amount || amount <= 0) {
        showToast('Please enter valid account number and amount', 'error');
        return;
    }
    
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customer = customers.find(c => c.account === account || c.tenDigitAccount === account);
    
    if (!customer) {
        showToast('Customer not found', 'error');
        return;
    }
    
    let profitBalance = parseFloat(localStorage.getItem('profit')) || 0;
    let mainBalance = parseFloat(localStorage.getItem('mainBalance')) || 0;
    
    if (type === 'debit') {
        // Check balance
        const currentBalance = currency === 'NGN' ? customer.balance :
                            currency === 'USD' ? customer.balanceUSD :
                            currency === 'EUR' ? customer.balanceEUR : customer.balanceGBP;
        
        if (currentBalance < amount) {
            showToast('Insufficient funds. Current balance: ' + currentBalance.toLocaleString() + ' ' + currency, 'error');
            return;
        }
        
        // Debit customer
        if (currency === 'NGN') customer.balance -= amount;
        else if (currency === 'USD') customer.balanceUSD -= amount;
        else if (currency === 'EUR') customer.balanceEUR -= amount;
        else customer.balanceGBP -= amount;
        
        // Add profit (1% of debit)
        profitBalance += amount * 0.01;
        
    } else {
        // Credit customer
        if (currency === 'NGN') customer.balance += amount;
        else if (currency === 'USD') customer.balanceUSD += amount;
        else if (currency === 'EUR') customer.balanceEUR += amount;
        else customer.balanceGBP += amount;
        
        // Add profit (2% of credit)
        profitBalance += amount * 0.02;
        
        // Add to main balance
        mainBalance += amount;
    }
    
    // Create ledger entry
    const ledgerEntry = {
        date: new Date().toISOString(),
        type: type,
        amount: amount,
        currency: currency,
        description: description
    };
    customer.ledger.push(ledgerEntry);
    
    // Save changes
    localStorage.setItem('customers', JSON.stringify(customers));
    localStorage.setItem('profit', profitBalance.toString());
    localStorage.setItem('mainBalance', mainBalance.toString());
    
    // Log transaction
    logTransaction(account, type.toUpperCase(), amount, description, currency);
    logToTerminal(`Transaction processed: ${type.toUpperCase()} ${amount} ${currency} - ${customer.name}`, type === 'debit' ? 'warning' : 'success', 'TRANSACTION');
    
    // Update UI
    updateProfitDisplay();
    loadDashboard();
    
    showToast(`Transaction Successful: ${type.toUpperCase()} ${amount.toLocaleString()} ${currency}`, 'success');
    
    // Clear form
    document.getElementById('transAccount').value = '';
    document.getElementById('transAmount').value = '';
    document.getElementById('transDesc').value = '';
}

function transferProfit() {
    let profitBalance = parseFloat(localStorage.getItem('profit')) || 0;
    let mainBalance = parseFloat(localStorage.getItem('mainBalance')) || 0;
    
    if (profitBalance <= 0) {
        showToast('No profit balance to transfer', 'error');
        return;
    }
    
    mainBalance += profitBalance;
    
    localStorage.setItem('mainBalance', mainBalance.toString());
    localStorage.setItem('profit', '0');
    
    updateProfitDisplay();
    loadDashboard();
    
    logToTerminal(`Profit transferred to main balance: $${profitBalance.toLocaleString()}`, 'success', 'PROFIT');
    showToast(`$${profitBalance.toLocaleString()} profit transferred to main balance`, 'success');
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

function loadDashboard() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    const profitBalance = parseFloat(localStorage.getItem('profit')) || 0;
    const mainBalance = parseFloat(localStorage.getItem('mainBalance')) || 0;
    
    // Update stats
    document.getElementById('total-customers').textContent = customers.length;
    document.getElementById('main-balance').textContent = '$' + mainBalance.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('profit-balance').textContent = '$' + profitBalance.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('total-transactions').textContent = transactions.length;
    
    updateProfitDisplay();
    loadTerminalLogs();
    loadBankConnections();
}

function updateProfitDisplay() {
    const profitBalance = parseFloat(localStorage.getItem('profit')) || 0;
    const profitDisplay = document.getElementById('profitBalanceDisplay');
    if (profitDisplay) {
        profitDisplay.textContent = '$' + profitBalance.toLocaleString('en-US', {minimumFractionDigits: 2});
    }
}

function loadCustomers() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const tbody = document.getElementById('customerTableBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.account}</td>
            <td>${customer.name}</td>
            <td>${customer.phone}</td>
            <td>₦${customer.balance.toLocaleString('en-NG', {minimumFractionDigits: 2})}</td>
            <td><span class="status status-success">${customer.status.toUpperCase()}</span></td>
            <td>
                <button onclick="searchCustomer('${customer.account}')" style="width: auto; padding: 5px 10px; font-size: 0.85rem;">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadTransactions() {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    const tbody = document.getElementById('transactionTableBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Show last 20 transactions
    const recentTransactions = transactions.slice(-20).reverse();
    
    recentTransactions.forEach(tx => {
        const row = document.createElement('tr');
        const amountColor = tx.type === 'CREDIT' ? '#22c55e' : '#ef4444';
        row.innerHTML = `
            <td>${tx.id}</td>
            <td>${tx.account}</td>
            <td style="color: ${amountColor}; font-weight: 600;">${tx.type}</td>
            <td>${tx.currency} ${tx.amount.toLocaleString()}</td>
            <td>${new Date(tx.date).toLocaleString()}</td>
            <td><span class="status status-success">${tx.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// ============================================
// TERMINAL FUNCTIONS
// ============================================

function loadTerminalLogs() {
    const terminalLogs = JSON.parse(localStorage.getItem('terminalLogs')) || [];
    const terminalDiv = document.getElementById('adminTerminal');
    
    if (!terminalDiv) return;
    
    terminalDiv.innerHTML = `
        <p style="color: #8b5cf6;">═══════════════════════════════════════════════════════════</p>
        <p style="color: #22c55e;">🏦 GLOBAL PILGRIM BANK - ADMINISTRATOR TERMINAL</p>
        <p style="color: #8b5cf6;">═══════════════════════════════════════════════════════════</p>
        <p>Owner: ${ADMIN_CONFIG.name}</p>
        <p>Bank Code: ${BANK_INFO.code}</p>
        <p>SWIFT: ${BANK_INFO.swift}</p>
        <p>Current Balance: $${localStorage.getItem('mainBalance')}</p>
        <p>Profit Balance: $${localStorage.getItem('profit')}</p>
        <p style="color: #8b5cf6;">═══════════════════════════════════════════════════════════</p>
    `;
    
    // Show last 50 logs
    const recentLogs = terminalLogs.slice(-50);
    
    recentLogs.forEach(log => {
        const colorMap = {
            'info': '#22c55e',
            'success': '#16a34a',
            'warning': '#f59e0b',
            'error': '#ef4444',
            'signal': '#8b5cf6',
            'transfer': '#3b82f6'
        };
        
        const logEntry = document.createElement('p');
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        logEntry.innerHTML = `<span style="color: #64748b;">[${timestamp}]</span> <span style="color: ${colorMap[log.type]};">[${log.source}]</span> ${log.message}`;
        terminalDiv.appendChild(logEntry);
    });
}

function loadBankConnections() {
    const connections = JSON.parse(localStorage.getItem('bankConnections')) || [];
    const connectionsDiv = document.getElementById('bankConnectionsList');
    
    if (!connectionsDiv) return;
    
    if (connections.length === 0) {
        connectionsDiv.innerHTML = '<p style="color: #94a3b8;">No bank connections yet</p>';
        return;
    }
    
    let connectionsHTML = '';
    connections.forEach(connection => {
        const statusColor = connection.status === 'connected' ? '#22c55e' : '#ef4444';
        
        connectionsHTML += `
            <div style="background: rgba(30, 41, 59, 0.5); padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 3px solid ${statusColor};">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <p style="color: #e2e8f0; font-weight: 600;">${connection.bankName}</p>
                        <p style="color: #64748b; font-size: 0.85rem;">Code: ${connection.bankCode} | Type: ${connection.type}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="color: ${statusColor}; font-weight: 600;">${connection.status.toUpperCase()}</p>
                        <p style="color: #94a3b8; font-size: 0.8rem;">Latency: ${connection.latency}ms</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    connectionsDiv.innerHTML = connectionsHTML;
}

function addNewBankConnection() {
    const bankCode = document.getElementById('newBankCode').value.trim();
    const bankName = document.getElementById('newBankName').value.trim();
    const bankType = document.getElementById('newBankType').value;
    
    if (!bankCode || !bankName) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (addBankConnection(bankCode, bankName, bankType)) {
        document.getElementById('newBankCode').value = '';
        document.getElementById('newBankName').value = '';
        loadBankConnections();
    }
}

// ============================================
// TRANSACTION LOGGING
// ============================================

function logTransaction(account, type, amount, description, currency = 'NGN') {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    
    const transaction = {
        id: generateTransactionId(),
        account: account,
        type: type,
        amount: amount,
        currency: currency,
        description: description,
        status: 'completed',
        date: new Date().toISOString()
    };
    
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return 'TXN' + timestamp.toUpperCase() + random.toUpperCase();
}

// ============================================
// SECURITY & MONITORING
// ============================================

function logUnauthorizedAttempt(account = 'Unknown', phone = 'Unknown') {
    const attempts = JSON.parse(localStorage.getItem('attempts')) || [];
    
    attempts.push({
        date: new Date().toLocaleString(),
        account: account,
        phone: phone,
        ip: getCurrentIP(),
        location: 'Unknown Network',
        browser: navigator.userAgent.substring(0, 50) + '...'
    });
    
    localStorage.setItem('attempts', JSON.stringify(attempts));
}

function logNetworkActivity(type, status, details) {
    const networkLogs = JSON.parse(localStorage.getItem('networkLogs')) || [];
    
    networkLogs.push({
        timestamp: new Date().toISOString(),
        type: type,
        status: status,
        details: details,
        ip: getCurrentIP()
    });
    
    localStorage.setItem('networkLogs', JSON.stringify(networkLogs));
}

function loadAttempts() {
    const attempts = JSON.parse(localStorage.getItem('attempts')) || [];
    const logsDiv = document.getElementById('attemptLogs');
    
    if (!logsDiv) return;
    
    if (attempts.length === 0) {
        logsDiv.innerHTML = '<p style="color: #22c55e;">✅ No unauthorized login attempts</p>';
        return;
    }
    
    let display = '';
    attempts.slice(-20).reverse().forEach(attempt => {
        display += `
            <div style="padding: 10px; margin-bottom: 10px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                <p style="color: #ef4444; font-weight: 600;">${attempt.date}</p>
                <p style="color: #94a3b8;">Account: ${attempt.account} | Phone: ${attempt.phone}</p>
                <p style="color: #64748b;">IP: ${attempt.ip} | Browser: ${attempt.browser}</p>
            </div>
        `;
    });
    
    logsDiv.innerHTML = display;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

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

function getCurrentIP() {
    return localStorage.getItem('adminIP') || '192.168.1.' + Math.floor(Math.random() * 255);
}

function generateLogId() {
    return 'LOG' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function generateConnectionId() {
    return 'CONN' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============================================
// INITIALIZATION
// ============================================

// Set admin IP on first load
if (!localStorage.getItem('adminIP')) {
    localStorage.setItem('adminIP', '192.168.1.' + Math.floor(Math.random() * 255));
}

console.log('Global Pilgrim Bank System Initialized');
console.log('Owner: ' + ADMIN_CONFIG.name);
console.log('Bank Code: ' + BANK_INFO.code);
console.log('SWIFT: ' + BANK_INFO.swift);