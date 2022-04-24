import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@material-ui/core';
import type { IpcRendererEvent } from 'electron';
import { FileType } from '../utils/types';
import { Tree } from './Tree';
import Pagination from '@material-ui/lab/Pagination';

const pageSize = 30;
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

export const MainPage: React.FC = () => {
  /*
  const { treeData, maxDepth, colorEncoding } = useSelector(
    (state: ApplicationState) => state.tree
  );
  */
  const [commitFilesLoading, setCommitFilesLoading] = React.useState(false);
  const [commitPageLoading, setCommitPageLoading] = React.useState(false);
  const [pageCount, setPageCount] = React.useState(1); 
  const [page, setPage] = React.useState(1); 
  const [local, setLocal] = React.useState<boolean>(false);
  const [repoPath, setRepoPath] = React.useState('');
  const [currentState, setCurrentState] = React.useState<'FILES' | 'CHANGES'>(
    'FILES'
  );
  const [treeData, setTreeData] = React.useState<FileType | null>(null);
  const [filesChanged, setFilesChanged] = React.useState<ICommitInformation['filesChanges']>([]);
  const [commits, setCommits] = React.useState<
    | ICommitInformation[]
    | null
  >(null);
  const [repo, setRepo] = React.useState('');
  const [owner, setOwner] = React.useState('');
  const [sigEventAmount, setSigEventAmount] = React.useState(9);
  const [maxDepth, setMaxDepth] = React.useState(9);
  const [excludedPaths, setExcludedPaths] = React.useState('');
  const [selectedCommitKey, setSelectedCommitKey] = React.useState<string | null>(null);
  const [currentCommit, setCurrentCommit] = React.useState<
    ICommitInformation | null>(null);

  const processMainGenerateResponse = React.useCallback(
    (_: IpcRendererEvent, dataString: string, commitDataString: string) => {
      const parsedCommitData = JSON.parse(commitDataString);
      const parsedTreeData = JSON.parse(dataString);
      setCommits(parsedCommitData);
      setTreeData(parsedTreeData);
    },
    []
  );

  const processMainGenerateLocalResponse = React.useCallback(
    (_: IpcRendererEvent, dataString: string, commitDataString: string, totalCount: number) => {
      console.log('PROCESSING - processMainGenerateLocalResponse');
      const parsedCommitData = JSON.parse(commitDataString);
      const parsedTreeData = JSON.parse(dataString);
      setPageCount(Math.ceil(totalCount / pageSize))
      setCommits(parsedCommitData);
      setTreeData(parsedTreeData);
      console.log('FINSIHED - processMainGenerateLocalResponse');
    },
    []
  );

  const processMainGetCommitsPageResponse = React.useCallback(
    (_: IpcRendererEvent, commitDataString: string) => {
      const parsedCommitData = JSON.parse(commitDataString);
      setCommits(parsedCommitData);
      setCommitPageLoading(false);
    },
    []
  );

  const processMainGetLocalFilesAtCommitResponse = React.useCallback(
    (_: IpcRendererEvent, dataString: string) => {
      const parsedTreeData = JSON.parse(dataString);
      setTreeData(parsedTreeData);
      setCommitFilesLoading(false);
    },
    []
  );

  React.useEffect(() => {
    const handlerMap: Record<string, (...args: any[]) => void> = {
      'main:generate:response': processMainGenerateResponse,
      'main:generateLocal:response': processMainGenerateLocalResponse,
      'main:getCommitsPage:response': processMainGetCommitsPageResponse,
      'main:getLocalFilesAtCommit:response': processMainGetLocalFilesAtCommitResponse
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
  }, [processMainGenerateResponse, processMainGenerateLocalResponse, processMainGetCommitsPageResponse]);

  const handleGenerateButtonPress = React.useCallback(async () => {
    const excludedPathsArray = !excludedPaths ? [] : excludedPaths.replace(/\//g, '\\').replace(/\s/g, '').split(',');
    if (!local) {
      window.ipcRenderer.send(
        'renderer:generate',
        owner,
        repo,
        excludedPathsArray
      );
    } else {
      window.ipcRenderer.send('renderer:generateLocal', repoPath, excludedPathsArray);
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
      setSelectedCommitKey(null);
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

  const handleChangeMaxdepth = React.useCallback((event: any) => {
    setMaxDepth(event.target.value);
  }, []);

  const handleChangeSigEvent = React.useCallback((event: any) => {
    setSigEventAmount(event.target.value);
  }, []);

  const handleCommitSelected = React.useCallback(
    (sha: string, author: string, message: string, date: string, filesChanges?: {path: string, type: 'DELETE' | 'CREATE' | 'MODIFY'}[], uniqueKey: string) => async () => {
      if (!filesChanges) {
        if (!local) {
          window.ipcRenderer.send('renderer:getSingleCommit', owner, repo, sha, author, message, date);
        } 
      } else {
        setCommitFilesLoading(true);
        setCurrentCommit({sha, filesChanges, author, message, date});

        const excludedPathsArray = !excludedPaths ? [] : excludedPaths.replace(/\//g, '\\').replace(/\s/g, '').split(',');
        window.ipcRenderer.send('renderer:getLocalFilesAtCommit', repoPath, excludedPathsArray, sha);

        setFilesChanged(filesChanges);
        setSelectedCommitKey(uniqueKey);
      }
    },
    [owner, repo, local, repoPath, excludedPaths]
  );

  const renderCommitListItem = React.useCallback(
    (value: { sha: string; author: string; message: string; date: string, filesChanges?: {path: string, type: 'DELETE' | 'CREATE' | 'MODIFY'}[] }, index: number) => {
      const { sha, author, message, date, filesChanges } = value;
      const isSignificant = filesChanges && filesChanges.length >= sigEventAmount;
      const noChanges = !filesChanged || filesChanges.length === 0;

      let borderColour = 'initial';
      if (isSignificant) {
        borderColour = 'orange';
      } else if (noChanges) {
        borderColour = 'blue'
      }
      const uniqueKey = `${sha}::${index}`;
      return (
        <>
        <ListItem
          key={uniqueKey}
          button
          selected={selectedCommitKey === uniqueKey}
          onClick={handleCommitSelected(sha, author, message, date, filesChanges, uniqueKey)}
          style={{borderLeft: `2px solid ${borderColour}`}}
          disabled={commitPageLoading || commitFilesLoading}
        >
          {/* <ListItemText>{`${author} - `}</ListItemText>
          <ListItemText>{message}</ListItemText> */}
          <ListItemText>
            <Typography variant="body1">
              <b>{author}</b>
            </Typography>
            <Typography variant="caption">
              {date}
            </Typography>
            <Box height="8px"></Box>
            <Typography variant="body2"><b>{message}</b></Typography>
          </ListItemText>
        </ListItem>
        <Divider />
        </>
      );
    },
    [handleCommitSelected, currentCommit, commitPageLoading, commitFilesLoading]
  );

  const handlePageSelect = React.useCallback((_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    setCommitPageLoading(true);

    const startingIndex = pageSize * value - pageSize;

    window.ipcRenderer.send('renderer:getCommitsPage', repoPath, startingIndex, pageSize);
  }, [repoPath]);

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
          <FormControlLabel control={<Checkbox value={local} onChange={handleChangeLocal}/>} label="Use Local Files" />
          <TextField
            label="Excluded Paths"
            value={excludedPaths}
            onChange={handleChangeExcludedPaths}
          />
          <TextField
            label="Max Depth"
            value={maxDepth}
            onChange={handleChangeMaxdepth}
          />
          <TextField
            label="Event Threshold"
            value={sigEventAmount}
            onChange={handleChangeSigEvent}
          />
        </Grid>
        <Grid item xs={10}>
          <Box style={{ marginTop: '2vh' }} height="90vh">
            {treeData && 
              <Tree
                data={treeData}
                maxDepth={maxDepth}
                colorEncoding="type"
                filesChanged={filesChanged}
              />
            }
          </Box>
        </Grid>
        <Grid item xs={2}>
          {currentState === 'CHANGES' && (
            <>
              <Pagination count={pageCount} page={page} onChange={handlePageSelect} siblingCount={0} disabled={commitPageLoading || commitFilesLoading}/>
              <Box
                height="90vh"
                className="mac-scrollbar"
                style={{ overflowY: 'auto' }}
              >
                <List>{commits?.map(renderCommitListItem)}</List>
              </Box>
            </>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainPage;
