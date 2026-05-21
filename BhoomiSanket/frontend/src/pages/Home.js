import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const Home = () => {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Reusable Header Header */}
            <Header />

            {/* Disclaimer Banner */}
            <div className="bg-amber-100 border-b-2 border-amber-400 py-3 px-6 flex items-center justify-center gap-3 text-amber-900">
                <span className="text-xl flex-shrink-0">⚠️Disclaimer:</span>
                <p className="text-base font-semibold text-center">
                    Maps on this platform use historical datasets for research and demonstration purposes only. The data may not accurately reflect the current state and district boundaries.
                </p>
            </div>

            {/* Hero Section */}
            <main className="relative flex-grow min-h-screen flex items-center">
                {/* Background Image */}
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: "url('/Hero_bg.jpg')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                />

                {/* Dark Overlay for Contrast */}
                <div className="absolute inset-0 bg-black/60 z-10" />

                {/* Content */}
                <div className="relative z-20 w-full px-6 md:px-[8%]">
                    <div className="max-w-[600px] text-left">
                        <h2 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight">
                            Analyze Your Soil & <br />
                            Grow Smarter Crops
                        </h2>

                        <p className="text-lg md:text-xl text-white/80 mb-10 font-sans leading-relaxed">
                            Upload your soil data and get AI-powered insights, nutrient recommendations, and crop suitability analysis for smarter farming decisions.
                        </p>

                        <div className="flex">
                            <Link
                                to="/login-selection"
                                className="px-10 py-4 bg-brand-primary hover:bg-brand-dark text-white text-lg font-bold rounded-[10px] shadow-xl transition-all duration-300 transform hover:scale-105"
                            >
                                Start Soil Analysis
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer (Optional simple footer for completeness) */}
            <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm">
                <p>&copy; {new Date().getFullYear()} BhoomiSanket. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Home;
