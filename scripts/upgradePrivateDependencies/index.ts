//tsx scripts/upgradePrivateDependencies/index.ts
import * as fs from 'fs';
import * as Path from 'path';
// @ts-expect-error no types
import { isPublished } from 'is-published';
import { PrivateProject } from './types';
import { targetProjectsData } from './targetProjects.js';
import { Version } from './Version.js';
import { ShellCommandBuilder } from './ShellCommandBuilder.js';

const PROJECTS_DIR = process.argv[2];
if (!PROJECTS_DIR) {
  throw new Error(
    `Incorrect arguments, example: "tsx scripts/upgradePrivateDependencies/index.ts $PROJECTS_DIR"`,
  );
}

class UpgradeManager {
  private projectsMap = new Map<string, PrivateProject>();

  public async start() {
    console.time('Finished in');
    this.prepareProjectsInfo();
    const projects = Array.from(this.projectsMap.values());
    this.linkProjects(projects);
    await this.upgradeAllProjects(projects);
    console.timeEnd('Finished in');
  }

  public printProjectsMap() {
    const obj = Object.fromEntries(this.projectsMap.entries());
    console.log(
      JSON.stringify(
        obj,
        (key, value) => {
          if (key === 'packageOriginalDependencies') {
            return '$skipped$';
          }
          return value;
        },
        2,
      ),
    );
  }

  private prepareProjectsInfo() {
    for (const dirName of targetProjectsData.privateProjectDirNames) {
      if (this.hasProjectUncommitedChanges(dirName)) {
        throw new Error(
          `Check ${Path.join(
            PROJECTS_DIR,
            `./${dirName}`,
          )}, it has uncommited changes. Commit all changes before deploy.`,
        );
      }

      const pr = this.getPrivateProjectInfo(dirName);
      this.projectsMap.set(pr.name, pr);
    }
  }

  private hasProjectUncommitedChanges(dirName: string): boolean {
    const response = new ShellCommandBuilder(PROJECTS_DIR)
      .goToProjectDirFromRoot(dirName)
      .addCommand('git status --porcelain')
      .execSync();
    return response !== '';
  }

  private getPrivateProjectInfo(pathFromRoot: string): PrivateProject {
    Path.join(PROJECTS_DIR, `./${pathFromRoot}/package.json`);
    const packageJson = JSON.parse(
      fs.readFileSync(
        Path.join(PROJECTS_DIR, `./${pathFromRoot}/package.json`),
        'utf8',
      ),
    );

    return {
      name: packageJson.name,
      pathFromRoot,
      version: new Version(packageJson.version, packageJson.name),
      packageJson,
      dependencies: [],
      currentDepVersions: {},
      upgraded: false,
    };
  }

  private linkProjects(projects: PrivateProject[]) {
    for (const project of projects) {
      Object.keys(project.packageJson.dependencies).forEach((depName) => {
        const dep = this.projectsMap.get(depName);
        if (dep) {
          project.currentDepVersions[depName] = new Version(
            project.packageJson.dependencies[depName],
            project.name,
          );
          project.dependencies.push(dep);
        }
      });
    }
  }

  private async upgradeAllProjects(projects: PrivateProject[]) {
    for (const project of projects) {
      await this.upgradeProject(project);
    }
  }
  private async upgradeProject(project: PrivateProject): Promise<void> {
    if (project.upgraded) return;
    console.info(`\n${project.name} upgrading...`);

    const updatedDeps = new Set<PrivateProject>();
    for (const dep of project.dependencies) {
      await this.upgradeProject(dep);
      if (!project.currentDepVersions[dep.name].isEqual(dep.version)) {
        updatedDeps.add(dep);
      }
    }

    if (updatedDeps.size > 0) {
      const commitMsgs = ['Dependencies upgrade:'];
      let npmInstallStr = 'npm i  --save-exact';
      for (const updatedDep of updatedDeps) {
        npmInstallStr += ` ${updatedDep.name}@${updatedDep.version}`;
        commitMsgs.push(`${updatedDep.name} ${updatedDep.version}.`);
      }

      const commitMsg = commitMsgs.map((msg) => `-m "${msg}"`).join(' ');
      new ShellCommandBuilder(PROJECTS_DIR)
        .goToProjectDirFromRoot(project.pathFromRoot)
        .addCommand(npmInstallStr)
        .addCommand('git add .')
        .addCommand(`git commit --verify ${commitMsg}`)
        .execSync();
      console.info(
        `commit in ${project.name}, msg: \n${commitMsgs.join('\n')}\n`,
      );

      new ShellCommandBuilder(PROJECTS_DIR)
        .goToProjectDirFromRoot(project.pathFromRoot)
        .addCommand('npm version --no-commit-hooks patch')
        .execSync();
      project.version.incrementPatch();
      console.info(
        `incremented patch version ${project.name}:${project.version}`,
      );

      new ShellCommandBuilder(PROJECTS_DIR)
        .goToProjectDirFromRoot(project.pathFromRoot)
        .addCommand('git push --no-verify')
        .execSync();
    }

    if (await this.shouldPublish(project)) {
      new ShellCommandBuilder(PROJECTS_DIR)
        .goToProjectDirFromRoot(project.pathFromRoot)
        .addCommand('npm publish')
        .execSync();
      console.info(`publish ${project.name} ${project.version}`);
    }
    project.upgraded = true;
    console.info(`${project.name} done.`);
  }

  private async shouldPublish(pr: PrivateProject) {
    return new Promise((resolve, reject) => {
      isPublished({
        name: pr.name,
        version: pr.version.toString(),
      })
        .then((published: boolean) => {
          if (published) {
            resolve(false);
          } else {
            resolve(true);
          }
        })
        .catch((err: { statusCode: number }) => {
          // error connecting to registry or authentication or something like that
          if (err?.statusCode) {
            console.info(
              `${pr.name} is not found in npm, so we assume that it shouldn't be published.`,
            );
            resolve(false);
          } else {
            reject(err);
          }
        });
    });
  }
}

const upgradeManager = new UpgradeManager();
upgradeManager.start();
// upgradeManager.printProjectsMap();
