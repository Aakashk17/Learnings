# Learnings Library

This repository is a personal static website for storing and browsing all your learning notes in one place.

## Folder structure

Put your HTML files inside the `content/` folder in whatever topic structure you want.
You can keep multiple HTML files in the same course folder.

Example:

```text
content/
  front-end/
    html-basics.html
    css-layouts.html
  back-end/
    api-design.html
  ai/
    claude/
      courses/
        course.html
        prompts.html
        claude-artifact.link.json
```

The homepage reads `content/manifest.json`, which is generated from the folders and HTML files inside `content/`.
It also supports externally hosted resources through `.link.json` files.

## Add a new learning file

1. Create a folder path under `content/`.
2. Add an `.html` file there.
3. Run:

```powershell
powershell -File scripts/generate-manifest.ps1
```

4. Commit and push your changes.

## Add an external hosted link

Create a `.link.json` file anywhere under `content/`.

Example:

```json
{
  "title": "Claude Artifact",
  "url": "https://claude.ai/public/artifacts/example",
  "description": "Hosted externally"
}
```

Then run:

```powershell
powershell -File scripts/generate-manifest.ps1
```

## GitHub Pages hosting

This repo includes a GitHub Actions workflow that:

1. Regenerates `content/manifest.json`
2. Deploys the site to GitHub Pages

Push to `main` and the site will redeploy automatically.

## Starter files

Starter examples are included here:

- `content/front-end/start-here.html`
- `content/back-end/start-here.html`
- `content/ai/claude/courses/course.html`
- `content/ai/claude/courses/claude-artifact.link.json`

You can edit, duplicate, or delete them anytime.
