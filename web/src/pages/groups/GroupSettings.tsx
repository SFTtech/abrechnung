import React, { useState } from "react";
import EditableField from "../../components/style/EditableField";

import { toast } from "react-toastify";
import { leaveGroup, updateGroupMetadata } from "../../api";
import { currUserPermissions } from "../../state/groups";
import { useRecoilValue } from "recoil";
import { useHistory } from "react-router-dom";
import {
    Alert,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    Grid,
} from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../utils";

export default function GroupSettings({ group }) {
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const history = useHistory();

    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    useTitle(`${group.name} - Settings`);

    // TODO: actually make the editing part work
    const updateGroup = ({
        name = null,
        description = null,
        currencySymbol = null,
        terms = null,
        addUserAccountOnJoin = null,
    }) => {
        updateGroupMetadata({
            groupID: group.id,
            name: name ? name : group.name,
            description: description ? description : group.description,
            currencySymbol: currencySymbol ? currencySymbol : group.currency_symbol,
            terms: terms ? terms : group.terms,
            addUserAccountOnJoin: addUserAccountOnJoin != null ? addUserAccountOnJoin : group.add_user_account_on_join,
        }).catch((err) => {
            toast.error(err);
        });
    };

    const confirmLeaveGroup = () => {
        leaveGroup({ groupID: group.id })
            .then((res) => {
                history.push("/");
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    return (
        <MobilePaper>
            {userPermissions.is_owner ? (
                <Alert severity="info">You are an owner of this group</Alert>
            ) : !userPermissions.can_write ? (
                <Alert severity="info">You only have read access to this group</Alert>
            ) : null}

            <EditableField
                label="Name"
                margin="normal"
                variant="standard"
                value={group.name}
                canEdit={userPermissions.can_write}
                onChange={(name) => updateGroup({ name: name })}
            />

            <EditableField
                label="Description"
                margin="normal"
                variant="standard"
                value={group.description}
                canEdit={userPermissions.can_write}
                onChange={(description) => updateGroup({ description: description })}
            />

            <EditableField
                label="Currency Symbol"
                margin="normal"
                variant="standard"
                value={group.currency_symbol}
                canEdit={userPermissions.can_write}
                onChange={(currencySymbol) => updateGroup({ currencySymbol: currencySymbol })}
            />

            <EditableField
                label="Terms"
                margin="normal"
                variant="standard"
                value={group.terms}
                canEdit={userPermissions.can_write}
                onChange={(terms) => updateGroup({ terms: terms })}
            />

            <FormControlLabel
                control={
                    <Checkbox
                        onChange={(e) => updateGroup({ addUserAccountOnJoin: e.target.checked })}
                        checked={group.add_user_account_on_join}
                    />
                }
                label="Automatically add accounts for newly joined group members"
            />

            {/*<List>*/}
            {/*    <ListItem>*/}
            {/*        <ListItemText primary="Created" secondary={group.created}/>*/}
            {/*    </ListItem>*/}
            {/*    <ListItem>*/}
            {/*        <ListItemText primary="Joined" secondary={group.joined}/>*/}
            {/*    </ListItem>*/}
            {/*</List>*/}

            <Grid container justifyContent="center" style={{ marginTop: 20 }}>
                <Button variant="contained" onClick={() => setShowLeaveModal(true)}>
                    Leave Group
                </Button>
            </Grid>

            <Dialog open={showLeaveModal} onClose={() => setShowLeaveModal(false)}>
                <DialogTitle>Leave Group</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <span>
                            Are you sure you want to leave the group {group.name}. If you are the last member to leave
                            this group it will be deleted and its transaction will be lost forever...
                        </span>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button color="secondary" onClick={confirmLeaveGroup}>
                        Yes pls
                    </Button>
                    <Button color="primary" onClick={() => setShowLeaveModal(false)}>
                        No
                    </Button>
                </DialogActions>
            </Dialog>
        </MobilePaper>
    );
}
