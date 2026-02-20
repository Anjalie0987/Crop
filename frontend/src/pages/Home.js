import React from 'react';
import Header from '../components/Header';

const Home = () => {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Reusable Header Header */}
            <Header />

            {/* Hero Section */}
            <main className="relative flex-grow flex items-center justify-center px-6 py-24 min-h-[60vh]">
                {/* Background Image */}
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: "url('/HERO_bg.jpg')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                />

                {/* Dark Overlay for Contrast */}
                <div className="absolute inset-0 bg-black/60 z-10" />

                {/* Content */}
                <div className="relative z-20 text-center max-w-5xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight drop-shadow-md">
                        Soil Nutrient Suitability Index (SNSI) <br className="hidden md:block" /> for Wheat Cultivation
                    </h2>

                    <h3 className="text-xl md:text-2xl font-medium text-gray-200 mb-12 max-w-3xl mx-auto drop-shadow-sm">
                        A data-driven platform to assess soil nutrient suitability and provide actionable insights for sustainable wheat production.
                    </h3>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto border border-transparent">
                            Start Soil Analysis
                        </button>
                        <button className="px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white/10 text-lg font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 w-full sm:w-auto">
                            View Soil Health Map
                        </button>
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
