import { Hotkey } from './Enum'

interface Archive {
    id: string
    screenshot: string
}

interface HotkeyDetail {
    type: Hotkey
    accelerator: string
}


export {
    type Archive,
    type HotkeyDetail,
}