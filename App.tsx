import React, { useState, useCallback, useEffect } from 'react';
import { CurriculumSelector } from './components/CurriculumSelector.tsx';
import { StudySession } from './components/StudySession.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { Header } from './components/Header.tsx';
import { ApiKeyPrompt } from './components/ApiKeyPrompt.tsx';
import useLocalStorage from './hooks/useLocalStorage.ts';
import type { AchievementStandard } from './types.ts';
import { EDUCATION_CURRICULUMS } from './constants.ts';
import { Spinner } from './components/common/Spinner.tsx';
import { initializeAi, validateApiKey } from './services/geminiService.ts';

type View = 'selector' | 'study' | 'dashboard';
type AppStatus = 'prompt_for_key' | 'validating_key' | 'key_valid' | 'key_invalid';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('selector');
    const [selectedStandard, setSelectedStandard] = useState<{ subjectName: string, standard: AchievementStandard } | null>(null);
    const [dashboardKey, setDashboardKey] = useState(Date.now());
    
    const [apiKey, setApiKey] = useLocalStorage<string>('gemini_api_key', '');
    const [appStatus, setAppStatus] = useState<AppStatus>('validating_key');
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);

    const handleApiKeySubmission = useCallback(async (newKey: string) => {
        setApiKey(newKey);
        setAppStatus('validating_key');
        setApiKeyError(null);
        try {
            await validateApiKey(newKey);
            initializeAi(newKey);
            setAppStatus('key_valid');
        } catch (error) {
            setApiKeyError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
            setAppStatus('key_invalid');
        }
    }, [setApiKey]);

    useEffect(() => {
        if (!apiKey) {
            setAppStatus('prompt_for_key');
        } else {
            // Validate the key from local storage on initial load
            handleApiKeySubmission(apiKey);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on initial mount

    const handleStartStudy = useCallback((subjectName: string, standard: AchievementStandard) => {
        setSelectedStandard({ subjectName, standard });
        setCurrentView('study');
    }, []);

    const handleGoHome = useCallback(() => {
        setSelectedStandard(null);
        setCurrentView('selector');
    }, []);

    const handleShowDashboard = useCallback(() => {
        setDashboardKey(Date.now()); // Force re-render of dashboard to fetch latest data
        setCurrentView('dashboard');
    }, []);

    const renderContent = () => {
        switch (currentView) {
            case 'study':
                if (selectedStandard) {
                    return <StudySession subjectName={selectedStandard.subjectName} standard={selectedStandard.standard} onSessionEnd={handleShowDashboard} />;
                }
                return null;
            case 'dashboard':
                return <Dashboard key={dashboardKey} onGoHome={handleGoHome} />;
            case 'selector':
            default:
                return <CurriculumSelector educationCurriculums={EDUCATION_CURRICULUMS} onStartStudy={handleStartStudy} />;
        }
    };
    
    if (appStatus === 'prompt_for_key') {
        return <ApiKeyPrompt onSetApiKey={handleApiKeySubmission} isLoading={false} />;
    }
    
    if (appStatus === 'key_invalid') {
        return <ApiKeyPrompt onSetApiKey={handleApiKeySubmission} initialKey={apiKey} error={apiKeyError} isLoading={false} />;
    }
    
    if (appStatus === 'validating_key') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                <Spinner text="API 키 유효성을 확인하는 중입니다..." />
            </div>
        );
    }

    // if (appStatus === 'key_valid')
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Header onGoHome={handleGoHome} onShowDashboard={handleShowDashboard} />
            <main className="container mx-auto p-4 md:p-8">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;