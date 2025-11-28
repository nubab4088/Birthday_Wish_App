// DOM Elements
const initialScreen = document.getElementById('initialScreen');
const celebrationScreen = document.getElementById('celebrationScreen');
const pixelCake = document.getElementById('pixelCake');
const startButton = document.getElementById('startButton');
const volumeIndicator = document.querySelector('.volume-indicator');
const volumeFill = document.getElementById('volumeFill');
const volumeText = document.getElementById('volumeText');
const errorMessage = document.getElementById('errorMessage');
const birthdayCard = document.getElementById('birthdayCard');
const cardModal = document.getElementById('cardModal');
const closeCardModal = document.getElementById('closeCardModal');
const backgroundMusic = document.getElementById('backgroundMusic');

// Audio Context
let audioContext;
let analyser;
let microphone;
let animationFrame;
let hasCelebrated = false;
let stream = null;

// Constants
const BLOW_THRESHOLD = 0.15;
const HOLD_DURATION = 400;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  console.log('Pixel cake element:', pixelCake);
  
  // Click cake to start
  if (pixelCake) {
    pixelCake.addEventListener('click', handleCakeClick);
    console.log('Cake click handler attached');
  } else {
    console.error('Pixel cake element not found!');
  }
  
  // Start button (backup)
  startButton.addEventListener('click', handleStart);
  
  // Card interactions
  birthdayCard.addEventListener('click', handleCardClick);
  closeCardModal.addEventListener('click', () => {
    cardModal.hidden = true;
    cardFlipCount = 0; // Reset on close
  });
  cardModal.addEventListener('click', (e) => {
    if (e.target === cardModal || e.target.classList.contains('card-modal__overlay')) {
      cardModal.hidden = true;
      cardFlipCount = 0; // Reset on close
    }
  });
  
  // Try to play background music (may require user interaction)
  backgroundMusic.volume = 0.3;
  
  // Create initial screen particles
  createInitialParticles();
});

function handleCakeClick() {
  if (startButton.classList.contains('button--hidden')) {
    startButton.classList.remove('button--hidden');
    startButton.textContent = 'Start the celebration';
  }
  handleStart();
}

async function handleStart() {
  startButton.disabled = true;
  startButton.textContent = 'Requesting microphone access...';
  errorMessage.hidden = true;

  // Try to play background music
  try {
    await backgroundMusic.play();
  } catch (err) {
    console.log('Background music requires user interaction');
  }

  if (!audioContext) {
    const success = await requestMicrophone();
    if (!success) {
      return;
    }
  }

  hasCelebrated = false;
  volumeIndicator.hidden = false; // Show volume indicator after clicking cake
  startButton.hidden = true; // Hide the start button completely
  startButton.textContent = 'Listening... blow the candle!';

  listenForBlow();
}

async function requestMicrophone() {
  try {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      throw new Error('HTTPS_REQUIRED');
    }

    stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    microphone = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.3;
    microphone.connect(analyser);
    
    errorMessage.hidden = true;
    return true;
  } catch (error) {
    console.error('Microphone error:', error);
    let errorMsg = 'Could not access microphone. ';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMsg += 'Please allow microphone access and try again.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMsg += 'No microphone found. Please connect a microphone.';
    } else if (error.message === 'HTTPS_REQUIRED') {
      errorMsg += 'This app requires HTTPS or localhost. For local testing, use: python3 -m http.server (then visit http://localhost:8000)';
    } else {
      errorMsg += error.message || 'Unknown error occurred.';
    }
    
    errorMessage.textContent = errorMsg;
    errorMessage.hidden = false;
    startButton.textContent = 'Try again';
    startButton.disabled = false;
    startButton.classList.add('button--error');
    return false;
  }
}

function computeVolume() {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const sample = data[i] / 128 - 1;
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / data.length);
  return Math.min(rms * 2, 1);
}

let holdTimer = null;

