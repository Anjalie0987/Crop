import React, { useState, useEffect } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { INDIA_CENTER, DEFAULT_ZOOM } from '../data/geoBounds';

const MAP_API_URL = process.env.REACT_APP_API_BASE_URL + "/map";

// Component to handle Vector Boundaries
const VectorBoundaryLayer = ({ type, visible, weight = 1.5, color = '#666' }) => {
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

    const style = () => ({
        fillColor: 'transparent',
        fillOpacity: 0,
        color: color,
        weight: weight,
        opacity: 1
    });

    const onEachFeature = (feature, layer) => {
        const props = feature.properties;
        const name = (props.District || props.DISTRICT || props.DIST_NAME || props.dtname ||
            props.TEHSIL || props.SUB_DIST || props.sdtname ||
            props.STATE || props.ST_NM || props.stname || "Region").trim();

        layer.on({
            mouseover: (e) => {
                const targetLayer = e.target;
                targetLayer.setStyle({
                    weight: weight + 1,
                    color: '#222',
                    fillOpacity: 0.1
                });
            },
            mouseout: (e) => {
                const targetLayer = e.target;
                targetLayer.setStyle(style());
            },
            mousemove: (e) => {
                const { lat, lng } = e.latlng;
                const html = `
                    <div class="p-2">
                        <div class="text-[10px] font-bold text-gray-400 uppercase">${type}</div>
                        <div class="text-sm font-bold text-gray-800">${name}</div>
                        <div class="text-[10px] text-gray-500 mt-1">
                            Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}
                        </div>
                    </div>
                `;
                layer.setTooltipContent(html);
            }
        });

        layer.bindTooltip("", { sticky: true, className: 'custom-map-tooltip' });
    };

    return (
        <>
            <style>{`
                .custom-map-tooltip {
                    background: white !important;
                    border: none !important;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
                    border-radius: 8px !important;
                    padding: 0 !important;
                }
            `}</style>
            <GeoJSON data={geoJsonData} style={style} onEachFeature={onEachFeature} />
        </>
    );
};

// Component to capture map instance
const MapInstanceCollector = ({ onMap }) => {
    const map = useMap();
    useEffect(() => {
        if (map) onMap(map);
    }, [map, onMap]);
    return null;
};

const MapLanding = () => {
    const [mapInstance, setMapInstance] = useState(null);
    const [showStates, setShowStates] = useState(true);
    const [showDistricts, setShowDistricts] = useState(false);
    const [showSubdistricts, setShowSubdistricts] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="h-16 bg-white shadow-sm border-b border-gray-200 z-20 px-6 flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800 tracking-tight">Map Landing</h1>

                <Link
                    to="/germination-suitability"
                    className="bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md transform hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Soil Analysis
                </Link>
            </header>

            <div className="flex-grow flex flex-col lg:flex-row relative">
                {/* Map Section */}
                <div className="flex-grow h-[calc(100vh-64px)] relative bg-white">
                    <MapContainer
                        center={INDIA_CENTER}
                        zoom={DEFAULT_ZOOM}
                        style={{ height: '100%', width: '100%', background: '#fff' }}
                        zoomControl={false}
                    >
                        <MapInstanceCollector onMap={setMapInstance} />

                        <VectorBoundaryLayer type="state" visible={showStates} weight={2} color="#444" />
                        <VectorBoundaryLayer type="district" visible={showDistricts} weight={1.2} color="#666" />
                        <VectorBoundaryLayer type="subdistrict" visible={showSubdistricts} weight={0.8} color="#999" />
                    </MapContainer>

                    {/* Floating Map Controls */}
                    <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-4">
                        {/* Layer Toggles */}
                        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 space-y-3 min-w-[180px]">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-2 mb-2">Layers</h3>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={showStates}
                                    onChange={(e) => setShowStates(e.target.checked)}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 transition-colors">States Boundary</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={showDistricts}
                                    onChange={(e) => setShowDistricts(e.target.checked)}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 transition-colors">Districts</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={showSubdistricts}
                                    onChange={(e) => setShowSubdistricts(e.target.checked)}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 transition-colors">Sub-districts</span>
                            </label>
                        </div>

                        {/* Navigation Controls */}
                        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex flex-col gap-4 items-center">
                            {/* Zoom */}
                            <div className="flex flex-col gap-1 items-center border-b pb-3 w-full">
                                <div className="flex bg-gray-50 border border-gray-200 rounded p-1 shadow-inner">
                                    <button
                                        onClick={() => mapInstance?.zoomIn()}
                                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 text-gray-600 rounded-l hover:bg-gray-100 font-bold"
                                    >
                                        +
                                    </button>
                                    <button
                                        onClick={() => mapInstance?.zoomOut()}
                                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 text-gray-600 rounded-r hover:bg-gray-100 font-bold border-l-0"
                                    >
                                        -
                                    </button>
                                </div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Zoom</span>
                            </div>

                            {/* Pan Controls */}
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                {/* Pan Up */}
                                <button
                                    onClick={() => mapInstance?.panBy([0, -150])}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-7 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600"
                                >
                                    ↑
                                </button>
                                {/* Pan Left */}
                                <button
                                    onClick={() => mapInstance?.panBy([-150, 0])}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600"
                                >
                                    ←
                                </button>
                                {/* Recenter */}
                                <button
                                    onClick={() => mapInstance?.setView(INDIA_CENTER, DEFAULT_ZOOM)}
                                    className="w-8 h-8 bg-green-600 text-white rounded-full shadow-md hover:bg-green-700 flex items-center justify-center z-10 transition-transform active:scale-95"
                                >
                                    ⟳
                                </button>
                                {/* Pan Right */}
                                <button
                                    onClick={() => mapInstance?.panBy([150, 0])}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600"
                                >
                                    →
                                </button>
                                {/* Pan Down */}
                                <button
                                    onClick={() => mapInstance?.panBy([0, 150])}
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-7 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600"
                                >
                                    ↓
                                </button>
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Pan</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapLanding;
