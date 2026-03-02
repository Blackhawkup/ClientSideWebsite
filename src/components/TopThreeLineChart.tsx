import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { FundPerformance, FundReturnsKeys, SelectedFund } from '../types'

type Props = {
  items: FundPerformance[]
  selected: SelectedFund[]
}

const ORDER: FundReturnsKeys[] = ['1m', '3m', '6m', '1y', '3y', '5y', '10y']

export default function TopThreeLineChart({ items, selected }: Props) {
  const allocationMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of selected) m[s.name] = typeof s.allocation === 'number' ? s.allocation : 0
    return m
  }, [selected])

  const withAlloc = useMemo(() => items
    .filter(i => (allocationMap[i.name] ?? 0) > 0)
    .map(i => ({ ...i, allocation: allocationMap[i.name] ?? 0 }))
  , [items, allocationMap])

  if (withAlloc.length === 0) {
    // Render empty shell
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Top 3 Allocation — Weighted Returns</h3>
        <div className="h-72 flex items-center justify-center text-slate-500 text-sm">No data yet. Select funds and click Apply.</div>
      </div>
    )
  }

  const top3 = [...withAlloc].sort((a, b) => (b as any).allocation - (a as any).allocation).slice(0, 3)

  // Build chart data points by horizon with weighted returns
  const data = ORDER.map((k) => {
    const point: any = { horizon: k.toUpperCase() }
    for (const f of top3) {
      const v = typeof f.returns[k] === 'number' ? (f.returns[k] as number) : null
      point[f.name] = typeof v === 'number' ? Number(v.toFixed(2)) : null
    }
    return point
  })

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Top 3 Allocation — Weighted Returns</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <XAxis dataKey="horizon" />
            <YAxis tickFormatter={(v) => `${Math.round(v as number)}%`} allowDecimals={false} width={40} />
            <Tooltip formatter={(v) => (typeof v === 'number' ? `${(Math.round(v * 100) / 100).toFixed(0)}%` : '—')} />
            <Legend />
            {top3.map((f, idx) => (
              <Line key={f.name} type="monotone" dataKey={f.name} stroke={["#3b82f6","#22c55e","#ef4444"][idx % 3]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


