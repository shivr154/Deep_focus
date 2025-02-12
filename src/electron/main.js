import { app, BrowserWindow } from "electron";
import path from "path";
import isDev from "./util.js";
import fs from 'fs';
import { ipcMain } from "electron/main";
import { exec } from 'child_process';
import psList from 'ps-list';

// Define the location of the hosts file on Windows.
const hostsFilePath = 'C:/Windows/System32/drivers/etc/hosts';

// Markers to identify our block entries.
const blockStartMarker = '# Deep Work App Start';
const blockEndMarker = '# Deep Work App End';

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(app.getAppPath(),"src", "electron", "preload.js"),
    },
  });
  if (isDev()) {
    win.loadURL("http://localhost:5123");
  } else {
    win.loadFile(path.join(app.getAppPath() + "/dist-react/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler to block websites
ipcMain.handle('block-websites', async (event, websites) => {
  try {
    blockWebsites(websites);
    return { success: true };
  } catch (err) {
    console.error('Error blocking websites:', err);
    return { success: false, error: err.message };
  }
});

// IPC handler to unblock websites
ipcMain.handle('unblock-websites', async () => {
  try {
    unblockWebsites();
    return { success: true };
  } catch (err) {
    console.error('Error unblocking websites:', err);
    return { success: false, error: err.message };
  }
});

/**
 * Appends blocking entries for the given websites to the hosts file.
 *
 * @param {string[]} websites - Array of website domains (e.g., ['facebook.com', 'twitter.com']).
 */
function blockWebsites(websites) {
  // Prepare the entries. Each website gets redirected to 127.0.0.1.
  const blockEntries = websites.map(site => `127.0.0.1 ${site}`).join('\n');
  const blockContent = `\n${blockStartMarker}\n${blockEntries}\n${blockEndMarker}\n`;

  // Append the block entries to the hosts file.
  fs.appendFileSync(hostsFilePath, blockContent);
  console.log('Blocked websites:', websites);
}

/**
 * Removes the blocking entries from the hosts file.
 */
function unblockWebsites() {
  let hostsContent = fs.readFileSync(hostsFilePath, 'utf-8');
  const regex = new RegExp(`${blockStartMarker}[\\s\\S]*?${blockEndMarker}\\n?`, 'g');
  hostsContent = hostsContent.replace(regex, '');
  fs.writeFileSync(hostsFilePath, hostsContent);
  console.log('Unblocked websites');
}

ipcMain.handle('get-blocked-websites', async () => {
  try {
    let hostsContent = fs.readFileSync(hostsFilePath, 'utf-8');
    const regex = new RegExp(`${blockStartMarker}[\\s\\S]*?${blockEndMarker}`, 'g');
    const match = hostsContent.match(regex);

    if (!match) return [];

    const blockedWebsites = match[0]
      .split('\n')
      .filter((line) => line.startsWith('127.0.0.1'))
      .map((line) => line.split(' ')[1]);

    return blockedWebsites;
  } catch (error) {
    console.error('Error fetching blocked websites:', error);
    return [];
  }
});



// ---------- Application Blocking Feature ----------

// Variable to hold the interval ID
let appBlockInterval = null;

/**
 * Starts monitoring and blocking applications with improved error handling.
 * @param {string[]} appNames - Array of application executable names (e.g., ['notepad.exe', 'calc.exe']).
 */
function startAppBlocking(appNames) {
  // Clear any existing interval
  if (appBlockInterval !== null) {
    clearInterval(appBlockInterval);
  }

  // Set up an interval to check every 5 seconds
   appBlockInterval = setInterval(async () => {
    try {
      const processes = await psList();
      
      // Filter only running apps (excluding background/system processes)
      const runningApps = processes
        .filter(proc => proc.name && proc.pid > 0)
        .map(proc => proc.name.toLowerCase());

      appNames.forEach(appName => {
        if (runningApps.includes(appName.toLowerCase())) {
          exec(`taskkill /F /IM ${appName}`, (killError, stdout, stderr) => {
            if (killError) {
              console.error(`Error terminating ${appName}: ${stderr.trim() || killError.message}`);
            } else {
              console.log(`Blocked process: ${appName}`);
            }
          });
        } else {
          console.log(`No running process found for ${appName}`);
        }
      });
    } catch (error) {
      console.error('Error fetching process list:', error);
    }
  }, 5000);
}



/**
 * Stops the application blocking service.
 */
function stopAppBlocking() {
  if (appBlockInterval !== null) {
    clearInterval(appBlockInterval);
    appBlockInterval = null;
    console.log('Application blocking stopped.');
  }
}
  

// IPC handler to start application blocking
ipcMain.handle('start-app-blocking', async (event, appNames) => {
  try {
    startAppBlocking(appNames);
    return { success: true };
  } catch (error) {
    console.error('Error starting app blocking:', error);
    return { success: false, error: error.message };
  }
});

// IPC handler to stop application blocking
ipcMain.handle('stop-app-blocking', async () => {
  try {
    stopAppBlocking();
    return { success: true };
  } catch (error) {
    console.error('Error stopping app blocking:', error);
    return { success: false, error: error.message };
  }
});


ipcMain.handle('get-running-processes', async () => {
  try {
    // Fetch the list of all processes
    const processes = await psList();

    // Define system/background processes to exclude
    const systemProcesses = [
      'explorer.exe', 'taskhost.exe', 'winlogon.exe', 'csrss.exe',
      'dwm.exe', 'lsass.exe', 'services.exe', 'svchost.exe',
      'smss.exe', 'wininit.exe', 'system', 'registry'
    ];

    // Filter out background/system processes
    const filteredProcesses = processes
      .filter(proc => proc.name && proc.pid > 0) // Ensure valid process names
      .filter(proc =>
        !systemProcesses.includes(proc.name.toLowerCase()) &&
        !proc.name.toLowerCase().includes('service') &&
        !proc.name.toLowerCase().includes('host')
      )
      .map(proc => proc.name); // Extract only process names

    return filteredProcesses;
  } catch (error) {
    console.error('Error fetching processes:', error);
    return [];
  }
});
