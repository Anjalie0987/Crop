import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';

const DashboardPlaceholder = () => {
    const location = useLocation();
    const result = location.state?.result;
    const formData = location.state?.form;

    if (!result) {
        // Redirect back if no data (optional, or show empty state)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">No analysis data found. Please submit the form first.</p>
                    <Link to="/farmer/form" className="text-green-700 hover:underline">Go to Form</Link>
                </div>
            </div>
        );
    }

    const { snsi_score, soil_status, nutrient_levels, recommendations, map_classification, health_status } = result;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <header className="py-4 bg-white shadow-sm border-b border-gray-200">
                <div className="container mx-auto px-4 max-w-5xl flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
                        BhoomiSanket | <span className="text-green-700">भूमि संकेत</span>
                    </h1>
                    <Link to="/farmer/form" className="text-sm text-green-700 font-medium hover:underline">
                        New Analysis
                    </Link>
                </div>
            </header>

            <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
                {/* Header Section */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 border-green-600">
                    <h2 className="text-2xl font-bold text-gray-800">Field Analysis Report</h2>
                    <p className="text-gray-600 mt-1">
                        Field ID: <span className="font-semibold">{formData?.field_id}</span> |
                        Farmer: <span className="font-semibold">{formData?.farmer_name}</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Score Card */}
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center md:col-span-1">
                        <h3 className="text-gray-500 font-medium uppercase tracking-wide text-sm mb-4">SNSI Score</h3>
                        <div className="relative inline-block">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 ${snsi_score >= 80 ? 'border-green-500 text-green-600' :
                                    snsi_score >= 60 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'
                                }`}>
                                <span className="text-4xl font-bold">{snsi_score}</span>
                            </div>
                        </div>
                        <p className={`mt-4 text-lg font-bold ${snsi_score >= 80 ? 'text-green-600' :
                                snsi_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                            {soil_status}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">Health Status: {health_status}</p>
                    </div>

                    {/* Nutrient Details */}
                    <div className="bg-white rounded-lg shadow-sm p-6 md:col-span-2">
                        <h3 className="text-gray-800 font-bold mb-4 border-b pb-2">Nutrient Levels</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(nutrient_levels).map(([key, value]) => (
                                <div key={key} className="bg-gray-50 p-3 rounded border border-gray-100">
                                    <span className="text-sm text-gray-500 block">{key}</span>
                                    <span className="font-semibold text-gray-800">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-white rounded-lg shadow-sm p-6 md:col-span-3">
                        <h3 className="text-gray-800 font-bold mb-4 border-b pb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Key Recommendations
                        </h3>
                        <ul className="space-y-3">
                            {recommendations.map((rec, index) => (
                                <li key={index} className="flex gap-3 items-start">
                                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full mt-1">{(index + 1)}</span>
                                    <span className="text-gray-700">{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default DashboardPlaceholder;
