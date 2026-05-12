/*
        WebMid: A MIDI player in the browser. 
        Copyright (C) 2026  pythoncoder83

        This program is free software: you can redistribute it and/or modify
        it under the terms of the GNU General Public License as published by
        the Free Software Foundation, either version 3 of the License, or
        (at your option) any later version.

        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        GNU General Public License for more details.

        You should have received a copy of the GNU General Public License
        along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

Module.onRuntimeInitialized = async () => {
    let ctx, intervalId;
    const sf2 = await fetch("res/soundfont.sf2").then(r => r.arrayBuffer());
    const mid = await fetch("res/example.mid").then(r => r.arrayBuffer());
    const sf2ptr = Module._malloc(sf2.byteLength);
    const midptr = Module._malloc(mid.byteLength);
    Module.HEAPU8.set(new Uint8Array(sf2), sf2ptr);
    Module.HEAPU8.set(new Uint8Array(mid), midptr);
    Module._init(sf2ptr, sf2.byteLength, midptr, mid.byteLength);
    Module._free(sf2ptr);
    Module._free(midptr);

    document.getElementById("seeker").addEventListener("input", (e) => {
        Module._seek(e.target.value);
    });

    document.getElementById("file_select").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const mid = await file.arrayBuffer();
        const midptr = Module._malloc(mid.byteLength);
        Module.HEAPU8.set(new Uint8Array(mid), midptr);
        Module._load(midptr, mid.byteLength);
        Module._free(midptr);
    });

    window.play = () => {
        if (intervalId) clearInterval(intervalId);
        if (ctx) ctx.close();
        Module._seek(0);
        ctx = new AudioContext({ sampleRate: 44100 });
        const bufsize = 512;
        let nextTime = 0;

        function pump() {
            while (nextTime < ctx.currentTime + 0.3) {
                const ptr = Module._malloc(bufsize * 2 * 4);
                framesRendered = Module._render(ptr, bufsize);

                if(framesRendered === 0) {
                    Module._free(ptr);
                    clearInterval(intervalId);
                    ctx.close();
                    return;
                }

                const samples = new Float32Array(Module.HEAPU8.buffer, ptr, bufsize * 2);
                const audiobuf = ctx.createBuffer(2, bufsize, 44100);
                const left = audiobuf.getChannelData(0);
                const right = audiobuf.getChannelData(1);
                for (let i = 0; i < bufsize; i++) {
                    left[i] = samples[i * 2];
                    right[i] = samples[i * 2 + 1];
                }
                const source = ctx.createBufferSource();
                source.buffer = audiobuf;
                source.connect(ctx.destination);
                if (nextTime < ctx.currentTime) nextTime = ctx.currentTime;
                source.onended = () => Module._free(ptr);
                source.start(nextTime);
                nextTime += bufsize / 44100;
            }
        }

    window.pause = () => {
        ctx.suspend();
        clearInterval(intervalId);
    };

    window.resume = () => {
        ctx.resume();
        intervalId = setInterval(pump, 100);
    };

    intervalId = setInterval(pump, 100);
    document.getElementById("seeker").max = Module.ccall('get_duration', 'number', [], []);
};
};
