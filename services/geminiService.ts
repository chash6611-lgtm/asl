import { GoogleGenAI, Type, Modality, GenerateContentResponse } from '@google/genai';
import type { QuizQuestion, TTSVoice, QuestionType, ConversationMessage } from '../types.ts';

let ai: GoogleGenAI | null = null;

export const initializeAi = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("API 키가 제공되지 않았습니다.");
    }
    ai = new GoogleGenAI({ apiKey });
};

const getAi = (): GoogleGenAI => {
    if (!ai) {
        throw new Error("AI 서비스가 초기화되지 않았습니다. API 키를 먼저 설정해주세요.");
    }
    return ai;
};

const handleApiError = (error: unknown): never => {
    console.error("Gemini API Error:", error);
    if (error instanceof Error && (error.message.includes("API key not valid") || error.message.includes("Requested entity was not found."))) {
        throw new Error("API 키가 유효하지 않습니다. 올바른 키로 다시 설정해주세요.");
    }
    
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
        throw new Error("AI 모델 통신 오류: 파일을 직접 열어 실행하는 경우 브라우저 보안 정책으로 인해 AI 기능이 작동하지 않을 수 있습니다. 로컬 개발 서버를 통해 접속해주세요.");
    }

    throw new Error("AI 모델과 통신 중 오류가 발생했습니다. 네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.");
};

export const validateApiKey = async (apiKey: string): Promise<void> => {
    if (!apiKey) {
        throw new Error("API 키를 입력해주세요.");
    }
    try {
        const tempAi = new GoogleGenAI({ apiKey });
        // Use a very simple, low-cost call to validate the key
        await tempAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'hello',
        });
        // If successful, it returns void.
    } catch (error) {
        console.error("API Key validation failed:", error);
        if (error instanceof Error && (error.message.includes("API key not valid") || error.message.includes("Requested entity was not found."))) {
            throw new Error("API 키가 유효하지 않습니다. Google AI Studio에서 발급받은 정확한 키인지 확인해주세요.");
        }
        throw new Error("키를 확인하는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.");
    }
};

export const getExplanationStream = async (standardDescription: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
    try {
        const prompt = `
            당신은 한국의 중고등학생들을 위한 친절하고 유능한 AI 튜터입니다.
            다음 성취기준에 대해 학생들이 핵심만 빠르게 파악할 수 있도록, 가장 중요한 내용 위주로 400자 내외로 자세하게 설명해주세요.
            설명은 한국어로, 대화하는 듯한 친근한 어조로 작성해주세요.
            구체적인 예시나 비유를 사용하되, 길어지지 않게 주의해주세요.

            성취기준: "${standardDescription}"
        `;

        const aiInstance = getAi();
        const response = await aiInstance.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response;
    } catch (error) {
        handleApiError(error);
    }
};

export const getFollowUpAnswerStream = async (
    standardDescription: string,
    initialExplanation: string,
    conversationHistory: ConversationMessage[],
    userQuestion: string
): Promise<AsyncGenerator<GenerateContentResponse>> => {
    try {
        const historyText = conversationHistory
            .map(msg => `${msg.role === 'user' ? '학생' : 'AI 튜터'}: ${msg.text}`)
            .join('\n');

        const prompt = `
            당신은 한국의 중고등학생들을 위한 친절하고 유능한 AI 튜터입니다. 대화하는 듯한 친근한 어조를 사용해주세요.
            학생은 현재 다음 성취기준에 대해 학습하고 있습니다:
            "${standardDescription}"

            당신은 이전에 학생에게 다음과 같은 초기 설명을 제공했습니다:
            --- 초기 설명 ---
            ${initialExplanation}
            --------------------

            지금까지 학생과의 대화 내용은 다음과 같습니다:
            --- 대화 기록 ---
            ${historyText}
            --------------------

            학생이 다음과 같은 새로운 질문을 했습니다. 이 질문에 대해 명확하고 이해하기 쉽게 답변해주세요.
            학생의 질문: "${userQuestion}"
        `;

        const aiInstance = getAi();
        const response = await aiInstance.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response;
    } catch (error) {
        handleApiError(error);
    }
};


export interface QuestionRequest {
    type: QuestionType;
    count: number;
}

export const generateQuestions = async (standardDescription: string, requests: QuestionRequest[]): Promise<QuizQuestion[]> => {
    try {
        const totalQuestions = requests.reduce((sum, req) => sum + req.count, 0);
        if (totalQuestions === 0) {
            return [];
        }

        const requestPrompts = requests
            .filter(req => req.count > 0)
            .map(req => {
                switch (req.type) {
                    case 'multiple-choice':
                        return `- ${req.count}개의 객관식 문제 (questionType: "multiple-choice"). 각 문제는 반드시 5개의 선택지(options)를 가져야 합니다.`;
                    case 'short-answer':
                        return `- ${req.count}개의 서술형 문제 (questionType: "short-answer"). options 필드는 비워두세요. 정답(answer)은 핵심 단어나 구 위주로 간결하게 작성해주세요.`;
                    case 'ox':
                        return `- ${req.count}개의 OX 퀴즈 (questionType: "ox"). options 필드는 ["O", "X"]로 고정해주세요.`;
                }
            }).join('\n');

        const prompt = `
            당신은 한국 중고등학생들을 위한 학습 문제 출제 전문가입니다.
            다음 성취기준에 근거하여, 아래 요청에 따라 총 ${totalQuestions}개의 문제를 만들어주세요.
            - 모든 문제는 한국어로 작성해주세요.
            - 각 문제에 대해 정답(answer)과 상세한 해설(explanation)을 반드시 포함해주세요. 해설은 정답의 근거를 명확히 설명해야 합니다.
            - 필요한 경우, 문제나 해설에 내용을 명확하게 전달하기 위해 마크다운 표를 사용해주세요.
            
            요청사항:
            ${requestPrompts}

            성취기준: "${standardDescription}"
        `;

        const aiInstance = getAi();
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            questionType: { type: Type.STRING },
                            options: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                            },
                            answer: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                        },
                        required: ["question", "questionType", "answer", "explanation"],
                    },
                },
                thinkingConfig: { thinkingBudget: 0 },
            },
        });

        const jsonString = response.text;
        const questions = JSON.parse(jsonString);
        return questions as QuizQuestion[];

    } catch (error) {
        handleApiError(error);
    }
};

export const generateSpeech = async (textToSpeak: string, voice: TTSVoice): Promise<string> => {
    try {
        const aiInstance = getAi();
        const response = await aiInstance.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textToSpeak }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("API로부터 오디오 데이터를 받지 못했습니다.");
        }
        return base64Audio;
    } catch (error) {
        handleApiError(error);
    }
};