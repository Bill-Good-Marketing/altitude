'use client';
import * as React from 'react';

interface InfiniteScrollProps {
    /** If isLoading is true, infinite scroll will stop calling next() function to avoid duplicate calls. */
    isLoading: boolean;
    /** If hasMore is false, infinite scroll will stop calling next() function. */
    hasMore: boolean;
    /** next Function to call when the user scrolls to the bottom of the children element. */
    next: () => any;
    /**
     * The threshold is the number of pixels from the bottom of the element where the next function will be called.
     *
     * The range of threshold is 0 ~ 1, and the default value is 1.
     *
     * Since InfiniteScroll is implemented with IntersectionObserver, you can find more on <a href='https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API'>MDN</a>.
     */
    threshold?: number;

    /**
     * This property will be used as the viewport for checking visibility of the last or the first item. Must be the ancestor of the item. Defaults to the browser viewport.
     *
     * Since InfiniteScroll is implemented with IntersectionObserver, you can find more on <a href='https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API'>MDN</a>.
     */
    root?: Element | Document | null;

    /**
     * The rootMargin is the margin around the root. You can use any valid CSS unit like px, em, rem, %, etc.
     *
     * Since InfiniteScroll is implemented with IntersectionObserver, you can find more on <a href='https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API'>MDN</a>.
     */
    rootMargin?: string;

    /**
     * Set this property to true means that InfiniteScroll will call next when the first item shows up in the viewport. This property is usually used to implement the chatbox behavior.
     *
     * If your next function prepend the new data to the previous data, the first item will always show up on the top. This will cause InfiniteScroll continuously call next. Make sure write some code to prevent this circumstance.
     */
    reverse?: boolean;

    /**
     * This property is that user will see according to the threshold position and call next on the viewpoint.
     */
    children?: React.ReactNode;
}

export default function InfiniteScroll({
                                           isLoading,
                                           hasMore,
                                           next,
                                           threshold = 1,
                                           root = null,
                                           rootMargin = '0px',
                                           reverse,
                                           children,
                                       }: InfiniteScrollProps) {
    'use no memo';
    const observer = React.useRef<IntersectionObserver>();
    // This callback ref will be called when it is dispatched to an element or detached from an element,
    // or when the callback function changes.
    const observerRef = React.useCallback(
        (element: HTMLElement | null) => {
            let safeThreshold = threshold;
            if (threshold < 0 || threshold > 1) {
                console.warn(
                    'threshold should be between 0 and 1. You are exceed the range. will use default value: 1',
                );
                safeThreshold = 1;
            }

            // When isLoading is true, this callback will do nothing.
            // It means that the next function will never be called.
            // It is safe because the intersection observer has disconnected the previous element.
            if (isLoading) return;

            if (observer.current) observer.current.disconnect();
            if (!element) return;

            // Create a new IntersectionObserver instance because hasMore or next may be changed.
            observer.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting && hasMore) {
                        next();
                    }
                },
                {threshold: safeThreshold, root, rootMargin},
            );
            observer.current.observe(element);
        },
        [threshold, isLoading, root, rootMargin, hasMore, next],
    );

    const flattenChildren = React.useMemo(() => React.Children.toArray(children), [children]);

    return (
        <>
            {flattenChildren.map((child, index) => {
                if (!React.isValidElement(child)) {
                    process.env.NODE_ENV === 'development' &&
                    console.warn('You should use a valid element with InfiniteScroll');
                    return child;
                }

                const isObserveTarget = reverse ? index === 0 : index === flattenChildren.length - 1;
                const ref = isObserveTarget ? observerRef : null;
                // @ts-expect-error ignore ref type
                return React.cloneElement(child, {ref});
            })}
        </>
    );
}
