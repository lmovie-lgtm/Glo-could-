// Global Pilgrim Bank - Customer Dashboard JavaScript
// Full money transfer functionality

let currentCustomer = null;
let autoTradingInterval = null;
let miningInterval = null;

// ============================================
// CUSTOMER DASHBOARD FUNCTIONS
// ============================================

function loadCustomerDashboard() {
    const customerData = localStorage.getItem('currentCustomer');
    
    if (!customerData) {
        alert('Session expired. Please login again.');
        window.location.href = 'customer-login.html';
        return;
    }
    
    currentCustomer = JSON.parse(customerData);
    
    // Refresh customer data from storage
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const freshCustomer = customers.find(c => c.account === currentCustomer.account);
    
    if (freshCustomer) {
        currentCustomer = freshCustomer;
        localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
    }
    
    // Update UI
    document.getElementById('customerName').textContent = 'Welcome, ' + currentCustomer.name;
    document.getElementById('accountNumber').textContent = currentCustomer.account;
    document.getElementById('serialNumber').textContent = currentCustomer.serial;
    
    // Update balances
    updateBalances();
    
    // Load transaction history
    loadCustomerTransactions();
    
    // Load virtual cards
    loadVirtualCards();
    
    // Check if wallet exists
    if (currentCustomer.pilgrimWallet) {
        document.getElementById('pilgrimWallet').textContent = currentCustomer.pilgrimWallet;
    }
    
    // Log to terminal
    logCustomerActivity('DASHBOARD_LOADED', 'Customer dashboard loaded');
}

