
import React from 'react';
import { View } from '../types';

interface NavigationProps {
  currentView: View;
  setView: (view: View) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  const tabs = [
    { id: View.LOG, icon: 'fa-utensils', label: 'Log' },
    { id: View.HISTORY, icon: 'fa-clock-rotate-left', label: 'History' },
    { id: View.LIBRARY, icon: 'fa-book', label: 'Library' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden max-w-lg mx-auto bg-white border-t flex justify-around items-center py-2 px-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setView(tab.id)}
          className={`flex flex-col items-center justify-center w-1/3 py-2 transition-all duration-300 ${
            currentView === tab.id 
              ? 'text-emerald-500 scale-110' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <i className={`fa-solid ${tab.icon} text-lg mb-1`}></i>
          <span className="text-xs font-semibold">{tab.label}</span>
          {currentView === tab.id && (
            <div className="w-1 h-1 bg-emerald-500 rounded-full mt-1"></div>
          )}
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
