// Mock data for India States and Districts bounds/centers
// Approximated for demo purposes

export const INDIA_CENTER = [20.5937, 78.9629];
export const DEFAULT_ZOOM = 5;

export const STATE_DATA = {
    "PB": {
        name: "Punjab",
        center: [31.1471, 75.3412],
        zoom: 8,
        bounds: [
            [29.5, 73.5], // SouthWest
            [32.5, 77.0]  // NorthEast
        ],
        districts: {
            "D1": {
                name: "Amritsar", // Mapping D1 to a real name for better demo
                center: [31.6340, 74.8723],
                zoom: 11,
                bounds: [
                    [31.4, 74.6],
                    [31.9, 75.2]
                ]
            },
            "D2": {
                name: "Ludhiana", // Mapping D2 to a real name
                center: [30.9010, 75.8573],
                zoom: 11,
                bounds: [
                    [30.7, 75.6],
                    [31.1, 76.1]
                ]
            }
        }
    },
    "HR": {
        name: "Haryana",
        center: [29.0588, 76.0856],
        zoom: 8,
        bounds: [
            [27.5, 74.0],
            [31.0, 77.5]
        ],
        districts: {
            "D1": {
                name: "Gurugram",
                center: [28.4595, 77.0266],
                zoom: 11,
                bounds: [
                    [28.2, 76.8],
                    [28.6, 77.2]
                ]
            },
            "D2": {
                name: "Karnal",
                center: [29.6857, 76.9905],
                zoom: 11,
                bounds: [
                    [29.5, 76.8],
                    [29.9, 77.2]
                ]
            }
        }
    },
    "UP": {
        name: "Uttar Pradesh",
        center: [26.8467, 80.9462],
        zoom: 7,
        bounds: [
            [23.5, 77.0],
            [30.5, 84.5]
        ],
        districts: {
            "D1": {
                name: "Lucknow",
                center: [26.8467, 80.9462],
                zoom: 11,
                bounds: [
                    [26.6, 80.7],
                    [27.1, 81.2]
                ]
            },
            "D2": {
                name: "Varanasi",
                center: [25.3176, 82.9739],
                zoom: 11,
                bounds: [
                    [25.1, 82.7],
                    [25.5, 83.2]
                ]
            }
        }
    }
};
