import React, { useEffect, useState } from 'react';
import './Playmat.css'; // Shared CSS for layout

const PlaymatMirror = () => {
  const [mirrorState, setMirrorState] = useState({
    hand: [],
    largeZone: [],
    graveyard: [],
    exiled: [],
    commanderZone: null,
    cardCount: 0, // Initial card count is 0, will be updated by message
  });

  const [hoveredCard, setHoveredCard] = useState(null); // State to store the hovered card

  const tappedOffsetX = 0; // Offset when the card is tapped
  const tappedOffsetY = -50;    // Y Offset when a card is tapped
  const regularOffsetX = 0;   // Regular X Offset for cards in mirror
  const regularOffsetY = -50;    // Regular Y Offset for untapped cards

  useEffect(() => {
    // Listen for messages from the main window
    const handleMessage = (event) => {
      if (event.data.type === 'INITIAL_STATE' || event.data.type === 'UPDATE_STATE') {
        setMirrorState(event.data.data); // Update mirror state with the received data
        console.log("Mirror received state update:", event.data.data);
      }
      if (event.data.type === 'HOVER_CARD') {
        setHoveredCard(event.data.data); // Update hovered card when received
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const getCardImageSrc = (card) => {
    // Check if it's a token and use the correct field for token images
    if (card?.['tokenImg-src']) {
      return card['tokenImg-src']; // Return the token image
    }

    // For regular cards, use the cardImg-src field
    if (card?.['cardImg-src']) {
      return card['cardImg-src'];
    }

    // Fallback to card back if no image is available
    return `${process.env.PUBLIC_URL}/Magic_card_back.png`;
  };

  return (
    <div className="playmat">
      {/* Top-left block for card preview */}
      <div className="top-left-block" style={{ position: 'absolute', top: '20px', left: '20px', width: '250px', height: '350px' }}>
        {hoveredCard ? (
          <div className="preview-container" style={{ width: '100%', height: '100%' }}>
            <img
              src={getCardImageSrc(hoveredCard)} // Show hovered card image
              alt={hoveredCard.name}
              className="fixed-card-preview-image"
              style={{ width: '247px', height: '347px', objectFit: 'cover' }} // Fill the block with the image
            />
            {/* New text box for cardText */}
            <div className="card-text-box" style={{ marginTop: '10px', width: '100%', textAlign: 'center', padding: '10px', borderRadius: '5px' }}>
              <strong className="card-name">{hoveredCard.name}</strong>
              <p>{hoveredCard.cardText ? hoveredCard.cardText : "No card text available."}</p>
            </div>
          </div>
        ) : (
          'Hover over a card to preview'
        )}
      </div>

      <div className="bottom-container">
        {/* Deck Block */}
        <div className="deck-container">
          <p className="card-count">Cards Left: {mirrorState.cardCount}</p> {/* Use cardCount from mirrorState */}
          <div className="deck-block">
            <img
              src={`${process.env.PUBLIC_URL}/Magic_card_back.png`}
              alt="Magic Card Back"
              className="deck-image"
            />
          </div>
        </div>

        {/* Center block container with Hand and Large Block */}
        <div className="center-block-container">
          {/* Large Zone */}
          <div className="large-block">
            <div className="large-placeholder">Large Block</div>
            {mirrorState.largeZone.map((card, index) => {
              // Safely destructure and handle card data
              if (!card || !card.name) {
                console.warn(`Card is missing or undefined at index ${index}`);
                return null;
              }

              const { name, counters, position, id } = card;
              const isTapped = mirrorState.tappedCards?.[id] || false; // Access tappedCards from mirrorState, assume untapped if not found
              const { left = 0, right = 0 } = counters || {};
              const { x = 0, y = 0 } = position || {};

              // Apply offset ONLY when tapping occurs, but not during regular moves
              const calculatedX = isTapped ? x + tappedOffsetX : x;  // No extra offset during movement
              const calculatedY = isTapped ? y + tappedOffsetY : y;  // No extra offset during movement

              return (
                <div
                  key={index}
                  className="large-card-container"
                  style={{
                    position: 'absolute',
                    left: `${calculatedX}px`, // Calculated X based on tap state
                    top: `${calculatedY}px`, // Calculated Y based on tap state
                    transform: isTapped ? 'rotate(90deg)' : 'rotate(0deg)', // Rotate if tapped
                  }}
                >
                  <img
                    src={getCardImageSrc(card)} // Show the face-up image for cards on the playmat
                    alt={name}
                    className="playable-card"
                  />
                  {/* Counter Circles */}
                  <div className="counter-circle top-left white-background">
                    {left}
                  </div>
                  <div className="counter-circle top-right black-background">
                    {right}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hand */}
          <div className="hand-block">
            <div className="hand-cards">
              {/* Show card backs in the hand block on the mirror */}
              {mirrorState.hand.map((card, index) => (
                <img
                  key={index}
                  src={`${process.env.PUBLIC_URL}/Magic_card_back.png`} // Hand cards will always show the card back
                  alt="Card Back"
                  className="hand-card-image"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Exiled, Graveyard, and Commander Block */}
        <div className="right-block-container">
          {/* Exiled Zone */}
          <div className="exiled-block">
            <div className="exiled-placeholder">Exiled Cards</div>
            {mirrorState.exiled.map((card, index) => (
              <div
                key={index}
                className="exiled-card"
                style={{
                  position: 'absolute',
                  top: `30px`, // Adjust the stacking order
                  left: '1528px', // Adjust X position inside the container (no offset needed)
                  zIndex: index, // Stack cards based on their index
                }}
              >
                <img
                  src={getCardImageSrc(card)}
                  alt={card?.name || 'Card'}
                  className="playable-card"
                />
              </div>
            ))}
          </div>

          {/* Graveyard Zone */}
          <div className="graveyard-block">
            <div className="graveyard-placeholder">Graveyard</div>
            {mirrorState.graveyard.map((card, index) => (
              <div
                key={index}
                className="graveyard-card"
                style={{
                  position: 'absolute',
                  top: `-10px`, // Adjust the stacking order
                  left: '-105px', // Adjust X position inside the container (no offset needed)
                  zIndex: index, // Stack cards based on their index
                }}
              >
                <img
                  src={getCardImageSrc(card)}
                  alt={card?.name || 'Card'}
                  className="playable-card"
                />
              </div>
            ))}
          </div>

          {/* Commander Zone */}
          <div className="commander-block">
            {mirrorState.commanderZone ? (
              <div
                className="commander-card-container"
                style={{
                  position: 'absolute',
                  top: '20px', // Adjust as necessary
                  left: '20px', // Adjust as necessary
                  zIndex: 10000,
                }}
              >
                <img
                  src={getCardImageSrc(mirrorState.commanderZone)} // Fetch the correct image source
                  alt={mirrorState.commanderZone?.name || 'Commander'}
                  className="playable-card"
                />
              </div>
            ) : (
              <div className="commander-block-empty">
                Commander Zone
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaymatMirror;
