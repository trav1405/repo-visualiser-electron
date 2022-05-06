/* eslint global-require: off, no-console: off, promise/always-return: off */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, IpcMainEvent } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { apiFetch, getCommits, getFilesAtCommit, getLocalCommits, getLocalFiles } from './utils/APIFetch';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on(
  'renderer:generate',
  async (event: IpcMainEvent, owner: string, repo: string, excludedPathsArray: string[]) => {
    const startTime = Date.now();
    const data = await apiFetch(owner, repo, excludedPathsArray);
    console.log(`Time taken to get files: ${(Date.now() - startTime)/1000}`)
    const commitData = await getCommits(owner, repo);
    console.log(`Time taken to get commits: ${(Date.now() - startTime)/1000}`)

    event.sender.send(
      'main:generate:response',
      JSON.stringify(data),
      JSON.stringify(commitData)
    );
  }
);

ipcMain.on(
  'renderer:generateLocal',
  async (event: IpcMainEvent, repoPath: string, excludedPathsArray: string[]) => {
    const startTime = Date.now();
    const data = await getLocalFiles(repoPath, excludedPathsArray);
    console.log(`Time taken to get files: ${(Date.now() - startTime)/1000}`)
    const {commits, totalCount} = await getLocalCommits(repoPath);
    console.log(`Time taken to get commits: ${(Date.now() - startTime)/1000}`)

    event.sender.send(
      'main:generateLocal:response',
      JSON.stringify(data),
      JSON.stringify(commits),
      totalCount
    );
  }
);

ipcMain.on(
  'renderer:getAPICommitsPage',
  async (event: IpcMainEvent, owner: string, repo: string, page: number, pageSize: number) => {
    const commits = await getCommits(owner, repo, page, pageSize);

    event.sender.send(
      'main:getAPICommitsPage:response',
      JSON.stringify(commits)
    );
  }
);

ipcMain.on(
  'renderer:getCommitsPage',
  async (event: IpcMainEvent, repoPath: string, startingIndex: number, pageSize: number) => {
    const {commits}  = await getLocalCommits(repoPath, startingIndex, pageSize);

    event.sender.send(
      'main:getCommitsPage:response',
      JSON.stringify(commits)
    );
  }
);

ipcMain.on(
  'renderer:getLocalFilesAtCommit',
  async (event: IpcMainEvent, rootPath: string, excludedPaths: string[], commit: string) => {
    //const files = await getLocalFilesAtCommit(rootPath, excludedPaths, commit);
    const files = await getFilesAtCommit(rootPath, excludedPaths, commit);

    event.sender.send(
      'main:getLocalFilesAtCommit:response',
      JSON.stringify(files)
    );
  }
);

ipcMain.on(
  'renderer:getRemoteFilesAtCommit',
  async (event: IpcMainEvent, owner: string, repo: string, excludedPaths: string[], commit: string) => {
    const files = await apiFetch(owner, repo, excludedPaths, commit);

    event.sender.send(
      'main:getRemoteFilesAtCommit:response',
      JSON.stringify(files)
    );
  }
);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
