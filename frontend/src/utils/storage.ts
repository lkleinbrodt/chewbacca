import { Project, Report, SourceFile } from "@/autodraft/types";

const STORAGE_CONFIG = {
  SELECTED_PROJECT: {
    key: "autodraft.selectedProject",
    defaultValue: null as Project | null,
  },
  SELECTED_REPORT: {
    key: "autodraft.selectedReport",
    defaultValue: null as Report | null,
  },
  SELECTED_TAB: {
    key: "autodraft.selectedTab",
    defaultValue: "report" as string,
  },
  AVAILABLE_FILES: {
    key: "autodraft.availableFiles",
    defaultValue: [] as SourceFile[],
  },
  AVAILABLE_REPORTS: {
    key: "autodraft.availableReports",
    defaultValue: [] as Report[],
  },
  AVAILABLE_PROJECTS: {
    key: "autodraft.availableProjects",
    defaultValue: [] as Project[],
  },
} as const;

type StoredKey = keyof typeof STORAGE_CONFIG;
type StorageValueType<K extends StoredKey> =
  (typeof STORAGE_CONFIG)[K]["defaultValue"];

// Create a type-safe object for accessing storage keys
// /so now you can access using storage.get("SELECTED_PROJECT")
// or better yet, storage.get(storage.keys.SELECTED_PROJECT)
export const storage = {
  keys: Object.fromEntries(
    Object.keys(STORAGE_CONFIG).map((key) => [key, key])
  ) as { [K in StoredKey]: K },
  get: <K extends StoredKey>(key: K): StorageValueType<K> => {
    try {
      const value = localStorage.getItem(STORAGE_CONFIG[key].key);
      return value !== null
        ? JSON.parse(value)
        : STORAGE_CONFIG[key].defaultValue;
    } catch (error) {
      console.error(`Error parsing value for key ${key}:`, error);
      return STORAGE_CONFIG[key].defaultValue;
    }
  },
  set: <K extends StoredKey>(key: K, value: StorageValueType<K>): void => {
    if (value === null) {
      localStorage.removeItem(STORAGE_CONFIG[key].key);
    } else {
      localStorage.setItem(STORAGE_CONFIG[key].key, JSON.stringify(value));
    }
  },
} as const;
