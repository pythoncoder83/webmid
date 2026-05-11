#define TSF_IMPLEMENTATION
#include "tsf.h"
#define TML_IMPLEMENTATION
#include "tml.h"
#include <emscripten.h>

static tsf* synth;
static tml_message* cur;
static tml_message* first;
static double mstime = 0.0;

EMSCRIPTEN_KEEPALIVE
void load(void* mid, int mid_size) {
    if (first) tml_free(first);
    first = tml_load_memory(mid, mid_size);
    cur = first;
    mstime = 0.0;
}

EMSCRIPTEN_KEEPALIVE
void init(void* sf2, int sf2_size, void* mid, int mid_size) {
    synth = tsf_load_memory(sf2, sf2_size);
    tsf_set_output(synth, TSF_STEREO_INTERLEAVED, 44100, 0);
    load(mid, mid_size);
    for (int i = 0; i < 16; i++)
        tsf_channel_set_presetnumber(synth, i, 0, i == 9);
}

EMSCRIPTEN_KEEPALIVE
int render(float* buffer, int frames) {
    while (cur && mstime >= cur->time) {
        if (cur->type == TML_NOTE_ON)
            tsf_note_on(synth, cur->channel, cur->key, cur->velocity / 127.0f);
        else if (cur->type == TML_NOTE_OFF)
            tsf_note_off(synth, cur->channel, cur->key);
        else if (cur->type == TML_PROGRAM_CHANGE)
            tsf_channel_set_presetnumber(synth, cur->channel, cur->program, cur->channel == 9);
        else if (cur->type == TML_CONTROL_CHANGE) {
            if (cur->control == TML_VOLUME_MSB)
                tsf_channel_set_volume(synth, cur->channel, cur->control_value / 127.0f);
            else if (cur->control == TML_PAN_MSB)
                tsf_channel_set_pan(synth, cur->channel, cur->control_value / 127.0f);
        }
        else if (cur->type == TML_PITCH_BEND)
            tsf_channel_set_pitchwheel(synth, cur->channel, cur->pitch_bend);
        cur = cur->next;
    }

    tsf_render_float(synth, buffer, frames, 0);
    mstime += frames * (1000.0 / 44100.0);
    return cur != NULL;
}

EMSCRIPTEN_KEEPALIVE
void seek(double target_ms) {
    tsf_reset(synth);
    mstime = 0.0;
    cur = first;
    while (cur && cur->time < target_ms) {
        if (cur->type == TML_PROGRAM_CHANGE)
            tsf_channel_set_presetnumber(synth, cur->channel, cur->program, cur->channel == 9);
        cur = cur->next;
    }
    mstime = target_ms;
}

EMSCRIPTEN_KEEPALIVE
double get_duration() {
    tml_message* m = first;
    double last = 0;
    while (m) {
        last = m->time;
        m = m->next;
    }
    return last;
}
