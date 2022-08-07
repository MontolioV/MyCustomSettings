import { VersionI } from './types';

export class Version implements VersionI {
  public major: number;
  public minor: number;
  public patch: number;

  constructor(versionStr: string, prName: string) {
    const versionTokens = versionStr.split('.').map((v) => +v);
    versionTokens.forEach((token: unknown) => {
      if (typeof token !== 'number' || isNaN(token)) {
        throw new Error(`Invalid version "${versionStr}" in ${prName}`);
      }
    });

    this.major = versionTokens[0];
    this.minor = versionTokens[1];
    this.patch = versionTokens[2];
  }

  public incrementPatch(): this {
    this.patch++;
    return this;
  }
  public toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
  public isEqual(otherVersion: VersionI): boolean {
    return (
      this.patch === otherVersion.patch &&
      this.minor === otherVersion.minor &&
      this.major === otherVersion.major
    );
  }
}
