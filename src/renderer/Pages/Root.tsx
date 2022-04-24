import React from 'react';
import { Route, Switch, useLocation } from 'react-router-dom';
import { Box, makeStyles } from '@material-ui/core';
import clsx from 'clsx';

const TREE_ROUTE = '/';
const MainPage = React.lazy(() => import('./Main.page'));

const useStyles = makeStyles({
  pageContainer: {
    height: '100vh',
    width: '100vw',
    overflow: 'hidden'
  }
});

export const Root = () => {
  const classes = useStyles();

  const { pathname } = useLocation();
  const [, currentLocation] = React.useMemo(() => pathname.split('/'), [pathname]);
  React.useEffect(() => {
    const pageTitle = currentLocation ? `${currentLocation[0].toUpperCase()}${currentLocation.slice(1)}` : '';
    document.title = `Repo-Visualiser | ${pageTitle}`;
  }, [currentLocation]);

  return (
    <Box className={clsx(classes.pageContainer, 'hidden-scroll')}>
      <React.Suspense fallback={null}>
        <Switch>
          <Route component={MainPage} path={TREE_ROUTE} exact />
        </Switch>
      </React.Suspense>
    </Box>
  );
};
