/**
 * FIFO Tax Calculator - Core Engine
 * Pakistan Stock Exchange Capital Gains Tax Calculator
 *
 * FIFO (First-In-First-Out) Logic:
 * - Shares purchased first are considered sold first
 * - Maintains separate queues for each stock symbol
 * - Tracks lot-level cost basis and purchase dates
 * - Settlement date: T+2 (Trade date + 2 business days)
 */

class FIFOQueue {
    constructor() {
        // Store holdings by symbol: { symbol: [lot1, lot2, ...] }
        // Each lot: { quantity, price, purchaseDate, settlementDate }
        this.holdings = {};

        // Store all transactions for audit trail
        this.transactions = [];

        // Store realized gains/losses
        this.realizedGains = [];
    }

    _normalizeFeePercent(feePercent) {
        if (feePercent === undefined || feePercent === null || feePercent === '') return 0.5;
        const n = Number(feePercent);
        if (isNaN(n) || !isFinite(n) || n < 0) return 0.5;
        return n;
    }

    _getAdjustedPrice(type, price, feePercent) {
        const pct = this._normalizeFeePercent(feePercent) / 100;
        const p = Number(price) || 0;
        if (type === 'BUY') return p * (1 + pct);
        if (type === 'SELL') return p * (1 - pct);
        return p;
    }

    /**
     * Add a settlement date to a trade date (T+2 for Pakistan Stock Exchange)
     * @param {Date} tradeDate - The trade execution date
     * @returns {Date} Settlement date (trade date + 2 business days)
     */
    calculateSettlementDate(tradeDate) {
        const date = new Date(tradeDate);
        let daysAdded = 0;

        // Add 2 business days (skip weekends)
        while (daysAdded < 2) {
            date.setDate(date.getDate() + 1);
            const dayOfWeek = date.getDay();

            // Skip Saturday (6) and Sunday (0)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                daysAdded++;
            }
        }

