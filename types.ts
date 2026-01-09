
export interface FoodItem {
  id: string;
  name: string;
  createdAt: number;
}

export interface MealEntry {
  id: string;
  timestamp: number;
  items: string[]; // List of FoodItem IDs or names? Let's use names for better persistence stability if library items are deleted
  itemNames: string[];
}

export enum View {
  LOG = 'LOG',
  LIBRARY = 'LIBRARY',
  HISTORY = 'HISTORY'
}
