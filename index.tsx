
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

/** --- Constants & Types --- */
const ViewMode = { LOG: 'LOG', HISTORY: 'HISTORY', LIBRARY: 'LIBRARY' };
const DB_NAME = 'FoodFlowDB';
const DB_VERSION = 1;

/** --- IndexedDB Wrapper --- */
const DB = {
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('library')) db.createObjectStore('library', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  getAll: async (storeName: string): Promise<any[]> => {
    const db = await DB.open();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  },
  save: async (storeName: string, item: any): Promise<void> => {
    const db = await DB.open();
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(item);
  },
  saveMany: async (storeName: string, items: any[]): Promise<void> => {
    const db = await DB.open();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    items.forEach(item => store.put(item));
    return new Promise((resolve) => transaction.oncomplete = () => resolve());
  },
  delete: async (storeName: string, id: string): Promise<void> => {
    const db = await DB.open();
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(id);
  }
};

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

const LogView = ({ library, onLog }: { library: any[], onLog: (ids: string[], ts: number) => void }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [logTime, setLogTime] = useState(getIsoLocal(new Date()));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleSave = () => {
    if (selected.size > 0) {
      onLog(Array.from(selected), new Date(logTime).getTime());
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
                    className="flex-1 px-3 py-2 bg-white border border-emerald-400 rounded-lg outline-none font-bold text-gray-900 focus:ring-4 focus:ring-emerald-100"
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(entry.itemIds));
  const [editTime, setEditTime] = useState(getIsoLocal(new Date(entry.timestamp)));

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleSave = () => {
    if (selectedIds.size > 0) {
      onSave(entry.id, Array.from(selectedIds), new Date(editTime).getTime());
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
                const isSelected = selectedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
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
            disabled={selectedIds.size === 0}
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

  const libMap = useMemo(() => {
    const map = new Map();
    library.forEach((item: any) => map.set(item.id, item.name));
    return map;
  }, [library]);

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
              <button onClick={() => setEditingMeal(entry)} className="text-gray-200 hover:text-emerald-500 p-1 transition-colors"><i className="fa-solid fa-pencil text-xs"></i></button>
              <button onClick={() => setConfirmId(entry.id)} className="text-gray-200 hover:text-red-500 p-1 transition-colors"><i className="fa-solid fa-trash-can text-xs"></i></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {entry.itemIds.map((id: string, i: number) => {
              const name = libMap.get(id) || entry.itemSnapshots?.[id] || "Deleted Item";
              return (
                <span key={i} className="bg-gray-50 text-gray-600 px-3 py-1 rounded-xl text-xs font-semibold border border-gray-100">{name}</span>
              );
            })}
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
          onSave={(id: string, itemIds: string[], ts: number) => {
            onUpdate(id, itemIds, ts);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const lib = await DB.getAll('library');
        const hist = await DB.getAll('history');
        setLibrary(lib.sort((a,b) => a.name.localeCompare(b.name)));
        setHistory(hist.sort((a,b) => b.timestamp - a.timestamp));
      } catch (err) {
        console.error("DB Error", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const exportData = async () => {
    const lib = await DB.getAll('library');
    const hist = await DB.getAll('history');
    const data = JSON.stringify({ library: lib, history: hist }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foodflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (re: any) => {
        try {
          const data = JSON.parse(re.target.result);
          if (data.library && data.history) {
            await DB.saveMany('library', data.library);
            await DB.saveMany('history', data.history);
            window.location.reload();
          } else {
            alert("Invalid backup file format.");
          }
        } catch (err) {
          alert("Error parsing file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const addFood = async (name: string) => {
    const newItem = { id: generateId(), name };
    const next = [...library, newItem].sort((a,b) => a.name.localeCompare(b.name));
    setLibrary(next);
    await DB.save('library', newItem);
  };

  const updateFood = async (id: string, newName: string) => {
    const updated = { id, name: newName };
    const next = library.map(i => i.id === id ? updated : i).sort((a,b) => a.name.localeCompare(b.name));
    setLibrary(next);
    await DB.save('library', updated);
  };

  const deleteFood = async (id: string) => {
    const next = library.filter(i => i.id !== id);
    setLibrary(next);
    await DB.delete('library', id);
  };

  const logMeal = async (itemIds: string[], timestamp: number) => {
    const snapshots: any = {};
    library.filter(l => itemIds.includes(l.id)).forEach(l => snapshots[l.id] = l.name);
    const newEntry = { id: generateId(), timestamp, itemIds, itemSnapshots: snapshots };
    const next = [newEntry, ...history].sort((a,b) => b.timestamp - a.timestamp);
    setHistory(next);
    await DB.save('history', newEntry);
    setView(ViewMode.HISTORY);
  };

  const updateMeal = async (id: string, itemIds: string[], timestamp: number) => {
    const current = history.find(h => h.id === id);
    const snapshots = { ...current?.itemSnapshots };
    library.filter(l => itemIds.includes(l.id)).forEach(l => snapshots[l.id] = l.name);
    const updated = { ...current, itemIds, timestamp, itemSnapshots: snapshots };
    const next = history.map(h => h.id === id ? updated : h).sort((a,b) => b.timestamp - a.timestamp);
    setHistory(next);
    await DB.save('history', updated);
  };

  const deleteMeal = async (id: string) => {
    const next = history.filter(h => h.id !== id);
    setHistory(next);
    await DB.delete('history', id);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-emerald-500 flex flex-col items-center">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">Loading Records</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center shrink-0 z-40 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-emerald-600 tracking-tight leading-none">FoodFlow</h1>
          <div className="flex gap-4 mt-1">
             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Smart Sync</p>
             <div className="flex gap-2">
                <button onClick={exportData} title="Export Data" className="text-[9px] font-black text-emerald-400 hover:text-emerald-600 transition-colors uppercase tracking-widest flex items-center gap-1"><i className="fa-solid fa-download"></i> Export</button>
                <button onClick={importData} title="Import Data" className="text-[9px] font-black text-blue-400 hover:text-blue-600 transition-colors uppercase tracking-widest flex items-center gap-1"><i className="fa-solid fa-upload"></i> Import</button>
             </div>
          </div>
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
