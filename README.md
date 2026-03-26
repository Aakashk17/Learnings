# Learnings Library

This repository is a personal static website for storing and browsing all your learning notes in one place.

## Folder structure

Put your HTML files inside the `content/` folder in whatever topic structure you want.

Example:

```text
content/
  front-end/
    html-basics.html
  back-end/
    api-design.html
  ai/
    claude/
      courses/
        course.html
```

The homepage reads `content/manifest.json`, which is generated from the folders and HTML files inside `content/`.

## Add a new learning file

1. Create a folder path under `content/`.
2. Add an `.html` file there.
3. Run:

```powershell
powershell -File scripts/generate-manifest.ps1
```

4. Commit and push your changes.

## GitHub Pages hosting

This repo includes a GitHub Actions workflow that:

1. Regenerates `content/manifest.json`
2. Deploys the site to GitHub Pages

After the repository is pushed to GitHub, enable Pages if needed and use the GitHub Actions deployment.

## Starter files

Starter examples are included here:

- `content/front-end/start-here.html`
- `content/back-end/start-here.html`
- `content/ai/claude/courses/course.html`

You can edit, duplicate, or delete them anytime.

