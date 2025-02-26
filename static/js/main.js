// Fantasy Dice Chamber - Main JS
// Handles page initialization, Socket.IO connection, and global events

// Connect to the SocketIO server
const socket = io();

// Store references to DOM elements
const characterInput = document.getElementById('character-name');
const resultsDiv = document.getElementById('results');
const diceContainer = document.getElementById('dice-container');

// Global state
let currentTheme = 'warhammer'; // Default to Warhammer theme
let isGMMode = false; // Track if we're in GM mode
let rollHistory = [];
let pendingRolls = {}; // Track pending rolls waiting for server results
let animationDelays = {
  'roll': 1500,    // Time before showing results (ms)
  'display': 500   // Additional delay for displaying in history
};

// Initialize on document load
document.addEventListener('DOMContentLoaded', function() {
  // Load saved character name from localStorage
  const savedName = localStorage.getItem('characterName');
  if (savedName) {
    characterInput.value = savedName;
  }
  
  // Save character name when changed
  characterInput.addEventListener('change', function() {
    localStorage.setItem('characterName', characterInput.value);
  });

  // Set initial theme (Warhammer by default)
  setTheme('warhammer');
  
  // Set up event listeners
  document.getElementById('roll-multi').addEventListener('click', rollMultiDice);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      setTheme(this.classList.contains('dnd') ? 'dnd' : 'warhammer');
    });
  });
  
  // Listen for Enter key in GM password field
  document.getElementById('gm-password').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      verifyGMPassword();
    }
  });
});

// Set theme (D&D or Warhammer)
function setTheme(theme) {
  document.documentElement.style.setProperty(
    '--theme-primary', 
    theme === 'dnd' ? 'var(--dnd-primary)' : 'var(--warhammer-primary)'
  );
  document.documentElement.style.setProperty(
    '--theme-secondary', 
    theme === 'dnd' ? 'var(--dnd-secondary)' : 'var(--warhammer-secondary)'
  );
  document.documentElement.style.setProperty(
    '--theme-accent', 
    theme === 'dnd' ? 'var(--dnd-accent)' : 'var(--warhammer-accent)'
  );
  
  // Update active button
  document.querySelector('.theme-btn.dnd').classList.toggle('active', theme === 'dnd');
  document.querySelector('.theme-btn.warhammer').classList.toggle('active', theme === 'warhammer');
  
  // Show appropriate roll set
  document.getElementById('dnd-rolls').classList.toggle('active', theme === 'dnd');
  document.getElementById('warhammer-rolls').classList.toggle('active', theme === 'warhammer');
  
  currentTheme = theme;
}

// Roll preset based on game system
function rollPreset(presetType) {
  if (currentTheme === 'dnd') {
    switch(presetType) {
      case 'attack':
        rollDice('d20', 'Attack Roll');
        break;
      case 'damage':
        rollMultipleDice(2, 'd6', 'Damage Roll');
        break;
      case 'saving':
        rollDice('d20', 'Saving Throw');
        break;
      case 'skill':
        rollDice('d20', 'Skill Check');
        break;
      case 'initiative':
        rollDice('d20', 'Initiative');
        break;
    }
  } else { // warhammer
    switch(presetType) {
      case 'characteristics':
        rollDice('d100', 'Characteristics Test');
        break;
      case 'hitloc':
        rollDice('d10', 'Hit Location');
        break;
      case 'wound':
        rollDice('d10', 'Wound Roll');
        break;
      case 'damage':
        rollDice('d10', 'Damage');
        break;
      case 'casting':
        rollMultipleDice(2, 'd10', 'Casting Roll');
        break;
    }
  }
}

// Roll a single die
function rollDice(diceType, rollType = null) {
  rollMultipleDice(1, diceType, rollType);
}

// Roll multiple dice of the same type
function rollMultiDice() {
  const count = parseInt(document.getElementById('dice-count').value) || 2;
  const diceType = document.getElementById('dice-type').value || 'd6';
  
  // Use the standard function to roll multiple dice
  rollMultipleDice(count, diceType);
}

