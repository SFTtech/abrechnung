import { Portal, Text, useTheme } from "react-native-paper";
import TransactionShareDialog from "./TransactionShareDialog";
import { useEffect, useState } from "react";
import { TouchableHighlight, View } from "react-native";
import { useRecoilValue } from "recoil";
import { accountState } from "../../core/accounts";
import { TransactionShare } from "@abrechnung/types";

type Props = {
    groupID: number,
    title: string,
    multiSelect: boolean,
    enableAdvanced: boolean,
    value: TransactionShare,
    onChange: (newValue: TransactionShare) => void,
    disabled: boolean,
    excludedAccounts?: number[]
}

export default function TransactionShareInput({
                                                  groupID,
                                                  title,
                                                  multiSelect,
                                                  enableAdvanced,
                                                  value,
                                                  onChange,
                                                  disabled,
    excludedAccounts = [],
                                              }: Props) {
    const [showDialog, setShowDialog] = useState(false);
    const [stringifiedValue, setStringifiedValue] = useState("");
    const theme = useTheme();
    const accounts = useRecoilValue(accountState(groupID));

    useEffect(() => {
        const s = accounts
            .filter(acc => value.hasOwnProperty(acc.id) && value[acc.id] > 0)
            .map(acc => acc.name)
            .join(", ");
        setStringifiedValue(s);
    }, [accounts, value]);

    return (
        <>
            <TouchableHighlight onPress={() => setShowDialog(true)}>
                <View style={{
                    borderTopRightRadius: theme.roundness,
                    borderTopLeftRadius: theme.roundness,
                    backgroundColor: disabled ? theme.colors.background : theme.colors.surfaceVariant,
                    borderBottomColor: showDialog ? theme.colors.primary : theme.colors.secondary,
                    borderBottomWidth: showDialog ? 2 : 0.5,
                    marginBottom: showDialog ? 2.5 : 4,
                    padding: 10,
                    minHeight: 55,
                    paddingLeft: 16,
                }}>
                    <Text
                        style={{
                            color: theme.colors.primary,
                            fontWeight: theme.typescale.labelSmall.fontWeight,
                            fontSize: theme.typescale.labelSmall.fontSize,
                        }}
                    >{title}</Text>
                    <Text
                        style={{ color: disabled ? theme.colors.onBackground : theme.colors.onSurface }}>{stringifiedValue}</Text>
                </View>
            </TouchableHighlight>

            <Portal>
                <TransactionShareDialog
                    disabled={disabled}
                    groupID={groupID}
                    value={value}
                    enableAdvanced={enableAdvanced}
                    multiSelect={multiSelect}
                    onChange={onChange}
                    title={title}
                    onHideDialog={() => setShowDialog(false)}
                    showDialog={showDialog}
                    excludedAccounts={excludedAccounts}
                />
            </Portal>
        </>
    );
}
