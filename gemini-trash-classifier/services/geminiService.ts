import { GoogleGenAI, Type } from "@google/genai";

// IMPORTANT: Do not expose your API key in client-side code.
// This uses an environment variable for security.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface TrashAnalysisResult {
    category: '일반 쓰레기' | '재활용' | '알 수 없음';
    object: string;
    reason: string;
}

export const analyzeTrash = async (base64ImageData: string): Promise<TrashAnalysisResult> => {
    const model = 'gemini-2.5-flash';

    const prompt = `이 이미지에 있는 물체를 분석해주세요. 무엇인지 식별하고 다음 쓰레기 카테고리 중 하나로 분류해주세요: '재활용', '일반 쓰레기'. 
    
    결과는 JSON 형식으로 제공해주세요. 예를 들어, 플라스틱 병의 경우:
    { "category": "재활용", "object": "플라스틱 병", "reason": "깨끗하게 헹궈서 라벨을 제거한 후 플라스틱으로 배출해야 합니다." }
    
    분석할 수 없는 경우, category를 "알 수 없음"으로 설정해주세요.`;

    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64ImageData,
            },
        };

        const textPart = {
            text: prompt,
        };

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { 
                            type: Type.STRING, 
                            description: "분류된 쓰레기 종류 (예: 재활용, 일반 쓰레기, 알 수 없음)" 
                        },
                        object: { 
                            type: Type.STRING, 
                            description: "식별된 물체 이름" 
                        },
                        reason: { 
                            type: Type.STRING, 
                            description: "분류 이유 및 배출 방법" 
                        },
                    },
                    required: ["category", "object", "reason"],
                }
            }
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result as TrashAnalysisResult;

    } catch (error) {
        console.error("Gemini API 호출 중 오류 발생:", error);
        throw new Error("이미지 분석에 실패했습니다.");
    }
};
