import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import AdminRouteBoundary from './components/admin/AdminRouteBoundary.tsx'
import Home from './routes/Home.tsx'

const Confirmar = lazy(() => import('./routes/Confirmar.tsx'))
const Presentes = lazy(() => import('./routes/Presentes.tsx'))
const Admin = lazy(() => import('./routes/Admin.tsx'))
const NotFound = lazy(() => import('./routes/NotFound.tsx'))

function App() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="grid min-h-screen place-content-center justify-items-center gap-5 bg-cream px-6 text-center text-plum"
        >
          <img
            src="/sol-symbol.png"
            alt=""
            width={58}
            height={50}
            className="h-[50px] w-[58px] object-contain"
          />
          <p className="font-serif text-subheading leading-subheading">
            Abrindo o convite…
          </p>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/confirmar" element={<Confirmar />} />
        <Route path="/presentes" element={<Presentes />} />
        <Route
          path="/admin/*"
          element={
            <AdminRouteBoundary>
              <Admin />
            </AdminRouteBoundary>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
