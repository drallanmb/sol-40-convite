import { Routes, Route } from 'react-router'
import Home from './routes/Home.tsx'
import Admin from './routes/Admin.tsx'
import NotFound from './routes/NotFound.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
