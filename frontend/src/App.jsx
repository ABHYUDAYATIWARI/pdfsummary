import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PdfView from './pages/PdfView';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; // <-- Import ProtectedRoute

const App = () => {
    return (
        <Router>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/pdf/:id" element={<PdfView />} />
                    </Route>
                </Route>
            </Routes>
        </Router>
    );
};

export default App;