export const parseAbrechnungFloat = (value: string | number): number => {
    if (typeof value === "number") {
        return value;
    }
    let delocalized;
    if (value.includes(",")) {
        delocalized = value.replace(",", ".");
    } else {
        delocalized = value;
    }
    return parseFloat(delocalized);
};
