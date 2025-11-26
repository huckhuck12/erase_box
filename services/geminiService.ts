import { GoogleGenAI } from "@google/genai";

export const getGameTip = async (score: number): Promise<string> => {
  if (!process.env.API_KEY) {
    return "干得漂亮！继续加油！";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `我刚玩了一个名为 "EraseBox" 的解谜平台游戏并通关了。
      请给我一个非常简短（最多20个字）、机智或鼓励性的中文评论。
      语气要轻松有趣。`,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error fetching tip:", error);
    return "非常棒！下次试试更快的速度。";
  }
};