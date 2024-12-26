// tsx code/pswdstore/pswdstore.ts

import { spawn } from 'node:child_process';
import { createCipheriv, createDecipheriv, randomFillSync } from 'node:crypto';
import argon2 from 'argon2';
import fs from 'fs';
import sade from 'sade';
import readline from 'node:readline';

const SALT_LENGTH = 16;
const IV_LENGTH = 16;

interface EncryptedStorage {
  salt: Buffer;
  iv: Buffer;
  encryptedEntries: Buffer;
}

interface DecryptedStorage {
  salt: Buffer;
  entries: StorageEntry[];
}

interface StorageEntry {
  name: string;
  password: string;
  comment?: string;
}

interface PasswordVerificationUnit {
  salt: Buffer;
  iv: Buffer;
  input: 'something';
  output: Buffer;
}

class PSWDStore {
  private readonly filePath = new URL('./storage', import.meta.url);
  private _storage?: DecryptedStorage;
  private passwordVerificationUnit?: PasswordVerificationUnit;

  public async loadStorage() {
    const password = await this.requestPasswordPWSH();
    this.storage = await this.prepareStorage(password);
    this.passwordVerificationUnit = await this.preparePasswordVerificationUnit(
      password,
      this.storage,
    );
  }

  public async saveStorage() {
    const password = await this.requestPasswordPWSH();
    await this.verifyPassword(password);

    const encryptedStorage = await this.encryptStorage(this.storage, password);
    const storageFile = this.storeToFileBuffer(encryptedStorage);
    this.saveEncryptedStorage(storageFile);
  }
  public async deleteStorage() {
    console.info(
      'To confirm that you want to delete the storage, enter "DELETE". All your password will be irreversibly lost.',
    );
    const confirmationString = await getUserInputInsecure();
    if (confirmationString === 'DELETE') {
      fs.unlinkSync(this.filePath);
      console.log('Storage has been deleted');
    }
  }

  public async addEntry(): Promise<void> {
    this.storage.entries.push({
      name: await getUserInputInsecure('Name: '),
      comment: await getUserInputInsecure('Comment: '),
      password: await this.requestPasswordPWSH(),
    });
  }

