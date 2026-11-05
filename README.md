# Love Heart

A responsive recreation of the animated multilingual text heart from the supplied video. It uses the same classic parametric heart equation, deterministic phrase placement, and a staged reveal: a small center cluster appears first, the heart outline forms, and then the interior fills in.

## Run locally

```bash
npm install
npm run dev
```

## Build for deployment

```bash
npm run build
npm run preview
```

The production website is generated in `dist/`.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected Vite settings: build command `npm run build`, output directory `dist`.
4. Click **Deploy**.

## Controls

- Replay button: restart the animation.
- Pause button: pause or resume.
- `R`: replay.
- `Space`: pause or resume.

The animation is drawn locally on an HTML canvas. It does not need external APIs, images, or runtime services.
