// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Play from './components/Play';
import ManageDecks from './components/ManageDecks';
import { DeckProvider } from './components/DeckContext'; // Import DeckProvider for global state
import './App.css'; // Optional: create a CSS file for styling

function App() {
  return (
    <DeckProvider> {/* Wrap the app in DeckProvider to provide global deck state */}
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/play" element={<Play />} />
            <Route path="/manage-decks" element={<ManageDecks />} />
          </Routes>
        </div>
      </Router>
    </DeckProvider>
  );
}

function MainMenu() {
  return (
    <div className="menu">
      <h1>Magic: The Gathering</h1>
      <div className="menu-buttons">
        <Link to="/play">
          <button className="menu-button">Play</button>
        </Link>
        <Link to="/manage-decks">
          <button className="menu-button">Manage Decks</button>
        </Link>
        <button className="menu-button" onClick={() => window.close()}>Exit</button>
      </div>
    </div>
  );
}

export default App;
