import React, { useState } from 'react';
import { Card } from './common/Card.tsx';
import { Button } from './common/Button.tsx';
import { Spinner } from './common/Spinner.tsx';

interface ApiKeyPromptProps {
    onSetApiKey: (key: string) => void;
    initialKey?: string;
    error?: string | null;
    isLoading: boolean;
}

export const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ onSetApiKey, initialKey = '', error, isLoading }) => {
    const [apiKey, setApiKey] = useState(initialKey);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSetApiKey(apiKey);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <main className="container mx-auto p-4 md:p-8">
                <Card className="max-w-xl mx-auto">
                    <form onSubmit={handleSubmit}>
                        <div className="text-center">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Google AI API 키 설정</h2>
                            <p className="text-sm sm:text-base text-slate-600 mb-6">
                                AI 자기주도 학습 기능을 이용하려면 Google AI Studio에서 발급받은 API 키가 필요합니다.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="api-key" className="block text-sm font-medium text-slate-700 mb-1">
                                    API 키
                                </label>
                                <input
                                    id="api-key"
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                                    placeholder="API 키를 여기에 붙여넣으세요"
                                    aria-describedby="api-key-error"
                                />
                            </div>

                            {error && <p id="api-key-error" className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                            
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-indigo-600 hover:underline">
                                Google AI Studio에서 API 키 받기
                            </a>
                        </div>
                        
                        <div className="pt-6">
                            <Button type="submit" disabled={isLoading || !apiKey} className="w-full flex items-center justify-center">
                                {isLoading ? <Spinner size="sm" /> : '저장하고 계속하기'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </main>
        </div>
    );
};