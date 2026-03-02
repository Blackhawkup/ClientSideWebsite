import { useMemo, useState, useEffect } from 'react'
import type { SelectedFund } from '../types'

type Props = {
  selected: SelectedFund[]
}

type Sheet2Data = {
  fund_holdings: Record<string, Record<string, number>>
  sector_holdings: Record<string, Record<string, number>>
  hybrid_fund_holdings: Record<string, Record<string, number>>
  hybrid_sector_holdings: Record<string, Record<string, number>>
  hybrid_company_sectors: Record<string, Record<string, string>>
}

export default function EquityStockExposure({ selected }: Props) {
  const [sheet2Data, setSheet2Data] = useState<Sheet2Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<'equity' | 'hybrid'>('equity')

  // Load Sheet2 data
  useEffect(() => {
    const loadSheet2Data = async () => {
      try {
        const response = await fetch('/data/sheet2_data.json')
        if (response.ok) {
          const data = await response.json()
          setSheet2Data(data)
        }
      } catch (error) {
        console.error('Error loading Sheet2 data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSheet2Data()
  }, [])

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

  // Filter funds based on view type
  const filteredFunds = useMemo(() => {
    return selected.filter(fund => {
      const fundType = fundTypeMap[fund.name]
      const allocation = allocationMap[fund.name] ?? 0

      if (viewType === 'equity') {
        return fundType.toLowerCase().includes('equity') && allocation > 0
      } else {
        return fundType.toLowerCase().includes('hybrid') && allocation > 0
      }
    })
  }, [selected, fundTypeMap, allocationMap, viewType])

  // Check if hybrid data is available
  const hasHybridData = useMemo(() => {
    if (!sheet2Data) return false
    return Object.keys(sheet2Data.hybrid_fund_holdings || {}).length > 0
  }, [sheet2Data])

  // Calculate weighted company exposures
  const companyExposures = useMemo(() => {
    if (!sheet2Data) return []

    const companyWeights: Record<string, number> = {}

    filteredFunds.forEach(fund => {
      const allocation = allocationMap[fund.name] ?? 0
      const fundHoldings = viewType === 'equity'
        ? sheet2Data.fund_holdings[fund.name] || {}
        : sheet2Data.hybrid_fund_holdings[fund.name] || {}

      Object.entries(fundHoldings).forEach(([company, holdingPercent]) => {
        // holdingPercent is already in percentage format (e.g., 0.0089 for 0.0089%)
        const weightedHolding = holdingPercent * allocation
        companyWeights[company] = (companyWeights[company] || 0) + weightedHolding
      })
    })

    // Sort by weight and take top 20
    return Object.entries(companyWeights)
      .map(([company, weight]) => ({ company, weight: weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 20)
  }, [sheet2Data, filteredFunds, allocationMap, viewType])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Equity Stock Exposure</h2>
        <div className="text-slate-500 text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-700">
          {viewType === 'equity' ? 'Equity Stock Exposure' : 'Hybrid Stock Exposure'}
        </h2>
        {hasHybridData && (
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value as 'equity' | 'hybrid')}
            className="text-sm border border-slate-300 rounded-md px-3 py-1 bg-white"
          >
            <option value="equity">Equity Funds</option>
            <option value="hybrid">Hybrid Funds</option>
          </select>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Top 20 Holdings by Portfolio Weight</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Company Name</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Portfolio Weight (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companyExposures.map(({ company, weight }) => (
                <tr key={company}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{company}</td>
                  <td className="px-3 py-2 text-right text-slate-800">
                    {weight.toFixed(2)}%
                  </td>
                </tr>
              ))}
              {companyExposures.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                    {viewType === 'equity' ? 'No equity fund data available' : 'No hybrid fund data available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
