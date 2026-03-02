import { useMemo, useState, useEffect } from 'react'
import type { FundYearlyPerformance, SelectedFund } from '../types'

type Props = {
  yearly: FundYearlyPerformance[]
  selected: SelectedFund[]
}

type Sheet5Data = {
  name: string
  yearly_returns: Record<string, number>
  monthly_returns: Record<string, number>
}

export default function BacktestedReturns({ yearly, selected }: Props) {
  const [sheet5Data, setSheet5Data] = useState<Sheet5Data[]>([])
  const [selectedReturn, setSelectedReturn] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Load Sheet5 data
  useEffect(() => {
    const loadSheet5Data = async () => {
      try {
        const response = await fetch('/data/sheet5_data.json')
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
    return yearly.filter(fund => {
      const fundType = fundTypeMap[fund.name]
      const allocation = allocationMap[fund.name] ?? 0
      return fundType.toLowerCase().includes('equity') && allocation > 0
    })
  }, [yearly, fundTypeMap, allocationMap])

  // Calculate weighted equity portfolio returns for each year
  const equityPortfolioReturns = useMemo(() => {
    const years = ['CY 2025', '2024', '2023', '2022', '2021', '2020', '2019']
    const results: Record<string, number> = {}

    years.forEach((year, index) => {
      let weightedSum = 0
      let totalAllocation = 0

      equityFunds.forEach(fund => {
        const allocation = allocationMap[fund.name] ?? 0
        const yearReturn = fund.years[index]
        
        if (yearReturn !== null && yearReturn !== undefined && allocation > 0) {
          weightedSum += yearReturn * allocation
          totalAllocation += allocation
        }
      })

      if (totalAllocation > 0) {
        results[year] = weightedSum / totalAllocation
      } else {
        results[year] = 0
      }
    })

    return results
  }, [equityFunds, allocationMap])

  // Get selected return data
  const selectedReturnData = useMemo(() => {
    if (!selectedReturn || sheet5Data.length === 0) return {}
    const data = sheet5Data.find(item => item.name === selectedReturn)?.yearly_returns || {}
    return data
  }, [sheet5Data, selectedReturn])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Backtested Returns - CY</h2>
        <div className="text-slate-500 text-center">Loading...</div>
      </div>
    )
  }


  const years = ['CY 2025', '2024', '2023', '2022', '2021', '2020', '2019']

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Backtested Returns</h2>
      
      {/* Combined Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Backtested Returns</h3>
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
                <th className="text-left px-4 py-2 font-medium text-slate-600">Years</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Equity Portfolio</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {years.map((year, yearIndex) => {
                const portfolioReturn = equityPortfolioReturns[year]
                const yearMap: Record<string, string> = {
                  'CY 2025': 'CY 2025',
                  '2024': '2024',
                  '2023': '2023',
                  '2022': '2022',
                  '2021': '2021',
                  '2020': '2020',
                  '2019': '2019'
                }
                const dataKey = yearMap[year]
                const benchmarkValue = selectedReturnData[dataKey]
                const benchmarkReturn = benchmarkValue ? benchmarkValue * 100 : null
                
                // Determine color based on performance comparison
                const getPortfolioColor = () => {
                  if (portfolioReturn === null || portfolioReturn === undefined || benchmarkReturn === null) {
                    return 'text-slate-800'
                  }
                  return portfolioReturn > benchmarkReturn ? 'text-green-600' : 'text-red-600'
                }
                
                return (
                  <tr key={year}>
                    <td className="px-4 py-2 text-slate-800 font-medium">{year}</td>
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
