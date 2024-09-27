import React, { createContext, useState, useEffect } from 'react';

// Create a context to store the saved decks
export const DeckContext = createContext();

export const DeckProvider = ({ children }) => {
  const [savedDecks, setSavedDecks] = useState({}); // Store saved decks as an object

  // Load decks from localStorage when the app starts
  useEffect(() => {
    const storedDecks = JSON.parse(localStorage.getItem('decks')) || {};
    setSavedDecks(storedDecks);
  }, []);

  // Function to add a new deck
  const addDeck = (newDeck) => {
    const updatedDecks = { ...savedDecks, [newDeck.name]: newDeck };
    setSavedDecks(updatedDecks);
    localStorage.setItem('decks', JSON.stringify(updatedDecks)); // Persist to localStorage
  };

  // Function to update an existing deck
  const updateDeck = (deckName, updatedDeck) => {
    const updatedDecks = { ...savedDecks, [deckName]: updatedDeck };
    setSavedDecks(updatedDecks);
    localStorage.setItem('decks', JSON.stringify(updatedDecks)); // Persist to localStorage
  };

  return (
    <DeckContext.Provider value={{ savedDecks, addDeck, updateDeck }}>
      {children}
    </DeckContext.Provider>
  );
};
