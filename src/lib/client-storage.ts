import { createJSONStorage, type StateStorage } from "zustand/middleware";

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function getPersistStorage(): StateStorage {
  if (typeof window === "undefined") {
    return noopStorage;
  }
  return window.localStorage;
}

export const clientJsonStorage = createJSONStorage(getPersistStorage);
