import React from 'react'

function formatNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPKR(value) {
  return `Rs. ${formatNumber(value)}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function useAppEngine() {
  const [engine, setEngine] = React.useState({ ready: false })
  const [version, setVersion] = React.useState(0)
  const [hydrating, setHydrating] = React.useState(true)

  const refresh = React.useCallback(() => setVersion((v) => v + 1), [])

  React.useEffect(() => {
    setHydrating(true)
    const ok =
      typeof window !== 'undefined' &&
      window.FIFOQueue &&
      window.TaxCalculator &&
      window.StorageManager

    if (!ok) {
      setEngine({ ready: false })
      setHydrating(false)
      return
    }

    const fifoQueue = new window.FIFOQueue()
    const taxCalculator = new window.TaxCalculator()
    const storageManager = new window.StorageManager()

    const data = storageManager.loadData()
    if (data) fifoQueue.importData(data)

    const settings = storageManager.loadSettings()
    if (settings && typeof settings.filerStatus === 'boolean') {
      taxCalculator.setFilerStatus(settings.filerStatus)
    }

    setEngine({ ready: true, fifoQueue, taxCalculator, storageManager })
    setHydrating(false)
  }, [version])

  const persist = React.useCallback(() => {
    if (!engine.ready) return
    engine.storageManager.saveData(engine.fifoQueue.exportData())
  }, [engine])

  const persistSettings = React.useCallback(
    (settings) => {
      if (!engine.ready) return
      engine.storageManager.saveSettings(settings)
    },
    [engine]
  )

  return { engine, persist, persistSettings, refresh, hydrating }
}

function SkeletonBlock({ className }) {
  return <div className={'shimmer ' + (className || '')} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <SkeletonBlock className="h-3 w-40 rounded-lg" />
            <SkeletonBlock className="mt-3 h-9 w-52 rounded-xl" />
            <SkeletonBlock className="mt-3 h-7 w-32 rounded-full" />
          </div>
          <SkeletonBlock className="h-10 w-28 rounded-2xl" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-950/30 border border-slate-800 p-4">
              <SkeletonBlock className="h-3 w-24 rounded-lg" />
              <SkeletonBlock className="mt-3 h-6 w-28 rounded-lg" />
              <SkeletonBlock className="mt-2 h-3 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <SkeletonBlock className="h-4 w-28 rounded-lg" />
        <SkeletonBlock className="mt-2 h-3 w-64 rounded-lg" />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-20 rounded-lg" />
            <SkeletonBlock className="h-4 w-24 rounded-lg" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
              <SkeletonBlock className="h-3 w-16 rounded-lg" />
              <SkeletonBlock className="mt-2 h-5 w-24 rounded-lg" />
            </div>
            <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
              <SkeletonBlock className="h-3 w-20 rounded-lg" />
              <SkeletonBlock className="mt-2 h-5 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-24 rounded-lg" />
            <SkeletonBlock className="h-5 w-14 rounded-lg" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <SkeletonBlock className="h-10 rounded-xl" />
            <SkeletonBlock className="h-10 rounded-xl" />
            <SkeletonBlock className="h-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        'py-2 rounded-xl transition-all active:scale-[0.98] ' +
        (active ? 'bg-slate-900 text-slate-50' : 'text-slate-300 hover:bg-slate-900')
      }
    >
      {children}
    </button>
  )
}

function PrimaryTabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        'py-2 rounded-2xl transition-all active:scale-[0.98] font-bold shadow-sm ' +
        (active
          ? 'bg-emerald-500 text-emerald-950'
          : 'bg-emerald-500/90 text-emerald-950 hover:brightness-110')
      }
    >
      {children}
    </button>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
      <div>
        <div className="text-sm text-slate-300">{title}</div>
        {subtitle ? <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function TaxReportScreen({ engine }) {
  const realized = engine.fifoQueue.getRealizedGains() || []
  const transactions = engine.fifoQueue.getTransactions() || []

  let totalSales = realized.length
  let totalGain = 0
  let totalTax = 0

  for (const sale of realized) {
    totalGain += Number(sale.capitalGain || 0)
    const t = engine.taxCalculator.calculateTaxForSale(sale)
    totalTax += Number(t.totalTax || 0)
  }

  const showSuperTax = totalGain > 150_000_000

  const exportPdf = () => {
    try {
      if (typeof window === 'undefined' || !window.PDFGenerator) {
        alert('PDF Generator not available')
        return
      }
      if (typeof window.jspdf === 'undefined') {
        alert('jsPDF library not loaded')
        return
      }
      const pdf = new window.PDFGenerator()
      pdf.generateTaxReport(engine.fifoQueue, engine.taxCalculator, transactions)
    } catch (e) {
      alert(e?.message || 'Failed to export PDF')
    }
  }

  const exportJson = () => {
    engine.storageManager.exportToFile(engine.fifoQueue.exportData())
  }

  return (
    <div className="space-y-4">
      <Card title="Tax Summary" subtitle={engine.taxCalculator.isFiler ? 'Filer' : 'Non-filer'}>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
            <div className="text-xs text-slate-500">Sales</div>
            <div className="text-slate-100 font-semibold">{totalSales}</div>
          </div>
          <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
            <div className="text-xs text-slate-500">Total Gain</div>
            <div className={totalGain >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {formatPKR(totalGain)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
            <div className="text-xs text-slate-500">Tax Payable</div>
            <div className="text-rose-300 font-semibold">{formatPKR(totalTax)}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={exportPdf}
            className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100"
          >
            Export JSON
          </button>
        </div>
      </Card>

      {showSuperTax ? (
        <Card title="Super Tax (Section 4C)" subtitle="Net realized gain threshold">
          <div className="text-sm text-slate-300">
            Your net realized gain exceeds <span className="font-semibold text-slate-100">Rs. 150,000,000</span>. You may have additional obligations under
            <span className="font-semibold text-slate-100"> Section 4C (Super Tax)</span>.
          </div>
          <div className="mt-2 text-xs text-slate-500">This is an informational alert only. Verify with your NCCPL tax certificate and advisor.</div>
        </Card>
      ) : null}

      <Card title="Realized Sales" subtitle="FIFO sale breakdown">
        <div className="space-y-2">
          {realized.length === 0 ? (
            <div className="text-sm text-slate-400">No sales recorded yet.</div>
          ) : (
            realized
              .slice()
              .reverse()
              .map((sale, idx) => {
                const tax = engine.taxCalculator.calculateTaxForSale(sale)
                const soldQty = Number(sale.quantitySold || 0)
                return (
                  <div key={idx} className="rounded-xl bg-slate-950/40 border border-slate-800 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-100">{sale.symbol}</div>
                      <div className="text-slate-300">{formatNumber(soldQty)} sh</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Date: {String(sale.saleDate || '').slice(0, 10)}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-slate-500">Gain</div>
                        <div
                          className={
                            Number(sale.capitalGain || 0) >= 0
                              ? 'text-emerald-400 font-semibold'
                              : 'text-rose-400 font-semibold'
                          }
                        >
                          {formatPKR(sale.capitalGain || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Tax</div>
                        <div className="text-slate-100 font-semibold">{formatPKR(tax.totalTax || 0)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Net</div>
                        <div className="text-slate-100 font-semibold">{formatPKR(tax.netProfit || 0)}</div>
                      </div>
                    </div>
                  </div>
                )
              })
          )}
        </div>
      </Card>
    </div>
  )
}

function TransactionHistoryScreen({ engine }) {
  const txns = engine.fifoQueue.getTransactions() || []
  const [filter, setFilter] = React.useState('')

  const f = (filter || '').trim().toUpperCase()
  const filtered = txns
    .filter((t) => (!f ? true : String(t.symbol || '').toUpperCase().includes(f)))
    .slice()
    .sort((a, b) => new Date(b.timestamp || b.tradeDate || 0) - new Date(a.timestamp || a.tradeDate || 0))

  return (
    <div className="space-y-4">
      <Card title="Transaction History" subtitle="All buys and sells">
        <div className="space-y-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
            placeholder="Filter by symbol (e.g., OGDC)"
          />
          <div className="text-xs text-slate-500">{filtered.length} transactions</div>
        </div>
      </Card>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card title="No transactions" subtitle="">
            <div className="text-sm text-slate-400">Nothing to show.</div>
          </Card>
        ) : (
          filtered.map((t, idx) => (
            <div key={idx} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold tracking-tight">{String(t.symbol || '').toUpperCase()}</div>
                <div className={t.type === 'SELL' ? 'text-rose-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                  {t.type}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-500">Qty</div>
                  <div className="text-slate-100 font-semibold">{formatNumber(t.quantity || 0)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Price</div>
                  <div className="text-slate-100 font-semibold">{formatPKR(t.price || 0)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Date</div>
                  <div className="text-slate-100 font-semibold">{String(t.tradeDate || '').slice(0, 10)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CorporateActionsScreen({ engine, persist, onChanged }) {
  const [symbol, setSymbol] = React.useState('')
  const [actionType, setActionType] = React.useState('BONUS')
  const [ratio, setRatio] = React.useState('')
  const [exDate, setExDate] = React.useState(todayISO())
  const [rightPrice, setRightPrice] = React.useState('')
  const [subscriptionDate, setSubscriptionDate] = React.useState('')
  const [message, setMessage] = React.useState(null)

  const manager = React.useMemo(() => {
    if (typeof window === 'undefined' || !window.CorporateActionsManager) return null
    return new window.CorporateActionsManager(engine.fifoQueue, engine.storageManager)
  }, [engine])

  const actions = manager ? manager.getCorporateActions() : []

  const apply = () => {
    setMessage(null)
    if (!manager) return setMessage({ kind: 'error', text: 'Corporate Actions engine not detected' })

    const s = (symbol || '').trim().toUpperCase()
    if (!s) return setMessage({ kind: 'error', text: 'Enter a symbol' })
    if (!exDate) return setMessage({ kind: 'error', text: 'Enter an ex-date' })

    try {
      if (actionType === 'BONUS') {
        manager.applyCorporateAction(s, 'BONUS', { ratio, exDate })
      } else {
        if (!rightPrice) return setMessage({ kind: 'error', text: 'Enter right price' })
        const details = { ratio, price: Number(rightPrice || 0), exDate }
        if (subscriptionDate) details.subscriptionDate = subscriptionDate
        manager.applyCorporateAction(s, 'RIGHT', details)
      }

      persist()
      onChanged()
      setMessage({ kind: 'ok', text: 'Corporate action applied' })
    } catch (e) {
      setMessage({ kind: 'error', text: e?.message || 'Failed to apply corporate action' })
    }
  }

  const undo = (id) => {
    if (!manager) return
    try {
      manager.reverseCorporateAction(id)
      persist()
      onChanged()
    } catch (e) {
      setMessage({ kind: 'error', text: e?.message || 'Failed to undo' })
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Apply Corporate Action" subtitle="Bonus shares and right issues">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActionType('BONUS')}
              className={
                'rounded-xl px-3 py-2 text-sm font-semibold border ' +
                (actionType === 'BONUS'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300')
              }
            >
              Bonus
            </button>
            <button
              type="button"
              onClick={() => setActionType('RIGHT')}
              className={
                'rounded-xl px-3 py-2 text-sm font-semibold border ' +
                (actionType === 'RIGHT'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300')
              }
            >
              Right
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-400">Symbol</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
              placeholder="e.g., HBL"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400">Ratio</label>
              <input
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
                placeholder={actionType === 'BONUS' ? 'e.g., 20% or 0.2' : 'e.g., 1:5'}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Ex-Date</label>
              <input
                type="date"
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {actionType === 'RIGHT' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400">Right Price</label>
                <input
                  value={rightPrice}
                  onChange={(e) => setRightPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="e.g., 10"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Subscription Date (optional)</label>
                <input
                  type="date"
                  value={subscriptionDate}
                  onChange={(e) => setSubscriptionDate(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}

          {message ? (
            <div
              className={
                'rounded-xl px-3 py-2 text-sm border ' +
                (message.kind === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300')
              }
            >
              {message.text}
            </div>
          ) : null}

          <button type="button" onClick={apply} className="w-full rounded-xl bg-emerald-500 text-emerald-950 font-bold py-2.5">
            Apply
          </button>
        </div>
      </Card>

      <Card title="History" subtitle="Applied corporate actions">
        <div className="space-y-2">
          {actions.length === 0 ? (
            <div className="text-sm text-slate-400">No corporate actions recorded yet.</div>
          ) : (
            actions
              .slice()
              .reverse()
              .map((a) => (
                <div key={a.id} className="rounded-xl bg-slate-950/40 border border-slate-800 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-100">
                      {a.type} {a.symbol}
                    </div>
                    <div className={a.applied ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
                      {a.applied ? 'Applied' : 'Undone'}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Ex-Date: {String(a.exDate || '').slice(0, 10)}
                  </div>
                  {a.applied ? (
                    <button
                      type="button"
                      onClick={() => undo(a.id)}
                      className="mt-2 rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                    >
                      Undo
                    </button>
                  ) : null}
                </div>
              ))
          )}
        </div>
      </Card>
    </div>
  )
}

function MoreScreen({ engine, setTabAndUrl }) {
  return (
    <div className="space-y-4">
      <Card title="Reports" subtitle="Tax and history">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTabAndUrl('tax')}
            className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100"
          >
            Tax Report
          </button>
          <button
            type="button"
            onClick={() => setTabAndUrl('history')}
            className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100"
          >
            History
          </button>
        </div>
      </Card>

      <Card title="Portfolio Tools" subtitle="Adjust cost basis">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTabAndUrl('corporate')}
            className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100"
          >
            Corporate Actions
          </button>
          <button
            type="button"
            onClick={() => setTabAndUrl('whatif')}
            className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100"
          >
            What-If
          </button>
        </div>
      </Card>

      <Card title="Settings" subtitle="Tax status and data">
        <button
          type="button"
          onClick={() => setTabAndUrl('settings')}
          className="w-full rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100"
        >
          Open Settings
        </button>
        <div className="mt-2 text-xs text-slate-500">Current: {engine.taxCalculator.isFiler ? 'Filer' : 'Non-filer'}</div>
      </Card>
    </div>
  )
}

function StatTile({ label, value, subValue, tone = 'slate' }) {
  const toneMap = {
    slate: 'text-slate-100',
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
    amber: 'text-amber-300'
  }

  return (
    <div className="rounded-2xl bg-slate-950/30 border border-slate-800 p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={'mt-1 text-lg font-bold tracking-tight ' + (toneMap[tone] || toneMap.slate)}>{value}</div>
      {subValue ? <div className="mt-1 text-xs text-slate-400">{subValue}</div> : null}
    </div>
  )
}

function DashboardScreen({ engine, setTabAndUrl }) {
  const holdings = engine.fifoQueue.getHoldings()
  const realizedGains = engine.fifoQueue.getRealizedGains()
  const txns = engine.fifoQueue.getTransactions ? engine.fifoQueue.getTransactions() : []

  let totalHoldingsQty = 0
  let totalHoldingsCost = 0
  for (const s of Object.keys(holdings || {})) {
    totalHoldingsQty += Number(holdings[s]?.totalQuantity || 0)
    totalHoldingsCost += Number(holdings[s]?.totalCostBasis || 0)
  }

  let netGains = 0
  let totalTax = 0

  for (const g of realizedGains || []) {
    netGains += Number(g.capitalGain || 0)
    const t = engine.taxCalculator.calculateTaxForSale(g)
    totalTax += Number(t.totalTax || 0)
  }

  const effectiveRate = netGains > 0 ? (totalTax / netGains) * 100 : 0
  const filerLabel = engine.taxCalculator.isFiler ? 'Filer' : 'Non-filer'
  const hasAnyData = (txns || []).length > 0 || Object.keys(holdings || {}).length > 0
  const hasHoldings = totalHoldingsQty > 0

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/70 via-slate-950/60 to-slate-900/50 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-400">Tax payable (estimated)</div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-50">{formatPKR(totalTax)}</div>
            <div
              className={
                'mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ' +
                (engine.taxCalculator.isFiler
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-200')
              }
            >
              {filerLabel}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTabAndUrl('tax')}
            className="rounded-2xl bg-emerald-500 text-emerald-950 font-bold px-4 py-2 text-sm shadow-sm hover:brightness-110 active:brightness-95"
          >
            View Report
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Realized Gains"
            value={formatPKR(netGains)}
            tone={netGains >= 0 ? 'emerald' : 'rose'}
            subValue={(realizedGains || []).length ? `${(realizedGains || []).length} sales` : 'No sales yet'}
          />
          <StatTile label="Effective Rate" value={`${formatNumber(effectiveRate)}%`} subValue={netGains > 0 ? 'Tax / gain' : 'N/A'} tone={effectiveRate > 0 ? 'amber' : 'slate'} />
          <StatTile label="Total Shares" value={formatNumber(totalHoldingsQty)} subValue="Across all symbols" />
          <StatTile label="Total Cost" value={formatPKR(totalHoldingsCost)} subValue="Cost basis" />
        </div>
      </div>

      {!hasHoldings ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-sm font-semibold text-slate-100">Get started</div>
          <div className="mt-1 text-sm text-slate-400">Add a BUY transaction to create your first holding.</div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setTabAndUrl('add')}
              className="w-full rounded-xl bg-emerald-500 text-emerald-950 font-bold py-2.5 text-sm"
            >
              Add Transaction
            </button>
          </div>

          <div className="mt-3 rounded-xl bg-slate-950/40 border border-slate-800 p-3 text-xs text-slate-300 space-y-1">
            <div className="text-slate-100 font-semibold">Quick definitions</div>
            <div><span className="font-semibold text-slate-100">FIFO</span>: Oldest shares are treated as sold first.</div>
            <div><span className="font-semibold text-slate-100">T+2</span>: PSX settlement is typically trade date + 2 business days.</div>
            <div><span className="font-semibold text-slate-100">Capital gain</span>: Net sale proceeds − cost basis (after fees).</div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-sm font-semibold text-slate-100">Quick actions</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setTabAndUrl('add')}
              className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setTabAndUrl('history')}
              className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
            >
              History
            </button>
            <button
              type="button"
              onClick={() => setTabAndUrl('corporate')}
              className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
            >
              Actions
            </button>
            <button
              type="button"
              onClick={() => setTabAndUrl('settings')}
              className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
            >
              Settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PortfolioScreen({ engine, onRefresh }) {
  const [pull, setPull] = React.useState(0)
  const [refreshing, setRefreshing] = React.useState(false)
  const startYRef = React.useRef(null)
  const pullingRef = React.useRef(false)
  const pullRef = React.useRef(0)
  const refreshingRef = React.useRef(false)

  const setPullSafe = React.useCallback((v) => {
    pullRef.current = v
    setPull(v)
  }, [])

  const setRefreshingSafe = React.useCallback((v) => {
    refreshingRef.current = v
    setRefreshing(v)
  }, [])

  React.useEffect(() => {
    const onTouchStart = (e) => {
      if (refreshingRef.current) return
      if (window.scrollY !== 0) return
      const y = e.touches?.[0]?.clientY
      if (!y) return
      startYRef.current = y
      pullingRef.current = true
    }

    const onTouchMove = (e) => {
      if (!pullingRef.current) return
      const y = e.touches?.[0]?.clientY
      if (!y || startYRef.current == null) return
      const dy = y - startYRef.current
      if (dy <= 0) return
      setPullSafe(Math.min(dy, 90))
    }

    const onTouchEnd = () => {
      if (!pullingRef.current) return
      pullingRef.current = false
      startYRef.current = null

      const v = pullRef.current
      if (v >= 70 && typeof onRefresh === 'function') {
        setRefreshingSafe(true)
        setPullSafe(70)
        try {
          onRefresh()
        } catch {}
        window.setTimeout(() => {
          setRefreshingSafe(false)
          setPullSafe(0)
        }, 700)
        return
      }

      setPullSafe(0)
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh, setPullSafe, setRefreshingSafe])

  const holdings = engine.fifoQueue.getHoldings()
  const symbols = Object.keys(holdings || {}).sort()

  if (symbols.length === 0) {
    return (
      <Card title="Portfolio" subtitle="No holdings yet">
        <div className="text-sm text-slate-400">Add a BUY transaction to begin.</div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center" style={{ height: pull ? Math.max(16, pull) : 0, transition: 'height 120ms ease-out' }}>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-xs text-slate-300">
          <div
            className={
              'h-4 w-4 rounded-full border-2 border-slate-600 border-t-emerald-400 ' +
              (refreshing ? 'animate-spin' : '')
            }
          />
          <span>{refreshing ? 'Refreshing…' : pull >= 70 ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      </div>
      {symbols.map((sym) => {
        const h = holdings[sym]
        const qty = Number(h?.totalQuantity || 0)
        const cost = Number(h?.totalCostBasis || 0)
        const avg = qty > 0 ? cost / qty : 0

        return (
          <div key={sym} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold tracking-tight">{sym}</div>
              <div className="text-sm text-slate-300">{formatNumber(qty)} shares</div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                <div className="text-xs text-slate-500">Avg Cost</div>
                <div className="text-slate-100 font-semibold">{formatPKR(avg)}</div>
              </div>
              <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                <div className="text-xs text-slate-500">Total Cost</div>
                <div className="text-slate-100 font-semibold">{formatPKR(cost)}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AddTransactionScreen({ engine, persist, onSaved }) {
  const [type, setType] = React.useState('BUY')
  const [symbol, setSymbol] = React.useState('')
  const [quantity, setQuantity] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [feePercent, setFeePercent] = React.useState('')
  const [date, setDate] = React.useState(todayISO())
  const [message, setMessage] = React.useState(null)

  const s = (symbol || '').trim().toUpperCase()
  const q = Number(quantity || 0)
  const p = Number(price || 0)
  const fee = feePercent === '' ? undefined : feePercent

  let preview = null
  if (type === 'SELL' && s && q > 0 && p > 0) {
    try {
      const sale = engine.fifoQueue.calculateSale(s, q, p, date, fee)
      const tax = engine.taxCalculator.calculateTaxForSale(sale)
      const gain = Number(sale.capitalGain || 0)
      const taxValue = Number(tax.totalTax || 0)
      preview = { gain, tax: taxValue, net: gain - taxValue }
    } catch {
      preview = null
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    setMessage(null)

    if (!s) return setMessage({ kind: 'error', text: 'Enter a symbol' })
    if (q <= 0) return setMessage({ kind: 'error', text: 'Enter a valid quantity' })
    if (p <= 0) return setMessage({ kind: 'error', text: 'Enter a valid price' })

    try {
      engine.fifoQueue.addTransaction(type, s, q, p, date, fee)
      persist()
      setMessage({ kind: 'ok', text: `${type} saved for ${s}` })
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(15)
        }
      } catch {}
      setQuantity('')
      setPrice('')
      setFeePercent('')
      onSaved()
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'Failed to add transaction' })
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Add Transaction" subtitle="FIFO (T+2 settlement)">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('BUY')}
              className={
                'rounded-xl px-3 py-2 text-sm font-semibold border ' +
                (type === 'BUY'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300')
              }
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setType('SELL')}
              className={
                'rounded-xl px-3 py-2 text-sm font-semibold border ' +
                (type === 'SELL'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300')
              }
            >
              Sell
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-400">Symbol</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
              placeholder="e.g., OGDC"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400">Quantity</label>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
                placeholder="100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Price</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
                placeholder="100.00"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Brokerage/Fees (%)</label>
            <input
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
              placeholder="0.5 (default)"
            />
            <div className="mt-1 text-[11px] text-slate-500">Leave blank to use the default 0.5% NCCPL incidental expense adjustment.</div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Trade Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
            />
          </div>

          {preview ? (
            <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3 text-sm">
              <div className="text-xs text-slate-400">Tax Preview</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xs text-slate-500">Gain</div>
                  <div className={preview.gain >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {formatPKR(preview.gain)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Tax</div>
                  <div className="text-slate-100 font-semibold">{formatPKR(preview.tax)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Net</div>
                  <div className={preview.net >= 0 ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                    {formatPKR(preview.net)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {message ? (
            <div
              className={
                'rounded-xl px-3 py-2 text-sm border ' +
                (message.kind === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300')
              }
            >
              {message.text}
            </div>
          ) : null}

          <button type="submit" className="w-full rounded-xl bg-emerald-500 text-emerald-950 font-bold py-2.5">
            Save
          </button>
        </form>
      </Card>
    </div>
  )
}

function SettingsScreen({ engine, persistSettings }) {
  const [isFiler, setIsFiler] = React.useState(Boolean(engine.taxCalculator.isFiler))

  const toggle = () => {
    const next = !isFiler
    setIsFiler(next)
    engine.taxCalculator.setFilerStatus(next)
    persistSettings({ filerStatus: next })
  }

  const exportData = () => {
    engine.storageManager.exportToFile(engine.fifoQueue.exportData())
  }

  const clearData = () => {
    const ok = window.confirm('Clear all saved data on this device?')
    if (!ok) return
    engine.storageManager.clearAllData()
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      <Card title="Tax Status" subtitle="Used for tax calculations">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Filer</div>
            <div className="text-xs text-slate-500">Toggle to non-filer if applicable</div>
          </div>
          <button
            type="button"
            onClick={toggle}
            className={
              'px-3 py-2 rounded-xl text-sm font-semibold border ' +
              (isFiler
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950/40 border-slate-800 text-slate-300')
            }
          >
            {isFiler ? 'On' : 'Off'}
          </button>
        </div>
      </Card>

      <Card title="Data" subtitle="Stored locally on your device">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={exportData}
            className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100"
          >
            Export
          </button>
          <button
            type="button"
            onClick={clearData}
            className="rounded-xl bg-rose-500/10 border border-rose-500/30 py-2 text-sm font-semibold text-rose-300"
          >
            Clear
          </button>
        </div>
      </Card>
    </div>
  )
}

function WhatIfScreen({ engine }) {
  const [symbol, setSymbol] = React.useState('')
  const [quantity, setQuantity] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [date, setDate] = React.useState(todayISO())
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState(null)

  const s = (symbol || '').trim().toUpperCase()
  const q = Number(quantity || 0)
  const p = Number(price || 0)

  const run = (mode) => {
    setError(null)
    setResult(null)

    const ok = typeof window !== 'undefined' && window.WhatIfScenarios
    if (!ok) {
      setError('What-If engine not detected')
      return
    }

    if (!s) return setError('Enter a symbol')
    if (q <= 0) return setError('Enter a valid quantity')
    if (p <= 0) return setError('Enter a valid price')

    try {
      const whatIf = new window.WhatIfScenarios(engine.fifoQueue, engine.taxCalculator)

      if (mode === 'timing') {
        const r = whatIf.analyzeOptimalTiming(s, q, p)
        setResult({ mode, r })
        return
      }

      if (mode === 'filer') {
        const sale = engine.fifoQueue.calculateSale(s, q, p, date)
        const r = whatIf.compareFilerStatus(sale)
        setResult({ mode, r })
        return
      }

      setError('Unknown scenario')
    } catch (e) {
      setError(e?.message || 'Failed to run scenario')
    }
  }

  return (
    <div className="space-y-4">
      <Card title="What-If Scenarios" subtitle="Simulate trades without saving">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Symbol</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
              placeholder="e.g., OGDC"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400">Quantity</label>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
                placeholder="100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Price</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
                placeholder="100.00"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Trade Date (for filer comparison)</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm"
            />
          </div>

          {error ? (
            <div className="rounded-xl px-3 py-2 text-sm border bg-rose-500/10 border-rose-500/30 text-rose-300">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => run('timing')}
              className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100"
            >
              Timing
            </button>
            <button
              type="button"
              onClick={() => run('filer')}
              className="rounded-xl bg-slate-950/40 border border-slate-800 py-2 text-sm font-semibold text-slate-100"
            >
              Filer Compare
            </button>
          </div>
        </div>
      </Card>

      {result && result.mode === 'timing' ? (
        <Card title="Timing Analysis" subtitle={result.r?.recommendation || ''}>
          <div className="space-y-2 text-sm">
            {(result.r?.scenarios || []).map((sc) => (
              <div key={sc.scenario} className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-100">{sc.scenario}</div>
                  <div className="text-slate-300">{formatPKR(sc.tax)}</div>
                </div>
                <div className="mt-1 text-xs text-slate-500">Net: {formatPKR(sc.netProfit)}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {result && result.mode === 'filer' ? (
        <Card title="Filer vs Non-Filer" subtitle={result.r?.recommendation || ''}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
              <div className="text-xs text-slate-500">Filer Tax</div>
              <div className="text-slate-100 font-semibold">{formatPKR(result.r?.filer?.tax || 0)}</div>
              <div className="text-xs text-slate-500 mt-1">Net: {formatPKR(result.r?.filer?.netProfit || 0)}</div>
            </div>
            <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
              <div className="text-xs text-slate-500">Non-Filer Tax</div>
              <div className="text-slate-100 font-semibold">{formatPKR(result.r?.nonFiler?.tax || 0)}</div>
              <div className="text-xs text-slate-500 mt-1">Net: {formatPKR(result.r?.nonFiler?.netProfit || 0)}</div>
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-300">
            Savings by being filer: <span className="text-emerald-400 font-semibold">{formatPKR(result.r?.savingsByBeingFiler || 0)}</span>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

export default function App() {
  const { engine, persist, persistSettings, refresh, hydrating } = useAppEngine()

  const parseTabFromUrl = React.useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const t = (params.get('tab') || '').toLowerCase()

      if (t === 'add') return 'add'
      if (t === 'portfolio') return 'portfolio'
      if (t === 'holdings') return 'portfolio'
      if (t === 'tax') return 'tax'
      if (t === 'history') return 'history'
      if (t === 'corporate') return 'corporate'
      if (t === 'actions') return 'corporate'
      if (t === 'settings') return 'settings'
      if (t === 'whatif') return 'whatif'
      if (t === 'what-if') return 'whatif'
      if (t === 'more') return 'more'
      if (t === 'home') return 'home'
      if (t === 'dashboard') return 'home'

      return 'home'
    } catch {
      return 'home'
    }
  }, [])

  const [tab, setTab] = React.useState(() => (typeof window === 'undefined' ? 'home' : parseTabFromUrl()))

  React.useEffect(() => {
    const onPopState = () => setTab(parseTabFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [parseTabFromUrl])

  const setTabAndUrl = React.useCallback((nextTab) => {
    setTab(nextTab)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', nextTab)
      window.history.pushState({}, '', url)
    } catch {}
  }, [])

  if (!engine.ready) {
    return (
      <div className="min-h-dvh flex flex-col">
        <header className="px-4 pt-6 pb-4">
          <div className="text-sm text-emerald-400 font-semibold">PakFolio</div>
          <div className="mt-2">
            <SkeletonBlock className="h-6 w-40 rounded-xl" />
          </div>
        </header>
        <main className="flex-1 px-4 pb-24">
          <DashboardSkeleton />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-4 pt-6 pb-4">
        <div className="text-sm text-emerald-400 font-semibold">PakFolio</div>
        <div className="text-xl font-bold tracking-tight">
          {tab === 'home'
            ? 'Dashboard'
            : tab === 'add'
              ? 'Add'
            : tab === 'portfolio'
                ? 'Holdings'
                : tab === 'whatif'
                  ? 'What-If'
                  : tab === 'tax'
                    ? 'Tax Report'
                    : tab === 'history'
                      ? 'History'
                      : tab === 'corporate'
                        ? 'Corporate Actions'
                        : tab === 'more'
                          ? 'More'
                          : 'Settings'}
        </div>
      </header>

      <main className="flex-1 px-4 pb-24">
        {tab === 'home' ? (hydrating ? <DashboardSkeleton /> : <DashboardScreen engine={engine} setTabAndUrl={setTabAndUrl} />) : null}
        {tab === 'add' ? <AddTransactionScreen engine={engine} persist={persist} onSaved={refresh} /> : null}
        {tab === 'portfolio' ? (hydrating ? <PortfolioSkeleton /> : <PortfolioScreen engine={engine} onRefresh={refresh} />) : null}
        {tab === 'whatif' ? <WhatIfScreen engine={engine} /> : null}
        {tab === 'tax' ? <TaxReportScreen engine={engine} /> : null}
        {tab === 'history' ? (hydrating ? <HistorySkeleton /> : <TransactionHistoryScreen engine={engine} />) : null}
        {tab === 'corporate' ? <CorporateActionsScreen engine={engine} persist={persist} onChanged={refresh} /> : null}
        {tab === 'more' ? <MoreScreen engine={engine} setTabAndUrl={setTabAndUrl} /> : null}
        {tab === 'settings' ? <SettingsScreen engine={engine} persistSettings={persistSettings} /> : null}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md grid grid-cols-5 px-2 py-2 text-xs text-slate-300">
          <TabButton active={tab === 'home'} onClick={() => setTabAndUrl('home')}>
            Home
          </TabButton>
          <TabButton active={tab === 'portfolio'} onClick={() => setTabAndUrl('portfolio')}>
            Holdings
          </TabButton>
          <PrimaryTabButton active={tab === 'add'} onClick={() => setTabAndUrl('add')}>
            Add
          </PrimaryTabButton>
          <TabButton active={tab === 'tax'} onClick={() => setTabAndUrl('tax')}>
            Tax
          </TabButton>
          <TabButton active={tab === 'more'} onClick={() => setTabAndUrl('more')}>
            More
          </TabButton>
        </div>
      </nav>
    </div>
  )
}
