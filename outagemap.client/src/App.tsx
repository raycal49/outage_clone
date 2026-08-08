import MyMap from './Map.tsx'
import 'mapbox-gl/dist/mapbox-gl.css'
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router';

function App() {
    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={< MyMap /> } />
            </Routes>

        </BrowserRouter>
    );
}

export default App;
