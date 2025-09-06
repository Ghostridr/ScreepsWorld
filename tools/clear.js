#!/usr/bin/env node
// tools/clear.js
// Deletes all files in the default/ subdirectory of each server listed in link.js

const fs = require('fs');
const path = require('path');

// Centralized server config
const { SERVER_DIRS, ROOT } = require('./server_dirs');

function ensureDefaultTarget(baseAbs) {
    return path.basename(baseAbs) === 'default' ? baseAbs : path.join(baseAbs, 'default');
}

function main() {
    const preview = process.argv.includes('--preview');
    for (const name of SERVER_DIRS) {
        const target = ensureDefaultTarget(path.resolve(ROOT, name));
        if (!fs.existsSync(target)) {
            console.log('No default/ directory for', name);
            continue;
        }
        const files = fs.readdirSync(target);
        if (preview) {
            const relTarget = path.relative(process.cwd(), target);
            console.log(`Target: ${relTarget}`);
            console.log('[PREVIEW] Would delete:');
            for (const file of files) {
                const filePath = path.join(relTarget, file);
                const absFilePath = path.join(target, file);
                const stat = fs.lstatSync(absFilePath);
                if (stat.isFile() || stat.isSymbolicLink()) {
                    console.log(`- ${filePath}`);
                }
            }
            console.log('');
        } else {
            const relTarget = path.relative(process.cwd(), target);
            let deleted = false;
            for (const file of files) {
                const filePath = path.join(target, file);
                const relFilePath = path.join(relTarget, file);
                try {
                    const stat = fs.lstatSync(filePath);
                    if (stat.isFile() || stat.isSymbolicLink()) {
                        fs.unlinkSync(filePath);
                        if (!deleted) {
                            console.log(`Target: ${relTarget}`);
                            console.log('[DELETED]:');
                            deleted = true;
                        }
                        console.log(`- ${relFilePath}`);
                    }
                } catch (e) {
                    console.warn('Failed to delete', filePath, e.message);
                }
            }
        }
    }
    if (preview) {
        console.log('Preview mode: No files were actually deleted.');
    } else {
        console.log('Clear complete.');
    }
}

if (require.main === module) main();
