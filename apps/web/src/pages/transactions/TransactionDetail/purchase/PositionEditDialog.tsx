import { useAppDispatch, useAppSelector } from "@/store";
import { selectTransactionPositionById, wipPositionUpdated } from "@abrechnung/redux";
import { Account, PositionValidator, Transaction, TransactionShare } from "@abrechnung/types";
import {
    AppBar,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    FormHelperText,
    InputAdornment,
    Slide,
    Stack,
    Toolbar,
    Typography,
} from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { PositionValidationError } from "./types";
import { AccountSelect, ShareSelect, TextInput } from "@/components";
import { NumericInput } from "@abrechnung/components";
import { getCurrencySymbolForIdentifier } from "@abrechnung/core";
import { TransitionProps } from "@mui/material/transitions";
import { useState } from "react";
import z from "zod";

export type PositionEditDialogProps = {
    transaction: Transaction;
    open: boolean;
    onClose: () => void;
    positionId?: number;
    validationError?: PositionValidationError;
    shownAccountIds: number[];
    updateShownAccountIds: (value: number[]) => void;
};

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement<unknown>;
    },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const PositionEditDialog: React.FC<PositionEditDialogProps> = ({
    transaction,
    open,
    onClose,
    positionId,
    validationError: outerValidationError,
    shownAccountIds,
    updateShownAccountIds,
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const position = useAppSelector((state) =>
        selectTransactionPositionById(state, transaction.group_id, transaction.id, positionId)
    );
    const [localValidationError, setLocalValidationError] = useState<PositionValidationError | undefined>(
        outerValidationError
    );

    const validationError = localValidationError ?? outerValidationError;

    const [showAddAccountModal, setShowAddAccountModal] = useState(false);

    React.useEffect(() => {
        setLocalValidationError(outerValidationError);
    }, [outerValidationError]);

    const updatePositionUsage = (shares: TransactionShare) => {
        if (!position) {
            return;
        }
        dispatch(
            wipPositionUpdated({
                groupId: transaction.group_id,
                transactionId: transaction.id,
                position: { ...position, usages: shares },
            })
        );
    };

    const updatePosition = (update: { name?: string; price?: number; communist_shares?: number }) => {
        if (!position) {
            return;
        }
        dispatch(
            wipPositionUpdated({
                groupId: transaction.group_id,
                transactionId: transaction.id,
                position: { ...position, ...update },
            })
        );
    };

    const addShownAccount = (account: Account) => {
        setShowAddAccountModal(false);
        updateShownAccountIds(Array.from(new Set<number>([...shownAccountIds, account.id])));
    };

    React.useEffect(() => {
        if (!position) {
            setLocalValidationError(undefined);
        }
        const validated = PositionValidator.safeParse(position);
        if (!validated.success) {
            setLocalValidationError(z.flattenError(validated.error));
            return;
        }
        setLocalValidationError(undefined);
    }, [position, setLocalValidationError]);

    const handleClose = () => {
        const validated = PositionValidator.safeParse(position);
        if (!validated.success) {
            setLocalValidationError(z.flattenError(validated.error));
            return;
        }
        setLocalValidationError(undefined);
        onClose();
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                fullScreen={true}
                slots={{
                    transition: Transition,
                }}
            >
                <AppBar sx={{ position: "relative" }}>
                    <Toolbar>
                        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                            {t("transactions.positions.editPosition")}
                        </Typography>
                        <Button autoFocus color="inherit" onClick={handleClose}>
                            {t("common.ok")}
                        </Button>
                    </Toolbar>
                </AppBar>
                <DialogContent>
                    <Stack spacing={2}>
                        <TextInput
                            label={t("common.name")}
                            value={position?.name}
                            error={validationError && !!validationError.fieldErrors["name"]}
                            helperText={validationError && validationError.fieldErrors["name"]}
                            onChange={(value) => updatePosition({ name: value })}
                        />
                        <NumericInput
                            label={t("common.price")}
                            value={position?.price}
                            isCurrency={true}
                            error={validationError && !!validationError.fieldErrors["price"]}
                            helperText={validationError && validationError.fieldErrors["price"]}
                            onChange={(value) => updatePosition({ price: value })}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            {getCurrencySymbolForIdentifier(transaction.currency_identifier)}
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                        {validationError?.formErrors && (
                            <FormHelperText sx={{ marginLeft: 0 }} error={true}>
                                {validationError.formErrors}
                            </FormHelperText>
                        )}
                        <ShareSelect
                            groupId={transaction.group_id}
                            label={""}
                            value={position?.usages ?? {}}
                            error={validationError && !!validationError.fieldErrors["usages"]}
                            helperText={validationError && validationError.fieldErrors["usages"]}
                            onChange={updatePositionUsage}
                            splitMode={"shares"}
                            allowedSplitModes={["evenly", "shares"]}
                            currencyIdentifier={transaction.currency_identifier}
                            editable={transaction.is_wip}
                            shouldDisplayAccount={(accountId) => shownAccountIds.includes(accountId)}
                            hideShowEventsFilter
                            communistShares={position?.communist_shares ?? 0}
                            onChangeCommunistShares={(shares) => updatePosition({ communist_shares: shares })}
                        />
                        <Button onClick={() => setShowAddAccountModal(true)}>Add account</Button>
                    </Stack>
                </DialogContent>
            </Dialog>
            <Dialog open={showAddAccountModal} onClose={() => setShowAddAccountModal(false)} fullWidth>
                <DialogTitle>{t("transactions.positions.addAccount")}</DialogTitle>
                <DialogContent>
                    <AccountSelect
                        label={t("accounts.account")}
                        groupId={transaction.group_id}
                        exclude={shownAccountIds}
                        onChange={addShownAccount}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
};
