# Fix for the Vercel build error

The deployed `index.html` imports `/src/main.js` and `/src/style.css`. Both files must exist in the Git repository under a folder named `src` at the repository root.

## Smallest fix for the existing GitHub repository

1. Extract `love-heart-src-fix.zip` into the root of the repository.
2. Confirm the repository contains:
   - `src/main.js`
   - `src/style.css`
3. Commit and push the new `src` folder.
4. In Vercel, redeploy the latest commit.

Commands from the repository root:

```bash
git add src/main.js src/style.css
git commit -m "Add missing animation source files"
git push origin main
```

## Full project replacement

Alternatively, use `love-heart-vercel-fixed.zip`. Its contents are already arranged with `index.html`, `package.json`, `vercel.json`, and `src/` at the project root. Do not upload the outer containing folder as an extra nested directory.

Vercel settings:
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install` (default)
