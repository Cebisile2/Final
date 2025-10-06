import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router";
import MainLayout from "./LAYOUT/Layout";
import Overview from "./PAGES/OVERVIEW/Overview";
import Settings from "./PAGES/SETTINGS/Settings";
import ManageTeam from "./PAGES/TEAM/ManageTeam";
import TrainingPage from "./PAGES/TRAINING/TrainingPage";
import AllPlayersPage from "./PAGES/PLAYERS/AllPlayersPage";
import SignInPage from "./PAGES/AUTH/SignIn";
import SignUpPage from "./PAGES/AUTH/SignUp";
import { AuthProvider } from "./PROVIDERS/AuthProvider";
import ClubPage from "./PAGES/SETTINGS/ClubPage";
import FormationPage from "./PAGES/TEAM/FormationPage";
import SimulationPage from "./PAGES/SIMULATION/FunctionalFootballSim";
import ForgotPassPage from "./PAGES/AUTH/ForgotPass";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <StrictMode>
      <AuthProvider>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/forgotpass" element={<ForgotPassPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/club" element={<ClubPage />} />
            <Route path="/team" element={<ManageTeam />} />
            <Route path="/formations" element={<FormationPage />} />
            <Route path="/simulations" element={<SimulationPage />} />
            <Route path="/players" element={<AllPlayersPage />} />
            <Route path="/training" element={<TrainingPage />} />
          </Route>
          <Route path="*" element={<h1>not found</h1>} />
        </Routes>
      </AuthProvider>
    </StrictMode>
  </BrowserRouter>
);
