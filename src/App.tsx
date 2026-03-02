import { useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import PerformanceTable from "./components/PerformanceTable";
import YearlyReturnsTable from "./components/YearlyReturnsTable";
import TopThreeLineChart from "./components/TopThreeLineChart.tsx";
import TopThreeYearlyLineChart from "./components/TopThreeYearlyLineChart";
import SourceDataTable from "./components/SourceDataTable";
import BacktestedReturns from "./components/BacktestedReturns";
import MonthlyReturns from "./components/MonthlyReturns";
import PortfolioAttributes from "./components/PortfolioAttributes";
import EquityStockExposure from "./components/EquityStockExposure";
import PositionConcentration from "./components/PositionConcentration";
import SectorExposure from "./components/SectorExposure";
import SectorConcentration from "./components/SectorConcentration";
import PortfolioPieChart from "./components/PortfolioPieChart";
import PortfolioVsBenchmarkChart from "./components/PortfolioVsBenchmarkChart";
import RiskReturnScatter from "./components/RiskReturnScatter";
import InvestmentSummary from "./components/InvestmentSummary";
import type { FundPerformance, FundYearlyPerformance, FundSourceData, SelectedFund } from "./types";

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFunds, setSelectedFunds] = useState<SelectedFund[]>([]);
  const [performance, setPerformance] = useState<FundPerformance[]>([]);
  const [yearly, setYearly] = useState<FundYearlyPerformance[]>([]);
  const [sourceData, setSourceData] = useState<FundSourceData[]>([]);
  const [totalInvestment, setTotalInvestment] = useState<number>(0);

  const selectedNames = useMemo(() => new Set(selectedFunds.map(f => f.name)), [selectedFunds]);
  
  const totalAllocation = useMemo(() => {
    return selectedFunds.reduce((sum, fund) => {
      const allocation = typeof fund.allocation === 'number' && Number.isFinite(fund.allocation) ? fund.allocation : 0;
      return sum + allocation;
    }, 0);
  }, [selectedFunds]);
  
  const isAllocationValid = Math.round(totalAllocation) === 100;

  const handleApply = async () => {
    try {
      const [resPerf, resYear, resSource] = await Promise.all([
        fetch('/data/performance.json', { cache: 'no-store' }),
        fetch('/data/performance_yearly.json', { cache: 'no-store' }),
        fetch('/data/source_data.json', { cache: 'no-store' }),
      ])
      if (!resPerf.ok) throw new Error(`Failed to load performance: ${resPerf.status}`)
      if (!resYear.ok) throw new Error(`Failed to load yearly performance: ${resYear.status}`)
      if (!resSource.ok) throw new Error(`Failed to load source data: ${resSource.status}`)
      const rawMap: Record<string, Record<string, number | null>> = await resPerf.json();
      const rawYear: Record<string, (number | null)[]> = await resYear.json();
      const rawSource: Record<string, Record<string, any>> = await resSource.json();

      // Build a case/space-insensitive lookup: trim and lowercase
      const norm = (s: string) => s.trim().toLowerCase();
      const allMap: Record<string, Record<string, number | null>> = {}
      for (const [k, v] of Object.entries(rawMap)) {
        allMap[norm(k)] = v
      }

      const filtered: FundPerformance[] = Array.from(selectedNames).map((name) => {
        const key = norm(name)
        return { name, returns: allMap[key] || {} }
      });

      const allYear: Record<string, (number | null)[]> = {}
      for (const [k, v] of Object.entries(rawYear)) allYear[norm(k)] = v
      const filteredYear: FundYearlyPerformance[] = Array.from(selectedNames).map((name) => {
        const key = norm(name)
        return { name, years: (allYear[key] || []).slice(0, 8) }
      })

      const allSource: Record<string, Record<string, any>> = {}
      for (const [k, v] of Object.entries(rawSource)) allSource[norm(k)] = v
      const filteredSource: FundSourceData[] = Array.from(selectedNames).map((name) => {
        const key = norm(name)
        return { name, data: allSource[key] || {} }
      })

      setPerformance(filtered);
      setYearly(filteredYear);
      setSourceData(filteredSource);
      console.log("Loaded performance for:", filtered.map(f => f.name));
    } catch (e) {
      console.error(e);
      setPerformance([]);
      setYearly([]);
      setSourceData([]);
    }
  };

  return (
    <div className="flex">
      {/* Header with hamburger menu and apply button */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        {/* Hamburger menu button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-md hover:bg-slate-100 transition-colors"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Apply button - only show when sidebar is open */}
        {isSidebarOpen && (
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${isAllocationValid ? 'text-green-600' : 'text-red-600'}`}>
              Total: {totalAllocation.toFixed(2)}%
            </span>
            <button
              onClick={handleApply}
              disabled={!isAllocationValid}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isAllocationValid 
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' 
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              Apply
            </button>
          </div>
        )}
      </header>

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectionChange={setSelectedFunds}
        onInvestmentChange={setTotalInvestment}
      />

      {/* Main content */}
      <main className="flex-1 p-4 pt-20 space-y-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        
        {/* Investment Summary */}
        <InvestmentSummary selected={selectedFunds} totalInvestment={totalInvestment} />
        
        <PerformanceTable items={performance} selected={selectedFunds} />
        <TopThreeLineChart items={performance} selected={selectedFunds} />
        <YearlyReturnsTable items={yearly} selected={selectedFunds} />
        <TopThreeYearlyLineChart yearly={yearly} selected={selectedFunds} />
        <SourceDataTable items={sourceData} selected={selectedFunds} />
        
        {/* Side-by-side tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BacktestedReturns yearly={yearly} selected={selectedFunds} />
          <MonthlyReturns performance={performance} selected={selectedFunds} />
        </div>

        {/* Portfolio Analysis Tables */}
        <div className="space-y-6">
          {/* Portfolio Metrics and Pie Chart side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PortfolioAttributes sourceData={sourceData} selected={selectedFunds} />
            <PortfolioPieChart sourceData={sourceData} selected={selectedFunds} />
          </div>
          
          {/* Exposure tables side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EquityStockExposure selected={selectedFunds} />
            <SectorExposure selected={selectedFunds} />
          </div>
          
          {/* Concentration tables side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PositionConcentration selected={selectedFunds} />
            <SectorConcentration selected={selectedFunds} />
          </div>
          
          {/* Performance Analysis Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PortfolioVsBenchmarkChart yearly={yearly} selected={selectedFunds} />
            <RiskReturnScatter sourceData={sourceData} selected={selectedFunds} />
          </div>
        </div>
      </main>
    </div>
  );
}
