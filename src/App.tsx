import { Route, Routes } from "react-router-dom";
import MainShell from "./views/MainShell";
import FloatingView from "./views/FloatingView";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainShell />} />
      <Route path="/floating" element={<FloatingView />} />
    </Routes>
  );
}
