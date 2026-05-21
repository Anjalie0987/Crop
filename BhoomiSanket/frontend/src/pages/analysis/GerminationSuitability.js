import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, CircleMarker, Popup, useMap, GeoJSON } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { INDIA_CENTER, DEFAULT_ZOOM } from '../../data/geoBounds';
import QueryBuilder from '../../components/QueryBuilder';

// === CONFIGURATION ===
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + "/farm-analysis";
const MAP_API_URL = process.env.REACT_APP_API_BASE_URL + "/map";
const SHS_API_BASE_URL = "http://127.0.0.1:8001/api";
const LATLON_POINTS_URL = process.env.REACT_APP_API_BASE_URL + "/map/suitability/points";

// ==========================================================
// DEMO-ONLY SHS COLOR THRESHOLDS (frontend only)
// Change these anytime to revert coloring behavior.
// This DOES NOT change the model, DB, or backend categories.
// ==========================================================
const SHS_COLOR_THRESHOLDS = {
    // Your germination avg_shs values are ~74-78, so tighter cutoffs show multiple colors.
    germination: { good: 77.0, fair: 75.0 }, // >=good => Good (green), >=fair => Fair (yellow), else Poor (red)
    // Your booting avg_shs values are ~83.5-84.7, so tighter cutoffs show multiple colors.
    booting: { good: 84.5, fair: 84.0 }
};

// NEW: Lat/Lon demo thresholds for heat + marker coloring
const SUITABILITY_THRESHOLDS = {
    germination: { good: 77.0, fair: 75.0 },
    booting: { good: 84.5, fair: 84.0 }
};

