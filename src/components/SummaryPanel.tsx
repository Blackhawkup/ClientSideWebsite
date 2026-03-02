import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { SelectedFund } from '../types'

type Props = {
  items: SelectedFund[]
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

export default function SummaryPanel({ items }: Props) {
  const total = useMemo(() => items.reduce((s, i) => s + (i.allocation ?? 0), 0), [items])
  const data = useMemo(() => items.map((i) => ({ name: i.name, value: i.allocation ?? 0 })), [items])

  // Placeholder for expected return until returns are wired
  const expectedReturn = 0

  return (
    <aside className="hidden lg:block w-80 shrink-0">
      <div className="sticky top-20 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Allocation</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-slate-600">Total</span>
            <span className={`text-sm font-semibold ${Math.round(total) === 100 ? 'text-green-600' : 'text-red-600'}`}>{total.toFixed(1)}%</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Expected Return</h3>
          <div className="text-2xl font-bold text-slate-800">{expectedReturn.toFixed(2)}%</div>
          <p className="text-xs text-slate-500 mt-1">Weighted by allocation. Will update when return fields are mapped.</p>
        </div>
      </div>
    </aside>
  )
}



