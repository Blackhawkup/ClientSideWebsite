import { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { SourceData, SelectedFund } from '../types'

type Props = {
  sourceData: SourceData[]
  selected: SelectedFund[]
}

type ScatterDataPoint = {
  x: number // Beta (risk)
  y: number // 3-year returns
  name: string
  allocation: number
  type: string
  color: string
}

export default function RiskReturnScatter({ sourceData, selected }: Props) {
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

  // Filter selected funds with allocations
  const selectedFunds = useMemo(() => {
    return sourceData.filter(fund => {
      const allocation = allocationMap[fund.name] ?? 0
      return allocation > 0
    })
  }, [sourceData, allocationMap])

  // Prepare scatter plot data
  const scatterData = useMemo(() => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']
    let colorIndex = 0

    return selectedFunds.map(fund => {
      const allocation = allocationMap[fund.name] ?? 0
      const fundType = fundTypeMap[fund.name] || 'Unknown'
      
      // Get 3-year returns (convert from percentage to decimal)
      const threeYearReturn = fund['3 Year'] ? fund['3 Year'] * 100 : 0
      
      // Get Beta (risk measure)
      const beta = fund.Beta || 0
      
      const color = colors[colorIndex % colors.length]
      colorIndex++

      return {
        x: beta,
        y: threeYearReturn,
        name: fund.name,
        allocation,
        type: fundType,
        color
      } as ScatterDataPoint
    }).filter(point => point.x > 0 && point.y !== 0) // Filter out invalid data points
  }, [selectedFunds, allocationMap, fundTypeMap])

  // Calculate axis ranges for better visualization
  const xAxisRange = useMemo(() => {
    if (scatterData.length === 0) return [0, 1]
    const xValues = scatterData.map(d => d.x)
    const minX = Math.min(...xValues)
    const maxX = Math.max(...xValues)
    const padding = (maxX - minX) * 0.1
    return [Math.max(0, minX - padding), maxX + padding]
  }, [scatterData])

  const yAxisRange = useMemo(() => {
    if (scatterData.length === 0) return [0, 1]
    const yValues = scatterData.map(d => d.y)
    const minY = Math.min(...yValues)
    const maxY = Math.max(...yValues)
    const padding = (maxY - minY) * 0.1
    return [minY - padding, maxY + padding]
  }, [scatterData])

  if (scatterData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Risk-Return Analysis</h2>
        <div className="text-slate-500 text-center">No data available for selected funds</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Risk-Return Analysis</h2>
      
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Fund Risk vs Return Profile</h3>
          <p className="text-xs text-slate-600">
            X-axis: Beta (risk measure) | Y-axis: 3-Year Returns (%) | Size: Allocation (%)
          </p>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={scatterData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Beta"
                stroke="#64748b"
                fontSize={12}
                domain={xAxisRange}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="3-Year Returns (%)"
                stroke="#64748b"
                fontSize={12}
                domain={yAxisRange}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload as ScatterDataPoint
                    return (
                      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                        <p className="font-semibold text-slate-800">{data.name}</p>
                        <p className="text-sm text-slate-600">Type: {data.type}</p>
                        <p className="text-sm text-slate-600">Beta: {data.x.toFixed(3)}</p>
                        <p className="text-sm text-slate-600">3-Year Return: {data.y.toFixed(2)}%</p>
                        <p className="text-sm text-slate-600">Allocation: {data.allocation.toFixed(1)}%</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Scatter dataKey="y" fill="#8884d8">
                {scatterData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    r={Math.max(4, Math.min(12, entry.allocation * 0.3))} // Size based on allocation
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-xs text-slate-600">
          <p><strong>Interpretation:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Top-right: High risk, high return funds</li>
            <li>Bottom-left: Low risk, low return funds</li>
            <li>Top-left: Low risk, high return funds (ideal)</li>
            <li>Bottom-right: High risk, low return funds (avoid)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}


