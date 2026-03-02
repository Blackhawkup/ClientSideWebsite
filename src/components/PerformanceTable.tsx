import type { FundPerformance, FundReturnsKeys, SelectedFund } from '../types'

type Props = {
  items: FundPerformance[]
  selected: SelectedFund[]
}

const COLUMNS: { key: FundReturnsKeys; label: string }[] = [
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '3y', label: '3Y' },
  { key: '5y', label: '5Y' },
  { key: '10y', label: '10Y' },
]

export default function PerformanceTable({ items, selected }: Props) {
  if (!items) items = []

  // Build allocation and type map from selected
  const nameToAllocation: Record<string, number> = {}
  const nameToType: Record<string, string | undefined> = {}
  for (const s of selected) {
    const a = typeof s.allocation === 'number' ? s.allocation : 0
    nameToAllocation[s.name] = a
    nameToType[s.name] = s.type
  }

  // Filter out 0% allocation and compute weighted returns
  const visible = items
    .filter(i => (nameToAllocation[i.name] ?? 0) > 0)
    .map(i => {
      const weight = (nameToAllocation[i.name] ?? 0) / 100
      const weighted: FundPerformance = {
        name: i.name,
        returns: {
          '1m': typeof i.returns['1m'] === 'number' ? i.returns['1m']! : null,
          '3m': typeof i.returns['3m'] === 'number' ? i.returns['3m']! : null,
          '6m': typeof i.returns['6m'] === 'number' ? i.returns['6m']! : null,
          '1y': typeof i.returns['1y'] === 'number' ? i.returns['1y']! : null,
          '3y': typeof i.returns['3y'] === 'number' ? i.returns['3y']! : null,
          '5y': typeof i.returns['5y'] === 'number' ? i.returns['5y']! : null,
          '10y': typeof i.returns['10y'] === 'number' ? i.returns['10y']! : null,
        },
      }
      return weighted
    })

  // Allow empty state rendering

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">Returns</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Fund</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Type</th>
              {COLUMNS.map(col => (
                <th key={col.key} className="text-right px-3 py-2 font-medium text-slate-600">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(visible.length > 0 ? visible : []).map(item => {
              const t = nameToType[item.name]
              return (
                <tr key={item.name}>
                  <td className="px-4 py-2 text-slate-800 font-medium whitespace-nowrap">{item.name}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t ? (t.charAt(0).toUpperCase() + t.slice(1)) : '—'}</td>
                  {COLUMNS.map(col => {
                    const v = item.returns[col.key]
                    const display = typeof v === 'number' ? `${v.toFixed(2)}%` : '—'
                    const color = typeof v === 'number' ? (v >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-500'
                    return (
                      <td key={col.key} className={`px-3 py-2 text-right ${color}`}>{display}</td>
                    )
                  })}
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500 text-center" colSpan={1 + 1 + COLUMNS.length}>No data yet. Select funds and click Apply.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


