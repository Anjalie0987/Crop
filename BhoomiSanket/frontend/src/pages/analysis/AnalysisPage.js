import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, CircleMarker, Popup, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { INDIA_CENTER, DEFAULT_ZOOM } from '../../data/geoBounds';
import QueryBuilder from '../../components/QueryBuilder';

// === CONFIGURATION ===
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + "/farm-analysis";
const MAP_API_URL = process.env.REACT_APP_API_BASE_URL + "/map";

// Attribute Configuration
const ATTRIBUTES = [
    { key: "nitrogen", label: "Nitrogen (N)", unit: "kg/ha" },
    { key: "phosphorus", label: "Phosphorus (P)", unit: "kg/ha" },
    { key: "potassium", label: "Potassium (K)", unit: "kg/ha" },
    { key: "ph", label: "Soil pH", unit: "" },
    { key: "organic_carbon", label: "Organic Carbon", unit: "%" },
    { key: "moisture", label: "Soil Moisture", unit: "%" },
    { key: "temperature", label: "Temperature", unit: "°C" },
    { key: "shs_germination", label: "Germination Suitability", unit: "%" },
];

// Color Scales Configuration
const getColor = (attr, d) => {
    if (d === null || d === undefined) return '#f3f4f6';
    const attribute = attr === 'oc' ? 'organic_carbon' : attr;

    // Standard ColorBrewer YlOrRd 8-step palette
    const colors = {
        8: '#800026', 7: '#BD0026', 6: '#E31A1C', 5: '#FC4E2A',
        4: '#FD8D3C', 3: '#FEB24C', 2: '#FED976', 1: '#FFEDA0'
    };

    switch (attribute) {
        case 'nitrogen':
            return d > 350 ? colors[8] : d > 300 ? colors[7] : d > 250 ? colors[6] : d > 225 ? colors[5] :
                d > 200 ? colors[4] : d > 150 ? colors[3] : d > 100 ? colors[2] : colors[1];
        case 'phosphorus':
            return d > 60 ? colors[8] : d > 50 ? colors[7] : d > 40 ? colors[6] : d > 30 ? colors[5] :
                d > 22 ? colors[4] : d > 18 ? colors[3] : d > 14 ? colors[2] : colors[1];
        case 'potassium':
            return d > 450 ? colors[8] : d > 400 ? colors[7] : d > 350 ? colors[6] : d > 325 ? colors[5] :
                d > 300 ? colors[4] : d > 250 ? colors[3] : d > 200 ? colors[2] : colors[1];
        case 'ph':
            return d > 8.5 ? colors[8] : d > 8.0 ? colors[7] : d > 7.5 ? colors[6] : d > 7.0 ? colors[5] :
                d > 6.5 ? colors[4] : d > 6.0 ? colors[3] : d > 5.5 ? colors[2] : colors[1];
        case 'organic_carbon':
            return d > 1.6 ? colors[8] : d > 1.4 ? colors[7] : d > 1.2 ? colors[6] : d > 1.0 ? colors[5] :
                d > 0.8 ? colors[4] : d > 0.6 ? colors[3] : d > 0.4 ? colors[2] : colors[1];
        case 'moisture':
            return d > 35 ? colors[8] : d > 30 ? colors[7] : d > 25 ? colors[6] : d > 20 ? colors[5] :
                d > 15 ? colors[4] : d > 10 ? colors[3] : d > 5 ? colors[2] : colors[1];
        case 'temperature':
            return d > 35 ? colors[8] : d > 32 ? colors[7] : d > 29 ? colors[6] : d > 26 ? colors[5] :
                d > 23 ? colors[4] : d > 20 ? colors[3] : d > 17 ? colors[2] : colors[1];
        case 'shs_germination':
            return d >= 70 ? '#1a9850' : d >= 40 ? '#f4b400' : '#d73027';
        default:
            return d > 1000 ? colors[8] : d > 500 ? colors[7] : d > 200 ? colors[6] : d > 100 ? colors[5] :
                d > 50 ? colors[4] : d > 20 ? colors[3] : d > 10 ? colors[2] : colors[1];
    }
};

