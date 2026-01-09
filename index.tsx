
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

/** --- Constants & Types --- */
const ViewMode = { LOG: 'LOG', HISTORY: 'HISTORY', LIBRARY: 'LIBRARY' };
const STORAGE_KEYS = { LIBRARY: 'foodflow_lib_v3', HISTORY: 'foodflow_hist_v3' };

const generateId = () => 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);

const formatDate = (ts: number) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts));
};

const getIsoLocal = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().slice(0, 16);
};

/** --- Storage Service --- */
const Storage = {
  get: (key: string, def: any) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : def;
  },
  set: (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val))
};

/** --- Sub-Components --- */

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

const LogView = ({ library, onLog }: { library: any[], onLog: (names: string[], ts: number) => void }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [logTime, setLogTime] = useState(getIsoLocal(new Date()));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleSave = () => {
    const names = library.filter(i => selected.has(i.id)).map(i => i.name);
    if (names.length > 0) {
      onLog(names, new Date(logTime).getTime());
      setSelected(new Set());
    }
  };

  if (library.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 animate-fadeIn">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><i className="fa-solid fa-plus text-2xl"></i></div>
        <p className="font-medium">Library is empty.</p>
        <p className="text-sm">Add food in the Library tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-32">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {library.map(item => {
          const isSelected = selected.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`h-24 p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center relative ${
                isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-md scale-95' : 'bg-white border-gray-100 text-gray-700'
              }`}
            >
              <span className="text-sm font-bold leading-tight line-clamp-2">{item.name}</span>
              {isSelected && <i className="fa-solid fa-circle-check absolute top-2 right-2 text-[10px]"></i>}
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xl space-y-4 animate-slideUp">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Time of Meal</label>
            <input 
              type="datetime-local" 
              value={logTime}
              onChange={(e) => setLogTime(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none"
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
          >
            Log Meal ({selected.size})
          </button>
        </div>
      )}
    </div>
  );
};

