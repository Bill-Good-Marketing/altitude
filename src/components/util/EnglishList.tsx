import React from "react";

export const EnglishList = ({strs, Component, Combiner}: {
    strs: string[],
    Component?: React.FC<{ children: string, idx: number }>,
    Combiner?: React.FC<{ children: React.ReactNode }>
}) => {
    const FinalCombiner = Combiner ?? (({children}) => <span className="text-sm text-muted-foreground">{children}</span>)
    const FinalComponent = Component ?? (({children}) => <span className="font-medium">{children}</span>)

    if (strs.length === 0) return '';
    if (strs.length === 1) return <FinalComponent idx={0}>{strs[0]}</FinalComponent>;
    if (strs.length === 2) return <>
        <FinalComponent idx={0}>{strs[0]}</FinalComponent>
        <FinalCombiner> and </FinalCombiner>
        <FinalComponent idx={1}>{strs[1]}</FinalComponent>
    </>

    return strs.map((str, idx) => {
        if (idx === strs.length - 2) {
            return <React.Fragment key={idx}>
                <FinalComponent idx={idx}>{str}</FinalComponent>
                <FinalCombiner>, and </FinalCombiner>
            </React.Fragment>
        }
        return <React.Fragment key={idx}>
            <FinalComponent idx={idx}>{str}</FinalComponent>
            <FinalCombiner>{', '}</FinalCombiner>
        </React.Fragment>
    })
}