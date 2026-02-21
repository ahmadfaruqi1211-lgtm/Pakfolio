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
          <div className="text-sm font-semibold text-slate-100">
            {profile.isPremium ? 'Pro Plan' : 'Free Plan'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {profile.isPremium ? 'All features unlocked' : 'Upgrade for unlimited access'}
          </div>
        </div>
        <span
          className={
            profile.isPremium
              ? 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-400'
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
                  <span className={exhausted ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                    {used}/{limit} used
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
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
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
          Active key: <span className="font-mono font-semibold">{profile.licenseKey}</span>
        </div>
      )}

      {/* Key input (free users only) */}
      {!profile.isPremium && (
        <div className="space-y-2">
          <label className="text-xs text-slate-400">License Key</label>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="PF-2026-XXXX"
            className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 font-mono"
          />
          {message && (
            <div
              className={`rounded-xl px-3 py-2 text-xs border ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {message.text}
            </div>
          )}
          <button
            type="button"
            onClick={handleActivate}
            className="w-full rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-2 text-sm font-semibold text-emerald-300"
          >
            Activate License
          </button>
        </div>
      )}
    </div>
  )
}
