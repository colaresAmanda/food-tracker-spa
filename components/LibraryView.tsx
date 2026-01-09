
import React, { useState, useRef } from 'react';
import { FoodItem } from '../types';
import { FoodTrackerManager } from '../services/StorageService';

interface LibraryViewProps {
  library: FoodItem[];
  onAdd: (name: string) => void;
  onUpdate: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onImportSuccess?: () => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ library, onAdd, onUpdate, onDelete, onImportSuccess }) => {
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  const startEditing = (item: FoodItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = (id: string) => {
    if (editValue.trim()) {
      onUpdate(id, editValue.trim());
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleExport = () => {
    const data = FoodTrackerManager.getAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `foodflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = FoodTrackerManager.importData(content);
      if (success) {
        alert("Data imported successfully!");
        if (onImportSuccess) onImportSuccess();
      } else {
        alert("Failed to import data. Please check the file format.");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Manage Library</h2>
          <p className="text-sm text-gray-500">Add foods you eat frequently</p>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <button 
              onClick={handleExport}
              className="p-2 text-gray-500 hover:text-emerald-600 transition-colors bg-gray-50 rounded-lg border border-gray-100"
              aria-label="Export"
            >
              <i className="fa-solid fa-file-export"></i>
            </button>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
              Export
            </span>
          </div>

          <div className="relative group">
            <button 
              onClick={handleImportClick}
              className="p-2 text-gray-500 hover:text-emerald-600 transition-colors bg-gray-50 rounded-lg border border-gray-100"
              aria-label="Import"
            >
              <i className="fa-solid fa-file-import"></i>
            </button>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
              Import
            </span>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g., Rice, Avocado, Coffee..."
          className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:bg-gray-300 transition-colors"
        >
          Add
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
          Stored Items ({library.length})
        </h3>
        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
          {library.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic">
              No items in your library yet.
            </div>
          ) : (
            library.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50 transition-colors group"
              >
                {editingId === item.id ? (
                  <div className="flex-1 flex gap-2 items-center animate-fadeIn">
                    <input 
                      type="text" 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 border bg-white text-gray-700 rounded-lg px-2 py-1 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                      autoFocus
                    />
                    <button onClick={() => saveEdit(item.id)} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded">
                      <i className="fa-solid fa-check"></i>
                    </button>
                    <button onClick={cancelEditing} className="text-gray-400 p-1 hover:bg-gray-100 rounded">
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(item)}
                        className="text-gray-300 hover:text-emerald-500 p-2 transition-colors"
                        aria-label="Edit"
                      >
                        <i className="fa-solid fa-pencil text-xs"></i>
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="text-gray-300 hover:text-red-500 p-2 transition-colors"
                        aria-label="Delete"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-start gap-3">
        <i className="fa-solid fa-circle-info mt-0.5"></i>
        <p>You can edit existing library items by clicking the pencil icon. Changes will apply to future logs but won't affect past history entries.</p>
      </div>
    </div>
  );
};

export default LibraryView;
