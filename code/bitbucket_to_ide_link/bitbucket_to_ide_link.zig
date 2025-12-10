const std = @import("std");
const windows = std.os.windows;

// Windows API declarations
const GMEM_MOVEABLE = 0x0002;
const CF_UNICODETEXT = 13;

const cc = std.builtin.CallingConvention.winapi;

extern "user32" fn OpenClipboard(hWndNewOwner: ?windows.HWND) callconv(cc) windows.BOOL;
extern "user32" fn CloseClipboard() callconv(cc) windows.BOOL;
extern "user32" fn GetClipboardData(uFormat: windows.UINT) callconv(cc) ?windows.HANDLE;
extern "user32" fn SetClipboardData(uFormat: windows.UINT, hMem: windows.HANDLE) callconv(cc) ?windows.HANDLE;
extern "user32" fn EmptyClipboard() callconv(cc) windows.BOOL;
extern "kernel32" fn GlobalAlloc(uFlags: windows.UINT, dwBytes: windows.SIZE_T) callconv(cc) ?windows.HANDLE;
extern "kernel32" fn GlobalLock(hMem: windows.HANDLE) callconv(cc) ?*anyopaque;
extern "kernel32" fn GlobalUnlock(hMem: windows.HANDLE) callconv(cc) windows.BOOL;
extern "kernel32" fn GlobalSize(hMem: windows.HANDLE) callconv(cc) windows.SIZE_T;

/// Reads text from Windows clipboard.
///
/// Memory: Allocates new UTF-8 string. Caller must free with allocator.free().
///
/// Example:
/// ```
/// const text = try getClipboardTextAlloc(allocator);
/// defer allocator.free(text);
/// ```
fn getClipboardTextAlloc(allocator: std.mem.Allocator) ![]const u8 {
    if (OpenClipboard(null) == 0) {
        return error.CannotOpenClipboard;
    }
    defer _ = CloseClipboard();

    const handle = GetClipboardData(CF_UNICODETEXT) orelse {
        return error.NoClipboardData;
    };

    const ptr = GlobalLock(handle) orelse {
        return error.CannotLockMemory;
    };
    defer _ = GlobalUnlock(handle);

    const size = GlobalSize(handle);
    const wide_chars = @as([*]const u16, @ptrCast(@alignCast(ptr)));

    // Find null terminator
    var len: usize = 0;
    while (len < size / 2 and wide_chars[len] != 0) : (len += 1) {}

    // Convert UTF-16 to UTF-8
    return std.unicode.utf16LeToUtf8Alloc(allocator, wide_chars[0..len]);
}

/// Pauses execution in debug builds only, waiting for user input.
/// In release builds, this function does nothing (optimized away).
fn pauseInDebug() void {
    if (@import("builtin").mode == .Debug) {
        std.debug.print("\nPress Enter to continue...", .{});
        // Use Windows-specific API to read from console
        var buf: [1]u8 = undefined;
        var bytes_read: u32 = undefined;
        const stdin_handle = windows.GetStdHandle(windows.STD_INPUT_HANDLE) catch return;
        _ = windows.kernel32.ReadFile(stdin_handle, &buf, 1, &bytes_read, null);
    }
}

fn setClipboardText(text: []const u8) !void {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const allocator = arena.allocator();

    // Convert UTF-8 to UTF-16 (runtime conversion)
    const utf16_slice = try std.unicode.utf8ToUtf16LeAlloc(allocator, text);
    const byte_size = (utf16_slice.len + 1) * 2; // +1 for null terminator, *2 for u16

    if (OpenClipboard(null) == 0) {
        return error.CannotOpenClipboard;
    }
    defer _ = CloseClipboard();

    _ = EmptyClipboard();

    const handle = GlobalAlloc(GMEM_MOVEABLE, byte_size) orelse {
        return error.CannotAllocateMemory;
    };

    const ptr = GlobalLock(handle) orelse {
        return error.CannotLockMemory;
    };
    defer _ = GlobalUnlock(handle);

    const dest = @as([*]u16, @ptrCast(@alignCast(ptr)));
    @memcpy(dest[0..utf16_slice.len], utf16_slice);
    dest[utf16_slice.len] = 0; // Null terminator

    if (SetClipboardData(CF_UNICODETEXT, handle) == null) {
        return error.CannotSetClipboard;
    }
}

