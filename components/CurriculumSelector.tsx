import React, { useState, useMemo, useEffect } from 'react';
import type { EducationCurriculum, Subject, Unit, GradeContent, AchievementStandard } from '../types.ts';
import { Button } from './common/Button.tsx';

interface CurriculumSelectorProps {
    educationCurriculums: EducationCurriculum[];
    onStartStudy: (subjectName: string, standard: AchievementStandard) => void;
}

export const CurriculumSelector: React.FC<CurriculumSelectorProps> = ({ educationCurriculums, onStartStudy }) => {
    const [selectedCurriculumName, setSelectedCurriculumName] = useState<string>(educationCurriculums[0].name);
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedSubjectName, setSelectedSubjectName] = useState<string>('');
    const [selectedUnitName, setSelectedUnitName] = useState<string>('');
    const [selectedStandardId, setSelectedStandardId] = useState<string>('');

    const {
        availableSubjects,
        selectedSubject,
        availableGrades,
        availableUnits,
        availableStandards,
        selectedStandard,
    } = useMemo(() => {
        const curriculum = educationCurriculums.find(c => c.name === selectedCurriculumName) || educationCurriculums[0];
        
        const subjects = curriculum.subjects;

        const subject = subjects.find(s => s.name === selectedSubjectName) || null;
        
        const grades = subject ? subject.grades.map(g => g.grade) : [];
        
        const gradeContent = subject?.grades.find(g => g.grade === selectedGrade) || null;
        
        const units = gradeContent ? gradeContent.units : [];
        
        const unit = units.find(u => u.name === selectedUnitName) || null;
        
        const standards = unit ? unit.standards : [];
        
        const standard = standards.find(s => s.id === selectedStandardId) || null;

        return {
            selectedCurriculum: curriculum,
            availableSubjects: subjects,
            selectedSubject: subject,
            availableGrades: grades,
            selectedGradeContent: gradeContent,
            availableUnits: units,
            selectedUnit: unit,
            availableStandards: standards,
            selectedStandard: standard,
        };
    }, [educationCurriculums, selectedCurriculumName, selectedSubjectName, selectedGrade, selectedUnitName, selectedStandardId]);
    
    useEffect(() => {
        setSelectedGrade('');
        setSelectedSubjectName('');
        setSelectedUnitName('');
        setSelectedStandardId('');
    }, [selectedCurriculumName]);
    
    useEffect(() => {
       setSelectedUnitName('');
       setSelectedStandardId('');
    }, [selectedGrade]);

    useEffect(() => {
        setSelectedGrade('');
        setSelectedUnitName('');
        setSelectedStandardId('');
    }, [selectedSubjectName]);

    useEffect(() => {
        setSelectedStandardId('');
    }, [selectedUnitName]);

    const handleSubmit = () => {
        if (selectedSubject && selectedStandard) {
            onStartStudy(selectedSubject.name, selectedStandard);
        }
    };

    const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
        <select {...props} className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out">
            {children}
        </select>
    );

    return (
         <div className="max-w-3xl mx-auto text-center px-4">
            <div className="my-3 md:my-4">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
                    <span className="text-blue-800">AI 쌤과 함께</span><br />
                    <span className="text-orange-500">실력 레벨업!</span>
                </h1>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mt-4 text-left">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-blue-800">학습 목표 설정</h2>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="curriculum" className="block text-sm font-medium text-slate-700 mb-1">교육과정</label>
                        <Select id="curriculum" value={selectedCurriculumName} onChange={e => setSelectedCurriculumName(e.target.value)}>
                            {educationCurriculums.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1">과목</label>
                        <Select id="subject" value={selectedSubjectName} onChange={e => setSelectedSubjectName(e.target.value)} disabled={availableSubjects.length === 0}>
                             <option value="" disabled={selectedSubjectName !== ''}>과목을 선택하세요</option>
                            {availableSubjects.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                        </Select>
                    </div>
                     <div>
                        <label htmlFor="grade" className="block text-sm font-medium text-slate-700 mb-1">학년</label>
                        <Select id="grade" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} disabled={!selectedSubjectName}>
                            <option value="" disabled={selectedGrade !== ''}>학년을 선택하세요</option>
                            {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="unit" className="block text-sm font-medium text-slate-700 mb-1">단원</label>
                        <Select id="unit" value={selectedUnitName} onChange={e => setSelectedUnitName(e.target.value)} disabled={!selectedGrade}>
                            <option value="" disabled={selectedUnitName !== ''}>단원을 선택하세요</option>
                            {availableUnits.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="standard" className="block text-sm font-medium text-slate-700 mb-1">성취기준</label>
                        <Select id="standard" value={selectedStandardId} onChange={e => setSelectedStandardId(e.target.value)} disabled={!selectedUnitName || availableStandards.length === 0}>
                            <option value="" disabled={selectedStandardId !== ''}>성취기준을 선택하세요</option>
                            {availableStandards.map(s => <option key={s.id} value={s.id}>{s.id}: {s.description}</option>)}
                        </Select>
                    </div>
                </div>
            </div>

             <div className="sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent py-4 -mx-4 px-4">
                <Button 
                    onClick={handleSubmit} 
                    disabled={!selectedStandardId} 
                    className="w-full !bg-orange-500 !text-white hover:!bg-orange-600 focus:!ring-orange-500 text-lg sm:text-xl py-4"
                >
                    학습 여정 시작하기
                </Button>
            </div>
        </div>
    );
};