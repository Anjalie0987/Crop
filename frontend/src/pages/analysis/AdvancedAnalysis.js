import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, CircleMarker, Popup, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { INDIA_CENTER, DEFAULT_ZOOM } from '../../data/geoBounds';

// === CONFIGURATION ===
const API_BASE_URL = "http://localhost:8000/farm-analysis";
const MAP_API_URL = "http://localhost:8000/map";

// Attribute Configuration
const ATTRIBUTES = [
    { key: "nitrogen", label: "Nitrogen (N)", unit: "kg/ha" },
    { key: "phosphorus", label: "Phosphorus (P)", unit: "kg/ha" },
    { key: "potassium", label: "Potassium (K)", unit: "kg/ha" },
    { key: "ph", label: "Soil pH", unit: "" },
    { key: "organic_carbon", label: "Organic Carbon", unit: "%" },
    { key: "moisture", label: "Soil Moisture", unit: "%" },
];

// Color Scales Configuration
const getColor = (attr, value) => {
    if (value === null || value === undefined) return '#808080';

    switch (attr) {
        case 'nitrogen':
            if (value < 75) return '#d73027'; // Very Low
            if (value < 150) return '#fc8d59'; // Low
            if (value < 225) return '#fee08b'; // Medium
            return '#1a9850'; // High (225-300+)

        case 'phosphorus':
            if (value < 35) return '#d73027';
            if (value < 75) return '#fc8d59';
            if (value < 110) return '#fee08b';
            return '#1a9850';

        case 'potassium':
            if (value < 100) return '#d73027';
            if (value < 200) return '#fc8d59';
            if (value < 300) return '#fee08b';
            return '#1a9850';

        case 'ph':
            if (value < 5.5) return '#d73027'; // Strongly Acidic
            if (value < 6.5) return '#fc8d59'; // Moderately Acidic
            if (value <= 7.5) return '#1a9850'; // Neutral (Ideal)
            return '#4575b4'; // Alkaline (> 7.5)

        case 'organic_carbon':
            if (value < 0.6) return '#d73027';
            if (value < 1.0) return '#fc8d59';
            if (value < 1.5) return '#fee08b';
            return '#1a9850';

        case 'moisture':
            if (value < 13) return '#d73027';
            if (value < 22) return '#fc8d59';
            if (value < 31) return '#fee08b';
            return '#1a9850';

        default:
            return '#1a9850';
    }
};

// Helper for Legend Ranges
const getLegendData = (attr) => {
    switch (attr) {
        case 'nitrogen': return [
            { color: '#d73027', label: 'Very Low (< 75 kg/ha)' },
            { color: '#fc8d59', label: 'Low (75 - 150 kg/ha)' },
            { color: '#fee08b', label: 'Medium (150 - 225 kg/ha)' },
            { color: '#1a9850', label: 'High (> 225 kg/ha)' }
        ];
        case 'phosphorus': return [
            { color: '#d73027', label: 'Very Low (< 35 kg/ha)' },
            { color: '#fc8d59', label: 'Low (35 - 75 kg/ha)' },
            { color: '#fee08b', label: 'Medium (75 - 110 kg/ha)' },
            { color: '#1a9850', label: 'High (> 110 kg/ha)' }
        ];
        case 'potassium': return [
            { color: '#d73027', label: 'Very Low (< 100 kg/ha)' },
            { color: '#fc8d59', label: 'Low (100 - 200 kg/ha)' },
            { color: '#fee08b', label: 'Medium (200 - 300 kg/ha)' },
            { color: '#1a9850', label: 'High (> 300 kg/ha)' }
        ];
        case 'ph': return [
            { color: '#d73027', label: 'Strongly Acidic (< 5.5)' },
            { color: '#fc8d59', label: 'Moderately Acidic (5.5 - 6.5)' },
            { color: '#1a9850', label: 'Neutral (6.5 - 7.5)' },
            { color: '#4575b4', label: 'Alkaline (> 7.5)' }
        ];
        case 'organic_carbon': return [
            { color: '#d73027', label: 'Very Low (< 0.6%)' },
            { color: '#fc8d59', label: 'Low (0.6 - 1.0%)' },
            { color: '#fee08b', label: 'Medium (1.0 - 1.5%)' },
            { color: '#1a9850', label: 'High (> 1.5%)' }
        ];
        case 'moisture': return [
            { color: '#d73027', label: 'Very Low (< 13%)' },
            { color: '#fc8d59', label: 'Low (13 - 22%)' },
            { color: '#fee08b', label: 'Medium (22 - 31%)' },
            { color: '#1a9850', label: 'High (> 31%)' }
        ];
        default: return [];
    }
};

