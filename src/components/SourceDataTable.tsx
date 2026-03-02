import type { FundSourceData, SelectedFund } from '../types'

type Props = {
  items: FundSourceData[]
  selected: SelectedFund[]
}

export default function SourceDataTable({ items, selected }: Props) {
  const nameToAllocation: Record<string, number> = {}
  const nameToType: Record<string, string | undefined> = {}
  for (const s of selected) {
    nameToAllocation[s.name] = typeof s.allocation === 'number' ? s.allocation : 0
    nameToType[s.name] = s.type
  }

  const visible = (items || []).filter(i => (nameToAllocation[i.name] ?? 0) > 0)

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Fund Attributes</h3>
        </div>
        <div className="p-4 text-slate-500 text-center">No data yet. Select funds and click Apply.</div>
      </div>
    )
  }

  // Get column names in the order they appear in the first fund's data
  // This preserves the original Excel sheet order
  const columns = visible.length > 0 ? Object.keys(visible[0].data) : []

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">Source Data</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Fund</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Type</th>
              {columns.map(col => (
                <th key={col} className="text-right px-3 py-2 font-medium text-slate-600">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map(item => {
              const t = nameToType[item.name]
              return (
                <tr key={item.name}>
                  <td className="px-4 py-2 text-slate-800 font-medium whitespace-nowrap">{item.name}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{t ? (t.charAt(0).toUpperCase() + t.slice(1)) : '—'}</td>
                  {columns.map(col => {
                    const value = item.data[col]
                    let display = '—'
                    let color = 'text-slate-500'
                    
                    if (value !== null && value !== undefined) {
                      if (typeof value === 'number') {
                        // First 4 columns (allocation) should show as percentages
                        const percentageColumns = ['Largecap', 'Midcap', 'Small Cap ', 'Others/Cash']
                        if (percentageColumns.includes(col)) {
                          display = `${value.toFixed(2)}%`
                        } else {
                          display = value.toFixed(2)
                        }
                        color = 'text-slate-800'
                      } else {
                        display = String(value)
                        color = 'text-slate-800'
                      }
                    }
                    
                    return (
                      <td key={col} className={`px-3 py-2 text-right ${color}`}>{display}</td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
