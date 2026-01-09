
// Use global React, ReactDOM and htm provided by UMD bundles included in index.html
const { useState, useEffect, useMemo } = React;
const ReactDOMClient = ReactDOM; // ReactDOM.createRoot is available on the UMD build
const html = (window.htm || htm).bind(React.createElement);

/** --- Constants & DB --- */
const ViewMode = { LOG: 'LOG', HISTORY: 'HISTORY', STATS: 'STATS', LIBRARY: 'LIBRARY' };
const DB_NAME = 'FoodFlowDB';
const DB_VERSION = 1;

const DB = {
  open: () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('library')) db.createObjectStore('library', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }),
  getAll: async (storeName) => {
    const db = await DB.open();
    return new Promise(res => {
      const s = db.transaction(storeName, 'readonly').objectStore(storeName);
      const r = s.getAll();
      r.onsuccess = () => res(r.result);
    });
  },
  save: async (storeName, item) => {
    const db = await DB.open();
    db.transaction(storeName, 'readwrite').objectStore(storeName).put(item);
  },
  delete: async (storeName, id) => {
    const db = await DB.open();
    db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
  }
};

/** --- Helpers --- */
const generateId = () => 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
const getIsoLocal = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
const formatDate = (ts) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));

/** --- Components --- */

const StackedAreaChart = ({ data }) => {
  const width = 1000;
  const height = 400;
  const padding = 40;
  const periods = ['night', 'evening', 'afternoon', 'morning'];
  const colors = { morning: '#fbbf24', afternoon: '#10b981', evening: '#3b82f6', night: '#6366f1' };

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
    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-inner relative aspect-video overflow-hidden">
      <svg viewBox="0 0 1000 400" className="w-full h-full drop-shadow-sm">
        ${periods.map((p, idx) => html`
          <polygon key=${p} points=${getPoints(periods.length - 1 - idx)} fill=${colors[periods[periods.length - 1 - idx]]} style=${{ opacity: 0.8 }} />
        `)}
      </svg>
      <div className="absolute top-4 left-6 flex flex-wrap gap-2">
        ${periods.slice().reverse().map(p => html`
          <div key=${p} className="flex items-center gap-1 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-[8px] font-black uppercase text-gray-500 shadow-sm border border-gray-100">
            <div className="w-2 h-2 rounded-full" style=${{ background: colors[p] }} /> ${p}
          </div>
        `)}
      </div>
    </div>
  `;
};

const Navigation = ({ active, onChange }) => html`
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-3 px-2 shadow-2xl z-50 md:hidden">
    ${[
      { id: ViewMode.LOG, icon: 'fa-utensils', label: 'Log' },
      { id: ViewMode.HISTORY, icon: 'fa-clock-rotate-left', label: 'History' },
      { id: ViewMode.STATS, icon: 'fa-chart-area', label: 'Stats' },
      { id: ViewMode.LIBRARY, icon: 'fa-book', label: 'Library' },
    ].map(t => html`
      <button key=${t.id} onClick=${() => onChange(t.id)} className=${`flex flex-col items-center flex-1 transition-all ${active === t.id ? 'text-emerald-500 scale-110 font-black' : 'text-gray-400'}`}>
        <i className=${`fa-solid ${t.icon} text-lg mb-1`}></i>
        <span className="text-[8px] uppercase tracking-widest">${t.label}</span>
      </button>
    `)}
  </nav>
`;

const LogView = ({ library, onLog }) => {
  const [selected, setSelected] = useState(new Set());
  const [time, setTime] = useState(getIsoLocal(new Date()));

  const toggle = (id) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };

  if (!library.length) return html`<div className="py-20 text-center text-gray-400">Library is empty. Go to Library tab.</div>`;

  return html`
    <div className="space-y-6 pb-32 animate-fadeIn">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        ${library.map(i => html`
          <button key=${i.id} onClick=${() => toggle(i.id)} className=${`h-24 p-4 rounded-2xl border-2 transition-all flex items-center justify-center text-center font-bold text-sm ${selected.has(i.id) ? 'bg-emerald-500 border-emerald-500 text-white scale-95 shadow-lg' : 'bg-white border-gray-100 text-gray-700'}`}>
            ${i.name}
          </button>
        `)}
      </div>
      ${selected.size > 0 && html`
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-2xl sticky bottom-4 space-y-4 animate-slideUp">
          <input type="datetime-local" value=${time} onChange=${e => setTime(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800" />
          <button onClick=${() => { onLog(Array.from(selected), new Date(time).getTime()); setSelected(new Set()); }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black">Log ${selected.size} Item(s)</button>
        </div>
      `}
    </div>
  `;
};

const HistoryView = ({ history, library, onDelete, onUpdate }) => {
  const libMap = useMemo(() => new Map(library.map(l => [l.id, l.name])), [library]);
  const [editingId, setEditingId] = useState(null);
  const [editTime, setEditTime] = useState('');
  const [editItems, setEditItems] = useState(new Set());

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditTime(getIsoLocal(new Date(entry.timestamp)));
    setEditItems(new Set(entry.itemIds));
  };

  const toggleEditItem = (id) => {
    const newItems = new Set(editItems);
    if (newItems.has(id)) newItems.delete(id);
    else newItems.add(id);
    setEditItems(newItems);
  };

  const saveEdit = () => {
    if (editItems.size > 0) {
      const snaps = {};
      library.filter(l => editItems.has(l.id)).forEach(l => snaps[l.id] = l.name);
      onUpdate(editingId, Array.from(editItems), new Date(editTime).getTime(), snaps);
    }
    setEditingId(null);
    setEditTime('');
    setEditItems(new Set());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTime('');
    setEditItems(new Set());
  };

  return html`
    <div className="space-y-4 pb-24 animate-fadeIn">
      ${history.length === 0 ? html`<p className="text-center py-20 text-gray-400">No logs found.</p>` : history.map(h => html`
        <div key=${h.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          ${editingId === h.id ? html`
            <div className="space-y-4">
              <input type="datetime-local" value=${editTime} onChange=${e => setEditTime(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                ${library.map(i => html`
                  <button key=${i.id} onClick=${() => toggleEditItem(i.id)} className=${`h-16 p-2 rounded-xl border-2 transition-all flex items-center justify-center text-center font-bold text-xs ${editItems.has(i.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                    ${i.name}
                  </button>
                `)}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick=${saveEdit} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm"><i className="fa-solid fa-check mr-1"></i>Save</button>
                <button onClick=${cancelEdit} className="bg-gray-400 text-white px-4 py-2 rounded-lg font-bold text-sm"><i className="fa-solid fa-x mr-1"></i>Cancel</button>
              </div>
            </div>
          ` : html`
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">${formatDate(h.timestamp)}</p>
                <div className="flex flex-wrap gap-1">
                  ${h.itemIds.map(id => html`<span key=${id} className="bg-gray-50 px-2 py-1 rounded-lg text-xs font-bold text-gray-600 border border-gray-100">${libMap.get(id) || h.itemSnapshots?.[id] || '??'}</span>`)}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick=${() => startEdit(h)} className="text-gray-400 hover:text-blue-500 p-2"><i className="fa-solid fa-pen text-sm"></i></button>
                <button onClick=${() => onDelete(h.id)} className="text-gray-300 hover:text-red-500 p-2"><i className="fa-solid fa-trash-can text-sm"></i></button>
              </div>
            </div>
          `}
        </div>
      `)}
    </div>
  `;
};

const StatsView = ({ history, library }) => {
  const stats = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6 - i));
      return { date: d.getTime(), label: d.toLocaleDateString('en-US', { weekday: 'short' }), morning:0, afternoon:0, evening:0, night:0 };
    });
    history.forEach(h => {
      const d = new Date(h.timestamp); d.setHours(0,0,0,0);
      const day = days.find(x => x.date === d.getTime());
      if (day) {
        const hour = new Date(h.timestamp).getHours();
        if (hour >= 5 && hour < 11) day.morning++;
        else if (hour >= 11 && hour < 17) day.afternoon++;
        else if (hour >= 17 && hour < 22) day.evening++;
        else day.night++;
      }
    });
    return days;
  }, [history]);

  // Additional metrics for the Stats view
  const metrics = useMemo(() => {
    const totalsPerDay = stats.map(s => s.morning + s.afternoon + s.evening + s.night);
    const totalMeals = totalsPerDay.reduce((a,b) => a + b, 0);
    const avgPerDay = (totalMeals / stats.length) || 0;

    // Count top foods in the same 7-day window
    const startWindow = stats[0]?.date || 0;
    const foodCounts = new Map();
    history.filter(h => h.timestamp >= startWindow).forEach(h => {
      h.itemIds.forEach(id => {
        const name = h.itemSnapshots?.[id] || (library.find(l => l.id === id)?.name) || id;
        foodCounts.set(name, (foodCounts.get(name) || 0) + 1);
      });
    });

    const topFoods = Array.from(foodCounts.entries()).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0,5);

    const uniqueFoods = new Set();
    history.forEach(h => h.itemIds.forEach(id => uniqueFoods.add(id)));

    return { totalsPerDay, totalMeals, avgPerDay, topFoods, uniqueCount: uniqueFoods.size };
  }, [stats, history, library]);

  const MiniBarChart = ({ values, labels }) => {
    const max = Math.max(...values, 1);
    return html`
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <svg viewBox="0 0 100 40" className="w-full h-12">
          ${values.map((v,i) => {
            const x = (i / values.length) * 100 + 2;
            const w = 100 / values.length - 4;
            const h = (v / max) * 30;
            const y = 36 - h;
            return html`<rect key=${i} x=${x} y=${y} width=${w} height=${h} rx="1" fill="#10b981" />`;
          })}
        </svg>
        <div className="flex justify-between text-[10px] text-gray-400 mt-2">
          ${labels.map(l => html`<span key=${l} className="font-black">${l}</span>`)}
        </div>
      </div>
    `;
  };

  const TopFoods = ({ items }) => html`
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
      <h4 className="text-sm font-black text-gray-500 mb-3">Top Foods (7d)</h4>
      ${items.length === 0 ? html`<p className="text-gray-400 text-sm">No data</p>` : items.map(it => html`
        <div key=${it.name} className="flex items-center gap-3 py-2">
          <div className="flex-1">
            <div className="flex justify-between text-sm"><span className="font-bold text-gray-700">${it.name}</span><span className="text-gray-400 text-xs">${it.count}</span></div>
            <div className="w-full bg-gray-100 h-2 rounded-full mt-2"><div className="h-2 rounded-full bg-emerald-400" style=${{ width: `${(it.count / (items[0]?.count || 1)) * 100}%` }} /></div>
          </div>
        </div>
      `)}
    </div>
  `;

  return html`
    <div className="space-y-8 pb-24 animate-fadeIn">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Meal Timing (7 Days)</h3>
            <${StackedAreaChart} data=${stats} />
            <div className="flex justify-between mt-4 px-4">
              ${stats.map(s => html`<span key=${s.date} className="text-[9px] font-black text-gray-400 uppercase">${s.label}</span>`)}
            </div>
          </div>
          <${MiniBarChart} values=${metrics.totalsPerDay} labels=${stats.map(s => s.label)} />
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-400">Total Meals</div>
              <div className="text-2xl font-black text-gray-800">${metrics.totalMeals}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-400">Avg / Day</div>
              <div className="text-2xl font-black text-gray-800">${metrics.avgPerDay.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-400">Unique Foods</div>
              <div className="text-2xl font-black text-gray-800">${metrics.uniqueCount}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-400">Top Food</div>
              <div className="text-2xl font-black text-gray-800">${metrics.topFoods[0]?.name || '—'}</div>
            </div>
          </div>
          <${TopFoods} items=${metrics.topFoods} />
        </div>
      </div>
    </div>
  `;
};

