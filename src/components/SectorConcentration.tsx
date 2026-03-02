import { useMemo, useState, useEffect } from 'react'
import type { SelectedFund } from '../types'

type Props = {
  selected: SelectedFund[]
}

type Sheet2Data = {
  fund_holdings: Record<string, Record<string, number>>
  sector_holdings: Record<string, Record<string, number>>
  company_sectors: Record<string, Record<string, string>>
}

export default function SectorConcentration({ selected }: Props) {
  const [sheet2Data, setSheet2Data] = useState<Sheet2Data | null>(null)
  const [loading, setLoading] = useState(true)

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

  // Filter equity funds only
  const equityFunds = useMemo(() => {
    return selected.filter(fund => {
      const fundType = fundTypeMap[fund.name]
      const allocation = allocationMap[fund.name] ?? 0
      return fundType.toLowerCase().includes('equity') && allocation > 0
    })
  }, [selected, fundTypeMap, allocationMap])

  // Calculate sector concentration
  const sectorConcentration = useMemo(() => {
    if (!sheet2Data) return { top3: 0, top5: 0, top11: 0 }

    const sectorWeights: Record<string, number> = {}

    equityFunds.forEach(fund => {
      const allocation = allocationMap[fund.name] ?? 0
      const fundHoldings = sheet2Data.fund_holdings[fund.name] || {}
      const companySectors = sheet2Data.company_sectors[fund.name] || {}

      // Calculate sector weights by aggregating company holdings by sector
      Object.entries(fundHoldings).forEach(([company, holdingPercent]) => {
        const sector = companySectors[company]
        if (sector) {
          // holdingPercent is already in percentage format
          const weightedHolding = holdingPercent * allocation
          sectorWeights[sector] = (sectorWeights[sector] || 0) + weightedHolding
        }
      })
    })

    // Sort by weight and calculate concentrations
    const sortedWeights = Object.values(sectorWeights)
      .sort((a, b) => b - a)

    const top3 = sortedWeights.slice(0, 3).reduce((sum, w) => sum + w, 0)
    const top5 = sortedWeights.slice(0, 5).reduce((sum, w) => sum + w, 0)
    const top11 = sortedWeights.slice(0, 11).reduce((sum, w) => sum + w, 0)

    return { top3, top5, top11 }
  }, [sheet2Data, equityFunds, allocationMap])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Sector Concentration</h2>
        <div className="text-slate-500 text-center">Loading...</div>
      </div>
    )
  }

  const concentrations = [
    { label: 'Top 3', value: sectorConcentration.top3 },
    { label: 'Top 5', value: sectorConcentration.top5 },
    { label: 'Top 11', value: sectorConcentration.top11 }
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Sector Concentration</h2>
      
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Portfolio Concentration by Sector</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Position</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Concentration (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {concentrations.map(({ label, value }) => (
                <tr key={label}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{label}</td>
                  <td className="px-3 py-2 text-right text-slate-800">
                    {value.toFixed(2)}%
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
