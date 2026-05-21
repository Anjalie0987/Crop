import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';

const baseUrl = process.env.REACT_APP_API_BASE_URL;

const FarmerRegistration = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        full_name: '',
        mobile_number: '',
        gender: '',
        dob: '',
        state: '',
        district: '',
        village: '',
        plot_number: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Real-time validation for mobile
        if (name === 'mobile_number') {
            if (value && !/^\d{0,10}$/.test(value)) {
                setErrors({ ...errors, mobile_number: 'Mobile number must be 10 digits' });
            } else {
                const newErrors = { ...errors };
                delete newErrors.mobile_number;
                setErrors(newErrors);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Final validation
        if (formData.mobile_number.length !== 10) {
            setErrors({ ...errors, mobile_number: 'Please enter exactly 10 digits' });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(baseUrl + '/farmers/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowSuccess(true);
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                const data = await response.json();
                setErrors({ server: data.detail || 'Registration failed' });
            }
        } catch (err) {
            setErrors({ server: 'Connection error. Please try again later.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-green-50 font-sans">
            <Header />

            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-green-100">
                    <div className="md:flex">
                        {/* Summary/Sidebar Section */}
                        <div className="md:w-1/3 bg-brand-dark p-8 text-white flex flex-col justify-between">
                            <div>
                                <h2 className="text-3xl font-bold mb-4 font-serif">Farmer Registration</h2>
                                <p className="text-green-100 opacity-90 leading-relaxed">
                                    Register to receive your digital soil health card and personalized crop recommendations.
                                </p>
                            </div>
                            <div className="mt-8">
                                <div className="flex items-center space-x-3 text-sm text-green-200">
                                    <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white">✓</div>
                                    <span>Soil Intelligence</span>
                                </div>
                                <div className="flex items-center space-x-3 text-sm text-green-200 mt-4">
                                    <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white">✓</div>
                                    <span>Crop Suitability</span>
                                </div>
                                <div className="flex items-center space-x-3 text-sm text-green-200 mt-4">
                                    <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white">✓</div>
                                    <span>Personalized Insights</span>
                                </div>
                            </div>
                        </div>

                        {/* Form Section */}
                        <div className="md:w-2/3 p-8 md:p-12">
                            {showSuccess ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="w-20 h-20 bg-brand-primary rounded-full flex items-center justify-center mb-4 animate-bounce">
                                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800">Registration Successful!</h3>
                                    <p className="text-gray-600">Your digital soil profile is being created. Redirecting to login...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {errors.server && (
                                        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">
                                            {errors.server}
                                        </div>
                                    )}

                                    {/* Section 1: Personal Details */}
                                    <div>
                                        <h3 className="text-lg font-bold text-brand-dark border-b-2 border-brand-primary/20 pb-2 mb-6 flex items-center">
                                            <span className="w-8 h-8 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                                            Personal Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Name of the Farmer *</label>
                                                <input
                                                    type="text"
                                                    name="full_name"
                                                    required
                                                    value={formData.full_name}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter full name"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number *</label>
                                                <input
                                                    type="tel"
                                                    name="mobile_number"
                                                    required
                                                    value={formData.mobile_number}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter 10-digit number"
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all shadow-sm ${errors.mobile_number ? 'border-red-300' : 'border-gray-200'}`}
                                                />
                                                {errors.mobile_number ? (
                                                    <p className="text-red-500 text-xs mt-1">{errors.mobile_number}</p>
                                                ) : (
                                                    <p className="text-gray-400 text-xs mt-1">Essential for receiving updates.</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                                                <select
                                                    name="gender"
                                                    value={formData.gender}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none bg-white shadow-sm"
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    name="dob"
                                                    value={formData.dob}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Location Details */}
                                    <div>
                                        <h3 className="text-lg font-bold text-brand-dark border-b-2 border-brand-primary/20 pb-2 mb-6 flex items-center">
                                            <span className="w-8 h-8 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                                            Location Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
                                                <select
                                                    name="state"
                                                    required
                                                    value={formData.state}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none bg-white shadow-sm"
                                                >
                                                    <option value="">Select State</option>
                                                    <option value="Punjab">Punjab</option>
                                                    <option value="Haryana">Haryana</option>
                                                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">District *</label>
                                                <input
                                                    type="text"
                                                    name="district"
                                                    required
                                                    value={formData.district}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter district"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none shadow-sm"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Village</label>
                                                <input
                                                    type="text"
                                                    name="village"
                                                    value={formData.village}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter village name"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Land Details */}
                                    <div>
                                        <h3 className="text-lg font-bold text-brand-dark border-b-2 border-brand-primary/20 pb-2 mb-6 flex items-center">
                                            <span className="w-8 h-8 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                                            Land Details
                                        </h3>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Survey / Khasra / Plot Number</label>
                                            <input
                                                type="text"
                                                name="plot_number"
                                                value={formData.plot_number}
                                                onChange={handleInputChange}
                                                placeholder="Enter land identification number"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none shadow-sm"
                                            />
                                            <p className="text-gray-400 text-xs mt-1">Helps in mapping your soil data accurately.</p>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full py-4 px-6 rounded-xl text-lg font-bold text-white shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-dark'}`}
                                    >
                                        {loading ? 'Processing...' : 'Register & Continue'}
                                    </button>

                                    <div className="text-center mt-6">
                                        <p className="text-sm text-gray-500">
                                            Already registered?{' '}
                                            <Link to="/login" className="text-brand-primary font-bold hover:underline">
                                                Login here
                                            </Link>
                                        </p>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-6 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} BhoomiSanket. Government of India.
            </footer>
        </div>
    );
};

export default FarmerRegistration;
