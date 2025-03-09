// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Listings from './pages/Listing';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* For now, we just display the Listings page */}
        <Route path="/" element={<Listings />} />
      </Routes>
    </Router>
  );
};

export default App;
