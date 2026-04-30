import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProjectList from './components/ProjectList';
import CreateProject from './components/CreateProject';
import ProjectPlan from './components/ProjectPlan';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import ThemeToggle from './components/ThemeToggle';
import SettingsModal from './components/SettingsModal';
import { useConvexAuth } from "convex/react";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  console.log("[DEBUG] App RequireAuth - isLoading:", isLoading, "isAuthenticated:", isAuthenticated);
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">Cargando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RedirectIfAuth = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  console.log("[DEBUG] App RedirectIfAuth - isLoading:", isLoading, "isAuthenticated:", isAuthenticated);
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-background text-textMain font-sans selection:bg-accent selection:text-white">
        <ThemeToggle />
        <SettingsModal />
        <Routes>
          <Route path="/" element={<RedirectIfAuth><LandingPage /></RedirectIfAuth>} />
          <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
          
          <Route path="/dashboard" element={<RequireAuth><ProjectList /></RequireAuth>} />
          <Route path="/create" element={<RequireAuth><CreateProject /></RequireAuth>} />
          <Route path="/project/:id" element={<RequireAuth><ProjectPlan /></RequireAuth>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;