function updateBalances() {
    document.getElementById('balanceNGN').textContent = '₦' + (currentCustomer.balance || 0).toLocaleString('en-NG', {minimumFractionDigits: 2});
    document.getElementById('balanceUSD').textContent = '$' + (currentCustomer.balanceUSD || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('balanceEUR').textContent = '€' + (currentCustomer.balanceEUR || 0).toLocaleString('de-DE', {minimumFractionDigits: 2});
    document.getElementById('balanceGBP').textContent = '£' + (currentCustomer.balanceGBP || 0).toLocaleString('en-GB', {minimumFractionDigits: 2});
    
    // Update profit balance if element exists
    const profitDisplay = document.getElementById('profitBalanceDisplay');
    if (profitDisplay) {
        profitDisplay.textContent = '$' + (currentCustomer.profitBalance || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
    }
}

// ============================================
// MONEY TRANSFER FUNCTIONS - FULL FUNCTIONALITY
// ============================================

function sendMoney() {
    const transferType = document.getElementById('transferType').value;
    const amount = parseFloat(document.getElementById('sendAmount').value);
    const currency = document.getElementById('sendCurrency').value;
    const description = document.getElementById('sendDescription').value.trim() || 'Transfer';
    const recipientPin = document.getElementById('recipientPin') ? document.getElementById('recipientPin').value : null;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    // Check balance
    const currentBalance = currency === 'NGN' ? currentCustomer.balance :
                         currency === 'USD' ? currentCustomer.balanceUSD :
                         currency === 'EUR' ? currentCustomer.balanceEUR : currentCustomer.balanceGBP;
    
    if (currentBalance < amount) {
        showToast('Insufficient funds. Current balance: ' + currentBalance.toLocaleString() + ' ' + currency, 'error');
        return;
    }
    
    let recipientInfo = '';
    let recipientAccount = '';
    let recipientName = '';
    let bankCode = '';
    
    if (transferType === 'local') {
        const bank = document.getElementById('recipientBank').value;
        const account = document.getElementById('recipientAccount').value.trim();
        const name = document.getElementById('recipientName').value.trim();
        
        if (!account || !name) {
            showToast('Please enter recipient account and name', 'error');
            return;
        }
        
        recipientAccount = account;
        recipientName = name;
        bankCode = bank;
        recipientInfo = `${bank} - ${account} (${name})`;
        
        // Check if it's a Global Pilgrim Bank transfer
        if (bank === 'GPB') {
            processInternalTransfer(account, amount, currency, description, name);
            return;
        }
    } else {
        const bank = document.getElementById('internationalBank').value.trim();
        const account = document.getElementById('recipientAccount').value.trim();
        const name = document.getElementById('recipientName').value.trim();
        const swift = document.getElementById('swiftCode').value.trim();
        const country = document.getElementById('recipientCountry').value;
        
        if (!account || !name || !swift) {
            showToast('Please fill in all international transfer details', 'error');
            return;
        }
        
        recipientAccount = account;
        recipientName = name;
        bankCode = swift;
        recipientInfo = `${bank} (${country}) - ${account} - SWIFT: ${swift}`;
    }
    
    // Process external transfer
    processExternalTransfer(transferType, bankCode, recipientAccount, recipientName, amount, currency, description, recipientInfo);
}

function processInternalTransfer(accountNumber, amount, currency, description, recipientName) {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    const recipientIndex = customers.findIndex(c => c.account === accountNumber || c.tenDigitAccount === accountNumber);
    
    if (recipientIndex === -1) {
        showToast('Recipient account not found in Global Pilgrim Bank', 'error');
        return;
    }
    
    // Debit sender
    if (currency === 'NGN') customers[customerIndex].balance -= amount;
    else if (currency === 'USD') customers[customerIndex].balanceUSD -= amount;
    else if (currency === 'EUR') customers[customerIndex].balanceEUR -= amount;
    else customers[customerIndex].balanceGBP -= amount;
    
    // Credit recipient
    if (currency === 'NGN') customers[recipientIndex].balance += amount;
    else if (currency === 'USD') customers[recipientIndex].balanceUSD += amount;
    else if (currency === 'EUR') customers[recipientIndex].balanceEUR += amount;
    else customers[recipientIndex].balanceGBP += amount;
    
    // Add ledger entries
    const transferId = 'TXN' + Date.now();
    
    customers[customerIndex].ledger.push({
        date: new Date().toISOString(),
        type: 'debit',
        amount: amount,
        currency: currency,
        description: `Internal Transfer to ${recipientName} (${accountNumber}): ${description}`
    });
    
    customers[recipientIndex].ledger.push({
        date: new Date().toISOString(),
        type: 'credit',
        amount: amount,
        currency: currency,
        description: `Internal Transfer from ${currentCustomer.name}: ${description}`
    });
    
    localStorage.setItem('customers', JSON.stringify(customers));
    
    // Update session
    currentCustomer = customers[customerIndex];
    localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
    
    // Update UI
    updateBalances();
    loadCustomerTransactions();
    
    logCustomerActivity('INTERNAL_TRANSFER', `Transferred ${amount} ${currency} to ${recipientName}`);
    showToast(`Transfer successful! ${amount.toLocaleString()} ${currency} sent to ${recipientName}`, 'success');
    
    // Clear form
    clearTransferForm();
}

function processExternalTransfer(transferType, bankCode, recipientAccount, recipientName, amount, currency, description, recipientInfo) {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    
    // Calculate fee
    const fee = amount * (transferType === 'local' ? 0.01 : 0.02);
    const totalAmount = amount + fee;
    
    // Check if customer has enough for amount + fee
    const currentBalance = currency === 'NGN' ? currentCustomer.balance :
                         currency === 'USD' ? currentCustomer.balanceUSD :
                         currency === 'EUR' ? currentCustomer.balanceEUR : currentCustomer.balanceGBP;
    
    if (currentBalance < totalAmount) {
        showToast('Insufficient funds. Amount + Fee: ' + totalAmount.toLocaleString() + ' ' + currency, 'error');
        return;
    }
    
    // Debit customer (amount + fee)
    if (currency === 'NGN') customers[customerIndex].balance -= totalAmount;
    else if (currency === 'USD') customers[customerIndex].balanceUSD -= totalAmount;
    else if (currency === 'EUR') customers[customerIndex].balanceEUR -= totalAmount;
    else customers[customerIndex].balanceGBP -= totalAmount;
    
    // Create transfer record
    const transferId = generateTransferId();
    
    const transferData = {
        id: transferId,
        sourceBank: 'Global Pilgrim Bank',
        sourceAccount: currentCustomer.account,
        destinationBank: bankCode,
        destinationAccount: recipientAccount,
        recipientName: recipientName,
        amount: amount,
        currency: currency,
        fee: fee,
        description: description,
        type: transferType === 'local' ? 'LOCAL_TRANSFER' : 'SWIFT_TRANSFER',
        status: 'pending',
        createdAt: new Date().toISOString(),
        signal: generateTransferSignal()
    };
    
    // Add ledger entry
    customers[customerIndex].ledger.push({
        date: new Date().toISOString(),
        type: 'debit',
        amount: amount,
        currency: currency,
        description: `${transferType === 'local' ? 'Local' : 'International'} Transfer to ${recipientInfo}: ${description}`
    });
    
    customers[customerIndex].ledger.push({
        date: new Date().toISOString(),
        type: 'debit',
        amount: fee,
        currency: currency,
        description: `${transferType === 'local' ? 'Local' : 'International'} Transfer Fee`
    });
    
    // Add to pending transfers
    const pendingTransfers = JSON.parse(localStorage.getItem('pendingTransfers')) || [];
    pendingTransfers.push(transferData);
    localStorage.setItem('pendingTransfers', JSON.stringify(pendingTransfers));
    
    localStorage.setItem('customers', JSON.stringify(customers));
    
    // Update session
    currentCustomer = customers[customerIndex];
    localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
    
    // Log signal transfer
    logSignalTransfer(transferData, 'initiated');
    logCustomerActivity('EXTERNAL_TRANSFER', `Initiated transfer of ${amount} ${currency} to ${recipientInfo}`);
    
    // Simulate external bank processing
    simulateExternalBankProcessing(transferData);
    
    // Update UI
    updateBalances();
    loadCustomerTransactions();
    
    showToast(`Transfer initiated! ${amount.toLocaleString()} ${currency} being sent to ${recipientInfo}. Fee: ${fee.toLocaleString()} ${currency}`, 'success');
    
    // Clear form
    clearTransferForm();
}

function simulateExternalBankProcessing(transferData) {
    // Simulate the signal being sent to external bank
    setTimeout(() => {
        // Send acknowledgment signal
        logSignalTransfer(transferData, 'acknowledged');
        
        // Simulate processing at external bank
        setTimeout(() => {
            transferData.status = 'processing';
            logSignalTransfer(transferData, 'processing');
            
            // Final confirmation
            setTimeout(() => {
                transferData.status = 'completed';
                transferData.completedAt = new Date().toISOString();
                logSignalTransfer(transferData, 'completed');
                
                // Update pending transfers
                const pendingTransfers = JSON.parse(localStorage.getItem('pendingTransfers')) || [];
                const index = pendingTransfers.findIndex(t => t.id === transferData.id);
                if (index !== -1) {
                    pendingTransfers[index] = transferData;
                    localStorage.setItem('pendingTransfers', JSON.stringify(pendingTransfers));
                }
                
                logCustomerActivity('TRANSFER_COMPLETED', `Transfer completed: ${transferData.amount} ${transferData.currency} to ${transferData.destinationBank}`);
            }, 3000);
        }, 2000);
    }, 1000);
}

function generateTransferSignal() {
    const timestamp = Date.now().toString(36);
    const random = generateRandomString(16);
    return `SIG-${timestamp}-${random}`;
}

function clearTransferForm() {
    document.getElementById('recipientAccount').value = '';
    document.getElementById('recipientName').value = '';
    document.getElementById('sendAmount').value = '';
    document.getElementById('sendDescription').value = '';
    if (document.getElementById('recipientPin')) {
        document.getElementById('recipientPin').value = '';
    }
}

// ============================================
// RECEIVE MONEY FUNCTIONS
// ============================================

function receiveMoney() {
    const senderBank = document.getElementById('senderBank').value.trim();
    const senderAccount = document.getElementById('senderAccount').value.trim();
    const senderName = document.getElementById('senderName').value.trim();
    const amount = parseFloat(document.getElementById('receiveAmount').value);
    const currency = document.getElementById('receiveCurrency').value;
    const reference = document.getElementById('referenceNumber').value.trim();
    const description = document.getElementById('receiveDescription').value.trim();
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (!senderBank || !senderAccount || !senderName) {
        showToast('Please fill in sender details', 'error');
        return;
    }
    
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    
    // Credit customer
    if (currency === 'NGN') customers[customerIndex].balance += amount;
    else if (currency === 'USD') customers[customerIndex].balanceUSD += amount;
    else if (currency === 'EUR') customers[customerIndex].balanceEUR += amount;
    else customers[customerIndex].balanceGBP += amount;
    
    // Create incoming transfer record
    const transferId = generateTransferId();
    
    const transferData = {
        id: transferId,
        sourceBank: senderBank,
        sourceAccount: senderAccount,
        senderName: senderName,
        destinationBank: 'Global Pilgrim Bank',
        destinationAccount: currentCustomer.account,
        recipientName: currentCustomer.name,
        amount: amount,
        currency: currency,
        reference: reference,
        description: description || 'Incoming transfer',
        type: 'INCOMING_TRANSFER',
        status: 'received',
        receivedAt: new Date().toISOString(),
        signal: generateTransferSignal()
    };
    
    // Add ledger entry
    customers[customerIndex].ledger.push({
        date: new Date().toISOString(),
        type: 'credit',
        amount: amount,
        currency: currency,
        description: `Incoming Transfer from ${senderName} (${senderBank}): ${description}`
    });
    
    // Log to pending transfers for tracking
    const pendingTransfers = JSON.parse(localStorage.getItem('pendingTransfers')) || [];
    pendingTransfers.push(transferData);
    localStorage.setItem('pendingTransfers', JSON.stringify(pendingTransfers));
    
    // Log signal
    logSignalTransfer(transferData, 'received');
    logCustomerActivity('MONEY_RECEIVED', `Received ${amount} ${currency} from ${senderName} (${senderBank})`);
    
    localStorage.setItem('customers', JSON.stringify(customers));
    
    // Update session
    currentCustomer = customers[customerIndex];
    localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
    
    // Update UI
    updateBalances();
    loadCustomerTransactions();
    
    showToast(`Successfully received ${amount.toLocaleString()} ${currency} from ${senderName}!`, 'success');
    
    // Clear form
    document.getElementById('senderBank').value = '';
    document.getElementById('senderAccount').value = '';
    document.getElementById('senderName').value = '';
    document.getElementById('receiveAmount').value = '';
    document.getElementById('referenceNumber').value = '';
    document.getElementById('receiveDescription').value = '';
}

// ============================================
// WITHDRAWAL FUNCTIONS
// ============================================

function withdrawFunds() {
    const withdrawType = document.getElementById('withdrawType').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const currency = document.getElementById('withdrawCurrency').value;
    const beneficiaryName = document.getElementById('beneficiaryName').value.trim();
    const beneficiaryAccount = document.getElementById('beneficiaryAccount').value.trim();
    const beneficiaryBank = document.getElementById('beneficiaryBank').value.trim();
    const swiftCode = document.getElementById('withdrawSwiftCode').value.trim();
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (!beneficiaryName || !beneficiaryAccount) {
        showToast('Please fill in beneficiary details', 'error');
        return;
    }
    
    // Determine which balance to withdraw from
    let balanceSource = '';
    if (withdrawType === 'main') {
        balanceSource = currency === 'NGN' ? currentCustomer.balance :
                       currency === 'USD' ? currentCustomer.balanceUSD :
                       currency === 'EUR' ? currentCustomer.balanceEUR : currentCustomer.balanceGBP;
    } else if (withdrawType === 'profit') {
        balanceSource = currentCustomer.profitBalance || 0;
    } else if (withdrawType === 'robot_profit') {
        balanceSource = currentCustomer.robotProfit || 0;
    }
    
    if (balanceSource < amount) {
        showToast('Insufficient funds. Available: ' + balanceSource.toLocaleString() + ' ' + currency, 'error');
        return;
    }
    
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    
    // Calculate withdrawal fee
    const fee = amount * 0.01;
    const totalAmount = amount + fee;
    
    // Deduct from appropriate balance
    if (withdrawType === 'main') {
        if (currency === 'NGN') customers[customerIndex].balance -= totalAmount;
        else if (currency === 'USD') customers[customerIndex].balanceUSD -= totalAmount;
        else if (currency === 'EUR') customers[customerIndex].balanceEUR -= totalAmount;
        else customers[customerIndex].balanceGBP -= totalAmount;
    } else if (withdrawType === 'profit') {
        customers[customerIndex].profitBalance -= totalAmount;
    } else if (withdrawType === 'robot_profit') {
        customers[customerIndex].robotProfit -= totalAmount;
    }
    
    // Create withdrawal record
    const withdrawalId = generateTransferId();
    
    const withdrawalData = {
        id: withdrawalId,
        account: currentCustomer.account,
        accountName: currentCustomer.name,
        amount: amount,
        currency: currency,
        fee: fee,
        withdrawType: withdrawType,
        beneficiaryName: beneficiaryName,
        beneficiaryAccount: beneficiaryAccount,
        beneficiaryBank: beneficiaryBank,
        swiftCode: swiftCode,
        status: 'processing',
        createdAt: new Date().toISOString(),
        signal: generateTransferSignal()
    };
    
    // Add ledger entry
    customers[customerIndex].ledger.push({
        date: new Date().toISOString(),
        type: 'debit',
        amount: amount,
        currency: currency,
        description: `Withdrawal to ${beneficiaryName} (${beneficiaryBank})`
    });
    
    customers[customerIndex].ledger.push({
        date: new Date().toISOString(),
        type: 'debit',
        amount: fee,
        currency: currency,
        description: 'Withdrawal Processing Fee'
    });
    
    // Add to pending transfers
    const pendingTransfers = JSON.parse(localStorage.getItem('pendingTransfers')) || [];
    pendingTransfers.push(withdrawalData);
    localStorage.setItem('pendingTransfers', JSON.stringify(pendingTransfers));
    
    // Log signal
    logSignalTransfer(withdrawalData, 'initiated');
    logCustomerActivity('WITHDRAWAL', `Withdrawing ${amount} ${currency} (${withdrawType}) to ${beneficiaryName}`);
    
    localStorage.setItem('customers', JSON.stringify(customers));
    
    // Update session
    currentCustomer = customers[customerIndex];
    localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
    
    // Simulate bank processing
    simulateWithdrawalProcessing(withdrawalData);
    
    // Update UI
    updateBalances();
    loadCustomerTransactions();
    
    showToast(`Withdrawal initiated! ${amount.toLocaleString()} ${currency} being sent to ${beneficiaryName}. Fee: ${fee.toLocaleString()} ${currency}`, 'success');
    
    // Clear form
    document.getElementById('withdrawAmount').value = '';
    document.getElementById('beneficiaryName').value = '';
    document.getElementById('beneficiaryAccount').value = '';
    document.getElementById('beneficiaryBank').value = '';
    document.getElementById('withdrawSwiftCode').value = '';
}

function simulateWithdrawalProcessing(withdrawalData) {
    setTimeout(() => {
        withdrawalData.status = 'processing';
        logSignalTransfer(withdrawalData, 'processing');
        
        setTimeout(() => {
            withdrawalData.status = 'completed';
            withdrawalData.completedAt = new Date().toISOString();
            logSignalTransfer(withdrawalData, 'completed');
            
            const pendingTransfers = JSON.parse(localStorage.getItem('pendingTransfers')) || [];
            const index = pendingTransfers.findIndex(t => t.id === withdrawalData.id);
            if (index !== -1) {
                pendingTransfers[index] = withdrawalData;
                localStorage.setItem('pendingTransfers', JSON.stringify(pendingTransfers));
            }
            
            logCustomerActivity('WITHDRAWAL_COMPLETED', `Withdrawal completed: ${withdrawalData.amount} ${withdrawalData.currency}`);
        }, 5000);
    }, 2000);
}

// ============================================
// VIRTUAL CARD FUNCTIONS
// ============================================

function requestVirtualCard(cardType) {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    
    if (customerIndex !== -1) {
        // Check if customer has any card of this type
        const existingCard = customers[customerIndex].virtualCards && 
                            customers[customerIndex].virtualCards.find(c => c.type === cardType);
        
        if (existingCard) {
            showToast(`You already have a ${cardType} card ending in ${existingCard.last4}`, 'error');
            return;
        }
        
        // Generate card
        const cardNumber = generateCardNumber();
        const expiryDate = generateExpiryDate();
        const cvv = generateCVV();
        
        const newCard = {
            type: cardType,
            number: cardNumber,
            last4: cardNumber.slice(-4),
            expiry: expiryDate,
            cvv: cvv,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        if (!customers[customerIndex].virtualCards) {
            customers[customerIndex].virtualCards = [];
        }
        
        customers[customerIndex].virtualCards.push(newCard);
        
        localStorage.setItem('customers', JSON.stringify(customers));
        
        // Update session
        currentCustomer = customers[customerIndex];
        localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
        
        // Update UI
        loadVirtualCards();
        
        logCustomerActivity('CARD_CREATED', `Created ${cardType} virtual card`);
        showToast(`${cardType} card created successfully!`, 'success');
        alert(`Your new ${cardType} card details:\n\nCard Number: ${cardNumber}\nExpiry: ${expiryDate}\nCVV: ${cvv}\n\nPlease keep these details secure.`);
    }
}

function loadVirtualCards() {
    const cardsDiv = document.getElementById('virtualCardsList');
    
    if (!currentCustomer.virtualCards || currentCustomer.virtualCards.length === 0) {
        cardsDiv.innerHTML = '<p style="color: #94a3b8;">No virtual cards yet. Request one above.</p>';
        return;
    }
    
    let cardsHTML = '';
    currentCustomer.virtualCards.forEach(card => {
        const cardColor = card.type === 'Visa' ? '#1a1f71' : 
                         card.type === 'Mastercard' ? '#eb001b' : '#16a34a';
        
        cardsHTML += `
            <div style="background: ${cardColor}; padding: 20px; border-radius: 10px; margin-bottom: 10px; color: white;">
                <h4 style="margin-bottom: 10px;">${card.type}</h4>
                <p style="font-size: 1.2rem; letter-spacing: 2px; margin-bottom: 10px;">•••• •••• •••• ${card.last4}</p>
                <p style="font-size: 0.9rem;">Expiry: ${card.expiry} | Status: ${card.status.toUpperCase()}</p>
                <p style="font-size: 0.85rem; margin-top: 5px;">Created: ${new Date(card.createdAt).toLocaleDateString()}</p>
            </div>
        `;
    });
    
    cardsDiv.innerHTML = cardsHTML;
}

function generateCardNumber() {
    const prefix = '4'; // Visa prefix (simplified)
    let number = prefix;
    for (let i = 0; i < 15; i++) {
        number += Math.floor(Math.random() * 10);
    }
    return number.replace(/(.{4})/g, '$1 ').trim();
}

function generateExpiryDate() {
    const today = new Date();
    const year = today.getFullYear() + 3;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    return `${month}/${year.toString().slice(-2)}`;
}

function generateCVV() {
    return String(Math.floor(100 + Math.random() * 900));
}

// ============================================
// PILGRIM COIN FUNCTIONS
// ============================================

function generatePilgrimWallet() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    
    if (customerIndex !== -1) {
        const walletAddress = 'PGM' + generateRandomString(30);
        
        customers[customerIndex].pilgrimWallet = walletAddress;
        customers[customerIndex].pilgrimBalance = 0;
        customers[customerIndex].miningActive = true;
        
        localStorage.setItem('customers', JSON.stringify(customers));
        
        // Update session
        currentCustomer = customers[customerIndex];
        localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
        
        document.getElementById('pilgrimWallet').textContent = walletAddress;
        
        logCustomerActivity('WALLET_CREATED', 'Generated Pilgrim Coin wallet');
        showToast('Pilgrim Coin wallet generated!', 'success');
        
        // Start mining
        startMiningEngine();
    }
}

function minePilgrimCoin() {
    if (!currentCustomer.pilgrimWallet) {
        showToast('Please generate a wallet first', 'error');
        return;
    }
    
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    
    if (customerIndex !== -1) {
        const miningAmount = 0.000002;
        customers[customerIndex].pilgrimBalance += miningAmount;
        
        // Convert to USD (1 PGM = $0.50)
        const usdValue = miningAmount * 0.5;
        customers[customerIndex].balanceUSD += usdValue;
        
        // Add ledger entry
        customers[customerIndex].ledger.push({
            date: new Date().toISOString(),
            type: 'mining',
            amount: usdValue,
            currency: 'USD',
            description: `Pilgrim Coin mining: ${miningAmount} PGM ($${usdValue})`
        });
        
        localStorage.setItem('customers', JSON.stringify(customers));
        
        // Update session
        currentCustomer = customers[customerIndex];
        localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
        
        // Update UI
        updateBalances();
        loadCustomerTransactions();
        
        logCustomerActivity('MINING', `Mined ${miningAmount} PGM ($${usdValue})`);
        showToast(`Mined ${miningAmount} PGM ($${usdValue})`, 'success');
    }
}

function startMiningEngine() {
    if (miningInterval) {
        clearInterval(miningInterval);
    }
    
    miningInterval = setInterval(() => {
        const customers = JSON.parse(localStorage.getItem('customers')) || [];
        const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
        
        if (customerIndex !== -1 && customers[customerIndex].miningActive) {
            const miningAmount = 0.000002;
            customers[customerIndex].pilgrimBalance += miningAmount;
            
            const usdValue = miningAmount * 0.5;
            customers[customerIndex].balanceUSD += usdValue;
            
            customers[customerIndex].ledger.push({
                date: new Date().toISOString(),
                type: 'mining',
                amount: usdValue,
                currency: 'USD',
                description: `Auto mining: ${miningAmount} PGM`
            });
            
            localStorage.setItem('customers', JSON.stringify(customers));
            
            // Update session
            currentCustomer = customers[customerIndex];
            localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
            
            // Update UI
            updateBalances();
            loadCustomerTransactions();
        }
    }, 60000); // Mine every minute
}

function robotTrade() {
    if (!currentCustomer.pilgrimWallet) {
        showToast('Please generate a wallet first', 'error');
        return;
    }
    
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    
    if (customerIndex !== -1) {
        // Robot trades 0.5% of USD balance
        const tradeAmount = customers[customerIndex].balanceUSD * 0.005;
        
        if (tradeAmount > 0) {
            customers[customerIndex].balanceUSD += tradeAmount;
            customers[customerIndex].robotProfit = (customers[customerIndex].robotProfit || 0) + tradeAmount;
            
            customers[customerIndex].ledger.push({
                date: new Date().toISOString(),
                type: 'robot_trade',
                amount: tradeAmount,
                currency: 'USD',
                description: 'Robot trading profit (0.5%)'
            });
            
            localStorage.setItem('customers', JSON.stringify(customers));
            
            // Update session
            currentCustomer = customers[customerIndex];
            localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
            
            // Update UI
            updateBalances();
            loadCustomerTransactions();
            
            logCustomerActivity('ROBOT_TRADE', `Robot trade profit: $${tradeAmount.toFixed(4)}`);
            showToast(`Robot trade completed! Profit: $${tradeAmount.toFixed(4)}`, 'success');
        } else {
            showToast('Insufficient balance for robot trading', 'error');
        }
    }
}

// ============================================
// FOREX TRADING FUNCTIONS
// ============================================

function startAutoTrading() {
    if (autoTradingInterval) {
        showToast('Auto trading is already running', 'error');
        return;
    }
    
    showToast('Auto trading started! Robot will trade every 6 seconds.', 'success');
    logCustomerActivity('AUTO_TRADING', 'Started auto trading');
    
    autoTradingInterval = setInterval(() => {
        executeForexTrade();
    }, 6000); // Trade every 6 seconds
}

function stopAutoTrading() {
    if (autoTradingInterval) {
        clearInterval(autoTradingInterval);
        autoTradingInterval = null;
        showToast('Auto trading stopped', 'success');
        logCustomerActivity('AUTO_TRADING', 'Stopped auto trading');
    } else {
        showToast('Auto trading is not running', 'error');
    }
}

function executeForexTrade() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    
    if (customerIndex !== -1) {
        // Simulate forex trade with small profit
        const tradeProfit = Math.random() * 0.5 + 0.1; // $0.10 to $0.60
        
        customers[customerIndex].balanceUSD += tradeProfit;
        customers[customerIndex].robotProfit = (customers[customerIndex].robotProfit || 0) + tradeProfit;
        
        customers[customerIndex].ledger.push({
            date: new Date().toISOString(),
            type: 'forex_trade',
            amount: tradeProfit,
            currency: 'USD',
            description: 'MetaTrader auto trade profit'
        });
        
        localStorage.setItem('customers', JSON.stringify(customers));
        
        // Update session
        currentCustomer = customers[customerIndex];
        localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
        
        // Update UI
        updateBalances();
        loadCustomerTransactions();
    }
}

function viewForexBalance() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customer = customers.find(c => c.account === currentCustomer.account);
    
    if (customer) {
        const balance = customer.balanceUSD || 0;
        const profit = customer.robotProfit || 0;
        alert(`Forex Trading Balance\n\nMetaTrader 4/5 - Server: 6G-001\n\nCurrent Balance: $${balance.toFixed(2)}\nRobot Profit: $${profit.toFixed(2)}\nTotal: $${(balance + profit).toFixed(2)}\n\nAuto Trading: ${autoTradingInterval ? 'ACTIVE' : 'INACTIVE'}`);
    }
}

