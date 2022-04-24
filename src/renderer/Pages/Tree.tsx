import React, { useMemo, useRef, useState } from 'react';
import {
  extent,
  forceCollide,
  forceSimulation,
  forceX,
  forceY,
  hierarchy,
  pack,
  range,
  scaleLinear,
  scaleSqrt,
  timeFormat
} from 'd3';
import countBy from 'lodash/countBy';
import entries from 'lodash/entries';
import flatten from 'lodash/flatten';
import maxBy from 'lodash/maxBy';
import uniqBy from 'lodash/uniqBy';
// file colors are from the github/linguist repo
import fileColors from '../config/language-colors.json';
import { FileType } from '../utils/types';
import { keepBetween, keepCircleInsideCircle, truncateString } from '../utils/utils';
import { CircleText } from './CircleText';

type Props = {
  data: FileType;
  filesChanged?: {path: string, type: 'DELETE' | 'CREATE' | 'MODIFY'}[];
  maxDepth: number;
  colorEncoding: 'type' | 'number-of-changes' | 'last-change';
};
type ExtendedFileType = {
  extension?: string;
  pathWithoutExtension?: string;
  label?: string;
  color?: string;
  value?: number;
  sortOrder?: number;
} & FileType;
type ProcessedDataItem = {
  data: ExtendedFileType;
  depth: number;
  height: number;
  r: number;
  x: number;
  y: number;
  parent: ProcessedDataItem | null;
  children: Array<ProcessedDataItem>;
};
const looseFilesId = '__structure_loose_file__';
const width = 1600;
const height = 1200;
const maxChildren = 9000;
const lastCommitAccessor = d => new Date(d.commits?.[0]?.date + '0');
const numberOfCommitsAccessor = d => d?.commits?.length || 0;
export const Tree = ({ data, filesChanged = [], maxDepth = 9, colorEncoding = 'type' }: Props) => {
  const [selectedNodeId, _setSelectedNodeId] = useState(null);
  const cachedPositions = useRef<{ [key: string]: [number, number] }>({});
  const cachedOrders = useRef<{ [key: string]: string[] }>({});

  const { colorScale, colorExtent } = useMemo(() => {
    if (!data) {
      return { colorScale: () => {}, colorExtent: [0, 0] };
    }
    const flattenTree = d => (d.children ? flatten(d.children.map(flattenTree)) : d);
    const items = flattenTree(data);
    // @ts-ignore
    const flatTree =
      colorEncoding === 'last-change'
        ? items
            .map(lastCommitAccessor)
            .sort((a, b) => b - a)
            .slice(0, -8)
        : items
            .map(numberOfCommitsAccessor)
            .sort((a, b) => b - a)
            .slice(2, -2);
    const colorExtent = extent(flatTree);

    // const valueScale = scaleLog()
    //   .domain(colorExtent)
    //   .range([0, 1])
    //   .clamp(true);
    // const colorScale = scaleSequential((d) => interpolateBuPu(valueScale(d)));
    const colors = [
      '#f4f4f4',
      '#f4f4f4',
      '#f4f4f4',
      // @ts-ignore
      colorEncoding === 'last-change' ? '#C7ECEE' : '#FEEAA7',
      // @ts-ignore
      colorEncoding === 'number-of-changes' ? '#3C40C6' : '#823471'
    ];
    const colorScale = scaleLinear()
      .domain(
        range(0, colors.length).map(
          i => +colorExtent[0] + ((colorExtent[1] - colorExtent[0]) * i) / (colors.length - 1)
        )
      )
      .range(colors)
      .clamp(true);
    return { colorScale, colorExtent };
  }, [colorEncoding, data]);

  const getColor = React.useCallback(
    d => {
      if (colorEncoding === 'type') {
        const isParent = d.children;
        if (isParent) {
          const extensions = countBy(d.children, c => c.extension);
          const mainExtension = maxBy(entries(extensions), ([_k, v]) => v)?.[0];
          return fileColors[mainExtension] || '#CED6E0';
        }
        return fileColors[d.extension] || '#CED6E0';
      }
      if (colorEncoding === 'number-of-changes') {
        return colorScale(numberOfCommitsAccessor(d)) || '#f4f4f4';
      }
      if (colorEncoding === 'last-change') {
        return colorScale(lastCommitAccessor(d)) || '#f4f4f4';
      }
    },
    [colorEncoding, colorScale]
  );

  const packedData = useMemo(() => {
    if (!data) {
      return [];
    }
    const hierarchicalData = hierarchy(processChild(data, getColor, cachedOrders.current))
      .sum(d => d.value)
      .sort((a, b) => {
        if (b.data.path.startsWith('src/fonts')) {
          //   a.data.sortOrder,
          //   b.data.sortOrder,
          //   (b.data.sortOrder - a.data.sortOrder) ||
          //     (b.data.name > a.data.name ? 1 : -1),
          //   a,
          //   b,
          // );
        }
        return b.data.sortOrder - a.data.sortOrder || (b.data.name > a.data.name ? 1 : -1);
      });

    const packedTree = pack()
      // we'll reflow the tree to be more horizontal, but we want larger bubbles (.pack() sizes the bubbles to fit the space)
      .size([width, height * 1.3])
      .padding(d => {
        if (d.depth <= 0) {
          return 0;
        }
        const hasChildWithNoChildren = d.children.filter(d => !d.children?.length).length > 1;
        if (hasChildWithNoChildren) {
          return 5;
        }
        return 13;
        // const hasChildren = !!d.children?.find((d) => d?.children?.length);
        // return hasChildren ? 60 : 8;
        // return [60, 20, 12][d.depth] || 5;
      })(hierarchicalData);
    packedTree.children = reflowSiblings(packedTree.children, cachedPositions.current, maxDepth);
    const children = packedTree.descendants() as ProcessedDataItem[];

    cachedOrders.current = {};
    cachedPositions.current = {};
    const saveCachedPositionForItem = item => {
      cachedOrders.current[item.data.path] = item.data.sortOrder;
      if (item.children) {
        item.children.forEach(saveCachedPositionForItem);
      }
    };
    saveCachedPositionForItem(packedTree);
    children.forEach(d => {
      cachedPositions.current[d.data.path] = [d.x, d.y];
    });

    return children.slice(0, maxChildren);
  }, [data, getColor, maxDepth]);

  const selectedNode = selectedNodeId && packedData.find(d => d.data.path === selectedNodeId);

  const fileTypes = uniqBy(packedData.map(d => fileColors[d.data.extension] && d.data.extension))
    .sort()
    .filter(Boolean);

  const getHighlightData = React.useCallback((path: string) => {
    const fileChangeEntry = filesChanged.find(f => f.path.replace(/\\\\/g, '\\') === path);
    console.log(filesChanged);
    console.log(path);
    if (fileChangeEntry?.type === 'DELETE') {
      return { colour: '#a84032', changed: true }; // RED
    }
    if (fileChangeEntry?.type === 'CREATE') {
      return { colour: '#32a852', changed: true }; // GREEN
    }
    if (fileChangeEntry?.type === 'MODIFY') {
      return { colour: '#FCE68A', changed: true }; // ORANGE
    }
    return { colour: '#ECEAEB', changed: false };
  }, [filesChanged]);

  return (
    <svg
      width={width}
      height={height}
      style={{
        background: 'white',
        fontFamily: 'sans-serif',
        overflow: 'visible'
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) {
          return null;
        }
        if (depth > maxDepth) {
          return null;
        }
        // const isOutOfDepth = depth >= maxDepth;
        const isParent = !!children;
        const runningR = r;
        // if (depth <= 1 && !children) runningR *= 3;
        if (data.path === looseFilesId) {
          return null;
        }

        const doHighlight = !!filesChanged.length;
        const { colour, changed } = getHighlightData(data.path);
        return (
          <g
            key={data.path}
            style={{
              fill: doHighlight ? colour : data.color,
              transition: `transform ${changed ? '0.5s' : '0s'} ease-out, fill 0.1s ease-out`
              // opacity: doHighlight && !isHighlighted ? 0.6 : 1,
            }}
            transform={`translate(${x}, ${y})`}
          >
            {isParent ? (
              <circle
                r={r}
                style={{ transition: 'all 0.5s ease-out' }}
                stroke="#290819"
                strokeOpacity="0.2"
                strokeWidth="1"
                fill="white"
              />
            ) : (
              <circle
                style={{
                  filter: changed ? 'url(#glow)' : undefined,
                  transition: 'all 0.5s ease-out'
                }}
                r={runningR}
                strokeWidth={selectedNodeId === data.path ? 3 : 0}
                stroke="#374151"
              />
            )}
          </g>
        );
      })}

      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) {
          return null;
        }
        if (depth > maxDepth) {
          return null;
        }
        const isParent = !!children && depth !== maxDepth;
        if (!isParent) {
          return null;
        }
        if (data.path === looseFilesId) {
          return null;
        }
        if (r < 16 && selectedNodeId !== data.path) {
          return null;
        }
        if (data.label.length > r * 0.5) {
          return null;
        }

        const label = truncateString(data.name, r < 30 ? Math.floor(r / 2.7) + 3 : 100);

        const offsetR = r + 12 - depth * 4;
        const fontSize = 16 - depth;

        return (
          <g
            key={data.path}
            style={{ pointerEvents: 'none', transition: 'all 0.5s ease-out' }}
            transform={`translate(${x}, ${y})`}
          >
            <CircleText
              style={{ fontSize, transition: 'all 0.5s ease-out' }}
              r={Math.max(20, offsetR - 3)}
              fill="#374151"
              stroke="white"
              strokeWidth="6"
              rotate={depth * 1 - 0}
              text={label}
            />
            <CircleText
              style={{ fontSize, transition: 'all 0.5s ease-out' }}
              fill="#374151"
              rotate={depth * 1 - 0}
              r={Math.max(20, offsetR - 3)}
              text={label}
            />
          </g>
        );
      })}

      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) {
          return null;
        }
        if (depth > maxDepth) {
          return null;
        }
        const isParent = !!children;
        // if (depth <= 1 && !children) runningR *= 3;
        if (data.path === looseFilesId) {
          return null;
        }
        const doHighlight = !!filesChanged.length;
        const {changed, colour} = getHighlightData(data.path);
        if (isParent && !changed) {
          return null;
        }
        if (selectedNodeId === data.path && !changed) {
          return null;
        }
        if (!(changed || (!doHighlight && !selectedNode && r > 22))) {
          return null;
        }

        const label = changed ? data.name : truncateString(data.name, Math.floor(r / 4) + 3);

        return (
          <g
            key={data.path}
            style={{
              fill: doHighlight ? colour : data.color,
              transition: `transform ${changed ? '0.5s' : '0s'} ease-out`
            }}
            transform={`translate(${x}, ${y})`}
          >
            <text
              style={{
                pointerEvents: 'none',
                opacity: 0.9,
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.5s ease-out'
              }}
              fill="#4B5563"
              textAnchor="middle"
              dominantBaseline="middle"
              stroke="white"
              strokeWidth="3"
              strokeLinejoin="round"
            >
              {label}
            </text>
            <text
              style={{
                pointerEvents: 'none',
                opacity: 1,
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.5s ease-out'
              }}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label}
            </text>
            <text
              style={{
                pointerEvents: 'none',
                opacity: 0.9,
                fontSize: '14px',
                fontWeight: 500,
                mixBlendMode: 'color-burn',
                transition: 'all 0.5s ease-out'
              }}
              fill="#110101"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label}
            </text>
          </g>
        );
      })}

      {!filesChanged.length && colorEncoding === 'type' && <Legend fileTypes={fileTypes} />}
      {!filesChanged.length && colorEncoding !== 'type' && (
        <ColorLegend scale={colorScale} extent={colorExtent} colorEncoding={colorEncoding} />
      )}
    </svg>
  );
};

