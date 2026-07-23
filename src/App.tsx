import { Routes, Route } from 'react-router'
import Home from './routes/Home.tsx'
import Admin from './routes/Admin.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}

export default App
