
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import htm from 'htm';

const html = htm.bind(React.createElement);

/** --- Constants & Types --- */
const ViewMode = { LOG: 'LOG', HISTORY: 'HISTORY', STATS: 'STATS', LIBRARY: 'LIBRARY' };
const DB_NAME = 'FoodFlowDB';
const DB_VERSION = 1;

/** --- IndexedDB Utility --- */
const DB = {
  open: () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('library')) db.createObjectStore('library', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  getAll: async (storeName) => {
    const db = await DB.open();
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  },
  save: async (storeName, item) => {
    const db = await DB.open();
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(item);
  },
  saveMany: async (storeName, items) => {
    const db = await DB.open();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    items.forEach(item => store.put(item));
    return new Promise((resolve) => transaction.oncomplete = () => resolve());
  },
  delete: async (storeName, id) => {
    const db = await DB.open();
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(id);
  }
};

const generateId = () => 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);

const formatDate = (ts) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts));
};

const getIsoLocal = (date) => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().slice(0, 16);
};

/** --- Sub-Components --- */

const Navigation = ({ active, onChange }) => html`
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 px-2 shadow-lg z-50 md:hidden">
    ${[
      { id: ViewMode.LOG, icon: 'fa-utensils', label: 'Log' },
      { id: ViewMode.HISTORY, icon: 'fa-clock-rotate-left', label: 'History' },
      { id: ViewMode.STATS, icon: 'fa-chart-pie', label: 'Stats' },
      { id: ViewMode.LIBRARY, icon: 'fa-book', label: 'Library' },
    ].map(tab => html`
      <button
        key=${tab.id}
        onClick=${() => onChange(tab.id)}
        className=${`flex flex-col items-center justify-center flex-1 py-1 transition-all ${active === tab.id ? 'text-emerald-500 scale-105 font-black' : 'text-gray-400'}`}
      >
        <i className=${`fa-solid ${tab.icon} text-lg mb-1`}></i>
        <span className="text-[9px] uppercase tracking-wider">${tab.label}</span>
      </button>
    `)}
  </nav>
`;

