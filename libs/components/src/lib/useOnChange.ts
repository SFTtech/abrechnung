import * as React from "react";

/**
 * Runs `callback` during rendering on the first render and whenever one of `deps` changes.
 *
 * Use this instead of a `useEffect` to adjust *this component's own state* in response to changing props or other
 * state (see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
 * React re-renders immediately, so there is no intermediate paint with stale state.
 * The callback must only call state setters of the calling component.
 */
export const useOnChange = (deps: readonly unknown[], callback: () => void): void => {
    const [prevDeps, setPrevDeps] = React.useState<readonly unknown[] | null>(null);
    if (prevDeps === null || deps.some((dep, i) => !Object.is(dep, prevDeps[i]))) {
        setPrevDeps(deps);
        callback();
    }
};