const formatD = d => (typeof d === 'number' ? d : timeFormat('%b %Y')(d));
const ColorLegend = ({ scale, extent, colorEncoding }) => {
  if (!scale || !scale.ticks) {
    return null;
  }
  const ticks = scale.ticks(10);
  return (
    <g transform={`translate(${width - 160}, ${height - 90})`}>
      <text x={50} y="-5" fontSize="10" textAnchor="middle">
        {/* @ts-ignore */}
        {colorEncoding === 'number-of-changes' ? 'Number of changes' : 'Last change date'}
      </text>
      <linearGradient id="gradient">
        {ticks.map((tick, i) => {
          const color = scale(tick);
          return <stop offset={i / (ticks.length - 1)} stopColor={color} key={i} />;
        })}
      </linearGradient>
      <rect x="0" width="100" height="13" fill="url(#gradient)" />
      {extent.map((d, i) => (
        <text key={i} x={i ? 100 : 0} y="23" fontSize="10" textAnchor={i ? 'end' : 'start'}>
          {formatD(d)}
        </text>
      ))}
    </g>
  );
};

const Legend = ({ fileTypes = [] }) => (
  <g transform={`translate(${width - 60}, ${height - fileTypes.length * 15 - 20})`}>
    {fileTypes.map((extension, i) => (
      <g key={i} transform={`translate(0, ${i * 15})`}>
        <circle r="5" fill={fileColors[extension]} />
        <text x="10" style={{ fontSize: '14px', fontWeight: 300 }} dominantBaseline="middle">
          {'.'}
          {extension}
        </text>
      </g>
    ))}
    <g
      fill="#9CA3AF"
      style={{
        fontWeight: 300,
        fontStyle: 'italic',
        fontSize: 12
      }}
    >
      {'each dot sized by file size'}
    </g>
  </g>
);