// Roll GM dice
function rollGMDice() {
  if (!isGMMode) return;
  
  // Get selected dice type from buttons
  const diceType = document.querySelector('.dice-btn:focus')?.getAttribute('data-type') || 'd20';
  const isHidden = document.getElementById('hidden-roll-toggle').checked;
  
  const character = "Game Master";
  const rollId = generateRollId();
  
  // Clear previous dice
  while (diceContainer.firstChild) {
    diceContainer.removeChild(diceContainer.firstChild);
  }
  
  // Create dice based on type
  if (diceType === 'd100') {
    // Create d100 dice pair
    const tensDie = document.createElement('div');
    tensDie.className = `dice d100-tens rolling`;
    tensDie.style.left = '40%';
    tensDie.style.top = '50%';
    tensDie.style.transform = 'translate(-50%, -50%)';
    tensDie.dataset.rollId = rollId;
    diceContainer.appendChild(tensDie);
    
    const onesDie = document.createElement('div');
    onesDie.className = `dice d100-ones rolling`;
    onesDie.style.left = '60%';
    onesDie.style.top = '50%';
    onesDie.style.transform = 'translate(-50%, -50%)';
    onesDie.dataset.rollId = rollId;
    diceContainer.appendChild(onesDie);
    
    startDiceAnimation(rollId, [[tensDie, onesDie]], diceType);
    
    pendingRolls[rollId] = {
      diceType: diceType,
      diceElements: [[tensDie, onesDie]],
      count: 1
    };
  } else {
    // Create single die
    const diceDiv = document.createElement('div');
    diceDiv.className = `dice ${diceType} rolling`;
    diceDiv.style.left = '50%';
    diceDiv.style.top = '50%';
    diceDiv.style.transform = 'translate(-50%, -50%)';
    diceDiv.dataset.rollId = rollId;
    diceContainer.appendChild(diceDiv);
    
    startDiceAnimation(rollId, [diceDiv], diceType);
    
    pendingRolls[rollId] = {
      diceType: diceType,
      diceElements: [diceDiv],
      count: 1
    };
  }
  
  // Emit roll event with GM flags
  socket.emit('roll_dice', {
    dice_type: diceType,
    character: character,
    roll_type: "GM Roll",
    theme: currentTheme,
    roll_id: rollId,
    count: 1,
    is_gm_roll: true,
    is_hidden: isHidden
  });
}

// Roll multiple dice with specified parameters
function rollMultipleDice(count, diceType, rollType = null, isGMRoll = false, isHidden = false) {
  const character = characterInput.value.trim() || "Anonymous";
  const rollId = generateRollId();
  
  // Clear previous dice
  while (diceContainer.firstChild) {
    diceContainer.removeChild(diceContainer.firstChild);
  }
  
  const diceElements = [];
  
  // Special handling for d100
  if (diceType === 'd100') {
    // For d100, each roll needs a tens die and ones die
    for (let i = 0; i < count; i++) {
      const pair = createD100Dice(rollId, i);
      diceElements.push(pair);
    }
  } else {
    // For other dice types, create the requested number
    createRegularDice(count, diceType, rollId, diceElements);
  }
  
  // Start the animation
  for (let i = 0; i < diceElements.length; i++) {
    const element = diceElements[i];
    if (Array.isArray(element)) { // d100 pair
      startD100Animation(element[0], element[1]);
    } else {
      startDiceAnimation(element, diceType);
    }
  }
  
  // Store pending roll data
  pendingRolls[rollId] = {
    diceType: diceType,
    diceElements: diceElements,
    count: count,
    timestamp: Date.now()
  };
  
  // Emit roll event to server
  socket.emit('roll_dice', {
    dice_type: diceType,
    character: character,
    roll_type: rollType,
    theme: currentTheme,
    roll_id: rollId,
    count: count,
    is_gm_roll: isGMRoll,
    is_hidden: isHidden
  });
}

