import React, { useMemo, useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage.ts';
import type { QuizResult } from '../types.ts';
import { Card } from './common/Card.tsx';
import { Button } from './common/Button.tsx';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardProps {
    onGoHome: () => void;
}

const DiamondIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.001 2.503a1 1 0 0 1 .993 .883l.007 .117 4.5 9a1 1 0 0 1-.993 1.38l-.007-.11L12 4.305l-4.5 8.99a1 1 0 0 1-1.11-1.38l.11-.11 4.5-9a1 1 0 0 1 .994-.883zM12 21.494a1 1 0 0 1-1.11-.883l-.007-.117-4.5-9a1 1 0 0 1 1.11-1.38l.007.11L12 19.69l4.5-8.99a1 1 0 0 1 1.11 1.38l-.11.11-4.5 9a1 1 0 0 1-1.11.883z"/>
    </svg>
);


export const Dashboard: React.FC<DashboardProps> = ({ onGoHome }) => {
    const [studyHistory] = useLocalStorage<QuizResult[]>('studyHistory', []);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    const { totalSessions, averageScore, highestScore } = useMemo(() => {
        const totalSessions = studyHistory.length;
        if (totalSessions === 0) {
            return { totalSessions: 0, averageScore: 0, highestScore: 0 };
        }
        const totalScoreSum = studyHistory.reduce((sum, result) => sum + result.score, 0);
        const averageScore = totalScoreSum / totalSessions;
        const highestScore = Math.max(...studyHistory.map(result => result.score));
        return { totalSessions, averageScore, highestScore };
    }, [studyHistory]);

    const barChartData = useMemo(() => {
        const subjectData: { [key: string]: { totalScore: number; count: number } } = {};
        studyHistory.forEach(result => {
            if (!subjectData[result.subject]) {
                subjectData[result.subject] = { totalScore: 0, count: 0 };
            }
            subjectData[result.subject].totalScore += result.score;
            subjectData[result.subject].count += 1;
        });

        return Object.keys(subjectData).map(subject => ({
            name: subject,
            '평균 점수': subjectData[subject].totalScore / subjectData[subject].count,
        }));
    }, [studyHistory]);

    const lineChartData = useMemo(() => {
        if (studyHistory.length < 2) return [];
        const sortedHistory = [...studyHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return sortedHistory.map(result => ({
            name: new Date(result.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
            '점수': result.score,
        }));
    }, [studyHistory]);

    const recentHistory = [...studyHistory].reverse().slice(0, 10);

    const handleRowClick = (itemId: string) => {
        setSelectedItemId(prevId => (prevId === itemId ? null : itemId));
    };

    if (studyHistory.length === 0) {
        return (
            <div className="bg-slate-100 -m-4 md:-m-8 p-4 flex flex-col" style={{ minHeight: 'calc(100vh - 4rem)' }}>
                <div className="flex-grow flex items-center justify-center">
                    <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md mx-auto">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4">아직 학습 기록이 없어요.</h2>
                        <p className="text-sm sm:text-base text-slate-600 mb-8">첫 학습을 시작하고 진행 상황을 확인해보세요!</p>
                    </div>
                </div>
                 <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                     <Button onClick={onGoHome} className="w-full !bg-cyan-500 !text-white hover:!bg-cyan-600 focus:!ring-cyan-500 text-lg py-3">
                        학습 시작하기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-100 -m-4 md:-m-8 p-4">
            <div className="space-y-6 pb-24">
                {/* Stats Header */}
                <div className="bg-cyan-400 text-white rounded-xl shadow-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm font-semibold opacity-90">전체 학습</p>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <DiamondIcon className="w-5 h-5 text-cyan-200" />
                                <p className="text-2xl font-bold">{totalSessions}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-semibold opacity-90">평균 점수</p>
                             <div className="flex items-center justify-center gap-2 mt-1">
                                <DiamondIcon className="w-5 h-5 text-cyan-200" />
                                <p className="text-2xl font-bold">{averageScore.toFixed(0)}</p>
                            </div>
                        </div>
                        <div>
                           <p className="text-sm font-semibold opacity-90">최고 점수</p>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <DiamondIcon className="w-5 h-5 text-cyan-200" />
                                <p className="text-2xl font-bold">{highestScore.toFixed(0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <h2 className="text-lg font-bold text-slate-700 px-2 pt-2">학습 데이터 분석</h2>
                
                <Card className="!shadow-md">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">과목별 학습 성취도</h3>
                    {barChartData.length > 0 ? (
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={barChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis unit="점" domain={[0, 100]} />
                                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}점`} />
                                    <Legend />
                                    <Bar dataKey="평균 점수" fill="#0ea5e9" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <p className="text-slate-500">데이터가 부족하여 차트를 표시할 수 없습니다.</p>}
                </Card>
                
                <Card className="!shadow-md">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">학습 성취도 변화 추이</h3>
                    {lineChartData.length > 0 ? (
                         <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis unit="점" domain={[0, 100]} />
                                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}점`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="점수" stroke="#0ea5e9" strokeWidth={2} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <p className="text-slate-500">학습 기록이 2개 이상 모이면 추이 그래프가 표시됩니다.</p>}
                </Card>

                <Card className="!shadow-md">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">최근 학습 기록</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                <tr>
                                    <th scope="col" className="px-2 sm:px-6 py-3">날짜</th>
                                    <th scope="col" className="px-2 sm:px-6 py-3">과목</th>
                                    <th scope="col" className="px-2 sm:px-6 py-3">성취기준</th>
                                    <th scope="col" className="px-2 sm:px-6 py-3 text-right">점수</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentHistory.map(item => (
                                    <React.Fragment key={item.id}>
                                        <tr 
                                            className="bg-white border-b hover:bg-slate-50 cursor-pointer"
                                            onClick={() => handleRowClick(item.id)}
                                            aria-expanded={selectedItemId === item.id}
                                        >
                                            <td className="px-2 sm:px-6 py-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString('ko-KR')}</td>
                                            <td className="px-2 sm:px-6 py-4">{item.subject}</td>
                                            <td className="px-2 sm:px-6 py-4 truncate max-w-xs">{item.standardId}</td>
                                            <td className="px-2 sm:px-6 py-4 font-semibold text-sky-600 text-right">{item.score.toFixed(1)}점</td>
                                        </tr>
                                        {selectedItemId === item.id && (
                                            <tr className="bg-slate-50">
                                                <td colSpan={4} className="p-4 sm:p-6 border-b">
                                                    <h4 className="font-bold text-slate-700 mb-2">학습 상세 정보</h4>
                                                    <div className="text-slate-600 space-y-2 text-xs sm:text-sm">
                                                        <p><strong className="w-24 inline-block font-medium text-slate-800">학습일시:</strong> {new Date(item.date).toLocaleString('ko-KR')}</p>
                                                        <div className="flex">
                                                            <strong className="w-24 inline-block font-medium text-slate-800 shrink-0">성취기준:</strong> 
                                                            <span className="flex-1">{item.standardDescription}</span>
                                                        </div>
                                                        <p><strong className="w-24 inline-block font-medium text-slate-800">정답 수:</strong> {item.correctAnswers} / {item.totalQuestions}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                <Button onClick={onGoHome} className="w-full !bg-cyan-500 !text-white hover:!bg-cyan-600 focus:!ring-cyan-500 text-lg py-3">
                    돌아가기
                </Button>
            </div>
        </div>
    );
};