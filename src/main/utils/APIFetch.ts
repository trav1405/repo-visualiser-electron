import fs from 'fs';
import { Octokit } from '@octokit/rest';
import { log, readTree, walk, WORKDIR } from 'isomorphic-git';
import * as nodePath from 'path';
import { shouldExcludePath } from './should-exclude-path';
import { FileType } from './types';

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

  const addItemToTree = async (path = '', isFolder = true) => {
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
    author: e.commit.author.name,
    message: e.commit.message,
    sha: e.sha,
    date: e.commit.author.date,
  }));
}

export async function getSingleCommit(
  owner: string,
  repo: string,
  sha: string
) {
  const octo = getOcto();
  const { data } = await octo.rest.repos.getCommit({ owner, repo, ref: sha });

  return data.files.map((e) => e.filename);
}

export async function getLocalCommits(dir: string) {
  const gitdir = `${dir}/.git`;

  const commitsResult = await log({ fs, dir, gitdir });

  return commitsResult.map((e) => ({
    author: e.commit.author.name,
    message: e.commit.message,
    sha: e.commit.tree,
    date: e.commit.author.timestamp.toString(),
  }));
}

export async function getLocalSingleCommit(dir: string, sha: string) {
  const gitdir = `${dir}/.git`;

  const { tree } = await readTree({ fs, dir, gitdir, oid: sha });

  return tree.map((e) => e.path);
}

export async function getLocalFiles(
  rootPath = '',
  excludedPaths = [],
  excludedGlobs = []
): Promise<FileType> {
  const foldersToIgnore = ['.git', ...excludedPaths];
  const fullPathFoldersToIgnore = new Set(
    foldersToIgnore.map((d) => nodePath.join(rootPath, d))
  );

  const getFileStats = async (path = '') => {
    const stats = fs.statSync(`${path}`, undefined);
    const name = path.split('/').filter(Boolean).slice(-1)[0];
    const { size } = stats;
    const relativePath = path.slice(rootPath.length + 1);
    return {
      name,
      path: relativePath,
      size,
    };
  };
  const addItemToTree = (path = '', isFolder = true) => {
    // try {
    // console.log('Looking in ', `${path}`);

    if (isFolder) {
      const filesOrFolders = fs.readdirSync(`${path}`, undefined);
      const children = [];

      for (const fileOrFolder of filesOrFolders) {
        const fullPath = nodePath.join(path, fileOrFolder);
        if (
          !shouldExcludePath(fullPath, fullPathFoldersToIgnore, excludedGlobs)
        ) {
          const info = fs.statSync(`${fullPath}`, undefined);
          const stats = addItemToTree(fullPath, info.isDirectory());
          if (stats) {
            children.push(stats);
          }
        }
      }

      const stats = getFileStats(path);
      return { ...stats, children };
    }

    if (shouldExcludePath(path, fullPathFoldersToIgnore, excludedGlobs)) {
      return null;
    }
    const stats = getFileStats(path);
    return stats;
  };

  const tree = await addItemToTree(rootPath);

  return tree;
}
