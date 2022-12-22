import { List, Menu, Portal, Text, useTheme } from "react-native-paper";
import PositionDialog from "./PositionDialog";
import React, { useState } from "react";
import { TransactionPosition } from "@abrechnung/types";
import { useAppDispatch } from "../store";
import { positionDeleted, wipPositionAdded } from "@abrechnung/redux";

interface Props {
    groupId: number;
    currencySymbol: string;
    position: TransactionPosition;
    editing: boolean;
}

export const PositionListItem: React.FC<Props> = ({ groupId, currencySymbol, position, editing }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const [showPositionDialog, setShowPositionDialog] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const openMenu = () => {
        if (editing) {
            setShowMenu(true);
        }
    };
    const closeMenu = () => setShowMenu(false);

    const onDeletePosition = () => {
        dispatch(positionDeleted({ groupId, transactionId: position.transactionID, positionId: position.id }));
    };

    const onCopyPosition = () => {
        dispatch(wipPositionAdded({ groupId, transactionId: position.transactionID, position }));
    };

    return (
        <>
            <Menu
                visible={showMenu}
                onDismiss={closeMenu}
                anchor={
                    <List.Item
                        key={position.id}
                        title={
                            position.name === "" ? (
                                <Text style={{ color: theme.colors.error }}>&lt;empty&gt;</Text>
                            ) : (
                                position.name
                            )
                        }
                        onPress={() => setShowPositionDialog(true)}
                        onLongPress={openMenu}
                        right={(props) => (
                            <Text>
                                {position.price.toFixed(2)} {currencySymbol}
                            </Text>
                        )}
                    />
                }
            >
                <Menu.Item title="Delete" leadingIcon="delete" onPress={onDeletePosition} />
                <Menu.Item title="Copy" leadingIcon="content-copy" onPress={onCopyPosition} />
            </Menu>
            <Portal>
                <PositionDialog
                    groupId={groupId}
                    position={position}
                    editing={editing}
                    showDialog={showPositionDialog}
                    onHideDialog={() => setShowPositionDialog(false)}
                    currencySymbol={currencySymbol}
                />
            </Portal>
        </>
    );
};

export default PositionListItem;