const processChild = (child: FileType, getColor, cachedOrders, i = 0): ExtendedFileType => {
  if (!child) {
    return;
  }
  const isRoot = !child.path;
  let { name } = child;
  let { path } = child;
  let children = child?.children?.map((c, i) => processChild(c, getColor, cachedOrders, i));
  if (children?.length === 1) {
    name = `${name}/${children[0].name}`;
    path = children[0].path;
    children = children[0].children;
  }
  const pathWithoutExtension = path?.split('.').slice(0, -1).join('.');
  const extension = name?.split('.').slice(-1)[0];
  const hasExtension = !!fileColors[extension];

  if (isRoot && children) {
    const looseChildren = children?.filter(d => !d.children?.length);
    children = [
      ...children?.filter(d => d.children?.length),
      {
        name: looseFilesId,
        path: looseFilesId,
        size: 0,
        children: looseChildren
      }
    ];
  }

  const extendedChild = {
    ...child,
    name,
    path,
    label: name,
    extension,
    pathWithoutExtension,

    size:
      (['woff', 'woff2', 'ttf', 'otf', 'png', 'jpg', 'svg'].includes(extension)
        ? 100
        : Math.min(15000, hasExtension ? child.size : Math.min(child.size, 9000))) + i, // stupid hack to stabilize circle order/position
    value:
      (['woff', 'woff2', 'ttf', 'otf', 'png', 'jpg', 'svg'].includes(extension)
        ? 100
        : Math.min(15000, hasExtension ? child.size : Math.min(child.size, 9000))) + i, // stupid hack to stabilize circle order/position
    color: '#fff',
    children
  } as ExtendedFileType;
  extendedChild.color = getColor(extendedChild);
  extendedChild.sortOrder = getSortOrder(extendedChild, cachedOrders, i);

  return extendedChild;
};

