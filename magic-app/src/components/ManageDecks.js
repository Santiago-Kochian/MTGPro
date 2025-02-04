import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate from React Router
import * as XLSX from 'xlsx';
import './ManageDecks.css';
import { DeckContext } from './DeckContext'; // Import the deck context
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

const BASE_URL = 'https://gatherer.wizards.com'; // Base URL for card images

function ManageDecks() {
  const [deckName, setDeckName] = useState('');
  const [selectedDeck, setSelectedDeck] = useState('');
  const [cards, setCards] = useState([]); // Cards added to the current deck
  const [previewCard, setPreviewCard] = useState(null); // Placeholder for the selected card
  const [commander, setCommander] = useState(null); // Track the commander card
  const [searchResults, setSearchResults] = useState([]); // Cards found by search
  const [allCards, setAllCards] = useState([]); // All available cards from the Excel file
  const [banList, setBanList] = useState([]); // Banned cards list
  
  const { savedDecks, addDeck, updateDeck, deleteDeck } = useContext(DeckContext); // Use global context for saved decks
  const searchContainerRef = useRef(null); // Reference to the search result container
  const navigate = useNavigate(); // Hook to navigate between routes

  // Function to load the Excel file and parse the data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const cardResponse = await fetch(`${process.env.PUBLIC_URL}/MTGDB.xlsx`);
        const banlistResponse = await fetch(`${process.env.PUBLIC_URL}/MTGbanlist.xlsx`);
        
        // Load all cards
        const cardArrayBuffer = await cardResponse.arrayBuffer();
        const cardWorkbook = XLSX.read(cardArrayBuffer, { type: 'array' });
        const cardSheet = cardWorkbook.Sheets['Sheet1'];
        const cardData = XLSX.utils.sheet_to_json(cardSheet);
        setAllCards(cardData); // Store all cards for searching

        // Load the ban list
        const banlistArrayBuffer = await banlistResponse.arrayBuffer();
        const banlistWorkbook = XLSX.read(banlistArrayBuffer, { type: 'array' });
        const banlistSheet = banlistWorkbook.Sheets['Sheet1'];
        const banlistData = XLSX.utils.sheet_to_json(banlistSheet);
        setBanList(banlistData.map(card => card['name'].toLowerCase())); // Store banned card names in lowercase
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    };

    fetchData();
}, []);

  


  const checkIfBanned = (cardName) => {
    return banList.includes(cardName.toLowerCase());
  };

  // Function to handle searching for cards
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    const filteredCards = allCards.filter(card =>
      card['name'] && card['name'].toLowerCase().includes(query)
    );
    setSearchResults(filteredCards); // Update search results dynamically
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0]; // Get the selected file

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target.result;
        const lines = content.split('\n');
        const importedCards = [];
        const failedImports = [];
        const bannedCards = []; // To keep track of banned cards during import

        lines.forEach((line) => {
          const parts = line.split(' ');
          const quantity = parseInt(parts[0], 10);
          const cardName = parts.slice(1).join(' ').trim();

          // Find the card in the allCards data by exact match
          let matchedCard = allCards.find(card => card.name && card.name.toLowerCase() === cardName.toLowerCase());

          // If no exact match, find a card whose name contains the cardName
          if (!matchedCard) {
            matchedCard = allCards.find(card => card.name && card.name.toLowerCase().includes(cardName.toLowerCase()));
          }

          if (matchedCard) {
            for (let i = 0; i < quantity; i++) {
              const cardWithId = { ...matchedCard, id: uuidv4() }; // Assign unique ID to each imported card
              importedCards.push(cardWithId); // Add the card multiple times based on quantity

              // Check if the card is banned
              if (checkIfBanned(matchedCard.name)) {
                bannedCards.push(matchedCard.name); // Track banned card
              }
            }
          } else {
            failedImports.push(cardName); // Track cards that failed to import
          }
        });

        // Update the cards in the deck
        setCards((prevCards) => [...prevCards, ...importedCards]);

        // Notify the user if there were any failed imports
        if (failedImports.length > 0) {
          alert(`Some cards were not recognized and could not be imported: ${failedImports.join(', ')}`);
        }

        // Notify the user about banned cards
        if (bannedCards.length > 0) {
          alert(`Warning: The following imported cards are banned: ${bannedCards.join(', ')}`);
        }
      };

      reader.readAsText(file); // Read the file as text
    }
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
  const addCardToDeck = (card, quantity = 1) => {
    if (checkIfBanned(card.name)) {
      alert(`Warning: "${card.name}" is banned from play and should not be included in your deck.`);
    }

    const newCards = [...cards];
    for (let i = 0; i < quantity; i++) {
      const cardWithId = { ...card, id: uuidv4() }; // Assign a unique identifier to each card
      newCards.push(cardWithId);
    }
    setCards(newCards); // Add the selected card(s) to the deck
  };

  // Function to export the deck to a .txt file
  const handleExportDeck = () => {
    if (cards.length === 0) {
      alert('No cards to export.');
      return;
    }

    const cardCountMap = cards.reduce((acc, card) => {
      acc[card.name] = (acc[card.name] || 0) + 1;
      return acc;
    }, {});

    const exportData = Object.entries(cardCountMap)
      .map(([name, count]) => `${count} ${name}`)
      .join('\n');

    const blob = new Blob([exportData], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${deckName || 'deck'}.txt`;
    link.click();
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
      if (typeof updateDeck === 'function') {
        updateDeck(deckName, newDeck); // Update existing deck in context
      } else {
        console.error("updateDeck is not a function");
      }
    } else {
      addDeck(newDeck); // Add new deck to context
    }

    alert(`Deck "${deckName}" has been saved!`);
  };

  // Delete the selected deck
  const handleDeleteDeck = () => {
    if (selectedDeck && savedDecks[selectedDeck]) {
      const confirmDelete = window.confirm(`Are you sure you want to delete the deck "${selectedDeck}"?`);
      if (confirmDelete) {
        deleteDeck(selectedDeck); // Call delete function from context
        setDeckName(''); // Clear current deck data
        setCards([]); // Clear current cards
        setCommander(null); // Clear commander
        setSelectedDeck(''); // Reset selected deck
        alert(`Deck "${selectedDeck}" has been deleted!`);
      }
    }
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

  const handleRightClickRemove = (event, card) => {
    event.preventDefault(); // Prevent the default context menu

    // Remove the selected card from the deck
    setCards((prevCards) => prevCards.filter((deckCard) => deckCard !== card));
  };

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
          <div className="deck-name-container">
            <input
              type="text"
              placeholder="Deck Name"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
            />
            <p className="card-counter">{`Cards in deck: ${cards.length}`}</p> {/* Card Counter */}
          </div>
          
          <div className="deck-actions-container">
            <select value={selectedDeck} onChange={(e) => loadDeck(e.target.value)}>
              <option value="">Select Deck</option>
              {Object.keys(savedDecks).map((deck) => (
                <option key={deck} value={deck}>
                  {deck}
                </option>
              ))}
            </select>
            
            {/* File import button */}
            <input
              type="file"
              accept=".txt"
              onChange={handleFileImport}
              className="file-import-button"
            />
            
            <button onClick={saveDeck}>Save</button>
            <button onClick={handleExportDeck}>Export Deck</button> {/* Export button */}
            {selectedDeck && <button onClick={handleDeleteDeck}>Delete Deck</button>}
          </div>
        </div>

        {/* Search bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for a card..."
            onChange={handleSearch}
          />
        </div>

        {/* Main container for the card grid and search results */}
        <div className="card-search-container">
          {/* Center: Card grid (for the current deck) */}
          <div className="card-grid">
            {cards.length > 0 ? (
              cards.map((card, index) => (
                <div key={card.id} className="card-item"> {/* Use card.id as the key */}
                  <img
                    src={getCardImageSrc(card)} // Get the correct image source
                    alt={card.name}
                    onClick={() => setPreviewCard(card)} // Preview card on click
                    onContextMenu={(e) => handleRightClickRemove(e, card)} // Right-click to remove
                  />
                </div>
              ))
            ) : (
              <p>No cards in the deck</p>
            )}
          </div>

          {/* Right side: Search results section */}
          <div className="search-results-section" ref={searchContainerRef}>
            <h4>Search Results</h4>
            {searchResults.length > 0 ? (
              searchResults.map((card, index) => (
                <div
                  key={index}
                  className="search-result-item"
                  onClick={() => {
                    setPreviewCard(card); // Set the clicked card to be the preview card
                    addCardToDeck(card);  // Add the card to the deck
                  }}
                >
                  <img
                    src={getCardImageSrc(card)} // Show the card image
                    alt={card.name}
                    className="search-result-image"
                  />
                  <p>{card['name']}</p>
                </div>
              ))
            ) : (
              <p>No search results</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageDecks;
