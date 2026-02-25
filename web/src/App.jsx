import React from 'react'
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  FileText,
  Settings,
  MoreHorizontal,
  ChevronRight,
  BarChart3,
  History,
  TrendingUp,
  AlertCircle,
  Info,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
  Zap,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  Search
} from 'lucide-react'
import LicenseSettings from './LicenseSettings'

function formatNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPKR(value) {
  return `Rs. ${formatNumber(value)}`
}

function Money({ value }) {
  return (
    <span>
      <span style={{ fontSize: '0.8em', fontWeight: 500 }}>Rs.{' '}</span>
      <span style={{ fontWeight: 700, fontFeatureSettings: '"tnum" on' }}>{formatNumber(value)}</span>
    </span>
  )
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
    let cancelled = false
    setHydrating(true)

    const run = async () => {
      const ok =
        typeof window !== 'undefined' &&
        window.FIFOQueue &&
        window.TaxCalculator &&
        window.StorageManager

      if (!ok) {
        if (!cancelled) {
          setEngine({ ready: false })
          setHydrating(false)
        }
        return
      }

      const fifoQueue = new window.FIFOQueue()
      const taxCalculator = new window.TaxCalculator()
      const storageManager = new window.StorageManager()

      try {
        // Add a timeout to prevent infinite loading if IndexedDB hangs
        const dataPromise = storageManager.loadData()
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout loading data')), 3000))

        const data = await Promise.race([dataPromise, timeoutPromise]).catch(() => null)
        if (data) fifoQueue.importData(data)
      } catch (e) {
        console.warn('Storage initialization issue:', e)
      }

      const settings = storageManager.loadSettings()
      if (settings && typeof settings.filerStatus === 'boolean') {
        taxCalculator.setFilerStatus(settings.filerStatus)
      }

      if (!cancelled) {
        setEngine({ ready: true, fifoQueue, taxCalculator, storageManager })
        setHydrating(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [version])

  const persist = React.useCallback(() => {
    if (!engine.ready) return
    Promise.resolve(engine.storageManager.saveData(engine.fifoQueue.exportData())).catch(() => { })
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

const LICENSE_LIMITS = { taxReport: 3, whatIf: 2 }

function useLicense(engine) {
  const defaultProfile = { isPremium: false, licenseKey: '', usageCount: { taxReport: 0, whatIf: 0 } }
  const [profile, setProfile] = React.useState(defaultProfile)

  React.useEffect(() => {
    if (!engine.ready) return
    setProfile(engine.storageManager.getUserProfile())
  }, [engine])

  const canUse = React.useCallback(
    (feature) => {
      if (profile.isPremium) return true
      return (profile.usageCount[feature] || 0) < (LICENSE_LIMITS[feature] || 0)
    },
    [profile]
  )

  const consume = React.useCallback(
    (feature) => {
      if (!engine.ready || profile.isPremium) return
      engine.storageManager.incrementUsage(feature)
      setProfile(engine.storageManager.getUserProfile())
    },
    [engine, profile]
  )

  const activate = React.useCallback(
    (key) => {
      if (!engine.ready) return { success: false, message: 'Engine not ready' }
      const result = engine.storageManager.activateLicense(key)
      if (result.success) setProfile(engine.storageManager.getUserProfile())
      return result
    },
    [engine]
  )

  return { profile, canUse, consume, activate }
}

function SkeletonBlock({ className }) {
  return <div className={'shimmer ' + (className || '')} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
            <div key={i} className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <SkeletonBlock className="h-3 w-24 rounded-lg" />
              <SkeletonBlock className="mt-3 h-6 w-28 rounded-lg" />
              <SkeletonBlock className="mt-2 h-3 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
        <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-20 rounded-lg" />
            <SkeletonBlock className="h-4 w-24 rounded-lg" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <SkeletonBlock className="h-3 w-16 rounded-lg" />
              <SkeletonBlock className="mt-2 h-5 w-24 rounded-lg" />
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
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
        <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
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

function TabButton({ active, children, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={
        'relative flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all active:scale-[0.95] ' +
        (active ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600')
      }
    >
      {active && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-emerald-500" />
      )}
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-bold uppercase tracking-tight">{children}</span>
    </button>
  )
}

function PrimaryTabButton({ active, children, onClick, icon: Icon }) {
  return (
    <div className="relative -mt-6 flex justify-center">
      <button
        onClick={onClick}
        className={
          'flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ring-4 ring-white transition-all active:scale-[0.9] ' +
          (active
            ? 'bg-emerald-600 text-white'
            : 'bg-emerald-500 text-white hover:brightness-110')
        }
      >
        <Icon size={28} strokeWidth={2.5} />
      </button>
    </div>
  )
}

function Card({ title, subtitle, children, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/60 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
            <Icon size={18} />
          </div>
        )}
        <div className="flex-1">
          <div className="text-sm font-bold text-slate-900 leading-tight">{title}</div>
          {subtitle ? <div className="text-[11px] text-slate-500 font-medium mt-0.5">{subtitle}</div> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

const WHATSAPP_NUMBER = '923142345679'
const WHATSAPP_DISPLAY = '0314-2345679'
const JAZZCASH_NUMBER = '03142345679'
const BANK_IBAN = 'PK50UNIL0109000285756845'
const BANK_NAME = 'Imbisat Ahmed'
const PRO_PRICE = 'Rs. 2,500/year'

function UpgradeModal({ onClose }) {
  const whatsappMsg = encodeURIComponent(
    `Hi! I want to purchase PakFolio Pro (${PRO_PRICE}). I have made the payment and will share the receipt for my license key.`
  )
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm px-4 pb-6">
      <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 flex flex-col max-h-[88vh] shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
        {/* Sticky header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="text-lg font-bold text-slate-900 leading-tight">Unlock Pro Features</div>
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm mt-1">
              <Zap size={14} fill="currentColor" />
              {PRO_PRICE}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full h-8 w-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-600 transition-all">
            <XCircle size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Pro features */}
          <div>
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">What You Get</div>
            <ul className="space-y-3">
              {[
                { label: 'Unlimited Tax Report exports', icon: FileText },
                { label: 'Unlimited What-If scenarios', icon: TrendingUp },
                { label: 'Corporate Actions (Bonus/Right)', icon: Zap },
                { label: 'Bulk CSV Upload / Import', icon: PlusCircle },
                { label: 'Priority WhatsApp support', icon: MessageCircle },
              ].map((feat, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <div className="mt-0.5 flex-shrink-0 text-emerald-500">
                    <CheckCircle2 size={16} strokeWidth={3} />
                  </div>
                  <span className="font-medium">{feat.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment methods */}
          <div>
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">How to Upgrade</div>
            <div className="space-y-3">
              <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 mb-1.5 uppercase tracking-wider">
                  <CreditCard size={12} />
                  JazzCash / EasyPaisa
                </div>
                <div className="font-mono text-lg text-slate-900 font-black tracking-widest">{JAZZCASH_NUMBER}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  <ShieldCheck size={12} />
                  Bank Transfer (UBL IBAN)
                </div>
                <div className="font-mono text-[10px] text-slate-900 font-bold break-all">{BANK_IBAN}</div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium italic text-right w-full">Acc: {BANK_NAME}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 pt-0 space-y-3 flex-shrink-0">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3.5 text-sm font-bold text-white shadow-md active:scale-[0.98] transition-all"
          >
            <MessageCircle size={18} />
            Contact Support & Upgrade
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-slate-50 border border-slate-100 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}

function LockedFeatureScreen({ featureName, showUpgrade }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 space-y-4">
      <div className="text-5xl">🔒</div>
      <div className="text-base font-bold text-slate-900">{featureName} — Pro Only</div>
      <div className="text-sm text-slate-500 max-w-xs leading-relaxed">
        This feature is included in the Pro plan. Upgrade for {PRO_PRICE} to unlock it along with unlimited exports and more.
      </div>
      <button
        type="button"
        onClick={showUpgrade}
        className="mt-2 rounded-xl bg-emerald-600 border border-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-md active:scale-[0.98] transition-all"
      >
        Upgrade to Pro — {PRO_PRICE}
      </button>
    </div>
  )
}

function TaxReportScreen({ engine, isPremium, usageCount, showUpgrade, consume }) {
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

  const taxUsed = (usageCount && usageCount.taxReport) || 0
  const taxLimit = LICENSE_LIMITS.taxReport

  const handleExportPdf = () => {
    if (!isPremium && taxUsed >= taxLimit) {
      showUpgrade()
      return
    }
    if (typeof window === 'undefined' || !window.PDFGenerator) {
      alert('PDF Generator not available')
      return
    }
    if (typeof window.jspdf === 'undefined') {
      alert('jsPDF library not loaded')
      return
    }
    try {
      const pdf = new window.PDFGenerator()
      pdf.generateTaxReport(engine.fifoQueue, engine.taxCalculator, transactions)
      if (!isPremium) consume('taxReport')
    } catch (e) {
      alert(e?.message || 'Failed to export PDF')
    }
  }

  const handleExportJson = () => {
    if (!isPremium && taxUsed >= taxLimit) {
      showUpgrade()
      return
    }
    try {
      engine.storageManager.exportToFile(engine.fifoQueue.exportData())
      if (!isPremium) consume('taxReport')
    } catch (e) {
      alert(e?.message || 'Failed to export data')
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Tax Summary" subtitle={engine.taxCalculator.isFiler ? 'Filer Status: Active' : 'Filer Status: Inactive'} icon={BarChart3}>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 transition-all hover:bg-white hover:border-emerald-100">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5">
              <History size={10} className="text-emerald-500" />
              Sales
            </div>
            <div className="text-slate-900 font-black text-lg">{totalSales}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 transition-all hover:bg-white hover:border-emerald-100">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5">
              <TrendingUp size={10} className="text-emerald-500" />
              Total Gain
            </div>
            <div className={`font-black text-lg ${totalGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <Money value={totalGain} />
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 transition-all hover:bg-white hover:border-rose-100">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5">
              <DollarSign size={10} className="text-rose-500" />
              Tax Due
            </div>
            <div className="text-rose-600 font-black text-lg"><Money value={totalTax} /></div>
          </div>
        </div>

        {!isPremium && (
          <div className="mt-4 px-1 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Free Usage Limits</span>
            <span className="text-emerald-600">{taxUsed} / {taxLimit} exports used</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExportPdf}
            className={`flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-bold transition-all active:scale-[0.98] ${!isPremium && taxUsed >= taxLimit
              ? 'bg-slate-50 border-slate-100 text-slate-300'
              : 'bg-emerald-600 border-emerald-700 text-white shadow-md hover:bg-emerald-700'
              }`}
          >
            <Download size={18} />
            {!isPremium && taxUsed >= taxLimit ? '🔒 PDF Report' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className={`flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-bold transition-all active:scale-[0.98] ${!isPremium && taxUsed >= taxLimit
              ? 'bg-slate-50 border-slate-100 text-slate-300'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50'
              }`}
          >
            <PlusCircle size={18} />
            {!isPremium && taxUsed >= taxLimit ? '🔒 Export JSON' : 'Export JSON'}
          </button>
        </div>
      </Card>

      {showSuperTax ? (
        <Card title="Super Tax (Section 4C)" subtitle="Realized gain > 150M" icon={AlertCircle}>
          <div className="text-sm text-slate-600 leading-relaxed">
            Your net realized gain exceeds <span className="font-black text-slate-900 underline decoration-emerald-500/30">Rs. 150,000,000</span>. You may have additional obligations under
            <span className="font-black text-slate-900 border-b border-rose-200"> Section 4C (Super Tax)</span>.
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-800 font-medium leading-tight">
            <Info size={14} className="flex-shrink-0" />
            Verify with your official tax certificate and consultant.
          </div>
        </Card>
      ) : null}

      <Card title="Realized Sales" subtitle="Transaction history breakdown" icon={History}>
        <div className="space-y-3">
          {realized.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-[10px]">No sales recorded</div>
            </div>
          ) : (
            realized
              .slice()
              .reverse()
              .map((sale, idx) => {
                const tax = engine.taxCalculator.calculateTaxForSale(sale)
                const soldQty = Number(sale.quantitySold || 0)
                return (
                  <div key={idx} className="rounded-2xl bg-white border border-slate-200/60 p-5 transition-all hover:bg-slate-50 group shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-black text-slate-900 tracking-tight text-base group-hover:text-emerald-700 transition-colors uppercase">{sale.symbol}</div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {formatNumber(soldQty)} shares
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em]">Gain</div>
                        <div className={`font-black text-[12px] truncate ${Number(sale.capitalGain || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <Money value={sale.capitalGain || 0} />
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em]">Tax Paid</div>
                        <div className="text-slate-900 font-black text-[12px] truncate"><Money value={tax.totalTax || 0} /></div>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em]">Net Profit</div>
                        <div className="text-slate-900 font-black text-[12px] truncate"><Money value={tax.netProfit || 0} /></div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <Calendar size={12} className="text-emerald-500" />
                      Sale: {String(sale.saleDate || '').slice(0, 10)}
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
      <Card title="Search History" subtitle="Monitor all trade and corporate actions" icon={History}>
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              placeholder="Filter by symbol (e.g., OGDC)"
            />
          </div>
          <div className="flex items-center gap-2 px-1 text-[10px] text-slate-500 font-black uppercase tracking-widest">
            <Info size={12} className="text-emerald-500" />
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
              <FileText size={32} />
            </div>
            <div className="text-xs font-black uppercase tracking-[0.2em]">No transactions found</div>
          </div>
        ) : (
          filtered.map((t, idx) => (
            <div key={idx} className="rounded-2xl bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between">
                <div className="font-black text-slate-900 tracking-tight text-lg group-hover:text-emerald-700 transition-colors uppercase">{String(t.symbol || '').toUpperCase()}</div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${t.type === 'SELL' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                  {t.type}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-3.5 transition-colors hover:bg-white">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5 line-clamp-1">
                    <Briefcase size={10} className="text-emerald-500 flex-shrink-0" />
                    Shares
                  </div>
                  <div className="text-slate-900 font-black text-sm">{formatNumber(t.quantity || 0)}</div>
                </div>
                <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-3.5 transition-colors hover:bg-white">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5 line-clamp-1">
                    <DollarSign size={10} className="text-emerald-500 flex-shrink-0" />
                    Price
                  </div>
                  <div className="text-slate-900 font-black text-sm"><Money value={t.price || 0} /></div>
                </div>
                <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-3.5 transition-colors hover:bg-white">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5 line-clamp-1">
                    <Calendar size={10} className="text-emerald-500 flex-shrink-0" />
                    Date
                  </div>
                  <div className="text-slate-900 font-black text-sm">{String(t.tradeDate || '').slice(0, 10)}</div>
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
  const [type, setType] = React.useState('BONUS')
  const [ratio, setRatio] = React.useState('')
  const [date, setDate] = React.useState(todayISO())
  const [msg, setMsg] = React.useState(null)

  const history = engine.fifoQueue.getCorporateActions ? engine.fifoQueue.getCorporateActions() : []

  const onSubmit = (e) => {
    e.preventDefault()
    setMsg(null)
    const s = (symbol || '').trim().toUpperCase()
    if (!s) return setMsg({ kind: 'error', text: 'Enter symbol' })
    if (!ratio) return setMsg({ kind: 'error', text: 'Enter ratio' })

    try {
      engine.fifoQueue.applyCorporateAction(type, s, ratio, date)
      persist()
      setMsg({ kind: 'ok', text: `Action applied to ${s}` })
      setSymbol('')
      setRatio('')
      onChanged()
    } catch (err) {
      setMsg({ kind: 'error', text: err?.message || 'Failed' })
    }
  }

  const undo = (id) => {
    try {
      engine.fifoQueue.undoCorporateAction(id)
      persist()
      onChanged()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Corporate Actions" subtitle="Bonus, Right Issues, and Splits" icon={Zap}>
        <form onSubmit={onSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-50 rounded-2xl border border-slate-100">
            <button
              type="button"
              onClick={() => setType('BONUS')}
              className={
                'py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ' +
                (type === 'BONUS' ? 'bg-white shadow-sm text-emerald-600 border border-slate-200/50' : 'text-slate-400')
              }
            >
              Bonus
            </button>
            <button
              type="button"
              onClick={() => setType('SPLIT')}
              className={
                'py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ' +
                (type === 'SPLIT' ? 'bg-white shadow-sm text-emerald-600 border border-slate-200/50' : 'text-slate-400')
              }
            >
              Split
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Stock Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none uppercase"
                placeholder="e.g. ENGRO"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Ratio / Change</label>
                <input
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none"
                  placeholder="e.g. 0.1 for 10%"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Ex-Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {msg ? (
            <div className={`rounded-xl px-4 py-3 text-xs font-bold border ${msg.kind === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
              {msg.text}
            </div>
          ) : null}

          <button type="submit" className="w-full rounded-2xl bg-emerald-600 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg hover:brightness-110 active:scale-[0.98] transition-all">
            Apply Action
          </button>
        </form>
      </Card>

      <Card title="Action History" subtitle="Recent adjustments" icon={History}>
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-bold uppercase tracking-widest">No history</div>
          ) : (
            history
              .slice()
              .reverse()
              .map((a) => (
                <div key={a.id} className="rounded-2xl bg-slate-50/50 border border-slate-100 p-4 transition-all hover:bg-white hover:border-emerald-100 group">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">
                      {a.type} {a.symbol}
                    </div>
                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${a.applied ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                      {a.applied ? 'Applied' : 'Undone'}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                      Ex-Date: {String(a.exDate || '').slice(0, 10)}
                    </div>
                    {a.applied ? (
                      <button
                        type="button"
                        onClick={() => undo(a.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-100 px-2.5 py-1.5 text-[10px] font-black text-rose-600 hover:bg-rose-100 transition-all uppercase tracking-widest"
                      >
                        <Trash2 size={12} />
                        Undo
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
          )}
        </div>
      </Card>
    </div>
  )
}

function MoreScreen({ engine, setTabAndUrl, isPremium, showUpgrade }) {
  const menuItems = [
    { label: 'Tax Report', icon: FileText, tab: 'tax', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'History', icon: History, tab: 'history', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'What-If', icon: TrendingUp, tab: 'whatif', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Actions', icon: Zap, tab: 'corporate', color: 'text-purple-600', bg: 'bg-purple-50', pro: true },
    { label: 'Import', icon: PlusCircle, tab: 'import', color: 'text-slate-600', bg: 'bg-slate-50', pro: true },
    { label: 'Settings', icon: Settings, tab: 'settings', color: 'text-slate-600', bg: 'bg-slate-50' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {menuItems.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (item.pro && !isPremium) {
                showUpgrade()
              } else if (item.tab === 'import') {
                alert('Bulk CSV Upload — coming soon!')
              } else {
                setTabAndUrl(item.tab)
              }
            }}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
          >
            <div className={`h-12 w-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center shadow-inner transition-transform group-hover:scale-110`}>
              <item.icon size={24} />
            </div>
            <div className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              {item.pro && !isPremium && <span className="text-[10px]">🔒</span>}
              {item.label}
            </div>
          </button>
        ))}
      </div>

      <Card title="Plan Status" subtitle="Your current subscription" icon={ShieldCheck}>
        <div className="flex items-center justify-between p-1">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isPremium ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              <Zap size={20} fill={isPremium ? 'currentColor' : 'none'} />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">{isPremium ? 'PakFolio Pro' : 'Free Plan'}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{isPremium ? 'Unlimited access enabled' : 'Basic features active'}</div>
            </div>
          </div>
          {!isPremium && (
            <button
              onClick={showUpgrade}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest shadow-sm hover:brightness-110 active:scale-95 transition-all"
            >
              Upgrade
            </button>
          )}
        </div>
      </Card>
    </div>
  )
}

function StatTile({ label, value, subValue, tone = 'slate', icon: Icon }) {
  const toneMap = {
    slate:   { bg: 'bg-slate-50',      border: 'border-slate-200',  text: 'text-slate-900',   icon: 'text-slate-400' },
    emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-500' },
    rose:    { bg: 'bg-rose-50/50',    border: 'border-rose-100',   text: 'text-rose-700',    icon: 'text-rose-500' },
    amber:   { bg: 'bg-amber-50/50',   border: 'border-amber-100',  text: 'text-amber-700',   icon: 'text-amber-500' },
  }

  const t = toneMap[tone] || toneMap.slate

  return (
    <div className={`rounded-2xl border p-4 transition-all hover:bg-white hover:shadow-md ${t.bg} ${t.border}`}>
      <div className="flex items-center justify-between gap-1">
        <div className="text-[11px] uppercase tracking-[0.05em] text-slate-500 font-semibold">{label}</div>
        {Icon && (
          <div className={t.icon}>
            <Icon size={14} strokeWidth={2.5} />
          </div>
        )}
      </div>
      <div className={`mt-2 text-xl font-black tracking-tight ${t.text}`}>{value}</div>
      {subValue ? <div className="mt-1 text-[10px] font-bold text-slate-400 truncate">{subValue}</div> : null}
    </div>
  )
}

function DashboardScreen({ engine, setTabAndUrl, isPremium, showUpgrade }) {
  const holdings = engine.fifoQueue.getHoldings()
  const realizedGains = engine.fifoQueue.getRealizedGains()
  const txns = engine.fifoQueue.getTransactions ? engine.fifoQueue.getTransactions() : []

  const t1Cutoff = new Date('2026-02-09T00:00:00')
  const hasT1Context =
    new Date() >= t1Cutoff ||
    (txns || []).some((t) => {
      const d = t?.tradeDate || t?.timestamp
      if (!d) return false
      return new Date(d) >= t1Cutoff
    })

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
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tax payable (estimated)</div>
            <div className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900"><Money value={totalTax} /></div>
            <div
              className={
                'mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] ' +
                (engine.taxCalculator.isFiler
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700')
              }
            >
              {filerLabel}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setTabAndUrl('tax')}
              className="rounded-2xl bg-emerald-500 text-emerald-950 font-bold px-4 py-2 text-sm shadow-sm hover:brightness-110 active:brightness-95"
            >
              View Report
            </button>
            {!isPremium && (
              <button
                type="button"
                onClick={showUpgrade}
                className="rounded-2xl bg-slate-900 text-white font-semibold px-4 py-2 text-xs shadow-sm hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Zap size={14} fill="currentColor" className="text-emerald-400" />
                Get Premium
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Realized Gains"
            value={<Money value={netGains} />}
            tone={netGains >= 0 ? 'emerald' : 'rose'}
            icon={TrendingUp}
            subValue={(realizedGains || []).length ? `${(realizedGains || []).length} sales` : 'No sales yet'}
          />
          <StatTile label="Effective Rate" value={`${formatNumber(effectiveRate)}%`} icon={BarChart3} tone={effectiveRate > 0 ? 'amber' : 'slate'} subValue={netGains > 0 ? 'Tax / gain' : 'N/A'} />
          <StatTile label="Total Shares" value={formatNumber(totalHoldingsQty)} icon={Briefcase} subValue="Across all symbols" />
          <StatTile label="Total Cost" value={<Money value={totalHoldingsCost} />} icon={DollarSign} subValue="Cost basis" />
        </div>
      </div>

      {hasT1Context ? (
        <Card title="Settlement Update (T+1)" subtitle="Effective Feb 9, 2026">
          <div className="text-sm text-slate-500 leading-[1.5]">
            PSX has transitioned to T+1 settlement. Your gains and holding periods are now calculated on a 24-hour cycle.
          </div>
        </Card>
      ) : null}

      {!hasHoldings ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-900 uppercase tracking-wide">Get started</div>
          <div className="mt-1 text-sm text-slate-500">Add a BUY transaction to create your first holding.</div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setTabAndUrl('add')}
              className="w-full rounded-xl bg-emerald-500 text-emerald-950 font-bold py-2.5 text-sm"
            >
              Add Transaction
            </button>
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 space-y-1">
            <div className="text-slate-900 font-bold uppercase tracking-wider text-[10px]">Quick definitions</div>
            <div><span className="font-semibold text-slate-900">FIFO</span>: Oldest shares are treated as sold first.</div>
            <div><span className="font-semibold text-slate-900">T+1</span>: PSX settlement is typically trade date + 1 business day.</div>
            <div><span className="font-semibold text-slate-900">Capital gain</span>: Net sale proceeds − cost basis (after fees).</div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-slate-900 uppercase tracking-wide px-1">Quick actions</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setTabAndUrl('add')}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <PlusCircle size={15} className="text-emerald-500" />
              Add
            </button>
            <button
              type="button"
              onClick={() => setTabAndUrl('history')}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <History size={15} className="text-blue-500" />
              History
            </button>
            <button
              type="button"
              onClick={() => setTabAndUrl('corporate')}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Zap size={15} className="text-amber-500" />
              Actions
            </button>
            <button
              type="button"
              onClick={() => setTabAndUrl('settings')}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Settings size={15} className="text-slate-400" />
              Settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PortfolioScreen({ engine }) {
  const holdings = engine.fifoQueue.getHoldings()
  const symbols = Object.keys(holdings || {}).sort()

  if (symbols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
          <Briefcase size={32} />
        </div>
        <div>
          <div className="text-sm font-black text-slate-900 uppercase tracking-wide">No holdings yet</div>
          <div className="text-xs text-slate-500 mt-1">Add your first BUY trade to build your portfolio.</div>
        </div>
      </div>
    )
  }

  let totalCost = 0
  for (const sym of symbols) {
    totalCost += Number(holdings[sym]?.totalCostBasis || 0)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em]">
          {symbols.length} holding{symbols.length !== 1 ? 's' : ''}
        </div>
        <div className="text-xs font-black text-slate-900"><Money value={totalCost} /> total cost</div>
      </div>

      {symbols.map((sym) => {
        const h = holdings[sym]
        const qty = Number(h?.totalQuantity || 0)
        const cost = Number(h?.totalCostBasis || 0)
        const avg = qty > 0 ? cost / qty : 0

        return (
          <div key={sym} className="rounded-2xl bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-black text-[11px] tracking-tight flex-shrink-0">
                {sym.slice(0, 3)}
              </div>
              <div className="flex-1 flex items-center justify-between min-w-0">
                <div className="text-lg font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">{sym}</div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-tight">
                  <Briefcase size={12} />
                  {formatNumber(qty)}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-4 transition-colors hover:bg-white hover:border-emerald-100">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5">
                  <ChevronRight size={10} className="text-emerald-500" />
                  Avg Cost
                </div>
                <div className="text-slate-900 font-black"><Money value={avg} /></div>
              </div>
              <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-4 transition-colors hover:bg-white hover:border-emerald-100">
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5">
                  <DollarSign size={10} className="text-emerald-500" />
                  Total Cost
                </div>
                <div className="text-slate-900 font-black"><Money value={cost} /></div>
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
      } catch { }
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
      <Card title="Add Transaction" subtitle="FIFO (T+1 settlement)" icon={PlusCircle}>
        <form onSubmit={onSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-50 rounded-2xl border border-slate-100">
            <button
              type="button"
              onClick={() => setType('BUY')}
              className={
                'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black uppercase tracking-widest transition-all ' +
                (type === 'BUY'
                  ? 'bg-emerald-500 shadow-sm text-white border border-emerald-600'
                  : 'text-slate-400 hover:text-slate-600')
              }
            >
              <Download size={16} />
              Buy
            </button>
            <button
              type="button"
              onClick={() => setType('SELL')}
              className={
                'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black uppercase tracking-widest transition-all ' +
                (type === 'SELL'
                  ? 'bg-rose-500 shadow-sm text-white border border-rose-600'
                  : 'text-slate-400 hover:text-slate-600')
              }
            >
              <TrendingUp size={16} className="rotate-180" />
              Sell
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Stock Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase tracking-widest"
                placeholder="e.g. OGDC"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Fees % (adj)</label>
                <input
                  type="number"
                  step="0.01"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  placeholder="0.5"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Trade Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          {preview ? (
            <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="text-[10px] text-emerald-800 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Zap size={14} fill="currentColor" />
                Instant Tax Analysis
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-[11px] text-emerald-600/70 font-semibold uppercase tracking-[0.05em]">Gain</div>
                  <div className={`text-base font-black truncate ${preview.gain >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    <Money value={preview.gain} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-emerald-600/70 font-semibold uppercase tracking-[0.05em]">Est. Tax</div>
                  <div className="text-slate-900 font-black text-base truncate"><Money value={preview.tax} /></div>
                </div>
                <div className="text-center border-l border-emerald-100">
                  <div className="text-[11px] text-emerald-800/80 font-semibold uppercase tracking-[0.05em]">Net</div>
                  <div className={`text-base font-black truncate ${preview.net >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                    <Money value={preview.net} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {message ? (
            <div
              className={
                'rounded-2xl px-4 py-3 text-xs font-bold border flex items-center gap-3 transition-all ' +
                (message.kind === 'ok'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-rose-50 border-rose-100 text-rose-800')
              }
            >
              {message.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all mt-2"
          >
            <PlusCircle size={20} />
            Save Transaction
          </button>
        </form>
      </Card>

      <div className="py-2 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-slate-500 font-black uppercase tracking-widest">
          <ShieldCheck size={12} className="text-emerald-500" />
          SECURE LOCAL ENCRYPTION ACTIVE
        </div>
      </div>
    </div>
  )
}

function SettingsScreen({ engine, persistSettings, onReset, profile, activate }) {
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
    Promise.resolve(engine.storageManager.clearAllData())
      .catch(() => { })
      .finally(() => {
        window.location.reload()
      })
  }

  return (
    <div className="space-y-4">
      <Card title="Tax Configuration" subtitle="Define your investor status" icon={Settings}>
        <div className="flex items-center justify-between gap-4 p-1">
          <div className="flex-1">
            <div className="text-sm font-black text-slate-900 flex items-center gap-2">
              Filer Status
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${isFiler ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                {isFiler ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Toggle to non-filer if you are not in the ATL.</div>
          </div>
          <button
            type="button"
            onClick={toggle}
            className={
              'relative inline-flex h-7 w-12 items-center rounded-full transition-colors outline-none ' +
              (isFiler ? 'bg-emerald-500' : 'bg-slate-200')
            }
          >
            <span
              className={
                'inline-block h-5 w-5 transform rounded-full bg-white transition-transform ' +
                (isFiler ? 'translate-x-6' : 'translate-x-1')
              }
            />
          </button>
        </div>
      </Card>

      <Card title="Database & Storage" subtitle="Manage your local data" icon={ShieldCheck}>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={exportData}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 py-3.5 text-xs font-black uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <Download size={14} className="text-emerald-500" />
            Export Data
          </button>
          <button
            type="button"
            onClick={clearData}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 py-3.5 text-xs font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-all shadow-sm active:scale-95"
          >
            <Trash2 size={14} />
            Wipe Device
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">
          <Info size={14} className="text-emerald-500" />
          All data is stored locally in your browser's IndexedDB. We never see your trades.
        </div>
      </Card>

      <Card title="License & Support" subtitle="Help and Pro access" icon={Zap}>
        <LicenseSettings
          profile={profile || { isPremium: false, licenseKey: '', usageCount: { taxReport: 0, whatIf: 0 } }}
          onActivate={activate || (() => ({ success: false, message: 'Not ready' }))}
        />
        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 hover:bg-emerald-100 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <MessageCircle size={18} />
              </div>
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-widest">Chat Support</div>
                <div className="text-[10px] opacity-70">Talk to us on WhatsApp</div>
              </div>
            </div>
            <ChevronRight size={18} />
          </button>
        </div>
      </Card>
    </div>
  )
}

function WhatIfScreen({ engine, isPremium, usageCount, showUpgrade, consume }) {
  const [symbol, setSymbol] = React.useState('')
  const [quantity, setQuantity] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [date, setDate] = React.useState(todayISO())
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState(null)

  const s = (symbol || '').trim().toUpperCase()
  const q = Number(quantity || 0)
  const p = Number(price || 0)

  const whatIfUsed = (usageCount && usageCount.whatIf) || 0
  const whatIfLimit = LICENSE_LIMITS.whatIf

  const run = (mode) => {
    setError(null)
    setResult(null)

    const ok = typeof window !== 'undefined' && window.WhatIfScenarios
    if (!ok) {
      setError('What-If engine not detected')
      return false
    }

    if (!s) { setError('Enter a symbol'); return false }
    if (q <= 0) { setError('Enter a valid quantity'); return false }
    if (p <= 0) { setError('Enter a valid price'); return false }

    try {
      const whatIf = new window.WhatIfScenarios(engine.fifoQueue, engine.taxCalculator)

      if (mode === 'timing') {
        const r = whatIf.analyzeOptimalTiming(s, q, p)
        setResult({ mode, r })
        return true
      }

      if (mode === 'filer') {
        const sale = engine.fifoQueue.calculateSale(s, q, p, date)
        const r = whatIf.compareFilerStatus(sale)
        setResult({ mode, r })
        return true
      }

      setError('Unknown scenario')
    } catch (e) {
      setError(e?.message || 'Failed to run scenario')
    }
    return false
  }

  const handleRun = (mode) => {
    if (!isPremium && whatIfUsed >= whatIfLimit) {
      showUpgrade()
      return
    }
    const success = run(mode)
    if (success && !isPremium) consume('whatIf')
  }

  return (
    <div className="space-y-4">
      <Card title="What-If Simulator" subtitle="Predict tax outcomes instantly" icon={TrendingUp}>
        <div className="space-y-4 pt-1">
          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Stock Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase"
                placeholder="e.g. OGDC"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Sell Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em] ml-1 mb-1.5 block">Simulated Date (Filer Compare)</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {!isPremium && (
            <div className="flex items-center justify-between px-1">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.05em]">Free Simulator Usage</div>
              <div className="text-[11px] text-emerald-600 font-black">{whatIfUsed} / {whatIfLimit}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleRun('timing')}
              className={`flex items-center justify-center gap-2 rounded-2xl border py-4 text-[11px] font-black uppercase tracking-widest transition-all ${!isPremium && whatIfUsed >= whatIfLimit
                ? 'bg-slate-50 border-slate-100 text-slate-300 pointer-events-none'
                : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95'
                }`}
            >
              {!isPremium && whatIfUsed >= whatIfLimit ? <ShieldCheck size={14} /> : <Calendar size={14} className="text-emerald-500" />}
              Timing Analysis
            </button>
            <button
              type="button"
              onClick={() => handleRun('filer')}
              className={`flex items-center justify-center gap-2 rounded-2xl border py-4 text-[11px] font-black uppercase tracking-widest transition-all ${!isPremium && whatIfUsed >= whatIfLimit
                ? 'bg-slate-50 border-slate-100 text-slate-300 pointer-events-none'
                : 'bg-emerald-600 border-emerald-700 text-white shadow-lg shadow-emerald-500/20 active:scale-95'
                }`}
            >
              {!isPremium && whatIfUsed >= whatIfLimit ? <ShieldCheck size={14} /> : <BarChart3 size={14} />}
              Filer Compare
            </button>
          </div>
        </div>
      </Card>

      {result && result.mode === 'timing' ? (
        <Card title="Timing Analysis" subtitle={result.r?.recommendation || ''} icon={Info}>
          <div className="space-y-3">
            {(result.r?.scenarios || []).map((sc, i) => (
              <div key={i} className="rounded-2xl bg-slate-50 border border-slate-100 p-4 transition-all hover:bg-white hover:border-emerald-100 group">
                <div className="flex items-center justify-between">
                  <div className="font-black text-slate-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight text-xs">{sc.scenario}</div>
                  <div className="text-emerald-600 font-black text-sm"><Money value={sc.tax} /></div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Est. Net Profit: <Money value={sc.netProfit} /></div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {result && result.mode === 'filer' ? (
        <Card title="Comparison Result" subtitle={result.r?.recommendation || ''} icon={BarChart3}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-4">
              <div className="text-[11px] text-emerald-600 font-semibold uppercase tracking-[0.05em] mb-2">As Filer</div>
              <div className="text-slate-900 font-black text-lg truncate"><Money value={result.r?.filer?.tax || 0} /></div>
              <div className="text-[10px] text-emerald-800/60 font-medium mt-1">Tax Payable</div>
            </div>
            <div className="rounded-2xl bg-rose-50/50 border border-rose-100 p-4">
              <div className="text-[11px] text-rose-600 font-semibold uppercase tracking-[0.05em] mb-2">As Non-Filer</div>
              <div className="text-slate-900 font-black text-lg truncate"><Money value={result.r?.nonFiler?.tax || 0} /></div>
              <div className="text-[10px] text-rose-800/60 font-medium mt-1">Tax Payable</div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Potential Savings</div>
              <div className="text-xl font-black text-emerald-400"><Money value={result.r?.savingsByBeingFiler || 0} /></div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
              <Zap size={20} fill="currentColor" />
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

export default function App() {
  const { engine, persist, persistSettings, refresh, hydrating } = useAppEngine()
  const { profile, consume, activate } = useLicense(engine)
  const [upgradeVisible, setUpgradeVisible] = React.useState(false)
  const showUpgrade = React.useCallback(() => setUpgradeVisible(true), [])

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
    } catch { }
  }, [])

  if (!engine.ready) {
    return (
      <div className="min-h-dvh flex flex-col bg-slate-50">
        <header className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md border-b border-slate-100/80 px-4 pt-5 pb-3">
          <div className="text-sm text-emerald-600 font-extrabold uppercase tracking-widest">PakFolio</div>
          <div className="mt-2">
            <SkeletonBlock className="h-6 w-40 rounded-xl" />
          </div>
        </header>
        <main className="flex-1 px-4 pt-4 pb-24">
          <DashboardSkeleton />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      {upgradeVisible && <UpgradeModal onClose={() => setUpgradeVisible(false)} />}

      <header className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md border-b border-slate-100/80 px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="text-sm text-emerald-600 font-extrabold uppercase tracking-widest">PakFolio</div>
          {profile.isPremium && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 border border-emerald-200 text-emerald-700">
              PRO
            </span>
          )}
        </div>
        <div className="text-xl font-extrabold tracking-tight text-slate-900">
          {tab === 'home'
            ? 'Dashboard'
            : tab === 'add'
              ? 'Add Transaction'
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

      <main className="flex-1 px-4 pt-4 pb-24">
        {tab === 'home' ? (hydrating ? <DashboardSkeleton /> : <DashboardScreen engine={engine} setTabAndUrl={setTabAndUrl} isPremium={profile.isPremium} showUpgrade={showUpgrade} />) : null}
        {tab === 'add' ? <AddTransactionScreen engine={engine} persist={persist} onSaved={refresh} /> : null}
        {tab === 'portfolio' ? (hydrating ? <PortfolioSkeleton /> : <PortfolioScreen engine={engine} onRefresh={refresh} />) : null}
        {tab === 'whatif' ? <WhatIfScreen engine={engine} isPremium={profile.isPremium} usageCount={profile.usageCount} showUpgrade={showUpgrade} consume={consume} /> : null}
        {tab === 'tax' ? <TaxReportScreen engine={engine} isPremium={profile.isPremium} usageCount={profile.usageCount} showUpgrade={showUpgrade} consume={consume} /> : null}
        {tab === 'history' ? (hydrating ? <HistorySkeleton /> : <TransactionHistoryScreen engine={engine} />) : null}
        {tab === 'corporate' ? (
          profile.isPremium
            ? <CorporateActionsScreen engine={engine} persist={persist} onChanged={refresh} />
            : <LockedFeatureScreen featureName="Corporate Actions" showUpgrade={showUpgrade} />
        ) : null}
        {tab === 'more' ? <MoreScreen engine={engine} setTabAndUrl={setTabAndUrl} isPremium={profile.isPremium} showUpgrade={showUpgrade} /> : null}
        {tab === 'settings' ? <SettingsScreen engine={engine} persistSettings={persistSettings} profile={profile} activate={activate} /> : null}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 pb-[env(safe-area-inset-bottom)] shadow-2xl z-40">
        <div className="mx-auto max-w-md grid grid-cols-5 px-3 py-2">
          <TabButton active={tab === 'home'} onClick={() => setTabAndUrl('home')} icon={LayoutDashboard}>
            Home
          </TabButton>
          <TabButton active={tab === 'portfolio'} onClick={() => setTabAndUrl('portfolio')} icon={Briefcase}>
            Holdings
          </TabButton>
          <PrimaryTabButton active={tab === 'add'} onClick={() => setTabAndUrl('add')} icon={PlusCircle}>
            Add
          </PrimaryTabButton>
          <TabButton active={tab === 'tax'} onClick={() => setTabAndUrl('tax')} icon={FileText}>
            Tax
          </TabButton>
          <TabButton active={tab === 'more'} onClick={() => setTabAndUrl('more')} icon={MoreHorizontal}>
            More
          </TabButton>
        </div>
      </nav>
    </div>
  )
}