// Attribute Configuration
const ATTRIBUTES = [
    { key: "nitrogen", label: "Nitrogen (N)", unit: "kg/ha" },
    { key: "phosphorus", label: "Phosphorus (P)", unit: "kg/ha" },
    { key: "potassium", label: "Potassium (K)", unit: "kg/ha" },
    { key: "ph", label: "Soil pH", unit: "" },
    { key: "organic_carbon", label: "Organic Carbon", unit: "%" },
    { key: "moisture", label: "Soil Moisture", unit: "%" },
    { key: "shs_germination", label: "Germination Suitability", unit: "%" },
    { key: "shs_booting", label: "Booting Suitability", unit: "%" },
    { key: "germ_points", label: "Germination Points", unit: "" },
    { key: "boot_points", label: "Booting Points", unit: "" },
    { key: "germ_heat", label: "Germination Heatmap", unit: "" },
    { key: "boot_heat", label: "Booting Heatmap", unit: "" },
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
            return d > 300 ? colors[8] : d > 270 ? colors[7] : d > 240 ? colors[6] : d > 210 ? colors[5] :
                d > 180 ? colors[4] : d > 150 ? colors[3] : d > 120 ? colors[2] : colors[1];
        case 'phosphorus':
            return d > 25 ? colors[8] : d > 22 ? colors[7] : d > 19 ? colors[6] : d > 16 ? colors[5] :
                d > 13 ? colors[4] : d > 10 ? colors[3] : d > 7 ? colors[2] : colors[1];
        case 'potassium':
            return d > 160 ? colors[8] : d > 150 ? colors[7] : d > 140 ? colors[6] : d > 130 ? colors[5] :
                d > 120 ? colors[4] : d > 110 ? colors[3] : d > 100 ? colors[2] : colors[1];
        case 'ph':
            return d > 8.0 ? colors[8] : d > 7.5 ? colors[7] : d > 7.0 ? colors[6] : d > 6.5 ? colors[5] :
                d > 6.0 ? colors[4] : d > 5.5 ? colors[3] : d > 5.0 ? colors[2] : colors[1];
        case 'organic_carbon':
            return d > 0.75 ? colors[8] : d > 0.65 ? colors[7] : d > 0.55 ? colors[6] : d > 0.45 ? colors[5] :
                d > 0.35 ? colors[4] : d > 0.25 ? colors[3] : d > 0.15 ? colors[2] : colors[1];
        case 'moisture':
            return d > 30 ? colors[8] : d > 25 ? colors[7] : d > 20 ? colors[6] : d > 15 ? colors[5] :
                d > 12 ? colors[4] : d > 10 ? colors[3] : d > 8 ? colors[2] : colors[1];
        case 'temperature':
            return d > 26 ? colors[8] : d > 24 ? colors[7] : d > 22 ? colors[6] : d > 20 ? colors[5] :
                d > 18 ? colors[4] : d > 16 ? colors[3] : d > 14 ? colors[2] : colors[1];
        case 'shs_germination':
        case 'shs_booting':
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
    if (!attr) return [];
    const attribute = attr === 'oc' ? 'organic_carbon' : attr;
    const colors = {
        8: '#800026', 7: '#BD0026', 6: '#E31A1C', 5: '#FC4E2A',
        4: '#FD8D3C', 3: '#FEB24C', 2: '#FED976', 1: '#FFEDA0'
    };

    const thresholds = {
        nitrogen: [300, 270, 240, 210, 180, 150, 120],
        phosphorus: [25, 22, 19, 16, 13, 10, 7],
        potassium: [160, 150, 140, 130, 120, 110, 100],
        ph: [8.0, 7.5, 7.0, 6.5, 6.0, 5.5, 5.0],
        organic_carbon: [0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15],
        moisture: [30, 25, 20, 15, 12, 10, 8],
        temperature: [26, 24, 22, 20, 18, 16, 14],
        shs_germination: [90, 80, 70, 60, 30]
    };

    if (attribute === 'shs_germination' || attribute === 'shs_booting' ||
        attribute === 'germ_points' || attribute === 'boot_points' ||
        attribute === 'germ_heat' || attribute === 'boot_heat') {

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




// NEW: Lat/Lon points layer (CircleMarkers)
const SuitabilityPointsLayer = ({ points, stage }) => {
    if (!points || points.length === 0) return null;

    const t = SUITABILITY_THRESHOLDS[stage] || SUITABILITY_THRESHOLDS.germination;
    const getCat = (shs) => {
        if (shs === null || shs === undefined) return null;
        if (shs >= 90) return "Excellent";
        if (shs >= 80) return "Very Good";
        if (shs >= 70) return "Good";
        if (shs >= 60) return "Moderate";
        if (shs >= 30) return "Poor";
        return "Very Poor";
    };
    const getColor = (shs) => getExperimentalColor(stage === 'booting' ? 'shs_booting' : 'shs_germination', shs);

    return (
        <>
            {points.map((p, idx) => {
                const shs = stage === "booting" ? p.booting?.shs : p.germination?.shs;
                const cat = getCat(shs);
                return (
                    <CircleMarker
                        key={`${stage}-${idx}`}
                        center={[p.lat, p.lon]}
                        radius={4}
                        pathOptions={{
                            color: getColor(shs),
                            weight: 1,
                            fillColor: getColor(shs),
                            fillOpacity: 0.8
                        }}
                    >
                        <Popup>
                            <div className="text-sm">
                                <div className="font-bold">{stage.toUpperCase()} point</div>
                                <div>SHS: {typeof shs === "number" ? shs.toFixed(2) : "N/A"}</div>
                                <div>Category (demo): {cat || "N/A"}</div>
                                <div className="text-xs text-gray-500 mt-1">Lat: {p.lat.toFixed(4)} Lon: {p.lon.toFixed(4)}</div>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </>
    );
};

// NEW: Heatmap layer for lat/lon suitability
const SuitabilityHeatLayer = ({ points, stage, enabled }) => {
    const map = useMap();
    const layerRef = useRef(null);

    useEffect(() => {
        if (!enabled || !points || points.length === 0) {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
            return;
        }

        const t = SUITABILITY_THRESHOLDS[stage] || SUITABILITY_THRESHOLDS.germination;
        const min = t.fair - 5;
        const max = t.good + 5;
        const norm = (v) => {
            if (v === null || v === undefined) return 0;
            return Math.max(0, Math.min(1, (v - min) / (max - min)));
        };

        const heatData = points
            .map(p => {
                const shs = stage === "booting" ? p.booting?.shs : p.germination?.shs;
                return [p.lat, p.lon, norm(shs)];
            });

        if (layerRef.current) map.removeLayer(layerRef.current);
        // @ts-ignore
        layerRef.current = L.heatLayer(heatData, { radius: 18, blur: 14, maxZoom: 10 });
        layerRef.current.addTo(map);

        return () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, [enabled, points, stage, map]);

    return null;
};

// Component to handle Vector Boundaries
const VectorBoundaryLayer = ({ type, visible, weight = 1.5, color = '#9e9e9e', matchedSubdistricts, selectedAttribute, shsGermData, shsBootData, soilData, shsDistricts }) => {
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

        // Comprehensive name detection for highlighting
        const featureName = (props.District || props.DISTRICT || props.DIST_NAME || props.dtname ||
            props.TEHSIL || props.SUB_DIST || props.sdtname ||
            props.STATE || props.ST_NM || props.stname || "Region").trim().toUpperCase();

        const districtName = featureName.toLowerCase();

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
                    color: '#aaa',
                    weight: 0.5,
                    opacity: 0.5
                };
            }
        }

        if (selectedAttribute && (val !== undefined || selectedAttribute?.startsWith('shs_') || (soilData && type === 'district')) && (type === 'district' || type === 'state')) {
            let fillColor = getExperimentalColor(selectedAttribute, val);

            // SPECIAL LOGIC: If we are viewing suitability, check the live SHS data first
            if (selectedAttribute === 'shs_germination' || selectedAttribute === 'shs_booting') {
                const stage = selectedAttribute === 'shs_germination' ? 'germination' : 'booting';
                const t = SHS_COLOR_THRESHOLDS[stage];
                const shsData = stage === 'germination' ? shsGermData : shsBootData;
                const normalizedSHS = {};
                Object.entries(shsData || {}).forEach(([k, v]) => {
                    normalizedSHS[k.trim().toLowerCase()] = v;
                });

                const district = normalizedSHS[districtName];

                if (district) {
                    const avg = district.avg_shs;
                    fillColor = getExperimentalColor(selectedAttribute, avg);
                } else {
                    fillColor = 'transparent';
                }
            } else if (type === 'district' && soilData && soilData[districtName]) {
                // Check joined soil data for districts (Nitrogen, Phosphorous, etc.)
                // RESTRICT TO SHS DISTRICTS (User's requested "8 districts")
                const isSHSDistrict = shsDistricts && shsDistricts.some(d => d.toLowerCase() === districtName);

                if (isSHSDistrict) {
                    const joinedVal = soilData[districtName][selectedAttribute];
                    if (joinedVal !== undefined) {
                        fillColor = getExperimentalColor(selectedAttribute, joinedVal);
                    } else {
                        fillColor = 'transparent';
                    }
                } else {
                    fillColor = 'transparent';
                }
            }

            return {
                fillColor: isState ? 'transparent' : fillColor,
                fillOpacity: isState ? 0.05 : (fillColor === 'transparent' ? 0 : 0.75),
                color: isState ? '#1a9850' : (type === 'district' ? '#000000' : '#666'),
                weight: isState ? 2 : 0.8,
                opacity: (isState || fillColor === 'transparent') ? 0.5 : 1,
                dashArray: isState ? null : '3'
            };
        }

        return {
            fillColor: 'transparent',
            fillOpacity: 0.05,
            color: isState ? '#1a9850' : (type === 'district' ? '#000000' : color),
            weight: weight,
            opacity: 1
        };
    };

    const onEachFeature = (feature, layer) => {
        const props = feature.properties;
        const name = (props.District || props.DISTRICT || props.DIST_NAME || props.dtname || props.TEHSIL || props.SUB_DIST || props.sdtname || props.STATE || props.ST_NM || props.stname || 'Unknown').trim();
        const districtName = name.toLowerCase();

        // Hover highlighting logic
        layer.on({
            mouseover: (e) => {
                const targetLayer = e.target;
                targetLayer.setStyle({
                    weight: type === 'state' ? 3 : 2,
                    color: '#222',
                    fillOpacity: type === 'state' ? 0.15 : 0.9,
                    dashArray: ''
                });
            },
            mouseout: (e) => {
                const targetLayer = e.target;
                targetLayer.setStyle(style(feature));
            },
            mousemove: (e) => {
                const { lat, lng } = e.latlng;
                const attr = ATTRIBUTES.find(a => a.key === selectedAttribute);

                let displayVal = undefined;
                let label = attr?.label || selectedAttribute;

                // SPECIAL LOGIC: Show values ONLY for SHS districts (or if it's the state layer)
                const isSHSAttribute = selectedAttribute === 'shs_germination' || selectedAttribute === 'shs_booting';
                const isSHSDistrict = shsDistricts && shsDistricts.some(d => d.toLowerCase() === districtName);

                if (isSHSAttribute) {
                    const stage = selectedAttribute === 'shs_germination' ? 'germination' : 'booting';
                    const shsData = stage === 'germination' ? shsGermData : shsBootData;
                    const normalizedSHS = {};
                    Object.entries(shsData || {}).forEach(([k, v]) => {
                        normalizedSHS[k.trim().toLowerCase()] = v;
                    });
                    const district = normalizedSHS[districtName];
                    if (district) {
                        displayVal = district.avg_shs;
                    }
                } else if (type === 'district' && isSHSDistrict && soilData && soilData[districtName]) {
                    displayVal = soilData[districtName][selectedAttribute];
                } else if (type === 'state') {
                    displayVal = props[selectedAttribute] ?? props['oc'];
                }

                let html = `<div class="p-2">
                    <div class="text-[10px] font-bold text-gray-400 uppercase">${type}</div>
                    <div class="text-sm font-bold text-gray-800">${name}</div>`;

                if (displayVal !== undefined && displayVal !== null) {
                    const formattedVal = typeof displayVal === 'number' ? displayVal.toFixed(2) : displayVal;
                    html += `<div class="mt-1 flex items-center gap-2">
                        <span class="text-xs text-gray-600">${label}:</span>
                        <span class="text-sm font-bold text-green-700">${formattedVal}${attr?.unit || ''}</span>
                    </div>`;
                }

                html += `<div class="text-[9px] text-gray-400 mt-1 border-t pt-1">
                    Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}
                </div>`;

                html += `</div>`;
                layer.setTooltipContent(html);
            }
        });

        layer.bindTooltip("", { sticky: true, className: 'custom-map-tooltip' });
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

const GerminationSuitability = () => {
    // State
    const [locations, setLocations] = useState({ states: [], districts: {}, subdistricts: {} });
    const [filters, setFilters] = useState({ state: '', district: '', subdistrict: '' });
    const [farmData, setFarmData] = useState([]);
    const [selectedAttribute, setSelectedAttribute] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mapInstance, setMapInstance] = useState(null);
    const navigate = useNavigate();

    // Query Builder State
    const [queryBuilderOpen, setQueryBuilderOpen] = useState(false);
    const [matchedSubdistricts, setMatchedSubdistricts] = useState(null);

    // View Toggles
    const [showStates, setShowStates] = useState(true);
    const [showDistricts, setShowDistricts] = useState(false);
    const [showSubdistricts, setShowSubdistricts] = useState(false);
    const [showPoints, setShowPoints] = useState(false);
    const [germShsData, setGermShsData] = useState({});
    const [bootShsData, setBootShsData] = useState({});

    // NEW: Lat/Lon suitability overlays
    const [latlonPoints, setLatlonPoints] = useState([]);
    const [shsDistricts, setShsDistricts] = useState([]);

    // Master list of SHS districts for filtering soil attributes
    useEffect(() => {
        fetch(`${SHS_API_BASE_URL}/districts`)
            .then(res => res.json())
            .then(data => {
                if (data) setShsDistricts(Object.keys(data));
            })
            .catch(err => console.error("Error fetching master SHS districts:", err));
    }, []);

    // If any SHS data exists but no state is selected, default to Maharashtra (since SHS backend only processes Maharashtra currently)
    useEffect(() => {
        const hasGermData = germShsData && Object.keys(germShsData).length > 0;
        const hasBootData = bootShsData && Object.keys(bootShsData).length > 0;

        if ((selectedAttribute === 'shs_germination' && hasGermData || selectedAttribute === 'shs_booting' && hasBootData) && !filters.state) {
            setFilters((prev) => ({ ...prev, state: 'Maharashtra' }));
        }

        // Auto-show Districts and hide States when ANY attribute or suitability score is selected
        if (selectedAttribute) {
            setShowDistricts(true);
            setShowStates(false);
            setShowSubdistricts(false);
        } else if (!selectedAttribute && !showDistricts && !showSubdistricts && !showPoints) {
            setShowStates(true);
        }
    }, [selectedAttribute, filters.state, showDistricts, showSubdistricts, showPoints]);

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
                // Remove the early return for 'All States' to allow global data load
                const query = new URLSearchParams();
                if (filters.state && filters.state !== 'All States') query.append('state', filters.state);
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

    // Fetch SHS Data
    useEffect(() => {
        if (selectedAttribute === 'shs_germination') {
            fetch(`${SHS_API_BASE_URL}/districts`)
                .then(res => res.json())
                .then(data => setGermShsData(data))
                .catch(err => console.error("Error fetching germination SHS data:", err));
        }
    }, [selectedAttribute]);

    useEffect(() => {
        if (selectedAttribute === 'shs_booting') {
            fetch(`${SHS_API_BASE_URL}/districts/booting`)
                .then(res => res.json())
                .then(data => setBootShsData(data))
                .catch(err => console.error("Error fetching booting SHS data:", err));
        }
    }, [selectedAttribute]);

    // NEW: Fetch Lat/Lon suitability points (from main backend map endpoint)
    useEffect(() => {
        const pointLayers = ['germ_points', 'boot_points', 'germ_heat', 'boot_heat'];
        const anyEnabled = pointLayers.includes(selectedAttribute);
        if (!anyEnabled) return;

        fetch(LATLON_POINTS_URL)
            .then(res => res.json())
            .then(data => setLatlonPoints(data.points || []))
            .catch(err => console.error("Error fetching lat/lon suitability points:", err));
    }, [selectedAttribute]);

    // Aggregate Soil Data by District for Map Coloring
    const aggregatedDistrictData = useMemo(() => {
        if (!farmData.length) return {};
        const sums = {};
        farmData.forEach(row => {
            const d = (row.district || "").trim().toLowerCase();
            if (!d) return;
            if (!sums[d]) sums[d] = { count: 0 };
            ATTRIBUTES.forEach(attr => {
                if (attr.key.startsWith('shs_')) return;
                const val = row[attr.key];
                if (val !== undefined && val !== null) {
                    sums[d][attr.key] = (sums[d][attr.key] || 0) + val;
                }
            });
            sums[d].count++;
        });

        const aggregated = {};
        Object.keys(sums).forEach(d => {
            aggregated[d] = {};
            ATTRIBUTES.forEach(attr => {
                if (attr.key.startsWith('shs_')) return;
                aggregated[d][attr.key] = sums[d][attr.key] / sums[d].count;
            });
        });
        return aggregated;
    }, [farmData]);

    // Calculate Dynamic Stats for Normalization (District level, restricted to SHS districts)
    const attributeStats = useMemo(() => {
        if (!Object.keys(aggregatedDistrictData).length) return {};

        const stats = {};
        ATTRIBUTES.forEach(attr => {
            if (attr.key.startsWith('shs_')) return;

            // Only use values from the 9 SHS districts to define the color scale
            const districtVals = Object.entries(aggregatedDistrictData)
                .filter(([d, _]) => shsDistricts.some(sd => sd.toLowerCase() === d.toLowerCase()))
                .map(([_, data]) => data[attr.key])
                .filter(v => v !== undefined && v !== null);

            if (districtVals.length) {
                stats[attr.key] = {
                    min: Math.min(...districtVals),
                    max: Math.max(...districtVals)
                };
            }
        });
        return stats;
    }, [aggregatedDistrictData, shsDistricts]);

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
                <h1 className="text-xl font-bold text-gray-800">Germination Suitability</h1>

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

                        {/* Districts Layer (Now handles SHS and Soil Data logic internally) */}
                        <VectorBoundaryLayer
                            type="district"
                            visible={showDistricts}
                            weight={1.5}
                            color="#444"
                            matchedSubdistricts={matchedSubdistricts}
                            selectedAttribute={selectedAttribute}
                            attributeStats={attributeStats}
                            shsGermData={germShsData}
                            shsBootData={bootShsData}
                            soilData={aggregatedDistrictData}
                            shsDistricts={shsDistricts}
                        />

                        {/* SHS Choropleth Layers are now integrated into VectorBoundaryLayer */}

                        {/* NEW: Lat/Lon overlays */}
                        <SuitabilityHeatLayer points={latlonPoints} stage="germination" enabled={selectedAttribute === 'germ_heat'} />
                        <SuitabilityHeatLayer points={latlonPoints} stage="booting" enabled={selectedAttribute === 'boot_heat'} />
                        {selectedAttribute === 'germ_points' && <SuitabilityPointsLayer points={latlonPoints} stage="germination" />}
                        {selectedAttribute === 'boot_points' && <SuitabilityPointsLayer points={latlonPoints} stage="booting" />}
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
                <div className="w-full lg:w-1/4 h-[70vh] lg:h-[calc(100vh-64px)] bg-gray-50 border-l border-gray-200 flex flex-col">

                    {/* Scrollable Content area */}
                    <div className="flex-grow overflow-y-auto p-6">
                        <div className="mb-8">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex justify-between items-center">
                                Map View
                                <button
                                    onClick={() => {
                                        setFilters({ state: '', district: '', subdistrict: '' });
                                        setSelectedAttribute(null);
                                        setShowStates(true);
                                        setShowDistricts(false);
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
                                    <label className="flex items-center gap-2 cursor-pointer group text-[13px] text-gray-700">
                                        <input
                                            type="radio"
                                            name="suitability-radio"
                                            checked={selectedAttribute === 'shs_germination'}
                                            onChange={() => setSelectedAttribute('shs_germination')}
                                            className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                        />
                                        <span className="group-hover:text-green-700 transition-colors capitalize">Germination Suitability</span>
                                        {selectedAttribute === 'shs_germination' && !germShsData && <span className="animate-pulse text-[9px] text-orange-500 font-bold ml-1">Loading...</span>}
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group text-[13px] text-gray-700">
                                        <input
                                            type="radio"
                                            name="suitability-radio"
                                            checked={selectedAttribute === 'shs_booting'}
                                            onChange={() => setSelectedAttribute('shs_booting')}
                                            className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                                        />
                                        <span className="group-hover:text-purple-700 transition-colors capitalize">Booting Suitability</span>
                                        {selectedAttribute === 'shs_booting' && !bootShsData && <span className="animate-pulse text-[9px] text-orange-500 font-bold ml-1">Loading...</span>}
                                    </label>
                                    <div className="pt-2 mt-2 border-t border-gray-100">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Lat/Lon Suitability</div>
                                        <label className="flex items-center gap-2 cursor-pointer group text-[13px] text-gray-700">
                                            <input
                                                type="radio"
                                                name="suitability-radio"
                                                checked={selectedAttribute === 'germ_points'}
                                                onChange={() => setSelectedAttribute('germ_points')}
                                                className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                            />
                                            <span className="group-hover:text-green-700 transition-colors">Germination Points</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group text-[13px] text-gray-700">
                                            <input
                                                type="radio"
                                                name="suitability-radio"
                                                checked={selectedAttribute === 'boot_points'}
                                                onChange={() => setSelectedAttribute('boot_points')}
                                                className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                                            />
                                            <span className="group-hover:text-purple-700 transition-colors">Booting Points</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group text-[13px] text-gray-700">
                                            <input
                                                type="radio"
                                                name="suitability-radio"
                                                checked={selectedAttribute === 'germ_heat'}
                                                onChange={() => setSelectedAttribute('germ_heat')}
                                                className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                            />
                                            <span className="group-hover:text-green-700 transition-colors">Germination Heatmap</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group text-[13px] text-gray-700">
                                            <input
                                                type="radio"
                                                name="suitability-radio"
                                                checked={selectedAttribute === 'boot_heat'}
                                                onChange={() => setSelectedAttribute('boot_heat')}
                                                className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                                            />
                                            <span className="group-hover:text-purple-700 transition-colors">Booting Heatmap</span>
                                        </label>
                                    </div>
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
                            {ATTRIBUTES.filter(a =>
                                !a.key.startsWith('shs_') &&
                                !a.key.startsWith('germ_') &&
                                !a.key.startsWith('boot_')
                            ).map(attr => (
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
                                    {selectedAttribute === attr.key && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Fixed Action Button Footer */}
                    <div className="p-5 bg-white border-t border-gray-100 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
                        <button
                            onClick={() => navigate('/farmer/form')}
                            className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3 group border border-green-400/20"
                        >
                            <span className="text-sm font-bold uppercase tracking-wider">Analyse Soil</span>
                            <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        </button>
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

export default GerminationSuitability;
