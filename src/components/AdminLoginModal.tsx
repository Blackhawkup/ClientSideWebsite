import { useState } from 'react';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function AdminLoginModal({ isOpen, onClose, onSuccess }: Props) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Fetch password from environment variables
        const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD;

        if (!correctPassword) {
            setError('Admin password not configured in environment.');
            return;
        }

        if (password === correctPassword) {
            onSuccess();
            setPassword(''); // clear for security
        } else {
            setError('Incorrect password');
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Admin Access</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-slate-500"
                            autoFocus
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-md transition-colors"
                    >
                        Authenticate
                    </button>
                </form>
            </div>
        </div>
    );
}
