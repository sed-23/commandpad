<p align="center">
  <img src="images/icon.png" alt="ScriptKit" width="128" height="128" />
</p>

<h1 align="center">ScriptKit</h1>

<p align="center">
  <strong>Your launchpad for scripts &amp; configs.</strong><br/>
  Run targets, navigate functions, lint issues — across Makefiles, Shell, PowerShell, Batch, .env and config files.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=siddy.scriptkit">
    <img src="https://img.shields.io/visual-studio-marketplace/v/siddy.scriptkit?style=flat-square&color=6C5CE7" alt="Version" />
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=siddy.scriptkit">
    <img src="https://img.shields.io/visual-studio-marketplace/i/siddy.scriptkit?style=flat-square&color=0984E3" alt="Installs" />
  </a>
  <a href="https://github.com/sed-23/scriptkit/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/sed-23/scriptkit?style=flat-square" alt="License" />
  </a>
</p>

---

## Why ScriptKit?

Ever worked with Makefiles, shell scripts, and `.env` files in the same project? You need different tools for each. **ScriptKit gives you one unified experience**:

- See a `▶ Run` button above every target and function
- Pick & run any target from a quick menu
- Get warned about common mistakes before you run
- Navigate all targets in the sidebar Outline view

No configuration needed. Just install and open a supported file.

---

## Features at a Glance

### ▶ CodeLens — Run Anything with One Click

Every make target, shell function, PowerShell function, and batch label gets an inline Run button:

```makefile
# Makefile
▶ Run build                          ← click to run
build: deps
    gcc -o app main.c

▶ Run test
test:
    ./run_tests.sh
```

```bash
# deploy.sh
▶ Run deploy_staging                 ← click to run
deploy_staging() {
    rsync -avz ./dist/ server:/app/
}
```

### 🔍 Quick Pick — Find & Run Any Target

Open the Command Palette (`Ctrl+Shift+P`) → `ScriptKit: Pick & Run Target`

```
┌─ Select a Makefile target to run ───────────────┐
│  ƒ build          Makefile target — line 3       │
│  ƒ test           Makefile target — line 7       │
│  ƒ deploy         Makefile target — line 12      │
│  ƒ clean          Makefile target — line 18      │
└──────────────────────────────────────────────────┘
```

### 🔎 Workspace-Wide Target Search

`ScriptKit: List All Targets in Workspace` — search across **all** script files in your project:

```
┌─ Select a target to run from workspace ─────────────────────┐
│  ƒ build          Makefile — Makefile:3                      │
│  ƒ deploy         Shell — scripts/deploy.sh:5                │
│  ƒ Get-Config     PowerShell — tools/setup.ps1:12            │
│  ƒ DB_HOST        Environment — .env:4                       │
└──────────────────────────────────────────────────────────────┘
```

### ⚠️ Diagnostics — Catch Mistakes Early

| File Type | What's Detected |
|---|---|
| **Makefile** | Spaces instead of tabs in recipes |
| **Shell** | Missing shebang (`#!/bin/bash`) |
| **PowerShell** | Unix aliases (`ls`, `cat`, `rm`) that break portability |
| **.env** | Duplicate keys, empty values, unquoted spaces |
| **Config** | Duplicate keys within sections |

### 📋 Outline & Breadcrumbs

All targets and functions appear in VS Code's **Outline panel** and **breadcrumb navigation** — jump to any target instantly.

### ⚡ Auto-Detected Tasks

All targets show up in `Terminal → Run Task` automatically. No `tasks.json` configuration needed.

---

## Supported Languages

| Language | File Types | Detected Targets |
|---|---|---|
| **Makefile** | `Makefile`, `*.mk`, `GNUmakefile` | Targets (`build:`, `clean:`) |
| **Shell / Bash** | `*.sh`, `*.bash`, `*.zsh` | Functions (`my_func() { }`) |
| **PowerShell** | `*.ps1`, `*.psm1`, `*.psd1` | Functions (`function Verb-Noun`) |
| **Batch** | `*.bat`, `*.cmd` | Labels (`:build`, `:deploy`) |
| **.env** | `.env`, `.env.*`, `.env.local` | Variables (`DB_HOST=localhost`) |
| **Config / INI** | `*.ini`, `*.cfg`, `*.conf`, `*.config` | Sections & keys (`[section]`, `key=val`) |

---

## Commands

| Command | Shortcut | Description |
|---|---|---|
| `ScriptKit: Run Target` | *via CodeLens* | Run the target under the cursor |
| `ScriptKit: Pick & Run Target` | `Ctrl+Shift+P` | Pick a target from the current file |
| `ScriptKit: List All Targets` | `Ctrl+Shift+P` | Pick a target from all workspace files |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `scriptkit.makeCommand` | `make` | Make executable path |
| `scriptkit.shellCommand` | `bash` | Shell for `.sh` scripts |
| `scriptkit.powershellCommand` | `pwsh` | PowerShell executable |
| `scriptkit.enableCodeLens` | `true` | Show ▶ Run buttons |
| `scriptkit.enableDiagnostics` | `true` | Enable linting |

---

## Getting Started

1. Install **ScriptKit** from the VS Code Marketplace
2. Open any supported file (Makefile, `.sh`, `.ps1`, `.bat`, `.env`, `.ini`)
3. You'll see `▶ Run` buttons above targets — click to run
4. Use `Ctrl+Shift+P` → `ScriptKit: Pick & Run Target` for the quick menu

**That's it. No configuration required.**

---

## Development

```bash
git clone https://github.com/sed-23/scriptkit.git
cd scriptkit
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## Contributing

PRs welcome! Open an issue or submit a pull request.

## License

[MIT](LICENSE) © sed-23
