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

  const refresh = React.useCallback(() => setVersion((v) => v + 1), [])

  React.useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      window.FIFOQueue &&
      window.TaxCalculator &&
      window.StorageManager

    if (!ok) {
      setEngine({ ready: false })
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

  return { engine, persist, persistSettings, refresh }
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        'py-2 rounded-xl transition-colors ' +
        (active ? 'bg-slate-900 text-slate-50' : 'text-slate-300 hover:bg-slate-900')
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

function DashboardScreen({ engine }) {
  const holdings = engine.fifoQueue.getHoldings()
  const realizedGains = engine.fifoQueue.getRealizedGains()

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

  return (
    <div className="space-y-4">
      <Card title="Tax Liability" subtitle={engine.taxCalculator.isFiler ? 'Filer' : 'Non-filer'}>
        <div className="text-2xl font-bold tracking-tight">{formatPKR(totalTax)}</div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
            <div className="text-slate-400 text-xs">Realized Gains</div>
            <div className={netGains >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {formatPKR(netGains)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
            <div className="text-slate-400 text-xs">Effective Rate</div>
            <div className="text-slate-100 font-semibold">{formatNumber(effectiveRate)}%</div>
          </div>
        </div>
      </Card>

      <Card title="Holdings" subtitle="Remaining lots">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
            <div className="text-slate-400 text-xs">Total Shares</div>
            <div className="text-slate-100 font-semibold">{formatNumber(totalHoldingsQty)}</div>
          </div>
          <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
            <div className="text-slate-400 text-xs">Total Cost</div>
            <div className="text-slate-100 font-semibold">{formatPKR(totalHoldingsCost)}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function PortfolioScreen({ engine }) {
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
  const [date, setDate] = React.useState(todayISO())
  const [message, setMessage] = React.useState(null)

  const s = (symbol || '').trim().toUpperCase()
  const q = Number(quantity || 0)
  const p = Number(price || 0)

  let preview = null
  if (type === 'SELL' && s && q > 0 && p > 0) {
    try {
      const sale = engine.fifoQueue.calculateSale(s, q, p, date)
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
      engine.fifoQueue.addTransaction(type, s, q, p, date)
      persist()
      setMessage({ kind: 'ok', text: `${type} saved for ${s}` })
      setQuantity('')
      setPrice('')
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

export default function App() {
  const { engine, persist, persistSettings, refresh } = useAppEngine()

  const parseTabFromUrl = React.useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const t = (params.get('tab') || '').toLowerCase()

      if (t === 'add') return 'add'
      if (t === 'portfolio') return 'portfolio'
      if (t === 'holdings') return 'portfolio'
      if (t === 'settings') return 'settings'
      if (t === 'home') return 'home'
      if (t === 'dashboard') return 'home'
      if (t === 'tax') return 'home'

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
      <div className="min-h-dvh flex items-center justify-center px-6 text-sm text-slate-300">
        Loading engine...
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-4 pt-6 pb-4">
        <div className="text-sm text-emerald-400 font-semibold">PakFolio</div>
        <div className="text-xl font-bold tracking-tight">
          {tab === 'home' ? 'Dashboard' : tab === 'add' ? 'Add' : tab === 'portfolio' ? 'Portfolio' : 'Settings'}
        </div>
      </header>

      <main className="flex-1 px-4 pb-24">
        {tab === 'home' ? <DashboardScreen engine={engine} /> : null}
        {tab === 'add' ? <AddTransactionScreen engine={engine} persist={persist} onSaved={refresh} /> : null}
        {tab === 'portfolio' ? <PortfolioScreen engine={engine} /> : null}
        {tab === 'settings' ? <SettingsScreen engine={engine} persistSettings={persistSettings} /> : null}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur border-t border-slate-800">
        <div className="mx-auto max-w-md grid grid-cols-4 px-2 py-2 text-xs text-slate-300">
          <TabButton active={tab === 'home'} onClick={() => setTabAndUrl('home')}>
            Home
          </TabButton>
          <TabButton active={tab === 'add'} onClick={() => setTabAndUrl('add')}>
            Add
          </TabButton>
          <TabButton active={tab === 'portfolio'} onClick={() => setTabAndUrl('portfolio')}>
            Portfolio
          </TabButton>
          <TabButton active={tab === 'settings'} onClick={() => setTabAndUrl('settings')}>
            Settings
          </TabButton>
        </div>
      </nav>
    </div>
  )
}
