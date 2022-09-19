import { ActivityIndicator, List, Menu, Portal, Text, useTheme } from "react-native-paper";
import PositionDialog from "./PositionDialog";
import React, { useState } from "react";
import { createPosition, deletePosition } from "../core/database/transactions";
import { notify } from "../notifications";

export default function PositionListItem({ currency_symbol, position, editing }) {
    const theme = useTheme();
    const [showPositionDialog, setShowPositionDialog] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const openMenu = () => {
        if (editing) {
            setShowMenu(true);
        }
    };
    const closeMenu = () => setShowMenu(false);

    const onDeletePosition = () => {
        deletePosition(position).catch((err) => {
            notify({ text: `Error while deleting position: ${err.toString()}` });
        });
    };

    const onCopyPosition = () => {
        createPosition(position.transaction_id, position).catch((err) => {
            notify({ text: `Error while copying position: ${err.toString()}` });
        });
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
                                {parseFloat(position.price).toFixed(2)} {currency_symbol}
                            </Text>
                        )}
                    />
                }
            >
                <Menu.Item title="Delete" leadingIcon="delete" onPress={onDeletePosition} />
                <Menu.Item title="Copy" leadingIcon="content-copy" onPress={onCopyPosition} />
            </Menu>
            <Portal>
                <React.Suspense fallback={<ActivityIndicator animating={true} />}>
                    <PositionDialog
                        position={position}
                        editing={editing}
                        showDialog={showPositionDialog}
                        onHideDialog={() => setShowPositionDialog(false)}
                        currencySymbol={currency_symbol}
                    />
                </React.Suspense>
            </Portal>
        </>
    );
}
