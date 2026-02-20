import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LoginSelector from './pages/auth/LoginSelector';
import UserLogin from './pages/auth/UserLogin';
import UserSignup from './pages/auth/UserSignup';
import OfficerLogin from './pages/auth/OfficerLogin';
import AdminLogin from './pages/auth/AdminLogin';
import FarmerInputForm from './pages/farmer/FarmerInputForm';
import AnalysisPage from './pages/analysis/AnalysisPage';
import Dashboard from './pages/dashboard/Dashboard';
import AdvancedAnalysis from './pages/analysis/AdvancedAnalysis';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginSelector />} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/signup" element={<UserSignup />} />
        <Route path="/officer/login" element={<OfficerLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/farmer/form" element={<FarmerInputForm />} />
        <Route path="/analysis/:analysisId" element={<AnalysisPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/advanced-analysis" element={<AdvancedAnalysis />} />
      </Routes>
    </div>
  );
}

export default App;
