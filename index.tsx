
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

/**
 * --- Constants & Types ---
 */
const ViewMode = {
  LOG: 'LOG',
  HISTORY: 'HISTORY',
  LIBRARY: 'LIBRARY'
};

/**
 * --- Utils ---
 */
const generateId = () => {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
};

const formatDate = (ts: number) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
};

/**
 * --- Storage Manager ---
 */
const Storage = {
  get: (key: string, defaultValue: any) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  },
  set: (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const APP_KEYS = {
  LIBRARY: 'foodflow_lib_v1',
  HISTORY: 'foodflow_hist_v1'
};

/**
 * --- Components ---
 */

const Navigation = ({ active, onChange }: { active: string, onChange: (v: string) => void }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 px-4 shadow-lg z-50 md:hidden">
    {[
      { id: ViewMode.LOG, icon: 'fa-utensils', label: 'Log' },
      { id: ViewMode.HISTORY, icon: 'fa-clock-rotate-left', label: 'History' },
      { id: ViewMode.LIBRARY, icon: 'fa-book', label: 'Library' },
    ].map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex flex-col items-center justify-center w-1/3 py-1 transition-all ${active === tab.id ? 'text-emerald-500 scale-105' : 'text-gray-400'}`}
      >
        <i className={`fa-solid ${tab.icon} text-lg mb-1`}></i>
        <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
      </button>
    ))}
  </nav>
);

const LogView = ({ library, onLog }: { library: any[], onLog: (names: string[]) => void }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSave = () => {
    const names = library.filter(i => selected.has(i.id)).map(i => i.name);
    if (names.length > 0) {
      onLog(names);
      setSelected(new Set());
    }
  };

  if (library.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 animate-fadeIn">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <i className="fa-solid fa-plus text-2xl"></i>
        </div>
        <p className="font-medium">Library is empty.</p>
        <p className="text-sm">Add items in the Library tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <div className="grid grid-cols-2 gap-3">
        {library.map(item => {
          const isSelected = selected.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`h-24 p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center relative ${
                isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-md scale-95' : 'bg-white border-gray-100 text-gray-700 active:bg-gray-50'
              }`}
            >
              <span className="text-sm font-bold leading-tight line-clamp-2">{item.name}</span>
              {isSelected && <i className="fa-solid fa-circle-check absolute top-2 right-2 text-[10px]"></i>}
            </button>
          );
        })}
      </div>
      {selected.size > 0 && (
        <button
          onClick={handleSave}
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-transform animate-slideUp"
        >
          Save Meal ({selected.size})
        </button>
      )}
    </div>
  );
};

const HistoryView = ({ history, onDelete }: { history: any[], onDelete: (id: string) => void }) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 animate-fadeIn">
        <i className="fa-solid fa-clock-rotate-left text-4xl mb-4 opacity-20"></i>
        <p className="font-medium">No meals logged yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {history.map(entry => (
        <div key={entry.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDate(entry.timestamp)}</span>
            <button onClick={() => setConfirmId(confirmId === entry.id ? null : entry.id)} className="text-gray-300 hover:text-red-500 p-1">
              <i className="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {entry.itemNames.map((name: string, i: number) => (
              <span key={i} className="bg-gray-50 text-gray-600 px-3 py-1 rounded-xl text-xs font-semibold border border-gray-100">
                {name}
              </span>
            ))}
          </div>
          {confirmId === entry.id && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center gap-3 animate-fadeIn z-10 px-4">
              <span className="text-xs font-bold text-red-600">Delete this log?</span>
              <button 
                onClick={() => { onDelete(entry.id); setConfirmId(null); }}
                className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold shadow-md active:scale-90"
              >
                DELETE
              </button>
              <button onClick={() => setConfirmId(null)} className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl text-[10px] font-bold active:scale-90">
                CANCEL
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const LibraryView = ({ library, onAdd, onDelete }: { library: any[], onAdd: (n: string) => void, onDelete: (id: string) => void }) => {
  const [name, setName] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim());
      setName('');
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="New food (e.g. Avocado)"
          className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-400 transition-shadow shadow-sm"
        />
        <button type="submit" className="bg-emerald-500 text-white px-6 rounded-2xl font-bold active:scale-95 transition-transform shadow-md">
          Add
        </button>
      </form>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {library.length === 0 ? (
          <p className="p-8 text-center text-gray-300 italic text-sm">No items in your library.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {library.map(item => (
              <div key={item.id} className="p-4 flex justify-between items-center group active:bg-gray-50">
                <span className="font-semibold text-gray-700">{item.name}</span>
                <button onClick={() => onDelete(item.id)} className="text-gray-200 hover:text-red-500 p-2 transition-colors">
                  <i className="fa-solid fa-trash-can text-sm"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * --- Main Application ---
 */
const App = () => {
  const [view, setView] = useState(ViewMode.LOG);
  const [library, setLibrary] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Load state
  useEffect(() => {
    const lib = Storage.get(APP_KEYS.LIBRARY, []);
    const hist = Storage.get(APP_KEYS.HISTORY, []);
    // Migration: ensure IDs exist
    const migratedLib = lib.map((i: any) => i.id ? i : { ...i, id: generateId() });
    const migratedHist = hist.map((i: any) => i.id ? i : { ...i, id: generateId() });
    setLibrary(migratedLib.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    setHistory(migratedHist.sort((a: any, b: any) => b.timestamp - a.timestamp));
  }, []);

  // Handlers
  const addFood = (name: string) => {
    const next = [...library, { id: generateId(), name, timestamp: Date.now() }].sort((a, b) => a.name.localeCompare(b.name));
    setLibrary(next);
    Storage.set(APP_KEYS.LIBRARY, next);
  };

  const deleteFood = (id: string) => {
    const next = library.filter(i => i.id !== id);
    setLibrary(next);
    Storage.set(APP_KEYS.LIBRARY, next);
  };

  const logMeal = (itemNames: string[]) => {
    const next = [{ id: generateId(), timestamp: Date.now(), itemNames }, ...history];
    setHistory(next);
    Storage.set(APP_KEYS.HISTORY, next);
    setView(ViewMode.HISTORY);
  };

  const deleteMeal = (id: string) => {
    const next = history.filter(h => h.id !== id);
    setHistory(next);
    Storage.set(APP_KEYS.HISTORY, next);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center shrink-0 z-40 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-emerald-600 tracking-tight leading-none">FoodFlow</h1>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Focus on what matters</p>
        </div>
        <div className="hidden md:flex gap-4">
          {[ViewMode.LOG, ViewMode.HISTORY, ViewMode.LIBRARY].map(v => (
            <button key={v} onClick={() => setView(v)} className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all ${view === v ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:bg-gray-100'}`}>
              {v}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <div className="scroll-container p-6 max-w-lg mx-auto w-full no-scrollbar">
          {view === ViewMode.LOG && <LogView library={library} onLog={logMeal} />}
          {view === ViewMode.HISTORY && <HistoryView history={history} onDelete={deleteMeal} />}
          {view === ViewMode.LIBRARY && <LibraryView library={library} onAdd={addFood} onDelete={deleteFood} />}
        </div>
      </main>

      <Navigation active={view} onChange={setView} />
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App />);
}
