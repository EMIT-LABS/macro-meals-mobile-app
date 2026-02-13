# Branch strategy and protection rules

Recommended branch layout and how to configure GitHub branch protection for **dev**, **staging**, and **production**.

---

## Branch naming (suggested)

| Branch      | Purpose        | Deploys to                    |
|------------|----------------|-------------------------------|
| `main`     | Production     | TestFlight (prod), Play Store |
| `staging`  | Staging        | TestFlight (stg), Firebase App Distribution |
| `develop`  | Development    | Optional: staging or internal builds only |

You can use different names (e.g. `production` instead of `main`); adjust the table and the deploy workflows to match.

---

## How to create branch protection rules

1. Open your repo on GitHub → **Settings** → **Rules** → **Rulesets** (or **Branches** → **Branch protection rules** on older UIs).
2. Add a **New ruleset** (or “Add rule”) for each branch you want to protect.

### Option A: Rulesets (recommended, newer UI)

**Settings → Rules → Rulesets → New ruleset**

- **Ruleset name:** e.g. `Production (main)`
- **Target:** “Branch,” include by name: `main`
- **Rules:** enable the rules below that you want, then Create.

Repeat for `staging` and `develop` with their branch names.

### Option B: Branch protection rules (classic)

**Settings → Branches → Add branch protection rule**

- **Branch name pattern:** e.g. `main`, then configure the rules below.

Repeat for `staging` and `develop`.

---

## Suggested rules per branch

### Production (`main`)

- **Require a pull request before merging**
  - Require approvals: 1 (or more)
  - Dismiss stale reviews when new commits are pushed: optional
- **Require status checks to pass** (if you use CI)
  - e.g. `ci`, `lint`, or your workflow names
- **Require branches to be up to date** before merging: optional but recommended
- **Do not allow bypassing the above settings** (or restrict bypass to admins only)
- **Restrict who can push:** optional (e.g. only certain users/teams)
- **Allow force pushes:** No
- **Allow deletions:** No

### Staging (`staging`)

- **Require a pull request before merging**
  - Require approvals: 0 or 1, depending on team size
- **Require status checks:** same as production if you want consistency
- **Allow force pushes:** No (or Yes only for maintainers if you need to fix history)
- **Allow deletions:** No

### Development (`develop`)

- Lighter rules than production:
  - Optional: require PRs, fewer or no required approvals
  - Optional: require status checks
- **Allow force pushes:** Often Yes for `develop` (e.g. after rebase), or restrict to maintainers
- **Allow deletions:** No (or Yes only for admins)

---

## Quick reference: where to click

| Step | Location |
|------|----------|
| Repo settings | GitHub repo → **Settings** |
| Branch rules | **Rules** → **Rulesets** (or **Branches** → **Branch protection rules**) |
| New rule | **New ruleset** or **Add branch protection rule** |
| Target branch | In the rule: “Target” / “Branch name pattern” → e.g. `main`, `staging`, `develop` |

---

## Optional: require status checks

If your workflows are named e.g. `CI` and `Lint`, add them under “Require status checks” so merges only succeed when those jobs pass. The exact names must match the **job name** or **workflow name** in your `.github/workflows/*.yml` files.

---

## Summary

1. **Production (`main`):** strict — PR required, approvals, status checks, no force push/delete.
2. **Staging (`staging`):** similar to main but you can allow fewer approvals or no approvals.
3. **Development (`develop`):** looser — optional PRs/approvals, force push often allowed for develop-only.

Create one ruleset (or branch protection rule) per branch and apply the settings above.