// Component to handle Vector Boundaries
const VectorBoundaryLayer = ({ state, district }) => {
    const map = useMap();
    const [geoJsonData, setGeoJsonData] = useState(null);
    const layerRef = useRef(null);

    useEffect(() => {
        let url = "";

        // Logical Hierarchy for Background Map
        if (district) {
            // If District selected -> Show Sub-districts of that district
            url = `${MAP_API_URL}/subdistrict?district=${encodeURIComponent(district)}`;
        } else if (state) {
            // If State selected -> Show Districts of that state
            url = `${MAP_API_URL}/district?state=${encodeURIComponent(state)}`;
        } else {
            // Default -> Show States (India view)
            url = `${MAP_API_URL}/state`;
        }

        if (!url) return;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                setGeoJsonData(data);

                // Cleanup previous layer immediately to prevent ghosting
                if (layerRef.current) {
                    layerRef.current.clearLayers();
                }
            })
            .catch(err => console.error("Error fetching map boundary:", err));

    }, [state, district]);

    // Handle Rendering and Zooming
    useEffect(() => {
        if (!geoJsonData) return;

        if (layerRef.current) {
            map.removeLayer(layerRef.current);
        }

        const style = {
            fillColor: '#ffffff',
            fillOpacity: 1, // Solid white background
            color: '#9e9e9e', // Grey borders
            weight: 1.5,
            opacity: 1
        };

        const layer = L.geoJSON(geoJsonData, { style });

        layer.addTo(map);
        layer.bringToBack();

        layerRef.current = layer;

        if (layer.getLayers().length > 0) {
            map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        }

        return () => {
            if (layerRef.current) map.removeLayer(layerRef.current);
        };
    }, [geoJsonData, map]);

    return null;
};

// Auto-fit bounds for farm points if they exist (and ensure appropriate zoom)
// Make sure this doesn't conflict with Vector Layer zoom
const PointsBoundsFitter = ({ data }) => {
    const map = useMap();
    useEffect(() => {
        if (!data || data.length === 0) return;
        // logic: if vector layer zoomed us out too far or if we want to focus on data points
        // Let's rely on Vector Layer for main administrative bounds,
        // but if we are at leaf level (subdistrict), maybe ensure points are visible?
        // Actually, vector layer bounds are usually safer. Let's strictly rely on vector layer for bounds
        // to avoid jumping.
    }, [data, map]);
    return null;
};

