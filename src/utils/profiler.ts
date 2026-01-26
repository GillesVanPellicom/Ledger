import fs from 'node:fs';
import path from 'node:path';
import inspector from 'node:inspector';
import {format} from 'date-fns';

const session = new inspector.Session();
session.connect();

let profiling = false;
let profileFilePath = '';

/**
 * Starts CPU profiling.
 * Safe to call multiple times; will only start if not already running.
 * @param tag Optional string to identify the profile file.
 * @param sampleInterval Microseconds between samples (default 1000µs = 1ms)
 */
export function startProfiling(tag?: string, sampleInterval = 1000) {
  if (profiling) {
    console.warn('Profiler is already running.');
    return;
  }

  profiling = true;

  const now = new Date();
  const safeTag = tag ? `-${tag}` : '';
  const fileName = `${format(now, 'yyyy-MM-dd-HH-mm-ss')}${safeTag}.cpuprofile`;
  const profilesDir = path.join(process.cwd(), 'profiles');

  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, {recursive: true});
  }

  profileFilePath = path.join(profilesDir, fileName);

  session.post('Profiler.enable', (err) => {
    if (err) {
      console.error('Failed to enable profiler:', err);
      profiling = false;
      return;
    }

    session.post('Profiler.start', {sampleInterval}, (err2) => {
      if (err2) {
        console.error('Failed to start profiler:', err2);
        profiling = false;
        return;
      }
      console.log(`CPU profiling started [sampleInterval=${sampleInterval}µs]...`);
    });
  });
}

/**
 * Stops CPU profiling and saves the profile to a .cpuprofile file.
 * Returns a Promise that resolves with the absolute path to the saved file.
 */
export function stopProfiling(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!profiling) return reject(new Error('Profiler is not running'));
    profiling = false;

    session.post('Profiler.stop', (err, {profile}) => {
      if (err) return reject(err);

      fs.writeFile(profileFilePath, JSON.stringify(profile), (writeErr) => {
        if (writeErr) return reject(writeErr);
        console.log(`CPU profile saved to ${profileFilePath}`);
        resolve(profileFilePath);
      });
    });
  });
}

/**
 * Resets the profiler session.
 * Useful if you want to clear state without stopping Node.
 */
export function resetProfiler() {
  profiling = false;
  profileFilePath = '';
  session.post('Profiler.disable', (err) => {
    if (err) console.error('Failed to disable profiler:', err);
  });
}

/**
 * Returns the last profile path (if any)
 */
export function getLastProfilePath() {
  return profileFilePath;
}