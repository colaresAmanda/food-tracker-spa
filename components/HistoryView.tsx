
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

  const startEditing = (entry: MealEntry) => {
    setEditingId(entry.id);
    setEditNames(entry.itemNames.join(', '));
    setEditTimestamp(entry.timestamp);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    const names = editNames.split(',').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length > 0) {
      onUpdateMeal(id, names, editTimestamp);
      setEditingId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = (id: string) => {
    onDeleteMeal(id);
    setConfirmDeleteId(null);
  };

  const cancelDelete = () => {
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
    <div className="space-y-6 animate-fadeIn pb-20">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Activity Log</h2>
        <p className="text-sm text-gray-500">Your recent eating history</p>
      </div>

      <div className="space-y-4">
        {history.map((entry) => (
          <div key={entry.id} className="relative pl-6 pb-6 border-l-2 border-emerald-100 last:border-0">
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${isToday(entry.timestamp) ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
            
            <div className="bg-white rounded-2xl p-4 border shadow-sm hover:shadow-md transition-shadow group relative">
              {editingId === entry.id ? (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Editing Entry</span>
                    <div className="flex gap-1">
                      <button onClick={() => saveEdit(entry.id)} className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded hover:bg-emerald-600 font-bold">SAVE</button>
                      <button onClick={cancelEditing} className="bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded hover:bg-gray-200 font-bold">CANCEL</button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400">Items</label>
                    <input 
                      type="text" 
                      value={editNames}
                      onChange={(e) => setEditNames(e.target.value)}
                      className="w-full text-sm p-2 border bg-white text-gray-700 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400">Date & Time</label>
                    <input 
                      type="datetime-local" 
                      value={toLocalDateTimeString(editTimestamp)}
                      onChange={(e) => setEditTimestamp(new Date(e.target.value).getTime())}
                      className="w-full text-sm p-2 border bg-white text-gray-700 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              ) : confirmDeleteId === entry.id ? (
                <div className="flex items-center justify-between animate-fadeIn bg-red-50 p-2 rounded-lg border border-red-100">
                  <span className="text-xs font-bold text-red-600">Delete this entry?</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => confirmDelete(entry.id)}
                      className="bg-red-500 text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-sm"
                    >
                      YES
                    </button>
                    <button 
                      onClick={cancelDelete}
                      className="bg-white text-gray-500 text-[10px] px-3 py-1 rounded-full font-bold border shadow-sm"
                    >
                      NO
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase w-fit mb-1">
                        {isToday(entry.timestamp) ? 'Today' : formatDate(entry.timestamp).split(',')[0]}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {formatDate(entry.timestamp).split(',')[1] || formatDate(entry.timestamp)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        type="button"
                        onClick={() => startEditing(entry)}
                        className="text-gray-300 hover:text-emerald-500 p-2 transition-colors z-10"
                        aria-label="Edit entry"
                      >
                        <i className="fa-solid fa-pencil text-xs"></i>
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteClick(entry.id)}
                        className="text-gray-300 hover:text-red-500 p-2 transition-colors z-10"
                        aria-label="Delete entry"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-1">
                    {entry.itemNames.map((name, idx) => (
                      <span 
                        key={`${entry.id}-${idx}`} 
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs md:text-sm font-medium"
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
