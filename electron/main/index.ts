import { app, BrowserWindow, shell, ipcMain, Menu, dialog, globalShortcut, Notification, Tray } from 'electron'
import Store from 'electron-store'
// import edge from 'electron-edge-js'
import { release } from 'node:os'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdir, readFile, existsSync, copyFileSync, statSync, mkdir, rm } from 'node:fs'
import { MTR, RTM, Hotkey } from '../../dts/Enum'

globalThis.__filename = fileURLToPath(import.meta.url)
globalThis.__dirname = dirname(__filename)

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

const store = new Store()
const hotkeyStore = {
  [Hotkey.Save]: {
    key: store.get(Hotkey.Save) as string || 'F6',
    handle: () => {
      saveArchive()
    },
  },
  [Hotkey.Display]: {
    key: store.get(Hotkey.Display) as string || 'F7',
    handle: () => {
      win?.show()
    },
  }
}
console.log(hotkeyStore)

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.mjs')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

const getGameStore = (basePath) => {

  const backupPath = resolve(basePath, 'PlayerProfiles\\Public\\Savegames\\StoryBackup')

  if (!existsSync(backupPath)) {
    mkdir(backupPath, (err) => {
      if (err) {
        win?.webContents.send('mtr', {
          type: MTR.Error,
          data: 'Please select the correct game path.'
        })
        return
      }
    })
  }

  readdir(backupPath, (err, files) => {
    if (err) {
      return
    }

    const data = []
    for (let i = files.length - 1; i >= 0; i--) {
      const subPath = files[i]
      const finalPath = resolve(backupPath, subPath)
      const screenshot = resolve(finalPath, 'HonourMode.WebP')
      // const archive = resolve(finalPath, 'HonourMode.lsv')
      // readFile(archive, 'utf8', (err, data) => {
      //   if (err) throw err;
      //   console.log(data);
      // });
      data.push({
        id: subPath,
        screenshot,
      })
    }

    win?.webContents.send('mtr', {
      type: MTR.UpdateArchive,
      data
    })
  })
}

const saveArchive = () => {
  const basePath = store.get('path') as string
  const fullPath = resolve(basePath, 'PlayerProfiles\\Public\\Savegames\\Story')
  readdir(fullPath, (err, files) => {
    if (err) {
      win?.webContents.send('mtr', {
        type: MTR.Error,
        data: 'Please select the correct game path.'
      })
      return
    }

    let subPath = ''
    const included = files.some(item => {
      const res = item.endsWith('__HonourMode')
      if (res) {
        subPath = item
      }
      return res
    })

    if (included) {
      const finalPath = resolve(fullPath, subPath)
      const finalBackupPath = resolve(resolve(basePath, 'PlayerProfiles\\Public\\Savegames\\StoryBackup'), Date.now().toString())

      const copyDir = (srcDir, desDir) => {
        readdir(srcDir, (err, files) => {
          for (const file of files) {
            const srcFile = resolve(srcDir, file)
            const desFile = resolve(desDir, file)
            if (statSync(srcFile).isDirectory()) {
              copyDir(srcFile, desFile)
            } else {
              copyFileSync(srcFile, desFile)
            }
          }

          getGameStore(basePath)

          new Notification({
            body: 'Save successfully.'
          }).show()
        })
      }

      mkdir(finalBackupPath, (err) => {
        if (err) {
          win?.webContents.send('mtr', {
            type: MTR.Error,
            data: 'Please select the correct game path.'
          })
          return
        }
      })

      copyDir(finalPath, finalBackupPath)
    }
  })
}

const loadArchive = (subPath) => {
  const basePath = store.get('path') as string
  const finalBackupPath = resolve(resolve(basePath, 'PlayerProfiles\\Public\\Savegames\\StoryBackup'), subPath)

  const copyDir = (srcDir, desDir) => {
    readdir(srcDir, (err, files) => {
      for (const file of files) {
        const srcFile = resolve(srcDir, file)
        const desFile = resolve(desDir, file)
        if (statSync(srcFile).isDirectory()) {
          copyDir(srcFile, desFile)
        } else {
          copyFileSync(srcFile, desFile)
        }
      }

      win?.webContents.send('mtr', {
        type: MTR.LoadArchive,
        data: 'Load successfully.'
      })
    })
  }

  const fullPath = resolve(basePath, 'PlayerProfiles\\Public\\Savegames\\Story')
  readdir(fullPath, (err, files) => {
    if (err) {
      win?.webContents.send('mtr', {
        type: MTR.Error,
        data: 'Please select the correct game path.'
      })
      return
    }

    let subPath = ''
    const included = files.some(item => {
      const res = item.endsWith('__HonourMode')
      if (res) {
        subPath = item
      }
      return res
    })

    if (included) {
      const finalPath = resolve(fullPath, subPath)
      copyDir(finalBackupPath, finalPath)
    }
  })
}

