import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@material-ui/core';
// import {
//   apiFetch,
//   getCommits,
//   getLocalCommits,
//   getLocalFiles,
//   getSingleCommit,
//   walkTest
// } from '../utils/APIFetch';
import type { IpcRendererEvent } from 'electron';
import { FileType } from '../utils/types';
import { Tree } from './Tree';

export const MainPage: React.FC = () => {
  /*
  const { treeData, maxDepth, colorEncoding } = useSelector(
    (state: ApplicationState) => state.tree
  );
  */
  const [local, setLocal] = React.useState<boolean>(false);
  const [repoPath, setRepoPath] = React.useState('');
  const [currentState, setCurrentState] = React.useState<'FILES' | 'CHANGES'>(
    'FILES'
  );
  const [treeData, setTreeData] = React.useState<FileType | null>(null);
  const [filesChanged, setFilesChanged] = React.useState<string[]>([]);
  const [commits, setCommits] = React.useState<
    | {
        date: string;
        sha: string;
        author: string;
        message: string;
      }[]
    | null
  >(null);
  const [repo, setRepo] = React.useState('');
  const [owner, setOwner] = React.useState('');
  const [excludedPaths, setExcludedPaths] = React.useState('');
  const [currentCommit, setCurrentCommit] = React.useState<{
    sha: string;
    files: string[];
    author: string;
    message: string;
    date: string;
  } | null>(null);

  const processMainGenerateResponse = React.useCallback(
    (_: IpcRendererEvent, dataString: string, commitDataString: string) => {
      const parsedCommitData = JSON.parse(commitDataString);
      const parsedTreeData = JSON.parse(dataString);
      setCommits(parsedCommitData);
      setTreeData(parsedTreeData);
    },
    []
  );

  const processMainGetSingleCommitResponse = React.useCallback(
    (_: IpcRendererEvent, sha: string, files: string[], author: string, message: string, date: string) => {
      setCurrentCommit({ sha, files, author, message, date });
      setFilesChanged(files);
    },
    []
  );

  React.useEffect(() => {
    const handlerMap: Record<string, (...args: any[]) => void> = {
      'main:generate:response': processMainGenerateResponse,
      'main:getSingleCommit:response': processMainGetSingleCommitResponse
    };

    // Dynamic Bind and Remove
    for (const [event, handler] of Object.entries(handlerMap)) {
      window.ipcRenderer.on(event, handler);
    }
    return () => {
      for (const [event, handler] of Object.entries(handlerMap)) {
        window.ipcRenderer.removeListener(event, handler);
      }
    }
  }, [processMainGenerateResponse, processMainGetSingleCommitResponse]);

  const handleGenerateButtonPress = React.useCallback(async () => {
    const excludedPathsArray = excludedPaths.replace(/\s/g, '').split(',');

    if (!local) {
      window.ipcRenderer.send(
        'renderer:generate',
        owner,
        repo,
        excludedPathsArray
      );
    } else {
      window.ipcRenderer.send('renderer:fetchSomeShitButLocally', repoPath);
    }
  }, [excludedPaths, local, owner, repo, repoPath]);

  const handleChangesButtonPress = React.useCallback(() => {
    if (!treeData) {
      return;
    }
    if (commits === null) {
      return;
    }
    if (currentState === 'CHANGES') {
      setCurrentState('FILES');
      setFilesChanged([]);
      setCurrentCommit(null);
    } else {
      setCurrentState('CHANGES');
    }
  }, [commits, currentState, treeData]);

  const handleChangeRepo = React.useCallback(
    (event: any) => {
      setRepo(event.target.value);
    },
    [setRepo]
  );

  const handleChangeOwner = React.useCallback(
    (event: any) => {
      setOwner(event.target.value);
    },
    [setOwner]
  );

  const handleChangeRepoPath = React.useCallback(
    (event: any) => {
      setRepoPath(event.target.value);
    },
    [setRepoPath]
  );

  const handleChangeExcludedPaths = React.useCallback((event: any) => {
    setExcludedPaths(event.target.value);
  }, []);

  const handleChangeLocal = React.useCallback(() => {
    setLocal(!local);
  }, [local]);

  const handleCommitSelected = React.useCallback(
    (sha: string, author: string, message: string, date: string) => async () => {
      window.ipcRenderer.send('renderer:getSingleCommit', owner, repo, sha, author, message, date);
    },
    [owner, repo]
  );

  const renderCommitListItem = React.useCallback(
    (value: { sha: string; author: string; message: string; date: string }) => {
      const { sha, author, message, date } = value;
      return (
        <ListItem
          key={sha}
          button
          selected={currentCommit && currentCommit.sha === sha}
          onClick={handleCommitSelected(sha, author, message, date)}
        >
          {/* <ListItemText>{`${author} - `}</ListItemText>
          <ListItemText>{message}</ListItemText> */}
          <ListItemText>
            <Typography variant="body1">
              {author}
              {' - '}
              {date}
            </Typography>
            <Typography variant="subtitle2">{message}</Typography>
          </ListItemText>
          <Divider />
        </ListItem>
      );
    },
    [handleCommitSelected, currentCommit]
  );

  return (
    <Box width="100%" height="100%">
      <Grid container>
        <Grid item xs={12}>
          {!local && (
            <>
              <TextField
                label="owner"
                value={owner}
                onChange={handleChangeOwner}
              />
              <TextField
                label="repo"
                value={repo}
                onChange={handleChangeRepo}
              />
            </>
          )}
          {local && (
            <TextField
              label="repoPath"
              value={repoPath}
              onChange={handleChangeRepoPath}
            />
          )}
          <Button onClick={handleGenerateButtonPress} variant="contained">
            Generate
          </Button>
          <Button onClick={handleChangesButtonPress} variant="contained">
            {currentState === 'FILES' ? 'Changes' : 'Files'}
          </Button>
          <Checkbox value={local} onChange={handleChangeLocal} />
          <TextField
            label="Excluded Paths"
            value={excludedPaths}
            onChange={handleChangeExcludedPaths}
          />
        </Grid>
        <Grid item xs={10}>
          <Box style={{ marginTop: '2vh' }} height="90vh">
            <Tree
              data={treeData}
              maxDepth={+9}
              colorEncoding="type"
              filesChanged={filesChanged}
            />
          </Box>
        </Grid>
        <Grid item xs={2}>
          {currentState === 'CHANGES' && (
            <Box
              height="90vh"
              className="mac-scrollbar"
              style={{ overflowY: 'auto' }}
            >
              <List>{commits.map(renderCommitListItem)}</List>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainPage;
