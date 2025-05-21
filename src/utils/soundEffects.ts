// Sound effect utility

// List of sound effects
export const SOUND_EFFECTS = {
  place: new Audio("/sounds/place.wav"),
  clear: new Audio("/sounds/clear.wav"),
  superClear: new Audio("/sounds/super_clear.wav"),
  gameOver: new Audio("/sounds/game_over.wav"),
  rotate: new Audio("/sounds/rotate.mp3"),
} as const;

// Initialize audio settings
Object.values(SOUND_EFFECTS).forEach((audio) => {
  audio.volume = 0.5;
});

// Sound control
let isMuted = false;

export const toggleMute = (): boolean => {
  isMuted = !isMuted;
  return isMuted;
};

export const playSound = (sound: keyof typeof SOUND_EFFECTS): void => {
  if (isMuted) return;

  const audio = SOUND_EFFECTS[sound];
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch((error) => {
      // Handle play() promise rejection - usually due to user not interacting with page yet
      console.warn("Audio play failed:", error);
    });
  }
};
