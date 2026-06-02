import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";

import { Esp32Provider } from "./features/esp32/Esp32Context";
import SplashScreen from "./pages/SplashScreen";

import HeroSection from "./pages/HeroPage";
import NavigatePage from "./pages/NavigatePage";
import AiAssistantPage from "./pages/AiAssistantPage";
import StatusGlasses from "./pages/StatusGlasses";
import ConnectToGlasses from "./pages/ConnectToGlasses";

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Esp32Provider>
      {loading ? (
        <SplashScreen />
      ) : (
        <Routes>
          <Route path="/" element={<HeroSection />} />
          <Route path="/nav" element={<NavigatePage />} />
          <Route path="/assistant" element={<AiAssistantPage />} />
          <Route path="/status" element={<StatusGlasses />} />
          <Route path="/connect-glasses" element={<ConnectToGlasses />} />
        </Routes>
      )}
    </Esp32Provider>
  );
}

export default App;