# Releasing

Publishing runs when a GitHub Release is created. It uses npm OIDC trusted publishing, so the repository holds no npm tokens.

## Tags

The release tag chooses the package:

| Tag                 | Publishes          |
| ------------------- | ------------------ |
| `v<version>`        | `@falkordb/ui`     |
| `canvas-v<version>` | `@falkordb/canvas` |

The tag is also where the version comes from. Every `package.json` in the repository holds the placeholder `0.0.0-dev`, and the workflow sets the version from the tag before building and publishing. Releasing is only a matter of creating a release with the new tag; there is no version to bump or keep in sync.

Each package must list this repository's [`release.yml`](../.github/workflows/release.yml) as a trusted publisher on npmjs.com.

## The "Latest" release

GitHub shows only one "Latest" release per repository, so it belongs to `@falkordb/ui`:

- **`v<version>` releases:** tick "Set as the latest release".
- **Web-component releases:** leave it unticked. Each package's own latest is its `latest` tag on npm, shown in the [Packages](../README.md#packages) table.

Ticking "pre-release" on GitHub does not change npm: every release becomes that package's `latest` there.

## Release notes

Published releases also call the organization's shared [release-notes polisher](../.github/workflows/release-notes.yml), which rewrites the generated notes for users and keeps the original notes underneath. Polishing does not publish an npm package.

- The workflow pins the shared workflow to a reviewed commit. Update that SHA deliberately when adopting changes to the polisher.
- The repository needs access to the organization's `AZURE_OPENAI_API_KEY` secret and `AZURE_OPENAI_ENDPOINT` variable (and optionally `AZURE_OPENAI_DEPLOYMENT`).
- It can also be run manually with a release tag, an optional oldest tag for a range, and `dry_run` to preview without editing releases. Both `v<version>` and `canvas-v<version>` tags are supported; keep a range within one package's release series.
