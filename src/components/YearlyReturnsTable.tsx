import type { FundYearlyPerformance, SelectedFund } from '../types'

type Props = {
  items: FundYearlyPerformance[]
  selected: SelectedFund[]
}

export default function YearlyReturnsTable({ items, selected }: Props) {
  const nameToAllocation: Record<string, number> = {}
  for (const s of selected) nameToAllocation[s.name] = typeof s.allocation === 'number' ? s.allocation : 0

  const nameToType: Record<string, string | undefined> = {}
  for (const s of selected) nameToType[s.name] = s.type
  const visible = (items || []).filter(i => (nameToAllocation[i.name] ?? 0) > 0)

  const columns = ['CY25','CY24','CY23','CY22','CY21','CY20','CY19','CY18']

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">Calender Year Returns</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Fund</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Type</th>
              {columns.map((k) => (
                <th key={k} className="text-right px-3 py-2 font-medium text-slate-600">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map(item => (
              <tr key={item.name}>
                <td className="px-4 py-2 text-slate-800 font-medium whitespace-nowrap">{item.name}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{nameToType[item.name] ? (nameToType[item.name]!.charAt(0).toUpperCase() + nameToType[item.name]!.slice(1)) : '—'}</td>
                {Array.from({ length: 8 }, (_, i) => i).map(i => {
                  const v = (item.years || [])[i]
                  const display = typeof v === 'number' ? `${v.toFixed(2)}%` : '—'
                  const color = typeof v === 'number' ? (v >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-500'
                  return (
                    <td key={i} className={`px-3 py-2 text-right ${color}`}>{display}</td>
                  )
                })}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500 text-center" colSpan={1 + 1 + 8}>No data yet. Select funds and click Apply.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


