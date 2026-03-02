import { useMemo } from 'react'
import type { FundSourceData, SelectedFund } from '../types'

type Props = {
  sourceData: FundSourceData[]
  selected: SelectedFund[]
}

export default function PortfolioAttributes({ sourceData, selected }: Props) {
  // Get allocation map for selected funds
  const allocationMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of selected) {
      map[s.name] = typeof s.allocation === 'number' ? s.allocation : 0
    }
    return map
  }, [selected])

  // Get fund type map
  const fundTypeMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of selected) {
      map[s.name] = s.type || ''
    }
    return map
  }, [selected])

  // Filter equity funds only
  const equityFunds = useMemo(() => {
    return sourceData.filter(fund => {
      const fundType = fundTypeMap[fund.name]
      const allocation = allocationMap[fund.name] ?? 0
      return fundType.toLowerCase().includes('equity') && allocation > 0
    })
  }, [sourceData, fundTypeMap, allocationMap])

  // Calculate weighted portfolio attributes
  const portfolioAttributes = useMemo(() => {
    let totalPE = 0
    let totalPB = 0
    let totalBeta = 0
    let totalAllocation = 0

    equityFunds.forEach(fund => {
      const allocation = allocationMap[fund.name] ?? 0
      if (allocation > 0) {
        const pe = fund.data['P/E']
        const pb = fund.data['P/B']
        const beta = fund.data['Beta']

        if (pe !== null && pe !== undefined && typeof pe === 'number') {
          totalPE += pe * allocation
        }
        if (pb !== null && pb !== undefined && typeof pb === 'number') {
          totalPB += pb * allocation
        }
        if (beta !== null && beta !== undefined && typeof beta === 'number') {
          totalBeta += beta * allocation
        }
        totalAllocation += allocation
      }
    })

    if (totalAllocation > 0) {
      return {
        pe: totalPE / totalAllocation,
        pb: totalPB / totalAllocation,
        beta: totalBeta / totalAllocation
      }
    }

    return { pe: 0, pb: 0, beta: 0 }
  }, [equityFunds, allocationMap])

  const attributes = [
    { key: 'pe', label: 'P/E', value: portfolioAttributes.pe },
    { key: 'pb', label: 'P/B', value: portfolioAttributes.pb },
    { key: 'beta', label: 'Beta', value: portfolioAttributes.beta }
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Portfolio Attributes</h2>
      
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Weighted Portfolio Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Metric</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attributes.map(({ key, label, value }) => (
                <tr key={key}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{label}</td>
                  <td className="px-3 py-2 text-right text-slate-800">
                    {value ? value.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