// Helper for Legend Ranges
const getLegendData = (attr) => {
    const attribute = attr === 'oc' ? 'organic_carbon' : attr;
    const colors = {
        8: '#800026', 7: '#BD0026', 6: '#E31A1C', 5: '#FC4E2A',
        4: '#FD8D3C', 3: '#FEB24C', 2: '#FED976', 1: '#FFEDA0'
    };

    const thresholds = {
        nitrogen: [350, 300, 250, 225, 200, 150, 100],
        phosphorus: [60, 50, 40, 30, 22, 18, 14],
        potassium: [450, 400, 350, 325, 300, 250, 200],
        ph: [8.5, 8.0, 7.5, 7.0, 6.5, 6.0, 5.5],
        organic_carbon: [1.6, 1.4, 1.2, 1.0, 0.8, 0.6, 0.4],
        moisture: [35, 30, 25, 20, 15, 10, 5],
        temperature: [35, 32, 29, 26, 23, 20, 17],
    };

    if (attribute === 'shs_germination') {
        return [
            { color: '#1a9850', label: "Good (>= 70%)" },
            { color: '#f4b400', label: "Fair (40% - 70%)" },
            { color: '#d73027', label: "Poor (< 40%)" }
        ];
    }

    const t = thresholds[attribute] || [1000, 500, 200, 100, 50, 20, 10];

    return [
        { color: colors[8], label: `> ${t[0]}` },
        { color: colors[7], label: `${t[1]} - ${t[0]}` },
        { color: colors[6], label: `${t[2]} - ${t[1]}` },
        { color: colors[5], label: `${t[3]} - ${t[2]}` },
        { color: colors[4], label: `${t[4]} - ${t[3]}` },
        { color: colors[3], label: `${t[5]} - ${t[4]}` },
        { color: colors[2], label: `${t[6]} - ${t[5]}` },
        { color: colors[1], label: `< ${t[6]}` }
    ];
};

