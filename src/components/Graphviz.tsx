// copy from https://github.com/DomParfitt/graphviz-react/blob/master/src/Graphviz.tsx
// to avoid vulnerabilities
import { useEffect, useMemo } from 'react';
import { graphviz, GraphvizOptions } from 'd3-graphviz';
import { graphvizSourceState } from '../rfc/state';
import { useRecoilValue } from 'recoil';

export interface IGraphvizProps {
  /**
   * A string containing a graph representation using the Graphviz DOT language.
   * @see https://graphviz.org/doc/info/lang.html
   */
  /**
   * Options to pass to the Graphviz renderer.
   */
  options?: GraphvizOptions;
  /**
   * The classname to attach to this component for styling purposes.
   */
}

const defaultOptions: GraphvizOptions = {
  fit: true,
  zoom: false,
};

let counter = 0;
// eslint-disable-next-line no-plusplus
const getId = () => `graphviz${counter++}`;

const Graphviz = ({ options = {} }: IGraphvizProps) => {
  const dot = useRecoilValue(graphvizSourceState)

  const id = useMemo(getId, []);

  useEffect(() => {
    graphviz(`#${id}`, {
      ...defaultOptions,
      ...options,
    }).renderDot(dot);
  }, [dot, options]);

  return <div className="w-full h-full" id={id} />;
};

export { Graphviz };
