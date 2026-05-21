import React, { useState, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

// --- CONFIGURATION ---
const PARAM_CONFIG = {
    nitrogen: {
        label: "Nitrogen (N)",
        unit: "kg/ha",
        min: 0,
        max: 300,
        default: 150,
        ranges: [
            { max: 75, color: '#ef4444', label: 'Very Low', status: 'Severely Nitrogen Deficient. Apply 40–50 kg Urea per acre.' },
            { max: 150, color: '#f97316', label: 'Low', status: 'Moderate Nitrogen level. Minor supplementation recommended.' },
            { max: 225, color: '#eab308', label: 'Optimal', status: 'Optimal Nitrogen range.' },
            { max: 9999, color: '#22c55e', label: 'High', status: 'Excess Nitrogen. Avoid further fertilizer application.' }
        ]
    },
    phosphorus: {
        label: "Phosphorus (P)",
        unit: "kg/ha",
        min: 0,
        max: 150,
        default: 75,
        ranges: [
            { max: 35, color: '#ef4444', label: 'Very Low', status: 'Severely Phosphorus Deficient. Apply DAP/SSP.' },
            { max: 75, color: '#f97316', label: 'Low', status: 'Low Phosphorus. Consider phosphate fertilizer.' },
            { max: 110, color: '#eab308', label: 'Medium', status: 'Optimal Phosphorus range.' },
            { max: 9999, color: '#22c55e', label: 'High', status: 'High Phosphorus. Reduce application.' }
        ]
    },
    potassium: {
        label: "Potassium (K)",
        unit: "kg/ha",
        min: 0,
        max: 400,
        default: 200,
        ranges: [
            { max: 100, color: '#ef4444', label: 'Very Low', status: 'Severely Potassium Deficient. Apply MOP.' },
            { max: 200, color: '#f97316', label: 'Low', status: 'Low Potassium. Supplementation needed.' },
            { max: 300, color: '#eab308', label: 'Medium', status: 'Optimal Potassium range.' },
            { max: 9999, color: '#22c55e', label: 'High', status: 'High Potassium. No action needed.' }
        ]
    },
    ph: {
        label: "Soil pH",
        unit: "",
        min: 4.5,
        max: 9.0,
        step: 0.1,
        default: 6.7,
        ranges: [
            { max: 5.5, color: '#ef4444', label: 'Strongly Acidic', status: 'Strongly Acidic. Apply Lime.' },
            { max: 6.5, color: '#f97316', label: 'Moderately Acidic', status: 'Slightly Acidic. Monitor closely.' },
            { max: 7.5, color: '#22c55e', label: 'Neutral', status: 'Ideal Neutral pH.' },
            { max: 9999, color: '#3b82f6', label: 'Alkaline', status: 'Alkaline Soil. Apply Gypsum.' }
        ]
    },
    organic_carbon: {
        label: "Organic Carbon",
        unit: "%",
        min: 0,
        max: 2,
        step: 0.1,
        default: 1.0,
        ranges: [
            { max: 0.5, color: '#ef4444', label: 'Very Low', status: 'Very Low Carbon. Apply compost/manure.' },
            { max: 0.75, color: '#f97316', label: 'Low', status: 'Low Carbon. Increase organic matter.' },
            { max: 1.0, color: '#eab308', label: 'Medium', status: 'Moderate Carbon levels.' },
            { max: 9999, color: '#22c55e', label: 'High', status: 'High Organic Carbon. Good soil health.' }
        ]
    },
    moisture: {
        label: "Soil Moisture",
        unit: "%",
        min: 5,
        max: 40,
        default: 22,
        ranges: [
            { max: 15, color: '#ef4444', label: 'Very Low', status: 'Critical Moisture Stress. Irrigate immediately.' },
            { max: 25, color: '#f97316', label: 'Low', status: 'Low Moisture. Irrigation recommended.' },
            { max: 35, color: '#22c55e', label: 'Optimal', status: 'Optimal Moisture levels.' },
            { max: 9999, color: '#3b82f6', label: 'High', status: 'Excess Moisture. Ensure drainage.' }
        ]
    }
};

const Dashboard = () => {
    // Initialize State
    const [selectedParam, setSelectedParam] = useState('nitrogen');
    const [values, setValues] = useState(() => {
        const initial = {};
        Object.keys(PARAM_CONFIG).forEach(key => {
            initial[key] = PARAM_CONFIG[key].default;
        });
        return initial;
    });

    const activeConfig = PARAM_CONFIG[selectedParam];
    const currentValue = values[selectedParam];

    // Determine Status
    const currentStatus = useMemo(() => {
        return activeConfig.ranges.find(r => currentValue < r.max) || activeConfig.ranges[activeConfig.ranges.length - 1];
    }, [activeConfig, currentValue]);

    // Handle Slider Change
    const handleSliderChange = (e) => {
        const val = parseFloat(e.target.value);
        setValues(prev => ({
            ...prev,
            [selectedParam]: val
        }));
    };

    // Chart Data
    const chartData = useMemo(() => {
        return {
            labels: [activeConfig.label],
            datasets: [
                {
                    label: 'Current Value',
                    data: [currentValue],
                    backgroundColor: [currentStatus.color],
                    borderColor: [currentStatus.color], // Or darker shade
                    borderWidth: 1,
                    barThickness: 60,
                },
                // Ideal Range Marker (Conceptual - rendered as dataset)
                {
                    label: 'Ideal Range Top',
                    data: [activeConfig.ranges[2].max], // Assume 3rd range is "Optimal" or "Medium" usually?
                    type: 'line',
                    borderColor: '#10b981', // green-500
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    hidden: true // Optional: hide line if messy
                }
            ],
        };
    }, [activeConfig, currentValue, currentStatus]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: true, text: `Real-time Analysis: ${activeConfig.label}` },
        },
        scales: {
            y: {
                beginAtZero: true,
                max: activeConfig.max, // Fix Y-axis to slider context
                title: { display: true, text: activeConfig.unit }
            }
        }
    };

    // Calculate Soil Health Score (Simple 0-100 logic)
    const healthScore = useMemo(() => {
        let totalScore = 0;
        let count = 0;

        Object.keys(values).forEach(key => {
            const val = values[key];
            const cfg = PARAM_CONFIG[key];

            // Normalize based on "Ideal" ranges (simplified)
            // Example: Find how far val is from ideal midpoint?
            // Actually, let's map ranges to scores:
            // Very Low=25, Low=50, Med/Opt=100, High=75? (Since excess can be bad too)

            let rangeIdx = cfg.ranges.findIndex(r => val < r.max);
            if (rangeIdx === -1) rangeIdx = cfg.ranges.length - 1;

            // Custom Score Mapping based on prompt color logic assumption
            // Red -> 20, Orange -> 60, Yellow -> 80, Green -> 100?
            // Wait, standard is Red(Bad) -> Green(Good).
            // Prompt Color Logic: "0-75 Red, 225-300 Green".
            // Let's use the index:
            // If Green range is index 3 (High), and Yellow is index 2 (Medium)...
            // Let's rely on the color defined in config.

            const color = cfg.ranges[rangeIdx].color;
            let score = 50;
            if (color === '#22c55e') score = 100; // Green -> Good
            else if (color === '#eab308') score = 80;  // Yellow -> Okay
            else if (color === '#f97316') score = 60;  // Orange -> Warning
            else if (color === '#ef4444') score = 30;  // Red -> Bad
            else if (color === '#3b82f6') score = 40; // Blue (Extreme/Alkaline/Wet) -> Bad/Warning

            totalScore += score;
            count++;
        });

        return Math.round(totalScore / count);
    }, [values]);

    // Health Color
    const healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#eab308' : '#ef4444';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-white shadow px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
                    Soil Health <span className="text-green-600">Simulator AI</span>
                </h1>
            </header>

            <main className="flex-grow container mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT PANEL: Controls & Graph */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Controls Card */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <div className="flex flex-col md:flex-row gap-6 items-center">

                            {/* Dropdown */}
                            <div className="w-full md:w-1/3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Parameter</label>
                                <select
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 p-2.5 bg-gray-50"
                                    value={selectedParam}
                                    onChange={(e) => setSelectedParam(e.target.value)}
                                >
                                    {Object.keys(PARAM_CONFIG).map(key => (
                                        <option key={key} value={key}>{PARAM_CONFIG[key].label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Slider */}
                            <div className="w-full md:w-2/3">
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700">Adjust Value</label>
                                    <span className="text-sm font-bold text-green-700">{currentValue} {activeConfig.unit}</span>
                                </div>
                                <input
                                    type="range"
                                    min={activeConfig.min}
                                    max={activeConfig.max}
                                    step={activeConfig.step || 1}
                                    value={currentValue}
                                    onChange={handleSliderChange}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>{activeConfig.min}</span>
                                    <span>{activeConfig.max}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Graph Card */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-96">
                        <Chart type='bar' options={chartOptions} data={chartData} />
                    </div>

                </div>

                {/* RIGHT PANEL: Stats & Insights */}
                <div className="space-y-6">

                    {/* Health Score Card */}
                    <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <svg className="w-24 h-24 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 1a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-1z" /></svg>
                        </div>

                        <h2 className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-4">Soil Health Score</h2>

                        {/* Circular Progress (CSS driven) */}
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    className="text-gray-200"
                                    strokeWidth="12"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="70"
                                    cx="80"
                                    cy="80"
                                />
                                <circle
                                    className="transition-all duration-1000 ease-out"
                                    strokeWidth="12"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * healthScore) / 100}
                                    strokeLinecap="round"
                                    stroke={healthColor}
                                    fill="transparent"
                                    r="70"
                                    cx="80"
                                    cy="80"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-4xl font-black text-gray-800">{healthScore}</span>
                                <span className="text-xs text-gray-400">/ 100</span>
                            </div>
                        </div>

                        <p className="mt-4 text-sm font-medium" style={{ color: healthColor }}>
                            {healthScore >= 70 ? 'Excellent Condition' : healthScore >= 40 ? 'Moderate Condition' : 'Poor Condition'}
                        </p>
                    </div>

                    {/* Recommendation Box */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 border-l-4" style={{ borderColor: currentStatus.color }}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentStatus.color }}></span>
                            <h3 className="font-bold text-gray-800">AI Recommendation</h3>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {currentStatus.status}
                        </p>
                    </div>

                    {/* Current Values Summary */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        <h3 className="font-bold text-gray-800 text-sm mb-3">Parameter Summary</h3>
                        <div className="space-y-2 text-sm">
                            {Object.keys(values).map(key => (
                                <div key={key} className="flex justify-between items-center">
                                    <span className={`text-gray-500 capitalize ${key === selectedParam ? 'font-bold text-green-700' : ''}`}>
                                        {key.replace('_', ' ')}
                                    </span>
                                    <span className="font-mono text-gray-700">{values[key]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </main>
        </div>
    );
};

export default Dashboard;
