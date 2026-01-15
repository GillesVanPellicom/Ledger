const fs = require('fs');
const path = require('path');

class Store {
  constructor(options) {
    this.userDataPath = options.userDataPath;
    this.defaults = options.defaults || {};
    this.data = { ...this.defaults };
    this.bootstrapPath = path.join(this.userDataPath, 'bootstrap.json');
    this.load();
  }

  get settingsPath() {
    let datastorePath = null;
    try {
      if (fs.existsSync(this.bootstrapPath)) {
        const bootstrap = JSON.parse(fs.readFileSync(this.bootstrapPath, 'utf-8'));
        datastorePath = bootstrap.datastorePath;
      }
    } catch (e) {
      console.error('Failed to read bootstrap config', e);
    }

    if (datastorePath && fs.existsSync(datastorePath)) {
      const settingsDir = path.join(datastorePath, 'settings');
      if (!fs.existsSync(settingsDir)) {
        try {
          fs.mkdirSync(settingsDir, { recursive: true });
        } catch (e) {
          console.error('Failed to create settings directory', e);
          return path.join(this.userDataPath, 'settings.json');
        }
      }
      return path.join(settingsDir, 'settings.json');
    }

    return path.join(this.userDataPath, 'settings.json');
  }

  load() {
    try {
      const currentPath = this.settingsPath;
      if (fs.existsSync(currentPath)) {
        const fileData = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
        this.data = this.deepMerge(this.defaults, fileData);
      } else {
        this.data = { ...this.defaults };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.data = { ...this.defaults };
    }
  }

  save() {
    try {
      const newDatastorePath = this.get('datastore.folderPath');
      let targetFile;
      
      if (newDatastorePath && fs.existsSync(newDatastorePath)) {
         const settingsDir = path.join(newDatastorePath, 'settings');
         if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
         targetFile = path.join(settingsDir, 'settings.json');
      } else {
         targetFile = path.join(this.userDataPath, 'settings.json');
      }

      fs.writeFileSync(targetFile, JSON.stringify(this.data, null, 2));
      
      if (newDatastorePath) {
         fs.writeFileSync(this.bootstrapPath, JSON.stringify({ datastorePath: newDatastorePath }));
      } else {
         if (fs.existsSync(this.bootstrapPath)) fs.unlinkSync(this.bootstrapPath);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  get(key, defaultValue) {
    const keys = key.split('.');
    let value = this.data;
    for (const k of keys) {
      if (value === undefined || value === null) return defaultValue;
      value = value[k];
    }
    return value === undefined ? defaultValue : value;
  }

  set(keyOrObject, value) {
    if (typeof keyOrObject === 'object') {
      this.data = this.deepMerge(this.data, keyOrObject);
    } else {
      const keys = keyOrObject.split('.');
      let current = this.data;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    }
    this.save();
  }
  
  get store() {
    return this.data;
  }

  clear() {
    this.data = { ...this.defaults };
    this.save();
  }

  deepMerge(target, source) {
    let output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
}

module.exports = Store;
