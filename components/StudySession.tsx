import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getExplanationStream, generateQuestions, generateSpeech, QuestionRequest, getFollowUpAnswerStream } from '../services/geminiService.ts';
import type { AchievementStandard, QuizQuestion, QuizResult, TTSVoice, QuestionType, ConversationMessage } from '../types.ts';
import useLocalStorage from '../hooks/useLocalStorage.ts';
import { Button } from './common/Button.tsx';
import { Spinner } from './common/Spinner.tsx';
import { Quiz } from './Quiz.tsx';
import { AVAILABLE_VOICES } from '../constants.ts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Helper functions for audio decoding
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
): Promise<AudioBuffer> {
    const frameCount = data.length / 2; // 16-bit PCM
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    const dataInt16 = new Int16Array(data.buffer);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
}


const SpeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>
);

const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="6" y="6" width="12" height="12"></rect>
    </svg>
);


interface StudySessionProps {
    subjectName: string;
    standard: AchievementStandard;
    onSessionEnd: () => void;
}

const defaultQuestionCounts = {
    'multiple-choice': 3,
    'short-answer': 1,
    'ox': 1,
};

export const StudySession: React.FC<StudySessionProps> = ({ subjectName, standard, onSessionEnd }) => {
    const [explanation, setExplanation] = useState<string>('');
    const [isLoadingExplanation, setIsLoadingExplanation] = useState<boolean>(true);
    const [isStreamingExplanation, setIsStreamingExplanation] = useState<boolean>(false);
    
    const [questionCounts, setQuestionCounts] = useState<{ [key in QuestionType]: number }>(defaultQuestionCounts);

    const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
    
    const [explanationError, setExplanationError] = useState<string | null>(null);
    const [questionsError, setQuestionsError] = useState<string | null>(null);
    const [ttsError, setTtsError] = useState<string | null>(null);
    
    const [studyHistory, setStudyHistory] = useLocalStorage<QuizResult[]>('studyHistory', []);
    const [quizFinished, setQuizFinished] = useState(false);
    const [lastResult, setLastResult] = useState<QuizResult | null>(null);

    // TTS State
    const [selectedVoice, setSelectedVoice] = useState<TTSVoice>('Kore');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoadingTTS, setIsLoadingTTS] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Q&A State
    const [conversation, setConversation] = useState<ConversationMessage[]>([]);
    const [userQuestion, setUserQuestion] = useState<string>('');
    const [isAnswering, setIsAnswering] = useState<boolean>(false);
    const [qnaError, setQnaError] = useState<string | null>(null);
    const conversationEndRef = useRef<HTMLDivElement>(null);
    
    const stopAllAudio = useCallback(() => {
        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.onended = null;
                audioSourceRef.current.stop();
            } catch (e) {
                console.warn("Audio stop error:", e);
            }
            audioSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().then(() => {
                audioContextRef.current = null;
            });
        }
        setIsSpeaking(false);
        setIsLoadingTTS(false);
    }, []);

    useEffect(() => {
        let isCancelled = false;
        const fetchExplanation = async () => {
            setIsLoadingExplanation(true);
            setIsStreamingExplanation(true);
            setExplanation('');
            setExplanationError(null);
            try {
                const stream = await getExplanationStream(standard.description);
                if (isCancelled) return;
                
                setIsLoadingExplanation(false); 
                let currentText = '';
                for await (const chunk of stream) {
                    if (isCancelled) break;
                    currentText += chunk.text;
                    setExplanation(currentText);
                }
            } catch (err) {
                if (!isCancelled) {
                    setExplanationError(err instanceof Error ? err.message : '설명을 불러오는 데 실패했습니다.');
                    setIsLoadingExplanation(false);
                }
            } finally {
                if (!isCancelled) {
                    setIsStreamingExplanation(false);
                }
            }
        };

        fetchExplanation();

        return () => {
            isCancelled = true;
            stopAllAudio();
        };
    }, [standard.description, stopAllAudio]);
    
    const scrollToBottom = () => {
        conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [conversation]);

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userQuestion.trim() || isAnswering) return;

        const newQuestion: ConversationMessage = { role: 'user', text: userQuestion };
        setIsAnswering(true);
        setQnaError(null);
        setConversation(prev => [...prev, newQuestion, { role: 'model', text: '' }]);
        setUserQuestion('');

        try {
            const stream = await getFollowUpAnswerStream(standard.description, explanation, conversation, newQuestion.text);
            
            for await (const chunk of stream) {
                const chunkText = chunk.text;
                setConversation(prev => {
                    const newConversation = [...prev];
                    const lastMessage = newConversation[newConversation.length - 1];
                    if (lastMessage.role === 'model') {
                        lastMessage.text += chunkText;
                    }
                    return newConversation;
                });
            }

        } catch (err) {
            setQnaError(err instanceof Error ? err.message : '질문에 답변하는 중 오류가 발생했습니다.');
             setConversation(prev => prev.slice(0, -2)); // Remove user question and empty model message on error
        } finally {
            setIsAnswering(false);
        }
    };

    const handleToggleSpeak = useCallback(async () => {
        if (isSpeaking || isLoadingTTS) {
            stopAllAudio();
            return;
        }

        if (!explanation) return;
        
        setIsLoadingTTS(true);
        setTtsError(null);

        try {
            const base64Audio = await generateSpeech(explanation, selectedVoice);

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = audioCtx;
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, audioCtx);
            
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            audioSourceRef.current = source;
            
            source.onended = () => {
                stopAllAudio();
            };

            source.start();
            setIsLoadingTTS(false);
            setIsSpeaking(true);

        } catch (err) {
            setTtsError(err instanceof Error ? err.message : '음성 재생 중 오류가 발생했습니다.');
            stopAllAudio();
        }
    }, [explanation, selectedVoice, isSpeaking, isLoadingTTS, stopAllAudio]);


    const handleGenerateQuiz = async () => {
        setIsGeneratingQuestions(true);
        setQuestionsError(null);
        try {
            const requests: QuestionRequest[] = Object.entries(questionCounts)
                .map(([type, count]) => ({ type: type as QuestionType, count: count as number }))
                .filter(({ count }) => count > 0);

            if (requests.length === 0) {
                setQuestionsError("하나 이상의 문제를 요청해야 합니다.");
                setIsGeneratingQuestions(false);
                return;
            }

            const generated = await generateQuestions(standard.description, requests);
            setQuestions(generated);
        } catch (err) {
            setQuestionsError(err instanceof Error ? err.message : '문제를 생성하는 데 실패했습니다.');
        } finally {
            setIsGeneratingQuestions(false);
        }
    };

    const handleQuestionCountChange = (type: QuestionType, value: string) => {
        const count = Math.max(0, parseInt(value, 10) || 0);
        setQuestionCounts(prev => ({ ...prev, [type]: count }));
    };

    const handleResetCounts = () => {
        setQuestionCounts(defaultQuestionCounts);
    };

    const handleQuizSubmit = useCallback((score: number, correctAnswers: number, totalQuestions: number) => {
        const newResult: QuizResult = {
            id: new Date().toISOString(),
            date: new Date().toISOString(),
            standardId: standard.id,
            standardDescription: standard.description,
            subject: subjectName,
            score,
            totalQuestions,
            correctAnswers,
        };
        setStudyHistory([...studyHistory, newResult]);
        setLastResult(newResult);
        setQuizFinished(true);
    }, [standard, subjectName, studyHistory, setStudyHistory]);
    
    const markdownComponents = {
        table: (props: any) => <table className="table-auto w-full my-4 border-collapse border border-slate-300" {...props} />,
        thead: (props: any) => <thead className="bg-slate-100" {...props} />,
        th: (props: any) => <th className="border border-slate-300 px-4 py-2 text-left" {...props} />,
        td: (props: any) => <td className="border border-slate-300 px-4 py-2" {...props} />,
    };

    if (!questions) {
        return (
            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 md:p-12 rounded-xl shadow-lg">
                <header>
                    <p className="text-base font-semibold text-indigo-600">{subjectName}</p>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{standard.description}</h1>
                     <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-6 border-b pb-4 gap-4">
                        <p className="text-sm text-slate-500 font-mono">{standard.id}</p>
                        <div className="flex items-center gap-2">
                            <select
                                id="voice-select"
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value as TTSVoice)}
                                disabled={isSpeaking || isLoadingTTS}
                                className="bg-white border border-slate-300 rounded-md py-1.5 px-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                aria-label="목소리 선택"
                            >
                                {AVAILABLE_VOICES.map(voice => (
                                    <option key={voice.id} value={voice.id}>{voice.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleToggleSpeak}
                                disabled={isLoadingExplanation || isStreamingExplanation}
                                className="p-2 h-9 w-9 flex-shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 transition-colors"
                                aria-label={(isSpeaking || isLoadingTTS) ? "설명 듣기 중지" : "설명 듣기"}
                            >
                                 {isLoadingTTS ? (
                                    <Spinner size="sm" />
                                 ) : isSpeaking ? (
                                    <StopIcon className="h-5 w-5 mx-auto" />
                                 ) : (
                                    <SpeakerIcon className="h-5 w-5 mx-auto" />
                                )}
                            </button>
                        </div>
                    </div>
                     {ttsError && <p className="text-red-500 text-xs mt-2 text-right">{ttsError}</p>}
                </header>

                <article className="py-8">
                    {isLoadingExplanation ? (
                        <Spinner text="AI 튜터가 설명 자료를 준비하고 있어요..." />
                    ) : explanationError ? (
                            <p className="text-red-500 p-4 bg-red-50 border border-red-200 rounded-md">{explanationError}</p>
                    ) : (
                        <div className="prose prose-lg prose-slate max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {explanation + (isStreamingExplanation ? '▍' : '')}
                            </ReactMarkdown>
                        </div>
                    )}
                </article>

                {!isLoadingExplanation && !isStreamingExplanation && !explanationError && (
                    <>
                        <hr className="my-8" />
                        
                        <section>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">궁금한 점 질문하기</h2>
                            <div className="max-h-96 overflow-y-auto space-y-4 mb-4 p-4 bg-slate-50 rounded-md border">
                                {conversation.map((msg, index) => (
                                    <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`prose prose-slate max-w-none p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-900' : 'bg-white border'}`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                                {msg.text + (msg.role === 'model' && isAnswering && index === conversation.length -1 ? '▍' : '')}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                                <div ref={conversationEndRef} />
                            </div>

                            <form onSubmit={handleAskQuestion}>
                                <textarea
                                    value={userQuestion}
                                    onChange={(e) => setUserQuestion(e.target.value)}
                                    placeholder="개념 설명에서 이해가 안 되는 부분을 질문해보세요..."
                                    className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                                    rows={3}
                                    disabled={isAnswering}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAskQuestion(e);
                                        }
                                    }}
                                />
                                <div className="flex justify-between items-center mt-2">
                                     <p className="text-xs text-slate-500">Shift + Enter로 줄바꿈할 수 있습니다.</p>
                                    <Button type="submit" disabled={!userQuestion.trim() || isAnswering}>
                                        {isAnswering ? <Spinner size="sm" /> : '질문 전송'}
                                    </Button>
                                </div>
                            </form>
                            {qnaError && <p className="text-red-500 mt-2 text-sm">{qnaError}</p>}
                        </section>
                        
                        <hr className="my-12" />

                        <section>
                             <h2 className="text-2xl font-bold text-slate-800 mb-6">이해도 확인하기</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label htmlFor="mc-questions" className="block text-sm font-medium text-slate-700">객관식</label>
                                    <input type="number" id="mc-questions" value={questionCounts['multiple-choice']} onChange={e => handleQuestionCountChange('multiple-choice', e.target.value)} min="0" className="mt-1 w-full p-2 border border-slate-300 rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="sa-questions" className="block text-sm font-medium text-slate-700">서술형</label>
                                    <input type="number" id="sa-questions" value={questionCounts['short-answer']} onChange={e => handleQuestionCountChange('short-answer', e.target.value)} min="0" className="mt-1 w-full p-2 border border-slate-300 rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="ox-questions" className="block text-sm font-medium text-slate-700">OX 퀴즈</label>
                                    <input type="number" id="ox-questions" value={questionCounts['ox']} onChange={e => handleQuestionCountChange('ox', e.target.value)} min="0" className="mt-1 w-full p-2 border border-slate-300 rounded-md"/>
                                </div>
                            </div>
                            <div className="mt-6 flex flex-col sm:flex-row-reverse gap-4">
                                <Button 
                                    onClick={handleGenerateQuiz} 
                                    disabled={isGeneratingQuestions || (questionCounts['multiple-choice'] === 0 && questionCounts['short-answer'] === 0 && questionCounts['ox'] === 0)} 
                                    className="w-full"
                                >
                                    {isGeneratingQuestions ? <Spinner size="sm" /> : '연습 문제 풀기'}
                                </Button>
                                <Button onClick={handleResetCounts} variant="secondary" className="w-full sm:w-auto">
                                    재설정
                                </Button>
                            </div>
                            {questionsError && <p className="text-red-500 mt-4 text-center">{questionsError}</p>}
                        </section>
                    </>
                )}
            </div>
        );
    }
    
    if (quizFinished && lastResult) {
      return (
        <div className="max-w-2xl mx-auto text-center bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4">학습 완료!</h2>
            <p className="text-slate-600 mb-6">성취기준 <span className="font-semibold">{lastResult.standardId}</span>에 대한 학습을 마쳤습니다.</p>
            <div className="bg-indigo-50 rounded-xl p-6 sm:p-8 mb-8">
                <p className="text-lg text-slate-700">총 <span className="font-bold text-indigo-600">{lastResult.totalQuestions}</span>문제 중</p>
                <p className="text-4xl sm:text-5xl font-extrabold text-indigo-600 my-2">{lastResult.correctAnswers}</p>
                <p className="text-lg text-slate-700">문제를 맞혔습니다.</p>
                <div className="w-full bg-slate-200 rounded-full h-4 mt-6">
                    <div className="bg-green-500 h-4 rounded-full" style={{ width: `${lastResult.score}%` }}></div>
                </div>
                <p className="text-xl font-bold mt-2">{lastResult.score.toFixed(1)}%</p>
            </div>
            <Button onClick={onSessionEnd}>완료</Button>
        </div>
      );
    }

    return <Quiz questions={questions} onSubmit={handleQuizSubmit} />;
};