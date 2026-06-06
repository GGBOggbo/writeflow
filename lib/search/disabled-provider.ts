import type { SearchProvider } from "./provider";

export const disabledSearchProvider: SearchProvider = {
  async search() {
    return [];
  },
};
