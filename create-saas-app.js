#!/usr/bin/env node
/**
 * Create SaaS App CLI
 *
 * Standalone tool to create new SaaS projects from this template
 * Usage: npx create-saas-app my-app
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function execCommand(command, cwd) {
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      shell: true
    });
  } catch (error) {
    console.error(`Failed to execute: ${command}`);
    throw error;
  }
}

async function main() {
  const projectName = process.argv[2];

  if (!projectName) {
    console.error('Usage: npx create-saas-app <project-name>');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🚀  Creating your SaaS application...');
  console.log('='.repeat(60) + '\n');

  const targetDir = path.join(process.cwd(), projectName);

  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    console.error(`❌ Directory "${projectName}" already exists`);
    process.exit(1);
  }

  try {
    // Clone the template
    console.log('📦 Cloning template...');
    const templateRepo = 'https://github.com/yourusername/saas-starter.git'; // TODO: Update with your repo
    execCommand(`git clone ${templateRepo} ${projectName}`, process.cwd());

    // Remove .git folder
    console.log('🧹 Cleaning up...');
    const gitDir = path.join(targetDir, '.git');
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }

    // Install dependencies
    console.log('\n📚 Installing dependencies...');
    execCommand('npm install', targetDir);

    // Run template initialization
    console.log('\n⚙️  Running setup wizard...\n');
    execCommand('npx tsx lib/template/init.ts', targetDir);

    console.log('\n' + '='.repeat(60));
    console.log('✅  Project created successfully!');
    console.log('='.repeat(60));
    console.log(`\nNext steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm run dev`);
    console.log(`\nVisit: http://localhost:3000\n`);

  } catch (error) {
    console.error('\n❌ Failed to create project:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
