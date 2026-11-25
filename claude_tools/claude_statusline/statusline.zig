// ~/.claude/statusline.zig — port of statusline.mjs (Zig 0.15.2)
// Build: zig build-exe statusline.zig -O ReleaseFast
const std = @import("std");
const Value = std.json.Value;

const FIVE_HOUR_MS: f64 = 5 * 3600e3;
const SEVEN_DAY_MS: f64 = 7 * 86400e3;

const G = "\x1b[32m";
const Y = "\x1b[33m";
const R = "\x1b[31m";
const DIM = "\x1b[2m";
const X = "\x1b[0m";

pub fn main() void {
    var arena_state = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena_state.deinit();

    // never exit non-zero: a failing script blanks the status line
    const line = build(arena_state.allocator()) catch "claude";

    var buf: [1024]u8 = undefined;
    var stdout = std.fs.File.stdout().writer(&buf);
    const out = &stdout.interface;
    out.print("{s}\n", .{line}) catch {};
    out.flush() catch {};
}

fn build(arena: std.mem.Allocator) ![]const u8 {
    var in_buf: [4096]u8 = undefined;
    var stdin = std.fs.File.stdin().reader(&in_buf);
    const input = try stdin.interface.allocRemaining(arena, .unlimited);
    const root = try std.json.parseFromSliceLeaky(Value, arena, input, .{});

    const now: f64 = @floatFromInt(std.time.milliTimestamp());
    const rate_limits = field(root, "rate_limits");

    var parts: [4][]const u8 = undefined;
    var n: usize = 0;

    if (field(field(root, "model"), "display_name")) |m| {
        if (m == .string and m.string.len > 0) {
            parts[n] = m.string;
            n += 1;
        }
    }
    if (num(field(field(root, "context_window"), "used_percentage"))) |ctx| {
        parts[n] = try std.fmt.allocPrint(arena, "ctx {d}%", .{jsRound(ctx)});
        n += 1;
    }
    if (try segment(arena, "5h", field(rate_limits, "five_hour"), FIVE_HOUR_MS, now)) |s| {
        parts[n] = s;
        n += 1;
    }
    if (try segment(arena, "7d", field(rate_limits, "seven_day"), SEVEN_DAY_MS, now)) |s| {
        parts[n] = s;
        n += 1;
    }

    if (n == 0) return "claude";
    return std.mem.join(arena, " │ ", parts[0..n]);
}

fn segment(arena: std.mem.Allocator, label: []const u8, w: ?Value, total: f64, now: f64) !?[]const u8 {
    const used = num(field(w, "used_percentage")) orelse return null;
    const resets_at = num(field(w, "resets_at")) orelse return null; // epoch seconds

    const left_ms = resets_at * 1000 - now;
    const elapsed_ms = @min(total, @max(0.0, total - left_ms));
    const elapsed = elapsed_ms / total * 100;

    const head = try std.fmt.allocPrint(arena, "{s} {d}%token/{d}%time", .{ label, jsRound(used), jsRound(elapsed) });
    const reset = try std.fmt.allocPrint(arena, DIM ++ "reset {f}" ++ X, .{Duration{ .ms = left_ms }});

    if (used >= 100) return try std.fmt.allocPrint(arena, R ++ "{s} LIMIT" ++ X ++ " {s}", .{ head, reset });
    // Too early in the window (or nothing used): pace is noise
    if (elapsed < 5 or used <= 0) return try std.fmt.allocPrint(arena, "{s} {s}", .{ head, reset });

    const ratio = used / elapsed;
    const col = if (ratio <= 1) G else if (ratio <= 1.25) Y else R;

    // Linear extrapolation: remaining quota / current burn rate
    const to_limit_ms = (100 - used) / used * elapsed_ms;
    const tail = if (to_limit_ms < left_ms)
        try std.fmt.allocPrint(arena, R ++ "limit≈{f}" ++ X, .{Duration{ .ms = to_limit_ms }})
    else
        reset;

    return try std.fmt.allocPrint(arena, "{s}{s}" ++ X ++ " {s}", .{ col, head, tail });
}