const reflowSiblings = (
  siblings: ProcessedDataItem[],
  cachedPositions: Record<string, [number, number]> = {},
  maxDepth: number,
  parentRadius?: number,
  parentPosition?: [number, number]
) => {
  if (!siblings) {
    return;
  }
  const items = [
    ...siblings.map(d => ({
      ...d,
      x: cachedPositions[d.data.path]?.[0] || d.x,
      y: cachedPositions[d.data.path]?.[1] || d.y,
      originalX: d.x,
      originalY: d.y
    }))
  ];
  const paddingScale = scaleSqrt().domain([maxDepth, 1]).range([3, 8]).clamp(true);
  const simulation = forceSimulation(items)
    .force('centerX', forceX(width / 2).strength(items[0].depth <= 2 ? 0.01 : 0))
    .force('centerY', forceY(height / 2).strength(items[0].depth <= 2 ? 0.01 : 0))
    .force('centerX2', forceX(parentPosition?.[0]).strength(parentPosition ? 0.3 : 0))
    .force('centerY2', forceY(parentPosition?.[1]).strength(parentPosition ? 0.8 : 0))
    .force(
      'x',
      forceX(d => cachedPositions[d.data.path]?.[0] || width / 2).strength(d =>
        cachedPositions[d.data.path]?.[1] ? 0.5 : (width / height) * 0.3
      )
    )
    .force(
      'y',
      forceY(d => cachedPositions[d.data.path]?.[1] || height / 2).strength(d =>
        cachedPositions[d.data.path]?.[0] ? 0.5 : (height / width) * 0.3
      )
    )
    .force(
      'collide',
      forceCollide(d => (d.children ? d.r + paddingScale(d.depth) : d.r + 1.6))
        .iterations(8)
        .strength(1)
    )
    .stop();

  for (let i = 0; i < 280; i++) {
    simulation.tick();
    items.forEach(d => {
      d.x = keepBetween(d.r, d.x, width - d.r);
      d.y = keepBetween(d.r, d.y, height - d.r);

      if (parentPosition && parentRadius) {
        // keep within radius
        const containedPosition = keepCircleInsideCircle(
          parentRadius,
          parentPosition,
          d.r,
          [d.x, d.y],
          !!d.children?.length
        );
        d.x = containedPosition[0];
        d.y = containedPosition[1];
      }
    });
  }
  // setTimeout(() => simulation.stop(), 100);
  const repositionChildren = (d, xDiff, yDiff) => {
    const newD = { ...d };
    newD.x += xDiff;
    newD.y += yDiff;
    if (newD.children) {
      newD.children = newD.children.map(c => repositionChildren(c, xDiff, yDiff));
    }
    return newD;
  };
  for (const item of items) {
    const itemCachedPosition = cachedPositions[item.data.path] || [item.x, item.y];
    const itemPositionDiffFromCached = [item.x - itemCachedPosition[0], item.y - itemCachedPosition[1]];

    if (item.children) {
      const repositionedCachedPositions = { ...cachedPositions };
      const itemReflowDiff = [item.x - item.originalX, item.y - item.originalY];

      item.children = item.children.map(child =>
        repositionChildren(child, itemReflowDiff[0], itemReflowDiff[1])
      );
      if (item.children.length > 4) {
        if (item.depth > maxDepth) {
          return;
        }
        item.children.forEach(child => {
          // move cached positions with the parent
          const childCachedPosition = repositionedCachedPositions[child.data.path];
          if (childCachedPosition) {
            repositionedCachedPositions[child.data.path] = [
              childCachedPosition[0] + itemPositionDiffFromCached[0],
              childCachedPosition[1] + itemPositionDiffFromCached[1]
            ];
          } else {
            // const diff = getPositionFromAngleAndDistance(100, item.r);
            repositionedCachedPositions[child.data.path] = [child.x, child.y];
          }
        });
        item.children = reflowSiblings(item.children, repositionedCachedPositions, maxDepth, item.r, [
          item.x,
          item.y
        ]);
      }
    }
  }
  return items;
};

const getSortOrder = (item: ExtendedFileType, cachedOrders, i = 0) => {
  if (cachedOrders[item.path]) {
    return cachedOrders[item.path];
  }
  if (cachedOrders[item.path?.split('/')?.slice(0, -1)?.join('/')]) {
    return -100000000;
  }
  if (item.name === 'public') {
    return -1000000;
  }
  // if (item.depth <= 1 && !item.children) {
  //   // item.value *= 0.33;
  //   return item.value  * 100;
  // }
  // if (item.depth <= 1) return -10;
  return item.value + -i;
  // return b.value - a.value;
};
