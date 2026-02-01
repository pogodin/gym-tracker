#!/usr/bin/env npx tsx
import { execSync, spawn } from 'child_process';
import chalk from 'chalk';

/**
 * Maestro Multi-Agent Orchestrator
 * 
 * This script demonstrates how to spin up multiple "agents" in Maestro Cloud 
 * to test different OS versions in parallel.
 * 
 * Usage:
 *   npx tsx scripts/maestro-multi-agent.ts
 */

const CONFIGS = [
    { platform: 'ios', version: 'iOS-17-5' },
    { platform: 'ios', version: 'iOS-18-2' },
    { platform: 'android', apiLevel: '33' }, // Android 13
    { platform: 'android', apiLevel: '34' }, // Android 14
];

const APP_PATHS = {
    android: 'android/app/build/outputs/apk/debug/app-debug.apk',
    ios: 'ios/App/DerivedData/Build/Products/Debug-iphonesimulator/App.app',
};

async function runMastroCloud(config: any) {
    const isAndroid = config.platform === 'android';
    const appFile = isAndroid ? APP_PATHS.android : APP_PATHS.ios;
    const versionFlag = isAndroid ? `--android-api-level=${config.apiLevel}` : `--device-os=${config.version}`;
    const label = `${config.platform} (${config.version || 'API ' + config.apiLevel})`;

    console.log(chalk.cyan(`[Agent Export] Starting run for ${label}...`));

    const args = [
        'cloud',
        `--app-file=${appFile}`,
        versionFlag,
        '--include-tags=smoke',
        'e2e/maestro/'
    ];

    return new Promise((resolve) => {
        const maestro = spawn('maestro', args);

        maestro.stdout.on('data', (data) => {
            // Stream output but prefix with agent label
            const lines = data.toString().split('\n');
            lines.forEach((line: string) => {
                const trimmed = line.trim();
                if (trimmed) {
                    console.log(chalk.gray(`[${label}] `) + trimmed);
                    // Capture failure summaries
                    if (trimmed.includes('[Failed]') || trimmed.includes('Element not found')) {
                        console.log(chalk.red.bold(`[DIAGNOSTIC] ${label} failure detected: ${trimmed}`));
                    }
                    if (trimmed.includes('https://app.maestro.dev')) {
                        console.log(chalk.cyan.bold(`[DIAGNOSTIC] ${label} cloud link: ${trimmed}`));
                    }
                }
            });
        });

        maestro.stderr.on('data', (data) => {
            console.error(chalk.red(`[${label} Error] `) + data.toString());
        });

        maestro.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green(`\n[Agent Success] ${label} tests completed successfully.\n`));
            } else {
                console.log(chalk.red(`\n[Agent Failed] ${label} tests failed with exit code ${code}.\n`));
            }
            resolve(code);
        });
    });
}

async function main() {
    console.log(chalk.bold.blue('\n🚀 Starting Multi-Agent Maestro Cloud Parallel Run\n'));

    // Ensure builds are fresh
    console.log(chalk.yellow('Step 1: Building apps...'));
    try {
        // For this demo, we assume the user has built them already or we run build scripts
        // execSync('npm run build:e2e:android', { stdio: 'inherit' });
        console.log(chalk.gray('Assuming apps are already built via build:e2e:android/ios...'));
    } catch (err) {
        console.error(chalk.red('Build failed. Make sure your local environment is set up.'));
        process.exit(1);
    }

    console.log(chalk.yellow('\nStep 2: Spawning cloud agents...'));

    // Run all in parallel
    const agentRuns = CONFIGS.map(config => runMastroCloud(config));

    const results = await Promise.all(agentRuns);

    const failed = results.filter(r => r !== 0).length;
    console.log(chalk.bold.blue('\n--- Final Summary ---'));
    console.log(`Agents completed: ${results.length}`);
    console.log(`Succeeded: ${results.length - failed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
