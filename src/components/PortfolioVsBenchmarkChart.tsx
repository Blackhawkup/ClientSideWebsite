import { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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

export default function PortfolioVsBenchmarkChart({ yearly, selected }: Props) {
  const [sheet5Data, setSheet5Data] = useState<Sheet5Data[]>([])
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('')
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
            setSelectedBenchmark(data[0].name)
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

  // Calculate cumulative portfolio returns
  const chartData = useMemo(() => {
    const years = ['CY 2025', '2024', '2023', '2022', '2021', '2020', '2019']
    const data: Array<{ year: string; portfolio: number; benchmark: number }> = []

    // Calculate portfolio returns for each year
    const portfolioReturns: number[] = []
    years.forEach((_, index) => {
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
        portfolioReturns.push(weightedSum / totalAllocation)
      } else {
        portfolioReturns.push(0)
      }
    })

    // Get benchmark returns
    const benchmarkData = sheet5Data.find(item => item.name === selectedBenchmark)?.yearly_returns || {}
    const benchmarkReturns = years.map(year => {
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
      return benchmarkData[dataKey] ? benchmarkData[dataKey] * 100 : 0
    })

    // Calculate cumulative returns (starting from 100)
    let portfolioCumulative = 100
    let benchmarkCumulative = 100

    years.forEach((year, index) => {
      portfolioCumulative = portfolioCumulative * (1 + portfolioReturns[index] / 100)
      benchmarkCumulative = benchmarkCumulative * (1 + benchmarkReturns[index] / 100)

      data.push({
        year,
        portfolio: Number(portfolioCumulative.toFixed(2)),
        benchmark: Number(benchmarkCumulative.toFixed(2))
      })
    })

    return data.reverse() // Show oldest to newest
  }, [equityFunds, allocationMap, sheet5Data, selectedBenchmark])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Portfolio vs Benchmark Performance</h2>
        <div className="text-slate-500 text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Portfolio vs Benchmark Performance</h2>
      
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Cumulative Performance Over Time</h3>
          <select
            value={selectedBenchmark}
            onChange={(e) => setSelectedBenchmark(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white"
          >
            {sheet5Data.map(item => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="year" 
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
                tickFormatter={(value) => `${value.toFixed(0)}`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)}`, 
                  name === 'portfolio' ? 'Portfolio' : 'Benchmark'
                ]}
                labelFormatter={(label) => `Year: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="portfolio" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Portfolio"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="benchmark" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Benchmark"
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}


