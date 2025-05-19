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
  const currentScores = loadHighScores();
  const newScore: HighScore = {
    score,
    date: new Date().toISOString(),
    gridSize,
    isTimed,
  };

  const updatedScores = [...currentScores, newScore].sort((a, b) => b.score - a.score);
  localStorage.setItem("gridpop-high-scores", JSON.stringify(updatedScores));
  return updatedScores;
} 