// ============================================
// ACCOUNT SETTINGS
// ============================================

function changePin() {
    const newPin = document.getElementById('newPin').value.trim();
    
    if (!newPin || newPin.length !== 4 || isNaN(newPin)) {
        showToast('Please enter a valid 4-digit PIN', 'error');
        return;
    }
    
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    
    if (customerIndex !== -1) {
        customers[customerIndex].loginPin = newPin;
        
        localStorage.setItem('customers', JSON.stringify(customers));
        
        // Update session
        currentCustomer = customers[customerIndex];
        localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
        
        document.getElementById('newPin').value = '';
        
        logCustomerActivity('PIN_CHANGED', 'Login PIN updated');
        showToast('PIN updated successfully!', 'success');
    }
}

// ============================================
// TRANSACTION HISTORY
// ============================================

function loadCustomerTransactions() {
    const tbody = document.getElementById('customerTransactionBody');
    
    if (!tbody) return;
    
    if (!currentCustomer.ledger || currentCustomer.ledger.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">No transactions yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    // Show last 20 transactions
    const recentTransactions = currentCustomer.ledger.slice(-20).reverse();
    
    recentTransactions.forEach(tx => {
        const row = document.createElement('tr');
        const amountColor = tx.type === 'credit' || tx.type === 'mining' || tx.type === 'robot_trade' ? '#22c55e' : '#ef4444';
        row.innerHTML = `
            <td>${new Date(tx.date).toLocaleString()}</td>
            <td style="color: ${amountColor}; font-weight: 600;">${tx.type.toUpperCase().replace('_', ' ')}</td>
            <td>${amountColor === '#22c55e' ? '+' : '-'}${tx.amount.toLocaleString()}</td>
            <td>${tx.currency}</td>
            <td>${tx.description}</td>
            <td><span class="status status-success">COMPLETED</span></td>
        `;
        tbody.appendChild(row);
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function logCustomerActivity(activity, details) {
    // This would log to the admin terminal for monitoring
    console.log(`[CUSTOMER] ${currentCustomer.name} - ${activity}: ${details}`);
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

function generateTransferId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return 'TXN' + timestamp.toUpperCase() + random.toUpperCase();
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

document.addEventListener('DOMContentLoaded', function() {
    // Check if customer login page
    if (document.getElementById('accountNumber')) {
        // This is login page, load sync status
        checkSyncStatus();
    }
});

function checkSyncStatus() {
    const lastSync = localStorage.getItem('customerLastSync');
    const today = new Date().toDateString();
    
    const syncButton = document.getElementById('syncButton');
    const syncStatus = document.getElementById('syncStatus');
    
    if (syncButton && syncStatus) {
        if (lastSync === today) {
            syncButton.disabled = true;
            syncButton.style.opacity = '0.5';
            syncStatus.textContent = '✅ Synced today: $5 credited';
            syncStatus.style.color = '#22c55e';
        } else {
            syncStatus.textContent = 'Click to sync and receive your $5 bonus';
        }
    }
}

function dailySync() {
    const lastSync = localStorage.getItem('customerLastSync');
    const today = new Date().toDateString();
    
    if (lastSync === today) {
        showToast('Already synced today. Come back tomorrow!', 'error');
        return;
    }
    
    // Check if user is logged in
    const currentCustomer = JSON.parse(localStorage.getItem('currentCustomer'));
    if (!currentCustomer) {
        alert('Please login first to sync your account');
        return;
    }
    
    // Add $5 bonus
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const customerIndex = customers.findIndex(c => c.account === currentCustomer.account);
    
    if (customerIndex !== -1) {
        customers[customerIndex].balanceUSD += 5;
        
        // Add ledger entry
        customers[customerIndex].ledger.push({
            date: new Date().toISOString(),
            type: 'credit',
            amount: 5,
            currency: 'USD',
            description: 'Daily sync bonus'
        });
        
        localStorage.setItem('customers', JSON.stringify(customers));
        localStorage.setItem('customerLastSync', today);
        localStorage.setItem('currentCustomer', JSON.stringify(customers[customerIndex]));
        
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.textContent = '✅ Synced successfully! $5 credited to your account.';
            syncStatus.style.color = '#22c55e';
        }
        
        showToast('$5 sync bonus credited to your account!', 'success');
    }
}