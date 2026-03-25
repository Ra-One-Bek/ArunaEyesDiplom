import { Route, Routes } from "react-router-dom"
import { Esp32Provider } from "./features/esp32/Esp32Context"

import HeroSection from "./pages/HeroPage"
import NavigatePage from "./pages/NavigatePage"
import AiAssistantPage from "./pages/AiAssistantPage"
import StatusGlasses from "./pages/StatusGlasses"
import ConnectToGlasses from "./pages/ConnectToGlasses"

function App() {

  return (
    <>
      <Esp32Provider>
        <Routes>
          <Route path="/" element={<HeroSection />} />
          <Route path="/nav" element={<NavigatePage />} />
          <Route path="/assistant" element={<AiAssistantPage />} />
          <Route path="/status" element={<StatusGlasses />} />
          <Route path="/connect-glasses" element={<ConnectToGlasses />} />
        </Routes>
      </Esp32Provider>
    </>
  )
}

export default App
