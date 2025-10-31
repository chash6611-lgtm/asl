import React from 'react';

interface HeaderProps {
    onGoHome: () => void;
    onShowDashboard: () => void;
}

const BrainIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v1.2a1 1 0 0 0 1 1h.3a1 1 0 0 0 .9-.6l.2-.5a2.5 2.5 0 0 1 4.2 2.4l-.2.5a1 1 0 0 0 .9.6h.3a1 1 0 0 0 1-1v-1.2A2.5 2.5 0 0 1 18.5 2h-9Z" /><path d="M16 10a1 1 0 0 0-1-1h-.3a1 1 0 0 0-.9.6l-.2.5a2.5 2.5 0 0 1-4.2-2.4l.2-.5a1 1 0 0 0-.9-.6H8a1 1 0 0 0-1 1v1.2A2.5 2.5 0 0 1 4.5 13h0A2.5 2.5 0 0 1 2 10.5v0A2.5 2.5 0 0 1 4.5 8h0a2.5 2.5 0 0 1 2.4 2l.5.2a1 1 0 0 0 .6.9v.3a1 1 0 0 0 1 1h1.2a2.5 2.5 0 0 1 2.5 2.5v0a2.5 2.5 0 0 1-2.5 2.5h0A2.5 2.5 0 0 1 8 18.5v0a2.5 2.5 0 0 1-2.5-2.5h0a2.5 2.5 0 0 1-2.5-2.5v-1.2A2.5 2.5 0 0 1 5.5 10H16a1 1 0 0 0 1-1Z" />
    </svg>
);

export const Header: React.FC<HeaderProps> = ({ onGoHome, onShowDashboard }) => {
    return (
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div 
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={onGoHome}
                    >
                        <BrainIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500 group-hover:animate-pulse shrink-0" />
                        <h1 className="text-lg sm:text-xl font-bold text-slate-800">
                           AI와 함께하는 자기주도 학습
                        </h1>
                    </div>
                    <nav>
                        <button
                            onClick={onShowDashboard}
                            className="text-xs sm:text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors duration-200 whitespace-nowrap"
                        >
                            나의 성취 수준
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
};