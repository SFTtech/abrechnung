export function toISOString(date: Date | null): string | null {
    if (date == null) {
        return null;
    }
    return date.toISOString();
}

export function toISODateString(date: Date): string {
    return date.toISOString().substring(0, 10);
}

export function fromISOString(date: string): Date | null {
    const parsedDate = Date.parse(date);
    if (!isNaN(parsedDate)) {
        return new Date(parsedDate);
    }
    return null;
}

type Comparator<T> = (a: T, b: T) => number; // -1 | 0 | 1

/**
 * Allow to chain multiple comparators, each one called to break equality from the previous one.
 */
export function createComparator<T>(...comparators: Comparator<T>[]): Comparator<T> {
    return (a: T, b: T) => {
        let order = 0;
        let i = 0;

        while (!order && comparators[i]) {
            order = comparators[i++](a, b);
        }

        return order;
    };
}

type Comparable = string | number;

/**
 * Returns a comparator which use an evaluationFunc on each item for comparison
 */
export function lambdaComparator<T>(evaluationFunc: (item: T) => Comparable, reversed = false): Comparator<T> {
    return (a: T, b: T) => {
        const valA = evaluationFunc(a);
        const valB = evaluationFunc(b);
        let order = 0;

        if (valA < valB) {
            order = -1;
        } else if (valA > valB) {
            order = 1;
        }
        return reversed ? -order : order;
    };
}
