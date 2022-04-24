import fs from 'fs';
import { Octokit } from '@octokit/rest';
import { log, ReadCommitResult, readTree, TreeEntry, currentBranch, fetch } from 'isomorphic-git';
import * as nodePath from 'path';
import { FileType } from './types';
import moment from 'moment';
import util from 'util';
import * as childProcesses from 'child_process';
const exec = util.promisify(childProcesses.exec);

function getOcto() {
  return new Octokit({
    username: 'trav1405',
    auth: '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',
    log: {
      debug: () => {},
      info: () => {},
      warn: console.warn,
      error: console.error,
    },
    request: {
      agent: undefined,
      fetch: undefined,
      timeout: 0,
    },
  });
}

export async function apiFetch(
  owner: string,
  repo: string,
  excludedPaths: string[] = []
): Promise<FileType> {
  const foldersToIgnore = ['.git', 'node_modules', ...excludedPaths];

  const octo = getOcto();

  const addItemToTree = async (path = '', isFolder = true): Promise<any> => {
    console.log(`Looking in: ${path}`);

    const { data } = await octo.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (Array.isArray(data)) {
      if (isFolder) {
        const children = [];

        for (const fileOrFolder of data) {
          if (foldersToIgnore.includes(fileOrFolder.path)) {
            continue;
          }
          let stats;
          if (fileOrFolder.type === 'dir') {
            stats = await addItemToTree(
              fileOrFolder.path,
              fileOrFolder.type === 'dir'
            );
          } else {
            const { name, path, size } = fileOrFolder;
            stats = { name, path, size };
          }
          if (stats) {
            children.push(stats);
          }
        }

        return {
          ...{
            name: path.split('/').filter(Boolean).slice(-1)[0],
            path,
            size: 0,
          },
          children,
        };
      }
    }
  };

  const tree = await addItemToTree('', true);

  return tree;
}

export async function getCommits(owner: string, repo: string) {
  const octo = getOcto();

  const { data } = await octo.rest.repos.listCommits({
    owner,
    repo,
    per_page: 30,
  });

  return data.map((e) => ({
    author: e.commit.author?.name,
    message: e.commit.message,
    sha: e.sha,
    date: e.commit.author?.date,
  }));
}

export async function getSingleCommit(
  owner: string,
  repo: string,
  sha: string
) {
  const octo = getOcto();
  const { data } = await octo.rest.repos.getCommit({ owner, repo, ref: sha });

  return data.files?.map((e) => e.filename);
}

type RecursiveTreeEntry = (TreeEntry & { children: RecursiveTreeEntry[] });
async function recursiveTreeRead(dir: string, gitdir: string, oid: string): Promise<RecursiveTreeEntry[]> {
  const files = (await readTree({fs, dir, gitdir, oid})).tree;

  return await Promise.all(files.map(async (e: TreeEntry) => {
    if (e.type !== 'tree') {
      return {...e, children: []};
    }
    return {...e, children: await recursiveTreeRead(dir, gitdir, e.oid)}
  }))
}

