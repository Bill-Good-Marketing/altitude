import React from "react";

export function usePrevious<T>(value: T) {
    const [previous, setPrevious] = React.useState<T>(value);

    React.useEffect(() => {
        setPrevious(value);
    }, [value]);

    return previous;
}