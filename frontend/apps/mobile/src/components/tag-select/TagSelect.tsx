import React, { useState } from "react";
import { Chip, Portal, Text, useTheme } from "react-native-paper";
import { TouchableHighlight, View } from "react-native";
import { TagSelectDialog } from "./TagSelectDialog";

interface Props {
    groupId: number;
    label: string;
    value: string[];
    onChange: (newValue: string[]) => void;
}

export const TagSelect: React.FC<Props> = ({ groupId, label, value, onChange }) => {
    const theme = useTheme();
    const [showDialog, setShowDialog] = useState(false);

    return (
        <>
            <TouchableHighlight onPress={() => setShowDialog(true)}>
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
                        {value.map((tag) => (
                            <Chip
                                key={tag}
                                mode="outlined"
                                compact={true}
                                style={{
                                    marginRight: 4,
                                    backgroundColor: theme.colors.backdrop,
                                    borderColor: theme.colors.primary,
                                }}
                            >
                                {tag}
                            </Chip>
                        ))}
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
