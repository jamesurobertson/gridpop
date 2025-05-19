import { HighScore } from "@/types/game";

export function loadHighScores(): HighScore[] {
  const savedScores = localStorage.getItem("gridpop-high-scores");
  if (savedScores) {
    try {
      return JSON.parse(savedScores);
    } catch (e) {
      console.error("Failed to parse saved high scores:", e);
    }
  }
  return [];
}

export function saveHighScore(score: number, gridSize: 4 | 5, isTimed: boolean): HighScore[] {
  // Don't save zero scores
  if (score === 0) return loadHighScores();

  const currentScores = loadHighScores();
  const newScore: HighScore = {
    score,
    date: new Date().toISOString(),
    gridSize,
    isTimed,
  };

  // Filter scores for the current game mode
  const otherModeScores = currentScores.filter(
    s => s.gridSize !== gridSize || s.isTimed !== isTimed
  );

  // Get scores for current game mode
  const currentModeScores = currentScores.filter(
    s => s.gridSize === gridSize && s.isTimed === isTimed
  );

  // Add new score and sort
  const updatedModeScores = [...currentModeScores, newScore]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Keep only top 5

  // Combine with other mode scores
  const updatedScores = [...otherModeScores, ...updatedModeScores];

  localStorage.setItem("gridpop-high-scores", JSON.stringify(updatedScores));
  return updatedScores;
} 
