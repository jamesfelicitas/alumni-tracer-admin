import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Home from './Home';

export default function App() {
  return (
    <Router basename="/vite-material-ui">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home/*" element={<Home/>} />
      </Routes>
    </Router>
  );
}
