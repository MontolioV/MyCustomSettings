export interface TargetProjectsData {
  privateProjectDirNames: string[];
}

export interface PrivateProject {
  name: string;
  pathFromRoot: string;
  version: VersionI;
  dependencies: PrivateProject[];
  upgraded: boolean;
  currentDepVersions: Record<string, VersionI>;
  packageJson: any;
}

export interface VersionI {
  major: number;
  minor: number;
  patch: number;

  incrementPatch(): this;
  toString(): string;
  isEqual(otherVersion: VersionI): boolean;
}
