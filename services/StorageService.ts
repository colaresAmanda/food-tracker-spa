
import { FoodItem, MealEntry } from '../types';

/**
 * Robust ID generation that works in all browser environments (secure and non-secure).
 */
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-https/localhost environments
  return 'ff-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
};

export class FoodTrackerManager {
  private static FOOD_LIBRARY_KEY = 'food_flow_library';
  private static MEAL_HISTORY_KEY = 'food_flow_history';

  public static getLibrary(): FoodItem[] {
    try {
      const data = localStorage.getItem(this.FOOD_LIBRARY_KEY);
      let library: FoodItem[] = data ? JSON.parse(data) : [];
      
      // Ensure IDs exist for library items
      let migrated = false;
      library = library.map(item => {
        if (!item.id) {
          migrated = true;
          return { ...item, id: generateId() };
        }
        return item;
      });

      if (migrated) this.saveLibrary(library);
      return library.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error("Error reading library", e);
      return [];
    }
  }

  public static saveLibrary(items: FoodItem[]): void {
    localStorage.setItem(this.FOOD_LIBRARY_KEY, JSON.stringify(items));
  }

  public static getHistory(): MealEntry[] {
    try {
      const data = localStorage.getItem(this.MEAL_HISTORY_KEY);
      let history: MealEntry[] = data ? JSON.parse(data) : [];
      
      // CRITICAL: Auto-migration for legacy entries without IDs
      let needsMigration = false;
      history = history.map(entry => {
        if (!entry.id) {
          needsMigration = true;
          return { ...entry, id: generateId() };
        }
        return entry;
      });

      if (needsMigration) {
        this.saveHistory(history);
      }

      return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error("Error reading history", e);
      return [];
    }
  }

  public static saveHistory(entries: MealEntry[]): void {
    localStorage.setItem(this.MEAL_HISTORY_KEY, JSON.stringify(entries));
  }

  public static getAllData(): string {
    const data = {
      library: this.getLibrary(),
      history: this.getHistory(),
      exportedAt: Date.now()
    };
    return JSON.stringify(data, null, 2);
  }

  public static importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.library && Array.isArray(data.library)) {
        this.saveLibrary(data.library);
      }
      if (data.history && Array.isArray(data.history)) {
        this.saveHistory(data.history);
      }
      return true;
    } catch (e) {
      console.error("Failed to import data", e);
      return false;
    }
  }

  public static addFood(name: string): FoodItem[] {
    const library = this.getLibrary();
    const newItem: FoodItem = {
      id: generateId(),
      name: name.trim(),
      createdAt: Date.now()
    };
    const updated = [...library, newItem].sort((a, b) => a.name.localeCompare(b.name));
    this.saveLibrary(updated);
    return updated;
  }

  public static updateFood(id: string, newName: string): { library: FoodItem[], history: MealEntry[] } {
    const library = this.getLibrary();
    const itemIndex = library.findIndex(item => item.id === id);
    if (itemIndex === -1) return { library, history: this.getHistory() };

    const oldName = library[itemIndex].name;
    const trimmedNewName = newName.trim();

    const updatedLibrary = library.map(item => 
      item.id === id ? { ...item, name: trimmedNewName } : item
    ).sort((a, b) => a.name.localeCompare(b.name));
    this.saveLibrary(updatedLibrary);

    const history = this.getHistory();
    const updatedHistory = history.map(entry => {
      const hasMatch = entry.itemNames.some(name => name === oldName);
      if (!hasMatch) return entry;
      return {
        ...entry,
        itemNames: entry.itemNames.map(name => name === oldName ? trimmedNewName : name)
      };
    });
    this.saveHistory(updatedHistory);

    return { library: updatedLibrary, history: updatedHistory };
  }

  public static deleteFood(id: string): FoodItem[] {
    const library = this.getLibrary().filter(item => item.id !== id);
    this.saveLibrary(library);
    return library;
  }

  public static updateMeal(id: string, itemNames: string[], timestamp: number): MealEntry[] {
    const history = this.getHistory().map(entry => 
      entry.id === id ? { ...entry, itemNames, timestamp } : entry
    ).sort((a, b) => b.timestamp - a.timestamp);
    this.saveHistory(history);
    return history;
  }

  public static deleteMeal(id: string): MealEntry[] {
    const currentHistory = this.getHistory();
    const updated = currentHistory.filter(entry => entry.id !== id);
    this.saveHistory(updated);
    return updated;
  }

  public static logMeal(itemNames: string[], timestamp: number = Date.now()): MealEntry[] {
    if (itemNames.length === 0) return this.getHistory();
    const history = this.getHistory();
    const newEntry: MealEntry = {
      id: generateId(),
      timestamp: timestamp,
      items: [],
      itemNames: itemNames
    };
    const updated = [newEntry, ...history].sort((a, b) => b.timestamp - a.timestamp);
    this.saveHistory(updated);
    return updated;
  }
}
