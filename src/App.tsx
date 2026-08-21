import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Dashboard from './components/Dashboard';
import SuggestionsPage from './components/SuggestionsPage';
import AdminLogin from './components/AdminLogin';
import AdminPage from './components/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sugestoes" element={<SuggestionsPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* Any mistyped/unknown /admin/... path — send it back to /admin
            instead of silently falling through to the public Dashboard,
            which gave no indication the intended admin route didn't exist. */}
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        {/* Dashboard owns /, /moldes, /biblioteca, /calculadoras (and treats
            anything else as the overview) as one persistent mount, so
            switching between them never re-renders the mold generator from
            scratch and loses in-progress work. */}
        <Route path="/*" element={<Dashboard />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}