const deleteArchive = (subPath) => {
  const basePath = store.get('path') as string
  const backupPath = resolve(basePath, 'PlayerProfiles\\Public\\Savegames\\StoryBackup')
  const finalPath = resolve(backupPath, subPath)
  rm(finalPath, { recursive: true }, (err) => {
    if (err) {
      return
    }
    win?.webContents.send('mtr', {
      type: MTR.DeleteArchive,
      data: 'Delete successfully.'
    })
    getGameStore(basePath)
  })
}

async function createWindow() {

  win = new BrowserWindow({
    icon: join(process.env.VITE_PUBLIC, 'logo.ico'),
    webPreferences: {
      webSecurity: false,
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })
  win.on('close', (event) => {
    event.preventDefault()
    win.hide()
  })

  if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
    win.loadURL(url)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    const basePath = store.get('path') as string
    const webContents = win?.webContents
    if (basePath && webContents) {

      webContents.send('mtr', {
        type: MTR.Path,
        data: basePath
      })

      globalShortcut.register(hotkeyStore[Hotkey.Save].key, hotkeyStore[Hotkey.Save].handle)
      globalShortcut.register(hotkeyStore[Hotkey.Display].key, hotkeyStore[Hotkey.Display].handle)

      const hotkeys = {}
      for (const key in hotkeyStore) {
        hotkeys[key] = hotkeyStore[key].key
      }

      win?.webContents.send('mtr', {
        type: MTR.Hotkey,
        data: hotkeys
      })

      getGameStore(basePath)
    }
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344

//   var helloWorld = edge.func(`
//     async (input) => {
//         return ".NET Welcomes " + input.ToString();
//     }
// `);
//
//   helloWorld('JavaScript', function (error, result) {
//     if (error) throw error;
//     console.log(result);
//   });

  // const edgeSend = edge.func({
  //   assemblyFile: join(__dirname, '../../libs/EdgeClassLibrary.dll'),
  //   typeName: 'EdgeClassLibrary.EdgeClassPrinter',
  //   methodName: 'Add'
  // })

  // edgeSend('JavaScript', function (error, result) {
  //   if (error) throw error;
  //   console.log(result);
  // });
}

app.whenReady().then(createWindow)

app.on('ready', () => {
  const appMenu = Menu.buildFromTemplate([
    {
      label: 'Preference',
      click: () => {
        win?.webContents.send('mtr', {
          type: MTR.Preference,
          data: {}
        })
      }
    }
  ])
  Menu.setApplicationMenu(appMenu)

  const trayMenu= Menu.buildFromTemplate([
    {
      label: 'debug',
      click:()=>{
        win?.webContents.openDevTools()
      }
    },
    {
      label: 'exit',
      click:()=>{
        win?.destroy()
      }
    }
  ])
  const tray = new Tray(join(process.env.VITE_PUBLIC, 'logo.ico'))
  tray.setContextMenu(trayMenu)
  tray.setToolTip('bg3-sl')
  tray.on('double-click', () => {
    win?.show()
  })
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

ipcMain.on('rtm', (_event, args) => {
  switch (args.type) {
    case RTM.Log:
      console.log(args.data)
      break
    case RTM.Dialog:
      dialog.showOpenDialog({
        properties: [ 'openDirectory' ]
      }).then(result=>{
        if (result.filePaths.length > 0) {
          const basePath = result.filePaths[0]
          if (basePath) {
            win.webContents.send('mtr', {
              type: MTR.Path,
              data: basePath
            })
            store.set('path', basePath)
            getGameStore(basePath)
          }
        }
      })
      break
    case RTM.Hotkey:
      store.set(args.data.type, args.data.accelerator)
      hotkeyStore[args.data.type].key = args.data.accelerator
      globalShortcut.unregister(args.data.accelerator)
      globalShortcut.register(args.data.accelerator, hotkeyStore[args.data.type].handle)
      break
    case RTM.EnableHotkey:
      if (args.data) {
        globalShortcut.register(hotkeyStore[Hotkey.Save].key, hotkeyStore[Hotkey.Save].handle)
        globalShortcut.register(hotkeyStore[Hotkey.Display].key, hotkeyStore[Hotkey.Display].handle)
      }
      else {
        globalShortcut.unregisterAll()
      }
      break
    case RTM.LoadArchive:
      loadArchive(args.data)
      break
    case RTM.DeleteArchive:
      deleteArchive(args.data)
      break
  }
})