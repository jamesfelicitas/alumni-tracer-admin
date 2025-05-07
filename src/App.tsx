import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Home from './Home';

export default function App() {
  return (
    <Router basename="/beacon-test">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home/*" element={<Home/>} />
      </Routes>
    </Router>
  );
}
