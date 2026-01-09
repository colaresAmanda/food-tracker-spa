
import React, { useState, useEffect } from 'react';
import { View, FoodItem, MealEntry } from './types';
import { FoodTrackerManager } from './services/StorageService';
import LogView from './components/LogView';
import LibraryView from './components/LibraryView';
import HistoryView from './components/HistoryView';
import Navigation from './components/Navigation';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOG);
  const [library, setLibrary] = useState<FoodItem[]>([]);
  const [history, setHistory] = useState<MealEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [logTimestamp, setLogTimestamp] = useState<number>(Date.now());

  const loadData = () => {
    // These methods now handle auto-migration for missing IDs internally
    const libData = FoodTrackerManager.getLibrary();
    const histData = FoodTrackerManager.getHistory();
    setLibrary(libData);
    setHistory(histData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddFood = (name: string) => {
    const updated = FoodTrackerManager.addFood(name);
    setLibrary(updated);
  };

  const handleUpdateFood = (id: string, newName: string) => {
    const { library: updatedLib, history: updatedHist } = FoodTrackerManager.updateFood(id, newName);
    setLibrary(updatedLib);
    setHistory(updatedHist);
  };

  const handleDeleteFood = (id: string) => {
    if (window.confirm('Delete this item from library?')) {
      const updated = FoodTrackerManager.deleteFood(id);
      setLibrary(updated);
    }
  };

  const handleUpdateMeal = (id: string, itemNames: string[], timestamp: number) => {
    const updated = FoodTrackerManager.updateMeal(id, itemNames, timestamp);
    setHistory(updated);
  };

  const handleDeleteMeal = (id: string) => {
    if (!id) return;
    const updated = FoodTrackerManager.deleteMeal(id);
    setHistory([...updated]); // Create new array to force React update
  };

  const handleToggleFood = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSaveMeal = () => {
    const namesToLog = library
      .filter(item => selectedIds.has(item.id))
      .map(item => item.name);
    
    if (namesToLog.length > 0) {
      const updated = FoodTrackerManager.logMeal(namesToLog, logTimestamp);
      setHistory(updated);
      setSelectedIds(new Set());
      setLogTimestamp(Date.now());
      setCurrentView(View.HISTORY);
    }
  };

  const handleImportSuccess = () => {
    loadData();
  };

  return (
    <div className="flex flex-col h-full w-full bg-white relative overflow-hidden transition-all duration-300">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0 z-10">
        <h1 className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
          <i className="fa-solid fa-leaf"></i>
          FoodFlow
        </h1>
        <div className="text-sm font-medium text-gray-400 uppercase tracking-widest md:hidden">
          {currentView}
        </div>
        <div className="hidden md:block text-sm font-medium text-gray-400">
          Personal Nutrition Dashboard
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="md:hidden h-full overflow-y-auto p-4 pb-32 max-w-lg mx-auto">
          {currentView === View.LOG && (
            <LogView 
              library={library} 
              selectedIds={selectedIds} 
              onToggle={handleToggleFood} 
              onSave={handleSaveMeal} 
              timestamp={logTimestamp}
              onTimestampChange={setLogTimestamp}
            />
          )}
          {currentView === View.LIBRARY && (
            <LibraryView 
              library={library} 
              onAdd={handleAddFood} 
              onUpdate={handleUpdateFood}
              onDelete={handleDeleteFood} 
              onImportSuccess={handleImportSuccess}
            />
          )}
          {currentView === View.HISTORY && (
            <HistoryView 
              history={history} 
              onUpdateMeal={handleUpdateMeal}
              onDeleteMeal={handleDeleteMeal}
            />
          )}
        </div>

        <div className="hidden md:grid md:grid-cols-3 h-full divide-x divide-gray-100">
          <section className="flex flex-col h-full overflow-hidden">
             <div className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
                <LogView 
                  library={library} 
                  selectedIds={selectedIds} 
                  onToggle={handleToggleFood} 
                  onSave={handleSaveMeal} 
                  timestamp={logTimestamp}
                  onTimestampChange={setLogTimestamp}
                  isDesktop={true}
                />
             </div>
          </section>

          <section className="flex flex-col h-full overflow-hidden bg-gray-50/30">
             <div className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
                <HistoryView 
                  history={history} 
                  onUpdateMeal={handleUpdateMeal}
                  onDeleteMeal={handleDeleteMeal}
                />
             </div>
          </section>

          <section className="flex flex-col h-full overflow-hidden">
             <div className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
                <LibraryView 
                  library={library} 
                  onAdd={handleAddFood} 
                  onUpdate={handleUpdateFood}
                  onDelete={handleDeleteFood} 
                  onImportSuccess={handleImportSuccess}
                />
             </div>
          </section>
        </div>
      </main>

      <div className="md:hidden">
        <Navigation currentView={currentView} setView={setCurrentView} />
      </div>
    </div>
  );
};

export default App;
