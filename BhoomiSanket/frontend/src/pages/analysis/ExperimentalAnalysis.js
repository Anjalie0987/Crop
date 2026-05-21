import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, Polygon, Popup, useMap, GeoJSON } from 'react-leaflet';
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
    { key: "shs_germination", label: "Germination Suitability", unit: "%" },
    { key: "temperature", label: "Temperature", unit: "°C" },
];

// Experimental Color Logic: Fixed thresholds style (like Leaflet tutorial)
const getExperimentalColor = (attr, d) => {
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
            if (d >= 90) return '#1a9850'; // Excellent
            if (d >= 80) return '#66bd63'; // Very Good
            if (d >= 70) return '#a6d96a'; // Good
            if (d >= 60) return '#fee08b'; // Moderate
            if (d >= 30) return '#fdae61'; // Poor
            return '#d73027';           // Very Poor
        default:
            return d > 1000 ? colors[8] : d > 500 ? colors[7] : d > 200 ? colors[6] : d > 100 ? colors[5] :
                d > 50 ? colors[4] : d > 20 ? colors[3] : d > 10 ? colors[2] : colors[1];
    }
};

const getColor = getExperimentalColor;

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
            { color: '#1a9850', label: 'Excellent (90-100%)' },
            { color: '#66bd63', label: 'Very Good (80-90%)' },
            { color: '#a6d96a', label: 'Good (70-80%)' },
            { color: '#fee08b', label: 'Moderate (60-70%)' },
            { color: '#fdae61', label: 'Poor (30-60%)' },
            { color: '#d73027', label: 'Very Poor (0-30%)' }
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

const VectorBoundaryLayer = ({ type, visible, weight = 1.5, color = '#9e9e9e', matchedSubdistricts, selectedAttribute }) => {
    const [geoJsonData, setGeoJsonData] = useState(null);

    useEffect(() => {
        if (!visible) {
            setGeoJsonData(null);
            return;
        }
        const url = `${MAP_API_URL}/${type}`;
        fetch(url)
            .then(res => res.json())
            .then(data => setGeoJsonData(data))
            .catch(err => console.error(`Error fetching ${type} overlay:`, err));
    }, [type, visible]);

    if (!geoJsonData || !visible) return null;

    const style = (feature) => {
        const props = feature.properties;
        const isState = type === 'state';

        // Robust name detection for highlighting (State/District/Subdistrict)
        const featureName = (props.District || props.DISTRICT || props.DIST_NAME || props.dtname ||
            props.TEHSIL || props.SUB_DIST || props.sdtname ||
            props.STATE || props.ST_NM || props.stname || "Region").trim().toUpperCase();

        // Data-to-Color matching
        const val = props[selectedAttribute] ?? props['oc'];
        const isFilterActive = matchedSubdistricts && matchedSubdistricts.length > 0;

        // If filter is active and this region is NOT in the match list, grey it out
        if (isFilterActive) {
            const isMatch = matchedSubdistricts.some(name => name.toUpperCase() === featureName);
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

        if (val !== undefined && (type === 'district' || type === 'state')) {
            return {
                fillColor: isState ? 'transparent' : getExperimentalColor(selectedAttribute, val),
                fillOpacity: isState ? 0.05 : 0.75,
                color: isState ? '#444' : '#666',
                weight: isState ? 2 : 0.8,
                opacity: 1,
                dashArray: isState ? null : '3'
            };
        }

        return {
            fillColor: 'transparent',
            fillOpacity: 0.05,
            color: color,
            weight: weight,
            opacity: 1
        };
    };

    const onEachFeature = (feature, layer) => {
        const props = feature.properties;
        const name = (props.District || props.DISTRICT || props.DIST_NAME || props.TEHSIL || props.SUB_DIST || props.STATE || props.ST_NM || 'Unknown').trim();
        const val = props[selectedAttribute] ?? props['oc'];
        const category = props.germination_category;

        // State layer should be non-interactive/no tooltips to avoid blocking districts
        if (type === 'state') return;

        if (val !== undefined || category) {
            const attr = ATTRIBUTES.find(a => a.key === selectedAttribute);
            const catColor = category === 'Good' ? '#1a9850' : category === 'Fair' ? '#f4b400' : '#d73027';

            let html = `<div class="p-2">
                <div class="text-[10px] font-bold text-gray-400 uppercase">${type}</div>
                <div class="text-sm font-bold text-gray-800">${name}</div>`;

            if (val !== undefined) {
                html += `<div class="mt-1 flex items-center gap-2">
                    <span class="text-xs text-gray-600">${attr?.label || selectedAttribute}:</span>
                    <span class="text-sm font-bold text-green-700">${val.toFixed(2)}${attr?.unit || ''}</span>
                </div>`;
            }

            if (category) {
                html += `<div class="mt-1 flex items-center gap-2">
                    <span class="text-xs text-gray-600">Status:</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style="background: ${catColor}">${category}</span>
                </div>`;
            }
            html += `</div>`;

            layer.bindTooltip(html, { sticky: true, className: 'custom-map-tooltip' });
        }
    };

    return <GeoJSON key={`${type}-${selectedAttribute}`} data={geoJsonData} style={style} onEachFeature={onEachFeature} />;
};


// Component to handle automatic zooming based on filters
const ZoomManager = ({ state, district }) => {
    const map = useMap();

    useEffect(() => {
        let url = "";
        if (district) {
            url = `${MAP_API_URL}/district?filter=${encodeURIComponent(district)}`; // Just to get bounds
        } else if (state) {
            url = `${MAP_API_URL}/state?filter=${encodeURIComponent(state)}`;
        } else {
            map.setView(INDIA_CENTER, DEFAULT_ZOOM);
            return;
        }

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.features && data.features.length > 0) {
                    const layer = L.geoJSON(data);
                    map.fitBounds(layer.getBounds(), { padding: [20, 20] });
                }
            })
            .catch(err => console.error("ZoomManager error:", err));
    }, [state, district, map]);

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

