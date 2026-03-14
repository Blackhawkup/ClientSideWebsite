import { useMemo, useState, useEffect } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import type { FundPerformance, SelectedFund, BenchmarkData } from '../types'
import { fetchData } from '../utils/dataFetcher'

type Props = {
    performance: FundPerformance[]
    selected: SelectedFund[]
}

const PERIODS = [
    { key: '1m', label: '1 Month', benchmarkKey: '1 month' },
    { key: '3m', label: '3 Months', benchmarkKey: '3 months' },
    { key: '6m', label: '6 Months', benchmarkKey: '6 months' },
    { key: '1y', label: '1 Year', benchmarkKey: '1 Year' },
    { key: '3y', label: '3 Year', benchmarkKey: '3 Year' },
    { key: '5y', label: '5 Year', benchmarkKey: '5 Year' },
    { key: '10y', label: '10 Year', benchmarkKey: '10 Year' }
]

export default function MonthlyReturnsBarChart({ performance, selected }: Props) {
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
        return performance.filter(fund => {
            const fundType = fundTypeMap[fund.name]
            const allocation = allocationMap[fund.name] ?? 0
            return fundType.toLowerCase().includes('equity') && allocation > 0
        })
    }, [performance, fundTypeMap, allocationMap])

    const chartData = useMemo(() => {
        if (loading || equityFunds.length === 0) return []

        const selectedBenchmarkData = benchmarks.find(b => b.name === selectedBenchmark)?.monthly_returns || {}

        return PERIODS.map(period => {
            let weightedSum = 0
            let totalAllocation = 0

            equityFunds.forEach(fund => {
                const allocation = allocationMap[fund.name] ?? 0
                const periodReturn = fund.returns[period.key as keyof typeof fund.returns]
                if (periodReturn !== null && periodReturn !== undefined && allocation > 0) {
                    weightedSum += periodReturn * allocation
                    totalAllocation += allocation
                }
            })

            const portfolioReturn = totalAllocation > 0 ? weightedSum / totalAllocation : 0
            const benchmarkReturnRaw = selectedBenchmarkData[period.benchmarkKey]
            const benchmarkReturn = benchmarkReturnRaw !== undefined ? benchmarkReturnRaw * 100 : 0

            return {
                name: period.label,
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
                    <h2 className="text-lg font-semibold text-slate-800">Monthly Returns Graph</h2>
                    <p className="text-sm text-slate-500">Benchmark Comparison (%)</p>
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
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
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
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value) => [`${value}%`]}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="Portfolio" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                        <Bar dataKey="Benchmark" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
