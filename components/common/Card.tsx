
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`bg-white rounded-xl shadow-md overflow-hidden transition-shadow hover:shadow-lg ${className}`}>
            <div className="p-4 sm:p-6 md:p-8">
                {children}
            </div>
        </div>
    );
};