function listenForBlow() {
  if (!analyser) return;

  const volume = computeVolume();
  const isBlowing = volume > BLOW_THRESHOLD;

  // Update visual feedback
  const volumePercent = Math.min(volume * 100, 100);
  volumeFill.style.width = `${volumePercent}%`;
  
  if (volumePercent < 20) {
    volumeText.textContent = 'Blow gently toward your microphone...';
  } else if (volumePercent < 50) {
    volumeText.textContent = 'Keep blowing! 💨';
  } else if (volumePercent < 80) {
    volumeText.textContent = 'Almost there! Blow harder! 🔥';
  } else {
    volumeText.textContent = 'Great! Hold it... 🎂';
  }

  if (isBlowing && !holdTimer) {
    holdTimer = setTimeout(triggerCelebration, HOLD_DURATION);
  }

  if (!isBlowing && holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  animationFrame = requestAnimationFrame(listenForBlow);
}

function triggerCelebration() {
  if (hasCelebrated) return;
  hasCelebrated = true;

  // Stop listening
  cancelAnimationFrame(animationFrame);
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  // Hide initial screen
  initialScreen.style.opacity = '0';
  setTimeout(() => {
    initialScreen.hidden = true;
    
    // Show celebration screen
    celebrationScreen.hidden = false;
    celebrationScreen.style.opacity = '0';
    setTimeout(() => {
      celebrationScreen.style.opacity = '1';
      
      // Attach letter click handler AFTER celebration screen is shown
      attachLetterClickHandler();
    }, 50);
  }, 800);

  // Play celebration sound
  const wish = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_7c90ed2050.mp3');
  wish.volume = 0.5;
  wish.play().catch((err) => {
    console.log('Celebration sound failed:', err);
  });

  // Re-enable button for another try (hidden in celebration screen)
  setTimeout(() => {
    startButton.disabled = false;
    startButton.textContent = 'Start again';
    startButton.classList.remove('button--error');
    audioContext = null;
  }, 3000);
}

// Function to attach letter click handler
function attachLetterClickHandler() {
  const handwrittenLetter = document.getElementById('handwrittenLetter');
  const letterTeaser = document.getElementById('letterTeaser');
  const letterMessage = document.getElementById('letterMessage');

  console.log('Attaching letter click handler');
  console.log('Letter element:', handwrittenLetter);
  console.log('Letter teaser:', letterTeaser);
  console.log('Letter message:', letterMessage);

  if (handwrittenLetter) {
    // Remove any existing listener first
    handwrittenLetter.replaceWith(handwrittenLetter.cloneNode(true));
    const newLetter = document.getElementById('handwrittenLetter');
    
    newLetter.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Letter clicked!');
      
      const teaser = document.getElementById('letterTeaser');
      const message = document.getElementById('letterMessage');
      
      if (teaser && message) {
        if (message.hidden) {
          // Show the message
          console.log('Expanding letter...');
          teaser.hidden = true;
          message.hidden = false;
          newLetter.classList.add('letter-expanded');
        } else {
          // Hide the message
          console.log('Collapsing letter...');
          teaser.hidden = false;
          message.hidden = true;
          newLetter.classList.remove('letter-expanded');
        }
      }
    });
    
    console.log('Letter click handler attached successfully!');
  } else {
    console.error('Letter element not found!');
  }
  
  // Attach gift box click handler here after celebration screen is shown
  const giftBox = document.getElementById('giftBox');
  const pixelChicken = document.getElementById('pixelChicken');
  const chickenNote = document.getElementById('chickenNote');

  console.log('Attaching gift box click handler');
  console.log('Gift box element:', giftBox);
  console.log('Pixel chicken element:', pixelChicken);
  console.log('Chicken note element:', chickenNote);

  if (giftBox && pixelChicken && chickenNote) {
    giftBox.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Gift box clicked!');
      
      // Show chicken and note with animation
      pixelChicken.hidden = false;
      chickenNote.hidden = false;
      
      // Add appear animation classes
      pixelChicken.classList.add('chicken-appear');
      chickenNote.classList.add('note-appear');
      
      console.log('Chicken and note revealed!');
    });
    
    console.log('Gift box click handler attached successfully!');
  } else {
    console.error('Gift box elements not found!');
  }
}

let cardFlipCount = 0;

function handleCardClick(e) {
  e.stopPropagation();
  
  // First click: flip the card on table
  if (cardFlipCount === 0) {
    birthdayCard.classList.add('flipped');
    cardFlipCount = 1;
    return;
  }
  
  // Second click: open zoomed modal
  if (cardFlipCount === 1) {
    cardModal.hidden = false;
    const modalCard = cardModal.querySelector('.card-modal__card');
    
    // Start with current flip state, then show inside
    if (birthdayCard.classList.contains('flipped')) {
      modalCard.classList.add('flipped');
    } else {
      modalCard.classList.remove('flipped');
      setTimeout(() => {
        modalCard.classList.add('flipped');
      }, 500);
    }
  }
}

// Add some interactivity to photo frames
document.querySelectorAll('.photo-frame').forEach((frame, index) => {
  frame.addEventListener('click', () => {
    frame.style.animation = 'none';
    setTimeout(() => {
      frame.style.animation = 'photoShake 0.5s ease';
    }, 10);
  });
});

