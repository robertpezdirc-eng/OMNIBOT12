# VS Code Configuration for OMNIBOT12

This directory contains Visual Studio Code configuration files to enhance your development experience with the OMNIBOT12 project.

## 📁 Configuration Files

### `settings.json`
Project-specific editor settings including:
- Code formatting preferences (tabs, spacing)
- File exclusions (node_modules, cache files, databases)
- Language-specific configurations (JavaScript, TypeScript, Python, HTML, CSS)
- ESLint and linting configurations
- Python virtual environment setup
- Git settings
- Terminal configurations

### `extensions.json`
Recommended VS Code extensions for this project:
- **JavaScript/TypeScript**: ESLint, Prettier
- **Python**: Python extension, Pylance
- **Docker**: Docker extension
- **Database**: MongoDB extension
- **Git**: GitLens, Git Graph
- **Utilities**: Path IntelliSense, Error Lens, TODO Tree
- **AI**: GitHub Copilot, Copilot Chat

### `launch.json`
Debugging configurations for:
- **Node.js Applications**:
  - Launch main app (`omni-ultra-main.js`)
  - Launch server (`server.js`)
  - Debug current file
  - Attach to running process
- **Python Applications**:
  - Run OMNI main (`omni.py`)
  - Debug current file
  - IoT Dashboard
  - Thea Queue System
  - Debug tests with pytest
- **Docker**:
  - Attach to Node.js in Docker container
- **Compound Configurations**:
  - Full Stack: Node.js + Python simultaneously

### `tasks.json`
Pre-configured tasks for common operations:
- **NPM Tasks**: install, start, dev, test, lint, build, clean
- **Python Tasks**: install requirements, run OMNI, run tests
- **Docker Tasks**: build, start, stop, view logs
- **Git Tasks**: pull latest
- **Combined Tasks**: complete environment setup, full build and test

### `snippets/`
Code snippets for faster development:
- **JavaScript**: Express routes, Socket.IO handlers, async functions, MongoDB queries, OMNI modules
- **Python**: Flask routes, async functions, database queries, OMNI modules, API handlers

## 🚀 Quick Start

### Option 1: Open with Workspace File
```bash
code OMNIBOT12.code-workspace
```

### Option 2: Open Directory
```bash
code .
```

## 🔧 First-Time Setup

1. **Open the project** in VS Code
2. **Install recommended extensions** when prompted
3. **Select Python interpreter**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Type "Python: Select Interpreter"
   - Choose `./omni-env/bin/python`

4. **Run setup task**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Type "Tasks: Run Task"
   - Select "Setup: Complete Environment"

## 🐛 Debugging

### Debug Node.js Application
1. Open the file you want to debug or `omni-ultra-main.js`
2. Press `F5` or go to Run and Debug panel
3. Select "Node.js: Launch Main App"
4. Set breakpoints by clicking on the line numbers

### Debug Python Application
1. Open the file you want to debug or `omni.py`
2. Press `F5` or go to Run and Debug panel
3. Select "Python: OMNI Main"
4. Set breakpoints by clicking on the line numbers

### Debug Both Node.js and Python
1. Go to Run and Debug panel
2. Select "Full Stack: Node.js + Python"
3. This will launch both debuggers simultaneously

## ⌨️ Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Quick Open | `Ctrl+P` | `Cmd+P` |
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Integrated Terminal | `Ctrl+`` | `Cmd+`` |
| Run Task | `Ctrl+Shift+B` | `Cmd+Shift+B` |
| Start Debugging | `F5` | `F5` |
| Toggle Breakpoint | `F9` | `F9` |
| Go to Definition | `F12` | `F12` |
| Find in Files | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Format Document | `Shift+Alt+F` | `Shift+Option+F` |

## 📝 Code Snippets Usage

Type the prefix and press `Tab` to expand:

### JavaScript
- `omni-route` - Express route handler
- `omni-socket` - Socket.IO event handler
- `omni-async` - Async function with error handling
- `omni-mongo` - MongoDB query
- `omni-module` - OMNI module class
- `omni-test-api` - API endpoint test
- `omni-log` - Formatted log message
- `omni-env` - Environment variable with default

### Python
- `omni-pymodule` - OMNI Python module class
- `omni-async` - Async function with error handling
- `omni-route` - Flask route handler
- `omni-log` - Logger statement
- `omni-env` - Environment variable with default
- `omni-try` - Try-except block with logging
- `omni-db` - Database query
- `omni-class` - Python class with init
- `omni-api` - OMNI API handler function

## 🔍 Recommended Settings

### For JavaScript/TypeScript Development
The configuration includes:
- Auto-import organization
- ESLint auto-fix on save
- Prettier formatting
- Single quotes preference
- 2-space indentation

### For Python Development
The configuration includes:
- Virtual environment auto-detection
- Pylint enabled
- Auto-import organization
- 4-space indentation
- Type checking enabled

### For Docker Development
The configuration includes:
- Docker extension for container management
- Docker Compose support
- Debugging in containers

## 🛠️ Customization

You can override any settings in your personal VS Code settings. The workspace settings will take precedence over user settings for this project only.

### To modify settings:
1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Preferences: Open Workspace Settings"
3. Modify as needed

## 📚 Additional Resources

- [VS Code Documentation](https://code.visualstudio.com/docs)
- [Node.js Debugging Guide](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
- [Python in VS Code](https://code.visualstudio.com/docs/languages/python)
- [Docker in VS Code](https://code.visualstudio.com/docs/containers/overview)

## 🤝 Contributing

When adding new configurations:
1. Test thoroughly before committing
2. Document any new settings or tasks
3. Keep the configuration minimal and relevant
4. Follow the existing structure and naming conventions

---

**Project**: OMNIBOT12 - OMNI Ultimate Turbo Flow System  
**Team**: OMNI-BRAIN Team  
**License**: MIT
