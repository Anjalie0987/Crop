import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LoginSelector from './pages/auth/LoginSelector';
import UserLogin from './pages/auth/UserLogin';
import UserSignup from './pages/auth/UserSignup';
import FarmerRegistration from './pages/auth/FarmerRegistration'; // Can be removed later
import FarmerAuth from './pages/auth/FarmerAuth';
import OfficerLogin from './pages/auth/OfficerLogin';
import AdminLogin from './pages/auth/AdminLogin';
import FarmerInputForm from './pages/farmer/FarmerInputForm';
import AnalysisPage from './pages/analysis/AnalysisPage';
import Dashboard from './pages/dashboard/Dashboard';
import GerminationSuitability from './pages/analysis/GerminationSuitability';
import ExperimentalAnalysis from './pages/analysis/ExperimentalAnalysis';
import MapLanding from './pages/MapLanding';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login-selection" element={<LoginSelector />} />
        <Route path="/login" element={<FarmerAuth />} />
        <Route path="/map-landing" element={<MapLanding />} />

        <Route path="/user/login" element={<FarmerAuth />} />
        <Route path="/signup" element={<FarmerAuth />} />
        <Route path="/officer/login" element={<OfficerLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/farmer/form" element={<FarmerInputForm />} />
        <Route path="/analysis/:analysisId" element={<AnalysisPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/germination-suitability" element={<GerminationSuitability />} />
        <Route path="/experimental-analysis" element={<ExperimentalAnalysis />} />
      </Routes>
    </div>
  );
}

export default App;
