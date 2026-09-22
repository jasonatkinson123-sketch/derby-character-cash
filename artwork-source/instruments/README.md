# Instrument artwork source

The `*-master.png` files are the original high-resolution transparent raster generations used to produce the website assets. The application does not load these files at runtime.

Runtime files live in `assets/instruments/` and must remain:

- exactly 512 × 512 pixels;
- transparent PNGs;
- centered with safe padding;
- named to match the stable path in the `INSTRUMENTS` catalog in `app.js`.

To replace an illustration, keep the runtime filename unchanged. A replacement can be normalized with ImageMagick using the same production rule:

```bash
convert replacement-master.png -trim +repage -resize '430x430>' \
  -gravity center -background none -extent 512x512 -strip \
  -define png:compression-level=9 assets/instruments/flute.png
```

Change the final filename to the instrument being replaced. Review the result on a cream background and at 96px, 64px, and the actual classroom-card size before deployment.
