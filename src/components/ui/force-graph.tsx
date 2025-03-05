import dynamic from "next/dynamic";

export const ForceGraph2D = dynamic(() => {
    'use no memo';
    return import('react-force-graph-2d')
}, {ssr: false});