// Component to capture map instance
const MapInstanceCollector = ({ onMap }) => {
    const map = useMap();
    useEffect(() => {
        if (map) onMap(map);
    }, [map, onMap]);
    return null;
};

// Component to render legend inside the map
const MapLegend = ({ attribute }) => {
    const data = getLegendData(attribute);
    if (!data || data.length === 0) return null;

    return (
        <div className="absolute bottom-10 left-10 z-[2000] bg-white p-4 rounded-xl border-2 border-green-600/20 shadow-2xl max-w-[220px]">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
                {ATTRIBUTES.find(a => a.key === attribute)?.label}
            </h4>
            <div className="space-y-1.5">
                {data.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-[2px] shrink-0 shadow-sm" style={{ backgroundColor: item.color }}></span>
                        <span className="text-[10px] text-gray-700 font-medium leading-tight">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExperimentalAnalysis = () => {
    // State
    const [locations, setLocations] = useState({ states: [], districts: {}, subdistricts: {} });
    const [filters, setFilters] = useState({ state: '', district: '', subdistrict: '' });
    const [farmData, setFarmData] = useState([]);
    const [selectedAttribute, setSelectedAttribute] = useState('nitrogen');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mapInstance, setMapInstance] = useState(null);

    // Query Builder State
    const [queryBuilderOpen, setQueryBuilderOpen] = useState(false);
    const [matchedSubdistricts, setMatchedSubdistricts] = useState(null);

    // View Toggles
    const [showStates, setShowStates] = useState(true);
    const [showDistricts, setShowDistricts] = useState(false);
    const [showSubdistricts, setShowSubdistricts] = useState(false);
    const [showPoints, setShowPoints] = useState(true);

    // Flatten locations for searching
    const allSearchable = useMemo(() => {
        const list = [];
        if (!locations || !locations.states) return list;

        locations.states.forEach(s => {
            list.push({ type: 'state', name: s, state: s });
            if (locations.districts && locations.districts[s]) {
                locations.districts[s].forEach(d => {
                    list.push({ type: 'district', name: d, state: s });
                });
            }
        });
        return list;
    }, [locations]);

    const filteredSuggestions = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        return allSearchable.filter(item =>
            item.name.toLowerCase().includes(term)
        ).slice(0, 8);
    }, [searchTerm, allSearchable]);

    const handleSelectSuggestion = (item) => {
        if (item.type === 'state') {
            handleFilterChange('state', item.name);
        } else {
            setFilters({
                state: item.state,
                district: item.name,
                subdistrict: ''
            });
        }
        setSearchTerm('');
        setShowSuggestions(false);
    };

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





    // Calculate Dynamic Stats for Normalization (State Level)
    const attributeStats = useMemo(() => {
        if (!farmData.length) return {};

        // Group by state to get state-level averages
        const stateSums = {};
        farmData.forEach(row => {
            const s = (row.state || "").toUpperCase();
            if (!stateSums[s]) stateSums[s] = { count: 0 };
            ATTRIBUTES.forEach(attr => {
                const val = row[attr.key];
                if (val !== undefined && val !== null) {
                    stateSums[s][attr.key] = (stateSums[s][attr.key] || 0) + val;
                }
            });
            stateSums[s].count++;
        });

        const stats = {};
        ATTRIBUTES.forEach(attr => {
            const stateAverages = Object.values(stateSums).map(g => g[attr.key] / g.count);
            if (stateAverages.length) {
                stats[attr.key] = {
                    min: Math.min(...stateAverages),
                    max: Math.max(...stateAverages)
                };
            }
        });
        return stats;
    }, [farmData]);

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };


    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <style>{`
                .leaflet-interactive:focus {
                    outline: none !important;
                }
                .custom-map-tooltip {
                    background: white !important;
                    border: none !important;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
                    border-radius: 8px !important;
                    padding: 0 !important;
                }
            `}</style>
            {/* Header */}
            <header className="h-16 bg-white shadow-sm border-b border-gray-200 z-20 px-6 flex justify-between items-center">
                <SearchCloser onClickOutside={() => setShowSuggestions(false)} />
                <h1 className="text-xl font-bold text-gray-800">Experimental Analysis (Exp)</h1>

                <div className="flex gap-4 items-center flex-grow justify-center">
                    {/* Search Box */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search State or District..."
                            className="border rounded px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500 w-48 md:w-64"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                        />
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border rounded shadow-lg mt-1 z-[1001] max-h-60 overflow-y-auto">
                                {filteredSuggestions.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm border-b last:border-0"
                                        onClick={() => handleSelectSuggestion(item)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">{item.name}</span>
                                            <span className="text-[10px] uppercase bg-gray-100 px-1 rounded text-gray-500">{item.type}</span>
                                        </div>
                                        {item.type === 'district' && (
                                            <span className="text-[10px] text-gray-400 block uppercase">{item.state}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Filters */}
                    <select
                        className="border rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                        value={filters.state}
                        onChange={(e) => handleFilterChange('state', e.target.value)}
                    >
                        <option value="">All States</option>
                        {locations?.states?.map(s => <option key={s} value={s}>{s}</option>)}
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
                        <MapInstanceCollector onMap={setMapInstance} />

                        {/* Map Behavior Manager */}
                        <ZoomManager state={filters.state} />

                        {/* Vector Global Overlays (Administrative Borders) */}
                        <VectorBoundaryLayer
                            type="state"
                            visible={showStates}
                            weight={2}
                            color="#666"
                            matchedSubdistricts={matchedSubdistricts}
                            selectedAttribute={selectedAttribute}
                            attributeStats={attributeStats}
                        />

                        {/* Optional matched subdistrict highlight (if any) */}
                        <VectorBoundaryLayer
                            type="subdistrict"
                            visible={showSubdistricts}
                            weight={1}
                            color="#ccc"
                            matchedSubdistricts={matchedSubdistricts}
                            selectedAttribute={selectedAttribute}
                            attributeStats={attributeStats}
                        />

                        {/* Districts Layer (Now handles the internal variation) */}
                        <VectorBoundaryLayer
                            type="district"
                            visible={showDistricts}
                            weight={1.5}
                            color="#444"
                            matchedSubdistricts={matchedSubdistricts}
                            selectedAttribute={selectedAttribute}
                            attributeStats={attributeStats}
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

                    {/* Map Overlay: Legend moved outside MapContainer for visibility */}
                    <MapLegend attribute={selectedAttribute} />
                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1000]">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                        </div>
                    )}
                </div>

                {/* Right: Controls */}
                <div className="w-full lg:w-1/4 max-h-[calc(100vh-64px)] bg-gray-50 overflow-y-auto p-6 border-l border-gray-200">

                    {/* Map View Section */}
                    <div className="mb-8">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex justify-between items-center">
                            Map View
                            <button
                                onClick={() => {
                                    setFilters({ state: '', district: '', subdistrict: '' });
                                    setShowStates(false);
                                    setShowDistricts(true);
                                    setShowSubdistricts(false);
                                    setShowPoints(false);
                                }}
                                className="text-[10px] text-green-600 hover:underline normal-case font-medium"
                            >
                                Reset View
                            </button>
                        </h2>
                        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 shadow-sm">
                            <div className="grid grid-cols-1 gap-1">
                                <label className="flex items-center gap-2 cursor-pointer group text-[13px] text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={showStates}
                                        onChange={(e) => setShowStates(e.target.checked)}
                                        className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                    />
                                    <span className="group-hover:text-green-700 transition-colors">States Boundary</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group text-[13px] text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={showPoints}
                                        onChange={(e) => setShowPoints(e.target.checked)}
                                        className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                    />
                                    <span className="group-hover:text-green-700 transition-colors">Show Data Points</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group text-[13px] text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={showDistricts}
                                        onChange={(e) => setShowDistricts(e.target.checked)}
                                        className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                    />
                                    <span className="group-hover:text-green-700 transition-colors">Districts</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group text-[13px] text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={showSubdistricts}
                                        onChange={(e) => setShowSubdistricts(e.target.checked)}
                                        className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                    />
                                    <span className="group-hover:text-green-700 transition-colors">Sub-districts</span>
                                    {showSubdistricts && loading && <span className="animate-pulse text-[9px] text-orange-500 font-bold ml-1">Loading...</span>}
                                </label>
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-4">
                                {/* Compact Zoom */}
                                <div className="flex flex-col gap-1 items-center">
                                    <div className="flex bg-gray-50 border border-gray-200 rounded p-0.5 shadow-inner">
                                        <button
                                            onClick={() => mapInstance?.zoomIn()}
                                            className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 text-gray-600 rounded-l hover:bg-gray-100 font-bold text-sm"
                                            title="Zoom In"
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => mapInstance?.zoomOut()}
                                            className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 text-gray-600 rounded-r hover:bg-gray-100 font-bold text-sm border-l-0"
                                            title="Zoom Out"
                                        >
                                            -
                                        </button>
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Zoom</span>
                                </div>

                                {/* Compact Pan & Recenter */}
                                <div className="flex items-center gap-3">
                                    <div className="relative w-16 h-16 flex items-center justify-center scale-90">
                                        {/* Pan Up */}
                                        <button
                                            onClick={() => mapInstance?.panBy([0, -100])}
                                            className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600"
                                            title="Pan Up"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>

                                        {/* Pan Left */}
                                        <button
                                            onClick={() => mapInstance?.panBy([-100, 0])}
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600"
                                            title="Pan Left"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>

                                        {/* Recenter */}
                                        <button
                                            onClick={() => {
                                                if (mapInstance) {
                                                    if (!filters.state) {
                                                        mapInstance.setView(INDIA_CENTER, DEFAULT_ZOOM);
                                                    } else {
                                                        const url = filters.district
                                                            ? `${MAP_API_URL}/district?filter=${encodeURIComponent(filters.district)}`
                                                            : `${MAP_API_URL}/state?filter=${encodeURIComponent(filters.state)}`;

                                                        fetch(url)
                                                            .then(res => res.json())
                                                            .then(data => {
                                                                if (data.features && data.features.length > 0) {
                                                                    const layer = L.geoJSON(data);
                                                                    mapInstance.fitBounds(layer.getBounds(), { padding: [20, 20] });
                                                                }
                                                            });
                                                    }
                                                }
                                            }}
                                            className="w-7 h-7 bg-green-600 text-white rounded-full shadow-md hover:bg-green-700 flex items-center justify-center z-10 transition-transform active:scale-95"
                                            title="Recenter"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                            </svg>
                                        </button>

                                        {/* Pan Right */}
                                        <button
                                            onClick={() => mapInstance?.panBy([100, 0])}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600"
                                            title="Pan Right"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>

                                        {/* Pan Down */}
                                        <button
                                            onClick={() => mapInstance?.panBy([0, 100])}
                                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600"
                                            title="Pan Down"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Pan & Center</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Soil Attributes</h2>
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

// Add event listener to close suggestions when clicking outside
const SearchCloser = ({ onClickOutside }) => {
    useEffect(() => {
        const handleClick = (e) => {
            if (!e.target.closest('.relative')) {
                onClickOutside();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClickOutside]);
    return null;
};

export default ExperimentalAnalysis;
