import React, { createContext, useState, useEffect } from 'react';

export const DeckContext = createContext();

export const DeckProvider = ({ children }) => {
  const [savedDecks, setSavedDecks] = useState({});
  const [gameState, setGameState] = useState({
    hand: [],
    largeZone: [],
    graveyard: [],
    exiled: [],
    commanderZone: null,
    deckCount: 0,
  });
  const [mirrorWindow, setMirrorWindow] = useState(null);

  // Load saved decks from localStorage on initial render
  useEffect(() => {
    const storedDecks = JSON.parse(localStorage.getItem('decks')) || {};
    setSavedDecks(storedDecks);
  }, []);

  // Function to add a new deck
  const addDeck = (newDeck) => {
    setSavedDecks((prevDecks) => {
      const updatedDecks = { ...prevDecks, [newDeck.name]: newDeck };
      localStorage.setItem('decks', JSON.stringify(updatedDecks)); // Save updated decks to localStorage
      return updatedDecks;
    });
  };

  // Function to update an existing deck
  const updateDeck = (deckName, updatedDeck) => {
    setSavedDecks((prevDecks) => {
      const updatedDecks = { ...prevDecks, [deckName]: updatedDeck };
      localStorage.setItem('decks', JSON.stringify(updatedDecks)); // Save updated decks to localStorage
      return updatedDecks;
    });
  };

  // Function to delete a deck
  const deleteDeck = (deckName) => {
    setSavedDecks((prevDecks) => {
      const { [deckName]: _, ...remainingDecks } = prevDecks; // Remove deck from savedDecks
      localStorage.setItem('decks', JSON.stringify(remainingDecks)); // Update localStorage
      return remainingDecks;
    });
  };

  // Function to update game state
  const updateGameState = (newState) => {
    setGameState((prevState) => {
        const updatedState = {
            ...prevState,
            ...newState,
            // Preserve tappedCards state
            tappedCards: {
                ...prevState.tappedCards,
                ...newState.tappedCards,
            },
            // Preserve cardPositions state
            cardPositions: {
                ...prevState.cardPositions,
                ...newState.cardPositions,
            },
        };

        console.log('Updated gameState:', updatedState); // Log the new game state for debugging

        // Check if mirrorWindow is defined and not closed
        if (mirrorWindow && !mirrorWindow.closed) {
            console.log('Sending updated gameState to mirror window:', updatedState);
            mirrorWindow.postMessage({ type: 'UPDATE_STATE', data: updatedState }, '*'); // Send updated state to mirror window
        }

        return updatedState;
    });
};

  const openMirrorWindow = () => {
    if (!mirrorWindow || mirrorWindow.closed) {
      const newWindow = window.open('/mirror', '_blank');
      console.log('Mirror window opened:', newWindow);
      setMirrorWindow(newWindow);
    } else {
      console.log('Mirror window is already open.');
    }
  };

  return (
    <DeckContext.Provider value={{ savedDecks, setSavedDecks, addDeck, updateDeck, deleteDeck, gameState, updateGameState, openMirrorWindow }}>
      {children}
    </DeckContext.Provider>
  );
};
