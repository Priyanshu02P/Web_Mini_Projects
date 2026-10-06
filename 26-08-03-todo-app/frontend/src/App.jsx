import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PageLoader from './components/PageLoader';
import lazyWithMinDelay from './utils/lazyWithMinDelay';

// Route-level code splitting. Fallback is shown for at least 300ms (no flicker).
const MIN_LOADING_DELAY = 300;
const LoginPage = lazyWithMinDelay(() => import('./pages/LoginPage'), MIN_LOADING_DELAY);
const DashboardPage = lazyWithMinDelay(() => import('./pages/DashboardPage'), MIN_LOADING_DELAY);

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
