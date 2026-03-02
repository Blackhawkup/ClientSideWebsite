import { Fragment, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type SelectedFund = {
  name: string
  allocation?: number
  type?: string
}

type FundItem = {
  category: string
  name: string
  expenseRatio?: number
  returns?: Record<string, number>
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSelectionChange: (items: SelectedFund[]) => void
  onInvestmentChange: (amount: number) => void
}

export default function Sidebar({ isOpen, onClose, onSelectionChange, onInvestmentChange }: Props) {
  const [allFunds, setAllFunds] = useState<FundItem[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SelectedFund[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalInvestment, setTotalInvestment] = useState<number>(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/data/selector.json')
      .then(response => response.json())
      .then((data) => {
        // Convert JSON structure to FundItem array
        const funds: FundItem[] = []
        Object.entries(data).forEach(([category, subcategories]) => {
          if (typeof subcategories === 'object' && subcategories !== null) {
            Object.entries(subcategories).forEach(([subcategory, fundNames]) => {
              if (Array.isArray(fundNames)) {
                fundNames.forEach(name => {
                  funds.push({
                    category: `${category} - ${subcategory}`,
                    name: name as string
                  })
                })
              }
            })
          }
        })
        setAllFunds(funds)
      })
      .catch((e) => setError(e?.message || 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    onSelectionChange(selected)
  }, [selected, onSelectionChange])

  useEffect(() => {
    onInvestmentChange(totalInvestment)
  }, [totalInvestment, onInvestmentChange])

  // Group funds by main category and subcategory
  const hierarchicalData = useMemo(() => {
    const mainCategories = new Map<string, Map<string, FundItem[]>>()
    
    for (const item of allFunds) {
      if (query && !item.name.toLowerCase().includes(query.toLowerCase())) continue
      
      const [mainCategory, subCategory] = item.category.split(' - ')
      if (!mainCategories.has(mainCategory)) {
        mainCategories.set(mainCategory, new Map())
      }
      
      const subCategories = mainCategories.get(mainCategory)!
      if (!subCategories.has(subCategory)) {
        subCategories.set(subCategory, [])
      }
      
      subCategories.get(subCategory)!.push(item)
    }
    
    return mainCategories
  }, [allFunds, query])

  // For search results, flatten the structure
  const searchResults = useMemo(() => {
    if (!query) return []
    
    const results: Array<{ fund: FundItem; path: string }> = []
    for (const [mainCategory, subCategories] of hierarchicalData) {
      for (const [subCategory, funds] of subCategories) {
        for (const fund of funds) {
          results.push({
            fund,
            path: `${mainCategory} / ${subCategory}`
          })
        }
      }
    }
    
    // Sort by relevance (exact match first, then partial match)
    return results.sort((a, b) => {
      const aName = a.fund.name.toLowerCase()
      const bName = b.fund.name.toLowerCase()
      const queryLower = query.toLowerCase()
      
      if (aName.startsWith(queryLower) && !bName.startsWith(queryLower)) return -1
      if (!aName.startsWith(queryLower) && bName.startsWith(queryLower)) return 1
      return aName.localeCompare(bName)
    })
  }, [hierarchicalData, query])

  const [expandedMain, setExpandedMain] = useState<Record<string, boolean>>({})
  const [expandedSub, setExpandedSub] = useState<Record<string, boolean>>({})
  
  const toggleMainCategory = (category: string) => 
    setExpandedMain(prev => ({ ...prev, [category]: !prev[category] }))
  
  const toggleSubCategory = (key: string) => 
    setExpandedSub(prev => ({ ...prev, [key]: !prev[key] }))

  const addFund = (name: string, category: string) => {
    if (selected.some(s => s.name === name)) return
    const mainCategory = category.split(' - ')[0]
    setSelected(prev => [...prev, { name, allocation: undefined, type: mainCategory }])
  }

  const updateAllocation = (name: string, value: number | undefined) => {
    setSelected(prev => prev.map(s => s.name === name ? { ...s, allocation: value } : s))
  }

  const removeFund = (name: string) => {
    setSelected(prev => prev.filter(s => s.name !== name))
  }

  const total = selected.reduce((sum, s) => sum + (typeof s.allocation === 'number' && Number.isFinite(s.allocation) ? s.allocation : 0), 0)
  
  // Calculate percentage breakdown by category
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {}
    selected.forEach(fund => {
      const allocation = typeof fund.allocation === 'number' && Number.isFinite(fund.allocation) ? fund.allocation : 0
      if (allocation > 0) {
        // Find the main category for this fund
        const fundData = allFunds.find(f => f.name === fund.name)
        if (fundData) {
          const mainCategory = fundData.category.split(' - ')[0]
          breakdown[mainCategory] = (breakdown[mainCategory] || 0) + allocation
        }
      }
    })
    return breakdown
  }, [selected, allFunds])

  return (
    <div className={`fixed inset-0 z-40 ${isOpen ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-slate-900/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute left-0 top-0 flex flex-col w-[500px] max-w-[92vw] bg-white shadow-xl border-r border-slate-200 transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!isOpen}
        style={{ top: '73px', height: 'calc(100vh - 73px)' }} // Account for fixed header height
      >
        <div className="flex items-center justify-between px-4 shrink-0 h-14 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Funds</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-100 text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search funds..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
            {loading && <div className="p-4 text-sm text-slate-500">Loading funds…</div>}
            {!loading && error && (
              <div className="p-4 text-sm text-red-600">{error}</div>
            )}
            {!loading && !error && query && searchResults.length === 0 && (
              <div className="p-4 text-sm text-slate-500">No results found</div>
            )}
            {!loading && !error && !query && hierarchicalData.size === 0 && (
              <div className="p-4 text-sm text-slate-500">No funds available</div>
            )}
            
            {/* Search Results */}
            {query && searchResults.map(({ fund, path }) => (
              <div key={fund.name} className="px-3 py-2 border-b border-slate-200 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-slate-800 font-medium">{fund.name}</div>
                    <div className="text-xs text-slate-500">{path}</div>
                    {fund.expenseRatio !== undefined && (
                      <div className="text-xs text-slate-400">ER: {fund.expenseRatio}%</div>
                    )}
                  </div>
                  <button
                    onClick={() => addFund(fund.name, fund.category)}
                    className="text-brand-600 hover:text-brand-700 text-sm font-medium ml-2"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
            
            {/* Hierarchical Structure */}
            {!query && Array.from(hierarchicalData.entries()).map(([mainCategory, subCategories]) => (
              <div key={mainCategory} className="border-b border-slate-200">
                <button
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-700"
                  onClick={() => toggleMainCategory(mainCategory)}
                >
                  <span>{mainCategory}</span>
                  <span className="text-lg">{expandedMain[mainCategory] ? '−' : '+'}</span>
                </button>
                <AnimatePresence initial={false}>
                  {expandedMain[mainCategory] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {Array.from(subCategories.entries()).map(([subCategory, funds]) => {
                        const subKey = `${mainCategory}-${subCategory}`
                        return (
                          <div key={subKey} className="border-b border-slate-100">
                            <button
                              className="w-full flex items-center justify-between px-6 py-2 bg-slate-25 hover:bg-slate-50 text-xs font-medium text-slate-600"
                              onClick={() => toggleSubCategory(subKey)}
                            >
                              <span>{subCategory}</span>
                              <span className="text-sm">{expandedSub[subKey] ? '−' : '+'}</span>
                            </button>
                            <AnimatePresence initial={false}>
                              {expandedSub[subKey] && (
                                <motion.ul
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="divide-y divide-slate-100 overflow-hidden"
                                >
                                  {funds.map(fund => (
                                    <li key={fund.name} className="px-6 py-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="text-sm text-slate-800 font-medium">{fund.name}</div>
                                          <div className="text-xs text-slate-500">{mainCategory} / {subCategory}</div>
                                          {fund.expenseRatio !== undefined && (
                                            <div className="text-xs text-slate-400">ER: {fund.expenseRatio}%</div>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => addFund(fund.name, fund.category)}
                                          className="text-brand-600 hover:text-brand-700 text-sm font-medium ml-2"
                                        >
                                          Add
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="space-y-2" aria-live="polite">
            <h3 className="text-sm font-semibold text-slate-700">Selected</h3>
            
            {/* Category Breakdown */}
            {Object.keys(categoryBreakdown).length > 0 && (
              <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                <div className="text-xs font-medium text-slate-600 mb-2">Allocation by Category</div>
                <div className="space-y-1">
                  {Object.entries(categoryBreakdown).map(([category, percentage]) => (
                    <div key={category} className="flex justify-between text-xs">
                      <span className="text-slate-600">{category}</span>
                      <span className="font-medium text-slate-800">{percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Selected Funds List - Scrollable */}
            <div className="rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
              {selected.length === 0 && (
                <div className="p-4 text-sm text-slate-500">No funds selected</div>
              )}
              {selected.map(item => {
                const fundData = allFunds.find(f => f.name === item.name)
                const categoryPath = fundData ? fundData.category : 'Unknown'
                return (
                  <div key={item.name} className="grid grid-cols-12 items-center gap-3 p-3 border-b border-slate-100 last:border-b-0">
                    <div className="col-span-7">
                      <div className="text-sm text-slate-800 font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500">{categoryPath}</div>
                    </div>
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={typeof item.allocation === 'number' && Number.isFinite(item.allocation) ? item.allocation : ''}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '') { updateAllocation(item.name, undefined); return }
                            const n = Number(val)
                            if (!Number.isNaN(n)) updateAllocation(item.name, Math.max(0, Math.min(100, n)))
                          }}
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          placeholder="0"
                          inputMode="decimal"
                        />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                    </div>
                    <div className="col-span-1 text-right">
                      <button onClick={() => removeFund(item.name)} className="text-slate-400 hover:text-red-500">✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Total Allocation */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-slate-700">Total Allocation</span>
              <span className={`text-sm font-semibold ${Math.round(total) === 100 ? 'text-green-600' : 'text-red-600'}`}>{total.toFixed(2)}%</span>
            </div>
            
            {/* Investment Amount */}
            <div className="pt-4 border-t border-slate-200">
              <div className="mb-2">
                <label className="text-sm font-medium text-slate-700">Total Investment Amount</label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">₹</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={totalInvestment || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '') { 
                      setTotalInvestment(0)
                      return 
                    }
                    const n = Number(val)
                    if (!Number.isNaN(n)) setTotalInvestment(Math.max(0, n))
                  }}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Enter investment amount"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>
          </div>
        </div>
      </aside>
    </div>
  )
}


