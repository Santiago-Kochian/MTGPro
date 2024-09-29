import React, { useContext, useState, useEffect, useRef } from 'react';
import './Playmat.css'; // Import the corresponding CSS
import { DeckContext } from './DeckContext'; // Import the context
import * as XLSX from 'xlsx';

const BASE_URL = 'https://gatherer.wizards.com'; // Base URL for card images

const Play = () => {
  const [selectedDeck, setSelectedDeck] = useState(''); // Track selected deck
  const [hand, setHand] = useState([]); // Track cards in hand
  const [hoveredCard, setHoveredCard] = useState(null); // Track hovered card for preview
  const [largeZone, setLargeZone] = useState([]); // Track cards in the large block
  const [graveyard, setGraveyard] = useState([]); // Track cards in the graveyard
  const [exiled, setExiled] = useState([]); // Track cards in the exiled zone
  const [commanderZone, setCommanderZone] = useState([]); // Track cards in the commander zone
  const [cardPositions, setCardPositions] = useState({}); // Track card positions in the large block
  const [tappedCards, setTappedCards] = useState({}); // Track which cards are tapped
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // Track the mouse offset when dragging
  const [showGraveyardViewer, setShowGraveyardViewer] = useState(false); // Track if graveyard viewer is open
  const [showExiledViewer, setShowExiledViewer] = useState(false); // Track if exiled viewer is open
  const [contextMenu, setContextMenu] = useState(null); // Track context menu state
  const [showDeckSearch, setShowDeckSearch] = useState(false); // Track deck search modal
  const [searchQuery, setSearchQuery] = useState(''); // Search query for the deck search modal
  const { savedDecks } = useContext(DeckContext); // Access saved decks from context
  const [counters, setCounters] = useState({}); // Track counters for cards
  const [commander, setCommander] = useState(null); // Track the commander
  const [showCommanderViewer, setShowCommanderViewer] = useState(false);
  const [showCommanderModal, setShowCommanderModal] = useState(false); // State for commander modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenCards, setTokenCards] = useState([]); // Track token cards from TokensMTG
  const [searchResults, setSearchResults] = useState([]); // For storing filtered token results
  const [allTokens, setAllTokens] = useState([]); // State to store all token cards

  useEffect(() => {
    const fetchTokenData = async () => {
      const response = await fetch('/TokensMTG.xlsx'); // Make sure the file path is correct
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets['Sheet1']; // Adjust the sheet name if necessary
      const data = XLSX.utils.sheet_to_json(sheet);
      setAllTokens(data); // Store all token cards in state
    };
  
    fetchTokenData();
  }, []);

  const handleTokenSearch = (event) => {
    const query = event.target.value.toLowerCase(); // Ensure query is a string
    
    // Filter tokens based on the search query and the 'type' column
    const filteredTokens = allTokens.filter(token =>
      typeof token['name'] === 'string' && // Ensure token['name'] is a string
      token['name'].toLowerCase().includes(query) && // Search by name
      typeof token['type'] === 'string' && // Ensure token['type'] is a string
      token['type'].toLowerCase().includes('token') // Only show token cards
    );
  
    setSearchResults(filteredTokens); // Update the token results
  };
  
  const getTokenImageSrc = (card) => {
    return card['tokenImg-src']; // Use the full external URL for token image
  };

  // Open the token modal
  const handleOpenTokenModal = () => {
    setShowTokenModal(true); // Show token modal
  };

  // Close the token modal
  const handleCloseTokenModal = (event) => {
    if (event.target.className === 'token-modal-overlay') {
      setShowTokenModal(false); // Close token modal when overlay clicked
    }
  };

  // Function to bring a token (or card for now) from the "token" modal to the hand
  const handleTokenToHand = (card) => {
    setHand([...hand, card]);
    setShowTokenModal(false); // Close the modal after adding to hand
  };

  const handleCounterClick = (card, position) => {
    const currentCount = counters[card.name]?.[position] || 0;

    const newCount = window.prompt(
      `Update ${position === 'left' ? 'Power' : 'Toughness'} counter for ${card.name}:`,
      currentCount
    );

    if (newCount !== null && !isNaN(newCount)) {
      setCounters((prevCounters) => ({
        ...prevCounters,
        [card.name]: {
          ...prevCounters[card.name],
          [position]: parseInt(newCount, 10),
        },
      }));
    }
  };
  
  // Function to handle deck selection and shuffle the deck
  const handleDeckChange = (event) => {
    const deckName = event.target.value;
    setSelectedDeck(deckName);
    if (savedDecks[deckName]) {
      const { cards, commander: deckCommander } = savedDecks[deckName];

      // Set the commander and remove it from the deck
      if (deckCommander) {
        setCommander(deckCommander);
      }
      
      const deckWithoutCommander = cards.filter(card => card.name !== deckCommander?.name);
      
      const shuffledDeck = [...deckWithoutCommander];
      shuffleDeck(shuffledDeck); // Shuffle when a deck is selected
      savedDecks[deckName].cards = shuffledDeck; // Update deck with shuffled cards
    }
  };

  // Shuffle function
  const shuffleDeck = (deck) => {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap elements
    }
  };

  // Shuffle the current deck manually
  const handleManualShuffle = () => {
    if (selectedDeck && savedDecks[selectedDeck]) {
      const shuffledDeck = [...savedDecks[selectedDeck].cards];
      shuffleDeck(shuffledDeck);
      savedDecks[selectedDeck].cards = shuffledDeck; // Update deck with shuffled cards
    }
  };

  // Helper function to get the correct image source
  const getCardImageSrc = (card) => {
    // First check if it's a token card by looking for the 'tokenImg-src' property
    if (card['tokenImg-src']) {
      return card['tokenImg-src']; // Return token image URL directly
    }
  
    // Otherwise, assume it's a deck card and follow the existing logic
    if (card['cardImg-src'] && !card['cardImg-src'].startsWith('http')) {
      let cleanedPath = card['cardImg-src'].replace(/^\.{1,2}\/?/, '');
      return `${BASE_URL}/${cleanedPath}`;
    }
  
    return card['cardImg-src']; // Fallback for deck card image with full URL
  };

  // Handle mouse hover over a card
  const handleCardHover = (card) => {
    setHoveredCard(card); // Set the hovered card for preview
  };
  const handleCardMouseLeave = () => {
  };

  // Dragging functions
  const handleDragStart = (card, event) => {
    event.dataTransfer.setData('text/plain', JSON.stringify(card)); // Store card data as JSON

    // Calculate the offset of the mouse relative to the top-left corner of the card
    const cardRect = event.target.getBoundingClientRect();
    setDragOffset({
      x: event.clientX - cardRect.left,
      y: event.clientY - cardRect.top,
    });
  };

  const handleDrop = (zone, event) => {
    event.preventDefault();
    const cardData = JSON.parse(event.dataTransfer.getData('text/plain')); // Retrieve card data
  
    // Handle drop logic based on the target zone
    if (zone === 'graveyard') {
      setGraveyard([...graveyard, cardData]); // Add card to graveyard
      setHand(hand.filter((card) => card.name !== cardData.name)); // Remove from hand
      setLargeZone(largeZone.filter((card) => card.name !== cardData.name)); // Remove from large zone
    } else if (zone === 'exiled') {
      setExiled([...exiled, cardData]); // Add card to exiled zone
      setHand(hand.filter((card) => card.name !== cardData.name)); // Remove from hand
      setLargeZone(largeZone.filter((card) => card.name !== cardData.name)); // Remove from large zone
    } else if (zone === 'large') {
      const largeBlockRect = event.currentTarget.getBoundingClientRect();
      const dropX = event.clientX - largeBlockRect.left - dragOffset.x;
      const dropY = event.clientY - largeBlockRect.top - dragOffset.y;
  
      setLargeZone([...largeZone, cardData]); // Add card to large zone
      setCardPositions((prevPositions) => ({
        ...prevPositions,
        [cardData.name]: { x: dropX, y: dropY },
      }));
      setHand(hand.filter((card) => card.name !== cardData.name)); // Remove from hand
    } else if (zone === 'commander') {
      // Logic for handling the commander zone
      if (commander && cardData.name === commander.name) {
        setCommander(cardData); // Return commander to the commander zone
        setHand(hand.filter((card) => card.name !== cardData.name)); // Remove from hand
        setLargeZone(largeZone.filter((card) => card.name !== cardData.name)); // Remove from large zone
        setExiled(exiled.filter((card) => card.name !== cardData.name)); // Remove from exiled zone
        setGraveyard(graveyard.filter((card) => card.name !== cardData.name)); // Remove from graveyard
      } else if (!commander) {
        // In case no commander was set, we allow the card to be placed in the commander zone
        setCommander(cardData);
        setHand(hand.filter((card) => card.name !== cardData.name)); // Remove from hand
        setLargeZone(largeZone.filter((card) => card.name !== cardData.name)); // Remove from large zone
        setExiled(exiled.filter((card) => card.name !== cardData.name)); // Remove from exiled zone
        setGraveyard(graveyard.filter((card) => card.name !== cardData.name)); // Remove from graveyard
      }
    }
  };
  
  const handleDragOver = (event) => {
    event.preventDefault(); // Allow dropping
  };

  // Function to open context menu for a card
  const handleCardContextClick = (event, card) => {
    event.preventDefault();
    setContextMenu({
      card,
      x: event.clientX,
      y: event.clientY,
    });
  };

  // Context menu should show for cards in modals (commander, graveyard, exiled)
  const handleModalCardContextClick = (event, card) => {
    event.preventDefault(); // Prevent default right-click behavior
    setContextMenu({
      card,
      x: event.clientX,
      y: event.clientY,
    });
  };

  // Function to send card from any zone to the end of the deck
  const handleReturnToDeck = () => {
    if (contextMenu && contextMenu.card) {
      const selectedCard = contextMenu.card;
      
      // If the card is the commander, remove it from commanderZone and add it to the deck
      if (selectedCard === commander) {
        setCommander(null);
        savedDecks[selectedDeck].cards.push(selectedCard); // Add commander to the deck
      } else {
        // Standard handling for other cards
        savedDecks[selectedDeck].cards.push(selectedCard);
        setHand(hand.filter((card) => card !== selectedCard));
        setLargeZone(largeZone.filter((card) => card !== selectedCard));
        setGraveyard(graveyard.filter((card) => card !== selectedCard));
        setExiled(exiled.filter((card) => card !== selectedCard));
      }
      
      setContextMenu(null); // Close the context menu
    }
  };

  // Function to send card from any zone back to hand
  const handleReturnToHand = () => {
    if (contextMenu && contextMenu.card) {
      const selectedCard = contextMenu.card;
      
      // If the card is the commander, remove it from commanderZone and add it to hand
      if (selectedCard === commander) {
        setCommander(null);
        setHand([...hand, selectedCard]);
      } else {
        // Standard handling for other cards
        setHand([...hand, selectedCard]);
        setLargeZone(largeZone.filter((card) => card !== selectedCard));
        setGraveyard(graveyard.filter((card) => card !== selectedCard));
        setExiled(exiled.filter((card) => card !== selectedCard));
      }
      
      setContextMenu(null); // Close the context menu
    }
  };

  // Tap or untap the card in the large block
  const handleTapUntapCard = () => {
    if (contextMenu) {
      const selectedCard = contextMenu.card;
      const isTapped = tappedCards[selectedCard.name];
      const offsetY = 38.5; // Calculated offset for a 90-degree rotation
      const offsetX = 228.5;

      setCardPositions((prevPositions) => ({
        ...prevPositions,
        [selectedCard.name]: {
          x: isTapped
            ? prevPositions[selectedCard.name]?.x - offsetX
            : prevPositions[selectedCard.name]?.x + offsetX, 
          y: isTapped 
            ? prevPositions[selectedCard.name]?.y - offsetY // Untap: move back up
            : prevPositions[selectedCard.name]?.y + offsetY // Tap: move down
        },
      }));
  
      setTappedCards((prev) => ({
        ...prev,
        [selectedCard.name]: !isTapped, // Toggle tapped state
      }));
  
      setContextMenu(null); // Close the context menu
    }
  };

  const handleUntapAll = () => {
    setTappedCards((prevTapped) => {
      const updatedTapped = { ...prevTapped };
  
      setCardPositions((prevPositions) => {
        const updatedPositions = { ...prevPositions };
  
        largeZone.forEach((card) => {
          const isTapped = prevTapped[card.name]; // Check if the card is currently tapped
          const offsetY = 38.5; // Calculated offset for a 90-degree rotation
          const offsetX = 228.5;
  
          if (isTapped) {
            // If the card is tapped, untap and adjust position
            updatedPositions[card.name] = {
              x: prevPositions[card.name]?.x - offsetX, // Move back to original X position
              y: prevPositions[card.name]?.y - offsetY, // Move back to original Y position
            };
            updatedTapped[card.name] = false; // Untap the card
          }
        });
  
        return updatedPositions;
      });
  
      return updatedTapped;
    });
  };
  // Function to handle drawing a card (clicking on the deck)
  const handleDrawCard = () => {
    if (selectedDeck && savedDecks[selectedDeck]) {
      const deckCards = savedDecks[selectedDeck].cards;
      if (deckCards.length === 0) {
        alert('No more cards in the deck!');
        return;
      }
      const drawnCard = deckCards[0]; // Draw the first card
      const remainingDeck = deckCards.slice(1); // Remove the drawn card from the deck

      setHand([...hand, drawnCard]);
      savedDecks[selectedDeck].cards = remainingDeck; // Update the deck in context
    }
  };

  // Function to open the graveyard viewer
  const handleGraveyardClick = () => {
    setShowGraveyardViewer(true);
  };

  // Function to close the graveyard viewer
  const handleCloseGraveyardViewer = () => {
    setShowGraveyardViewer(false);
  };

  // Function to open the exiled viewer
  const handleExiledClick = () => {
    setShowExiledViewer(true);
  };

  // Function to close the exiled viewer
  const handleCloseExiledViewer = () => {
    setShowExiledViewer(false);
  };

  // Handle opening and closing the commander modal
  const handleCommanderClick = () => {
    setShowCommanderModal(true); // Open the commander modal when the commander zone is clicked
  };
  
  const handleCloseCommanderModal = (event) => {
    if (event.target.className === 'commander-modal-overlay') {
      setShowCommanderModal(false); // Close the modal when the overlay is clicked
    }
  };

  // Function to open the deck search modal
  const handleOpenDeckSearch = () => {
    setShowDeckSearch(true);
  };

  // Function to close the deck search modal
  const handleCloseDeckSearch = (event) => {
    if (event.target.className === 'deck-search-overlay') {
      setShowDeckSearch(false);
      setSearchQuery(''); // Reset the search query when closing
    }
  };

  // Function to search for a card in the deck and add it to the hand
  const handleSearchDeck = (event) => {
    setSearchQuery(event.target.value.toLowerCase());
  };

  // Function to bring a card from the deck to the hand
  const handleCardToHand = (card) => {
    setHand([...hand, card]);
    savedDecks[selectedDeck].cards = savedDecks[selectedDeck].cards.filter(
      (deckCard) => deckCard.name !== card.name
    );
    setShowDeckSearch(false); // Close modal after selecting a card
    setSearchQuery(''); // Reset search query
  };

  // If a deck is selected, get the deck data and card count
  const selectedDeckData = savedDecks[selectedDeck];
  const deckCards = selectedDeckData ? selectedDeckData.cards : [];
  const cardCount = deckCards.length;

  // Filtered deck based on search query
  const filteredDeckCards = deckCards.filter((card) =>
    card.name.toLowerCase().includes(searchQuery)
  );

  // If no deck is selected, display deck selection
  if (!selectedDeck) {
    return (
      <div className="deck-selection">
        <h2>Select a Deck</h2>
        <select value={selectedDeck} onChange={handleDeckChange} className="deck-dropdown">
          <option value="">-- Choose a Deck --</option>
          {Object.keys(savedDecks).map((deckName) => (
            <option key={deckName} value={deckName}>
              {deckName}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="playmat">
      {/* Top-left block for fixed card preview */}
      <div className="top-left-block">
        {hoveredCard ? (
          <>
            <img
              src={getCardImageSrc(hoveredCard)}
              alt={hoveredCard.name}
              className="fixed-card-preview-image"
            />
            {/* New text box for cardText */}
            <div className="card-text-box">
              <strong className="card-name">{hoveredCard.name}</strong>
              <p>{hoveredCard.cardText ? hoveredCard.cardText : "No card text available."}</p>
            </div>
          </>
        ) : (
          'Hover over a card to preview'
        )}
      </div>
  
      <div className="bottom-container">
        {/* Deck Block */}
        <div className="deck-container">
          <p className="card-count">Cards Left: {cardCount}</p>
          <button onClick={handleManualShuffle} className="shuffle-button">Shuffle Deck</button>
          <button onClick={handleOpenDeckSearch} className="search-button">🔍</button>
          <div className="deck-block" onClick={handleDrawCard}>
            <img
              src={`${process.env.PUBLIC_URL}/Magic_card_back.png`}
              alt="Magic Card Back"
              className="deck-image"
            />
          </div>
        </div>
  
        {/* Center block container with Hand and Large Block */}
        <div className="center-block-container">
          <div
            className="large-block"
            onDrop={(event) => handleDrop('large', event)}
            onDragOver={handleDragOver}
          >
            <div className="large-placeholder">Large Block</div>
            {largeZone.map((card, index) => (
              <div key={index} className="large-card-container" style={{
                position: 'absolute',
                left: `${cardPositions[card.name]?.x}px`,
                top: `${cardPositions[card.name]?.y}px`,
                transform: tappedCards[card.name] ? 'rotate(90deg)' : 'rotate(0deg)',
              }}>
                {/* Card Image */}
                <img
                  src={getCardImageSrc(card)}
                  alt={card.name}
                  className="playable-card"
                  draggable="true"
                  onDragStart={(event) => handleDragStart(card, event)}
                  onMouseEnter={() => handleCardHover(card)} // Show card in top-left on hover
                  onMouseLeave={handleCardMouseLeave} // Clear preview on mouse leave
                  onContextMenu={(event) => handleCardContextClick(event, card)} // Right-click menu
                />
  
                {/* Counter Circles */}
                <div className="counter-circle top-left white-background" onClick={() => handleCounterClick(card, 'left')}>
                  {counters[card.name]?.left || 0}
                </div>
                <div className="counter-circle top-right black-background" onClick={() => handleCounterClick(card, 'right')}>
                  {counters[card.name]?.right || 0}
                </div>
              </div>
            ))}
          </div>
  
          <div className={`hand-block ${hand.length > 6 ? 'overlap' : ''}`}>
            <div className="hand-cards">
              {hand.map((card, index) => (
                <img
                  key={index}
                  src={getCardImageSrc(card)}
                  alt={card.name}
                  className="hand-card-image"
                  draggable="true"
                  onDragStart={(event) => handleDragStart(card, event)}
                  onMouseEnter={() => handleCardHover(card)} // Show card in top-left on hover
                  onMouseLeave={handleCardMouseLeave} // Clear preview on mouse leave
                  onContextMenu={(event) => handleCardContextClick(event, card)} // Right-click menu for hand
                />
              ))}
            </div>
          </div>
        </div>
  
        {/* Exiled, Graveyard, and Commander Block */}
        <div className="right-block-container">
          <div
            className="exiled-block"
            onClick={handleExiledClick} // Open exiled viewer on click
            onDrop={(event) => handleDrop('exiled', event)}
            onDragOver={handleDragOver}
          >
            <div className="exiled-placeholder">
              {/* Show last card added to exiled zone */}
              {exiled.length > 0 ? (
                <img
                  src={getCardImageSrc(exiled[exiled.length - 1])}
                  alt="Exiled Top Card"
                  className="playable-card"
                  onContextMenu={(event) => handleModalCardContextClick(event, exiled[exiled.length - 1])} // Right-click menu in exiled
                />
              ) : (
                'Exiled Cards'
              )}
            </div>
          </div>
  
          <div
            className="graveyard-block"
            onClick={handleGraveyardClick} // Open graveyard viewer on click
            onDrop={(event) => handleDrop('graveyard', event)}
            onDragOver={handleDragOver}
          >
            <div className="graveyard-placeholder">
              {/* Show last card added to graveyard */}
              {graveyard.length > 0 ? (
                <img
                  src={getCardImageSrc(graveyard[graveyard.length - 1])}
                  alt="Graveyard Top Card"
                  className="playable-card"
                  onContextMenu={(event) => handleModalCardContextClick(event, graveyard[graveyard.length - 1])} // Right-click menu in graveyard
                />
              ) : (
                'Graveyard'
              )}
            </div>
          </div>
  
          {/* Commander Zone */}
          <div
            className="commander-block"
            onClick={handleCommanderClick} // Open commander viewer on click
            onDrop={(event) => handleDrop('commander', event)}
            onDragOver={handleDragOver}
          >
            {commander ? (
              <img
                src={getCardImageSrc(commander)}
                alt={commander.name}
                className="playable-card"
              />
            ) : (
              <div className="commander-block-empty">
                Commander Zone
              </div>
            )}
          </div>
          <div className="commander-utility-buttons">
            <button onClick={handleUntapAll} className="untap-all-button">
              ⟳
            </button>

            <button className="add-token-button" onClick={handleOpenTokenModal}>
              ➕
            </button>
          </div>

          {showTokenModal && (
            <div className="token-modal-overlay" onClick={handleCloseTokenModal}>
              <div className="token-modal">
                <h3>Select a Token</h3>
                <input
                  type="text"
                  placeholder="Search tokens..."
                  onChange={handleTokenSearch} // Hook the search function
                  className="search-input"
                />
                <div className="token-search-results">
                  {searchResults.map((card, index) => (
                    <div
                      key={index}
                      className="token-search-card"
                      onClick={() => handleTokenToHand(card)}
                    >
                      <img
                        src={getCardImageSrc(card)}
                        alt={card.name}
                        className="token-search-card-image"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {showCommanderModal && (
            <div className="commander-modal-overlay" onClick={handleCloseCommanderModal}>
              <div className="commander-modal">
                <h3>Commander</h3>
                <p>{commander ? commander.name : "No commander selected"}</p>
                {commander ? (
                  <img
                    src={getCardImageSrc(commander)}
                    alt={commander.name}
                    className="commander-modal-image"
                    onContextMenu={(event) => handleModalCardContextClick(event, commander)} // Right-click menu in commander modal
                  />
                ) : (
                  <p>No commander card available.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'absolute',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
        >
          <button onClick={handleReturnToHand}>Return to Hand</button>
          <button onClick={handleReturnToDeck}>Return to Deck</button>
          {largeZone.includes(contextMenu.card) && (
            <button onClick={handleTapUntapCard}>
              {tappedCards[contextMenu.card.name] ? 'Untap' : 'Tap'}
            </button>
          )}
        </div>
      )}
  
      {/* Graveyard Viewer */}
      {showGraveyardViewer && (
        <div className="graveyard-viewer-overlay" onClick={handleCloseGraveyardViewer}>
          <div className="graveyard-viewer">
            <h3>Graveyard ({graveyard.length})</h3>
            <div className="graveyard-cards">
              {graveyard.map((card, index) => (
                <div
                  key={index}
                  className="graveyard-card"
                  onContextMenu={(event) => handleModalCardContextClick(event, card)} // Right-click in graveyard viewer
                >
                  <p className="graveyard-number">#{index + 1}</p>
                  <img
                    src={getCardImageSrc(card)}
                    alt={card.name}
                    className="graveyard-card-image"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
  
      {/* Exiled Viewer */}
      {showExiledViewer && (
        <div className="exiled-viewer-overlay" onClick={handleCloseExiledViewer}>
          <div className="exiled-viewer">
            <h3>Exiled ({exiled.length})</h3>
            <div className="exiled-cards">
              {exiled.map((card, index) => (
                <div
                  key={index}
                  className="exiled-card"
                  onContextMenu={(event) => handleModalCardContextClick(event, card)} // Right-click in exiled viewer
                >
                  <p className="exiled-number">#{index + 1}</p>
                  <img
                    src={getCardImageSrc(card)}
                    alt={card.name}
                    className="exiled-card-image"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
  
      {/* Deck Search Modal */}
      {showDeckSearch && (
        <div className="deck-search-overlay" onClick={(event) => handleCloseDeckSearch(event)}>
          <div className="deck-search-modal">
            <input
              type="text"
              placeholder="Search deck..."
              value={searchQuery}
              onChange={handleSearchDeck}
              className="search-input"
            />
            <div className="deck-search-results">
              {filteredDeckCards.map((card, index) => (
                <div key={index} className="deck-search-card">
                  <img
                    src={getCardImageSrc(card)}
                    alt={card.name}
                    className="deck-search-card-image"
                    onClick={() => handleCardToHand(card)} // Click to bring card to hand
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
};

export default Play;
