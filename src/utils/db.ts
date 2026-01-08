// Helper to interface with Electron's IPC for DB operations

declare global {
  interface Window {
    electronAPI: {
      queryDb: (sql: string, params: any[]) => Promise<any>;
    };
  }
}

export const db = {
  query: async <T>(sql: string, params: any[] = []): Promise<T[]> => {
    if (window.electronAPI) {
      return await window.electronAPI.queryDb(sql, params);
    } else {
      console.error("Electron API not available");
      return [];
    }
  },
  
  // Helper for single result queries
  queryOne: async <T>(sql: string, params: any[] = []): Promise<T | null> => {
    const results = await db.query<T>(sql, params);
    return results && results.length > 0 ? results[0] : null;
  },

  // Helper for executing commands (insert/update/delete)
  execute: async (sql: string, params: any[] = []): Promise<any> => {
    return await db.query(sql, params);
  }
};
