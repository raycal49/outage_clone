import MyMap from './Map.tsx'
import 'mapbox-gl/dist/mapbox-gl.css'
import './App.css'
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router';
import Dashboard from './Dashboard.tsx';

function App() {
    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={< MyMap /> } />
                <Route path="/dashboard" element={<Dashboard /> } />
            </Routes>

            <nav className="map-links mapboxgl-ctrl mapboxgl-ctrl-group">
                <NavLink to="/dashboard">Dashboard View</NavLink>
                <NavLink to="/">Map View</NavLink>
            </nav>
        </BrowserRouter>
    );
}

export default App;