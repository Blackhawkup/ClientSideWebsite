export type SelectedFund = {
  name: string
  allocation?: number
  type?: string
}

export type FundReturnsKeys = "1m" | "3m" | "6m" | "1y" | "3y" | "5y" | "10y"

export type FundPerformance = {
  name: string
  returns: Partial<Record<FundReturnsKeys, number | null>>
}

export type FundYearlyPerformance = {
  name: string
  years: (number | null)[] // last 8 years, latest-first as provided
}

export type FundSourceData = {
  name: string
  data: Record<string, any> // dynamic data from source_data sheet
}



