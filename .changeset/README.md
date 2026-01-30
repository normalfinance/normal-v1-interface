# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

## Creating a changeset

After making changes that should be released, run:

```bash
npx changeset
```

This will prompt you to:
1. Select the packages you've changed
2. Choose the version bump type (patch/minor/major)
3. Write a summary of the changes

The changeset file will be committed with your PR.

## How releases work

1. When PRs with changesets are merged to `master`, a "Version Packages" PR is created
2. This PR contains all pending version bumps and changelog updates
3. Merging the "Version Packages" PR triggers the actual release

## Version bump types

- `patch` - Bug fixes, minor changes (1.0.0 -> 1.0.1)
- `minor` - New features, non-breaking changes (1.0.0 -> 1.1.0)
- `major` - Breaking changes (1.0.0 -> 2.0.0)
