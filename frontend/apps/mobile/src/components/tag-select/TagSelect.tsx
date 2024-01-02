import React, { useState } from "react";
import { TouchableHighlight, View } from "react-native";
import { Portal, Text, useTheme } from "react-native-paper";
import { TagSelectDialog } from "./TagSelectDialog";

interface Props {
    groupId: number;
    label: string;
    value: string[];
    disabled: boolean;
    onChange: (newValue: string[]) => void;
}

export const TagSelect: React.FC<Props> = ({ groupId, label, value, onChange, disabled }) => {
    const theme = useTheme();
    const [showDialog, setShowDialog] = useState(false);

    return (
        <>
            <TouchableHighlight onPress={() => setShowDialog(true)} disabled={disabled}>
                <View
                    style={{
                        borderTopRightRadius: theme.roundness,
                        borderTopLeftRadius: theme.roundness,
                        backgroundColor: theme.colors.surfaceVariant,
                        borderBottomColor: showDialog ? theme.colors.primary : theme.colors.secondary,
                        borderBottomWidth: showDialog ? 2 : 0.5,
                        marginBottom: showDialog ? 2.5 : 4,
                        padding: 10,
                        minHeight: 55,
                        paddingLeft: 16,
                    }}
                >
                    <Text
                        style={{
                            color: theme.colors.primary,
                            fontWeight: theme.fonts.labelSmall.fontWeight,
                            fontSize: theme.fonts.labelSmall.fontSize,
                        }}
                    >
                        {label}
                    </Text>
                    <View style={{ display: "flex", flexDirection: "row" }}>
                        <Text>{value.join(", ")}</Text>
                    </View>
                </View>
            </TouchableHighlight>

            <Portal>
                <TagSelectDialog
                    groupId={groupId}
                    value={value}
                    onChange={onChange}
                    title={label}
                    onHideDialog={() => setShowDialog(false)}
                    showDialog={showDialog}
                />
            </Portal>
        </>
    );
};
