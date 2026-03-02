import { useMemo } from 'react'
import type { SelectedFund } from '../types'

type Props = {
  selected: SelectedFund[]
  totalInvestment: number
}

export default function InvestmentSummary({ selected, totalInvestment }: Props) {
  // Calculate investment amounts for each fund
  const investmentData = useMemo(() => {
    return selected
      .filter(fund => typeof fund.allocation === 'number' && fund.allocation > 0)
      .map(fund => {
        const allocation = fund.allocation || 0
        const amount = (totalInvestment * allocation) / 100
        return {
          name: fund.name,
          allocation: allocation,
          amount: amount
        }
      })
      .sort((a, b) => b.amount - a.amount) // Sort by amount descending
  }, [selected, totalInvestment])

  if (selected.length === 0 || totalInvestment === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Investment Summary</h2>
      
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Fund Allocation & Investment Amount</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Fund Name</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Allocation (%)</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investmentData.map(({ name, allocation, amount }) => (
                <tr key={name}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{name}</td>
                  <td className="px-3 py-2 text-right text-slate-800">
                    {allocation.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right text-slate-800">
                    ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td className="px-4 py-2 text-slate-800 font-semibold">Total</td>
                <td className="px-3 py-2 text-right text-slate-800 font-semibold">
                  {investmentData.reduce((sum, item) => sum + item.allocation, 0).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right text-slate-800 font-semibold">
                  ₹{totalInvestment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}


