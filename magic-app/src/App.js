import React from 'react';
import { Route, Routes, Link } from 'react-router-dom'; // Import Link here
import Play from './components/Play';
import ManageDecks from './components/ManageDecks';
import { DeckProvider } from './components/DeckContext';
import './App.css';
import PlaymatMirror from './components/PlaymatMirror';

function App() {
  return (
    <DeckProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/play" element={<Play />} />
          <Route path="/manage-decks" element={<ManageDecks />} />
          <Route path="/mirror" element={<PlaymatMirror />} /> {/* Mirror route */}
        </Routes>
      </div>
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
      </div>
    </div>
  );
}

export default App;
