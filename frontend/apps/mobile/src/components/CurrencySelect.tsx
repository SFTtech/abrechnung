import * as React from "react";
import { List } from "react-native-paper";

interface Props {
    label: string;
    value: string;
    onChange: (newValue: string) => void;
}

export const CurrencySelect: React.FC<Props> = ({ label, value, onChange }) => {
    return <List.Item title={label} description={value} />;
};
