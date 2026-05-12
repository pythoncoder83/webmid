CC = emcc
CFLAGS = -O3 -s WASM=1 -s EXPORTED_FUNCTIONS="['_init','_render','_malloc','_free','_seek','_get_duration','_load']" -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','HEAPU8','HEAP8']" -s ALLOW_MEMORY_GROWTH -s INITIAL_MEMORY=67108864

TSF_DIR=tsf
C_SRC = tsf.c
JS_OUT = tsf.js
WASM_OUT = tsf.wasm

all: $(JS_OUT)

$(JS_OUT): $(TSF_DIR)/$(C_SRC)
	$(CC) $(TSF_DIR)/$(C_SRC) $(CFLAGS) -o $(JS_OUT) # this filename will automatically get used by emcc for the WASM file, too

clean:
	rm -f $(JS_OUT) $(WASM_OUT)
