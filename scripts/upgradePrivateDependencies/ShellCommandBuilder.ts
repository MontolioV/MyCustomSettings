import { execSync } from 'child_process';
import Path from 'path';

export class ShellCommandBuilder {
  private readonly rootPath: string;
  private commands: string[] = [];

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  public goToProjectDirFromRoot(pathFromRoot: string): this {
    this.commands.push(`cd ${Path.join(this.rootPath, `./${pathFromRoot}`)}`);
    return this;
  }

  public goToRootDir(): this {
    this.commands.push(`cd ${this.rootPath}`);
    return this;
  }

  public addCommand(command: string): this {
    this.commands.push(command);
    return this;
  }

  public execSync(log = true): string {
    const fullCommand = this.getFullCommand();
    const result = execSync(fullCommand, { encoding: 'utf8' });
    if (log) {
      console.info(fullCommand);
      console.info(result);
    }
    return result;
  }

  public print(): void {
    console.log(this.getFullCommand());
  }

  private getFullCommand(): string {
    return this.commands.join(' && ');
  }
}