// Create dice elements for d100 (percentile dice)
function createD100Dice(rollId, index) {
  // Each d100 roll uses two dice (tens and ones)
  const pairContainer = document.createElement('div');
  pairContainer.className = 'd100-pair';
  pairContainer.style.position = 'absolute';
  pairContainer.style.left = '50%';
  pairContainer.style.top = '50%';
  pairContainer.style.transform = 'translate(-50%, -50%)';
  diceContainer.appendChild(pairContainer);
  
  // Create tens die (0-9, multiply by 10)
  const tensDie = document.createElement('div');
  tensDie.className = `dice d100-tens rolling`;
  tensDie.style.left = '-40px';
  tensDie.style.top = '0';
  tensDie.dataset.rollId = `${rollId}-${index}-tens`;
  tensDie.dataset.diceType = 'd100-tens';
  pairContainer.appendChild(tensDie);
  
  // Create ones die (0-9)
  const onesDie = document.createElement('div');
  onesDie.className = `dice d100-ones rolling`;
  onesDie.style.left = '40px';
  onesDie.style.top = '0';
  onesDie.dataset.rollId = `${rollId}-${index}-ones`;
  onesDie.dataset.diceType = 'd100-ones';
  pairContainer.appendChild(onesDie);
  
  return [tensDie, onesDie];
}

// Create regular (non-d100) dice
function createRegularDice(count, diceType, rollId, diceElements) {
  const spacing = 100 / (count + 1);
  
  for (let i = 0; i < count; i++) {
    const diceDiv = document.createElement('div');
    diceDiv.className = `dice ${diceType} rolling`;
    
    // Position dice evenly across container
    const position = (i + 1) * spacing;
    diceDiv.style.left = `${position}%`;
    diceDiv.style.top = '50%';
    diceDiv.style.transform = 'translate(-50%, -50%)';
    diceDiv.dataset.rollId = `${rollId}-${i}`;
    diceDiv.dataset.diceType = diceType;
    
    diceContainer.appendChild(diceDiv);
    diceElements.push(diceDiv);
  }
}

// Generate a unique ID for each roll
function generateRollId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// Start animation for d100 dice (tens and ones)
function startD100Animation(tensElement, onesElement) {
  const fps = 15;
  const duration = 3000; // 3 seconds
  const frames = duration / (1000 / fps);
  
  let currentFrame = 0;
  
  const interval = setInterval(() => {
    currentFrame++;
    
    // Random digits for each die (0-9)
    const tensDigit = Math.floor(Math.random() * 10);
    const onesDigit = Math.floor(Math.random() * 10);
    
    tensElement.textContent = tensDigit;
    onesElement.textContent = onesDigit;
    
    // Random rotation for realistic effect
    const tensAngle = Math.random() * 20 - 10;
    const onesAngle = Math.random() * 20 - 10;
    
    tensElement.style.transform = `rotate(${tensAngle}deg)`;
    onesElement.style.transform = `rotate(${onesAngle}deg)`;
    
    // Gradually slow down the animation
    if (currentFrame > frames * 0.8) {
      if (currentFrame % 2 !== 0) return;
    }
    if (currentFrame > frames * 0.9) {
      if (currentFrame % 3 !== 0) return;
    }
    
    // Stop animation after specified duration
    if (currentFrame >= frames) {
      clearInterval(interval);
    }
  }, 1000 / fps);
  
  return interval;
}

// Start animation for regular dice
// Fix the startDiceAnimation function
function startDiceAnimation(rollId, diceElements, diceType) {
  if (!diceElements || diceElements.length === 0) return;
  
  const fps = 12;
  let frame = 0;
  const maxFrames = 36; // 3 seconds of animation
  
  const interval = setInterval(() => {
    frame++;
    
    // Animate each die
    if (diceType === 'd100') {
      // D100 is special - we may have multiple pairs
      diceElements.forEach(dicePair => {
        const tensElement = dicePair[0];
        const onesElement = dicePair[1];
        
        // For d100, we randomly generate digits
        const tensDigit = Math.floor(Math.random() * 10);
        const onesDigit = Math.floor(Math.random() * 10);
        
        tensElement.textContent = tensDigit;
        onesElement.textContent = onesDigit;
        
        // Random position and rotation for realistic effect
        const tensAngle = Math.random() * 20 - 10;
        const onesAngle = Math.random() * 20 - 10;
        tensElement.style.transform = `translate(-50%, -50%) rotate(${tensAngle}deg)`;
        onesElement.style.transform = `translate(-50%, -50%) rotate(${onesAngle}deg)`;
      });
    } else {
      // For other dice types
      diceElements.forEach(diceEl => {
        // Calculate max value based on dice type
        let max = 6; // Default
        if (diceType === 'd4') max = 4;
        else if (diceType === 'd6') max = 6;
        else if (diceType === 'd8') max = 8;
        else if (diceType === 'd10') max = 10;
        else if (diceType === 'd12') max = 12;
        else if (diceType === 'd20') max = 20;
        
        const value = Math.floor(Math.random() * max) + 1;
        diceEl.textContent = value;
        
        // Random position and rotation for realistic effect
        const angle = Math.random() * 20 - 10;
        diceEl.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      });
    }
    
    // If animation runs for max frames, clear it
    if (frame >= maxFrames) {
      clearInterval(interval);
      
      if (diceType === 'd100') {
        diceElements.forEach(dicePair => {
          dicePair[0].classList.remove('rolling');
          dicePair[1].classList.remove('rolling');
        });
      } else {
        diceElements.forEach(diceEl => diceEl.classList.remove('rolling'));
      }
    }
  }, 1000 / fps);
  
  // Store the interval ID with the roll
  if (pendingRolls[rollId]) {
    pendingRolls[rollId].interval = interval;
  }
  
  return interval;
}

