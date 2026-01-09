
import React, { useState } from 'react';
import { MealEntry } from '../types';

interface HistoryViewProps {
  history: MealEntry[];
  onUpdateMeal: (id: string, itemNames: string[], timestamp: number) => void;
  onDeleteMeal: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onUpdateMeal, onDeleteMeal }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNames, setEditNames] = useState('');
  const [editTimestamp, setEditTimestamp] = useState<number>(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const toLocalDateTimeString = (ts: number) => {
    const date = new Date(ts);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const isToday = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const startEditing = (e: React.MouseEvent, entry: MealEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(entry.id);
    setEditNames(entry.itemNames.join(', '));
    setEditTimestamp(entry.timestamp);
    setConfirmDeleteId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(null);
  };

  const saveEdit = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const names = editNames.split(',').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length > 0) {
      onUpdateMeal(id, names, editTimestamp);
      setEditingId(null);
    }
  };

  const handleDeleteTrigger = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmDeleteId === id) {
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setEditingId(null);
    }
  };

  const handleFinalDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteMeal(id);
    setConfirmDeleteId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
        <div className="bg-gray-100 p-6 rounded-full">
          <i className="fa-solid fa-hourglass text-4xl text-gray-300"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-700">No history yet</h2>
        <p className="text-gray-500">Meals you log will appear here in chronological order.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-24 px-1">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Activity Log</h2>
        <p className="text-sm text-gray-500">Your recent eating history</p>
      </div>

      <div className="space-y-4">
        {history.map((entry) => (
          <div key={entry.id} className="relative pl-6 pb-6 border-l-2 border-emerald-100 last:border-0">
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${isToday(entry.timestamp) ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
            
            <div className="bg-white rounded-2xl p-4 border shadow-sm transition-all relative overflow-hidden">
              {editingId === entry.id ? (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Editing Entry</span>
                    <div className="flex gap-2">
                      <button onClick={(e) => saveEdit(e, entry.id)} className="bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold shadow-sm active:scale-95">SAVE</button>
                      <button onClick={cancelEditing} className="bg-gray-100 text-gray-500 text-[10px] px-3 py-1.5 rounded-lg font-bold active:scale-95">CANCEL</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <input 
                      type="text" 
                      value={editNames}
                      onChange={(e) => setEditNames(e.target.value)}
                      className="w-full text-sm p-3 border bg-gray-50 text-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <input 
                      type="datetime-local" 
                      value={toLocalDateTimeString(editTimestamp)}
                      onChange={(e) => setEditTimestamp(new Date(e.target.value).getTime())}
                      className="w-full text-sm p-3 border bg-gray-50 text-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none mt-2"
                    />
                  </div>
                </div>
              ) : confirmDeleteId === entry.id ? (
                <div className="flex items-center justify-between animate-fadeIn bg-red-50 p-2 rounded-xl border border-red-100">
                  <span className="text-xs font-bold text-red-600 ml-2">Delete entry?</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => handleFinalDelete(e, entry.id)}
                      className="bg-red-500 text-white text-[10px] px-4 py-2 rounded-lg font-bold shadow-md active:scale-90"
                    >
                      DELETE
                    </button>
                    <button 
                      onClick={cancelDelete}
                      className="bg-white text-gray-500 text-[10px] px-4 py-2 rounded-lg font-bold border active:scale-90"
                    >
                      NO
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase w-fit mb-1">
                        {isToday(entry.timestamp) ? 'Today' : formatDate(entry.timestamp).split(',')[0]}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {formatDate(entry.timestamp).split(',')[1] || formatDate(entry.timestamp)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => startEditing(e, entry)}
                        className="text-gray-300 hover:text-emerald-500 p-3 transition-colors rounded-full"
                      >
                        <i className="fa-solid fa-pencil text-xs"></i>
                      </button>
                      <button 
                        onClick={(e) => handleDeleteTrigger(e, entry.id)}
                        className="text-gray-300 hover:text-red-500 p-3 transition-colors rounded-full"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-1">
                    {entry.itemNames.map((name, idx) => (
                      <span 
                        key={`${entry.id}-${idx}`} 
                        className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-100"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryView;
