#!/bin/bash

# Compile the simple version (recommended)
zig build-lib particles_simple.zig -target wasm32-freestanding -O ReleaseFast -dynamic -rdynamic

# Rename output
mv particles_simple.wasm.o particles_simple.wasm 2>/dev/null || mv libparticles_simple.wasm particles_simple.wasm 2>/dev/null || true

# Alternative command if the above doesn't work:
# zig build-exe particles_simple.zig -target wasm32-freestanding -O ReleaseFast -fno-entry -femit-bin=particles_simple.wasm

echo "Built particles_simple.wasm"
ls -lh particles_simple.wasm

echo ""
echo "To run:"
echo "  python3 -m http.server 8080"
echo "  open http://localhost:8080/index_simple.html"