// Update the server handler to ensure dice results match
socket.on('dice_result', function(data) {
  // Check if it's a hidden GM roll
  if (data.is_hidden && !isGMMode) return;
  
  const baseRollId = data.roll_id && data.roll_id.toString().split('-')[0];
  
  if (baseRollId && pendingRolls[baseRollId]) {
    // If we have a pending animation for this roll, wait for it to finish
    // then update with real results
    if (pendingRolls[baseRollId].interval) {
      clearInterval(pendingRolls[baseRollId].interval);
    }
    
    setTimeout(() => {
      updateDiceWithResult(baseRollId, data);
      
      // After showing the result, display in history
      setTimeout(() => {
        displayResult(data);
      }, 500);
    }, 1000);
  } else {
    // Just display the result
    displayResult(data);
  }
});

// Toggle GM Mode
function toggleGMMode() {
  if (isGMMode) {
    // Already in GM mode, switch back to player mode
    isGMMode = false;
    document.getElementById('gm-mode-btn').classList.remove('active');
    document.getElementById('results-title').classList.remove('gm-mode');
    document.querySelector('.gm-controls').classList.remove('active');
    socket.emit('request_history'); // Get normal history
  } else {
    // Try to enter GM mode
    showGMPasswordModal();
  }
}

// Show GM password verification modal
function showGMPasswordModal() {
  const modalOverlay = document.getElementById('gm-modal-overlay');
  const passwordInput = document.getElementById('gm-password');
  const errorMsg = document.getElementById('password-error');
  
  // Reset input and error message
  passwordInput.value = '';
  errorMsg.classList.remove('visible');
  
  // Show the modal
  modalOverlay.classList.add('active');
  passwordInput.focus();
}

// Verify GM password
function verifyGMPassword() {
  const password = document.getElementById('gm-password').value;
  const errorMsg = document.getElementById('password-error');
  
  fetch('/gm-verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Password is correct, enter GM mode
      isGMMode = true;
      document.getElementById('gm-mode-btn').classList.add('active');
      document.getElementById('results-title').classList.add('gm-mode');
      document.querySelector('.gm-controls').classList.add('active');
      closeGMModal();
      
      // Join GM room for private rolls
      socket.emit('join_gm_room');
      // Request history including GM rolls
      socket.emit('request_history', { is_gm: true });
    } else {
      // Password is incorrect, show error
      errorMsg.classList.add('visible');
      document.getElementById('gm-password').focus();
    }
  })
  .catch(error => {
    console.error('Error verifying GM password:', error);
    errorMsg.classList.add('visible');
  });
}

// Close GM modal
function closeGMModal() {
  document.getElementById('gm-modal-overlay').classList.remove('active');
}

// Clear roll history
function clearHistory() {
  if (isGMMode) {
    if (confirm('Clear all roll history, including GM rolls?')) {
      socket.emit('clear_history', { is_gm: true });
    }
  } else {
    socket.emit('clear_history');
  }
}

// Socket event handlers
socket.on('connect', function() {
  // Request roll history when first connecting
  socket.emit('request_history');
});

