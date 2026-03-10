import { useMemo, useState, useEffect } from 'react'
import type { FundPerformance, SelectedFund } from '../types'
import { fetchData } from '../utils/dataFetcher';


type Props = {
  performance: FundPerformance[]
  selected: SelectedFund[]
}

type Sheet5Data = {
  name: string
  yearly_returns: Record<string, number>
  monthly_returns: Record<string, number>
}

export default function MonthlyReturns({ performance, selected }: Props) {
  const [sheet5Data, setSheet5Data] = useState<Sheet5Data[]>([])
  const [selectedReturn, setSelectedReturn] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Load Sheet5 data
  useEffect(() => {
    const loadSheet5Data = async () => {
      try {
        const response = await fetchData('/data/sheet5_data.json')
        if (response.ok) {
          const data = await response.json()
          setSheet5Data(data)
          if (data.length > 0) {
            setSelectedReturn(data[0].name)
          }
        }
      } catch (error) {
        console.error('Error loading Sheet5 data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSheet5Data()
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
    return performance.filter(fund => {
      const fundType = fundTypeMap[fund.name]
      const allocation = allocationMap[fund.name] ?? 0
      return fundType.toLowerCase().includes('equity') && allocation > 0
    })
  }, [performance, fundTypeMap, allocationMap])

  // Calculate weighted equity portfolio returns for each period
  const equityPortfolioReturns = useMemo(() => {
    const periods = ['1m', '3m', '6m', '1y', '3y', '5y', '10y']
    const results: Record<string, number> = {}

    periods.forEach(period => {
      let weightedSum = 0
      let totalAllocation = 0

      equityFunds.forEach(fund => {
        const allocation = allocationMap[fund.name] ?? 0
        const periodReturn = fund.returns[period as keyof typeof fund.returns]
        
        if (periodReturn !== null && periodReturn !== undefined && allocation > 0) {
          weightedSum += periodReturn * allocation
          totalAllocation += allocation
        }
      })

      if (totalAllocation > 0) {
        results[period] = weightedSum / totalAllocation
      } else {
        results[period] = 0
      }
    })

    return results
  }, [equityFunds, allocationMap])

  // Get selected return data
  const selectedReturnData = useMemo(() => {
    return sheet5Data.find(item => item.name === selectedReturn)?.monthly_returns || {}
  }, [sheet5Data, selectedReturn])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Backtested Returns - CAGR</h2>
        <div className="text-slate-500 text-center">Loading...</div>
      </div>
    )
  }

  const periods = [
    { key: '1m', label: '1 Month' },
    { key: '3m', label: '3 Months' },
    { key: '6m', label: '6 Months' },
    { key: '1y', label: '1 Year' },
    { key: '3y', label: '3 Year' },
    { key: '5y', label: '5 Year' },
    { key: '10y', label: '10 Year' }
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Monthly Returns</h2>
      
      {/* Combined Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Monthly Returns</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Benchmark:</span>
              <select
                value={selectedReturn}
                onChange={(e) => setSelectedReturn(e.target.value)}
                className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white"
              >
                {sheet5Data.map(item => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Period</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Equity Portfolio</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map(({ key, label }) => {
                const portfolioReturn = equityPortfolioReturns[key]
                const periodMap: Record<string, string> = {
                  '1m': '1 month',
                  '3m': '3 months', 
                  '6m': '6 months',
                  '1y': '1 Year',
                  '3y': '3 Year',
                  '5y': '5 Year',
                  '10y': '10 Year'
                }
                const sheet5Key = periodMap[key]
                const benchmarkValue = selectedReturnData[sheet5Key]
                const benchmarkReturn = benchmarkValue ? benchmarkValue * 100 : null
                
                // Determine color based on performance comparison
                const getPortfolioColor = () => {
                  if (portfolioReturn === null || portfolioReturn === undefined || benchmarkReturn === null) {
                    return 'text-slate-800'
                  }
                  return portfolioReturn > benchmarkReturn ? 'text-green-600' : 'text-red-600'
                }
                
                return (
                  <tr key={key}>
                    <td className="px-4 py-2 text-slate-800 font-medium">{label}</td>
                    <td className={`px-3 py-2 text-right ${getPortfolioColor()}`}>
                      {portfolioReturn ? `${portfolioReturn.toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-800">
                      {benchmarkReturn ? `${benchmarkReturn.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
