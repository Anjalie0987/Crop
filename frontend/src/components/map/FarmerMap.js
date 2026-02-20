import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet';
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
            // Hover Effects
            layer.on({
                mouseover: (e) => {
                    const l = e.target;
                    l.setStyle(STYLES.hover);
                    l.bringToFront();
                },
                mouseout: (e) => {
                    const l = e.target;
                    geoJsonLayerRef.current.resetStyle(l);
                },
                click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    const props = feature.properties;
                    // Determine name based on level
                    const regionName = props.TEHSIL || props.TEHSIL_NAM || props.sub_dist ||
                        props.DISTRICT || props.DIST_NAME || props.dtname || props.District ||
                        props.STATE || props.ST_NAME || props.State;

                    if (onRegionSelect && regionName) {
                        onRegionSelect(regionName);
                    }
                }
            });
        };

        // Create new layer
        geoJsonLayerRef.current = L.geoJSON(data, {
            style: STYLES.default,
            onEachFeature: onEachFeature
        }).addTo(map);

        // Auto-zoom to bounds
        const bounds = geoJsonLayerRef.current.getBounds();
        if (bounds.isValid()) {
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
    useMap().on('click', (e) => {
        setPosition(e.latlng);
    });

    return position === null ? null : (
        <Marker position={position}>
            <Popup>Selected Field Location</Popup>
        </Marker>
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

            {/* Overlay instruction */}
            <div className="absolute top-4 right-4 bg-white/90 p-2 rounded shadow-md z-[1000] text-xs max-w-[200px]">
                <p className="font-semibold text-gray-700">Interactive Map</p>
                <p className="text-gray-600">Click a region to select. Click empty space to mark field.</p>
            </div>
        </div>
    );
};

export default FarmerMap;