// Ensure photo images load and are visible; fallback to adi1 if missing
document.querySelectorAll('.photo-frame__photo img').forEach((img) => {
  // Force reload to ensure images are loaded
  const originalSrc = img.src;
  img.style.opacity = '0';
  
  img.addEventListener('load', () => {
    console.log('Photo loaded successfully:', img.src);
    img.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    img.style.opacity = '1';
    // ensure parent frame visible
    const frame = img.closest('.photo-frame');
    if (frame) {
      frame.style.display = 'block';
      frame.style.opacity = '1';
    }
  });
  
  img.addEventListener('error', () => {
    console.error('Photo failed to load:', img.src);
    console.warn('Trying fallback image...');
    // Try different extensions
    if (img.src.includes('.jpeg')) {
      img.src = img.src.replace('.jpeg', '.jpg');
    } else if (img.src.includes('.jpg')) {
      img.src = 'photo/adi1.jpeg';
    } else {
      img.src = 'photo/adi1.jpeg';
    }
  });
  
  // Trigger load by setting src
  if (originalSrc) {
    img.src = originalSrc;
  }
});

// Make the handwritten note clickable to open the letter (card modal)
const handwrittenNote = document.querySelector('.handwritten-note');
if (handwrittenNote) {
  // Removed click handler - note is no longer linked
  /*
  handwrittenNote.addEventListener('click', (e) => {
    e.stopPropagation();
    // If celebration screen is hidden, transition to it
    if (celebrationScreen.hidden) {
      initialScreen.hidden = true;
      celebrationScreen.hidden = false;
      celebrationScreen.style.opacity = '1';
    }

    // Open the card modal showing the inside
    if (cardModal) {
      cardModal.hidden = false;
      const modalCard = cardModal.querySelector('.card-modal__card');
      if (modalCard) {
        // show inside of the card
        modalCard.classList.add('flipped');
      }
    }
  });
  */
}

// Add photo shake animation
const style = document.createElement('style');
style.textContent = `
  @keyframes photoShake {
    0%, 100% { transform: rotate(0deg) translateY(0); }
    25% { transform: rotate(-5deg) translateY(-5px); }
    75% { transform: rotate(5deg) translateY(-5px); }
  }
`;
document.head.appendChild(style);

// Create celebration particles on celebration screen
function createCelebrationParticles() {
  const celebScreen = document.querySelector('.screen--celebration');
  if (!celebScreen) return;

  // Create particles container
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'celebration-particles';
  celebScreen.appendChild(particlesContainer);

  // Create floating confetti particles
  const particleTypes = ['circle', 'star', 'heart'];
  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const type = particleTypes[Math.floor(Math.random() * particleTypes.length)];
    particle.className = `particle particle--${type}`;
    
    // Random positioning
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 8 + 's';
    particle.style.animationDuration = (8 + Math.random() * 4) + 's';
    
    particlesContainer.appendChild(particle);
  }

  // Create light orbs
  for (let i = 0; i < 3; i++) {
    const orb = document.createElement('div');
    orb.className = 'light-orb';
    celebScreen.appendChild(orb);
  }

  // Create sparkles
  const sparkleCount = 20;
  for (let i = 0; i < sparkleCount; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = Math.random() * 100 + '%';
    sparkle.style.top = Math.random() * 100 + '%';
    sparkle.style.animationDelay = Math.random() * 3 + 's';
    celebScreen.appendChild(sparkle);
  }
}

// Create initial screen particles
function createInitialParticles() {
  const initialScr = document.querySelector('.screen--initial');
  if (!initialScr) return;

  // Create particles container
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'initial-particles';
  initialScr.appendChild(particlesContainer);

  // Create floating particles
  const particleTypes = ['star', 'circle', 'diamond'];
  const particleCount = 25;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const type = particleTypes[Math.floor(Math.random() * particleTypes.length)];
    particle.className = `floating-particle floating-particle--${type}`;
    
    // Random positioning
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 10 + 's';
    particle.style.animationDuration = (10 + Math.random() * 5) + 's';
    
    particlesContainer.appendChild(particle);
  }

  // Create ambient orbs
  for (let i = 1; i <= 3; i++) {
    const orb = document.createElement('div');
    orb.className = `ambient-orb ambient-orb--${i}`;
    initialScr.appendChild(orb);
  }

  // Create twinkling stars
  const starCount = 30;
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'twinkle-star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    initialScr.appendChild(star);
  }
}

// Initialize celebration animations when celebration screen is shown
const celebrationScreenElement = document.querySelector('.screen--celebration');
if (celebrationScreenElement) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'hidden') {
        if (!celebrationScreenElement.hasAttribute('hidden')) {
          // Screen is now visible
          if (!celebrationScreenElement.querySelector('.celebration-particles')) {
            createCelebrationParticles();
          }
        }
      }
    });
  });

  observer.observe(celebrationScreenElement, { attributes: true });
  
  // Also check if it's already visible
  if (!celebrationScreenElement.hasAttribute('hidden')) {
    createCelebrationParticles();
  }
}
