// Polish's global shortcuts on macOS, registered by key position.
//
// Electron's globalShortcut finds a key by the character it types, so on a
// French keyboard, where the number row types & é " … without Shift, "1"
// matches no key and ⌘⇧1 never fires. Carbon hot keys take a virtual key
// code, which is the key's place on the keyboard whatever it types.
//
// Spawned by src/main/hotkeys-mac.ts and driven over stdin/stdout, one JSON
// object per line:
//
//   in   {"type":"set","hotkeys":[{"id":"…","key":18,"modifiers":768}]}
//   out  {"type":"registered","failed":["…"]}            one per "set"
//   out  {"type":"pressed","id":"…"}
//   in   {"type":"record","on":true}
//   out  {"type":"recorded","key":18,"command":true,…}   each key pressed while on
//   out  {"type":"record-unavailable"}                   no Accessibility permission
//
// It exits when stdin closes, so it never outlives Polish.

import AppKit
import Carbon.HIToolbox

struct Hotkey: Decodable {
    let id: String
    let key: UInt32
    let modifiers: UInt32
}

struct Message: Decodable {
    let type: String
    let hotkeys: [Hotkey]?
    let on: Bool?
}

func send(_ object: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: object) else { return }
    FileHandle.standardOutput.write(data + Data("\n".utf8))
}

/* ------------------------------------------------------------ hot keys ---- */

var registered: [EventHotKeyRef] = []
var hotkeyIds: [UInt32: String] = [:]
let signature: OSType = 0x504C_5348 // "PLSH"

func set(_ hotkeys: [Hotkey]) {
    for ref in registered { UnregisterEventHotKey(ref) }
    registered = []
    hotkeyIds = [:]

    var failed: [String] = []
    for (index, hotkey) in hotkeys.enumerated() {
        let number = UInt32(index + 1)
        var ref: EventHotKeyRef?
        let status = RegisterEventHotKey(
            hotkey.key, hotkey.modifiers, EventHotKeyID(signature: signature, id: number),
            GetApplicationEventTarget(), 0, &ref
        )
        if status == noErr, let ref {
            registered.append(ref)
            hotkeyIds[number] = hotkey.id
        } else {
            failed.append(hotkey.id)
        }
    }
    send(["type": "registered", "failed": failed])
}

var pressedSpec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
InstallEventHandler(GetApplicationEventTarget(), { _, event, _ in
    var hotkeyId = EventHotKeyID()
    GetEventParameter(
        event, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID),
        nil, MemoryLayout<EventHotKeyID>.size, nil, &hotkeyId
    )
    if let id = hotkeyIds[hotkeyId.id] { send(["type": "pressed", "id": id]) }
    return noErr
}, 1, &pressedSpec, nil, nil)

/* ----------------------------------------------------------- recording ---- */

// The shortcut field reads keys from here rather than from the page: Chromium
// never hands the page some chords (⌘⇧& on a French keyboard), and the page
// only knows what a key types, not where it is. Every event is passed on, so
// Polish's own window receives the key as usual. An active tap rather than a
// listen-only one: it needs Accessibility, which Polish has to have anyway,
// where listening needs Input Monitoring as well.
var tap: CFMachPort?

func record(_ on: Bool) {
    if on {
        guard tap == nil else { return }
        let mask = CGEventMask(1 << CGEventType.keyDown.rawValue)
        guard let port = CGEvent.tapCreate(
            tap: .cgSessionEventTap, place: .headInsertEventTap, options: .defaultTap,
            eventsOfInterest: mask,
            callback: { _, type, event, _ in
                if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                    if let tap { CGEvent.tapEnable(tap: tap, enable: true) }
                } else if type == .keyDown, event.getIntegerValueField(.keyboardEventAutorepeat) == 0 {
                    let flags = event.flags
                    send([
                        "type": "recorded",
                        "key": event.getIntegerValueField(.keyboardEventKeycode),
                        "command": flags.contains(.maskCommand),
                        "control": flags.contains(.maskControl),
                        "option": flags.contains(.maskAlternate),
                        "shift": flags.contains(.maskShift),
                    ])
                }
                return Unmanaged.passUnretained(event)
            },
            userInfo: nil
        ) else {
            send(["type": "record-unavailable"])
            return
        }
        CFRunLoopAddSource(CFRunLoopGetMain(), CFMachPortCreateRunLoopSource(nil, port, 0), .commonModes)
        CGEvent.tapEnable(tap: port, enable: true)
        tap = port
    } else if let port = tap {
        CGEvent.tapEnable(tap: port, enable: false)
        CFMachPortInvalidate(port)
        tap = nil
    }
}

/* ---------------------------------------------------------------- main ---- */

func handle(_ message: Message) {
    switch message.type {
    case "set": set(message.hotkeys ?? [])
    case "record": record(message.on ?? false)
    default: break
    }
}

DispatchQueue.global().async {
    while let line = readLine() {
        guard let message = try? JSONDecoder().decode(Message.self, from: Data(line.utf8)) else { continue }
        DispatchQueue.main.async { handle(message) }
    }
    DispatchQueue.main.async { exit(0) }
}

// No Dock icon, no menu bar: an event loop for the hot keys and nothing else.
NSApplication.shared.setActivationPolicy(.prohibited)
NSApplication.shared.run()
