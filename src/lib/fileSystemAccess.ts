export type DirectoryConnection = {
  handle: FileSystemDirectoryHandle
  name: string
}

type PickerWindow = Window &
  typeof globalThis & {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
  }

export function isDirectoryPickerSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function pickDirectory(): Promise<DirectoryConnection> {
  const pickerWindow = window as PickerWindow

  if (!pickerWindow.showDirectoryPicker) {
    throw new Error('File System Access API is not supported in this browser.')
  }

  const handle = await pickerWindow.showDirectoryPicker()

  return {
    handle,
    name: handle.name,
  }
}
