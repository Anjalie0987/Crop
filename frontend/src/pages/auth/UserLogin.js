import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const UserLogin = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
        // No validation as per Phase-1 requirements
        navigate('/farmer/form');
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            {/* Platform Title */}
            <header className="py-6 text-center bg-white shadow-sm">
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
                    BhoomiSanket | <span className="text-green-700">भूमि संकेत</span>
                </h1>
                <p className="text-sm text-gray-500 mt-1 uppercase tracking-wide">
                    SNSI – Soil Nutrient Suitability Index
                </p>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-md w-full max-w-md overflow-hidden">
                    {/* Card Header */}
                    <div className="bg-green-700 py-4 px-6 text-center">
                        <h2 className="text-xl font-semibold text-white">User Login</h2>
                    </div>

                    {/* Form Fields */}
                    <div className="p-8">
                        <form className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
                                    placeholder="Enter your email"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
                                    placeholder="Enter your password"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleLogin}
                                className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-2.5 rounded-md transition-colors shadow-sm"
                            >
                                Login
                            </button>
                        </form>

                        {/* Links */}
                        <div className="mt-6 text-center space-y-2">
                            <p className="text-sm text-gray-600">
                                New user?{' '}
                                <Link to="/signup" className="text-green-700 hover:underline font-medium">
                                    Sign up
                                </Link>
                            </p>
                            <p className="text-sm">
                                <Link to="/" className="text-gray-500 hover:text-gray-700 hover:underline">
                                    Back to Home
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Footer Note */}
                    <div className="bg-gray-50 py-3 px-6 text-center border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                            This platform supports soil nutrient suitability assessment for wheat cultivation.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserLogin;
