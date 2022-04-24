import fs from 'fs';
import * as nodePath from 'path';
import { config } from '../config/config';
import { shouldExcludePath } from './should-exclude-path';
import { FileType } from './types';

export const processDir = async (
  rootPath = '',
  excludedPaths = [],
  excludedGlobs = []
): Promise<FileType> => {
  const foldersToIgnore = ['.git', ...excludedPaths];
  const fullPathFoldersToIgnore = new Set(foldersToIgnore.map(d => nodePath.join(rootPath, d)));

  const getFileStats = async (path = '') => {
    const stats = await fs.statSync(`./${path}`);
    const name = path.split('/').filter(Boolean).slice(-1)[0];
    const { size } = stats;
    const relativePath = path.slice(rootPath.length + 1);
    return {
      name,
      path: relativePath,
      size
    };
  };
  const addItemToTree = async (path = '', isFolder = true) => {
    // try {
    console.log('Looking in ', `./${path}`);

    if (isFolder) {
      const filesOrFolders = await fs.readdirSync(`./${path}`);
      const children = [];

      for (const fileOrFolder of filesOrFolders) {
        const fullPath = nodePath.join(path, fileOrFolder);
        if (shouldExcludePath(fullPath, fullPathFoldersToIgnore, excludedGlobs)) {
          continue;
        }

        const info = fs.statSync(`./${fullPath}`);
        const stats = await addItemToTree(fullPath, info.isDirectory());
        if (stats) {
          children.push(stats);
        }
      }

      const stats = await getFileStats(path);
      return { ...stats, children };
    }

    if (shouldExcludePath(path, fullPathFoldersToIgnore, excludedGlobs)) {
      return null;
    }
    const stats = getFileStats(path);
    return stats;

    /*
    } catch (e) {
      console.log("Issue trying to read file", path, e);
      return null;
    }
    */
  };

  const tree = await addItemToTree(rootPath);

  return tree;
};

export async function updateState() {
  const rootPath = config.rootPath || ''; // Micro and minimatch do not support paths starting with ./
  const maxDepth = config.maxDepth || 9;
  const colorEncoding = config.colorEncoding || 'type';
  const excludedPathsString =
    config.excludedPathsString ||
    'node_modules,bower_components,dist,out,build,eject,.next,.netlify,.yarn,.git,.vscode,package-lock.json,yarn.lock';
  const excludedPaths = excludedPathsString.split(',').map(str => str.trim());

  // Split on semicolons instead of commas since ',' are allowed in globs, but ';' are not + are not permitted in file/folder names.
  const excludedGlobsString = config.excludedGlobsString || '';
  const excludedGlobs = excludedGlobsString.split(';');

  const data = await processDir(rootPath, excludedPaths, excludedGlobs);

  // setTreeData({treeData: data, colorEncoding, maxDepth})

  return { treeData: data, colorEncoding, maxDepth };
}
