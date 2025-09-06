#!/usr/bin/env node
// tools/link.js
// Symlink every src/**/*.js (excluding this tools folder) into each server's /default directory
// using dot-named module filenames (e.g. service/pathing.js -> service.pathing.js).

const fs = require('fs');
const path = require('path');

// Centralized server config
const { SERVER_DIRS, ROOT, SRC } = require('./server_dirs');

function ensureDefaultTarget(baseAbs) {
    // If caller already provided a /default path, keep it; otherwise append.
    return path.basename(baseAbs) === 'default' ? baseAbs : path.join(baseAbs, 'default');
}
function makeTargets() {
    // Return absolute paths to each target directory.
    return SERVER_DIRS.map((name) => ensureDefaultTarget(path.resolve(ROOT, name)));
}
function listJs(dir) {
    const out = [];
    // Recursively list all .js files under dir, excluding dotfiles and the tools directory.
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        // Skip dotfiles
        if (ent.name.startsWith('.')) continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            // Skip the tools directory to avoid exporting tooling scripts to production code.
            if (path.basename(p) === 'tools') continue;
            out.push(...listJs(p));
        } else if (
            // Exclude this link.js file and any other tooling scripts in tools/ from being linked.
            ent.isFile() &&
            p.endsWith('.js') &&
            !(path.basename(p) === 'clear.js' && path.basename(path.dirname(p)) === 'tools') &&
            !(path.basename(p) === 'copy.js' && path.basename(path.dirname(p)) === 'tools') &&
            !(path.basename(p) === 'link.js' && path.basename(path.dirname(p)) === 'tools') &&
            !(path.basename(p) === 'server_dirs.js' && path.basename(path.dirname(p)) === 'tools')
        ) {
            out.push(p);
        }
    }
    return out;
}

// Convert a source file path to a module name relative to SRC, e.g. manager.spawner
const toModule = (f) =>
    path.relative(SRC, f).replace(/\\/g, '/').replace(/\.js$/, '').split('/').join('.');

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

// Create or replace a symlink at targetDir/<module>.js pointing to srcFile
function linkOne(targetDir, srcFile) {
    const mod = toModule(srcFile); // e.g. manager.spawner
    const out = path.join(targetDir, `${mod}.js`); // e.g. <server>/default/manager.spawner.js
    const rel = path.relative(path.dirname(out), srcFile);
    const preview = process.argv.includes('--preview');
    try {
        if (preview) {
            console.log(`[PREVIEW] Would symlink ${srcFile} to ${out}`);
        } else {
            if (fs.existsSync(out)) fs.unlinkSync(out);
            fs.symlinkSync(rel, out, 'file');
            const relTarget = path.relative(process.cwd(), targetDir);
            const relOut = path.join(relTarget, `${toModule(srcFile)}.js`);
            console.log(`Target: ${relTarget}`);
            console.log('[LINKED]:');
            console.log(`- ${relOut}`);
        }
    } catch (e) {
        console.warn('Failed to link', out, e.message);
    }
    fs.symlinkSync(rel, out);
    console.log('link:', path.relative(process.cwd(), out), '->', rel);
}

// Main entry point
function main() {
    const targets = makeTargets();
    if (!fs.existsSync(SRC)) {
        console.error('Source directory not found:', SRC);
        process.exit(1);
    }
    targets.forEach(ensureDir);
    const files = listJs(SRC);
    if (!files.length) {
        console.warn('No source .js files discovered under', SRC);
    } else if (files.length === 1 && /main\.js$/.test(files[0])) {
        console.warn('[link] Only main.js detected in src/.');
    }
    const preview = process.argv.includes('--preview');
    if (preview) {
        for (const t of targets) {
            const relTarget = path.relative(process.cwd(), t);
            console.log(`Target: ${relTarget}`);
            console.log('[PREVIEW] Would link:');
            for (const f of files) {
                const mod = toModule(f);
                const out = path.join(relTarget, `${mod}.js`);
                console.log(`- ${out}`);
            }
            console.log('');
        }
        console.log('Preview mode: No files were actually linked.');
        return;
    } else {
        for (const t of targets) {
            console.log(`\nTarget: ${t}`);
            for (const f of files) linkOne(t, f);
        }
    }
    console.log('\nCompleted linking to', targets.length, 'target(s).');
}

if (require.main === module) main();
