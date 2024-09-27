import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate from React Router
import * as XLSX from 'xlsx';
import './ManageDecks.css';
import { DeckContext } from './DeckContext'; // Import the deck context

const BASE_URL = 'https://gatherer.wizards.com'; // Base URL for card images

function ManageDecks() {
  const [deckName, setDeckName] = useState('');
  const [selectedDeck, setSelectedDeck] = useState('');
  const [cards, setCards] = useState([]); // Cards added to the current deck
  const [previewCard, setPreviewCard] = useState(null); // Placeholder for the selected card
  const [commander, setCommander] = useState(null); // Track the commander card
  const [searchResults, setSearchResults] = useState([]); // Cards found by search
  const [allCards, setAllCards] = useState([]); // All available cards from the Excel file

  const { savedDecks, addDeck, updateDeck } = useContext(DeckContext); // Use global context for saved decks
  const searchContainerRef = useRef(null); // Reference to the search result container
  const navigate = useNavigate(); // Hook to navigate between routes

  // Function to load the Excel file and parse the data
  useEffect(() => {
    const fetchCardsData = async () => {
      const response = await fetch('/MTGdatabase.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets['Sheet1'];
      const data = XLSX.utils.sheet_to_json(sheet);
      setAllCards(data); // Store all cards for searching
    };

    fetchCardsData();
  }, []);

  // Function to handle searching for cards
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    const filteredCards = allCards.filter(card =>
      card['name'] && card['name'].toLowerCase().includes(query)
    );
    setSearchResults(filteredCards); // Update search results dynamically
  };

  // Helper function to get the correct image source
  const getCardImageSrc = (card) => {
    if (card['cardImg-src'] && !card['cardImg-src'].startsWith('http')) {
      let cleanedPath = card['cardImg-src'].replace(/^\.{1,2}\/?/, '');
      return `${BASE_URL}/${cleanedPath}`;
    }
    return card['cardImg-src'];
  };

  // Function to add a card to the deck when clicked
  const addCardToDeck = (card) => {
    setCards([...cards, card]); // Add the selected card to the deck
    setSearchResults([]); // Clear search results after adding
  };

  // Save the current deck to the context and localStorage, including the commander
  const saveDeck = () => {
    if (!deckName) {
      alert('Please enter a name for the deck.');
      return;
    }

    const newDeck = { name: deckName, cards, commander };

    // Check if it's an existing deck and update, or a new deck
    if (savedDecks[deckName]) {
      updateDeck(deckName, newDeck); // Update existing deck in context
    } else {
      addDeck(newDeck); // Add new deck to context
    }

    alert(`Deck "${deckName}" has been saved!`);
  };

  // Load a saved deck when selected from the dropdown, including the commander
  const loadDeck = (deckName) => {
    if (deckName && savedDecks[deckName]) {
      setCards(savedDecks[deckName].cards);
      setCommander(savedDecks[deckName].commander || null);
      setDeckName(deckName);
      setSelectedDeck(deckName);
    }
  };

  // Create a new deck: clears the deck name, cards, and commander
  const createNewDeck = () => {
    setDeckName(''); // Clear the deck name input
    setCards([]); // Clear the card list
    setCommander(null); // Clear the commander
    setSelectedDeck(''); // Reset the selected deck
  };

  // Click handler for detecting clicks outside the search bar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchResults([]); // Clear search results if clicked outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchContainerRef]);

  return (
    <div className="manage-decks-container">
      {/* Left side: Card Preview */}
      <div className="card-preview">
        <h3>Card Preview</h3>
        {previewCard ? (
          <div>
            <img
              src={getCardImageSrc(previewCard)} // Get the correct image source
              alt={previewCard.name}
              className="preview-image"
            />
            <p>{previewCard.name}</p>
          </div>
        ) : (
          <p>No card selected</p>
        )}
        <div className="preview-buttons">
          <button onClick={() => navigate('/')}>Back to Menu</button> {/* Navigate to Main Menu */}
          <button onClick={createNewDeck}>Create New Deck</button>
          {previewCard && (
            <button onClick={() => setCommander(previewCard)}>
              Make {previewCard.name} Commander
            </button>
          )}
        </div>
        {commander && (
          <p className="commander-info">
            Commander: <strong>{commander.name}</strong>
          </p>
        )}
      </div>

      {/* Center: Deck Display and Controls */}
      <div className="deck-controls">
        {/* Top part: Deck selection and search */}
        <div className="deck-header">
          <input
            type="text"
            placeholder="Deck Name"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
          />
          <select value={selectedDeck} onChange={(e) => loadDeck(e.target.value)}>
            <option value="">Select Deck</option>
            {Object.keys(savedDecks).map((deck) => (
              <option key={deck} value={deck}>
                {deck}
              </option>
            ))}
          </select>
          <button onClick={saveDeck}>Save</button>
        </div>

        {/* Search bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for a card..."
            onChange={handleSearch}
          />
        </div>

        {/* Search results */}
        <div className="search-results" ref={searchContainerRef}>
          {searchResults.map((card, index) => (
            <div
              key={index}
              className="search-result-item"
              onClick={() => {
                setPreviewCard(card); // Set the clicked card to be the preview card
                addCardToDeck(card);  // Add the card to the deck
              }}
            >
              {card['name']}
            </div>
          ))}
        </div>

        {/* Center: Card grid (for the current deck) */}
        <div className="card-grid">
          {cards.length > 0 ? (
            cards.map((card, index) => (
              <div key={index} className="card-item">
                <img
                  src={getCardImageSrc(card)} // Get the correct image source
                  alt={card.name}
                  onClick={() => setPreviewCard(card)}
                />
              </div>
            ))
          ) : (
            <p>No cards in the deck</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageDecks;
