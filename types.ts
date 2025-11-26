export enum GameState {
  MENU = 'MENU',
  LEVEL_SELECT = 'LEVEL_SELECT',
  PLAYING = 'PLAYING',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER'
}

export interface LevelData {
  id: number;
  name: string;
  grid: string[]; // Visual grid layout
  blockLimit: number; // Max blocks player can place
  par?: number;
}

export interface GameScore {
  levelId: number;
  completed: boolean;
  score: number;
}
