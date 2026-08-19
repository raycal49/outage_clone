import OutageMap from './map/OutageMap'
import 'mapbox-gl/dist/mapbox-gl.css'
import { BrowserRouter, Routes, Route } from 'react-router';

function App() {
    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={<OutageMap />} />
            </Routes>

        </BrowserRouter>
    );
}

export default App;
