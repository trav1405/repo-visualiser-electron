import {IpcRendererEvent, ipcRenderer, contextBridge} from 'electron';
contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (channel: string, ...data: unknown[]) => ipcRenderer.send(channel, ...data),
  on: (channel: string, func: (event: IpcRendererEvent, ...args: unknown[]) => void) => ipcRenderer.on(
    channel,
    (event: IpcRendererEvent, ...args: unknown[]) => func(event, ...args)
  )
})