const LibraryView = ({ library, onAdd, onDelete, onUpdate }) => {
  const [val, setVal] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState('');

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditVal(item.name);
  };

  const saveEdit = () => {
    if (editVal.trim() && editVal !== library.find(l => l.id === editingId)?.name) {
      onUpdate(editingId, editVal.trim());
    }
    setEditingId(null);
    setEditVal('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditVal('');
  };

  return html`
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex gap-2">
        <input value=${val} onChange=${e => setVal(e.target.value)} placeholder="Food name..." className="flex-1 p-5 bg-white border border-gray-200 rounded-3xl font-bold shadow-sm outline-none focus:ring-2 focus:ring-emerald-400" />
        <button onClick=${() => { if(val.trim()){ onAdd(val.trim()); setVal(''); } }} className="bg-emerald-500 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"><i className="fa-solid fa-plus text-xl"></i></button>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden divide-y divide-gray-50 shadow-sm">
        ${library.map(l => html`
          <div key=${l.id} className="p-5 flex justify-between items-center">
            ${editingId === l.id ? html`
              <div className="flex-1 flex gap-2">
                <input value=${editVal} onChange=${e => setEditVal(e.target.value)} className="flex-1 p-2 border border-gray-200 rounded-lg font-bold outline-none focus:ring-2 focus:ring-emerald-400" />
                <button onClick=${saveEdit} className="text-green-500 hover:text-green-700 p-2"><i className="fa-solid fa-check text-sm"></i></button>
                <button onClick=${cancelEdit} className="text-gray-400 hover:text-gray-600 p-2"><i className="fa-solid fa-x text-sm"></i></button>
              </div>
            ` : html`
              <span className="font-bold text-gray-700">${l.name}</span>
              <div className="flex gap-2">
                <button onClick=${() => startEdit(l)} className="text-gray-400 hover:text-blue-500 p-2"><i className="fa-solid fa-pen text-sm"></i></button>
                <button onClick=${() => onDelete(l.id)} className="text-gray-300 hover:text-red-500 p-2"><i className="fa-solid fa-trash-can text-sm"></i></button>
              </div>
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

  useEffect(() => {
    (async () => {
      const l = await DB.getAll('library');
      const h = await DB.getAll('history');
      setLibrary(l.sort((a,b) => a.name.localeCompare(b.name)));
      setHistory(h.sort((a,b) => b.timestamp - a.timestamp));
    })();
  }, []);

  const addFood = async (name) => {
    const item = { id: generateId(), name };
    setLibrary(prev => [...prev, item].sort((a,b) => a.name.localeCompare(b.name)));
    await DB.save('library', item);
  };

  const updateFood = async (id, name) => {
    const updatedItem = { id, name };
    setLibrary(prev => prev.map(l => l.id === id ? updatedItem : l).sort((a,b) => a.name.localeCompare(b.name)));
    await DB.save('library', updatedItem);
  };

  const deleteFood = async (id) => {
    setLibrary(prev => prev.filter(i => i.id !== id));
    await DB.delete('library', id);
  };

  const logMeal = async (itemIds, timestamp) => {
    const snaps = {};
    library.filter(l => itemIds.includes(l.id)).forEach(l => snaps[l.id] = l.name);
    const entry = { id: generateId(), timestamp, itemIds, itemSnapshots: snaps };
    setHistory(prev => [entry, ...prev].sort((a,b) => b.timestamp - a.timestamp));
    await DB.save('history', entry);
    setView(ViewMode.HISTORY);
  };

  const updateMeal = async (id, itemIds, timestamp, itemSnapshots) => {
    const updatedEntry = { id, timestamp, itemIds, itemSnapshots };
    setHistory(prev => prev.map(h => h.id === id ? updatedEntry : h).sort((a,b) => b.timestamp - a.timestamp));
    await DB.save('history', updatedEntry);
  };

  const deleteMeal = async (id) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    await DB.delete('history', id);
  };

  return html`
    <div className="h-full flex flex-col bg-gray-50 text-gray-900 select-none">
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex justify-between items-center z-40">
        <h1 className="text-3xl font-black text-emerald-600 tracking-tighter">FoodFlow</h1>
        <div className="hidden md:flex gap-4">
          ${[ViewMode.LOG, ViewMode.HISTORY, ViewMode.STATS, ViewMode.LIBRARY].map(v => html`
            <button key=${v} onClick=${() => setView(v)} className=${`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full transition-all ${view === v ? 'bg-emerald-500 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-100'}`}>${v}</button>
          `)}
        </div>
      </header>
      <main className="flex-1 overflow-hidden scroll-container px-6 py-6 no-scrollbar">
        <div className="max-w-2xl mx-auto w-full">
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

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
