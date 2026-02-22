import React from 'react'

const LIMITS = { taxReport: 3, whatIf: 2 }
const FEATURE_LABELS = { taxReport: 'Tax Report Exports', whatIf: 'What-If Runs' }

export default function LicenseSettings({ profile, onActivate }) {
  const [key, setKey] = React.useState('')
  const [message, setMessage] = React.useState(null)

  const handleActivate = () => {
    if (!key.trim()) {
      setMessage({ type: 'error', text: 'Please enter a license key.' })
      return
    }
    const result = onActivate(key.trim())
    setMessage({ type: result.success ? 'success' : 'error', text: result.message })
    if (result.success) setKey('')
  }

  const usageCount = profile.usageCount || {}

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            {profile.isPremium ? 'Pro Plan' : 'Free Plan'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {profile.isPremium ? 'All features unlocked' : 'Upgrade for unlimited access'}
          </div>
        </div>
        <span
          className={
            profile.isPremium
              ? 'px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 border border-emerald-200 text-emerald-700 uppercase tracking-widest'
              : 'px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 border border-slate-200 text-slate-500 uppercase tracking-widest'
          }
        >
          {profile.isPremium ? 'PRO' : 'FREE'}
        </span>
      </div>

      {/* Usage counters (free users only) */}
      {!profile.isPremium && (
        <div className="space-y-3">
          {Object.entries(LIMITS).map(([feature, limit]) => {
            const used = usageCount[feature] || 0
            const pct = Math.min((used / limit) * 100, 100)
            const exhausted = used >= limit
            return (
              <div key={feature}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">{FEATURE_LABELS[feature]}</span>
                  <span className={exhausted ? 'text-rose-600 font-bold' : 'text-slate-500 font-medium'}>
                    {used}/{limit} used
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all ${exhausted ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Active key display (pro users) */}
      {profile.isPremium && profile.licenseKey && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700 font-medium">
          Active key: <span className="font-mono font-bold">{profile.licenseKey}</span>
        </div>
      )}

      {/* Key input (free users only) */}
      {!profile.isPremium && (
        <div className="space-y-2">
          <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">License Key</label>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="PF-2026-XXXX"
            className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all uppercase"
          />
          {message && (
            <div
              className={`rounded-xl px-3 py-2 text-xs border font-medium ${message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
            >
              {message.text}
            </div>
          )}
          <button
            type="button"
            onClick={handleActivate}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white shadow-md active:scale-[0.98] transition-all"
          >
            Activate License
          </button>
        </div>
      )}
    </div>
  )
}
