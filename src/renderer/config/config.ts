export const config: {
  rootPath?: string;
  maxDepth?: number;
  colorEncoding?: 'type' | 'number-of-changes' | 'last-change';
  excludedPathsString?: string;
  excludedGlobsString?: string;
} = {
  rootPath: '../../../Gource',
  excludedPathsString:
    'node_modules,bower_components,dist,out,build,eject,.next,.netlify,.yarn,.git,.vscode,package-lock.json,yarn.lock'
};