        return date;
    }

    /**
     * Add a transaction (buy or sell)
     * @param {string} type - 'BUY' or 'SELL'
     * @param {string} symbol - Stock symbol (e.g., 'OGDC')
     * @param {number} quantity - Number of shares
     * @param {number} price - Price per share in PKR
     * @param {Date|string} date - Trade date
     * @returns {object} Transaction record with calculated fields
     */
    addTransaction(type, symbol, quantity, price, date, feePercent = undefined) {
        const tradeDate = new Date(date);
        const settlementDate = this.calculateSettlementDate(tradeDate);

        const txType = String(type || '').toUpperCase();
        const appliedFeePercent = this._normalizeFeePercent(feePercent);
        const adjustedPrice = this._getAdjustedPrice(txType, price, appliedFeePercent);

        const transaction = {
            id: this.transactions.length + 1,
            type: txType,
            symbol: symbol.toUpperCase(),
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            adjustedPrice: adjustedPrice,
            feePercent: appliedFeePercent,
            tradeDate: tradeDate,
            settlementDate: settlementDate,
            totalValue: parseFloat(quantity) * parseFloat(price),
            adjustedTotalValue: parseFloat(quantity) * adjustedPrice,
            timestamp: new Date()
        };

        if (txType === 'BUY') {
            this._processBuy(transaction);
        } else if (txType === 'SELL') {
            return this._processSell(transaction);
        }

        this.transactions.push(transaction);
        return transaction;
    }

    /**
     * Process a BUY transaction - Add to FIFO queue
     * @private
     */
    _processBuy(transaction) {
        // SAFE extraction of values
        const symbol = transaction.symbol || '';
        const quantity = Number(transaction.quantity) || 0;
        const price = Number(transaction.adjustedPrice ?? transaction.price) || 0;
        const settlementDate = transaction.settlementDate;

        console.log('=== _processBuy ===');
        console.log('Transaction received:', transaction);
        console.log('Parsed - symbol:', symbol, 'quantity:', quantity, 'price:', price);

        if (!symbol || quantity <= 0 || price <= 0) {
            console.error('Invalid transaction data:', { symbol, quantity, price });
            return;
        }

        // Initialize holdings array for this symbol if it doesn't exist
        if (!this.holdings[symbol]) {
            this.holdings[symbol] = [];
        }

        // Add new lot to the END of the queue (FIFO)
        // EXPLICITLY include ALL fields to prevent undefined errors
        const lot = {
            quantity: quantity,
            price: price,
            cost: price,                          // Alias for price
            costPerShare: price,                  // Another alias
            purchasePrice: price,                 // Another alias
            grossPrice: Number(transaction.price) || price,
            feePercent: Number(transaction.feePercent) || 0,
            purchaseDate: settlementDate,
            remainingQuantity: quantity,
            value: quantity * price,              // Pre-calculated value
            tax: 0,                               // Default tax
            originalTransaction: transaction
        };

        console.log('Created lot with ALL fields:', lot);
        this.holdings[symbol].push(lot);
        console.log('Holdings after push:', this.holdings[symbol]);
        console.log(`✓ Added ${quantity} shares of ${symbol} @ Rs. ${price} to FIFO queue`);
    }

    /**
     * Process a SELL transaction - Remove from FIFO queue
     * @private
     * @returns {object} Sale result with cost basis and capital gains
     */
    _processSell(transaction) {
        const { symbol, quantity, settlementDate } = transaction;
        const grossPrice = Number(transaction.price) || 0;
        const price = Number(transaction.adjustedPrice ?? transaction.price) || 0;

        // Check if we have any holdings for this symbol
        if (!this.holdings[symbol] || this.holdings[symbol].length === 0) {
            throw new Error(`Cannot sell ${symbol}: No holdings found`);
        }

        // Calculate total available shares
        const totalAvailable = this.holdings[symbol].reduce(
            (sum, lot) => sum + lot.remainingQuantity,
            0
        );

        if (totalAvailable < quantity) {
            throw new Error(
                `Cannot sell ${quantity} shares of ${symbol}: Only ${totalAvailable} available`
            );
        }

        // FIFO Logic: Consume lots from the BEGINNING of the queue
        let remainingToSell = quantity;
        const lotsUsed = [];
        let totalCostBasis = 0;

        // Process lots in FIFO order (oldest first)
        for (let i = 0; i < this.holdings[symbol].length && remainingToSell > 0; i++) {
            const lot = this.holdings[symbol][i];

            // How many shares can we take from this lot?
            const sharesToTake = Math.min(lot.remainingQuantity, remainingToSell);

            if (sharesToTake > 0) {
                // Calculate cost basis for these shares
                const costBasis = sharesToTake * lot.price;
                totalCostBasis += costBasis;

                // Calculate holding period
                const holdingPeriod = this.getHoldingPeriod(
                    lot.purchaseDate,
                    settlementDate
                );

                // Record this lot usage
                lotsUsed.push({
                    purchaseDate: lot.purchaseDate,
                    quantity: sharesToTake,
                    costPerShare: lot.price,
                    costBasis: costBasis,
                    holdingPeriod: holdingPeriod
                });

                // Update remaining quantity in the lot
                lot.remainingQuantity -= sharesToTake;
                remainingToSell -= sharesToTake;

                console.log(
                    `  → Using ${sharesToTake} shares from lot purchased on ${lot.purchaseDate.toLocaleDateString()} @ Rs. ${lot.price}`
                );
            }
        }

        // Remove fully consumed lots from the queue
        this.holdings[symbol] = this.holdings[symbol].filter(
            lot => lot.remainingQuantity > 0
        );

        // Calculate capital gain/loss
        const saleProceeds = quantity * price;
        const capitalGain = saleProceeds - totalCostBasis;

        const saleResult = {
            symbol: symbol,
            quantitySold: quantity,
            sellPrice: price,
            grossSellPrice: grossPrice,
            feePercent: Number(transaction.feePercent) || 0,
            saleProceeds: saleProceeds,
            totalCostBasis: totalCostBasis,
            capitalGain: capitalGain,
            lotsUsed: lotsUsed,
            saleDate: settlementDate
        };

        this.realizedGains.push(saleResult);

        console.log(`✓ Sold ${quantity} shares of ${symbol} @ Rs. ${price}`);
        console.log(`  Cost Basis: Rs. ${totalCostBasis.toFixed(2)}`);
        console.log(`  Sale Proceeds: Rs. ${saleProceeds.toFixed(2)}`);
        console.log(`  Capital Gain: Rs. ${capitalGain.toFixed(2)}`);

        return saleResult;
    }

    /**
     * Calculate sale without actually executing it (for what-if scenarios)
     * @param {string} symbol - Stock symbol
     * @param {number} quantity - Number of shares to sell
     * @param {number} sellPrice - Hypothetical sell price
     * @param {Date|string} sellDate - Hypothetical sell date
     * @returns {object} Projected sale result
     */
    calculateSale(symbol, quantity, sellPrice, sellDate, feePercent = undefined) {
        symbol = symbol.toUpperCase();
        const settlementDate = this.calculateSettlementDate(new Date(sellDate));

        const appliedFeePercent = this._normalizeFeePercent(feePercent);
        const adjustedSellPrice = this._getAdjustedPrice('SELL', sellPrice, appliedFeePercent);

        if (!this.holdings[symbol] || this.holdings[symbol].length === 0) {
            throw new Error(`No holdings found for ${symbol}`);
        }

        const totalAvailable = this.holdings[symbol].reduce(
            (sum, lot) => sum + lot.remainingQuantity,
            0
        );

        if (totalAvailable < quantity) {
            throw new Error(
                `Insufficient shares: ${quantity} requested, ${totalAvailable} available`
            );
        }

        let remainingToSell = quantity;
        const lotsUsed = [];
        let totalCostBasis = 0;

        // Simulate FIFO consumption
        for (let i = 0; i < this.holdings[symbol].length && remainingToSell > 0; i++) {
            const lot = this.holdings[symbol][i];
            const sharesToTake = Math.min(lot.remainingQuantity, remainingToSell);

            if (sharesToTake > 0) {
                const costBasis = sharesToTake * lot.price;
                totalCostBasis += costBasis;

                const holdingPeriod = this.getHoldingPeriod(
                    lot.purchaseDate,
                    settlementDate
                );

                lotsUsed.push({
                    purchaseDate: lot.purchaseDate,
                    quantity: sharesToTake,
                    costPerShare: lot.price,
                    costBasis: costBasis,
                    holdingPeriod: holdingPeriod
                });

                remainingToSell -= sharesToTake;
            }
        }

        const saleProceeds = quantity * adjustedSellPrice;
        const capitalGain = saleProceeds - totalCostBasis;

        return {
            symbol: symbol,
            quantitySold: quantity,
            sellPrice: adjustedSellPrice,
            grossSellPrice: sellPrice,
            feePercent: appliedFeePercent,
            saleProceeds: saleProceeds,
            totalCostBasis: totalCostBasis,
            capitalGain: capitalGain,
            lotsUsed: lotsUsed,
            saleDate: settlementDate,
            isSimulation: true
        };
    }

    /**
     * Get cost basis for a potential sale (used for tax planning)
     * @param {string} symbol - Stock symbol
     * @param {number} quantity - Number of shares
     * @returns {object} Cost basis breakdown
     */
    getCostBasisForSale(symbol, quantity) {
        symbol = symbol.toUpperCase();

        if (!this.holdings[symbol]) {
            return { totalCost: 0, avgCost: 0, lots: [] };
        }

        let remainingToSell = quantity;
        let totalCost = 0;
        const lots = [];

        for (let i = 0; i < this.holdings[symbol].length && remainingToSell > 0; i++) {
            const lot = this.holdings[symbol][i];
            const sharesToTake = Math.min(lot.remainingQuantity, remainingToSell);

            if (sharesToTake > 0) {
                const cost = sharesToTake * lot.price;
                totalCost += cost;

                lots.push({
                    quantity: sharesToTake,
                    costPerShare: lot.price,
                    totalCost: cost,
                    purchaseDate: lot.purchaseDate
                });

                remainingToSell -= sharesToTake;
            }
        }

        return {
            totalCost: totalCost,
            avgCost: quantity > 0 ? totalCost / quantity : 0,
            lots: lots
        };
    }

    /**
     * Calculate holding period between two dates
     * @param {Date} purchaseDate - Purchase settlement date
     * @param {Date} sellDate - Sale settlement date
     * @returns {object} Holding period with days, months, years
     */
    getHoldingPeriod(purchaseDate, sellDate) {
        const purchase = new Date(purchaseDate);
        const sell = new Date(sellDate);

        // Calculate difference in milliseconds
        const diffMs = sell - purchase;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Calculate years and months
        let years = sell.getFullYear() - purchase.getFullYear();
        let months = sell.getMonth() - purchase.getMonth();

        if (months < 0) {
            years--;
            months += 12;
        }

        return {
            days: diffDays,
            months: months + (years * 12),
            years: years,
            isLongTerm: diffDays >= 365, // 1+ year holding
            formatted: `${years}y ${months}m (${diffDays} days)`
        };
    }

    /**
     * Get current holdings summary
     * @returns {object} Holdings organized by symbol
     */
    getHoldings() {
        console.log('=== getHoldings called ===');
        console.log('Raw holdings:', JSON.stringify(this.holdings, null, 2));

        const summary = {};

        for (const symbol in this.holdings) {
            const lots = this.holdings[symbol];
            console.log(`Processing ${symbol}, lots:`, lots);

            if (!lots || !Array.isArray(lots)) {
                console.log(`Skipping ${symbol} - lots is not an array`);
                continue;
            }

            // Filter out invalid lots and calculate total with defensive checks
            const validLots = lots.filter(lot => {
                if (!lot) {
                    console.log('Skipping null lot');
                    return false;
                }
                const remainingQty = Number(lot.remainingQuantity);
                if (isNaN(remainingQty) || remainingQty <= 0) {
                    console.log('Skipping lot with invalid remainingQuantity:', lot.remainingQuantity);
                    return false;
                }
                return true;
            });

            console.log(`Valid lots for ${symbol}:`, validLots.length);

            const totalQuantity = validLots.reduce((sum, lot) => {
                const qty = Number(lot.remainingQuantity) || 0;
                return sum + qty;
            }, 0);

            console.log(`Total quantity for ${symbol}:`, totalQuantity);

            if (totalQuantity > 0) {
                const totalValue = validLots.reduce((sum, lot) => {
                    const qty = Number(lot.remainingQuantity) || 0;
                    const prc = Number(lot.price) || 0;
                    return sum + (qty * prc);
                }, 0);

                const avgCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

                summary[symbol] = {
                    totalQuantity: totalQuantity,
                    averageCost: avgCost,
                    totalCostBasis: totalValue,
                    lots: validLots.map(lot => {
                        const qty = Number(lot.remainingQuantity) || 0;
                        const prc = Number(lot.price) || 0;
                        const val = qty * prc;
                        // Return lot with ALL possible field names to prevent undefined
                        return {
                            quantity: qty,
                            remainingQuantity: qty,
                            price: prc,
                            cost: prc,
                            costPerShare: prc,
                            purchasePrice: prc,
                            purchaseDate: lot.purchaseDate,
                            value: val,
                            tax: 0
                        };
                    })
                };

                console.log(`Summary for ${symbol}:`, summary[symbol]);
            }
        }

        console.log('Final summary:', summary);
        return summary;
    }

    /**
     * Get all realized gains/losses
     * @returns {Array} Array of realized gain/loss records
     */
    getRealizedGains() {
        return this.realizedGains || [];
    }

    /**
     * Get all transactions
     * @returns {Array} Array of all transactions
     */
    getTransactions() {
        return this.transactions || [];
    }

    /**
     * Reset all data (for testing or new tax year)
     */
    reset() {
        this.holdings = {};
        this.transactions = [];
        this.realizedGains = [];
        console.log('✓ FIFO queue reset');
    }

    /**
     * Export data for storage
     * @returns {object} Serializable data object
     */
    exportData() {
        return {
            holdings: this.holdings,
            transactions: this.transactions,
            realizedGains: this.realizedGains,
            exportDate: new Date()
        };
    }

    /**
     * Import data from storage
     * @param {object} data - Previously exported data
     */
    importData(data) {
        if (data.holdings) {
            // Restore dates from string format
            this.holdings = {};
            for (const symbol in data.holdings) {
                this.holdings[symbol] = data.holdings[symbol].map(lot => {
                    const restored = {
                        ...lot,
                        purchaseDate: new Date(lot.purchaseDate)
                    };

                    // Backward-compat migration for fee-adjusted cost basis
                    if (restored.grossPrice === undefined || restored.grossPrice === null) {
                        restored.grossPrice = Number(restored.price) || 0;
                    }
                    if (restored.feePercent === undefined || restored.feePercent === null || restored.feePercent === '') {
                        restored.feePercent = 0.5;
                    }

                    const pct = (Number(restored.feePercent) || 0) / 100;
                    if (pct >= 0 && Number(restored.price) === Number(restored.grossPrice)) {
                        const adjusted = (Number(restored.grossPrice) || 0) * (1 + pct);
                        restored.price = adjusted;
                        restored.cost = adjusted;
                        restored.costPerShare = adjusted;
                        restored.purchasePrice = adjusted;
                    }

                    return restored;
                });
            }
        }

        if (data.transactions) {
            this.transactions = data.transactions.map(t => {
                const restored = {
                    ...t,
                    tradeDate: new Date(t.tradeDate),
                    settlementDate: new Date(t.settlementDate),
                    timestamp: new Date(t.timestamp)
                };

                const type = String(restored.type || '').toUpperCase();
                const feePercent =
                    restored.feePercent === undefined || restored.feePercent === null || restored.feePercent === ''
                        ? 0.5
                        : Number(restored.feePercent);

                restored.feePercent = isNaN(feePercent) || !isFinite(feePercent) || feePercent < 0 ? 0.5 : feePercent;

                if (restored.adjustedPrice === undefined || restored.adjustedPrice === null) {
                    const pct = restored.feePercent / 100;
                    const price = Number(restored.price) || 0;
                    restored.adjustedPrice = type === 'BUY' ? price * (1 + pct) : type === 'SELL' ? price * (1 - pct) : price;
                }

                if (restored.adjustedTotalValue === undefined || restored.adjustedTotalValue === null) {
                    const qty = Number(restored.quantity) || 0;
                    restored.adjustedTotalValue = qty * (Number(restored.adjustedPrice) || 0);
                }

                return restored;
            });
        }

        if (data.realizedGains) {
            this.realizedGains = data.realizedGains.map(g => {
                const restored = {
                    ...g,
                    saleDate: new Date(g.saleDate)
                };

                const feePercent =
                    restored.feePercent === undefined || restored.feePercent === null || restored.feePercent === ''
                        ? 0.5
                        : Number(restored.feePercent);

                restored.feePercent = isNaN(feePercent) || !isFinite(feePercent) || feePercent < 0 ? 0.5 : feePercent;
                restored.grossSellPrice = restored.grossSellPrice ?? restored.sellPrice;

                const pct = restored.feePercent / 100;
                const grossSell = Number(restored.grossSellPrice) || 0;
                if (Number(restored.sellPrice) === grossSell) {
                    restored.sellPrice = grossSell * (1 - pct);
                }

                const lotsUsed = Array.isArray(restored.lotsUsed) ? restored.lotsUsed : [];
                restored.lotsUsed = lotsUsed.map(lot => {
                    const purchaseDate = new Date(lot.purchaseDate);
                    const qty = Number(lot.quantity) || 0;
                    const grossCost = Number(lot.costPerShare) || 0;
                    const adjCost = grossCost * (1 + pct);
                    return {
                        ...lot,
                        purchaseDate,
                        costPerShare: adjCost,
                        costBasis: qty * adjCost
                    };
                });

                const quantitySold = Number(restored.quantitySold) || 0;
                restored.totalCostBasis = restored.lotsUsed.reduce((sum, lot) => sum + (Number(lot.costBasis) || 0), 0);
                restored.saleProceeds = quantitySold * (Number(restored.sellPrice) || 0);
                restored.capitalGain = restored.saleProceeds - restored.totalCostBasis;

                return restored;
            });
        }

        console.log('✓ Data imported successfully');
    }
}

 // Export for use in other modules
 if (typeof module !== 'undefined' && module.exports) {
     module.exports = FIFOQueue;
 }

 if (typeof globalThis !== 'undefined') {
     globalThis.FIFOQueue = FIFOQueue;
 }
