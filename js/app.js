/**
 * Main Application Logic
 * Ties together all modules and handles UI interactions
 */

class PakistanStockTaxApp {
    constructor() {
        // Initialize core modules
        this.fifoQueue = new FIFOQueue();
        this.taxCalculator = new TaxCalculator();
        this.storageManager = new StorageManager();
        this.whatIfScenarios = new WhatIfScenarios(this.fifoQueue, this.taxCalculator);
        this.pdfGenerator = new PDFGenerator();
        this.corporateActions = new CorporateActionsManager(this.fifoQueue, this.storageManager);

        // Initialize UI
        this.initializeEventListeners();
        this.setTodayDate();
        this.loadData();
        this.updateAllDisplays();
        this.initializeFormListeners(); // Live calculation

        console.log('✓ Pakistan Stock Tax Calculator initialized');
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Transaction form
        const form = document.getElementById('transactionForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddTransaction();
            });
        }

        // Filer status toggle
        const filerToggle = document.getElementById('filerStatus');
        if (filerToggle) {
            filerToggle.addEventListener('change', (e) => {
                this.handleFilerStatusChange(e.target.checked);
            });
        }
    }

    /**
     * Set today's date as default
     */
    setTodayDate() {
        const tradeDateInput = document.getElementById('tradeDate');
        const whatifDateInput = document.getElementById('whatifDate');
        const today = new Date().toISOString().split('T')[0];

        if (tradeDateInput) tradeDateInput.value = today;
        if (whatifDateInput) whatifDateInput.value = today;
    }

    /**
     * Handle adding a transaction
     */
    handleAddTransaction() {
        try {
            const type = document.getElementById('transactionType').value;
            const symbol = document.getElementById('symbol').value.toUpperCase();
            const quantity = parseFloat(document.getElementById('quantity').value);
            const price = parseFloat(document.getElementById('price').value);
            const tradeDate = document.getElementById('tradeDate').value;

            // Validate inputs
            if (!symbol || quantity <= 0 || price <= 0 || !tradeDate) {
                this.showErrorModal({
                    title: "Missing Information",
                    description: "Please fill in all fields to add a transaction.",
                    details: [
                        { label: 'Symbol', value: symbol || 'Not entered', type: symbol ? '' : 'danger' },
                        { label: 'Quantity', value: quantity > 0 ? quantity : 'Not entered', type: quantity > 0 ? '' : 'danger' },
                        { label: 'Price', value: price > 0 ? `Rs. ${price}` : 'Not entered', type: price > 0 ? '' : 'danger' },
                        { label: 'Date', value: tradeDate || 'Not selected', type: tradeDate ? '' : 'danger' }
                    ],
                    primaryAction: { label: 'OK', onclick: 'app.hideErrorModal()' }
                });
                return;
            }

            // For SELL transactions, check if we have enough shares
            if (type === 'SELL') {
                const holdings = this.fifoQueue.getHoldings();
                if (!holdings[symbol]) {
                    this.showErrorModal({
                        title: "Can't Sell Shares",
                        description: `You don't have any ${symbol} shares to sell.`,
                        details: [
                            { label: 'Symbol', value: symbol, type: '' },
                            { label: 'Available', value: '0 shares', type: 'danger' },
                            { label: 'Trying to sell', value: `${quantity} shares`, type: 'danger' }
                        ],
                        primaryAction: {
                            label: 'Add Buy First',
                            onclick: "app.hideErrorModal(); document.getElementById('transactionType').value = 'BUY';"
                        },
                        secondaryAction: { label: 'Cancel', onclick: 'app.hideErrorModal()' }
                    });
                    return;
                }

                if (holdings[symbol].totalQuantity < quantity) {
                    this.showErrorModal({
                        title: "Can't Sell Shares",
                        description: `You're trying to sell ${quantity} shares but you only own ${holdings[symbol].totalQuantity} ${symbol} shares.`,
                        details: [
                            { label: 'Available', value: `${holdings[symbol].totalQuantity} shares`, type: 'available' },
                            { label: 'Trying to sell', value: `${quantity} shares`, type: 'danger' }
                        ],
                        primaryAction: {
                            label: 'Fix Quantity',
                            onclick: 'app.hideErrorModal(); document.getElementById("quantity").focus();'
                        },
                        secondaryAction: { label: 'Cancel', onclick: 'app.hideErrorModal()' }
                    });
                    return;
                }
            }

            // Show loading for transaction processing
            this.showLoading('Processing transaction...', `Adding ${type} order for ${symbol}`);

            // Add transaction (with slight delay for UX)
            setTimeout(() => {
                try {
                    const result = this.fifoQueue.addTransaction(type, symbol, quantity, price, tradeDate);

                    this.hideLoading();

                    // Show success message
                    if (type === 'BUY') {
                        this.showMessage(
                            `Added BUY: ${quantity} shares of ${symbol} @ Rs. ${price}`,
                            'success'
                        );
                    } else {
                        const gain = result && result.capitalGain !== undefined ? result.capitalGain : 0;
                        this.showMessage(
                            `Added SELL: ${quantity} shares of ${symbol} @ Rs. ${price}. Capital Gain: Rs. ${gain.toFixed(2)}`,
                            'success'
                        );
                    }

                    // Reset form
                    document.getElementById('transactionForm').reset();
                    this.setTodayDate();

                    // Update displays
                    this.updateAllDisplays();

                    // Auto-save
                    this.storageManager.autoSave(this.fifoQueue.exportData());
                } catch (innerError) {
                    this.hideLoading();
                    this.showErrorModal({
                        title: "Transaction Failed",
                        description: innerError.message || "An error occurred while processing the transaction.",
                        primaryAction: { label: 'OK', onclick: 'app.hideErrorModal()' }
                    });
                    console.error(innerError);
                }
            }, 300);

        } catch (error) {
            this.hideLoading();
            this.showErrorModal({
                title: "Transaction Error",
                description: error.message || "An unexpected error occurred.",
                primaryAction: { label: 'OK', onclick: 'app.hideErrorModal()' }
            });
            console.error(error);
        }
    }

    /**
     * Handle filer status change
     */
    handleFilerStatusChange(isFiler) {
        this.taxCalculator.setFilerStatus(isFiler);

        const statusText = document.getElementById('filerStatusText');
        if (statusText) {
            statusText.textContent = isFiler ?
                'Current: Filer (15% flat rate)' :
                'Current: Non-Filer (15% flat rate)';
        }

        // Update displays with new tax calculations
        this.updateAllDisplays();

        this.showMessage(
            `Filer status updated to: ${isFiler ? 'Filer' : 'Non-Filer'}`,
            'info'
        );
    }

    /**
     * Update all displays
     */
    updateAllDisplays() {
        this.updateWelcomeState();
        this.updateHoldingsDisplay();
        this.updateRealizedGainsDisplay();
        this.updateTaxSummary();
        this.updateStorageInfo();
    }

    /**
     * Check if portfolio is empty (no transactions at all)
     */
    isPortfolioEmpty() {
        const data = this.fifoQueue.exportData();
        const holdings = this.fifoQueue.getHoldings();
        const realizedGains = this.fifoQueue.getRealizedGains();

        const hasTransactions = data.transactions && Object.keys(data.transactions).length > 0;
        const hasHoldings = Object.keys(holdings).length > 0;
        const hasSales = realizedGains.length > 0;

        return !hasTransactions && !hasHoldings && !hasSales;
    }

    /**
     * Update welcome state visibility
     */
    updateWelcomeState() {
        const welcomeContainer = document.getElementById('welcomeEmptyState');
        const taxSummaryHero = document.getElementById('taxSummaryHero');

        if (!welcomeContainer) return;

        if (this.isPortfolioEmpty()) {
            // Show welcome state, hide tax summary
            welcomeContainer.style.display = 'block';
            if (taxSummaryHero) taxSummaryHero.style.display = 'none';
            // Re-initialize Lucide icons for the welcome state
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } else {
            // Hide welcome state, show tax summary
            welcomeContainer.style.display = 'none';
            if (taxSummaryHero) taxSummaryHero.style.display = 'block';
        }
    }

    /**
     * Start guided tour (placeholder for future implementation)
     */
    startTour() {
        this.showMessage('Tour coming soon! For now, start by adding your first stock purchase.', 'info');
        this.switchTab('add');
    }

    /**
     * Update holdings display
     */
    updateHoldingsDisplay() {
        const container = document.getElementById('holdingsDisplay');
        if (!container) return;

        const holdings = this.fifoQueue.getHoldings();

        if (Object.keys(holdings).length === 0) {
            container.innerHTML = `
                <div class="empty-state-modern">
                    <div class="empty-state-icon">
                        <i data-lucide="briefcase"></i>
                    </div>
                    <h4 class="empty-state-title">No Holdings Yet</h4>
                    <p class="empty-state-text">Add your first stock purchase to start tracking your portfolio</p>
                    <button class="btn-modern" onclick="app.switchTab('add')" style="margin-top: 16px;">
                        <i data-lucide="plus" class="lucide-sm"></i>
                        Add Transaction
                    </button>
                </div>
            `;
            // Re-render Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        let html = '<div class="holdings-grid">';

        for (const symbol in holdings) {
            const holding = holdings[symbol];
            const avgCostFormatted = this.formatCurrency(holding.averageCost);
            const totalValueFormatted = this.formatCurrency(holding.totalCostBasis);

            html += `
                <div class="holding-card">
                    <div class="holding-card-header">
                        <div class="holding-symbol-badge">
                            <i data-lucide="trending-up" class="holding-icon"></i>
                            <span class="holding-symbol">${symbol}</span>
                        </div>
                        <div class="holding-shares">
                            <span class="shares-count">${holding.totalQuantity.toLocaleString()}</span>
                            <span class="shares-label">shares</span>
                        </div>
                    </div>
                    <div class="holding-card-body">
                        <div class="holding-stat">
                            <span class="holding-stat-label">Avg. Cost</span>
                            <span class="holding-stat-value">${avgCostFormatted}</span>
                        </div>
                        <div class="holding-stat">
                            <span class="holding-stat-label">Total Value</span>
                            <span class="holding-stat-value accent">${totalValueFormatted}</span>
                        </div>
                    </div>
                    <div class="holding-card-footer">
                        <div class="holding-lots-count">
                            <i data-lucide="layers" class="lucide-sm"></i>
                            <span>${holding.lots.length} lot${holding.lots.length > 1 ? 's' : ''}</span>
                        </div>
                        <button class="holding-expand-btn" onclick="this.closest('.holding-card').classList.toggle('expanded')">
                            <span>Details</span>
                            <i data-lucide="chevron-down" class="lucide-sm"></i>
                        </button>
                    </div>
                    <div class="holding-lots-detail">
                        ${this.renderModernLotBreakdown(holding.lots)}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;

        // Re-render Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Render modern lot breakdown
     */
    renderModernLotBreakdown(lots) {
        if (!lots || lots.length === 0) return '';

        let html = '<div class="lots-list">';

        lots.forEach((lot, index) => {
            const purchaseDate = this.formatDate(lot.purchaseDate);
            const pricePerShare = this.formatCurrency(lot.pricePerShare);

            html += `
                <div class="lot-item">
                    <div class="lot-header">
                        <span class="lot-number">Lot ${index + 1}</span>
                        <span class="lot-date">${purchaseDate}</span>
                    </div>
                    <div class="lot-details">
                        <div class="lot-detail">
                            <span class="lot-qty">${lot.quantity}</span>
                            <span class="lot-label">shares</span>
                        </div>
                        <div class="lot-detail">
                            <span class="lot-price">${pricePerShare}</span>
                            <span class="lot-label">per share</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Calculate tax milestone progress for a lot
     */
    calculateTaxMilestone(purchaseDate) {
        const cutoffDate = new Date('2024-07-01');
        const lotDate = new Date(purchaseDate);
        const today = new Date();

        // If purchased after July 1, 2024, always 15% (no progression)
        if (lotDate >= cutoffDate) {
            return {
                applicable: false,
                message: 'Flat 15% rate (acquired after July 1, 2024)'
            };
        }

        // If non-filer, always 15% (no progression)
        if (!this.taxCalculator.isFiler) {
            return {
                applicable: false,
                message: 'Non-filer: 15% rate (no tax bracket progression)'
            };
        }

        // Calculate holding days
        const holdingDays = Math.floor((today - lotDate) / (1000 * 60 * 60 * 24));

        // Tax brackets for filers (legacy regime)
        const brackets = [
            { days: 365, rate: 15, nextRate: 12.5, label: '1 year' },
            { days: 730, rate: 12.5, nextRate: 10, label: '2 years' },
            { days: 1095, rate: 10, nextRate: 7.5, label: '3 years' },
            { days: 1460, rate: 7.5, nextRate: 0, label: '4 years' }
        ];

        // Already at 0% (max benefit)
        if (holdingDays >= 1460) {
            return {
                applicable: true,
                maxBenefit: true,
                currentRate: 0,
                message: 'Maximum tax benefit achieved!'
            };
        }

        // Find current bracket
        let currentBracket = { days: 0, rate: 15, nextRate: 12.5, label: '1 year' };
        let nextBracket = brackets[0];

        for (let i = 0; i < brackets.length; i++) {
            if (holdingDays < brackets[i].days) {
                nextBracket = brackets[i];
                if (i > 0) {
                    currentBracket = brackets[i - 1];
                }
                break;
            }
        }

        const daysToNext = nextBracket.days - holdingDays;
        const progressDays = holdingDays - (currentBracket.days || 0);
        const totalDaysInBracket = nextBracket.days - (currentBracket.days || 0);
        const progressPercent = (progressDays / totalDaysInBracket) * 100;

        return {
            applicable: true,
            maxBenefit: false,
            currentRate: currentBracket.rate,
            nextRate: nextBracket.nextRate,
            daysToNext: daysToNext,
            progressPercent: Math.min(progressPercent, 100),
            nextLabel: nextBracket.label,
            holdingDays: holdingDays
        };
    }

    /**
     * Render tax progress bar
     */
    renderTaxProgress(lots) {
        if (!lots || lots.length === 0) return '';

        // Use the oldest lot for tax progression (most beneficial)
        const oldestLot = lots.reduce((oldest, lot) =>
            new Date(lot.purchaseDate) < new Date(oldest.purchaseDate) ? lot : oldest
        );

        const milestone = this.calculateTaxMilestone(oldestLot.purchaseDate);

        if (!milestone.applicable) {
            return `
                <div class="tax-progress-container">
                    <div class="tax-max-benefit">${milestone.message}</div>
                </div>
            `;
        }

        if (milestone.maxBenefit) {
            return `
                <div class="tax-progress-container">
                    <div class="tax-max-benefit">✓ ${milestone.message}</div>
                </div>
            `;
        }

        return `
            <div class="tax-progress-container">
                <div class="tax-progress-header">
                    <span class="tax-progress-label">Tax Bracket Progression</span>
                    <span class="tax-progress-milestone">${milestone.daysToNext} days to ${milestone.nextRate}% tax</span>
                </div>
                <div class="tax-progress-bar-wrapper">
                    <div class="tax-progress-bar-fill" style="width: ${milestone.progressPercent}%"></div>
                </div>
                <div class="tax-progress-info">
                    <span>Current: <span class="tax-current-rate">${milestone.currentRate}% tax</span></span>
                    <span>Next: <span class="tax-next-rate">${milestone.nextRate}% tax</span> at ${milestone.nextLabel}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render lot breakdown
     */
    renderLotBreakdown(lots) {
        if (!lots || lots.length === 0) return '';

        let html = '<div class="lot-breakdown"><strong>Lots:</strong><div style="margin-top: 8px;">';

        for (let i = 0; i < lots.length; i++) {
            const lot = lots[i];
            html += `
                <div class="lot-item">
                    <span>${lot.quantity} shares @ ${this.formatCurrency(lot.price)}</span>
                    <span>${this.formatDate(lot.purchaseDate)}</span>
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    }

    /**
     * Update realized gains display (Modern cards)
     */
    updateRealizedGainsDisplay() {
        const container = document.getElementById('realizedGainsDisplay');
        const statsGrid = document.getElementById('taxStatsGrid');
        const exportActions = document.getElementById('taxExportActions');
        if (!container) return;

        const realizedGains = this.fifoQueue.getRealizedGains();

        if (realizedGains.length === 0) {
            // Modern empty state
            container.innerHTML = `
                <div class="empty-state-modern">
                    <div class="empty-state-icon">
                        <i data-lucide="receipt"></i>
                    </div>
                    <h4 class="empty-state-title">No Sales Yet</h4>
                    <p class="empty-state-text">When you sell stocks, your transaction history and tax calculations will appear here.</p>
                    <button class="btn-modern btn-modern-secondary" onclick="app.switchTab('add')" style="margin-top: 20px; padding: 12px 24px;">
                        <i data-lucide="plus" class="lucide-sm"></i>
                        Record a Sale
                    </button>
                </div>
            `;
            if (statsGrid) statsGrid.style.display = 'none';
            if (exportActions) exportActions.style.display = 'none';
            // Re-render Lucide icons
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        // Calculate totals for stats
        let totalGain = 0;
        let totalTax = 0;
        realizedGains.forEach(sale => {
            const taxCalc = this.taxCalculator.calculateTaxForSale(sale);
            totalGain += sale.capitalGain;
            totalTax += taxCalc.totalTax;
        });

        // Update stats grid
        if (statsGrid) {
            statsGrid.style.display = 'grid';
            document.getElementById('taxStatSales').textContent = realizedGains.length;
            document.getElementById('taxStatGain').textContent = this.formatCurrency(totalGain);
            document.getElementById('taxStatGain').className = `tax-stat-value ${totalGain >= 0 ? 'gain' : 'loss'}`;
            document.getElementById('taxStatTax').textContent = this.formatCurrency(totalTax);
        }

        // Show export actions
        if (exportActions) exportActions.style.display = 'flex';

        let html = '<div class="tax-transactions-list">';

        // Sort by date descending (most recent first)
        const sortedGains = [...realizedGains].sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

        for (const sale of sortedGains) {
            const taxCalc = this.taxCalculator.calculateTaxForSale(sale);
            const gainClass = sale.capitalGain >= 0 ? 'gain' : 'loss';
            const gainIcon = sale.capitalGain >= 0 ? 'trending-up' : 'trending-down';

            html += `
                <div class="tax-transaction-card">
                    <div class="tax-transaction-header">
                        <div class="tax-transaction-symbol">
                            <div class="symbol-badge ${gainClass}">
                                <i data-lucide="${gainIcon}" class="symbol-trend-icon"></i>
                            </div>
                            <div class="symbol-info">
                                <span class="symbol-name">${sale.symbol}</span>
                                <span class="symbol-date">${this.formatDate(sale.saleDate)}</span>
                            </div>
                        </div>
                        <div class="tax-transaction-amount ${gainClass}">
                            <span class="amount-prefix">${sale.capitalGain >= 0 ? '+' : ''}</span>${this.formatCurrency(sale.capitalGain)}
                        </div>
                    </div>
                    <div class="tax-transaction-body">
                        <div class="tax-transaction-stat">
                            <span class="stat-label">Qty Sold</span>
                            <span class="stat-value">${sale.quantitySold}</span>
                        </div>
                        <div class="tax-transaction-stat">
                            <span class="stat-label">Sale Price</span>
                            <span class="stat-value">${this.formatCurrency(sale.sellPrice)}</span>
                        </div>
                        <div class="tax-transaction-stat">
                            <span class="stat-label">Cost Basis</span>
                            <span class="stat-value">${this.formatCurrency(sale.totalCostBasis)}</span>
                        </div>
                        <div class="tax-transaction-stat highlight">
                            <span class="stat-label">Tax (${taxCalc.taxByLot && taxCalc.taxByLot[0] ? taxCalc.taxByLot[0].taxRatePercentage : '15%'})</span>
                            <span class="stat-value tax">${this.formatCurrency(taxCalc.totalTax)}</span>
                        </div>
                    </div>
                    <div class="tax-transaction-footer">
                        <div class="net-profit-row">
                            <span class="net-label">Net After Tax</span>
                            <span class="net-value ${taxCalc.netProfit >= 0 ? 'gain' : 'loss'}">${this.formatCurrency(taxCalc.netProfit)}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;

        // Re-render Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    /**
     * Toggle collapsible card
     */
    toggleCollapse(id) {
        const content = document.getElementById(id);
        const icon = document.getElementById(`${id}-icon`);
        const header = content.previousElementSibling;

        content.classList.toggle('expanded');
        icon.classList.toggle('expanded');
        header.classList.toggle('expanded');
    }

    /**
     * Render tax by lot breakdown
     */
    renderTaxByLot(taxByLot) {
        if (!taxByLot || taxByLot.length === 0) return '';

        let html = '<div class="lot-breakdown"><strong>Tax by Lot:</strong><div style="margin-top: 8px;">';

        for (let i = 0; i < taxByLot.length; i++) {
            const lot = taxByLot[i];
            html += `
                <div class="lot-item">
                    <span>${lot.quantity} shares @ ${this.formatCurrency(lot.costPerShare)}</span>
                    <span>${lot.taxRatePercentage} → ${this.formatCurrency(lot.tax)}</span>
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    }

    /**
     * Update tax summary (Hero metrics with improved hierarchy)
     */
    updateTaxSummary() {
        const realizedGains = this.fifoQueue.getRealizedGains();

        if (realizedGains.length === 0) {
            document.getElementById('heroTaxLiability').textContent = 'Rs. 0.00';
            document.getElementById('heroContextGains').textContent = 'Rs. 0.00';
            document.getElementById('taxRateValue').textContent = '15%';
            document.getElementById('heroCostBasis').textContent = 'Rs. 0.00';
            document.getElementById('heroSaleProceeds').textContent = 'Rs. 0.00';
            document.getElementById('heroNetGain').textContent = 'Rs. 0.00';
            document.getElementById('heroYourTax').textContent = 'Rs. 0.00';
            return;
        }

        const aggregateTax = this.taxCalculator.calculateAggregateTax(realizedGains);

        // Calculate total cost basis and sale proceeds
        let totalCostBasis = 0;
        let totalSaleProceeds = 0;
        realizedGains.forEach(sale => {
            totalCostBasis += sale.totalCostBasis;
            totalSaleProceeds += sale.saleProceeds;
        });

        // Update hero tax amount (BIGGEST) - with counting animation
        const heroTaxEl = document.getElementById('heroTaxLiability');
        const heroGainsEl = document.getElementById('heroContextGains');
        this.animateNumber(heroTaxEl, aggregateTax.totalTax, 1200);
        this.animateNumber(heroGainsEl, aggregateTax.netGain, 1000);

        // Update tax rate badge (secondary)
        const effectiveTaxRate = aggregateTax.netGain > 0
            ? (aggregateTax.totalTax / aggregateTax.netGain) * 100
            : 15;
        document.getElementById('taxRateValue').textContent = `${effectiveTaxRate.toFixed(1)}%`;
        document.getElementById('taxRateStatus').textContent = this.taxCalculator.isFiler ? '(Filer)' : '(Non-Filer)';

        // Update supporting metrics grid - with staggered counting animation
        this.animateStats([
            { element: document.getElementById('heroCostBasis'), value: totalCostBasis },
            { element: document.getElementById('heroSaleProceeds'), value: totalSaleProceeds },
            { element: document.getElementById('heroNetGain'), value: aggregateTax.netGain },
            { element: document.getElementById('heroYourTax'), value: aggregateTax.totalTax }
        ], 80);
    }

    /**
     * Update storage info
     */
    updateStorageInfo() {
        const container = document.getElementById('storageInfo');
        if (!container) return;

        const info = this.storageManager.getStorageInfo();

        if (!info.available) {
            container.innerHTML = '<p>localStorage not available</p>';
            return;
        }

        container.innerHTML = `
            <div style="font-size: 0.9rem; color: #64748b;">
                <strong>Storage Used:</strong> ${info.appSizeKB} KB of ~5 MB available
            </div>
        `;

        // Update data statistics
        this.updateDataStatistics();
    }

    /**
     * Update data statistics display
     */
    updateDataStatistics() {
        const data = this.fifoQueue.exportData();
        const holdings = this.fifoQueue.getHoldings();
        const realizedGains = this.fifoQueue.getRealizedGains();

        // Count transactions
        let transactionCount = 0;
        if (data.transactions) {
            for (const symbol in data.transactions) {
                transactionCount += data.transactions[symbol].length;
            }
        }

        // Count active holdings
        const holdingsCount = Object.keys(holdings).length;

        // Count realized sales
        const salesCount = realizedGains.length;

        // Update display
        const transactionsEl = document.getElementById('dataStatTransactions');
        const holdingsEl = document.getElementById('dataStatHoldings');
        const salesEl = document.getElementById('dataStatSales');

        if (transactionsEl) transactionsEl.textContent = transactionCount;
        if (holdingsEl) holdingsEl.textContent = holdingsCount;
        if (salesEl) salesEl.textContent = salesCount;
    }

    /**
     * Refresh holdings
     */
    refreshHoldings() {
        this.updateHoldingsDisplay();
        this.showMessage('Holdings refreshed', 'info');
    }

    /**
     * Run what-if analysis
     */
    runWhatIfAnalysis() {
        try {
            const symbol = document.getElementById('whatifSymbol').value.toUpperCase();
            const quantity = parseFloat(document.getElementById('whatifQuantity').value);
            const price = parseFloat(document.getElementById('whatifPrice').value);
            const date = document.getElementById('whatifDate').value;

            if (!symbol || quantity <= 0 || price <= 0 || !date) {
                this.showErrorModal({
                    title: "Missing Information",
                    description: "Please fill in all fields to calculate tax impact.",
                    details: [
                        { label: 'Stock Symbol', value: symbol || 'Not entered', type: symbol ? '' : 'danger' },
                        { label: 'Quantity', value: quantity > 0 ? quantity : 'Not entered', type: quantity > 0 ? '' : 'danger' },
                        { label: 'Price', value: price > 0 ? `Rs. ${price}` : 'Not entered', type: price > 0 ? '' : 'danger' },
                        { label: 'Date', value: date || 'Not selected', type: date ? '' : 'danger' }
                    ],
                    primaryAction: { label: 'OK', onclick: 'app.hideErrorModal()' }
                });
                return;
            }

            // Check if holding exists
            const holdings = this.fifoQueue.getHoldings();
            if (!holdings[symbol]) {
                this.showNoHoldingsError(symbol);
                return;
            }

            if (holdings[symbol].totalQuantity < quantity) {
                this.showInsufficientSharesError(symbol, holdings[symbol].totalQuantity, quantity);
                return;
            }

            // Show loading state briefly for better UX
            this.showLoading('Calculating tax...', `Processing ${symbol} sale with FIFO methodology`);

            // Calculate current holding value (before sale)
            const currentHolding = holdings[symbol];
            const investment = currentHolding.averageCost * quantity;
            const saleProceeds = price * quantity;
            const capitalGain = saleProceeds - investment;

            // Run hypothetical sale
            const saleResult = this.fifoQueue.calculateSale(symbol, quantity, price, date);
            const taxCalc = this.taxCalculator.calculateTaxForSale(saleResult);

            // Format the selected date nicely
            const selectedDate = new Date(date);
            const isToday = new Date().toDateString() === selectedDate.toDateString();
            const dateLabel = isToday ? 'Today' : this.formatDate(date);

            // Generate recommendations based on results
            const recommendations = this.generateRecommendations(saleResult, taxCalc, currentHolding, symbol, quantity, price);

            // Display results with visual comparison
            const container = document.getElementById('whatifResults');
            const netAfterTax = saleResult.saleProceeds - taxCalc.totalTax;

            let html = `
                <div class="simulator-results">
                    <!-- Results Header -->
                    <div class="simulator-result-header">
                        <div class="result-symbol">
                            <i data-lucide="${saleResult.capitalGain >= 0 ? 'trending-up' : 'trending-down'}" class="result-icon ${saleResult.capitalGain >= 0 ? 'gain' : 'loss'}"></i>
                            <span class="result-symbol-text">${symbol}</span>
                        </div>
                        <span class="result-date-badge">${dateLabel}</span>
                    </div>

                    <!-- Key Metrics Grid -->
                    <div class="simulator-metrics-grid">
                        <div class="simulator-metric">
                            <span class="metric-label">Sale Proceeds</span>
                            <span class="metric-value">${this.formatCurrency(saleResult.saleProceeds)}</span>
                        </div>
                        <div class="simulator-metric">
                            <span class="metric-label">Cost Basis</span>
                            <span class="metric-value">${this.formatCurrency(saleResult.totalCostBasis)}</span>
                        </div>
                        <div class="simulator-metric">
                            <span class="metric-label">Capital Gain</span>
                            <span class="metric-value ${saleResult.capitalGain >= 0 ? 'gain' : 'loss'}">${saleResult.capitalGain >= 0 ? '+' : ''}${this.formatCurrency(saleResult.capitalGain)}</span>
                        </div>
                        <div class="simulator-metric highlight">
                            <span class="metric-label">Tax @ ${taxCalc.effectiveTaxRate.toFixed(0)}%</span>
                            <span class="metric-value tax">${this.formatCurrency(taxCalc.totalTax)}</span>
                        </div>
                    </div>

                    <!-- Net Result Banner -->
                    <div class="simulator-net-result ${netAfterTax >= 0 ? 'positive' : 'negative'}">
                        <div class="net-result-label">
                            <i data-lucide="wallet" class="net-icon"></i>
                            <span>You'll Receive</span>
                        </div>
                        <div class="net-result-value">${this.formatCurrency(netAfterTax)}</div>
                    </div>

                    <!-- Tax Impact Alert -->
                    ${taxCalc.totalTax > 0 ? `
                    <div class="simulator-alert warning">
                        <i data-lucide="alert-circle" class="alert-icon"></i>
                        <span>You'll pay <strong>${this.formatCurrency(taxCalc.totalTax)}</strong> in capital gains tax</span>
                    </div>
                    ` : `
                    <div class="simulator-alert success">
                        <i data-lucide="check-circle" class="alert-icon"></i>
                        <span>No tax due - you're selling at a loss</span>
                    </div>
                    `}

                    <!-- Recommendations -->
                    ${recommendations}
                </div>
            `;

            // Hide loading and show results
            setTimeout(() => {
                this.hideLoading();
                container.innerHTML = html;
                // Re-render Lucide icons
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 300); // Brief delay for better UX

        } catch (error) {
            this.hideLoading();
            this.showErrorModal({
                title: "Calculation Error",
                description: error.message || "An unexpected error occurred while calculating tax.",
                primaryAction: { label: 'OK', onclick: 'app.hideErrorModal()' }
            });
            console.error(error);
        }
    }

    /**
     * Generate actionable recommendations based on what-if analysis
     */
    generateRecommendations(saleResult, taxCalc, holding, symbol, quantity, price) {
        const recommendations = [];
        const capitalGain = saleResult?.capitalGain || 0;
        const costBasis = saleResult?.totalCostBasis || 1;
        const profitPercent = ((capitalGain / costBasis) * 100).toFixed(1);
        const remainingShares = holding.totalQuantity - quantity;

        // Recommendation 1: Profit/Loss advice
        if (capitalGain > 0) {
            const effectiveRate = taxCalc?.effectiveTaxRate || 0;
            const totalTax = taxCalc?.totalTax || 0;
            if (totalTax > capitalGain * 0.3) {
                recommendations.push({
                    icon: 'alert-triangle',
                    iconClass: 'warning',
                    text: `Tax is <strong>${(effectiveRate * 100).toFixed(0)}%</strong> of your gain. Consider if the timing is right.`,
                    action: null
                });
            } else {
                const netProfit = taxCalc?.netProfit || 0;
                recommendations.push({
                    icon: 'check-circle',
                    iconClass: 'success',
                    text: `Good profit of <strong>${profitPercent}%</strong>. After tax, you keep <strong>${this.formatCurrency(netProfit)}</strong>.`,
                    action: null
                });
            }
        } else {
            recommendations.push({
                icon: 'trending-down',
                iconClass: 'danger',
                text: `This sale would realize a <strong>loss of ${this.formatCurrency(Math.abs(capitalGain))}</strong>. No tax due on losses.`,
                action: null
            });
        }

        // Recommendation 2: Partial sale suggestion
        if (remainingShares > 0 && capitalGain > 0) {
            const partialQty = Math.floor(quantity / 2);
            if (partialQty > 0) {
                recommendations.push({
                    icon: 'lightbulb',
                    iconClass: 'info',
                    text: `Consider selling only <strong>${partialQty} shares</strong> to reduce tax impact while locking in some profit.`,
                    action: `<button class="btn-modern btn-modern-secondary btn-sm" onclick="document.getElementById('whatifQuantity').value = ${partialQty}; app.runWhatIfAnalysis();">Try ${partialQty} shares</button>`
                });
            }
        }

        // Recommendation 3: Execute the trade
        if (taxCalc.netProfit > 0) {
            recommendations.push({
                icon: 'circle-check',
                iconClass: 'success',
                text: `Ready to execute? Add this as a SELL transaction to record it.`,
                action: `<button class="btn-modern btn-sm" onclick="app.prefillSellTransaction('${symbol}', ${quantity}, ${price})"><i data-lucide="plus" class="lucide-sm"></i> Record This Sale</button>`
            });
        }

        // Recommendation 4: Tax-loss harvesting
        if (saleResult.capitalGain < 0) {
            recommendations.push({
                icon: 'file-text',
                iconClass: 'info',
                text: `<strong>Tax-loss harvesting:</strong> This loss can offset gains from other stocks.`,
                action: null
            });
        }

        // Build HTML
        if (recommendations.length === 0) return '';

        let html = `
            <div class="simulator-recommendations">
                <div class="recommendations-header">
                    <i data-lucide="sparkles" class="rec-header-icon"></i>
                    <span class="rec-header-text">Recommendations</span>
                </div>
                <div class="recommendations-list">
        `;

        recommendations.forEach(rec => {
            html += `
                <div class="recommendation-item">
                    <div class="rec-icon ${rec.iconClass}">
                        <i data-lucide="${rec.icon}"></i>
                    </div>
                    <div class="rec-content">
                        <p class="rec-text">${rec.text}</p>
                        ${rec.action ? `<div class="rec-action">${rec.action}</div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }

    /**
     * Prefill sell transaction from what-if analysis
     */
    prefillSellTransaction(symbol, quantity, price) {
        // Switch to Add tab
        this.switchTab('add');

        // Prefill the form
        setTimeout(() => {
            document.getElementById('transactionType').value = 'SELL';
            document.getElementById('symbol').value = symbol;
            document.getElementById('quantity').value = quantity;
            document.getElementById('price').value = price;

            // Trigger the summary update
            const event = new Event('input');
            document.getElementById('quantity').dispatchEvent(event);
            document.getElementById('price').dispatchEvent(event);

            this.showMessage(`Prefilled SELL order for ${quantity} ${symbol} @ Rs. ${price}. Review and submit.`, 'info');
        }, 100);
    }

    /**
     * Save data to storage
     */
    saveData() {
        const data = this.fifoQueue.exportData();
        const success = this.storageManager.saveData(data);

        if (success) {
            this.showMessage('Data saved successfully', 'success');
            this.updateStorageInfo();
        } else {
            this.showMessage('Failed to save data', 'error');
        }
    }

    /**
     * Load data from storage
     */
    loadData() {
        const data = this.storageManager.loadData();

        if (data) {
            this.fifoQueue.importData(data);
            this.updateAllDisplays();
            this.showMessage('Data loaded successfully', 'success');
        }
    }

    /**
     * Clear all data
     */
    clearAllData() {
        // Get current statistics
        const data = this.fifoQueue.exportData();
        let transactionCount = 0;
        if (data.transactions) {
            for (const symbol in data.transactions) {
                transactionCount += data.transactions[symbol].length;
            }
        }

        const holdings = this.fifoQueue.getHoldings();
        const holdingsCount = Object.keys(holdings).length;
        const realizedGains = this.fifoQueue.getRealizedGains();
        const salesCount = realizedGains.length;

        // Show modern confirmation modal
        this.showConfirmModal({
            title: 'Delete All Data?',
            description: 'This action is permanent and cannot be undone. Make sure you have exported a backup first.',
            icon: 'trash-2',
            iconType: 'danger',
            details: [
                { label: 'Transactions', value: transactionCount, type: transactionCount > 0 ? 'danger' : '' },
                { label: 'Active Holdings', value: holdingsCount, type: holdingsCount > 0 ? 'danger' : '' },
                { label: 'Realized Sales', value: salesCount, type: salesCount > 0 ? 'danger' : '' }
            ],
            requireInput: true,
            inputLabel: 'Type "DELETE" to confirm:',
            inputMatch: 'DELETE',
            confirmLabel: 'Delete Everything',
            cancelLabel: 'Keep My Data',
            onConfirm: () => {
                this.fifoQueue.reset();
                this.storageManager.clearAllData();
                this.updateAllDisplays();
                this.showMessage('All data has been permanently deleted', 'success');
            },
            onCancel: () => {
                this.showMessage('Your data is safe', 'info');
            }
        });
    }

    /**
     * Export to PDF
     */
    exportToPDF() {
        try {
            const realizedGains = this.fifoQueue.getRealizedGains();

            if (realizedGains.length === 0) {
                this.showMessage('No sales to export', 'error');
                return;
            }

            const aggregateTax = this.taxCalculator.calculateAggregateTax(realizedGains);
            this.pdfGenerator.generateTaxReport(aggregateTax);

            this.showMessage('PDF exported successfully', 'success');
        } catch (error) {
            this.showMessage(`Failed to export PDF: ${error.message}`, 'error');
            console.error(error);
        }
    }

    /**
     * Export to JSON
     */
    exportToJSON() {
        const data = this.fifoQueue.exportData();
        this.storageManager.exportToFile(data, `psx-tax-data-${new Date().toISOString().split('T')[0]}.json`);
        this.showMessage('JSON exported successfully', 'success');
    }

    /**
     * Import from file
     */
    async importFromFile(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;

            const data = await this.storageManager.importFromFile(file);
            this.fifoQueue.importData(data);
            this.updateAllDisplays();

            this.showMessage('Data imported successfully', 'success');

            // Reset file input
            event.target.value = '';
        } catch (error) {
            this.showMessage(`Failed to import: ${error.message}`, 'error');
            console.error(error);
        }
    }

    /**
     * Import from CSV (broker format)
     */
    async importFromCSV(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;

            // Read CSV file
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                throw new Error('CSV file is empty or invalid');
            }

            // Parse header
            const header = lines[0].toLowerCase().split(',').map(h => h.trim());
            const dateIndex = header.findIndex(h => h.includes('date'));
            const typeIndex = header.findIndex(h => h.includes('type') || h.includes('transaction'));
            const symbolIndex = header.findIndex(h => h.includes('symbol') || h.includes('stock') || h.includes('scrip'));
            const quantityIndex = header.findIndex(h => h.includes('quantity') || h.includes('qty') || h.includes('shares'));
            const priceIndex = header.findIndex(h => h.includes('price') || h.includes('rate'));

            if (dateIndex === -1 || typeIndex === -1 || symbolIndex === -1 || quantityIndex === -1 || priceIndex === -1) {
                throw new Error('CSV must have columns: Date, Type, Symbol, Quantity, Price');
            }

            // Parse transactions
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (let i = 1; i < lines.length; i++) {
                try {
                    const values = lines[i].split(',').map(v => v.trim());

                    const date = values[dateIndex];
                    const type = values[typeIndex].toUpperCase();
                    const symbol = values[symbolIndex].toUpperCase();
                    const quantity = parseFloat(values[quantityIndex]);
                    const price = parseFloat(values[priceIndex]);

                    // Validate
                    if (!date || !type || !symbol || isNaN(quantity) || isNaN(price)) {
                        throw new Error('Invalid data');
                    }

                    if (type !== 'BUY' && type !== 'SELL') {
                        throw new Error('Type must be BUY or SELL');
                    }

                    // Add transaction
                    this.fifoQueue.addTransaction(type, symbol, quantity, price, date);
                    successCount++;

                } catch (lineError) {
                    errorCount++;
                    errors.push(`Line ${i + 1}: ${lineError.message}`);
                }
            }

            // Update displays
            this.updateAllDisplays();
            this.storageManager.autoSave(this.fifoQueue.exportData());

            // Show result
            if (errorCount > 0) {
                this.showMessage(
                    `Imported ${successCount} transactions. ${errorCount} errors. Check console for details.`,
                    'info'
                );
                console.warn('CSV Import Errors:', errors);
            } else {
                this.showMessage(
                    `Successfully imported ${successCount} transactions from CSV`,
                    'success'
                );
            }

            // Reset file input
            event.target.value = '';

        } catch (error) {
            this.showMessage(`Failed to import CSV: ${error.message}`, 'error');
            console.error(error);
            event.target.value = '';
        }
    }

    /**
     * Handle corporate action application
     */
    handleCorporateAction(symbol, type, details) {
        try {
            const result = this.corporateActions.applyCorporateAction(symbol, type, details);

            this.showMessage(
                `Corporate action applied: ${result.result.summary}`,
                'success'
            );

            this.updateAllDisplays();
            this.updateCorporateActionsDisplay();

            return result;
        } catch (error) {
            this.showMessage(`Error: ${error.message}`, 'error');
            console.error(error);
            return null;
        }
    }

    /**
     * Apply bonus shares
     */
    applyBonusShares(symbol, ratio, exDate) {
        return this.handleCorporateAction(symbol, 'BONUS', { ratio, exDate });
    }

    /**
     * Apply right issue
     */
    applyRightIssue(symbol, ratio, price, exDate, subscriptionDate) {
        const details = { ratio, price, exDate };
        if (subscriptionDate) {
            details.subscriptionDate = subscriptionDate;
        }
        return this.handleCorporateAction(symbol, 'RIGHT', details);
    }

    /**
     * Update corporate actions display
     */
    updateCorporateActionsDisplay() {
        const container = document.getElementById('corporateActionsHistory');
        if (!container) return;

        const actions = this.corporateActions.getCorporateActions();

        if (actions.length === 0) {
            container.innerHTML = '<p class="empty-state">No corporate actions recorded yet.</p>';
            return;
        }

        let html = '<div style="margin-top: 20px;"><h4>Corporate Actions History</h4>';

        for (const action of actions) {
            const statusClass = action.applied ? 'success' : 'error';
            const statusText = action.applied ? 'Applied' : 'Reversed';

            html += `
                <div class="test-section ${statusClass}" style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <strong>${action.type}: ${action.symbol}</strong><br>
                            <span style="font-size: 0.9rem; color: #64748b;">
                                Ex-Date: ${this.formatDate(action.exDate)} |
                                Applied: ${this.formatDate(action.appliedDate)} |
                                Status: ${statusText}
                            </span><br>
                            <span style="font-size: 0.9rem; margin-top: 5px; display: block;">
                                ${action.result.summary}
                            </span>
                        </div>
                        ${action.applied ? `
                            <button class="btn btn-secondary" onclick="app.reverseCorporateAction(${action.id})"
                                    style="font-size: 0.8rem; padding: 5px 10px;">
                                Undo
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Reverse corporate action
     */
    reverseCorporateAction(actionId) {
        try {
            const result = this.corporateActions.reverseCorporateAction(actionId);

            this.showMessage(result.message, 'success');
            this.updateAllDisplays();
            this.updateCorporateActionsDisplay();
        } catch (error) {
            this.showMessage(`Error: ${error.message}`, 'error');
            console.error(error);
        }
    }

    /**
     * Get corporate actions summary
     */
    getCorporateActionsSummary() {
        return this.corporateActions.getSummary();
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return `Rs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }

    /**
     * Animate number counting effect
     * @param {HTMLElement} element - The element to animate
     * @param {number} endValue - The final value to count to
     * @param {number} duration - Animation duration in milliseconds (default: 1000)
     * @param {string} prefix - Prefix to add before number (default: 'Rs. ')
     */
    animateNumber(element, endValue, duration = 1000, prefix = 'Rs. ') {
        if (!element || typeof endValue !== 'number') return;

        // Check if user prefers reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            element.textContent = prefix + endValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return;
        }

        const startValue = 0;
        const startTime = performance.now();
        const isNegative = endValue < 0;
        const absoluteEnd = Math.abs(endValue);

        const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);

            const currentValue = startValue + (absoluteEnd - startValue) * easedProgress;
            const displayValue = isNegative ? -currentValue : currentValue;

            element.textContent = prefix + displayValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };

        requestAnimationFrame(updateNumber);
    }

    /**
     * Animate multiple stats with staggered timing
     * @param {Array} stats - Array of {element, value, prefix} objects
     * @param {number} staggerDelay - Delay between each animation (default: 100ms)
     */
    animateStats(stats, staggerDelay = 100) {
        stats.forEach((stat, index) => {
            setTimeout(() => {
                this.animateNumber(stat.element, stat.value, 800, stat.prefix || 'Rs. ');
            }, index * staggerDelay);
        });
    }

    /**
     * Format date
     */
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Show message toast (modern)
     */
    showMessage(message, type = 'info') {
        const toast = document.getElementById('messageToast');
        const toastIcon = document.getElementById('toastIcon');
        const toastMessage = document.getElementById('toastMessage');
        if (!toast) return;

        // Set icon based on type
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            info: 'info',
            warning: 'alert-triangle'
        };

        if (toastIcon) {
            toastIcon.innerHTML = `<i data-lucide="${icons[type] || icons.info}"></i>`;
        }
        if (toastMessage) {
            toastMessage.textContent = message;
        }

        toast.className = `toast-modern ${type} show`;

        // Re-render Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Clear existing timeout
        if (this.toastTimeout) clearTimeout(this.toastTimeout);

        // Auto-hide after 4 seconds
        this.toastTimeout = setTimeout(() => {
            this.hideToast();
        }, 4000);
    }

    /**
     * Hide toast notification
     */
    hideToast() {
        const toast = document.getElementById('messageToast');
        if (toast) {
            toast.classList.remove('show');
        }
    }

    /**
     * Show loading modal
     */
    showLoading(title = 'Processing...', description = 'Please wait while we process your request.') {
        const modal = document.getElementById('loadingModal');
        const titleEl = document.getElementById('loadingTitle');
        const descEl = document.getElementById('loadingDescription');

        if (!modal) return;

        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = description;

        modal.classList.add('show');
    }

    /**
     * Hide loading modal
     */
    hideLoading() {
        const modal = document.getElementById('loadingModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Show error modal with details
     */
    showErrorModal(options = {}) {
        const {
            title = "Can't Complete Action",
            description = 'Something went wrong.',
            details = null,
            primaryAction = { label: 'OK', handler: () => this.hideErrorModal() },
            secondaryAction = null
        } = options;

        const modal = document.getElementById('errorModal');
        const titleEl = document.getElementById('errorTitle');
        const descEl = document.getElementById('errorDescription');
        const detailsEl = document.getElementById('errorDetails');
        const actionsEl = document.getElementById('errorActions');

        if (!modal) return;

        // Set title and description
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = description;

        // Set details if provided
        if (detailsEl) {
            if (details && details.length > 0) {
                let detailsHtml = '';
                details.forEach(detail => {
                    detailsHtml += `
                        <div class="error-detail-row">
                            <span class="error-detail-label">${detail.label}</span>
                            <span class="error-detail-value ${detail.type || ''}">${detail.value}</span>
                        </div>
                    `;
                });
                detailsEl.innerHTML = detailsHtml;
                detailsEl.style.display = 'block';
            } else {
                detailsEl.style.display = 'none';
            }
        }

        // Set action buttons
        if (actionsEl) {
            let actionsHtml = '';

            if (secondaryAction) {
                actionsHtml += `<button class="btn btn-secondary" onclick="${secondaryAction.onclick || 'app.hideErrorModal()'}">${secondaryAction.label}</button>`;
            }

            actionsHtml += `<button class="btn btn-primary" onclick="${primaryAction.onclick || 'app.hideErrorModal()'}">${primaryAction.label}</button>`;

            actionsEl.innerHTML = actionsHtml;
        }

        modal.classList.add('show');
    }

    /**
     * Hide error modal
     */
    hideErrorModal() {
        const modal = document.getElementById('errorModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Show confirmation modal
     * @param {Object} options - Configuration options
     * @param {string} options.title - Modal title
     * @param {string} options.description - Modal description
     * @param {Array} options.details - Array of {label, value, type} objects to display
     * @param {string} options.icon - Lucide icon name (default: 'alert-triangle')
     * @param {string} options.iconType - Icon style: 'danger', 'warning', 'info' (default: 'danger')
     * @param {boolean} options.requireInput - Whether to require text input confirmation
     * @param {string} options.inputLabel - Label for the input field
     * @param {string} options.inputMatch - The text the user must type to confirm
     * @param {string} options.confirmLabel - Label for confirm button (default: 'Confirm')
     * @param {string} options.cancelLabel - Label for cancel button (default: 'Cancel')
     * @param {Function} options.onConfirm - Callback function when confirmed
     * @param {Function} options.onCancel - Callback function when cancelled
     */
    showConfirmModal(options = {}) {
        const {
            title = 'Are you sure?',
            description = 'This action cannot be undone.',
            details = null,
            icon = 'alert-triangle',
            iconType = 'danger',
            requireInput = false,
            inputLabel = 'Type "DELETE" to confirm:',
            inputMatch = 'DELETE',
            confirmLabel = 'Confirm',
            cancelLabel = 'Cancel',
            onConfirm = null,
            onCancel = null
        } = options;

        const modal = document.getElementById('confirmModal');
        const iconEl = document.getElementById('confirmIcon');
        const titleEl = document.getElementById('confirmTitle');
        const descEl = document.getElementById('confirmDescription');
        const detailsEl = document.getElementById('confirmDetails');
        const inputWrapper = document.getElementById('confirmInputWrapper');
        const inputLabelEl = document.getElementById('confirmInputLabel');
        const inputEl = document.getElementById('confirmInput');
        const confirmBtn = document.getElementById('confirmActionBtn');

        if (!modal) return;

        // Store callbacks for later use
        this._confirmCallback = onConfirm;
        this._cancelCallback = onCancel;
        this._confirmInputMatch = inputMatch;
        this._confirmRequireInput = requireInput;

        // Set icon
        if (iconEl) {
            iconEl.className = `confirm-icon ${iconType}`;
            iconEl.innerHTML = `<i data-lucide="${icon}"></i>`;
        }

        // Set title and description
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = description;

        // Set details if provided
        if (detailsEl) {
            if (details && details.length > 0) {
                let detailsHtml = '';
                details.forEach(detail => {
                    detailsHtml += `
                        <div class="confirm-detail-row">
                            <span class="confirm-detail-label">${detail.label}</span>
                            <span class="confirm-detail-value ${detail.type || ''}">${detail.value}</span>
                        </div>
                    `;
                });
                detailsEl.innerHTML = detailsHtml;
                detailsEl.style.display = 'block';
            } else {
                detailsEl.style.display = 'none';
            }
        }

        // Set input requirement
        if (inputWrapper && inputLabelEl && inputEl) {
            if (requireInput) {
                inputWrapper.style.display = 'block';
                inputLabelEl.textContent = inputLabel;
                inputEl.value = '';
                confirmBtn.disabled = true;

                // Listen for input changes
                const checkInput = () => {
                    const matches = inputEl.value.toUpperCase() === inputMatch.toUpperCase();
                    confirmBtn.disabled = !matches;
                };

                inputEl.removeEventListener('input', this._confirmInputHandler);
                this._confirmInputHandler = checkInput;
                inputEl.addEventListener('input', checkInput);
            } else {
                inputWrapper.style.display = 'none';
                confirmBtn.disabled = false;
            }
        }

        // Set button labels
        if (confirmBtn) confirmBtn.textContent = confirmLabel;
        const cancelBtn = modal.querySelector('.btn-secondary');
        if (cancelBtn) cancelBtn.textContent = cancelLabel;

        // Re-render Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Show modal
        modal.classList.add('show');

        // Focus input if required, otherwise focus cancel for safety
        setTimeout(() => {
            if (requireInput && inputEl) {
                inputEl.focus();
            }
        }, 100);
    }

    /**
     * Hide confirmation modal
     */
    hideConfirmModal() {
        const modal = document.getElementById('confirmModal');
        const inputEl = document.getElementById('confirmInput');

        if (modal) {
            modal.classList.remove('show');
        }

        // Clear input
        if (inputEl) {
            inputEl.value = '';
            inputEl.removeEventListener('input', this._confirmInputHandler);
        }

        // Execute cancel callback if provided
        if (this._cancelCallback) {
            this._cancelCallback();
        }

        // Clear callbacks
        this._confirmCallback = null;
        this._cancelCallback = null;
    }

    /**
     * Execute confirmation action
     */
    executeConfirmAction() {
        const inputEl = document.getElementById('confirmInput');

        // If input is required, verify it matches
        if (this._confirmRequireInput && inputEl) {
            if (inputEl.value.toUpperCase() !== this._confirmInputMatch.toUpperCase()) {
                return;
            }
        }

        // Hide modal first
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.classList.remove('show');
        }

        // Clear input
        if (inputEl) {
            inputEl.value = '';
        }

        // Execute confirm callback
        if (this._confirmCallback) {
            this._confirmCallback();
        }

        // Clear callbacks
        this._confirmCallback = null;
        this._cancelCallback = null;
    }

    /**
     * Show insufficient shares error
     */
    showInsufficientSharesError(symbol, available, requested) {
        this.showErrorModal({
            title: "Can't Calculate Tax",
            description: `You're trying to sell ${requested} shares but you only own ${available} ${symbol} shares.`,
            details: [
                { label: 'Available', value: `${available} shares`, type: 'available' },
                { label: 'Trying to sell', value: `${requested} shares`, type: 'danger' }
            ],
            primaryAction: {
                label: 'Fix Quantity',
                onclick: 'app.hideErrorModal(); document.getElementById("whatifQuantity").focus();'
            },
            secondaryAction: {
                label: 'Cancel',
                onclick: 'app.hideErrorModal()'
            }
        });
    }

    /**
     * Show no holdings error
     */
    showNoHoldingsError(symbol) {
        this.showErrorModal({
            title: "No Holdings Found",
            description: `You don't have any ${symbol} shares in your portfolio.`,
            details: [
                { label: 'Symbol', value: symbol, type: '' },
                { label: 'Holdings', value: '0 shares', type: 'danger' }
            ],
            primaryAction: {
                label: 'Add Holdings',
                onclick: "app.hideErrorModal(); app.switchTab('add');"
            },
            secondaryAction: {
                label: 'Cancel',
                onclick: 'app.hideErrorModal()'
            }
        });
    }

    /**
     * Tab Navigation
     */
    switchTab(tabName) {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(tab => tab.classList.remove('active'));

        // Remove active from all tab items
        const tabItems = document.querySelectorAll('.tab-item');
        tabItems.forEach(item => item.classList.remove('active'));

        // Show selected tab content
        const selectedTab = document.getElementById(`tab-${tabName}`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // Activate corresponding tab item
        const tabLabels = ['home', 'holdings', 'add', 'tax', 'more'];
        const tabIndex = tabLabels.indexOf(tabName);
        if (tabIndex >= 0 && tabItems[tabIndex]) {
            tabItems[tabIndex].classList.add('active');
        }

        // Scroll to top when switching tabs
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Initialize form listeners for live calculation
     */
    initializeFormListeners() {
        const quantityInput = document.getElementById('quantity');
        const priceInput = document.getElementById('price');

        if (quantityInput && priceInput) {
            const updateSummary = () => {
                const quantity = parseFloat(quantityInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                const total = quantity * price;

                const summaryEl = document.getElementById('transactionSummary');
                const amountEl = document.getElementById('summaryAmount');

                if (total > 0 && summaryEl && amountEl) {
                    summaryEl.style.display = 'flex';
                    amountEl.textContent = this.formatCurrency(total);
                } else if (summaryEl) {
                    summaryEl.style.display = 'none';
                }
            };

            quantityInput.addEventListener('input', updateSummary);
            priceInput.addEventListener('input', updateSummary);
        }
    }
}

// Initialize app when DOM is ready
let app;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new PakistanStockTaxApp();
    });
} else {
    app = new PakistanStockTaxApp();
}

// Make app globally accessible for inline event handlers
window.app = app;
