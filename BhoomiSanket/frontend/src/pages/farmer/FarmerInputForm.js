
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FarmerMap from '../../components/map/FarmerMap';
import { STATE_DATA } from '../../data/geoBounds';

const baseUrl = process.env.REACT_APP_API_BASE_URL;

const FarmerInputForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [markerPos, setMarkerPos] = useState(null);
    const [boundaryGeoJSON, setBoundaryGeoJSON] = useState(null);

    // State management for sync
    const [districtsList, setDistrictsList] = useState([]);
    const [subDistrictsList, setSubDistrictsList] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedSubDistrict, setSelectedSubDistrict] = useState("");

    // Store full sub-district data to allow filtering without re-fetching
    const [fullSubDistrictData, setFullSubDistrictData] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        fieldId: '',
        state: '',
        district: '',
        subDistrict: '', // Added to form data
        n: '',
        p: '',
        k: '',
        ph: '',
        moisture: '',
        organic_carbon: '',
        temperature: ''
    });

    // --- Map Logic ---

    // 1. Initial Load: Fetch State Boundaries
    React.useEffect(() => {
        const loadInitialMap = async () => {
            try {
                const res = await fetch(baseUrl + '/map/state');
                if (!res.ok) throw new Error("Backend not reachable");
                const data = await res.json();
                setBoundaryGeoJSON(data);
            } catch (e) {
                console.error("Initial map load failed:", e);
                setError("Map Service Unavailable. Please start the backend.");
            }
        };
        loadInitialMap();
    }, []);

    // 2. Handle State Change -> Load Districts
    const handleStateChange = async (e) => {
        const newState = e.target.value;
        setFormData({ ...formData, state: newState, district: '', subDistrict: '' });

        // Reset Lower Levels
        setSelectedDistrict("");
        setSelectedSubDistrict("");
        setDistrictsList([]);
        setSubDistrictsList([]);
        setFullSubDistrictData(null); // Clear stored sub-district data

        if (newState) {
            try {
                setLoading(true);
                const res = await fetch(`${baseUrl}/map/district?state=${newState}`);
                if (res.ok) {
                    const data = await res.json();
                    if (e.isFromClick) data.isFromClick = true;
                    setBoundaryGeoJSON(data); // Render Districts

                    // Extract District Names for Dropdown
                    const dists = data.features.map(f =>
                        f.properties.DISTRICT || f.properties.DIST_NAME || f.properties.dtname || f.properties.District
                    ).filter(Boolean);
                    setDistrictsList([...new Set(dists)].sort());
                } else {
                    console.warn("District fetch failed, reverting to state");
                    // Fallback to State Map if district fetch fails
                    const stateRes = await fetch(baseUrl + '/map/state');
                    if (stateRes.ok) setBoundaryGeoJSON(await stateRes.json());
                }
            } catch (e) {
                console.error("District load error", e);
                // Fallback
                try {
                    const stateRes = await fetch(baseUrl + '/map/state');
                    if (stateRes.ok) setBoundaryGeoJSON(await stateRes.json());
                } catch (err) { }
            } finally {
                setLoading(false);
            }
        } else {
            // Reset to State Map
            const res = await fetch(baseUrl + '/map/state');
            if (res.ok) setBoundaryGeoJSON(await res.json());
        }
    };

    // 3. Handle District Change -> Load Sub-Districts
    const handleDistrictChange = async (e) => {
        const newDistrict = e.target.value;
        setFormData({ ...formData, district: newDistrict, subDistrict: '' });

        setSelectedDistrict(newDistrict);
        setSelectedSubDistrict("");
        setSubDistrictsList([]);

        if (newDistrict && formData.state) {
            try {
                setLoading(true);
                const res = await fetch(`${baseUrl}/map/subdistrict?state=${formData.state}&district=${newDistrict}`);
                if (res.ok) {
                    const data = await res.json();
                    if (e.isFromClick) data.isFromClick = true;
                    setBoundaryGeoJSON(data); // Render all Sub-Districts initially
                    setFullSubDistrictData(data); // Store for later filtering

                    // Extract Sub-District Names for Dropdown
                    const subs = data.features.map(f =>
                        f.properties.TEHSIL || f.properties.TEHSIL_NAM || f.properties.sub_dist || f.properties.District
                    ).filter(Boolean);
                    setSubDistrictsList([...new Set(subs)].sort());

                    // Clear district selection highlight because we are now showing sub-districts
                    // Use selectedSubDistrict for highlighting specific tehsils
                    setSelectedDistrict("");
                }
            } catch (e) {
                console.error("Sub-district load error", e);
                // Fallback? Keep district view or revert?
                // Ideally stick to district view but we might have lost it if we tried to replace.
                // Re-fetch district map to be safe
                const distRes = await fetch(`${baseUrl}/map/district?state=${formData.state}`);
                if (distRes.ok) setBoundaryGeoJSON(await distRes.json());
            } finally {
                setLoading(false);
            }
        }
    };

    // 4. Handle Sub-District Change -> Filter & Zoom
    const handleSubDistrictChange = (e) => {
        const newSub = e.target.value;
        setFormData({ ...formData, subDistrict: newSub });
        setSelectedSubDistrict(newSub);

        // Filter valid data to just this sub-district and update map to force zoom
        if (newSub && fullSubDistrictData) {
            const feature = fullSubDistrictData.features.find(f => {
                const props = f.properties;
                const name = props.TEHSIL || props.TEHSIL_NAM || props.sub_dist || props.District;
                return name === newSub;
            });

            if (feature) {
                // Pass ONLY this feature to map -> map detects new data -> auto zooms
                const filteredData = {
                    type: "FeatureCollection",
                    features: [feature]
                };
                if (e.isFromClick) filteredData.isFromClick = true;
                setBoundaryGeoJSON(filteredData);
            }
        } else if (!newSub && fullSubDistrictData) {
            // Restore full view if cleared
            setBoundaryGeoJSON(fullSubDistrictData);
        }
    };

    // Map Interaction: Click Logic
    const handleMapRegionClick = (regionName) => {
        // Logic to determine if we clicked a State, District, or Sub-District
        // If we have no state selected, we probably clicked a state? (Not supported yet per requirements, assume State is selected via dropdown or we are in State View)

        // Case 1: In State View (District List Empty) -> Clicked State? 
        if (!formData.state) {
            // If we had logic to map RegionName -> State Code, we would trigger handleStateChange
            // For now, prompt implies: "Click... Trigger correct drill-down".
            // We'll try to find if valid state.
            const states = ["Punjab", "Haryana", "Uttar Pradesh"]; // Hardcoded for simplified check
            const matchedState = states.find(s => s.toLowerCase() === regionName.toLowerCase());
            if (matchedState) {
                // Mark that this state change is coming from a map click
                handleStateChange({ target: { value: matchedState }, isFromClick: true });
            }
            return;
        }

        // Case 2: In District View (SubDistrict List Empty) -> Clicked District
        if (formData.state && (!subDistrictsList || subDistrictsList.length === 0)) {
            if (districtsList.includes(regionName)) {
                handleDistrictChange({ target: { value: regionName }, isFromClick: true });
            }
            return;
        }

        // Case 3: In Sub-District View -> Clicked Sub-District
        if (formData.district && subDistrictsList.length > 0) {
            if (subDistrictsList.includes(regionName)) {
                handleSubDistrictChange({ target: { value: regionName }, isFromClick: true });
            }
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Prepare payload
        const payload = {
            farmer_name: formData.name || "Unknown Farmer",
            field_id: formData.fieldId || "F-001",
            state: formData.state || "Unknown",
            district: formData.district || "Unknown",
            sub_district: formData.subDistrict || "Unknown",
            nitrogen: parseFloat(formData.n) || 0.0,
            phosphorus: parseFloat(formData.p) || 0.0,
            potassium: parseFloat(formData.k) || 0.0,
            ph: parseFloat(formData.ph) || 7.0,
            moisture: parseFloat(formData.moisture) || 0.0,
            organic_carbon: parseFloat(formData.organic_carbon) || 0.0,
            temperature: parseFloat(formData.temperature) || 0.0,
            coordinates: markerPos ? [markerPos.lat, markerPos.lng] : null
        };

        try {
            // Mock API call or real endpoint
            console.log("Submitting payload:", payload);

            // POST to Backend Analysis API
            const res = await fetch(baseUrl + '/analyze/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Analysis failed");

            const data = await res.json();

            // Redirect to Advanced Analysis Page
            // Pass the district so it can be pre-selected
            navigate('/germination-suitability', { state: { district: formData.district || "AMRITSAR" } });

        } catch (err) {
            console.error("API Error:", err);
            setError("Unable to analyze soil data. Please check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 font-sans overflow-hidden">
            {/* Header */}
            <header className="py-3 bg-white shadow-sm border-b border-gray-200 z-20">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                            Field Details
                        </h1>
                    </div>
                    <div className="text-sm text-gray-600">
                        Welcome, Farmer
                    </div>
                </div>
            </header>

            {/* Split Layout */}
            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">

                {/* LEFT: Map Section (60%) */}
                <div className="w-full lg:w-[60%] h-[40vh] lg:h-full relative bg-gray-200 order-1 lg:order-1">
                    <FarmerMap
                        boundaryGeoJSON={boundaryGeoJSON}
                        onLocationSelect={setMarkerPos}
                        onRegionSelect={handleMapRegionClick}
                    />
                </div>

                {/* RIGHT: Form Section (40%) */}
                <div className="w-full lg:w-[40%] h-full overflow-y-auto bg-white shadow-xl z-10 order-2 lg:order-2 flex flex-col">
                    <div className="flex-grow p-6 md:p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Field & Soil Details</h2>
                            <p className="text-gray-500 text-sm mt-1">
                                Enter your field data or select locations on the map.
                            </p>
                            {error && (
                                <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
                                    {error}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Section A: Field Information */}
                            <div>
                                <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide border-b border-green-100 pb-2 mb-4">
                                    A. Field Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleStateChange}
                                            required
                                        >
                                            <option value="">Select State</option>
                                            {[
                                                "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
                                                "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
                                                "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
                                                "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
                                                "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
                                                "Uttar Pradesh", "Uttarakhand", "West Bengal",
                                                "Andaman and Nicobar Islands", "Chandigarh",
                                                "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
                                                "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
                                            ].sort().map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
                                            name="district"
                                            value={formData.district}
                                            onChange={handleDistrictChange}
                                            disabled={!formData.state}
                                            required
                                        >
                                            <option value="">Select District</option>
                                            {districtsList.map(dist => (
                                                <option key={dist} value={dist}>{dist}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sub-District / Tehsil</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
                                            name="subDistrict"
                                            value={selectedSubDistrict}
                                            onChange={handleSubDistrictChange}
                                            disabled={!formData.district}
                                        >
                                            <option value="">Select Sub-District</option>
                                            {subDistrictsList.map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section B: Soil Parameters */}
                            <div>
                                <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide border-b border-green-100 pb-2 mb-4">
                                    B. Soil Parameters
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nitrogen (N)</label>
                                        <input
                                            type="number"
                                            name="n"
                                            value={formData.n}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                                            placeholder="mg/kg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phosphorus (P)</label>
                                        <input
                                            type="number"
                                            name="p"
                                            value={formData.p}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                                            placeholder="mg/kg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Potassium (K)</label>
                                        <input
                                            type="number"
                                            name="k"
                                            value={formData.k}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                                            placeholder="mg/kg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">pH Level</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            name="ph"
                                            value={formData.ph}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                                            placeholder="e.g. 6.5"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Moisture (%)</label>
                                        <input
                                            type="number"
                                            name="moisture"
                                            value={formData.moisture}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                                            placeholder="%"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Organic Carbon (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="organic_carbon"
                                            value={formData.organic_carbon}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                                            placeholder="%"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                                        <input
                                            type="number"
                                            name="temperature"
                                            value={formData.temperature}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                                            placeholder="°C"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="pt-6 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full text-white font-bold py-4 px-6 rounded-lg text-lg shadow-md transition-colors flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-wait' : 'bg-green-800 hover:bg-green-900'
                                        }`}
                                >
                                    {loading ? (
                                        <span>Analyzing soil data...</span>
                                    ) : (
                                        <>
                                            <span>Analyze Soil Suitability Score</span>
                                        </>
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>

                    {/* Footer inside Scrollable Area */}
                    <div className="bg-gray-50 border-t border-gray-200 py-4 px-6 text-center">
                        <p className="text-xs text-gray-400">
                            © 2024 BhoomiSanket. Government of India.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FarmerInputForm;

