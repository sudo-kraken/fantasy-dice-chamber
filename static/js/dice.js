// Connect to the Socket.IO server
const socket = io();

// Get DOM elements
const diceContainer = document.getElementById('dice-container');
const resultsDiv = document.getElementById('results');
const characterInput = document.getElementById('character-name');

// Set default theme to warhammer
let currentTheme = 'warhammer';
let isGMMode = false;

// Track pending rolls and their animations
let pendingRolls = {};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Load saved character name
  const savedName = localStorage.getItem('characterName');
  if (savedName) {
    characterInput.value = savedName;
  }
  
  // Save character name when changed
  characterInput.addEventListener('change', function() {
    localStorage.setItem('characterName', characterInput.value);
  });
  
  // Set initial theme
  setTheme('warhammer');
  
  // Listen for Enter key in GM password field
  document.getElementById('gm-password').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      verifyGMPassword();
    }
  });
  
  // Request roll history
  socket.emit('request_history');
});

// Set the game theme
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
  
  // Update buttons and display
  document.querySelector('.theme-btn.dnd').classList.toggle('active', theme === 'dnd');
  document.querySelector('.theme-btn.warhammer').classList.toggle('active', theme === 'warhammer');
  
  document.getElementById('dnd-rolls').classList.toggle('active', theme === 'dnd');
  document.getElementById('warhammer-rolls').classList.toggle('active', theme === 'warhammer');
  
  currentTheme = theme;
}

// Standardize dice creation and storage
function rollDice(diceType, rollType = null) {
  const character = characterInput.value.trim() || "Anonymous";
  const rollId = generateRollId();
  
  // Clear previous dice
  while (diceContainer.firstChild) {
    diceContainer.removeChild(diceContainer.firstChild);
  }
  
  if (diceType === 'd100') {
    // Create d100 dice (tens and ones)
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
    
    // Start animation AND STORE INTERVAL
    const interval = startD100Animation(tensDie, onesDie);
    
    // Store pending roll WITH INTERVAL
    pendingRolls[rollId] = {
      diceType: diceType,
      tensDie: tensDie,
      onesDie: onesDie,
      interval: interval  // Save the interval
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
    
    // Start animation AND STORE INTERVAL
    const interval = startDiceAnimation(diceDiv, diceType);
    
    // Store pending roll WITH INTERVAL
    pendingRolls[rollId] = {
      diceType: diceType,
      diceEl: diceDiv,
      interval: interval  // Save the interval
    };
  }
  
  // Send roll request to server
  socket.emit('roll_dice', {
    dice_type: diceType,
    character: character,
    roll_type: rollType,
    theme: currentTheme,
    roll_id: rollId,
    is_gm_roll: false    // Based on checkbox
  });
}

// Handle preset rolls
function rollPreset(presetType) {
  if (currentTheme === 'dnd') {
    switch(presetType) {
      case 'attack':
        rollDice('d20', 'Attack Roll');
        break;
      case 'damage':
        rollDice('d6', 'Damage Roll');
        break;
      case 'saving':
        rollDice('d20', 'Saving Throw');
        break;
      case 'skill':
        rollDice('d20', 'Skill Check');
        break;
      case 'initiative':
        rollDice('d20', 'Initiative Roll');
        break;
    }
  } else { // Warhammer
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
        rollDice('d10', 'Damage Roll');
        break;
      case 'casting':
        rollDice('d10', 'Casting Roll');
        break;
    }
  }
}

