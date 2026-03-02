import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { FundSourceData, SelectedFund } from '../types'

type Props = {
  sourceData: FundSourceData[]
  selected: SelectedFund[]
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function PortfolioPieChart({ sourceData, selected }: Props) {
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

  // Calculate weighted market cap allocation
  const marketCapData = useMemo(() => {
    const marketCapWeights: Record<string, number> = {
      'Large Cap': 0,
      'Mid Cap': 0,
      'Small Cap': 0,
      'Others/Cash': 0
    }

    equityFunds.forEach(fund => {
      const allocation = allocationMap[fund.name] ?? 0
      const fundData = fund.data

      // Get market cap allocations from source data
      const largeCap = fundData['Largecap'] || 0
      const midCap = fundData['Midcap'] || 0
      const smallCap = fundData['Small Cap '] || 0
      const others = fundData['Others/Cash'] || 0

      // Weight by fund allocation (divide by 100 since values are already in percentage)
      marketCapWeights['Large Cap'] += (largeCap / 100) * allocation
      marketCapWeights['Mid Cap'] += (midCap / 100) * allocation
      marketCapWeights['Small Cap'] += (smallCap / 100) * allocation
      marketCapWeights['Others/Cash'] += (others / 100) * allocation
    })

    // Convert to array format for pie chart
    return Object.entries(marketCapWeights)
      .filter(([_, value]) => value > 0) // Only include non-zero values
      .map(([name, value], index) => ({
        name,
        value: Number(value.toFixed(2)),
        fill: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value) // Sort by value descending
  }, [equityFunds, allocationMap])

  const totalAllocation = marketCapData.reduce((sum, item) => sum + item.value, 0)

  if (marketCapData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Portfolio Allocation by Market Cap</h2>
        <div className="h-80 flex items-center justify-center text-slate-500">
          No equity fund data available
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Portfolio Allocation by Market Cap</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={marketCapData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${(value || 0).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {marketCapData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Allocation']}
                labelFormatter={(label) => `Market Cap: ${label}`}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-slate-600">
              <span className="font-medium">Total Allocation:</span> {totalAllocation.toFixed(1)}%
            </div>
            <div className="text-slate-600">
              <span className="font-medium">Equity Funds:</span> {equityFunds.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
