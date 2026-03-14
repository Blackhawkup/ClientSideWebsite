import { useMemo, useState, useEffect } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import type { FundYearlyPerformance, SelectedFund, BenchmarkData } from '../types'
import { fetchData } from '../utils/dataFetcher'

type Props = {
    yearly: FundYearlyPerformance[]
    selected: SelectedFund[]
}

export default function BacktestedReturnsChart({ yearly, selected }: Props) {
    const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([])
    const [selectedBenchmark, setSelectedBenchmark] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await fetchData('/data/sheet5_data.json')
                if (response.ok) {
                    const data = await response.json()
                    setBenchmarks(data)
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
        loadData()
    }, [])

    // Allocation Map
    const allocationMap = useMemo(() => {
        const map: Record<string, number> = {}
        for (const s of selected) {
            map[s.name] = typeof s.allocation === 'number' ? s.allocation : 0
        }
        return map
    }, [selected])

    // Fund Type Map (Equity Filter)
    const fundTypeMap = useMemo(() => {
        const map: Record<string, string> = {}
        for (const s of selected) {
            map[s.name] = s.type || ''
        }
        return map
    }, [selected])

    const equityFunds = useMemo(() => {
        return yearly.filter(fund => {
            const fundType = fundTypeMap[fund.name]
            const allocation = allocationMap[fund.name] ?? 0
            return fundType.toLowerCase().includes('equity') && allocation > 0
        })
    }, [yearly, fundTypeMap, allocationMap])

    const years = ['2019', '2020', '2021', '2022', '2023', '2024', 'CY 2025']

    const chartData = useMemo(() => {
        if (loading || equityFunds.length === 0) return []

        const selectedBenchmarkData = benchmarks.find(b => b.name === selectedBenchmark)?.yearly_returns || {}

        return years.map((year, index) => {
            // Re-map index because yearly.years is usually latest-first [2025, 2024, ...] 
            // but years array above is [2019, 2020, ...]
            // Yearly state mapping normally from BacktestedReturns component:
            // ['CY 2025', '2024', '2023', '2022', '2021', '2020', '2019'] -> indices 0 to 6
            const yearlyIndex = 6 - index; // if index 0 is 2019, yearlyIndex is 6

            let weightedSum = 0
            let totalAllocation = 0

            equityFunds.forEach(fund => {
                const allocation = allocationMap[fund.name] ?? 0
                const yearReturn = fund.years[yearlyIndex]
                if (yearReturn !== null && yearReturn !== undefined && allocation > 0) {
                    weightedSum += yearReturn * allocation
                    totalAllocation += allocation
                }
            })

            const portfolioReturn = totalAllocation > 0 ? weightedSum / totalAllocation : 0
            const benchmarkReturnRaw = selectedBenchmarkData[year]
            const benchmarkReturn = benchmarkReturnRaw !== undefined ? benchmarkReturnRaw * 100 : 0

            return {
                year,
                Portfolio: parseFloat(portfolioReturn.toFixed(2)),
                Benchmark: parseFloat(benchmarkReturn.toFixed(2))
            }
        })
    }, [equityFunds, benchmarks, selectedBenchmark, allocationMap, loading])

    if (loading) return null;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Backtested Returns Graph</h2>
                    <p className="text-sm text-slate-500">Historical Comparison (%)</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Comparison:</span>
                    <select
                        value={selectedBenchmark}
                        onChange={(e) => setSelectedBenchmark(e.target.value)}
                        className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {benchmarks.map(item => (
                            <option key={item.name} value={item.name}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="year"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value) => [`${value}%`]}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line
                            type="monotone"
                            dataKey="Portfolio"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="Benchmark"
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
