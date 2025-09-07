#!/usr/bin/env node
/*
  Strictify equality operators in JS files.
  - Recursively scans the repository for .js files (excludes node_modules, .git, .vscode by default).
  - Converts ==  -> === and != -> !== using an AST (safe; strings/comments untouched).
  - Preserves == null / != null checks (ESLint eqeqeq 'smart' behavior).
  - Training folder 'screeps.com' is excluded by default; you can include it via prompt or flag.
  CLI flags:
    --include-training   Include screeps.com without prompting
    --exclude-training   Exclude screeps.com (default)
    --no-prompt          Do not prompt; honor include/exclude flags
*/

const fs = require('fs');
const path = require('path');
const recast = require('recast');

const projectRoot = path.resolve(__dirname, '..');
const TRAINING_DIR = path.join(projectRoot, 'screeps.com');
const TUTORIALS_DIR = path.join(projectRoot, 'tutorial');

const rawArgs = process.argv.slice(2);
const argv = new Set(rawArgs.filter((a) => a.startsWith('--')));
const fileArgs = rawArgs.filter((a) => !a.startsWith('--'));
const flagIncludeTraining = argv.has('--include-training');
const flagExcludeTraining = argv.has('--exclude-training');
const flagNoPrompt = argv.has('--no-prompt');

/** Recursively collect .js files under a folder. */
function collectJsFiles(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            // Skip common excluded directories
            if (['node_modules', '.git', '.vscode', 'tutorials'].includes(ent.name)) continue;
            collectJsFiles(full, out);
        } else if (ent.isFile() && full.endsWith('.js')) {
            // Skip this tool itself and eslint configs
            if (full.endsWith(path.join('tools', 'strictify-equality.js'))) continue;
            if (path.basename(full).startsWith('eslint.config')) continue;
            out.push(full);
        }
    }
    return out;
}

function strictifyFile(filePath) {
    const src = fs.readFileSync(filePath, 'utf8');
    let ast;
    try {
        ast = recast.parse(src, {
            parser: require('recast/parsers/esprima'),
        });
    } catch {
        console.warn(`Skipping (parse error): ${filePath}`);
        return { changed: false };
    }

    let changed = false;
    recast.types.visit(ast, {
        visitBinaryExpression(path) {
            const n = path.node;
            if (n.operator === '==' || n.operator === '!=') {
                const isNullLiteral =
                    (n.left && n.left.type === 'Literal' && n.left.value === null) ||
                    (n.right && n.right.type === 'Literal' && n.right.value === null);
                // Preserve == null / != null checks (smart equality)
                if (!isNullLiteral) {
                    n.operator = n.operator === '==' ? '===' : '!==';
                    changed = true;
                }
            }
            this.traverse(path);
        },
    });

    if (changed) {
        const output = recast.print(ast, { quote: 'single' }).code;
        fs.writeFileSync(filePath, output, 'utf8');
    }
    return { changed };
}

async function shouldIncludeTrainingInteractive() {
    // If flags explicitly provided, honor them
    if (flagIncludeTraining) return true;
    if (flagExcludeTraining) return false;

    // If no TTY or no-prompt, default to exclude
    if (!process.stdin.isTTY || flagNoPrompt) return false;

    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (q) => new Promise((res) => rl.question(q, res));
    const answer = (await question('Include training folder "screeps.com"? [y/N] '))
        .trim()
        .toLowerCase();
    rl.close();
    return answer === 'y' || answer === 'yes';
}

async function main() {
    // If specific files provided, process only those and skip prompts
    let files =
        fileArgs.length > 0
            ? fileArgs.map((f) => path.resolve(process.cwd(), f))
            : collectJsFiles(projectRoot);

    // Determine training inclusion (respect flags even when fileArgs are provided)
    const includeTraining = await shouldIncludeTrainingInteractive();

    // Always exclude tutorials
    files = files.filter((f) => !f.startsWith(TUTORIALS_DIR + path.sep));

    // Exclude training unless explicitly included
    if (!includeTraining) {
        files = files.filter((f) => !f.startsWith(TRAINING_DIR + path.sep));
    }
    let total = 0;
    let modified = 0;
    const modifiedFiles = [];
    for (const f of files) {
        total += 1;
        const res = strictifyFile(f);
        if (res.changed) {
            modified += 1;
            modifiedFiles.push(path.relative(projectRoot, f));
        }
    }
    console.log(`Processed ${total} files. Modified ${modified}.`);
    if (modifiedFiles.length > 0) {
        console.log('Files modified:');
        for (const mf of modifiedFiles) {
            console.log('- ' + mf);
        }
    }
}

main();
