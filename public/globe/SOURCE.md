# Globe textures

Both files are resampled from the example imagery in the MIT-licensed
[`three-globe`](https://github.com/vasturiano/three-globe) package
(`example/img/`, v2.45.2), which is derived from NASA's Blue Marble
imagery — a US government work in the public domain.

| file | source | original | here |
| --- | --- | --- | --- |
| `earth-map.jpg` | `earth-blue-marble.jpg` | 4096×2048 JPEG, 1.46 MB | 2048×1024 JPEG q78, 257 kB |
| `earth-topology.jpg` | `earth-topology.png` | 2048×1024 PNG, 378 kB | 1024×512 JPEG q80, 27 kB |

They were served from a public CDN at runtime until an outage was found to
render the globe as a blank sphere. They are vendored so the page owns them.

The sizes were chosen by measurement, not by eye: the globe draws about 330
CSS px wide, so at dpr 2 roughly half the map is stretched over ~660 device
px. Rendered against the full-size originals, 2048 differs by a mean of
0.93/255 with 1.9% of pixels off by more than 8/255 — invisible. 1024 more
than doubles that (mean 1.67, 6.1%) and softens the coastlines. The bump map
carries only low-frequency relief at `bumpScale: 0.014`, so it survives both
the halving and the move to JPEG.

To re-derive:

    npm pack three-globe
    tar xzf three-globe-*.tgz package/example/img/
