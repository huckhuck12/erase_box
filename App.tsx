import React, { useState } from 'react';
import Game from './components/Game';
import GameModal from './components/GameOverModal';
import { GameState } from './types';
import { LEVELS } from './constants';

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(1);
  const [modalData, setModalData] = useState<{type: 'WIN'|'LOSE', title: string, message: string} | null>(null);

  const startLevel = (levelId: number) => {
    if (levelId > unlockedLevels) return;
    setCurrentLevelId(levelId);
    setGameState(GameState.PLAYING);
    setModalData(null);
  };

  const handleLevelComplete = (coins: number) => {
    setGameState(GameState.LEVEL_COMPLETE);
    if (currentLevelId === unlockedLevels && currentLevelId < LEVELS.length) {
      setUnlockedLevels(prev => prev + 1);
    }
    setModalData({
      type: 'WIN',
      title: '关卡完成！',
      message: '你拿到了所有宝藏！'
    });
  };

  const handleGameOver = (reason: string) => {
    setGameState(GameState.GAME_OVER);
    setModalData({
      type: 'LOSE',
      title: '游戏结束',
      message: reason
    });
  };

  const handleNextLevel = () => {
    if (currentLevelId < LEVELS.length) {
      startLevel(currentLevelId + 1);
    } else {
      setGameState(GameState.LEVEL_SELECT);
      setModalData(null);
    }
  };

  // SVG 图标
  const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-[VT323]">
      <div className="max-w-3xl w-full">
        <h1 className="text-6xl text-center text-white font-bold mb-8 drop-shadow-[4px_4px_0_#f59e0b]">
          EraseBox
        </h1>

        <div className="bg-white p-2 rounded-lg border-4 border-slate-600 shadow-2xl relative overflow-hidden">
          {gameState === GameState.MENU && (
            <div className="flex flex-col items-center justify-center h-[400px] bg-sky-50 space-y-6">
               <div className="w-16 h-16 bg-white border-4 border-slate-900 flex items-center justify-center animate-bounce">
                  <div className="w-10 h-10 bg-amber-400 relative">
                     <div className="absolute top-2 left-1 w-2 h-2 bg-black opacity-20"></div>
                     <div className="absolute top-2 right-1 w-2 h-2 bg-black opacity-20"></div>
                     <div className="absolute bottom-2 left-2 right-2 h-1 bg-black opacity-20"></div>
                  </div>
               </div>
               <button 
                 onClick={() => setGameState(GameState.LEVEL_SELECT)}
                 className="px-12 py-4 bg-amber-400 hover:bg-amber-500 text-slate-900 text-2xl font-bold border-b-8 border-amber-600 active:border-b-0 active:translate-y-2 transition-all rounded"
               >
                 开始游戏
               </button>
               <p className="text-slate-500 text-xl">像素解谜平台游戏</p>
            </div>
          )}

          {gameState === GameState.LEVEL_SELECT && (
            <div className="h-[400px] bg-sky-50 p-8 overflow-y-auto">
              <h2 className="text-3xl font-bold text-center mb-6 text-slate-800">选择关卡</h2>
              <div className="grid grid-cols-4 gap-4">
                {LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => startLevel(level.id)}
                    disabled={level.id > unlockedLevels}
                    className={`
                      aspect-square flex flex-col items-center justify-center border-4 rounded
                      transition-all transform hover:scale-105 active:scale-95
                      ${level.id <= unlockedLevels 
                        ? 'bg-white border-slate-700 text-slate-800 hover:bg-amber-50 cursor-pointer shadow-lg' 
                        : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'}
                    `}
                  >
                    {level.id <= unlockedLevels ? (
                      <span className="text-4xl font-bold">{level.id}</span>
                    ) : (
                      <LockIcon />
                    )}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setGameState(GameState.MENU)}
                className="mt-8 text-slate-500 hover:text-slate-800 underline w-full text-center block text-xl"
              >
                返回标题
              </button>
            </div>
          )}

          {gameState === GameState.PLAYING && (
            <Game 
              level={LEVELS.find(l => l.id === currentLevelId)!}
              onLevelComplete={handleLevelComplete}
              onGameOver={handleGameOver}
              onBack={() => setGameState(GameState.LEVEL_SELECT)}
            />
          )}

          {(gameState === GameState.GAME_OVER || gameState === GameState.LEVEL_COMPLETE) && modalData && (
             <div className="relative h-[400px] bg-sky-50">
                <div className="absolute inset-0 flex items-center justify-center bg-slate-200">
                   {/* Fallback background if modal covers it */}
                   <div className="text-4xl text-slate-300 font-bold opacity-20 select-none">PAUSED</div>
                </div>
                <GameModal 
                  type={modalData.type}
                  title={modalData.title}
                  message={modalData.message}
                  onRestart={() => startLevel(currentLevelId)}
                  onNextLevel={currentLevelId < LEVELS.length ? handleNextLevel : undefined}
                  onMenu={() => setGameState(GameState.LEVEL_SELECT)}
                />
             </div>
          )}
        </div>
        
        <div className="mt-4 text-center text-slate-500 text-sm">
          由 Gemini 驱动 • 基于 Matter.js 开发
        </div>
      </div>
    </div>
  );
}

export default App;