import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, Marker, Popup, useMap, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { INDIA_CENTER, DEFAULT_ZOOM } from '../../data/geoBounds';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Styles
const STYLES = {
    default: {
        color: "#2e7d32",    // User Req: #2e7d32
        weight: 2,           // User Req: 2
        fillColor: "#81c784", // User Req: #81c784
        fillOpacity: 0.4,    // User Req: 0.4
    },
    hover: {
        weight: 3,           // User Req: 3
        fillOpacity: 0.6,    // User Req: 0.6
        color: "#1b9e20"     // Slightly darker border for hover
    }
};

// Helper component to handle GeoJSON lifecycle & updates
const GeoJsonController = ({ data, onRegionSelect }) => {
    const map = useMap();
    const geoJsonLayerRef = useRef(null);

    useEffect(() => {
        if (!data) return;

        // Cleanup previous layer
        if (geoJsonLayerRef.current) {
            map.removeLayer(geoJsonLayerRef.current);
            geoJsonLayerRef.current = null;
        }

        const onEachFeature = (feature, layer) => {
            const props = feature.properties;
            const regionName = (props.TEHSIL || props.TEHSIL_NAM || props.sub_dist ||
                props.DISTRICT || props.DIST_NAME || props.dtname || props.District ||
                props.STATE || props.ST_NAME || props.ST_NM || props.State || 'Region').trim();

            const regionType = props.TEHSIL || props.sub_dist ? 'Sub-district' :
                props.DISTRICT || props.District ? 'District' : 'State';

            // Hover Effects
            layer.on({
                mouseover: (e) => {
                    const l = e.target;
                    l.setStyle(STYLES.hover);
                    l.bringToFront();
                },
                mouseout: (e) => {
                    const l = e.target;
                    if (geoJsonLayerRef.current) {
                        geoJsonLayerRef.current.resetStyle(l);
                    }
                },
                mousemove: (e) => {
                    const { lat, lng } = e.latlng;
                    const tooltipHtml = `
                        <div class="p-2 min-w-[100px]">
                            <div class="text-[10px] font-bold text-gray-400 uppercase">${regionType}</div>
                            <div class="text-sm font-bold text-gray-800">${regionName}</div>
                            <div class="text-[10px] text-gray-500 mt-1 border-t pt-1">
                                Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}
                            </div>
                        </div>
                    `;
                    layer.setTooltipContent(tooltipHtml);
                },
                click: (e) => {
                    if (onRegionSelect && regionName) {
                        onRegionSelect(regionName);
                    }
                }
            });

            layer.bindTooltip("", {
                sticky: true,
                className: 'custom-map-tooltip',
                direction: 'top',
                offset: [0, -10]
            });
        };

        // Create new layer
        geoJsonLayerRef.current = L.geoJson(data, {
            style: STYLES.default,
            onEachFeature: onEachFeature
        }).addTo(map);

        // Auto-zoom to bounds ONLY if it's the first load or data changed WITHOUT a map click
        const bounds = geoJsonLayerRef.current.getBounds();
        const shouldFitBounds = bounds.isValid() && !data.isFromClick;
        
        if (shouldFitBounds) {
            map.fitBounds(bounds, {
                padding: [20, 20],
                animate: true,
                duration: 0.6
            });
        }

        // Cleanup on unmount or data change
        return () => {
            if (geoJsonLayerRef.current) {
                map.removeLayer(geoJsonLayerRef.current);
            }
        };
    }, [data, map, onRegionSelect]);

    return null;
};

const LocationMarker = ({ position, setPosition }) => {
    const markerRef = useRef(null);
    
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            // Use setTimeout to ensure the zoom happens after the re-render
            // and is not cancelled by other map activities
            setTimeout(() => {
                map.setView(e.latlng, 15, {
                    animate: true,
                    duration: 1
                });
            }, 100);
        },
    });

    useEffect(() => {
        if (markerRef.current && position) {
            markerRef.current.openPopup();
        }
    }, [position]);

    if (!position) return null;

    return (
        <CircleMarker 
            ref={markerRef}
            center={position} 
            radius={5}
            pathOptions={{
                fillColor: '#000000',
                fillOpacity: 1,
                color: '#ffffff',
                weight: 2,
                stroke: true
            }}
        >
            <Popup className="coordinates-popup">
                <div className="p-1 min-w-[140px]">
                    <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-2 border-b pb-1">
                        Field Coordinates
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center gap-3">
                            <span className="text-[10px] text-gray-500 font-medium">Lat:</span>
                            <span className="text-xs font-mono font-bold text-gray-800">{position.lat.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-3">
                            <span className="text-[10px] text-gray-500 font-medium">Lng:</span>
                            <span className="text-xs font-mono font-bold text-gray-800">{position.lng.toFixed(6)}</span>
                        </div>
                    </div>
                    <div className="mt-2 text-[9px] text-gray-400 italic">
                        Click analyze to process this location
                    </div>
                </div>
            </Popup>
        </CircleMarker>
    );
};

const FarmerMap = ({ boundaryGeoJSON, onLocationSelect, onRegionSelect }) => {
    // Local state for marker if not controlled by parent
    const [markerPos, setMarkerPos] = useState(null);

    const handleMarkerSet = (pos) => {
        setMarkerPos(pos);
        if (onLocationSelect) {
            onLocationSelect(pos);
        }
    };

    return (
        <div className="h-full w-full z-0 relative bg-white">
            <style>{`
                .custom-map-tooltip {
                    background: white !important;
                    border: none !important;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
                    border-radius: 8px !important;
                    padding: 0 !important;
                    opacity: 1 !important;
                }
            `}</style>
            <MapContainer
                center={INDIA_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: '100%', width: '100%', background: '#ffffff' }} // White background
                scrollWheelZoom={true}
            >
                {/* No TileLayer - Pure Vector Map */}
                <GeoJsonController
                    data={boundaryGeoJSON}
                    onRegionSelect={onRegionSelect}
                />

                <LocationMarker position={markerPos} setPosition={handleMarkerSet} />

                {/* Overlay instruction */}
                <div className="absolute top-4 right-4 bg-white/90 p-2 rounded shadow-md z-[1000] text-xs max-w-[200px]">
                    <p className="font-semibold text-gray-700">Interactive Map</p>
                    <p className="text-gray-600">Click a region to select. Click empty space to mark field.</p>
                </div>
            </MapContainer>
        </div>
    );
};

export default FarmerMap;
