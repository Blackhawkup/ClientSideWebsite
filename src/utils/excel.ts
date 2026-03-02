import * as XLSX from 'xlsx'

export type FundItem = {
  category: string
  name: string
  expenseRatio?: number
  returns?: Record<string, number>
}

function toNumber(val: unknown): number | undefined {
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[% ,]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

export async function loadFundsFromExcel(url: string): Promise<FundItem[]> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch Excel: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  // Resolve sheet by case-insensitive match to "slider data", else fallback to first sheet
  const desired = Object.keys(workbook.Sheets).find(n => n.toLowerCase().trim() === 'slider data')
  const sheetName = desired || workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error('No worksheet found')

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const normalized: FundItem[] = []
  for (const row of rows) {
    const keys = Object.keys(row)
    // Try to find explicit headers first
    let categoryKey = keys.find(k => k.toLowerCase().includes('category'))
    let nameKey = keys.find(k => k.toLowerCase().includes('fund'))
    if (!nameKey) nameKey = keys.find(k => k.toLowerCase().includes('name'))

    // If not found, fallback to first two columns heuristics
    if (!categoryKey || !nameKey) {
      const first = keys[0]
      const second = keys[1]
      if (!nameKey && second) nameKey = second
      if (!categoryKey && first) categoryKey = first
    }

    const category = String(categoryKey ? row[categoryKey] : '').trim()
    const name = String(nameKey ? row[nameKey] : '').trim()
    if (!name) continue

    // Parse expense ratio and returns
    let expenseRatio: number | undefined
    const returns: Record<string, number> = {}
    for (const k of keys) {
      const lk = k.toLowerCase()
      const value = row[k]
      if (lk.includes('expense') || lk.includes('ratio')) {
        const n = toNumber(value)
        if (n !== undefined) expenseRatio = n
      }
      if (lk.match(/\b(1m|3m|6m|1y|3y|5y|10y|cy\d{4})\b/)) {
        const n = toNumber(value)
        if (n !== undefined) returns[lk] = n
      }
    }

    normalized.push({ category, name, expenseRatio, returns: Object.keys(returns).length ? returns : undefined })
  }

  if (normalized.length > 0) return normalized

  // Fallback: parse as 2D array to handle messy headers/merged cells
  const matrix = XLSX.utils.sheet_to_json<string[]>({ ...sheet }, { header: 1, defval: '' }) as string[][]
  if (!Array.isArray(matrix) || matrix.length === 0) return []

  // Find a likely header row
  let headerIndex = 0
  for (let i = 0; i < Math.min(matrix.length, 10); i++) {
    const row = matrix[i].map((c) => String(c).toLowerCase())
    if (row.some((c) => c.includes('category')) && (row.some((c) => c.includes('fund')) || row.some((c) => c.includes('name')))) {
      headerIndex = i
      break
    }
  }

  const headerRow = matrix[headerIndex] || []
  const lower = headerRow.map((c) => String(c).toLowerCase())
  let catIdx = lower.findIndex((c) => c.includes('category'))
  let nameIdx = lower.findIndex((c) => c.includes('fund'))
  if (nameIdx === -1) nameIdx = lower.findIndex((c) => c.includes('name'))

  // If still not found, assume first two columns
  if (catIdx === -1) catIdx = 0
  if (nameIdx === -1) nameIdx = 1

  const out: FundItem[] = []
  for (let r = headerIndex + 1; r < matrix.length; r++) {
    const row = matrix[r]
    const category = String(row[catIdx] ?? '').trim()
    const name = String(row[nameIdx] ?? '').trim()
    if (!name) continue
    out.push({ category, name })
  }

  return out
}