  public listEntries(): void {
    this.storage.entries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.name} {${entry.comment}}`);
    });
  }

  public async getPassword(): Promise<string> {
    const idx = await this.getEntryIdxFromUser();
    const { password } = this.storage.entries[idx];
    return password;
  }

  public async rmEntry(): Promise<void> {
    const idx = await this.getEntryIdxFromUser();
    const { name } = this.storage.entries[idx];

    const nameFromUser = await getUserInputInsecure(
      `Removing '${name}'. To confirm deletion, enter entry name: `,
    );
    if (nameFromUser !== name) {
      console.log('Entry name does not match');
      return;
    }

    this.storage.entries.splice(idx, 1);
    this.listEntries();
    await this.saveStorage();
  }

  private async getEntryIdxFromUser(): Promise<number> {
    this.listEntries();
    const idx = parseInt(await getUserInputInsecure('Enter entry index: ')) - 1;
    const entry = this.storage.entries[idx];
    if (!entry) throw new Error('Entry was not found');
    return idx;
  }

  private async prepareStorage(password: string): Promise<DecryptedStorage> {
    const storageFile = this.loadEncryptedStorage();
    if (!storageFile) {
      return await this.createStorage(password);
    }
    const storage = this.storeFromFileBuffer(storageFile);
    return this.decryptStorage(storage, password);
  }

  private loadEncryptedStorage(): Buffer | null {
    if (!fs.existsSync(this.filePath)) {
      return null;
    } else {
      return fs.readFileSync(this.filePath);
    }
  }
  private saveEncryptedStorage(storageFile: Buffer) {
    fs.writeFileSync(this.filePath, storageFile);
  }

  private async createStorage(password: string) {
    const keyProvider = new ArgonKeyProvider();
    const { salt } = await keyProvider.getNewKeyAndSalt(password);
    return {
      salt,
      entries: [],
    };
  }

  private storeToFileBuffer(storage: EncryptedStorage): Buffer {
    return Buffer.concat([storage.salt, storage.iv, storage.encryptedEntries]);
  }
  private storeFromFileBuffer(storageFile: Buffer): EncryptedStorage {
    return {
      salt: storageFile.subarray(0, SALT_LENGTH),
      iv: storageFile.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH),
      encryptedEntries: storageFile.subarray(SALT_LENGTH + IV_LENGTH),
    };
  }

  private async encryptStorage(
    storage: DecryptedStorage,
    password: string,
  ): Promise<EncryptedStorage> {
    const { encryptor, iv } = await this.getEncryptorWithNewIV(
      password,
      storage.salt,
    );
    const encryptedEntries = encryptor.encrypt(JSON.stringify(storage.entries));
    return {
      salt: storage.salt,
      iv,
      encryptedEntries,
    };
  }
  private async decryptStorage(
    storage: EncryptedStorage,
    password: string,
  ): Promise<DecryptedStorage> {
    const encryptor = await this.getEncryptorWithOldIV(
      password,
      storage.salt,
      storage.iv,
    );
    const decryptedEntries = encryptor.decrypt(storage.encryptedEntries);
    return {
      salt: storage.salt,
      entries: JSON.parse(decryptedEntries),
    };
  }

  private async preparePasswordVerificationUnit(
    password: string,
    storage: DecryptedStorage,
  ): Promise<PasswordVerificationUnit> {
    const { encryptor, iv } = await this.getEncryptorWithNewIV(
      password,
      storage.salt,
    );
    return {
      salt: storage.salt,
      iv,
      input: 'something',
      output: encryptor.encrypt('something'),
    };
  }

  private async verifyPassword(password: string) {
    if (!this.passwordVerificationUnit) {
      throw new Error('Password verification unit is not prepared');
    }

    const encryptor = await this.getEncryptorWithOldIV(
      password,
      this.passwordVerificationUnit.salt,
      this.passwordVerificationUnit.iv,
    );

    let decrypted: string;
    try {
      decrypted = encryptor.decrypt(this.passwordVerificationUnit.output);
    } catch (error) {
      decrypted = '';
    }
    if (decrypted !== this.passwordVerificationUnit.input) {
      throw new Error('Password is incorrect');
    }
  }

  private async getEncryptorWithNewIV(password: string, salt: Buffer) {
    const iv = randomFillSync(Buffer.alloc(IV_LENGTH));
    const keyProvider = new ArgonKeyProvider();
    const key = await keyProvider.getKeyFromOldPassword(password, salt);
    return { encryptor: new AESEncryption(key, iv), iv };
  }

  private async getEncryptorWithOldIV(
    password: string,
    salt: Buffer,
    iv: Buffer,
  ) {
    const keyProvider = new ArgonKeyProvider();
    const key = await keyProvider.getKeyFromOldPassword(password, salt);
    return new AESEncryption(key, iv);
  }

  private async requestPasswordPWSH(): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('pwsh.exe', [
        '-Command',
        'Read-Host -Prompt "password" -MaskInput',
      ]);
      child.stdout.on('data', (password) => {
        if (!(password instanceof Buffer)) {
          reject(new Error('Password is not a Buffer'));
        }
        password = password.toString('utf8').trim();
        if (!password) {
          reject(new Error('Password is empty'));
        }

        resolve(password);
      });
      child.stderr.on('data', reject);
      child.stdin.end();
    });
  }

  private get storage(): DecryptedStorage {
    if (!this._storage) {
      throw new Error('Storage is not loaded');
    }
    return this._storage;
  }

  private set storage(value: DecryptedStorage) {
    this._storage = value;
  }
}

class ArgonKeyProvider {
  private argonOptions = {
    type: argon2.argon2id,
    hashLength: 32,
    parallelism: 1,
    saltLength: SALT_LENGTH,
  };

  public async getNewKeyAndSalt(password: string) {
    const newHash = await this.hashPasswordNew(password);
    return {
      key: this.getKey(newHash),
      salt: this.getSalt(newHash),
    };
  }

  public async getKeyFromOldPassword(password: string, oldSalt: Buffer) {
    const hash = await this.hashPasswordWithOldSalt(password, oldSalt);
    return this.getKey(hash);
  }

  private async hashPasswordNew(password: string) {
    return argon2.hash(password.normalize(), this.argonOptions);
  }

  private async hashPasswordWithOldSalt(password: string, oldSalt: Buffer) {
    return argon2.hash(password.normalize(), {
      ...this.argonOptions,
      salt: oldSalt,
    });
  }

  private getSalt(hash: string) {
    const saltB64 = hash.split('$')[4];
    return Buffer.from(saltB64, 'base64');
  }

  private getKey(hash: string) {
    const keyB64 = hash.split('$')[5];
    return Buffer.from(keyB64, 'base64');
  }
}

class AESEncryption {
  private algorithm = 'aes-256-cbc';
  private key: Buffer;
  private iv: Uint8Array;

  constructor(key: Buffer, iv: Uint8Array) {
    this.key = key;
    this.iv = iv;
  }

  public encrypt(data: string): Buffer {
    const cipher = createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(Buffer.from(data), undefined, 'hex');
    encrypted += cipher.final('hex');
    return Buffer.from(encrypted, 'hex');
  }

  public decrypt(data: Buffer): string {
    const decypher = createDecipheriv(this.algorithm, this.key, this.iv);
    let decrypted = decypher.update(data, undefined, 'utf8');
    decrypted += decypher.final('utf8');
    return decrypted;
  }
}

function getUserInputInsecure(prompt?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt ?? '', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function userConfirmed(
  prompt: string,
  defaultYes = true,
): Promise<boolean> {
  let input = await getUserInputInsecure(prompt);
  input = input.trim().toLowerCase();
  if (input === 'y' || input === 'yes' || (defaultYes && input === '')) {
    return true;
  } else {
    return false;
  }
}

function toCb(str: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('pwsh.exe', ['-Command', `Set-Clipboard '${str}'`]);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

const storageManager = new PSWDStore();

const scriptRoot = 'tsx code/pswdstore/a.ts';
const prog = sade('pswdstore');

prog.describe('Secure password storage').version('1.0.0');
prog
  .command('add', 'Add new password entry')
  .option('-b, --batch', 'Add multiple entries')
  .example(`${scriptRoot} add`)
  .action(async (opts) => {
    await storageManager.loadStorage();
    if (opts.batch) {
      do {
        await storageManager.addEntry();
      } while (await userConfirmed('Add another entry? (Y/n)'));
    } else {
      await storageManager.addEntry();
    }
    storageManager.listEntries();
    await storageManager.saveStorage();
  });
prog
  .command('get', 'Get password entry')
  .example(`${scriptRoot} get`)
  .action(async (opts) => {
    await storageManager.loadStorage();
    const password = await storageManager.getPassword();
    await toCb(password);
  });
prog
  .command('rm', 'Remove entry')
  .example(`${scriptRoot} rm`)
  .action(async (opts) => {
    await storageManager.loadStorage();
    await storageManager.rmEntry();
  });
prog
  .command('DELETE', 'Removes password storage (irreversible)')
  .example(`${scriptRoot} DELETE`)
  .action(async (opts) => {
    await storageManager.deleteStorage();
  });

prog.parse(process.argv);
