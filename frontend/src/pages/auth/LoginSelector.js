import React from 'react';
import { Link } from 'react-router-dom';

const LoginSelector = () => {
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
                <div className="w-full max-w-4xl">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-gray-800">Login to BhoomiSanket | भूमि संकेत</h2>
                        <p className="text-gray-600 mt-2">Select your role to continue</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* User (Farmer) Card */}
                        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-600 hover:shadow-xl transition-shadow flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">User (Farmer)</h3>
                            <p className="text-sm text-gray-600 mb-6 flex-grow">
                                For farmers and individual users accessing soil health reports.
                            </p>
                            <Link
                                to="/user/login"
                                className="block w-full bg-green-700 hover:bg-green-800 text-white text-center font-medium py-3 rounded-md transition-colors"
                            >
                                Login as User
                            </Link>
                            <div className="mt-4 text-center text-sm">
                                <span className="text-gray-500">New? </span>
                                <Link to="/signup" className="text-green-700 hover:underline font-medium">
                                    Sign up here
                                </Link>
                            </div>
                        </div>

                        {/* Agriculture Department Card */}
                        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-600 hover:shadow-xl transition-shadow flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Agriculture Dept.</h3>
                            <p className="text-sm text-gray-600 mb-6 flex-grow">
                                For authorized department officials and field officers.
                            </p>
                            <Link
                                to="/officer/login"
                                className="block w-full bg-blue-700 hover:bg-blue-800 text-white text-center font-medium py-3 rounded-md transition-colors"
                            >
                                Login as Officer
                            </Link>
                            <div className="mt-4 text-center text-sm md:invisible">
                                <span className="text-gray-400">No signup available</span>
                            </div>
                        </div>

                        {/* Admin Card */}
                        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-gray-800 hover:shadow-xl transition-shadow flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Admin</h3>
                            <p className="text-sm text-gray-600 mb-6 flex-grow">
                                Restricted system access for platform administrators.
                            </p>
                            <Link
                                to="/admin/login"
                                className="block w-full bg-gray-800 hover:bg-gray-900 text-white text-center font-medium py-3 rounded-md transition-colors"
                            >
                                Login as Admin
                            </Link>
                            <div className="mt-4 text-center text-sm md:invisible">
                                <span className="text-gray-400">No signup available</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <Link to="/" className="text-gray-500 hover:text-gray-700 hover:underline font-medium">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginSelector;
