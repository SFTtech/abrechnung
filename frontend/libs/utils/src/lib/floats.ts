export const parseAbrechnungFloat = (value: string): number => {
    if (!isNaN(parseFloat(value))) {
        return parseFloat(value);
    }

    let delocalized;
    if (value.includes(",")) {
        delocalized = value.replace(",", ".");
    } else {
        delocalized = value;
    }
    return parseFloat(delocalized);
};
