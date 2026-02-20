document.addEventListener('DOMContentLoaded', () => {
    // Initialize the map
    const map = L.map('map').setView([20.5937, 78.9629], 5); // Default to India center

    // Add a base tile layer (optional, but good for context)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Color function for Nitrogen
    function getColor(n) {
        if (n === null || n === undefined) return '#808080'; // Gray for null

        return n > 280 ? '#800026' : // High
            n > 240 ? '#BD0026' :
                n > 200 ? '#E31A1C' :
                    n > 160 ? '#FC4E2A' :
                        n > 120 ? '#FD8D3C' :
                            n > 80 ? '#FEB24C' :
                                n > 40 ? '#FED976' :
                                    '#FFEDA0';  // Low
    }

    // Style function
    function style(feature) {
        return {
            fillColor: getColor(feature.properties.nitrogen),
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
    }

    // Interaction handlers
    function onEachFeature(feature, layer) {
        if (feature.properties) {
            const props = feature.properties;
            layer.bindPopup(`
                <strong>Grid ID:</strong> ${props.grid_id || 'N/A'}<br>
                <strong>Nitrogen:</strong> ${props.nitrogen !== null ? props.nitrogen : 'N/A'}<br>
                <strong>Phosphorus:</strong> ${props.phosphorus !== null ? props.phosphorus : 'N/A'}<br>
                <strong>Potassium:</strong> ${props.potassium !== null ? props.potassium : 'N/A'}<br>
                <strong>Soil Moisture:</strong> ${props.soil_moisture !== null ? props.soil_moisture : 'N/A'}
            `);
        }
    }

    // Fetch GeoJSON from API
    fetch('http://127.0.0.1:8000/choropleth')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Create GeoJSON layer
            const geoJsonLayer = L.geoJSON(data, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);

            // Fit map bounds to the data
            if (geoJsonLayer.getLayers().length > 0) {
                map.fitBounds(geoJsonLayer.getBounds());
            } else {
                console.warn("No features found in GeoJSON data.");
            }

            // Add Legend
            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = function (map) {
                const div = L.DomUtil.create('div', 'info legend');
                const grades = [0, 40, 80, 120, 160, 200, 240, 280];
                const labels = [];

                div.innerHTML += '<strong>Nitrogen (kg/ha)</strong><br>';

                // loop through our density intervals and generate a label with a colored square for each interval
                for (let i = 0; i < grades.length; i++) {
                    div.innerHTML +=
                        '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                        grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
                }

                div.innerHTML += '<br><i style="background:#808080"></i> No Data';

                return div;
            };
            legend.addTo(map);

        })
        .catch(error => {
            console.error('Error fetching GeoJSON:', error);
            alert('Failed to load map data. See console for details.');
        });
});
