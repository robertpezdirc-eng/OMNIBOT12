# 🚀 VS Code Setup Guide for OMNIBOT12

This guide will help you quickly set up Visual Studio Code for developing with OMNIBOT12.

## Quick Start (30 seconds)

### Option 1: Open with Workspace File (Recommended)
```bash
code OMNIBOT12.code-workspace
```

### Option 2: Open Directory
```bash
code .
```

## First-Time Setup

1. **Install VS Code**
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)

2. **Open the Project**
   - Use one of the Quick Start methods above

3. **Install Recommended Extensions**
   - When prompted, click "Install All" for recommended extensions
   - Or manually: Press `Ctrl+Shift+P` → "Extensions: Show Recommended Extensions"

4. **Select Python Interpreter**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type "Python: Select Interpreter"
   - Choose `./omni-env/bin/python` (or create the virtual environment first)

5. **Install Dependencies**
   - Press `Ctrl+Shift+P` → "Tasks: Run Task" → "Setup: Complete Environment"
   - Or manually run:
     ```bash
     npm install
     pip install -r requirements.txt
     ```

## What's Included

### 🎨 Editor Configuration
- Auto-formatting on save
- ESLint integration
- Code action on save
- Proper indentation for all languages
- File exclusions for cleaner workspace

### 🔧 Recommended Extensions
- **JavaScript/TypeScript**: ESLint, Prettier
- **Python**: Python, Pylance
- **Docker**: Docker extension
- **Database**: MongoDB extension
- **Git**: GitLens, Git Graph
- **AI**: GitHub Copilot
- And more!

### 🐛 Debugging Configurations
Ready-to-use debug configurations:
- Node.js Main App
- Python OMNI Main
- Docker containers
- Current file (any language)
- Full Stack (Node.js + Python together)

### ⚙️ Tasks
Pre-configured for:
- Running tests
- Linting code
- Building project
- Docker operations
- Installing dependencies

### 📝 Code Snippets
Fast development with:
- `omni-route` - Express/Flask route
- `omni-socket` - Socket.IO handler
- `omni-module` - OMNI module class
- `omni-async` - Async function
- And many more!

## Quick Actions

### Run the Application
- Press `F5` → Select "Node.js: Launch Main App" or "Python: OMNI Main"

### Run Tests
- Press `Ctrl+Shift+P` → "Tasks: Run Task" → "npm: Run Tests"

### Lint Code
- Press `Ctrl+Shift+P` → "Tasks: Run Task" → "npm: Lint Code"

### Start Docker
- Press `Ctrl+Shift+P` → "Tasks: Run Task" → "Docker: Start Services"

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Open Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Quick Open File | `Ctrl+P` | `Cmd+P` |
| Open Terminal | `Ctrl+`` | `Cmd+`` |
| Start Debugging | `F5` | `F5` |
| Run Task | `Ctrl+Shift+B` | `Cmd+Shift+B` |
| Toggle Breakpoint | `F9` | `F9` |
| Format Document | `Shift+Alt+F` | `Shift+Option+F` |

## Troubleshooting

### Extensions Not Installing
1. Open Extensions panel (`Ctrl+Shift+X`)
2. Search for extensions in `.vscode/extensions.json`
3. Install manually

### Python Interpreter Not Found
1. Create virtual environment:
   ```bash
   python -m venv omni-env
   source omni-env/bin/activate  # Linux/macOS
   omni-env\Scripts\activate      # Windows
   ```
2. Select interpreter: `Ctrl+Shift+P` → "Python: Select Interpreter"

### ESLint Not Working
1. Install Node.js dependencies: `npm install`
2. Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"

## More Information

For detailed documentation, see [.vscode/README.md](.vscode/README.md)

## Need Help?

- Check [INSTALLATION.md](INSTALLATION.md) for general setup
- See [README.md](README.md) for project documentation
- Open an issue on GitHub

---

**Happy Coding!** 🎉

*OMNI-BRAIN Team*