socket.on('dice_result', function(data) {
  // Don't show hidden rolls if not in GM mode
  if (data.is_hidden && !isGMMode) return;
  
  // Update dice with actual result if roll ID matches a pending roll
  const baseRollId = data.roll_id && data.roll_id.toString().split('-')[0];
  if (baseRollId && pendingRolls[baseRollId]) {
    setTimeout(() => {
      updateDiceWithResult(baseRollId, data);
      
      // Display result after dice animation completes
      setTimeout(() => {
        displayResult(data);
      }, animationDelays.display);
    }, animationDelays.roll);
  } else {
    // Just display the result immediately if no animation is pending
    displayResult(data);
  }
});

socket.on('roll_history', function(history) {
  // Clear existing history
  while (resultsDiv.firstChild) {
    resultsDiv.removeChild(resultsDiv.firstChild);
  }
  
  // Display history in reverse order (newest first)
  history.reverse().forEach(data => {
    displayResult(data, false);
  });
  
  rollHistory = history;
});

// Update dice with actual results from server
function updateDiceWithResult(rollId, data) {
  const pendingRoll = pendingRolls[rollId];
  if (!pendingRoll) return;
  
  const diceType = data.dice_type;
  const diceElements = pendingRoll.diceElements;
  
  // For d100, update both tens and ones dice
  if (diceType === 'd100' && data.tens_die !== undefined && data.ones_die !== undefined) {
    const d100Pair = diceElements[0]; // Get first pair
    if (!d100Pair) return;
    
    const [tensElement, onesElement] = d100Pair;
    
    tensElement.textContent = data.tens_die;
    onesElement.textContent = data.ones_die;
    
    tensElement.classList.remove('rolling');
    onesElement.classList.remove('rolling');
  } 
  // For regular dice, update each die with its result
  else if (data.dice_results && data.dice_results.length > 0) {
    diceElements.forEach((diceEl, i) => {
      if (i < data.dice_results.length) {
        diceEl.textContent = data.dice_results[i].result;
        diceEl.classList.remove('rolling');
      }
    });
  } 
  // Fallback for single dice
  else if (diceElements.length > 0) {
    const diceEl = diceElements[0];
    diceEl.textContent = data.result;
    diceEl.classList.remove('rolling');
  }
  
  // Clean up after a delay
  setTimeout(() => {
    delete pendingRolls[rollId];
  }, 3000);
}

// Display a roll result in the history
function displayResult(data, animate = true) {
  const resultDiv = document.createElement('div');
  resultDiv.className = `result-item ${data.theme || currentTheme}`;
  
  // Add GM roll class if applicable
  if (data.is_gm_roll) {
    resultDiv.classList.add('gm-roll');
  }
  
  // Add result-reveal class for animation if requested
  if (animate) {
    resultDiv.classList.add('result-reveal');
  }
  
  let resultText = '';
  
  // Format based on roll type
  if (data.roll_type) {
    resultText = `<strong>${data.character}</strong>'s ${data.roll_type}: `;
  } else {
    resultText = `<strong>${data.character}</strong> rolled `;
  }
  
  // Special handling for d100
  if (data.dice_type === 'd100' && data.tens_die !== undefined && data.ones_die !== undefined) {
    resultText += `<span class="dice-result ${data.dice_type}">${data.result}</span>`;
  } 
  // Special handling for multiple dice
  else if (data.dice_results && data.dice_results.length > 1) {
    resultText += `<span class="dice-result ${data.dice_type}">`;
    
    // Get total if available
    if (data.total !== undefined) {
      resultText += `${data.total} (`;
    }
    
    // Show individual dice results
    const results = data.dice_results.map(r => r.result).join(', ');
    resultText += results;
    
    if (data.total !== undefined) {
      resultText += ')';
    }
    
    resultText += '</span>';
  } 
  // Standard single die
  else {
    resultText += `<span class="dice-result ${data.dice_type}">${data.result}</span>`;
  }
  
  // Add on dice type if no roll type specified
  if (!data.roll_type) {
    resultText += ` on ${data.dice_type}`;
  }
  
  // Add timestamp if available
  if (data.timestamp) {
    const timestamp = new Date(data.timestamp);
    resultText += `<span class="timestamp">${timestamp.toLocaleTimeString()}</span>`;
  }
  
  resultDiv.innerHTML = resultText;
  resultsDiv.prepend(resultDiv);
  
  // Limit the number of results shown in UI
  if (resultsDiv.children.length > 20) {
    resultsDiv.removeChild(resultsDiv.lastChild);
  }
}