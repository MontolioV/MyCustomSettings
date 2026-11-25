// SIMD version using proper vector loads/stores
// Target: wasm32 with SIMD extension

const Vec4 = @Vector(4, f32);

const BUFFER_SIZE = 100 * 65536; // 6.4MB
var memory_buffer: [BUFFER_SIZE]u8 align(16) = undefined;

var xs: [*]f32 = undefined;
var ys: [*]f32 = undefined;
var vxs: [*]f32 = undefined;
var vys: [*]f32 = undefined;
var max_count: usize = 0;

export fn init_particles(count: usize) i32 {
    const bytes_needed = count * 4 * 4;
    if (bytes_needed > BUFFER_SIZE) return -1;

    max_count = count;

    // Round up to multiple of 4 for SIMD
    const aligned_count = (count + 3) & ~@as(usize, 3);
    const base: [*]f32 = @ptrCast(@alignCast(&memory_buffer));

    xs = base;
    ys = base + aligned_count;
    vxs = base + aligned_count * 2;
    vys = base + aligned_count * 3;

    for (0..count) |i| {
        xs[i] = @floatFromInt(i % 800);
        ys[i] = @floatFromInt(i % 600);
        vxs[i] = @as(f32, @floatFromInt(i % 10)) - 5.0;
        vys[i] = @as(f32, @floatFromInt(i % 10)) - 5.0;
    }

    return 0;
}

export fn get_max_particles() usize {
    return BUFFER_SIZE / 16;
}

// Scalar baseline
export fn update_scalar(count: usize) void {
    const n = @min(count, max_count);
    for (0..n) |i| {
        xs[i] += vxs[i];
        ys[i] += vys[i];
        if (xs[i] < 0 or xs[i] > 800) vxs[i] = -vxs[i];
        if (ys[i] < 0 or ys[i] > 600) vys[i] = -vys[i];
    }
}

// SIMD with vector loads via slice-to-vector
export fn update_simd(count: usize) void {
    const n = @min(count, max_count);
    const vec_count = n / 4;

    const zero: Vec4 = @splat(0.0);
    const width: Vec4 = @splat(800.0);
    const height: Vec4 = @splat(600.0);

    var i: usize = 0;
    while (i < vec_count) : (i += 1) {
        const o = i * 4;

        // Load 4 floats as vector (Zig should emit v128.load)
        var x: Vec4 = xs[o..][0..4].*;
        var y: Vec4 = ys[o..][0..4].*;
        var vx: Vec4 = vxs[o..][0..4].*;
        var vy: Vec4 = vys[o..][0..4].*;

        // Update positions
        x += vx;
        y += vy;

        // Branchless bounce
        const flip_x = (x < zero) | (x > width);
        const flip_y = (y < zero) | (y > height);
        vx = @select(f32, flip_x, -vx, vx);
        vy = @select(f32, flip_y, -vy, vy);

        // Store back
        xs[o..][0..4].* = x;
        ys[o..][0..4].* = y;
        vxs[o..][0..4].* = vx;
        vys[o..][0..4].* = vy;
    }

    // Remainder
    for ((vec_count * 4)..n) |j| {
        xs[j] += vxs[j];
        ys[j] += vys[j];
        if (xs[j] < 0 or xs[j] > 800) vxs[j] = -vxs[j];
        if (ys[j] < 0 or ys[j] > 600) vys[j] = -vys[j];
    }
}

export fn update_scalar_n(count: usize, iterations: usize) void {
    for (0..iterations) |_| update_scalar(count);
}

export fn update_simd_n(count: usize, iterations: usize) void {
    for (0..iterations) |_| update_simd(count);
}