// Component to handle Vector Boundaries
const VectorBoundaryLayer = ({ state, district, selectedAttribute, matchedSubdistricts }) => {
    const map = useMap();
    const [geoJsonData, setGeoJsonData] = useState(null);
    const layerRef = useRef(null);

    // Map Frontend Attribute Keys to Backend Shapefile Properties
    const getBackendKey = (attr) => {
        const map = {
            'nitrogen': 'N',
            'phosphorus': 'P',
            'potassium': 'K',
            'ph': 'ph',
            'organic_carbon': 'oc',
            'moisture': 'moisture',
            'temperature': 'temperature'
        };
        return map[attr] || attr;
    };

    useEffect(() => {
        let url = "";

        // Logical Hierarchy for Background Map
        if (district) {
            url = `${MAP_API_URL}/subdistrict?district=${encodeURIComponent(district)}`;
        } else if (state) {
            url = `${MAP_API_URL}/district?state=${encodeURIComponent(state)}`;
        } else {
            url = `${MAP_API_URL}/state`;
        }

        if (!url) return;

        console.log("Fetching Map Data from:", url);

        fetch(url)
            .then(res => res.json())
            .then(data => {
                setGeoJsonData(data);
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

        const backendKey = getBackendKey(selectedAttribute);
        console.log(`Choropleth Mode: ${selectedAttribute} -> ${backendKey}`);

        // Check if query filter is active
        const isFilterActive = matchedSubdistricts && matchedSubdistricts.length > 0;

        const style = (feature) => {
            const val = feature.properties[backendKey];

            // Robust name detection for highlighting (State/District/Subdistrict)
            const featureName = (feature.properties.District || feature.properties.DISTRICT || feature.properties.DIST_NAME || feature.properties.dtname ||
                feature.properties.TEHSIL || feature.properties.SUB_DIST || feature.properties.sdtname ||
                feature.properties.STATE || feature.properties.ST_NM || feature.properties.stname || "Region").trim().toUpperCase();

            // If filter is active, grey out non-matching regions
            if (isFilterActive) {
                const isMatch = matchedSubdistricts.some(name =>
                    name.toUpperCase() === featureName
                );
                if (!isMatch) {
                    return {
                        fillColor: '#d0d0d0',
                        fillOpacity: 0.2,
                        color: '#666',
                        weight: 0.5,
                        opacity: 0.5
                    };
                }
            }

            return {
                fillColor: val !== undefined ? getColor(selectedAttribute, val) : '#f3f4f6',
                fillOpacity: val !== undefined ? 0.75 : 0.05,
                color: '#666',
                weight: 1,
                opacity: 1
            };
        };

        const onEachFeature = (feature, layer) => {
            const props = feature.properties;
            const name = props.TEHSIL || props.SUB_DIST || props.DISTRICT || props.DIST_NAME || props.STATE || props.ST_NM || "Region";
            const val = props[backendKey];

            if (val !== undefined) {
                layer.bindPopup(`
                    <div class="font-sans">
                        <h3 class="font-bold text-sm border-b pb-1 mb-1">${name}</h3>
                        <div class="text-sm">
                            <span class="text-gray-600 capitalize">${selectedAttribute}:</span> 
                            <span class="font-bold text-green-700">${typeof val === 'number' ? val.toFixed(2) : val}</span>
                        </div>
                    </div>
                 `);
            }
        };

        const layer = L.geoJSON(geoJsonData, {
            style,
            onEachFeature
        });

        layer.addTo(map);
        // layer.bringToBack(); // No need to push to back if markers are gone, but good practice if mixed

        layerRef.current = layer;

        if (layer.getLayers().length > 0) {
            map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        }

        return () => {
            if (layerRef.current) map.removeLayer(layerRef.current);
        };
    }, [geoJsonData, map, selectedAttribute, matchedSubdistricts]); // Re-render when selectedAttribute or filter changes

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

const AnalysisPage = () => {
    // State
    const [locations, setLocations] = useState({ states: [], districts: {}, subdistricts: {} });
    const [filters, setFilters] = useState({ state: '', district: '', subdistrict: '' });
    const [farmData, setFarmData] = useState([]);
    const [selectedAttribute, setSelectedAttribute] = useState('nitrogen');
    const [loading, setLoading] = useState(false);

    // Query Builder State
    const [queryBuilderOpen, setQueryBuilderOpen] = useState(false);
    const [matchedSubdistricts, setMatchedSubdistricts] = useState(null);

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
                <h1 className="text-xl font-bold text-gray-800">Soil Analysis Dashboard</h1>
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
                        style={{ height: '100%', width: '100%', background: '#fff' }}
                        zoomControl={false}
                    >

                        {/* Vector Background Layer - Choropleth Mode */}
                        <VectorBoundaryLayer
                            state={filters.state}
                            district={filters.district}
                            selectedAttribute={selectedAttribute}
                            matchedSubdistricts={matchedSubdistricts}
                        />

                    </MapContainer>

                    {/* Query Builder Toggle Button */}
                    {!matchedSubdistricts ? (
                        <button
                            className="qb-toggle-btn"
                            onClick={() => setQueryBuilderOpen(true)}
                        >
                            🔍 Query Builder
                        </button>
                    ) : (
                        <div className="qb-active-badge">
                            🔍 Filter Active ({matchedSubdistricts.length} regions)
                            <button className="qb-clear-x" onClick={() => setMatchedSubdistricts(null)}>✕</button>
                            <button
                                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                                onClick={() => setQueryBuilderOpen(true)}
                            >Edit</button>
                        </div>
                    )}

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

            {/* Query Builder Dialog */}
            <QueryBuilder
                isOpen={queryBuilderOpen}
                onClose={() => setQueryBuilderOpen(false)}
                onApplyFilter={(subdistricts) => setMatchedSubdistricts(subdistricts)}
                onClearFilter={() => setMatchedSubdistricts(null)}
            />
        </div>
    );
};

export default AnalysisPage;
