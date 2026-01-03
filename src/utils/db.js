// Helper to interface with Electron's IPC for DB operations

export const db = {
  query: async (sql, params = []) => {
    if (window.electronAPI) {
      return await window.electronAPI.queryDb(sql, params);
    } else {
      console.error("Electron API not available");
      return [];
    }
  },
  
  // Helper for single result queries
  queryOne: async (sql, params = []) => {
    const results = await db.query(sql, params);
    return results && results.length > 0 ? results[0] : null;
  },

  // Helper for executing commands (insert/update/delete)
  execute: async (sql, params = []) => {
    return await db.query(sql, params);
  }
};
