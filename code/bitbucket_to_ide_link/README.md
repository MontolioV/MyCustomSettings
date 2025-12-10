# Bitbucket to IDE Link Converter

A lightweight Windows utility that converts Bitbucket link format to JetBrains IDE format via clipboard.

**Performance:** ~20ms execution, 189KB binary size  
**Comparison:** 50x faster than Node.js equivalent (~1000ms), 400x smaller than Node.js runtime

## What It Does

Converts Bitbucket URLs like:
```
https://bitbucket.org/myteam/myrepo/src/main#Lsrc/components/Button.jsxF123T45
```

Into IDE-friendly format:
```
src/components/Button.jsx:45
```

## Quick Start

### Prerequisites
- [Zig](https://ziglang.org/download/) 0.15.2 or newer
- Windows (uses Windows Clipboard API)

### Build & Use

```bash
# Build optimized release version (recommended)
zig build release

# The binary will be at: zig-out/bin/bitbucket_to_ide_link.exe
```

**Usage:**
1. Copy a Bitbucket link to clipboard
2. Run `bitbucket_to_ide_link.exe` (double-click or from command line)
3. Paste in your IDE - the link is now in the correct format!

### Create Desktop Shortcut

1. Navigate to `zig-out/bin/`
2. Right-click `bitbucket_to_ide_link.exe` → "Create shortcut"
3. Move shortcut to desktop or pin to taskbar
4. (Optional) Assign a keyboard shortcut in shortcut properties

Now you can convert links with a single click or keyboard shortcut!

## Build Options

| Command | Binary Size | Console | Use Case |
|---------|-------------|---------|----------|
| `zig build release` | ~189KB | Hidden | **Daily use** (recommended) |
| `zig build debug` | ~984KB | Shows & pauses | Testing/debugging |
| `zig build` | ~984KB | Shows & pauses | Same as debug |

### Debug Mode

Debug builds show a console window with input/output and wait for Enter before closing:

```bash
zig build debug
./zig-out/bin/bitbucket_to_ide_link_debug.exe
```

Output:
```
Input: https://bitbucket.org/...#Lsrc/file.jsF123T45
Output: src/file.js:45
Output copied to clipboard.

Press Enter to continue...
```

**Use debug mode to:**
- Verify the tool works correctly
- See what's being read/written to clipboard
- Troubleshoot issues

### Release Mode (Production)

Release builds are silent and fast:

```bash
zig build release
```

**Features:**
- No console window (runs silently)
- Fully optimized (~189KB)
- Instant execution (~20ms)
- Perfect for daily use

## Project Structure

```
bitbucket_to_ide_link/
├── bitbucket_to_ide_link.zig    # Main source code
├── build.zig                     # Build configuration
├── README.md                     # This file
└── zig-out/bin/                  # Build output
    ├── bitbucket_to_ide_link.exe         # Release build
    └── bitbucket_to_ide_link_debug.exe   # Debug build
```

## Link Format

**Input pattern:** `...#L<filepath>T<lineNumber>...`
- `#L` marks the start of the file path
- `F<digits>` suffix is automatically removed from file path
- `T` separates file path from line number
- Line number is extracted after `T`

**Example:**
```
Input:  #Lsrc/utils/helper.jsF456T123
Output: src/utils/helper.js:123
```

## Advanced Usage

### Clean Build

```bash
# Remove all build artifacts
rm -rf zig-out zig-cache
```

PowerShell:
```powershell
Remove-Item -Recurse -Force zig-out, zig-cache
```

### Cross-compilation

Build for different Windows architectures:

```bash
# 64-bit Windows (default)
zig build release -Dtarget=x86_64-windows

# 32-bit Windows
zig build release -Dtarget=x86-windows

# ARM64 Windows
zig build release -Dtarget=aarch64-windows
```

### Manual Optimization Levels

```bash
# Release with safety checks
zig build -Doptimize=ReleaseSafe

# Release optimized for speed (default for `zig build release`)
zig build -Doptimize=ReleaseFast

# Release optimized for size
zig build -Doptimize=ReleaseSmall
```

Note: All release optimizations hide the console window automatically.

## Troubleshooting

### "zig: command not found"
Install Zig from https://ziglang.org/download/ and add to PATH

### "Invalid input format" error
Debug mode shows this error in console. Make sure clipboard contains a valid Bitbucket link with the `#L...T...` pattern.

### Console window shows briefly in release mode
Make sure you ran `zig build release`, not just `zig build`. The release build script explicitly sets the Windows subsystem to hide the console.

### Want to see output in release mode?
Use debug mode instead: `zig build debug`

## Performance Comparison

| Implementation | Startup | Total Time | Binary Size |
|----------------|---------|------------|-------------|
| Node.js + PowerShell | ~200ms | ~1000ms | ~80MB (runtime) |
| **Zig (Release)** | ~5ms | ~20ms | **189KB** |

**Benefits:**
- 50x faster execution
- 400x smaller binary
- No runtime dependencies
- Single executable

## Technical Details

- **Language:** Zig 0.15.2
- **Platform:** Windows only (uses Win32 API)
- **Memory:** ArenaAllocator for automatic cleanup
- **APIs Used:**
    - `user32.dll` - Clipboard operations
    - `kernel32.dll` - Memory management
- **Unicode:** Full UTF-16LE ↔ UTF-8 conversion support

## Why Zig?

This tool was originally written in Node.js but rewritten in Zig for:
- **Speed:** 50x faster than Node.js
- **Size:** Single 189KB executable vs 80MB Node.js runtime
- **Simplicity:** No dependencies, no installation required
- **Performance:** Native code, direct Windows API access

## License

[Your License Here]

## Contributing

Issues and pull requests welcome!
