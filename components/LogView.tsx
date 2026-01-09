
import React from 'react';
import { FoodItem } from '../types';

interface LogViewProps {
  library: FoodItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSave: () => void;
  timestamp: number;
  onTimestampChange: (ts: number) => void;
  isDesktop?: boolean;
}

const LogView: React.FC<LogViewProps> = ({ 
  library, 
  selectedIds, 
  onToggle, 
  onSave, 
  timestamp, 
  onTimestampChange,
  isDesktop = false
}) => {
  // Helper to convert timestamp to local datetime string format required by <input type="datetime-local">
  const toLocalDateTimeString = (ts: number) => {
    const date = new Date(ts);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (dateStr) {
      onTimestampChange(new Date(dateStr).getTime());
    }
  };

  const setNow = () => onTimestampChange(Date.now());

  if (library.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
        <div className="bg-gray-100 p-6 rounded-full">
          <i className="fa-solid fa-book-open text-4xl text-gray-300"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-700">Your library is empty</h2>
        <p className="text-gray-500">Go to the Library tab to add some foods you eat often.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-fadeIn ${isDesktop ? 'pb-4' : 'pb-12'}`}>
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quick Log</h2>
          <p className="text-sm text-gray-500">Tap items to record a meal</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
          {selectedIds.size} Selected
        </div>
      </div>

      {/* Grid: 2 columns on mobile, adapts within desktop column */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {library.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={`
                relative h-24 p-3 flex flex-col items-center justify-center text-center rounded-2xl transition-all duration-200 border-2
                ${isSelected 
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200 scale-95 ring-2 ring-emerald-200 ring-offset-2' 
                  : 'bg-white border-gray-100 text-gray-700 hover:border-emerald-200 hover:bg-emerald-50 active:scale-95'
                }
              `}
            >
              <span className={`text-sm font-bold truncate w-full px-1 ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                {item.name}
              </span>
              {isSelected && (
                <div className="absolute top-2 right-2 animate-bounceIn">
                  <i className="fa-solid fa-circle-check text-white"></i>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Date/Time Picker Section */}
      {selectedIds.size > 0 && (
        <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-3 animate-slideUp">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Meal Time
            </label>
            <button 
              onClick={setNow}
              className="text-xs text-emerald-600 font-bold hover:underline"
            >
              Use Current
            </button>
          </div>
          <input
            type="datetime-local"
            value={toLocalDateTimeString(timestamp)}
            onChange={handleDateChange}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none"
          />
        </div>
      )}

      {/* Save Button: Fixed on mobile, relative/sticky on desktop dashboard */}
      <div className={isDesktop 
        ? "sticky bottom-0 pt-4 bg-white/80 backdrop-blur-sm z-10"
        : "fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 pointer-events-none z-30"
      }>
        <button
          onClick={onSave}
          disabled={selectedIds.size === 0}
          className={`
            w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform pointer-events-auto
            ${selectedIds.size > 0 
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 translate-y-0 opacity-100' 
              : 'bg-gray-200 text-gray-400 translate-y-4 opacity-0 pointer-events-none'
            }
          `}
        >
          <i className="fa-solid fa-plus-circle mr-2"></i>
          Save Meal
        </button>
      </div>
    </div>
  );
};

export default LogView;