/// Parses Bitbucket link format and converts to IDE format.
///
/// Input format: ...#L<filepath>T<lineNumber>... (e.g., #Lsrc/main.jsF123T45)
/// Output format: <filepath>:<lineNumber> (e.g., src/main.js:45)
///
/// Memory: Allocates new string. Caller must free with allocator.free().
///
/// Example:
/// ```
/// const output = try parseAndReformatAlloc(allocator, input);
/// defer allocator.free(output);
/// ```
fn parseAndReformatAlloc(allocator: std.mem.Allocator, input: []const u8) ![]const u8 {
    // Pattern: ...#L<filepath>T<lineNumber>...
    // Example: https://bitbucket.org/project/repo/src/main#Lsrc/file.jsF123T45
    // Also handles: .../pull-requests/123/diff#Lsrc/file.jsF123T45

    // Step 1: Find "#L" marker
    const l_marker = "#L";
    const l_pos = std.mem.indexOf(u8, input, l_marker) orelse return error.InvalidFormat;
    const after_l = input[l_pos + l_marker.len..];

    // Step 2: Find "T" that separates filepath from line number
    // The filepath might contain "T" in the path, so we need to find the T followed by digits
    var t_pos: ?usize = null;
    var search_start: usize = 0;
    while (std.mem.indexOfPos(u8, after_l, search_start, "T")) |pos| {
        // Check if character after T is a digit
        if (pos + 1 < after_l.len and std.ascii.isDigit(after_l[pos + 1])) {
            t_pos = pos;
            break;
        }
        search_start = pos + 1;
    }

    const t_index = t_pos orelse return error.InvalidFormat;
    var file_path = after_l[0..t_index];

    // Step 3: Extract line number (digits after T)
    const after_t = after_l[t_index + 1..];
    const line_end = for (after_t, 0..) |char, i| {
        if (!std.ascii.isDigit(char)) break i;
    } else after_t.len;

    if (line_end == 0) return error.InvalidFormat;
    const line_number = after_t[0..line_end];

    // Step 4: Remove "F<digits>" suffix from filepath (e.g., "F123")
    if (std.mem.lastIndexOf(u8, file_path, "F")) |f_pos| {
        // Check if everything after F is digits
        const after_f = file_path[f_pos + 1..];
        const all_digits = for (after_f) |char| {
            if (!std.ascii.isDigit(char)) break false;
        } else true;

        if (all_digits and after_f.len > 0) {
            file_path = file_path[0..f_pos];
        }
    }

    // Step 5: Format as "filepath:lineNumber"
    return std.fmt.allocPrint(allocator, "{s}:{s}", .{file_path, line_number});
}

pub fn main() !void {
    // ArenaAllocator: Perfect for short-lived CLI tools
    // All memory freed at once when arena.deinit() runs
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit(); // Frees ALL allocations automatically
    const allocator = arena.allocator();

    // Get clipboard content (no defer needed!)
    const input = getClipboardTextAlloc(allocator) catch |err| {
        std.debug.print("Error reading clipboard: {}\n", .{err});
        pauseInDebug();
        return err;
    };

    std.debug.print("Input: {s}\n", .{input});

    // Parse and reformat (no defer needed!)
    const output = parseAndReformatAlloc(allocator, std.mem.trim(u8, input, &std.ascii.whitespace)) catch |err| {
        std.debug.print("Error parsing: {} - Invalid input format\n", .{err});
        const error_msg = "Invalid input format";
        try setClipboardText(error_msg);
        pauseInDebug();
        return err;
    };

    std.debug.print("Output: {s}\n", .{output});

    // Set clipboard content
    try setClipboardText(output);
    std.debug.print("Output copied to clipboard.\n", .{});

    pauseInDebug();
}
