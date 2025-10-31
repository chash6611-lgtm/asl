import React, { useState } from 'react';
import type { QuizQuestion } from '../types.ts';
import { Card } from './common/Card.tsx';
import { Button } from './common/Button.tsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface QuizProps {
    questions: QuizQuestion[];
    onSubmit: (score: number, correctAnswers: number, totalQuestions: number) => void;
}

export const Quiz: React.FC<QuizProps> = ({ questions, onSubmit }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>(Array(questions.length).fill(null));
    const [isAnswerChecked, setIsAnswerChecked] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [tempShortAnswer, setTempShortAnswer] = useState('');
    const [selfAssessedCorrectness, setSelfAssessedCorrectness] = useState<(boolean | null)[]>(Array(questions.length).fill(null));

    const currentQuestion = questions[currentQuestionIndex];
    const userAnswer = userAnswers[currentQuestionIndex];

    const handleAnswerSelect = (option: string) => {
        if (isAnswerChecked) return;
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = option;
        setUserAnswers(newAnswers);
    };
    
    const handleShortAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isAnswerChecked) return;
        setTempShortAnswer(e.target.value);
    };

    const handleCheckAnswer = () => {
        if (currentQuestion.questionType === 'short-answer') {
            handleAnswerSelect(tempShortAnswer);
        }
        setIsAnswerChecked(true);
    };

    const handleSelfAssessment = (isCorrect: boolean) => {
        const newAssessment = [...selfAssessedCorrectness];
        newAssessment[currentQuestionIndex] = isCorrect;
        setSelfAssessedCorrectness(newAssessment);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setIsAnswerChecked(false);
            setTempShortAnswer('');
        } else {
            setShowResults(true);
            const correctCount = userAnswers.reduce((count, answer, index) => {
                const question = questions[index];
                let isCorrect;
                if (question.questionType === 'short-answer') {
                    // Use self-assessed result for short-answer questions
                    isCorrect = selfAssessedCorrectness[index] === true;
                } else {
                    // Use automatic check for other types
                    isCorrect = answer === question.answer;
                }
                return isCorrect ? count + 1 : count;
            }, 0);
            
            const scorePercentage = (correctCount / questions.length) * 100;
            onSubmit(scorePercentage, correctCount, questions.length);
        }
    };

    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    const getOptionClasses = (option: string) => {
        let baseClasses = 'w-full text-left px-4 py-2 border rounded-lg transition-all duration-200';

        if (!isAnswerChecked) {
            if (userAnswer === option) {
                return `${baseClasses} bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500 cursor-pointer`;
            }
            return `${baseClasses} bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 cursor-pointer`;
        }

        // After answer is checked
        const isCorrectAnswer = option === currentQuestion.answer;
        const isSelectedAnswer = option === userAnswer;

        if (isCorrectAnswer) {
            return `${baseClasses} bg-green-100 border-green-500 ring-2 ring-green-500 cursor-not-allowed`;
        }
        if (isSelectedAnswer) {
            return `${baseClasses} bg-red-100 border-red-500 ring-2 ring-red-500 cursor-not-allowed`;
        }
        return `${baseClasses} bg-slate-50 border-slate-300 text-slate-500 cursor-not-allowed`;
    };
    
    if (showResults) {
      return null;
    }
    
    const markdownComponents = {
        table: (props: any) => <table className="table-auto w-full my-4 border-collapse border border-slate-300" {...props} />,
        thead: (props: any) => <thead className="bg-slate-100" {...props} />,
        th: (props: any) => <th className="border border-slate-300 px-4 py-2 text-left" {...props} />,
        td: (props: any) => <td className="border border-slate-300 px-4 py-2" {...props} />,
    };

    const renderQuestionInput = () => {
        switch (currentQuestion.questionType) {
            case 'multiple-choice':
            case 'ox':
                const options = currentQuestion.options || (currentQuestion.questionType === 'ox' ? ['O', 'X'] : []);
                return (
                    <div className="space-y-2">
                        {options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(option)}
                                className={getOptionClasses(option)}
                                disabled={isAnswerChecked}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                );
            case 'short-answer':
                return (
                    <div>
                        <input
                            type="text"
                            value={isAnswerChecked ? userAnswer || '' : tempShortAnswer}
                            onChange={handleShortAnswerChange}
                            disabled={isAnswerChecked}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="정답을 입력하세요..."
                        />
                        {isAnswerChecked && (
                            <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                                <p className="font-semibold text-slate-800">AI가 제시한 정답:</p>
                                <p className="mt-1 text-slate-700">{currentQuestion.answer}</p>
                                
                                {selfAssessedCorrectness[currentQuestionIndex] === null ? (
                                    <div className="mt-4">
                                        <p className="text-sm font-medium text-slate-700 mb-2">제시된 정답과 자신의 답안을 비교하여 직접 채점해주세요.</p>
                                        <div className="flex gap-2">
                                            <Button variant="secondary" onClick={() => handleSelfAssessment(true)} className="flex-1 !bg-green-100 !text-green-800 hover:!bg-green-200 focus:!ring-green-300">정답입니다</Button>
                                            <Button variant="secondary" onClick={() => handleSelfAssessment(false)} className="flex-1 !bg-red-100 !text-red-800 hover:!bg-red-200 focus:!ring-red-300">틀립니다</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-4 text-sm font-semibold text-indigo-600">채점이 완료되었습니다.</p>
                                )}
                            </div>
                        )}
                    </div>
                );
            default:
                return <p>지원하지 않는 문제 유형입니다.</p>;
        }
    };

    const isCheckAnswerDisabled = userAnswer === null && (currentQuestion.questionType !== 'short-answer' || tempShortAnswer === '');
    const isNextButtonDisabled = isAnswerChecked && currentQuestion.questionType === 'short-answer' && selfAssessedCorrectness[currentQuestionIndex] === null;

    return (
        <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 md:p-12 rounded-xl shadow-lg">
            <div className="mb-6 prose prose-lg prose-slate max-w-none">
                <p className="text-sm font-medium text-slate-500">문제 {currentQuestionIndex + 1} / {questions.length}</p>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {currentQuestion.question}
                </ReactMarkdown>
            </div>

            {renderQuestionInput()}

            {isAnswerChecked && (
                 <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 prose prose-slate max-w-none">
                    <h3 className="font-semibold text-slate-800 mb-2">해설</h3>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {currentQuestion.explanation}
                    </ReactMarkdown>
                </div>
            )}

            <div className="mt-8 flex justify-end">
                {isAnswerChecked ? (
                    <Button onClick={handleNext} disabled={isNextButtonDisabled}>
                        {isLastQuestion ? '결과 보기' : '다음 문제'}
                    </Button>
                ) : (
                    <Button onClick={handleCheckAnswer} disabled={isCheckAnswerDisabled}>
                        정답 확인
                    </Button>
                )}
            </div>
        </div>
    );
};