const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Main executable
    const exe = b.addExecutable(.{
        .name = "bitbucket_to_ide_link",
        .root_module = b.createModule(.{
            .root_source_file = b.path("bitbucket_to_ide_link.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    // For Windows: hide console window in release builds
    if (optimize != .Debug) {
        exe.subsystem = .Windows; // No console window
    }
    // Debug builds keep console by default (subsystem = .Console)

    b.installArtifact(exe);

    // Create a "run" step for easy testing
    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());

    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app (debug mode with console)");
    run_step.dependOn(&run_cmd.step);

    // Custom build modes as separate steps
    const debug_exe = b.addExecutable(.{
        .name = "bitbucket_to_ide_link_debug",
        .root_module = b.createModule(.{
            .root_source_file = b.path("bitbucket_to_ide_link.zig"),
            .target = target,
            .optimize = .Debug,
        }),
    });
    // Debug always shows console
    debug_exe.subsystem = .Console;

    const debug_install = b.addInstallArtifact(debug_exe, .{});
    const debug_step = b.step("debug", "Build debug version (with console output)");
    debug_step.dependOn(&debug_install.step);

    const release_exe = b.addExecutable(.{
        .name = "bitbucket_to_ide_link",
        .root_module = b.createModule(.{
            .root_source_file = b.path("bitbucket_to_ide_link.zig"),
            .target = target,
            .optimize = .ReleaseFast,
        }),
    });
    // Release hides console
    release_exe.subsystem = .Windows;

    const release_install = b.addInstallArtifact(release_exe, .{});
    const release_step = b.step("release", "Build release version (no console, optimized)");
    release_step.dependOn(&release_install.step);

    // Build both at once
    const all_step = b.step("all", "Build both debug and release versions");
    all_step.dependOn(&debug_install.step);
    all_step.dependOn(&release_install.step);
}
