// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout';
import UsuarioLayout from './usuario/UsuarioLayout';
import Home from './Pages/Home';
import AdminInvestidor from './Pages/AdminInvestidor';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin/*" element={<AdminLayout />} />
        <Route path="/usuario/*" element={<UsuarioLayout />} />
        <Route path="/home" element={<Home />} />
        <Route path="/admin/admin-investidor" element={<AdminInvestidor />} />
      </Routes>
    </Router>
  );
}
