export default function BacktestedReturnsTable() {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Backtested Returns Table</h2>
            <div className="text-slate-500 italic text-sm text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Table logic and data will be added later.
            </div>
            <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium text-slate-600">Metric</th>
                            <th className="px-4 py-2 text-right font-medium text-slate-600">Portfolio</th>
                            <th className="px-4 py-2 text-right font-medium text-slate-600">Benchmark</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Empty for now */}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