const AdvancedAnalysis = () => {
    // State
    const [locations, setLocations] = useState({ states: [], districts: {}, subdistricts: {} });
    const [filters, setFilters] = useState({ state: '', district: '', subdistrict: '' });
    const [farmData, setFarmData] = useState([]);
    const [selectedAttribute, setSelectedAttribute] = useState('nitrogen');
    const [loading, setLoading] = useState(false);

    // Fetch Locations (Dropdown Options)
    useEffect(() => {
        fetch(`${API_BASE_URL}/locations`)
            .then(res => res.json())
            .then(data => setLocations(data))
            .catch(err => console.error("Error fetching locations:", err));
    }, []);

    // Fetch Farm Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const query = new URLSearchParams();
                if (filters.state) query.append('state', filters.state);
                if (filters.district) query.append('district', filters.district);
                if (filters.subdistrict) query.append('subdistrict', filters.subdistrict);

                const res = await fetch(`${API_BASE_URL}/data?${query.toString()}`);
                const data = await res.json();
                setFarmData(data);
            } catch (err) {
                console.error("Error fetching farm data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    // Derived Options for Dropdowns
    const districtOptions = useMemo(() => {
        return filters.state ? (locations.districts[filters.state] || []) : [];
    }, [locations, filters.state]);

    const subdistrictOptions = useMemo(() => {
        return filters.district ? (locations.subdistricts[filters.district] || []) : [];
    }, [locations, filters.district]);

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };
            // Reset dependent filters
            if (key === 'state') {
                newFilters.district = '';
                newFilters.subdistrict = '';
            } else if (key === 'district') {
                newFilters.subdistrict = '';
            }
            return newFilters;
        });
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="h-16 bg-white shadow-sm border-b border-gray-200 z-20 px-6 flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">Advanced Analysis</h1>
                <div className="flex gap-4">
                    {/* Filters */}
                    <select
                        className="border rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                        value={filters.state}
                        onChange={(e) => handleFilterChange('state', e.target.value)}
                    >
                        <option value="">All States</option>
                        {locations.states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select
                        className="border rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                        value={filters.district}
                        onChange={(e) => handleFilterChange('district', e.target.value)}
                        disabled={!filters.state}
                    >
                        <option value="">All Districts</option>
                        {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>

                    <select
                        className="border rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                        value={filters.subdistrict}
                        onChange={(e) => handleFilterChange('subdistrict', e.target.value)}
                        disabled={!filters.district}
                    >
                        <option value="">All Sub-districts</option>
                        {subdistrictOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </header>

            <div className="flex-grow flex flex-col lg:flex-row">

                {/* Left: Map */}
                <div className="w-full lg:w-3/4 h-[70vh] lg:h-[calc(100vh-64px)] relative bg-white border-r border-gray-200">
                    <MapContainer
                        center={INDIA_CENTER}
                        zoom={DEFAULT_ZOOM}
                        style={{ height: '100%', width: '100%', background: '#fff' }} // White Background for Vector Map
                        zoomControl={false}
                    >


                        {/* Vector Background Layer - Dynamic based on selection */}
                        <VectorBoundaryLayer state={filters.state} district={filters.district} />

                        {/* Farm Data Points on Top */}
                        {farmData.map((farm, idx) => (
                            <CircleMarker
                                key={idx}
                                center={[farm.latitude, farm.longitude]}
                                radius={6}
                                fillOpacity={0.9}
                                fillColor={getColor(selectedAttribute, farm[selectedAttribute])}
                                stroke={true}
                                color="#fff"
                                weight={1}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <h3 className="font-bold text-sm mb-1">Farmer: {farm.farmer_id}</h3>
                                        <div className="text-xs text-gray-600 mb-2">
                                            {farm.subdistrict}, {farm.district}, {farm.state}
                                        </div>
                                        <hr className="my-1 border-gray-200" />
                                        <div className="text-sm">
                                            {ATTRIBUTES.filter(attr => attr.key === selectedAttribute).map(attr => (
                                                <div key={attr.key} className="font-bold text-green-700">
                                                    <span className="text-gray-500">{attr.label}:</span> {farm[attr.key]?.toFixed(2)} {attr.unit}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}
                    </MapContainer>

                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1000]">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                        </div>
                    )}
                </div>

                {/* Right: Controls */}
                <div className="w-full lg:w-1/4 max-h-[calc(100vh-64px)] bg-gray-50 overflow-y-auto p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Soil Attributes</h2>
                    <div className="space-y-3">
                        {ATTRIBUTES.map(attr => (
                            <label
                                key={attr.key}
                                className={`
                                    flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200
                                    ${selectedAttribute === attr.key
                                        ? 'bg-white border-green-600 shadow-md ring-1 ring-green-600'
                                        : 'bg-white border-gray-200 hover:border-green-400'
                                    }
                                `}
                            >
                                <input
                                    type="radio"
                                    name="attribute"
                                    className="hidden"
                                    checked={selectedAttribute === attr.key}
                                    onChange={() => setSelectedAttribute(attr.key)}
                                />
                                <div className={`w-3 h-3 rounded-full mr-3 ${selectedAttribute === attr.key ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                                <span className="text-sm font-medium text-gray-700">{attr.label}</span>
                            </label>
                        ))}
                    </div>

                    <div className="mt-8 border-t pt-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Legend</h3>
                        {/* Dynamic Legend with Ranges */}
                        <div className="space-y-2 text-xs">
                            {getLegendData(selectedAttribute).length > 0 ? (
                                getLegendData(selectedAttribute).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></span>
                                        <span>{item.label}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400">Select an attribute to see details</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedAnalysis;