const Duration = struct {
    ms: f64,

    pub fn format(self: Duration, w: *std.Io.Writer) std.Io.Writer.Error!void {
        const m = @max(0, jsRound(self.ms / 60000));
        if (m >= 1440) {
            try w.print("{d}d{d}h", .{ @divFloor(m, 1440), @divFloor(@mod(m, 1440), 60) });
        } else {
            try w.print("{d}h{d}m", .{ @divFloor(m, 60), @mod(m, 60) });
        }
    }
};

/// JS Math.round semantics: halves round toward +Infinity.
fn jsRound(x: f64) i64 {
    return std.math.lossyCast(i64, @floor(x + 0.5));
}

fn field(v: ?Value, key: []const u8) ?Value {
    const val = v orelse return null;
    return switch (val) {
        .object => |o| o.get(key),
        else => null,
    };
}

fn num(v: ?Value) ?f64 {
    return switch (v orelse return null) {
        .integer => |i| @floatFromInt(i),
        .float => |f| f,
        .number_string => |s| std.fmt.parseFloat(f64, s) catch null,
        else => null,
    };
}

// Unit tests: zig test statusline.zig
const testing = std.testing;
const NOW_MS: f64 = 1_800_000_000_000;

fn expectSegment(expected: []const u8, used: f64, left_s: f64, total: f64) !void {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    var obj = std.json.ObjectMap.init(arena.allocator());
    try obj.put("used_percentage", .{ .float = used });
    try obj.put("resets_at", .{ .float = NOW_MS / 1000 + left_s });
    const got = try segment(arena.allocator(), "5h", .{ .object = obj }, total, NOW_MS);
    try testing.expectEqualStrings(expected, got.?);
}

test "jsRound matches Math.round" {
    try testing.expectEqual(@as(i64, 3), jsRound(2.5));
    try testing.expectEqual(@as(i64, -2), jsRound(-2.5));
    try testing.expectEqual(@as(i64, 2), jsRound(2.49));
}

test "Duration formats hours and days, clamps negatives" {
    var buf: [32]u8 = undefined;
    try testing.expectEqualStrings("2h5m", try std.fmt.bufPrint(&buf, "{f}", .{Duration{ .ms = 125 * 60e3 }}));
    try testing.expectEqualStrings("3d4h", try std.fmt.bufPrint(&buf, "{f}", .{Duration{ .ms = 4570 * 60e3 }}));
    try testing.expectEqualStrings("0h0m", try std.fmt.bufPrint(&buf, "{f}", .{Duration{ .ms = -600e3 }}));
}

test "segment: green / yellow / red / limit / early" {
    // left 3h -> 40% of the 5h window elapsed
    try expectSegment(G ++ "5h 20%token/40%time" ++ X ++ " " ++ DIM ++ "reset 3h0m" ++ X, 20, 3 * 3600, FIVE_HOUR_MS);
    try expectSegment(Y ++ "5h 48%token/40%time" ++ X ++ " " ++ R ++ "limit≈2h10m" ++ X, 48, 3 * 3600, FIVE_HOUR_MS);
    try expectSegment(R ++ "5h 60%token/40%time" ++ X ++ " " ++ R ++ "limit≈1h20m" ++ X, 60, 3 * 3600, FIVE_HOUR_MS);
    try expectSegment(R ++ "5h 100%token/40%time LIMIT" ++ X ++ " " ++ DIM ++ "reset 3h0m" ++ X, 100, 3 * 3600, FIVE_HOUR_MS);
    try expectSegment("5h 10%token/3%time " ++ DIM ++ "reset 4h52m" ++ X, 10, 17500, FIVE_HOUR_MS);
}

test "segment: missing fields -> null" {
    var arena = std.heap.ArenaAllocator.init(testing.allocator);
    defer arena.deinit();
    try testing.expect((try segment(arena.allocator(), "5h", null, FIVE_HOUR_MS, NOW_MS)) == null);
    var obj = std.json.ObjectMap.init(arena.allocator());
    try obj.put("used_percentage", .{ .integer = 5 });
    try testing.expect((try segment(arena.allocator(), "5h", .{ .object = obj }, FIVE_HOUR_MS, NOW_MS)) == null);
}
