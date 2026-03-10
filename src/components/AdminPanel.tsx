import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as xlsx from 'xlsx';
import { validateExcelWorkbook, parseExcelWorkbook } from '../utils/excelValidator';

export default function AdminPanel() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [pendingData, setPendingData] = useState<any>(null);

    const handleLogout = () => {
        // We navigate to home, state reset happens based on route protection
        navigate('/');
        // You could also use a global state/context to unset isAdmin
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError(null);
            setSuccessMessage(null);
            setPendingData(null);
        }
    };

    const processExcel = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setSuccessMessage(null);
        setPendingData(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = xlsx.read(data, { type: 'array' });

            // Run strict validation
            const validationErrors = validateExcelWorkbook(workbook);
            console.log('Sheet names:', workbook.SheetNames);

            if (validationErrors.length > 0) {
                // Stop processing and show first exact error
                const firstError = validationErrors[0];
                const locationDetails = [
                    firstError.row ? `Row ${firstError.row}` : null,
                    firstError.column ? `Column ${firstError.column}` : null
                ].filter(Boolean).join(', ');

                setError(`Sheet '${firstError.sheetName}'${locationDetails ? ` at ${locationDetails}` : ''}: ${firstError.message}`);
                setIsProcessing(false);
                return;
            }

            // Process for Temporary Frontend Mode (Mode A)
            // In a full production application (Mode B), we would use serverless functions
            const parsedData = parseExcelWorkbook(workbook);

            setIsProcessing(false);

            // Set pending data
            setPendingData(parsedData);
            setSuccessMessage("Validation Successful. Please review and confirm to apply these changes.");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred while processing the Excel file.");
            setIsProcessing(false);
        }
    };

    const confirmUpload = () => {
        if (!pendingData) return;

        sessionStorage.setItem('admin_override_performance', JSON.stringify(pendingData.performanceMap));
        sessionStorage.setItem('admin_override_yearly', JSON.stringify(pendingData.yearlyMap));
        sessionStorage.setItem('admin_override_source', JSON.stringify(pendingData.sourceData));

        setPendingData(null);
        setSuccessMessage("Data successfully updated for this session! Dashboard will use these overrides.");
    };

    const cancelUpload = () => {
        setPendingData(null);
        setSuccessMessage(null);
        setFile(null); // Optional: reset file too
    };

    /* 
     * FUTURE ARCHITECTURE NOTE (Mode B):
     * To make this permanent, we would need to replace this frontend-only parsing
     * with an upload to a Vercel Serverless Function:
     * 
     * const formData = new FormData();
     * formData.append('file', file);
     * const res = await fetch('/api/upload-admin-data', { method: 'POST', body: formData });
     * if (res.ok) setSuccess(true);
     */

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
                        <p className="text-sm text-slate-500">Manage application data securely.</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                        Log Out
                    </button>
                </div>

                {/* Upload Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                    <h2 className="text-lg font-semibold text-slate-700">Update Data Source</h2>

                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="excel-upload"
                        />
                        <label
                            htmlFor="excel-upload"
                            className="cursor-pointer flex flex-col items-center justify-center gap-3"
                        >
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-blue-600 font-medium hover:text-blue-700">Click to upload</span>
                                <span className="text-slate-500"> or drag and drop</span>
                            </div>
                            <p className="text-xs text-slate-400">XLSX up to 10MB</p>
                        </label>

                        {file && (
                            <div className="mt-4 p-3 bg-white rounded border border-slate-200 text-sm text-slate-700 flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <span className="font-semibold block mb-1">Validation Error:</span>
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {successMessage}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        {pendingData ? (
                            <>
                                <button
                                    onClick={cancelUpload}
                                    className="px-6 py-2 rounded-lg font-medium transition-colors bg-slate-200 hover:bg-slate-300 text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmUpload}
                                    className="px-6 py-2 rounded-lg font-medium transition-colors bg-green-600 hover:bg-green-700 text-white"
                                >
                                    Confirm Upload
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={processExcel}
                                disabled={!file || isProcessing}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
                    ${(!file || isProcessing)
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'}`}
                            >
                                {isProcessing && (
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-currentColor" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {isProcessing ? 'Processing & Validating...' : 'Validate Excel'}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
