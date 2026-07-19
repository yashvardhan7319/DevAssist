const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;

function moveSync(srcPath, destPath) {
    if (fs.existsSync(srcPath)) {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.renameSync(srcPath, destPath);
        console.log(`Moved ${srcPath} -> ${destPath}`);
    }
}

console.log("Starting structural migration...");

moveSync(path.join(projectRoot, 'src'), path.join(projectRoot, 'dashboard'));

moveSync(path.join(projectRoot, 'server', 'routes'), path.join(projectRoot, 'api', 'routes'));
moveSync(path.join(projectRoot, 'server', 'controllers'), path.join(projectRoot, 'api', 'controllers'));
moveSync(path.join(projectRoot, 'server', 'middlewares'), path.join(projectRoot, 'api', 'middlewares'));

moveSync(path.join(projectRoot, 'server', 'services', 'orchestrator.ts'), path.join(projectRoot, 'orchestrator', 'engine.ts'));

moveSync(path.join(projectRoot, 'server', 'services'), path.join(projectRoot, 'core', 'services'));
moveSync(path.join(projectRoot, 'server', 'utils'), path.join(projectRoot, 'core', 'utils'));
moveSync(path.join(projectRoot, 'server', 'config'), path.join(projectRoot, 'core', 'config'));
moveSync(path.join(projectRoot, 'server', 'db.ts'), path.join(projectRoot, 'core', 'db.ts'));
moveSync(path.join(projectRoot, 'server', 'groq.ts'), path.join(projectRoot, 'core', 'groq.ts'));
moveSync(path.join(projectRoot, 'server', 'database.sqlite'), path.join(projectRoot, 'core', 'database.sqlite'));

if (fs.existsSync(path.join(projectRoot, 'server'))) {
    try { fs.rmdirSync(path.join(projectRoot, 'server')); } catch (e) {}
}

console.log("Directory structure moved successfully.");