const LogView = ({ library, onLog }) => {
  const [selected, setSelected] = useState(new Set());
  const [logTime, setLogTime] = useState(getIsoLocal(new Date()));

  const toggle = (id) => {
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
    return html`
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><i className="fa-solid fa-plus text-2xl"></i></div>
        <p className="font-medium">Library is empty.</p>
        <button onClick=${() => window.dispatchEvent(new CustomEvent('changeView', { detail: ViewMode.LIBRARY }))} className="mt-4 text-emerald-500 font-bold text-xs uppercase tracking-widest">Add Food Now</button>
      </div>
    `;
  }

  return html`
    <div className="space-y-6 animate-fadeIn pb-32">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        ${library.map(item => {
          const isSelected = selected.has(item.id);
          return html`
            <button
              key=${item.id}
              onClick=${() => toggle(item.id)}
              className=${`h-24 p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center relative ${
                isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg scale-95' : 'bg-white border-gray-100 text-gray-700 hover:border-emerald-200'
              }`}
            >
              <span className="text-sm font-bold leading-tight line-clamp-2">${item.name}</span>
              ${isSelected && html`<i className="fa-solid fa-check-circle absolute top-2 right-2 text-xs"></i>`}
            </button>
          `;
        })}
      </div>

      ${selected.size > 0 && html`
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xl space-y-4 animate-slideUp sticky bottom-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">When was this meal?</label>
            <input 
              type="datetime-local" 
              value=${logTime}
              onChange=${(e) => setLogTime(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <button
            onClick=${handleSave}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all"
          >
            Log ${selected.size} Item${selected.size > 1 ? 's' : ''}
          </button>
        </div>
      `}
    </div>
  `;
};

const HistoryEditModal = ({ entry, library, onSave, onCancel }) => {
  const [selectedIds, setSelectedIds] = useState(new Set(entry.itemIds));
  const [editTime, setEditTime] = useState(getIsoLocal(new Date(entry.timestamp)));

  const toggle = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  return html`
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-slideUp">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-gray-900">Adjust Log</h2>
          <button onClick=${onCancel} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"><i className="fa-solid fa-times"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Time Adjustment</label>
            <input type="datetime-local" value=${editTime} onChange=${(e) => setEditTime(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-400"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Items Logged</label>
            <div className="grid grid-cols-2 gap-2">
              ${library.map((item) => html`
                <button key=${item.id} onClick=${() => toggle(item.id)} className=${`p-3 rounded-xl border-2 text-xs font-bold transition-all ${selectedIds.has(item.id) ? 'bg-emerald-50 border-emerald-500 text-white' : 'bg-white border-gray-100 text-gray-600'}`}>${item.name}</button>
              `)}
            </div>
          </div>
        </div>
        <div className="p-8 bg-gray-50">
          <button onClick=${() => onSave(entry.id, Array.from(selectedIds), new Date(editTime).getTime())} disabled=${selectedIds.size === 0} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl disabled:bg-gray-300">Save Changes</button>
        </div>
      </div>
    </div>
  `;
};

const HistoryView = ({ history, library, onDelete, onUpdate }) => {
  const [confirmId, setConfirmId] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);

  const libMap = useMemo(() => {
    const map = new Map();
    library.forEach((item) => map.set(item.id, item.name));
    return map;
  }, [library]);

  if (history.length === 0) {
    return html`
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <i className="fa-solid fa-history text-4xl mb-4 opacity-10"></i>
        <p className="font-medium">No meals logged yet.</p>
      </div>
    `;
  }

  return html`
    <div className="space-y-4 pb-24 animate-fadeIn">
      ${history.map((entry) => html`
        <div key=${entry.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">${formatDate(entry.timestamp)}</span>
            <div className="flex gap-2">
              <button onClick=${() => setEditingMeal(entry)} className="text-gray-300 hover:text-emerald-500 transition-colors p-1"><i className="fa-solid fa-pen-to-square"></i></button>
              <button onClick=${() => setConfirmId(entry.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><i className="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            ${entry.itemIds.map((id, i) => {
              const name = libMap.get(id) || entry.itemSnapshots?.[id] || "Unknown Food";
              return html`
                <span key=${i} className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-100">${name}</span>
              `;
            })}
          </div>
          ${confirmId === entry.id && html`
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 p-4">
              <span className="text-xs font-black text-gray-900 uppercase">Permanently delete?</span>
              <div className="flex gap-2 w-full max-w-[200px]">
                <button onClick=${() => { onDelete(entry.id); setConfirmId(null); }} className="flex-1 bg-red-500 text-white py-2 rounded-xl text-[10px] font-bold shadow-lg shadow-red-100">YES</button>
                <button onClick=${() => setConfirmId(null)} className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-[10px] font-bold">NO</button>
              </div>
            </div>
          `}
        </div>
      `)}
      ${editingMeal && html`
        <${HistoryEditModal} 
          entry=${editingMeal} 
          library=${library} 
          onCancel=${() => setEditingMeal(null)}
          onSave=${(id, itemIds, ts) => {
            onUpdate(id, itemIds, ts);
            setEditingMeal(null);
          }}
        />
      `}
    </div>
  `;
};

const StackedAreaTrend = ({ data }) => {
  const width = 1000;
  const height = 400;
  const padding = 40;
  const periods = ['night', 'evening', 'afternoon', 'morning'];
  const colors = {
    morning: '#fcd34d', 
    afternoon: '#10b981', 
    evening: '#60a5fa', 
    night: '#6366f1' 
  };

  const maxValue = Math.max(...data.map(d => periods.reduce((acc, p) => acc + (d[p] || 0), 0)), 1);

  const getPoints = (pIdx) => {
    const subset = periods.slice(0, pIdx + 1);
    const topPoints = data.map((d, i) => {
      const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
      const sum = subset.reduce((acc, p) => acc + (d[p] || 0), 0);
      const y = height - (sum / maxValue) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });

    return [...topPoints, `${width - padding},${height - padding}`, `${padding},${height - padding}`].join(' ');
  };

  return html`
    <div className="relative w-full aspect-video bg-gray-50 rounded-3xl p-4 border border-gray-100 overflow-hidden shadow-inner">
      <svg viewBox=${`0 0 ${width} ${height}`} className="w-full h-full drop-shadow-sm">
        ${periods.map((p, idx) => html`
          <polygon key=${p} points=${getPoints(periods.length - 1 - idx)} fill=${colors[periods[periods.length - 1 - idx]]} style=${{ opacity: 0.85 }} className="transition-all duration-500" />
        `)}
      </svg>
      <div className="absolute top-4 left-6 flex flex-wrap gap-3">
        ${periods.slice().reverse().map(p => html`
          <div key=${p} className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full border border-gray-100 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full" style=${{ background: colors[p] }} />
            <span className="text-[9px] font-black uppercase text-gray-500">${p}</span>
          </div>
        `)}
      </div>
    </div>
  `;
};

const StatsView = ({ history, library }) => {
  const stats = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setHours(0,0,0,0);
      d.setDate(d.getDate() - (6 - i));
      return { 
        date: d.getTime(), label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        morning: 0, afternoon: 0, evening: 0, night: 0 
      };
    });

    const foodCounts = {};
    const libMap = new Map();
    library.forEach((l) => libMap.set(l.id, l.name));

    history.forEach((h) => {
      const hDate = new Date(h.timestamp);
      hDate.setHours(0,0,0,0);
      const day = last7Days.find(d => d.date === hDate.getTime());
      
      const hour = new Date(h.timestamp).getHours();
      let p = 'night';
      if (hour >= 5 && hour < 11) p = 'morning';
      else if (hour >= 11 && hour < 17) p = 'afternoon';
      else if (hour >= 17 && hour < 22) p = 'evening';

      if (day) day[p]++;
      h.itemIds.forEach((id) => {
        const name = libMap.get(id) || h.itemSnapshots?.[id] || "Unknown";
        foodCounts[name] = (foodCounts[name] || 0) + 1;
      });
    });

    const topFoods = Object.entries(foodCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    return { last7Days, topFoods };
  }, [history, library]);

  if (history.length === 0) {
    return html`
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <i className="fa-solid fa-chart-area text-4xl mb-4 opacity-10"></i>
        <p className="font-medium">Not enough data to graph.</p>
      </div>
    `;
  }

  return html`
    <div className="space-y-8 pb-24 animate-fadeIn">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6"><i className="fa-solid fa-clock-rotate-left mr-2 text-emerald-500"></i> Meal Timing Trends</h3>
        <${StackedAreaTrend} data=${stats.last7Days} />
        <div className="flex justify-between mt-4 px-4">
          ${stats.last7Days.map(d => html`<span key=${d.date} className="text-[9px] font-black text-gray-400 uppercase">${d.label}</span>`)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6"><i className="fa-solid fa-medal mr-2 text-amber-500"></i> Most Frequent</h3>
          <div className="space-y-4">
            ${stats.topFoods.map(([name, count], i) => html`
              <div key=${name} className="flex items-center gap-4">
                <span className="text-xs font-black text-emerald-600 w-4">${i+1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                    <span>${name}</span>
                    <span className="text-gray-400">${count}x</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style=${{ width: `${(count / Math.max(...stats.topFoods.map(f => f[1]), 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    </div>
  `;
};

const LibraryView = ({ library, onAdd, onDelete, onUpdate }) => {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (name.trim()) { onAdd(name.trim()); setName(''); }
  };

  const saveEdit = (id) => {
    if (editingName.trim()) {
      onUpdate(id, editingName.trim());
      setEditingId(null);
    }
  };

  return html`
    <div className="space-y-6 pb-24 animate-fadeIn">
      <form onSubmit=${submit} className="flex gap-2">
        <input type="text" value=${name} onChange=${e => setName(e.target.value)} placeholder="Enter a food item..." className="flex-1 p-5 bg-white border border-gray-200 rounded-[2rem] font-bold text-gray-800 outline-none focus:ring-4 focus:ring-emerald-50 transition-all shadow-sm"/>
        <button type="submit" className="bg-emerald-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100 active:scale-90 transition-transform"><i className="fa-solid fa-plus text-lg"></i></button>
      </form>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        ${library.length === 0 ? html`<p className="p-12 text-center text-gray-300 italic text-sm">Library is empty.</p>` : library.map((item) => html`
          <div key=${item.id} className="p-5 flex justify-between items-center group">
            ${editingId === item.id ? html`
              <div className="flex-1 flex gap-2">
                <input autoFocus className="flex-1 px-4 py-2 bg-white border-2 border-emerald-400 rounded-xl outline-none font-black text-gray-900 shadow-lg shadow-emerald-50" value=${editingName} onChange=${(e) => setEditingName(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && saveEdit(item.id)}/>
                <button onClick=${() => saveEdit(item.id)} className="text-emerald-500 bg-emerald-50 w-10 h-10 rounded-xl"><i className="fa-solid fa-check"></i></button>
                <button onClick=${() => setEditingId(null)} className="text-gray-400 bg-gray-50 w-10 h-10 rounded-xl"><i className="fa-solid fa-times"></i></button>
              </div>
            ` : html`
              <>
                <span className="font-bold text-gray-700">${item.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick=${() => { setEditingId(item.id); setEditingName(item.name); }} className="text-gray-300 hover:text-emerald-500 p-2"><i className="fa-solid fa-pen text-xs"></i></button>
                  <button onClick=${() => onDelete(item.id)} className="text-gray-300 hover:text-red-500 p-2"><i className="fa-solid fa-trash text-xs"></i></button>
                </div>
              </>
            `}
          </div>
        `)}
      </div>
    </div>
  `;
};

const App = () => {
  const [view, setView] = useState(ViewMode.LOG);
  const [library, setLibrary] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const lib = await DB.getAll('library');
        const hist = await DB.getAll('history');
        setLibrary(lib.sort((a,b) => a.name.localeCompare(b.name)));
        setHistory(hist.sort((a,b) => b.timestamp - a.timestamp));
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    load();
    const handleViewChange = (e) => setView(e.detail);
    window.addEventListener('changeView', handleViewChange);
    return () => window.removeEventListener('changeView', handleViewChange);
  }, []);

  const addFood = async (name) => {
    const item = { id: generateId(), name };
    setLibrary(prev => [...prev, item].sort((a,b) => a.name.localeCompare(b.name)));
    await DB.save('library', item);
  };

  const updateFood = async (id, name) => {
    const updated = { id, name };
    setLibrary(prev => prev.map(i => i.id === id ? updated : i).sort((a,b) => a.name.localeCompare(b.name)));
    await DB.save('library', updated);
  };

  const deleteFood = async (id) => {
    setLibrary(prev => prev.filter(i => i.id !== id));
    await DB.delete('library', id);
  };

  const logMeal = async (itemIds, timestamp) => {
    const snapshots = {};
    library.filter(l => itemIds.includes(l.id)).forEach(l => snapshots[l.id] = l.name);
    const entry = { id: generateId(), timestamp, itemIds, itemSnapshots: snapshots };
    setHistory(prev => [entry, ...prev].sort((a,b) => b.timestamp - a.timestamp));
    await DB.save('history', entry);
    setView(ViewMode.HISTORY);
  };

  const updateMeal = async (id, itemIds, timestamp) => {
    const current = history.find(h => h.id === id);
    const snapshots = { ...current?.itemSnapshots };
    library.filter(l => itemIds.includes(l.id)).forEach(l => snapshots[l.id] = l.name);
    const updated = { ...current, itemIds, timestamp, itemSnapshots: snapshots };
    setHistory(prev => prev.map(h => h.id === id ? updated : h).sort((a,b) => b.timestamp - a.timestamp));
    await DB.save('history', updated);
  };

  const deleteMeal = async (id) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    await DB.delete('history', id);
  };

  if (loading) return html`
    <div className="h-full flex items-center justify-center bg-gray-50">
      <i className="fa-solid fa-circle-notch fa-spin text-emerald-500 text-3xl"></i>
    </div>
  `;

  return html`
    <div className="h-full flex flex-col bg-gray-50 text-gray-900 overflow-hidden select-none">
      <header className="px-6 py-6 bg-white border-b border-gray-100 flex justify-between items-center z-40">
        <div>
          <h1 className="text-3xl font-black text-emerald-600 tracking-tighter leading-none">FoodFlow</h1>
          <div className="flex gap-4 mt-2">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Sync</span>
          </div>
        </div>
        <div className="hidden md:flex gap-3">
          ${[ViewMode.LOG, ViewMode.HISTORY, ViewMode.STATS, ViewMode.LIBRARY].map(v => html`
            <button key=${v} onClick=${() => setView(v)} className=${`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full transition-all ${view === v ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-100 scale-105' : 'text-gray-400 hover:bg-gray-50'}`}>${v}</button>
          `)}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="scroll-container p-6 max-w-2xl mx-auto w-full no-scrollbar pb-32">
          ${view === ViewMode.LOG && html`<${LogView} library=${library} onLog=${logMeal} />`}
          ${view === ViewMode.HISTORY && html`<${HistoryView} history=${history} library=${library} onDelete=${deleteMeal} onUpdate=${updateMeal} />`}
          ${view === ViewMode.STATS && html`<${StatsView} history=${history} library=${library} />`}
          ${view === ViewMode.LIBRARY && html`<${LibraryView} library=${library} onAdd=${addFood} onDelete=${deleteFood} onUpdate=${updateFood} />`}
        </div>
      </main>

      <${Navigation} active=${view} onChange=${setView} />
    </div>
  `;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
