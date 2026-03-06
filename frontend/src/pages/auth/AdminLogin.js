import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AdminLogin = () => {
    const navigate = useNavigate();

    const handleDummyLogin = () => {
        const dummyAdmin = {
            id: 0,
            full_name: "Test Admin",
            username: "admin"
        };
        localStorage.setItem('admin', JSON.stringify(dummyAdmin));
        navigate('/map-landing');
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 font-sans">
            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-md w-full max-w-md overflow-hidden border-t-4 border-gray-800">
                    {/* Card Header */}
                    <div className="bg-gray-800 py-4 px-6 text-center">
                        <h2 className="text-xl font-semibold text-white">Admin Login</h2>
                    </div>

                    {/* Form Fields */}
                    <div className="p-8">
                        <form className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Username or Email
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-gray-600 focus:border-gray-600 outline-none transition-colors"
                                    placeholder="Enter admin ID"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-gray-600 focus:border-gray-600 outline-none transition-colors"
                                    placeholder="Enter your password"
                                />
                            </div>

                            <button
                                type="button"
                                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-2.5 rounded-md transition-colors shadow-sm"
                            >
                                Login
                            </button>

                            <button
                                type="button"
                                onClick={handleDummyLogin}
                                className="w-full py-2.5 rounded-md text-sm font-bold text-gray-800 border-2 border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
                            >
                                <span>🚀 Bypass (Test Flow)</span>
                            </button>
                        </form>

                        {/* Warning Text */}
                        <div className="mt-6 text-center">
                            <p className="text-xs font-bold text-red-600 bg-red-50 py-2 rounded border border-red-100">
                                Restricted access. Authorized personnel only.
                            </p>
                        </div>

                        {/* Back Link */}
                        <div className="mt-4 text-center">
                            <p className="text-sm">
                                <Link to="/" className="text-gray-500 hover:text-gray-700 hover:underline">
                                    Back to Home
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLogin;
