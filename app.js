
/**
 * --- Application State ---
 */
const state = {
    view: 'LOG',
    library: [],
    history: [],
    selected: new Set(),
    confirmDeleteId: null
};

const STORAGE_KEYS = {
    LIBRARY: 'foodflow_lib_v2',
    HISTORY: 'foodflow_hist_v2'
};

/**
 * --- Utilities ---
 */
const generateId = () => 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);

const formatDate = (ts) => {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(ts));
};

/**
 * --- Local Storage Helpers ---
 */
const saveState = () => {
    localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(state.library));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history));
};

const loadState = () => {
    const lib = localStorage.getItem(STORAGE_KEYS.LIBRARY);
    const hist = localStorage.getItem(STORAGE_KEYS.HISTORY);
    
    state.library = lib ? JSON.parse(lib) : [];
    state.history = hist ? JSON.parse(hist) : [];
    
    // Sort library alphabetically
    state.library.sort((a, b) => a.name.localeCompare(b.name));
    // Sort history chronologically (newest first)
    state.history.sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * --- View Rendering ---
 */
const render = () => {
    const container = document.getElementById('content-container');
    container.innerHTML = '';
    container.className = 'scroll-container p-6 max-w-2xl mx-auto w-full no-scrollbar animate-fadeIn';

    // Update Navigation UI
    document.querySelectorAll('.nav-btn, .nav-btn-mobile').forEach(btn => {
        if (btn.dataset.view === state.view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (state.view === 'LOG') {
        renderLogView(container);
    } else if (state.view === 'HISTORY') {
        renderHistoryView(container);
    } else if (state.view === 'LIBRARY') {
        renderLibraryView(container);
    }
};

const renderLogView = (container) => {
    if (state.library.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <i class="fa-solid fa-plus text-2xl"></i>
                </div>
                <p class="font-medium">Library is empty.</p>
                <p class="text-sm">Add items in the Library tab.</p>
            </div>
        `;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6';

    state.library.forEach(item => {
        const isSelected = state.selected.has(item.id);
        const btn = document.createElement('button');
        btn.className = `food-card h-24 md:h-28 p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center relative ${isSelected ? 'selected' : 'bg-white border-gray-100 text-gray-700'}`;
        btn.innerHTML = `
            <span class="text-sm md:text-base font-bold leading-tight line-clamp-2">${item.name}</span>
            ${isSelected ? '<i class="fa-solid fa-circle-check absolute top-2 right-2 text-[10px]"></i>' : ''}
        `;
        btn.onclick = () => {
            if (state.selected.has(item.id)) state.selected.delete(item.id);
            else state.selected.add(item.id);
            render();
        };
        grid.appendChild(btn);
    });

    container.appendChild(grid);

    if (state.selected.size > 0) {
        const saveBtn = document.createElement('button');
        saveBtn.className = 'w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-transform animate-slideUp';
        saveBtn.textContent = `Save Meal (${state.selected.size})`;
        saveBtn.onclick = handleSaveMeal;
        container.appendChild(saveBtn);
    }
};

const renderHistoryView = (container) => {
    if (state.history.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                <i class="fa-solid fa-clock-rotate-left text-4xl mb-4 opacity-20"></i>
                <p class="font-medium">No meals logged yet.</p>
            </div>
        `;
        return;
    }

    const list = document.createElement('div');
    list.className = 'space-y-4 pb-24';

    state.history.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden transition-all';
        
        const isConfirming = state.confirmDeleteId === entry.id;

        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${formatDate(entry.timestamp)}</span>
                <button class="delete-history-btn text-gray-300 hover:text-red-500 p-1" data-id="${entry.id}">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
            <div class="flex flex-wrap gap-2">
                ${entry.itemNames.map(name => `
                    <span class="bg-gray-50 text-gray-600 px-3 py-1 rounded-xl text-xs font-semibold border border-gray-100">${name}</span>
                `).join('')}
            </div>
            ${isConfirming ? `
                <div class="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center gap-3 animate-fadeIn z-10 px-4">
                    <span class="text-xs font-bold text-red-600">Delete?</span>
                    <button class="confirm-delete bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold shadow-md active:scale-90" data-id="${entry.id}">DELETE</button>
                    <button class="cancel-delete bg-gray-100 text-gray-500 px-4 py-2 rounded-xl text-[10px] font-bold active:scale-90">CANCEL</button>
                </div>
            ` : ''}
        `;

        // Event Listeners for History Cards
        card.querySelector('.delete-history-btn').onclick = () => {
            state.confirmDeleteId = entry.id;
            render();
        };

        if (isConfirming) {
            card.querySelector('.confirm-delete').onclick = () => {
                state.history = state.history.filter(h => h.id !== entry.id);
                state.confirmDeleteId = null;
                saveState();
                render();
            };
            card.querySelector('.cancel-delete').onclick = () => {
                state.confirmDeleteId = null;
                render();
            };
        }

        list.appendChild(card);
    });

    container.appendChild(list);
};

const renderLibraryView = (container) => {
    const formHtml = `
        <div class="space-y-6 pb-24">
            <form id="add-food-form" class="flex gap-2">
                <input
                    id="new-food-input"
                    type="text"
                    placeholder="New food (e.g. Avocado)"
                    class="flex-1 p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-400 transition-shadow shadow-sm"
                    required
                />
                <button type="submit" class="bg-emerald-500 text-white px-6 rounded-2xl font-bold active:scale-95 transition-transform shadow-md">
                    Add
                </button>
            </form>
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="library-list">
                <!-- List items here -->
            </div>
        </div>
    `;
    container.innerHTML = formHtml;

    const list = container.querySelector('#library-list');
    if (state.library.length === 0) {
        list.innerHTML = '<p class="p-8 text-center text-gray-300 italic text-sm">No items in your library.</p>';
    } else {
        const div = document.createElement('div');
        div.className = 'divide-y divide-gray-50';
        state.library.forEach(item => {
            const row = document.createElement('div');
            row.className = 'p-4 flex justify-between items-center group active:bg-gray-50';
            row.innerHTML = `
                <span class="font-semibold text-gray-700">${item.name}</span>
                <button class="delete-lib-btn text-gray-200 hover:text-red-500 p-2 transition-colors" data-id="${item.id}">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            `;
            row.querySelector('.delete-lib-btn').onclick = () => {
                state.library = state.library.filter(i => i.id !== item.id);
                saveState();
                render();
            };
            div.appendChild(row);
        });
        list.appendChild(div);
    }

    // Form Handling
    container.querySelector('#add-food-form').onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('new-food-input');
        const name = input.value.trim();
        if (name) {
            state.library.push({ id: generateId(), name, timestamp: Date.now() });
            state.library.sort((a, b) => a.name.localeCompare(b.name));
            saveState();
            render();
        }
    };
};

/**
 * --- Event Handlers ---
 */
const handleSaveMeal = () => {
    const names = state.library
        .filter(i => state.selected.has(i.id))
        .map(i => i.name);
    
    if (names.length > 0) {
        state.history.unshift({
            id: generateId(),
            timestamp: Date.now(),
            itemNames: names
        });
        state.selected.clear();
        state.view = 'HISTORY';
        saveState();
        render();
    }
};

/**
 * --- Initialization ---
 */
const init = () => {
    loadState();

    // Setup Global Navigation Listeners
    document.querySelectorAll('.nav-btn, .nav-btn-mobile').forEach(btn => {
        btn.onclick = () => {
            state.view = btn.dataset.view;
            state.confirmDeleteId = null;
            render();
        };
    });

    render();
};

window.onload = init;
