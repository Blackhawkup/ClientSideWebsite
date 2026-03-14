import { useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import PerformanceTable from "./components/PerformanceTable";
import YearlyReturnsTable from "./components/YearlyReturnsTable";

import BacktestedReturnsChart from "./components/BacktestedReturnsChart";
import MonthlyReturnsBarChart from "./components/MonthlyReturnsBarChart";
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
import RollingReturns from "./components/RollingReturns";
import InvestmentSummary from "./components/InvestmentSummary";
import type { FundPerformance, FundYearlyPerformance, FundSourceData, SelectedFund } from "./types";
import { useMultiClick } from "./hooks/useMultiClick";
import AdminLoginModal from "./components/AdminLoginModal";
import { useNavigate } from "react-router-dom";
import { fetchData } from './utils/dataFetcher';


export default function App() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFunds, setSelectedFunds] = useState<SelectedFund[]>([]);
  const [performance, setPerformance] = useState<FundPerformance[]>([]);
  const [yearly, setYearly] = useState<FundYearlyPerformance[]>([]);
  const [sourceData, setSourceData] = useState<FundSourceData[]>([]);
  const [totalInvestment, setTotalInvestment] = useState<number>(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Hidden admin 5-click trigger
  const { onClick: handleLogoClick, isTriggered, reset: resetLogoClicks } = useMultiClick(5, 3000);

  // Trigger admin modal safely inside useEffect
  useMemo(() => {
    if (isTriggered && !showAdminLogin) {
      setShowAdminLogin(true);
      resetLogoClicks();
    }
  }, [isTriggered, showAdminLogin, resetLogoClicks]);

  const handleAdminSuccess = () => {
    setShowAdminLogin(false);
    navigate('/admin');
  };

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
      // 1. Check for Admin Overrides (Mode A)
      const overridePerfStr = sessionStorage.getItem('admin_override_performance');
      const overrideYearStr = sessionStorage.getItem('admin_override_yearly');
      const overrideSourceStr = sessionStorage.getItem('admin_override_source');

      let rawMap: Record<string, Record<string, number | null>>;
      let rawYear: Record<string, (number | null)[]>;
      let rawSource: Record<string, Record<string, any>>;

      if (overridePerfStr && overrideYearStr && overrideSourceStr) {
        // Use overrides
        rawMap = JSON.parse(overridePerfStr);
        rawYear = JSON.parse(overrideYearStr);
        rawSource = JSON.parse(overrideSourceStr);
        console.log("Using session storage overrides from Admin Panel");
      } else {
        // 2. Fetch from normal JSON files
        const [resPerf, resYear, resSource] = await Promise.all([
          fetchData('/data/performance.json', { cache: 'no-store' }),
          fetchData('/data/performance_yearly.json', { cache: 'no-store' }),
          fetchData('/data/source_data.json', { cache: 'no-store' }),
        ])
        if (!resPerf.ok) throw new Error(`Failed to load performance: ${resPerf.status}`)
        if (!resYear.ok) throw new Error(`Failed to load yearly performance: ${resYear.status}`)
        if (!resSource.ok) throw new Error(`Failed to load source data: ${resSource.status}`)

        rawMap = await resPerf.json();
        rawYear = await resYear.json();
        rawSource = await resSource.json();
      }

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
      {/* Admin Login Modal placed outside the main layout flow */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => { setShowAdminLogin(false); resetLogoClicks(); }}
        onSuccess={handleAdminSuccess}
      />

      {/* Header with hamburger menu and apply button */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
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

          {/* Header Logo (Clickable for Admin) */}
          <div
            onClick={handleLogoClick}
            className="flex items-center gap-2 cursor-pointer select-none group"
            title="Dashboard"
          >
            <span className="font-semibold text-slate-800 hidden sm:block">Client Associates</span>
          </div>
        </div>

        {/* Apply button - ALWAYS VISIBLE */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${isAllocationValid ? 'text-green-600' : 'text-red-600'}`}>
            Total: {totalAllocation.toFixed(2)}%
          </span>
          <button
            onClick={handleApply}
            disabled={!isAllocationValid}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${isAllocationValid
              ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
          >
            Apply
          </button>
        </div>
      </header>

      {/* Sidebar - Fix z-index so Header is on top */}
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

        {/* Backtested Returns: Chart + Table side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BacktestedReturnsChart yearly={yearly} selected={selectedFunds} />
          <BacktestedReturns yearly={yearly} selected={selectedFunds} />
        </div>

        {/* Monthly Returns: Chart + Table side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyReturnsBarChart performance={performance} selected={selectedFunds} />
          <MonthlyReturns performance={performance} selected={selectedFunds} />
        </div>

        <YearlyReturnsTable items={yearly} selected={selectedFunds} />
        <SourceDataTable items={sourceData} selected={selectedFunds} />

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
            <RollingReturns />
          </div>
        </div>
      </main>
    </div>
  );
}