// Generate a unique ID for each roll
function generateRollId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// Standardize animation functions
function startDiceAnimation(diceEl, diceType) {
  const fps = 15;
  const duration = 2000; // 2 seconds
  const frames = duration / (1000 / fps);
  
  let currentFrame = 0;
  let max = 6; // Default
  
  // Set max value based on dice type
  if (diceType === 'd4') max = 4;
  else if (diceType === 'd6') max = 6;
  else if (diceType === 'd8') max = 8;
  else if (diceType === 'd10') max = 10;
  else if (diceType === 'd12') max = 12;
  else if (diceType === 'd20') max = 20;
  
  const interval = setInterval(() => {
    currentFrame++;
    
    // Random dice value
    const value = Math.floor(Math.random() * max) + 1;
    diceEl.textContent = value;
    
    // Random rotation for realistic effect
    const angle = Math.random() * 20 - 10;
    diceEl.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    
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

// Fixed startD100Animation - save intervals for proper cleanup
function startD100Animation(tensElement, onesElement) {
  const fps = 15;
  const duration = 2000; // 2 seconds
  const frames = duration / (1000 / fps);
  
  let currentFrame = 0;
  
  const interval = setInterval(() => {
    currentFrame++;
    
    // Random digits
    const tensDigit = Math.floor(Math.random() * 10);
    const onesDigit = Math.floor(Math.random() * 10);
    
    tensElement.textContent = tensDigit;
    onesElement.textContent = onesDigit;
    
    // Random rotation for realistic effect
    const tensAngle = Math.random() * 20 - 10;
    const onesAngle = Math.random() * 20 - 10;
    
    tensElement.style.transform = `translate(-50%, -50%) rotate(${tensAngle}deg)`;
    onesElement.style.transform = `translate(-50%, -50%) rotate(${onesAngle}deg)`;
    
    // Stop animation after specified duration
    if (currentFrame >= frames) {
      clearInterval(interval);
    }
  }, 1000 / fps);
  
  // Return the interval so we can store it
  return interval;
}

// Roll GM dice
function rollGMDice() {
  if (!isGMMode) return;
  
  // Declare before using
  const isHidden = document.getElementById('hidden-roll-toggle').checked;
  console.log("Sending GM roll with isHidden:", isHidden);
  
  const character = "Game Master";
  const rollId = generateRollId();
  
  // Default to d20 if no die is selected
  let diceType = 'd20';
  
  // Try to get last clicked die type
  const lastClickedDie = document.querySelector('.dice-btn:focus');
  if (lastClickedDie) {
    diceType = lastClickedDie.classList[1]; // e.g., "d6"
  }
  
  // Clear dice container
  while (diceContainer.firstChild) {
    diceContainer.removeChild(diceContainer.firstChild);
  }
  
  // Create appropriate dice
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
    
    // Start animation AND CAPTURE THE INTERVAL
    const interval = startD100Animation(tensDie, onesDie);
    
    // Store pending roll WITH INTERVAL
    pendingRolls[rollId] = {
      diceType: diceType,
      tensDie: tensDie,
      onesDie: onesDie,
      interval: interval  // Store the interval
    };
  } else {
    // Create single die
    const diceEl = document.createElement('div');
    diceEl.className = `dice ${diceType} rolling`;
    diceEl.style.left = '50%';
    diceEl.style.top = '50%';
    diceEl.style.transform = 'translate(-50%, -50%)';
    diceEl.dataset.rollId = rollId;
    diceContainer.appendChild(diceEl);
    
    // Start animation AND CAPTURE THE INTERVAL
    const interval = startDiceAnimation(diceEl, diceType);
    
    // Store pending roll WITH INTERVAL
    pendingRolls[rollId] = {
      diceType: diceType,
      diceEl: diceEl,
      interval: interval  // Store the interval
    };
  }
  
  // Send the roll to the server with CORRECT PARAMETERS
  socket.emit('roll_dice', {
    dice_type: diceType,
    character: character,
    roll_type: "GM Roll",
    theme: currentTheme,
    roll_id: rollId,
    is_gm_roll: true,   // Always true for GM rolls
    is_hidden: isHidden  // Based on checkbox
  });
}

// Consistent update of dice with results
function updateDiceWithResult(rollId, data) {
  const pendingRoll = pendingRolls[rollId];
  if (!pendingRoll) return;
  
  console.log("Updating dice with result:", data);
  
  if (data.dice_type === 'd100') {
    // For d100, update both dice with correct tens and ones digits
    if (pendingRoll.tensDie && pendingRoll.onesDie) {
      // Log what we're updating to help debug
      console.log(`Updating d100 dice: tens=${data.tens_die}, ones=${data.ones_die}`);
      
      // Display tens die as 10, 20, 30, etc. instead of 1, 2, 3
      pendingRoll.tensDie.textContent = data.tens_die * 10;
      pendingRoll.onesDie.textContent = data.ones_die;
      
      pendingRoll.tensDie.classList.remove('rolling');
      pendingRoll.onesDie.classList.remove('rolling');
      
      pendingRoll.tensDie.classList.add('result-shown');
      pendingRoll.onesDie.classList.add('result-shown');
    }
  } else {
    // For regular dice, show the exact result value
    if (pendingRoll.diceEl) {
      // Log what we're updating to help debug
      console.log(`Updating ${data.dice_type} die: result=${data.result}`);
      
      pendingRoll.diceEl.textContent = data.result;
      pendingRoll.diceEl.classList.remove('rolling');
      pendingRoll.diceEl.classList.add('result-shown');
    }
  }
  
  // Clean up after a delay
  setTimeout(() => {
    delete pendingRolls[rollId];
  }, 3000);
}

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

// Fix socket event handler for dice results
socket.on('dice_result', function(data) {
  console.log("Received dice result:", data);
  console.log("is_gm_roll:", data.is_gm_roll, "is_hidden:", data.is_hidden, "isGMMode:", isGMMode);
  // Skip if it's a hidden GM roll and we're not in GM mode
  if (data.is_hidden && !isGMMode) return;
  
  const baseRollId = data.roll_id && data.roll_id.toString();
  
  if (baseRollId && pendingRolls[baseRollId]) {
    console.log("Found pending roll, updating dice");
    
    // IMMEDIATELY clear any ongoing animation
    if (pendingRolls[baseRollId].interval) {
      clearInterval(pendingRolls[baseRollId].interval);
      pendingRolls[baseRollId].interval = null;
    }
    
    // Use a slightly longer delay to ensure animation has visually stopped
    setTimeout(() => {
      updateDiceWithResult(baseRollId, data);
      
      // Display result after update is complete
      setTimeout(() => {
        displayResult(data);
      }, 500);
    }, 2000); // Increased from 1500ms to 2000ms
  } else {
    console.log("No pending roll found, just displaying result");
    displayResult(data);
  }
});

// Handle errors
socket.on('dice_error', function(data) {
  console.error('Dice roll error:', data);
  // Clean up any pending rolls
  if (data.roll_id && pendingRolls[data.roll_id]) {
    if (pendingRolls[data.roll_id].interval) {
      clearInterval(pendingRolls[data.roll_id].interval);
    }
    delete pendingRolls[data.roll_id];
  }
});

// Request roll history when first connecting
socket.on('connect', function() {
  socket.emit('request_history', { is_gm: isGMMode });
});

// Receive roll history
socket.on('roll_history', function(history) {
  // Clear existing history
  while (resultsDiv.firstChild) {
    resultsDiv.removeChild(resultsDiv.firstChild);
  }
  
  // Display history (newest first)
  history.forEach(data => {
    displayResult(data, false);
  });
  
  rollHistory = history;
});

// Display a roll result
function displayResult(data, animate) {
  // Skip GM rolls when not in GM mode
  if (data.is_hidden && !isGMMode) return;
  
  const resultDiv = document.createElement('div');
  resultDiv.className = `result-item ${data.theme || currentTheme}`;
  
  // Add GM roll class if applicable
  if (data.is_gm_roll) {
    resultDiv.classList.add('gm-roll');
  }
  
  // Add reveal animation class if needed
  if (animate) {
    resultDiv.classList.add('result-reveal');
  }
  
  let resultText;
  // Get the actual result from the data
  const result = data.result; // Use the actual result field
  
  // Build the result text differently based on dice type and count
  if (data.dice_type === 'd100') {
    if (data.roll_type) {
      resultText = `<strong>${data.character}</strong>'s ${data.roll_type}: <span class="dice-result ${data.dice_type}">${result}</span>`;
    } else {
      resultText = `<strong>${data.character}</strong> rolled a <span class="dice-result ${data.dice_type}">${result}</span> on ${data.dice_type}`;
    }
  } else {
    // Single die or other dice types
    if (data.roll_type) {
      resultText = `<strong>${data.character}</strong>'s ${data.roll_type}: <span class="dice-result ${data.dice_type}">${result}</span>`;
    } else {
      resultText = `<strong>${data.character}</strong> rolled a <span class="dice-result ${data.dice_type}">${result}</span> on ${data.dice_type}`;
    }
  }
  
  // Add timestamp
  if (data.timestamp) {
    const timestamp = new Date(data.timestamp);
    resultText += `<span class="timestamp">${timestamp.toLocaleTimeString()}</span>`;
  }
  
  resultDiv.innerHTML = resultText;
  resultsDiv.prepend(resultDiv);
  
  // Limit the number of results shown
  if (resultsDiv.children.length > 20) {
    resultsDiv.removeChild(resultsDiv.lastChild);
  }
}

// Clear history
function clearHistory() {
  socket.emit('clear_history', { is_gm: isGMMode });
}

// Handle keypress in password input
function handlePasswordKeypress(event) {
  if (event.key === "Enter") {
    verifyGMPassword();
  }
}

// Initialize character name from localStorage
document.addEventListener('DOMContentLoaded', function() {
  // Set Warhammer as the default theme
  setTheme('warhammer');
  
  // Load character name from localStorage
  const savedName = localStorage.getItem('characterName');
  if (savedName) {
    characterInput.value = savedName;
  }
  
  // Save character name when changed
  characterInput.addEventListener('change', function() {
    localStorage.setItem('characterName', characterInput.value);
  });
  
  // Add data-tooltip attributes to dice buttons
  document.querySelectorAll('.dice-btn').forEach(btn => {
    const diceType = btn.classList[1]; // d4, d6, etc.
    let sides = diceType.substring(1); // 4, 6, etc.
    btn.setAttribute('data-tooltip', `Roll a ${sides}-sided die`);
  });
  
  // Setup GM password modal event listeners
  document.getElementById('gm-password').addEventListener('keypress', handlePasswordKeypress);
  document.getElementById('cancel-btn').addEventListener('click', closeGMModal);
  document.getElementById('submit-btn').addEventListener('click', verifyGMPassword);
  
  // Add roll multi handler
  document.getElementById('roll-multi').addEventListener('click', function() {
    const count = parseInt(document.getElementById('dice-count').value) || 1;
    const selectedDie = document.querySelector('input[name="dice-type"]:checked').value;
    rollMultipleDice(count, selectedDie);
  });
  
  // GM mode button handler
  document.getElementById('gm-mode-btn').addEventListener('click', toggleGMMode);
});