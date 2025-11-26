import React, { useEffect, useState } from 'react';
import { getGameTip } from '../services/geminiService';

interface GameModalProps {
  type: 'WIN' | 'LOSE';
  title: string;
  message: string;
  onRestart: () => void;
  onNextLevel?: () => void;
  onMenu: () => void;
}

const GameModal: React.FC<GameModalProps> = ({ type, title, message, onRestart, onNextLevel, onMenu }) => {
  const [tip, setTip] = useState<string>('');

  useEffect(() => {
    if (type === 'WIN') {
      const fetchTip = async () => {
         const aiTip = await getGameTip(100); 
         setTip(aiTip);
      };
      fetchTip();
    } else {
        setTip("别灰心！换个思路再试一次。");
    }
  }, [type]);

  const IconPlay = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
  );
  const IconRefresh = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
  );
  const IconHome = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  );

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-[#fff1f2] border-4 border-slate-800 p-8 max-w-sm w-full mx-4 text-center shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]">
        <h2 className={`text-4xl font-bold mb-2 ${type === 'WIN' ? 'text-green-600' : 'text-red-600'}`}>
          {title}
        </h2>
        <p className="text-xl text-slate-700 mb-6 font-bold">{message}</p>
        
        {type === 'WIN' && tip && (
          <div className="bg-white p-3 border-2 border-slate-200 mb-6 text-slate-500 text-sm italic">
            AI提示: "{tip}"
          </div>
        )}

        <div className="flex flex-col gap-3">
          {type === 'WIN' && onNextLevel && (
            <button
              onClick={onNextLevel}
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold text-xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all rounded"
            >
              <IconPlay /> 下一关
            </button>
          )}
          
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xl border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all rounded"
          >
            <IconRefresh /> 重玩
          </button>

          <button
            onClick={onMenu}
            className="flex items-center justify-center gap-2 w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xl border-b-4 border-slate-400 active:border-b-0 active:translate-y-1 transition-all rounded"
          >
            <IconHome /> 菜单
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameModal;