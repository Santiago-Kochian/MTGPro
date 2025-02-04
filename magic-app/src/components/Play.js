import React, { useContext, useState, useEffect, useRef } from 'react';
import './Playmat.css'; // Import the corresponding CSS
import { DeckContext } from './DeckContext'; // Import the context
import * as XLSX from 'xlsx';
import PlaymatMirror from './PlaymatMirror'; // Import the PlaymatMirror component
import ReactDOM from 'react-dom';
import { v4 as uuidv4 } from 'uuid';

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
  const { savedDecks, gameState, updateGameState } = useContext(DeckContext); // Access gameState and updateGameState
  const [counters, setCounters] = useState({}); // Track counters for cards
  const [commander, setCommander] = useState(null); // Track the commander
  const [showCommanderViewer, setShowCommanderViewer] = useState(false);
  const [showCommanderModal, setShowCommanderModal] = useState(false); // State for commander modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenCards, setTokenCards] = useState([]); // Track token cards from TokensMTG
  const [searchResults, setSearchResults] = useState([]); // For storing filtered token results
  const [allTokens, setAllTokens] = useState([]); // State to store all token cards
  const [mirrorWindow, setMirrorWindow] = useState(null); // Track mirror window

  // Open the mirror window and pass the game state
  const handleMirrorOpen = () => {
    const mirrorWindow = window.open(`${window.location.origin}/MTGPro/#/mirror`, '_blank'); 
    setMirrorWindow(mirrorWindow); 
  
    // Send initial state to the mirror window
    mirrorWindow.onload = () => {
      mirrorWindow.postMessage({ 
        type: 'INITIAL_STATE', 
        data: {
          ...gameState, 
          cardCount: savedDecks[selectedDeck].cards.length
        }
      }, '*');
    };
  };
  

  // Use effect to listen to gameState changes and update the mirror window
  useEffect(() => {
    if (mirrorWindow && !mirrorWindow.closed) {
      const cardCount = savedDecks[selectedDeck].cards.length;
      mirrorWindow.postMessage({
        type: 'UPDATE_STATE',
        data: {
          ...gameState,
          cardCount: cardCount
        }
      }, '*');
    }
  }, [gameState, selectedDeck, mirrorWindow, savedDecks]);
  

  // Sync game state to the mirror window/tab
  const updateMirror = () => {
    if (mirrorWindow && !mirrorWindow.closed) {
      ReactDOM.createPortal(
        <PlaymatMirror
          hand={hand}
          largeZone={largeZone}
          graveyard={graveyard}
          exiled={exiled}
          commander={commander}
          cardPositions={cardPositions}
          tappedCards={tappedCards}
          
        />,
        mirrorWindow.document.body
      );
    }
  };
  useEffect(() => {
    if (mirrorWindow && !mirrorWindow.closed) {
      ReactDOM.createPortal(
        <PlaymatMirror hand={hand} largeZone={largeZone} selectedDeck={selectedDeck} />,
        mirrorWindow.document.body
      );
    }
  }, [mirrorWindow, hand, largeZone, selectedDeck]);

  useEffect(() => {
    updateMirror(); // Update mirror when game state changes
  }, [hand, largeZone, graveyard, exiled, commander, cardPositions, tappedCards]);

  useEffect(() => {
    const fetchTokenData = async () => {
      const response = await fetch(`${process.env.PUBLIC_URL}/TokensMTG.xlsx`); // Make sure the file path is correct
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets['Sheet1']; // Adjust the sheet name if necessary
      const data = XLSX.utils.sheet_to_json(sheet);

      // Assign a unique ID to each token card
      const tokensWithIds = data.map(token => ({
        ...token,
        id: uuidv4() // Assign unique ID to each token
      }));

      setAllTokens(tokensWithIds); // Store all token cards with IDs in state
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
    // Add the token card to the hand
    setHand((prevHand) => {
      const updatedHand = [...prevHand, card];
  
      // Prepare updated game state for the mirror
      const updatedGameState = {
        ...gameState,
        hand: updatedHand, // Update hand with the new token
      };
  
      // Update the game state globally (context)
      updateGameState(updatedGameState);
  
      // Send the updated game state to the mirror window
      if (mirrorWindow && !mirrorWindow.closed) {
        mirrorWindow.postMessage({ type: 'UPDATE_STATE', data: updatedGameState }, '*');
      }
  
      return updatedHand;
    });
  
    // Close the token modal after adding to hand
    setShowTokenModal(false);
  };
  

  const handleCounterClick = (card, position) => {
    const cardId = card.id || `${card.name}-${Date.now()}`; // Use cardId to ensure uniqueness
    const currentCount = counters[cardId]?.[position] || 0;
  
    const newCount = window.prompt(
      `Update ${position === 'left' ? 'Power' : 'Toughness'} counter for ${card.name}:`,
      currentCount
    );
  
    if (newCount !== null && !isNaN(newCount)) {
      // Update local state for counters
      setCounters((prevCounters) => ({
        ...prevCounters,
        [cardId]: {
          ...prevCounters[cardId],
          [position]: parseInt(newCount, 10),
        },
      }));
  
      // Prepare the updated game state
      const updatedGameState = {
        ...gameState,
        largeZone: gameState.largeZone.map((existingCard) => {
          if (existingCard.id === cardId) {
            return {
              ...existingCard,
              counters: {
                ...existingCard.counters,
                [position]: parseInt(newCount, 10),
              },
            };
          }
          return existingCard;
        }),
      };
  
      // Update the game state in the context
      updateGameState(updatedGameState);
  
      // Send the updated game state to the mirror window
      if (mirrorWindow && !mirrorWindow.closed) {
        mirrorWindow.postMessage({
          type: 'UPDATE_STATE',
          data: updatedGameState,
        }, '*');
      }
    }
  };
  
  
  
  // Function to handle deck selection and shuffle the deck
  const handleDeckChange = (event) => {
    const deckName = event.target.value;
    setSelectedDeck(deckName);
  
    if (savedDecks[deckName]) {
      const { cards, commander: deckCommander } = savedDecks[deckName];
  
      if (deckCommander) {
        setCommander(deckCommander); // Set the commander
      }
  
      // Remove the commander from the rest of the deck to prevent it from being drawn
      const deckWithoutCommander = cards.filter(card => card.name !== deckCommander?.name);
  
      // Shuffle the deck without drawing any cards to the hand
      const shuffledDeck = [...deckWithoutCommander];
      shuffleDeck(shuffledDeck);
  
      savedDecks[deckName].cards = shuffledDeck; // Update the deck with shuffled cards
      setHand([]); // Start with an empty hand
  
      // Immediately update the game state with the commanderZone data
      updateGameState({
        ...gameState,
        commanderZone: deckCommander // Set the commanderZone with the selected commander
      });
    }
  };
  

  // Shuffle function
  const shuffleDeck = (deck) => {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
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

    // Check if the card is in the hand, and if not, send the hover data to the mirror tab
    if (!hand.includes(card) && mirrorWindow && !mirrorWindow.closed) {
        mirrorWindow.postMessage({
            type: 'HOVER_CARD', // Custom message type for hover card
            data: card // Send the hovered card data
        }, '*');
    }
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

    // Each card instance should have a unique id
    const cardId = cardData.id || `${cardData.name}-${Date.now()}`; // Create a unique ID if one doesn't exist

    // Get the necessary data for the card
    const currentCardInLargeZone = largeZone.find(card => card.id === cardId);
    const cardCounters = currentCardInLargeZone ? currentCardInLargeZone.counters : counters[cardId] || { left: 0, right: 0 };

    // Get the current mouse position relative to the drop zone
    const largeBlockRect = event.currentTarget.getBoundingClientRect();
    const dropX = event.clientX - largeBlockRect.left - dragOffset.x;
    const dropY = event.clientY - largeBlockRect.top - dragOffset.y;

    // This will only update the position of the card being dropped
    const newCardPosition = { x: dropX, y: dropY };

    let updatedGameState = { ...gameState };

    if (zone === 'graveyard') {
        const updatedGraveyard = [
            ...graveyard.filter((card) => card.id !== cardId),
            { ...cardData, id: cardId, counters: cardCounters }
        ];

        setGraveyard(updatedGraveyard);
        setHand(hand.filter((card) => card.id !== cardId));
        setLargeZone(largeZone.filter((card) => card.id !== cardId));

        updatedGameState = {
            ...updatedGameState,
            graveyard: updatedGraveyard,
            hand: hand.filter((card) => card.id !== cardId),
            largeZone: largeZone.filter((card) => card.id !== cardId),
        };

    } else if (zone === 'exiled') {
        const updatedExiled = [
            ...exiled.filter((card) => card.id !== cardId),
            { ...cardData, id: cardId, counters: cardCounters }
        ];

        setExiled(updatedExiled);
        setHand(hand.filter((card) => card.id !== cardId));
        setLargeZone(largeZone.filter((card) => card.id !== cardId));

        updatedGameState = {
            ...updatedGameState,
            exiled: updatedExiled,
            hand: hand.filter((card) => card.id !== cardId),
            largeZone: largeZone.filter((card) => card.id !== cardId),
        };

    } else if (zone === 'large') {
        // Update the position of the card in the large zone
        const updatedLargeZone = largeZone.map((card) => {
            if (card.id === cardId) {
                // If it's the card being moved, update its position and preserve counters
                return {
                    ...card,
                    position: newCardPosition,  // Update only the position
                    counters: cardCounters      // Preserve the counters
                };
            } else {
                // For other cards (like tapped cards), keep their existing position
                return {
                    ...card,
                    position: cardPositions[card.id] || card.position // Keep the existing position for other cards
                };
            }
        });

        const cardExists = updatedLargeZone.some((card) => card.id === cardId);
        if (!cardExists) {
            updatedLargeZone.push({ ...cardData, id: cardId, counters: cardCounters, position: newCardPosition });
        }

        setLargeZone(updatedLargeZone);
        setCardPositions((prevPositions) => ({
            ...prevPositions,
            [cardId]: newCardPosition,
        }));
        setHand(hand.filter((card) => card.id !== cardId));

        updatedGameState = {
            ...updatedGameState,
            largeZone: updatedLargeZone,
            hand: hand.filter((card) => card.id !== cardId),
            cardPositions: {
                ...cardPositions,
                [cardId]: newCardPosition,
            },
        };

    } else if (zone === 'commander') {
      // When dropping a card into the commander zone, set it as the commander and remove it from other zones
      setCommander(cardData);
      setHand(hand.filter((card) => card.id !== cardId));
      setLargeZone(largeZone.filter((card) => card.id !== cardId));
      setExiled(exiled.filter((card) => card.id !== cardId));
      setGraveyard(graveyard.filter((card) => card.id !== cardId));
  
      updatedGameState = {
          ...updatedGameState,
          commanderZone: { ...cardData, id: cardId, counters: cardCounters },
          hand: hand.filter((card) => card.id !== cardId),
          largeZone: largeZone.filter((card) => card.id !== cardId),
          exiled: exiled.filter((card) => card.id !== cardId),
          graveyard: graveyard.filter((card) => card.id !== cardId),
      };
  
  } else if (zone === 'large' && cardData === commander) {
      // When dragging the commander to the playmat, remove it from the commander zone and add to large zone
      setCommander(null); // Remove commander from the commander zone
      setLargeZone((prevLargeZone) => [...prevLargeZone, cardData]); // Add commander to the playmat
  
      updatedGameState = {
          ...updatedGameState,
          commanderZone: null, // Clear the commander zone
          largeZone: [...largeZone, cardData], // Add the commander to large zone
      };
  }
  
  // Update the gameState in the context
  updateGameState(updatedGameState);
  

    // Send the updated state to the mirror window
    if (mirrorWindow && !mirrorWindow.closed) {
        mirrorWindow.postMessage({
            type: 'UPDATE_STATE',
            data: updatedGameState,
        }, '*');
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
  
      // Define the updated game state
      let updatedGameState = { ...gameState };
  
      // Add the card back to the deck
      savedDecks[selectedDeck].cards.push(selectedCard);
  
      // Handle the commander case
      if (selectedCard === commander) {
        setCommander(null);
        updatedGameState = {
          ...updatedGameState,
          commanderZone: null, // Remove commander from commander zone
          cardCount: savedDecks[selectedDeck].cards.length, // Update the card count
        };
      } else {
        // Remove the card from wherever it was (hand, largeZone, graveyard, exiled)
        setHand(hand.filter((card) => card !== selectedCard));
        setLargeZone(largeZone.filter((card) => card !== selectedCard));
        setGraveyard(graveyard.filter((card) => card !== selectedCard));
        setExiled(exiled.filter((card) => card !== selectedCard));
  
        updatedGameState = {
          ...updatedGameState,
          hand: hand.filter((card) => card !== selectedCard),
          largeZone: largeZone.filter((card) => card !== selectedCard),
          graveyard: graveyard.filter((card) => card !== selectedCard),
          exiled: exiled.filter((card) => card !== selectedCard),
          cardCount: savedDecks[selectedDeck].cards.length, // Update the card count
        };
      }
  
      // Update the game state in the context
      updateGameState(updatedGameState);
  
      // Send the updated state to the mirror window
      if (mirrorWindow && !mirrorWindow.closed) {
        mirrorWindow.postMessage({
          type: 'UPDATE_STATE',
          data: updatedGameState,
        }, '*');
      }
  
      setContextMenu(null); // Close the context menu
    }
  };
  

  // Function to send card from any zone back to hand
  const handleReturnToHand = () => {
    if (contextMenu && contextMenu.card) {
      const selectedCard = contextMenu.card;
      const cardId = selectedCard.id || `${selectedCard.name}-${Date.now()}`; // Ensure we have a unique card ID
  
      // Define updated game state
      let updatedGameState = { ...gameState };
  
      // If the card is the commander, remove it from commanderZone and add it to hand
      if (selectedCard === commander) {
        setCommander(null);
        setHand([...hand, selectedCard]);
        updatedGameState = {
          ...updatedGameState,
          commanderZone: null, // Remove the commander from the commander zone
          hand: [...hand, selectedCard],
        };
      } else {
        // Standard handling for other cards: remove from zones and add to hand
        setHand([...hand, selectedCard]);
        setLargeZone(largeZone.filter((card) => card.id !== cardId));
        setGraveyard(graveyard.filter((card) => card.id !== cardId));
        setExiled(exiled.filter((card) => card.id !== cardId));
  
        updatedGameState = {
          ...updatedGameState,
          hand: [...hand, selectedCard],
          largeZone: largeZone.filter((card) => card.id !== cardId),
          graveyard: graveyard.filter((card) => card.id !== cardId),
          exiled: exiled.filter((card) => card.id !== cardId),
        };
      }
  
      // Update the game state in the context
      updateGameState(updatedGameState);
  
      // Send the updated state to the mirror window
      if (mirrorWindow && !mirrorWindow.closed) {
        mirrorWindow.postMessage({
          type: 'UPDATE_STATE',
          data: updatedGameState,
        }, '*');
      }
  
      setContextMenu(null); // Close the context menu
    }
  };
  
  

  // Tap or untap the card in the large block
  const handleTapUntapCard = () => {
    if (contextMenu) {
      const selectedCard = contextMenu.card;
      const cardId = selectedCard.id || `${selectedCard.name}-${Date.now()}`; // Ensure we have a unique card ID
  
      const isTapped = tappedCards[cardId];
      const offsetY = -20.5; // Offset for Y position when rotating
      const offsetX = 0; // Offset for X position when rotating
  
      // If the card is tapped or untapped, update its position
      const newXPosition = isTapped
        ? cardPositions[cardId]?.x - offsetX // Remove offset if untapping
        : cardPositions[cardId]?.x + offsetX; // Apply offset if tapping
  
      const newYPosition = isTapped
        ? cardPositions[cardId]?.y - offsetY // Remove offset if untapping
        : cardPositions[cardId]?.y + offsetY; // Apply offset if tapping
  
      setCardPositions((prevPositions) => ({
        ...prevPositions,
        [cardId]: {
          x: newXPosition,
          y: newYPosition,
        },
      }));
  
      // Update tapped state
      setTappedCards((prev) => ({
        ...prev,
        [cardId]: !isTapped, // Toggle tapped state
      }));
  
      // Prepare updated game state
      const updatedGameState = {
        ...gameState,
        tappedCards: {
          ...gameState.tappedCards,
          [cardId]: !isTapped, // Update the tapped state for this card
        },
        largeZone: gameState.largeZone.map((card) => {
          if (card.id === cardId) {
            return {
              ...card,
              isTapped: !isTapped, // Update the tapped state
              position: { x: newXPosition, y: newYPosition }, // Pass the updated position with offsets
            };
          }
          return card;
        }),
      };
  
      // Update the game state globally (context)
      updateGameState(updatedGameState);
  
      // Send the updated game state to the mirror window immediately after tap/untap
      if (mirrorWindow && !mirrorWindow.closed) {
        mirrorWindow.postMessage({ type: 'UPDATE_STATE', data: updatedGameState }, '*');
      }
  
      setContextMenu(null); // Close the context menu
    }
  };
  
  
  






  const handleUntapAll = () => {
    setTappedCards((prevTapped) => {
      const updatedTapped = { ...prevTapped };
  
      setCardPositions((prevPositions) => {
        const updatedPositions = { ...prevPositions };
  
        largeZone.forEach((card) => {
          const isTapped = prevTapped[card.id]; // Check if the card is currently tapped by its id
          const offsetY = 38.5; // Calculated offset for a 90-degree rotation
          const offsetX = 228.5;
  
          if (isTapped) {
            // If the card is tapped, untap and adjust position
            updatedPositions[card.id] = {
              x: prevPositions[card.id]?.x - offsetX, // Move back to original X position
              y: prevPositions[card.id]?.y - offsetY, // Move back to original Y position
            };
            updatedTapped[card.id] = false; // Untap the card
          }
        });
  
        // Prepare updated game state for the mirror
        const updatedGameState = {
          ...gameState,
          largeZone: largeZone.map((card) => ({
            ...card,
            isTapped: false, // All cards are now untapped
            position: updatedPositions[card.id], // Include updated positions using card.id
          })),
          tappedCards: updatedTapped, // Ensure tappedCards state is also updated
          cardPositions: updatedPositions, // Ensure the updated card positions are included
        };
  
        // Update game state globally (context)
        updateGameState(updatedGameState);
  
        // Send the updated game state to the mirror window
        if (mirrorWindow && !mirrorWindow.closed) {
          mirrorWindow.postMessage({ type: 'UPDATE_STATE', data: updatedGameState }, '*');
        }
  
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

      // Draw the first card and update the hand
      const drawnCard = deckCards[0];
      const remainingDeck = deckCards.slice(1);
      setHand([...hand, drawnCard]);
      savedDecks[selectedDeck].cards = remainingDeck;

      // Update gameState in context
      updateGameState({
        ...gameState,
        hand: [...hand, drawnCard],
        cardCount: remainingDeck.length // Update card count
      });

      // Update mirror window after drawing a card
      if (mirrorWindow && !mirrorWindow.closed) {
        mirrorWindow.postMessage({
          type: 'UPDATE_STATE',
          data: {
            ...gameState,
            hand: [...hand, drawnCard],
            cardCount: remainingDeck.length
          }
        }, '*');
      }
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
    // Add the selected card to the hand
    setHand([...hand, card]);

    // Remove the card from the deck using the card's id instead of name to prevent issues with multiple copies
    savedDecks[selectedDeck].cards = savedDecks[selectedDeck].cards.filter(
      (deckCard) => deckCard.id !== card.id
    );

    // Update game state with the new hand and deck count
    const updatedGameState = {
      ...gameState,
      hand: [...hand, card], // Update the hand with the new card
      cardCount: savedDecks[selectedDeck].cards.length, // Update the card count in the deck
    };

    // Update the game state in the context
    updateGameState(updatedGameState);

    // Send the updated state to the mirror window
    if (mirrorWindow && !mirrorWindow.closed) {
      mirrorWindow.postMessage({
        type: 'UPDATE_STATE',
        data: updatedGameState,
      }, '*');
    }

    // Close the deck search modal and reset the search query
    setShowDeckSearch(false);
    setSearchQuery('');
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
              <div key={card.id || index} className="large-card-container" style={{
                position: 'absolute',
                left: `${cardPositions[card.id]?.x}px`, // Use card.id for unique positions
                top: `${cardPositions[card.id]?.y}px`,
                transform: tappedCards[card.id] ? 'rotate(90deg)' : 'rotate(0deg)', // Use card.id for tap/untap rotation
              }}>
                {/* Card Image */}
                <img
                  src={getCardImageSrc(card)}
                  alt={card.name}
                  className="playmat-card"
                  draggable="true"
                  onClick={() => handleTapUntapCard(card)} // Add click event to tap/untap the card
                  onDragStart={(event) => handleDragStart(card, event)} // Drag card
                  onMouseEnter={() => handleCardHover(card)} // Show card in top-left on hover
                  onMouseLeave={handleCardMouseLeave} // Clear preview on mouse leave
                  onContextMenu={(event) => handleCardContextClick(event, card)} // Right-click menu
                />
              
                {/* Counter Circles */}
                <div className="counter-circle top-left white-background" onClick={() => handleCounterClick(card, 'left')}>
                  {counters[card.id]?.left || 0} {/* Use card.id for individual counters */}
                </div>
                <div className="counter-circle top-right black-background" onClick={() => handleCounterClick(card, 'right')}>
                  {counters[card.id]?.right || 0} {/* Use card.id for individual counters */}
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
            <div className="mirror-button-container">
          <button className="mirror-button" onClick={handleMirrorOpen}>
            Open Mirror
          </button>
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
            onDrop={(event) => handleDrop('commander', event)} // Drop handler for the commander zone
            onDragOver={handleDragOver} // Allow dragging over the commander zone
          >
            {commander ? (
              <img
                src={getCardImageSrc(commander)}
                alt={commander.name}
                className="playable-card"
                draggable="true" // Enable dragging
                onDragStart={(event) => handleDragStart(commander, event)} // Start dragging the commander
                onMouseEnter={() => handleCardHover(commander)} // Show card in top-left on hover
                onMouseLeave={handleCardMouseLeave} // Clear preview on mouse leave
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
              {tappedCards[contextMenu.card.id] ? 'Untap' : 'Tap'} {/* Use the unique cardId instead of card.name */}
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