const LibraryView = ({ library, onAdd, onDelete, onUpdate }: any) => {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const submit = (e: any) => {
    e.preventDefault();
    if (name.trim()) { onAdd(name.trim()); setName(''); }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const saveEdit = (id: string) => {
    if (editingName.trim()) {
      onUpdate(id, editingName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Add food (e.g. Rice)"
          className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-400 transition-shadow shadow-sm"
        />
        <button type="submit" className="bg-emerald-500 text-white px-6 rounded-2xl font-bold shadow-md">Add</button>
      </form>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {library.length === 0 ? (
          <p className="p-8 text-center text-gray-300 italic text-sm">Library is empty.</p>
        ) : (
          library.map((item: any) => (
            <div key={item.id} className="p-4 flex justify-between items-center bg-white min-h-[4rem]">
              {editingId === item.id ? (
                <div className="flex-1 flex gap-2 animate-fadeIn">
                  <input 
                    autoFocus
                    className="flex-1 px-3 py-2 bg-gray-50 border border-emerald-200 rounded-lg outline-none font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-400"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(item.id)}
                  />
                  <button onClick={() => saveEdit(item.id)} className="text-emerald-500 px-3 py-2 bg-emerald-50 rounded-lg"><i className="fa-solid fa-check"></i></button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 px-3 py-2 bg-gray-100 rounded-lg"><i className="fa-solid fa-xmark"></i></button>
                </div>
              ) : (
                <>
                  <span className="font-semibold text-gray-700 px-1">{item.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(item)} className="text-gray-200 hover:text-emerald-500 p-2 transition-colors"><i className="fa-solid fa-pencil text-sm"></i></button>
                    <button onClick={() => onDelete(item.id)} className="text-gray-200 hover:text-red-500 p-2 transition-colors"><i className="fa-solid fa-trash-can text-sm"></i></button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/** --- History Edit Modal --- */
const HistoryEditModal = ({ entry, library, onSave, onCancel }: any) => {
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set(entry.itemNames));
  const [editTime, setEditTime] = useState(getIsoLocal(new Date(entry.timestamp)));

  const toggle = (name: string) => {
    const next = new Set(selectedNames);
    if (next.has(name)) next.delete(name); else next.add(name);
    setSelectedNames(next);
  };

  const handleSave = () => {
    if (selectedNames.size > 0) {
      onSave(entry.id, Array.from(selectedNames), new Date(editTime).getTime());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-slideUp">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-black text-emerald-600 uppercase tracking-tight">Edit Meal</h2>
          <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-100 text-gray-400 hover:text-red-500 transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <section>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Modify Time</label>
            <input 
              type="datetime-local" 
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none"
            />
          </section>

          <section>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Modify Items</label>
            <div className="grid grid-cols-2 gap-2">
              {library.map((item: any) => {
                const isSelected = selectedNames.has(item.name);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.name)}
                    className={`h-20 p-3 rounded-xl border-2 transition-all flex items-center justify-center text-center relative ${
                      isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-gray-100 text-gray-600'
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight line-clamp-2">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="p-6 bg-white border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={selectedNames.size === 0}
            className="w-full bg-emerald-600 disabled:bg-gray-200 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all"
          >
            Update Meal
          </button>
        </div>
      </div>
    </div>
  );
};

const HistoryView = ({ history, library, onDelete, onUpdate }: any) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<any | null>(null);

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
      {history.map((entry: any) => (
        <div key={entry.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDate(entry.timestamp)}</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setEditingMeal(entry)}
                className="text-gray-200 hover:text-emerald-500 p-1 transition-colors"
              >
                <i className="fa-solid fa-pencil text-xs"></i>
              </button>
              <button 
                onClick={() => setConfirmId(entry.id)} 
                className="text-gray-200 hover:text-red-500 p-1 transition-colors"
              >
                <i className="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {entry.itemNames.map((name: string, i: number) => (
              <span key={i} className="bg-gray-50 text-gray-600 px-3 py-1 rounded-xl text-xs font-semibold border border-gray-100">{name}</span>
            ))}
          </div>
          {confirmId === entry.id && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center gap-3 animate-fadeIn z-10">
              <span className="text-xs font-bold text-red-600">Delete log?</span>
              <button onClick={() => { onDelete(entry.id); setConfirmId(null); }} className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold">DELETE</button>
              <button onClick={() => setConfirmId(null)} className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl text-[10px] font-bold">CANCEL</button>
            </div>
          )}
        </div>
      ))}
      {editingMeal && (
        <HistoryEditModal 
          entry={editingMeal} 
          library={library} 
          onCancel={() => setEditingMeal(null)}
          onSave={(id: string, items: string[], ts: number) => {
            onUpdate(id, items, ts);
            setEditingMeal(null);
          }}
        />
      )}
    </div>
  );
};

/** --- App Wrapper --- */

const App = () => {
  const [view, setView] = useState(ViewMode.LOG);
  const [library, setLibrary] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    setLibrary(Storage.get(STORAGE_KEYS.LIBRARY, []).sort((a:any,b:any) => a.name.localeCompare(b.name)));
    setHistory(Storage.get(STORAGE_KEYS.HISTORY, []).sort((a:any,b:any) => b.timestamp - a.timestamp));
  }, []);

  const addFood = (name: string) => {
    const next = [...library, { id: generateId(), name }].sort((a,b) => a.name.localeCompare(b.name));
    setLibrary(next); Storage.set(STORAGE_KEYS.LIBRARY, next);
  };

  const updateFood = (id: string, newName: string) => {
    const next = library.map(i => i.id === id ? { ...i, name: newName } : i).sort((a,b) => a.name.localeCompare(b.name));
    setLibrary(next); Storage.set(STORAGE_KEYS.LIBRARY, next);
  };

  const deleteFood = (id: string) => {
    const next = library.filter(i => i.id !== id);
    setLibrary(next); Storage.set(STORAGE_KEYS.LIBRARY, next);
  };

  const logMeal = (itemNames: string[], timestamp: number) => {
    const next = [{ id: generateId(), timestamp, itemNames }, ...history].sort((a,b) => b.timestamp - a.timestamp);
    setHistory(next); Storage.set(STORAGE_KEYS.HISTORY, next);
    setView(ViewMode.HISTORY);
  };

  const updateMeal = (id: string, itemNames: string[], timestamp: number) => {
    const next = history.map(h => h.id === id ? { ...h, itemNames, timestamp } : h).sort((a,b) => b.timestamp - a.timestamp);
    setHistory(next); Storage.set(STORAGE_KEYS.HISTORY, next);
  };

  const deleteMeal = (id: string) => {
    const next = history.filter(h => h.id !== id);
    setHistory(next); Storage.set(STORAGE_KEYS.HISTORY, next);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center shrink-0 z-40 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-emerald-600 tracking-tight leading-none">FoodFlow</h1>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Focus on Fuel</p>
        </div>
        <div className="hidden md:flex gap-2">
          {[ViewMode.LOG, ViewMode.HISTORY, ViewMode.LIBRARY].map(v => (
            <button key={v} onClick={() => setView(v)} className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-all ${view === v ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}>{v}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="scroll-container p-6 max-w-2xl mx-auto w-full no-scrollbar">
          {view === ViewMode.LOG && <LogView library={library} onLog={logMeal} />}
          {view === ViewMode.HISTORY && <HistoryView history={history} library={library} onDelete={deleteMeal} onUpdate={updateMeal} />}
          {view === ViewMode.LIBRARY && <LibraryView library={library} onAdd={addFood} onDelete={deleteFood} onUpdate={updateFood} />}
        </div>
      </main>

      <Navigation active={view} onChange={setView} />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
