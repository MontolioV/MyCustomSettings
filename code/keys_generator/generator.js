// node code/keys_generator/generator.js
import { execSync } from 'child_process';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';

const { email, keys, absPathForKeysDir, winscpPath } = config;

if (!fs.existsSync(absPathForKeysDir)) {
  fs.mkdirSync(absPathForKeysDir, { recursive: true });
}

const date = new Date();
const formattedDate = date.toISOString().split('T')[0].replace(/-/g, '.');

keys.forEach((keyName) => {
  try {
    const fileName = path.join(absPathForKeysDir, keyName);
    const pubFileName = `${fileName}.pub`;
    const ppkFileName = `${fileName}.ppk`;
    const comment = `${email}_${keyName}_${formattedDate}`;

    // Clean up existing files to prevent prompts
    [fileName, pubFileName, ppkFileName].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });

    console.log(`\n--- [1/2] GENERATING: ${keyName} ---`);
    execSync(`ssh-keygen -t ecdsa -b 521 -f "${fileName}" -C "${comment}"`, {
      stdio: 'inherit',
    });

    console.log(`--- [2/2] CONVERTING: ${keyName}.ppk ---`);
    // Note: WinSCP will prompt for the passphrase you just typed
    execSync(`${winscpPath} /keygen "${fileName}" /output="${ppkFileName}"`, {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error(
      `❌ Failed ${keyName}: ${
        error && error.message ? error.message : 'Process interrupted.'
      }`,
    );
    if (error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
});

// Final Step: Print all .pub keys
console.log('\n' + '='.repeat(50));
console.log('PUBLIC KEYS (COPY FOR AUTHORIZED_KEYS)');
console.log('='.repeat(50) + '\n');

keys.forEach((keyName) => {
  const pubPath = path.join(absPathForKeysDir, `${keyName}.pub`);
  if (fs.existsSync(pubPath)) {
    const pubKey = fs.readFileSync(pubPath, 'utf8').trim();
    console.log(`[${keyName}]`);
    console.log(`${pubKey}\n`);
  }
});

console.log('Batch generation complete.');
