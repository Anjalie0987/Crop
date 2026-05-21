import React, { useState, useMemo, useEffect } from 'react';
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

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);


/* ---------------- CONFIGURATION ---------------- */

const PARAM_CONFIG = {
    nitrogen: { label: "Nitrogen (N)", unit: "kg/ha", min: 0, max: 300, default: 150 },
    phosphorus: { label: "Phosphorus (P)", unit: "kg/ha", min: 0, max: 150, default: 75 },
    potassium: { label: "Potassium (K)", unit: "kg/ha", min: 0, max: 400, default: 200 },
    ph: { label: "Soil pH", unit: "", min: 4.5, max: 9.0, default: 6.7 },
    organic_carbon: { label: "Organic Carbon", unit: "%", min: 0, max: 2, default: 1.0 },
    moisture: { label: "Soil Moisture", unit: "%", min: 5, max: 40, default: 22 }
};


/* ---------------- COMPONENT ---------------- */

const Dashboard = () => {

    /* ------------ Simulator State ------------ */

    const [selectedParam, setSelectedParam] = useState("nitrogen");

    const [values, setValues] = useState(() => {
        const initial = {};
        Object.keys(PARAM_CONFIG).forEach(k => {
            initial[k] = PARAM_CONFIG[k].default;
        });
        return initial;
    });

    const activeConfig = PARAM_CONFIG[selectedParam];
    const currentValue = values[selectedParam];

    const handleSliderChange = (e) => {
        const val = parseFloat(e.target.value);
        setValues(prev => ({
            ...prev,
            [selectedParam]: val
        }));
    };

    const healthScore = useMemo(() => {
        const avg =
            Object.values(values).reduce((a, b) => a + b, 0) /
            Object.keys(values).length;
        return Math.round((avg / 300) * 100);
    }, [values]);

    const healthColor =
        healthScore >= 70 ? "#22c55e" :
            healthScore >= 40 ? "#eab308" :
                "#ef4444";


    /* ------------ MAP STATE ------------ */

    const [soilPoints, setSoilPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);


    /* ------------ FETCH SHS DATA ------------ */

    useEffect(() => {

        const fetchSoilHealth = async () => {

            try {

                const res = await fetch("http://127.0.0.1:8000/map/state");

                const data = await res.json();

                setSoilPoints(data.features || []);

                setLoading(false);

            } catch (err) {

                console.error("Map API error:", err);

                setError(err);

                setLoading(false);

            }

        };

        fetchSoilHealth();

    }, []);



    /* ------------ CHART DATA ------------ */

    const chartData = {
        labels: [activeConfig.label],
        datasets: [
            {
                label: "Current Value",
                data: [currentValue],
                backgroundColor: [healthColor],
                borderWidth: 1
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: activeConfig.max
            }
        }
    };


    return (

        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

            <header className="bg-white shadow px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800">
                    Soil Health <span className="text-green-600">Dashboard</span>
                </h1>
            </header>

            <main className="flex-grow container mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT PANEL */}

                <div className="lg:col-span-2 space-y-6">

                    {/* Controls */}

                    <div className="bg-white rounded-xl shadow-sm p-6 border">

                        <label className="block mb-2 text-sm font-medium">Select Parameter</label>

                        <select
                            value={selectedParam}
                            onChange={(e) => setSelectedParam(e.target.value)}
                            className="border rounded p-2"
                        >
                            {Object.keys(PARAM_CONFIG).map(k => (
                                <option key={k} value={k}>
                                    {PARAM_CONFIG[k].label}
                                </option>
                            ))}
                        </select>

                        <div className="mt-4">

                            <input
                                type="range"
                                min={activeConfig.min}
                                max={activeConfig.max}
                                value={currentValue}
                                onChange={handleSliderChange}
                                className="w-full"
                            />

                        </div>

                    </div>


                    {/* Chart */}

                    <div className="bg-white rounded-xl shadow-sm p-6 border h-80">

                        <Chart type="bar" data={chartData} options={chartOptions} />

                    </div>


                    {/* SOIL HEALTH MAP */}

                    <div className="bg-white rounded-xl shadow-sm p-6 border">

                        <h2 className="font-bold mb-3 text-gray-700">
                            Soil Health Score Map
                        </h2>

                        {loading && <p>Loading Soil Health Map...</p>}

                        {error && <p className="text-red-600">Error loading map data</p>}

                        {!loading && !error && (

                            <MapContainer
                                center={[20.5, 78.9]}
                                zoom={5}
                                style={{ height: "450px", width: "100%" }}
                            >

                                <TileLayer
                                    attribution='&copy; OpenStreetMap contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {soilPoints.map((feature, i) => {

                                    const [lng, lat] = feature.geometry.coordinates;

                                    const props = feature.properties;

                                    let color = "green";

                                    if (props.germination_category === "Fair") color = "yellow";
                                    if (props.germination_category === "Poor") color = "red";

                                    return (

                                        <CircleMarker
                                            key={i}
                                            center={[lat, lng]}
                                            radius={6}
                                            pathOptions={{ color }}
                                        >

                                            <Popup>

                                                SHS: {props.shs_germination?.toFixed(2)} <br />
                                                Category: {props.germination_category}

                                            </Popup>

                                        </CircleMarker>

                                    );

                                })}

                            </MapContainer>

                        )}

                    </div>

                </div>



                {/* RIGHT PANEL */}

                <div className="space-y-6">

                    <div className="bg-white rounded-xl shadow-sm p-6 border text-center">

                        <h3 className="text-gray-500 text-sm uppercase mb-3">
                            Soil Health Score
                        </h3>

                        <div className="text-5xl font-bold" style={{ color: healthColor }}>
                            {healthScore}
                        </div>

                        <p className="text-sm mt-2">
                            {healthScore >= 70 ? "Excellent" :
                                healthScore >= 40 ? "Moderate" :
                                    "Poor"}
                        </p>

                    </div>

                </div>

            </main>

        </div>

    );

};

export default Dashboard;