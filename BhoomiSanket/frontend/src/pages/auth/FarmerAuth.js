import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';

const baseUrl = process.env.REACT_APP_API_BASE_URL;

const FarmerAuth = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine initial mode from path
    const [isLogin, setIsLogin] = useState(location.pathname === '/login' || location.pathname === '/user/login');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errors, setErrors] = useState({});

    // Dynamic Location State
    const [locationData, setLocationData] = useState({ states: [], districts: {} });
    const [availableDistricts, setAvailableDistricts] = useState([]);

    const [formData, setFormData] = useState({
        full_name: '',
        mobile_number: '',
        password: '',
        gender: '',
        dob: '',
        state: '',
        district: '',
        village: '',
        plot_number: ''
    });

    // Fetch dynamic locations
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await fetch(baseUrl + '/farm-analysis/locations');
                if (response.ok) {
                    const data = await response.json();
                    setLocationData(data);
                }
            } catch (err) {
                console.error("Failed to fetch locations:", err);
            }
        };
        fetchLocations();
    }, []);

    // Update isLogin when URL changes
    useEffect(() => {
        setIsLogin(location.pathname === '/login' || location.pathname === '/user/login');
    }, [location.pathname]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Update form data and handle cascading logic
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'state') {
                setAvailableDistricts(locationData.districts[value] || []);
                newData.district = ''; // Reset district when state changes
            }
            return newData;
        });

        // Real-time validation for mobile
        if (name === 'mobile_number') {
            if (value && !/^\d{0,10}$/.test(value)) {
                setErrors(prev => ({ ...prev, mobile_number: 'Mobile number must be 10 digits' }));
            } else {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.mobile_number;
                    return newErrors;
                });
            }
        }
    };

    const toggleMode = () => {
        setErrors({});
        setIsLogin(!isLogin);
        // Update URL without full reload if possible, or just let state handle it
        navigate(isLogin ? '/signup' : '/login');
    };

    const handleDummyLogin = () => {
        const dummyUser = {
            id: 0,
            full_name: "Test Farmer",
            mobile_number: "9999999999"
        };
        localStorage.setItem('farmer', JSON.stringify(dummyUser));
        navigate('/map-landing');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!/^\d{10}$/.test(formData.mobile_number)) {
            setErrors({ ...errors, mobile_number: 'Please enter a valid 10-digit number' });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const endpoint = isLogin ? '/farmers/login' : '/farmers/register';
            const payload = isLogin ? {
                mobile_number: formData.mobile_number,
                password: formData.password
            } : formData;

            console.log(`Submitting to ${endpoint}:`, payload);

            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log("Server response:", data);

            if (response.ok) {
                if (isLogin) {
                    // Success Login
                    localStorage.setItem('farmer', JSON.stringify(data.farmer));
                    navigate('/map-landing');
                } else {
                    // Success Registration
                    setShowSuccess(true);
                    setTimeout(() => {
                        setShowSuccess(false);
                        setIsLogin(true);
                        navigate('/login');
                    }, 2000);
                }
            } else {
                // Handle complex detail objects (FastAPI validation errors)
                let errorMsg = 'Authentication failed';
                if (data.detail) {
                    if (Array.isArray(data.detail)) {
                        errorMsg = data.detail.map(err => `${err.loc[err.loc.length - 1]}: ${err.msg}`).join(', ');
                    } else {
                        errorMsg = data.detail;
                    }
                }
                setErrors({ server: errorMsg });
            }
        } catch (err) {
            console.error("Auth error:", err);
            setErrors({ server: 'Connection error. Please try again later.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-green-50 font-sans transition-all duration-500">
            <Header />

            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className={`w-full transition-all duration-500 transform ${isLogin ? 'max-w-md' : 'max-w-4xl'}`}>
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-green-100">
                        <div className={`${isLogin ? 'flex flex-col' : 'md:flex'}`}>

                            {/* Summary Section (Only show on Register) */}
                            {!isLogin && (
                                <div className="md:w-1/3 bg-brand-dark p-8 text-white flex flex-col justify-between transition-opacity duration-500">
                                    <div>
                                        <h2 className="text-3xl font-bold mb-4 font-serif">Farmer Registration</h2>
                                        <p className="text-green-100 opacity-90 leading-relaxed">
                                            Register to receive your digital soil health card and personalized crop recommendations.
                                        </p>
                                    </div>
                                    <div className="mt-8 space-y-4">
                                        {[
                                            'Soil Intelligence',
                                            'Crop Suitability',
                                            'Personalized Insights'
                                        ].map((text, idx) => (
                                            <div key={idx} className="flex items-center space-x-3 text-sm text-green-200">
                                                <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs">✓</div>
                                                <span>{text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Form Section */}
                            <div className={`${isLogin ? 'w-full' : 'md:w-2/3'} p-8 md:p-12 transition-all duration-500`}>
                                {showSuccess ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                                        <div className="w-20 h-20 bg-brand-primary rounded-full flex items-center justify-center mb-4 animate-bounce">
                                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-800">Registration Successful!</h3>
                                        <p className="text-gray-600">Please login to continue.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="text-center mb-8">
                                            <h2 className="text-3xl font-bold text-brand-dark font-serif">
                                                {isLogin ? 'Farmer Login' : 'Create Account'}
                                            </h2>
                                            <p className="text-gray-500 mt-2">
                                                {isLogin ? 'Access your soil analysis dashboard' : 'Create an account to continue'}
                                            </p>
                                        </div>

                                        {errors.server && (
                                            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm animate-pulse">
                                                {errors.server}
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {isLogin ? (
                                                /* Login Mode Fields */
                                                <div className="space-y-4 animate-fadeIn">
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number *</label>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-3.5 text-gray-400">+91</span>
                                                            <input
                                                                type="tel"
                                                                name="mobile_number"
                                                                required
                                                                value={formData.mobile_number}
                                                                onChange={handleInputChange}
                                                                placeholder="Enter your registered mobile number"
                                                                className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm ${errors.mobile_number ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:bg-white'}`}
                                                            />
                                                        </div>
                                                        {errors.mobile_number && <p className="text-red-500 text-xs mt-1">{errors.mobile_number}</p>}
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                                                        <div className="relative">
                                                            <input
                                                                type={showPassword ? "text" : "password"}
                                                                name="password"
                                                                required
                                                                value={formData.password}
                                                                onChange={handleInputChange}
                                                                placeholder="Enter your password"
                                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm pr-12"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute right-4 top-3.5 text-gray-400 hover:text-brand-primary transition-colors"
                                                            >
                                                                {showPassword ? (
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                                                ) : (
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Registration Mode Sections */
                                                <div className="space-y-6 animate-fadeIn">
                                                    {/* Section 1: Personal Details */}
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Section 1: Personal Details</h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Name of the Farmer *</label>
                                                                <input
                                                                    type="text"
                                                                    name="full_name"
                                                                    required
                                                                    value={formData.full_name}
                                                                    onChange={handleInputChange}
                                                                    placeholder="Enter full name"
                                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number *</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-4 top-3.5 text-gray-400">+91</span>
                                                                    <input
                                                                        type="tel"
                                                                        name="mobile_number"
                                                                        required
                                                                        value={formData.mobile_number}
                                                                        onChange={handleInputChange}
                                                                        placeholder="Enter 10-digit mobile number"
                                                                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm ${errors.mobile_number ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:bg-white'}`}
                                                                    />
                                                                </div>
                                                                <p className="text-gray-400 text-[10px] mt-1 italic">Essential for receiving updates and digital soil health card.</p>
                                                                {errors.mobile_number && <p className="text-red-500 text-xs mt-1">{errors.mobile_number}</p>}
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                                                                <div className="relative">
                                                                    <input
                                                                        type={showPassword ? "text" : "password"}
                                                                        name="password"
                                                                        required
                                                                        value={formData.password}
                                                                        onChange={handleInputChange}
                                                                        placeholder="Set your password"
                                                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm pr-12"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowPassword(!showPassword)}
                                                                        className="absolute right-4 top-3.5 text-gray-400 hover:text-brand-primary transition-colors"
                                                                    >
                                                                        {showPassword ? (
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                                                        ) : (
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Gender</label>
                                                                <select
                                                                    name="gender"
                                                                    value={formData.gender}
                                                                    onChange={handleInputChange}
                                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white shadow-sm"
                                                                >
                                                                    <option value="">Select Gender</option>
                                                                    <option value="Male">Male</option>
                                                                    <option value="Female">Female</option>
                                                                    <option value="Other">Other</option>
                                                                </select>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth (DOB)</label>
                                                                <input
                                                                    type="date"
                                                                    name="dob"
                                                                    value={formData.dob}
                                                                    onChange={handleInputChange}
                                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none shadow-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Section 2: Location Details */}
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center">
                                                            🌍 Section 2: Location Details
                                                        </h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-semibold text-gray-700 mb-1">State Name *</label>
                                                                <select
                                                                    name="state"
                                                                    required
                                                                    value={formData.state}
                                                                    onChange={handleInputChange}
                                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white shadow-sm"
                                                                >
                                                                    <option value="">Select State</option>
                                                                    {locationData.states.map(s => (
                                                                        <option key={s} value={s}>{s}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-semibold text-gray-700 mb-1">District Name *</label>
                                                                <select
                                                                    name="district"
                                                                    required
                                                                    disabled={!formData.state}
                                                                    value={formData.district}
                                                                    onChange={handleInputChange}
                                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white shadow-sm ${!formData.state ? 'bg-gray-50 cursor-not-allowed opacity-50' : ''}`}
                                                                >
                                                                    <option value="">Select District</option>
                                                                    {availableDistricts.map(d => (
                                                                        <option key={d} value={d}>{d}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Village</label>
                                                                <input
                                                                    type="text"
                                                                    name="village"
                                                                    value={formData.village}
                                                                    onChange={handleInputChange}
                                                                    placeholder="Enter village name"
                                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none shadow-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Section 3: Land Details */}
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center">
                                                            🌾 Section 3: Land Details
                                                        </h3>
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Survey / Khasra / Plot Number</label>
                                                            <input
                                                                type="text"
                                                                name="plot_number"
                                                                value={formData.plot_number}
                                                                onChange={handleInputChange}
                                                                placeholder="Enter land identification number"
                                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none shadow-sm"
                                                            />
                                                            <p className="text-gray-400 text-[10px] mt-1 italic">This helps in mapping your soil data accurately.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {isLogin && (
                                            <div className="flex items-center justify-between text-sm">
                                                <label className="flex items-center text-gray-600">
                                                    <input type="checkbox" className="mr-2 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                                                    Remember me
                                                </label>
                                                <button type="button" className="text-brand-primary font-bold hover:underline">Forgot Password?</button>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`w-full py-4 px-6 rounded-xl text-lg font-bold text-white shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-dark'}`}
                                        >
                                            {loading ? (
                                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                isLogin ? 'Login & Continue' : 'Register & Continue'
                                            )}
                                        </button>

                                        {isLogin && (
                                            <button
                                                type="button"
                                                onClick={handleDummyLogin}
                                                className="w-full py-3 px-6 mt-4 rounded-xl text-sm font-bold text-brand-dark border-2 border-brand-accent/30 hover:bg-brand-accent/10 transition-all flex items-center justify-center space-x-2"
                                            >
                                                <span>🚀 Bypass (Test Flow)</span>
                                            </button>
                                        )}

                                        <div className="text-center mt-6">
                                            <p className="text-base text-gray-600">
                                                {isLogin ? "New Farmer? " : "Already registered? "}
                                                <button
                                                    type="button"
                                                    onClick={toggleMode}
                                                    className="text-brand-primary font-bold hover:underline ml-1"
                                                >
                                                    {isLogin ? 'Register Here' : 'Login Here'}
                                                </button>
                                            </p>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-8 text-center bg-white/50 border-t border-green-100">
                <div className="flex justify-center space-x-6 mb-4">
                    <span className="text-gray-400 text-sm">Help</span>
                    <span className="text-gray-400 text-sm">Privacy Policy</span>
                    <span className="text-gray-400 text-sm">Terms of Service</span>
                </div>
                <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} BhoomiSanket. Government of India.</p>
            </footer>
        </div>
    );
};

export default FarmerAuth;
