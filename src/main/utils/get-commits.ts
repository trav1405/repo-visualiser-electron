import fs from 'fs';
import { log, readTree } from 'isomorphic-git';

export async function _getCommits(rootPath: string) {
  const dir = rootPath;
  const gitdir = rootPath + '/.git';
  const commitsResult = await log({ fs, dir, gitdir });
  const commitData = [];

  for (const { commit } of commitsResult) {
    const { message, author, tree: commitTree } = commit;
    const { tree: treeResult } = await readTree({ fs, dir, gitdir, oid: commitTree });
    const newEntry = { message, author: author.name, filesChanged: treeResult.map(e => e.path) };
    commitData.push(newEntry);
  }

  return commitData;
}
