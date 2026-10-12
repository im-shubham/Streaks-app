import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHabitStore } from './habitStore';

export { FREE_HABIT_LIMIT } from './habitStore';
export type { Habit, State } from './habitStore';

export const useStore = createHabitStore(AsyncStorage);
