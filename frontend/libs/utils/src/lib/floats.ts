export const parseAbrechnungFloat = (value: string): number => {
    let delocalized;
    if (value.includes(",")) {
        delocalized = value.replace(",", ".");
    } else {
        delocalized = value;
    }
    return parseFloat(delocalized);
};