function recursiveTreeReduce(tree: RecursiveTreeEntry[], parentFolder?: string): { path: string; oid: string }[] {
  /*
   * Return a reduced tree based on parent folder?
   * Convert the following: { path: string }[] to { `${parentFolder}/${path}` } 
   */
  return tree.reduce((acc, e) => {
    // We must use \\ here as everything that globs files uses \\ instead of /
    const currentPath = parentFolder ? `${parentFolder}/${e.path}`.replace(/\//g, '\\') : e.path;
    if (e.children.length) {
      acc.push(...recursiveTreeReduce(e.children, currentPath));
    } else {
      acc.push({
        path: currentPath,
        oid: e.oid
      });
    }
    return acc;
  }, [] as { path: string; oid: string }[]);
}

interface ICommitInformation {
  author: string;
  message: string;
  sha: string;
  date: string;
  filesChanges: {
      path: string;
      type: 'DELETE' | 'CREATE' | 'MODIFY';
  }[];
}
export async function getLocalCommits(dir: string, startIndex: number = 0, limit: number = 30) {
  const gitdir = `${dir}/.git`;

  const allCommits = await log({ fs, dir, gitdir });

  // How to get diff with iso-git
  // -----------------------------------
  // Current Commit & Previous commit trees should return { path: string, oid: string }[].
  // for each in current, check if the oid has changed - best to convert each to a map here?
  // If in previous but not current, then it's a deleted file.
  // If in current but not previous, then it's a new file.
  // If in current AND previous, and the oid has changed, then it's a file changed
  // Else, there is no change here.
  
  const commitsToProcess = allCommits.slice(startIndex, startIndex+limit);
  let completed = 0;
  async function processCommit(currentCommit: ReadCommitResult, index: number): Promise<ICommitInformation> {
    const currentCommitTreeRecursive = await recursiveTreeRead(dir, gitdir, currentCommit.commit.tree);
    const currentCommitFiles = await recursiveTreeReduce(currentCommitTreeRecursive);

    let filesChanges: ICommitInformation['filesChanges'] = [];
    if (index === allCommits.length - 1) {
      // There is no previous commit, so all files are "new"
      filesChanges = currentCommitFiles.map(e=> ({ path: e.path, type: 'CREATE' }));
    } else {
      const previousCommitTreeRecursive = await recursiveTreeRead(dir, gitdir, allCommits[index + 1].commit.tree);
      const previousCommitFiles = await recursiveTreeReduce(previousCommitTreeRecursive);

      // File Path | File Hash
      const previousFileHashmap: Map<string, string> = new Map(previousCommitFiles.map(e=>([e.path, e.oid])));

      const deletedFiles = previousCommitFiles.filter((e) => !currentCommitFiles.some(c => c.path === e.path));
      const createdFiles = currentCommitFiles.filter((e) => !previousFileHashmap.has(e.path));
      const modifiedFiles = currentCommitFiles
        .filter(e => !createdFiles.some(c => e.path !== c.path)) // Ensure the file is not created
        .filter((e) => e.oid !== previousFileHashmap.get(e.path)); // Ensure the file has changed

        filesChanges = [
        ...deletedFiles.map(e => ({ path: e.path, type: 'DELETE' })) as ICommitInformation['filesChanges'],
        ...createdFiles.map(e => ({ path: e.path, type: 'CREATE' })) as ICommitInformation['filesChanges'],
        ...modifiedFiles.map(e => ({ path: e.path, type: 'MODIFY' })) as ICommitInformation['filesChanges'],
      ];
    }

    completed++;
    console.log(`Commits - ${completed}/${allCommits.length}`);
    const {name, timestamp} = currentCommit.commit.author;
    const {message, tree} = currentCommit.commit;
    return {author: name, message, sha: currentCommit.oid, date: moment.utc(timestamp * 1000).format('L LT'), filesChanges };
  }
  const commits = await Promise.all(commitsToProcess.map((e, realIndex: number) => processCommit(e, realIndex + startIndex)));
  return {commits, totalCount: allCommits.length};
}

export async function getLocalSingleCommit(dir: string, sha: string) {
  const gitdir = `${dir}/.git`;

  const { tree } = await readTree({ fs, dir, gitdir, oid: sha });

  return tree.map((e) => e.path);
}

export async function getLocalFilesAtCommit(rootPath: string = '', excludedPaths: string[] = [], commit?: string): Promise<FileType> {
  let previousBranch: string | null = null;
  if (commit !== undefined) {
    const branch = await currentBranch({
      fs,
      dir: rootPath,
      fullname: false
    });
    if (branch) {
      previousBranch = branch;
      await exec(`git checkout ${commit}`, { cwd: rootPath, shell: 'C:\\Program Files\\Git\\git-bash.exe' });
    }
  }
  const localFiles = await getLocalFiles(rootPath, excludedPaths);
  if (previousBranch !== null) {
    await exec(`git checkout ${previousBranch}`, { cwd: rootPath, shell: 'C:\\Program Files\\Git\\git-bash.exe' });
  }
  return localFiles;
}

export async function getLocalFiles(
  rootPath: string = '',
  excludedPaths: string[] = []
): Promise<FileType> {
  const foldersToIgnore = ['.git', 'node_modules', ...excludedPaths];

  const getFileStats = async (path = '') => {
    const stats = await fs.statSync(`${path}`, undefined);
    const name = path.split('\\').filter(Boolean).slice(-1)[0];
    const { size } = stats;
    const relativePath = path.slice(rootPath.length + 1);
    return {
      name,
      path: relativePath,
      size,
    };
  };
  const addItemToTree = async (path = '', isFolder = true): Promise<any> => {
    console.log('Looking in ', `${path}`);

    if (isFolder) {
      const filesOrFolders = await fs.readdirSync(`${path}`, undefined);
      const children = [];

      for (const fileOrFolder of filesOrFolders) {
        const fullPath = nodePath.join(path, fileOrFolder);
        if (foldersToIgnore.some(e => fullPath.toLowerCase().includes(e.toLowerCase()))) continue;
        const info = await fs.statSync(`${fullPath}`, undefined);
        const stats = await addItemToTree(fullPath, info.isDirectory());
        if (stats) {
          children.push(stats);
        }
      }

      const stats = await getFileStats(path);
      return { ...stats, children };
    }

    const stats = await getFileStats(path);
    if (foldersToIgnore.includes(stats.path)) {
      return null;
    }
    return stats;
  };

  const tree = await addItemToTree(rootPath);

  return tree;
}
