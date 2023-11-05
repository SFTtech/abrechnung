import Loading from "@/components/style/Loading";
import { MobilePaper } from "@/components/style/mobile";
import { api } from "@/core/api";
import { useQuery, useTitle } from "@/core/utils";
import { selectGroupSlice, selectTransactionSlice, useAppDispatch, useAppSelector } from "@/store";
import {
    deleteTransaction,
    discardTransactionChange,
    saveTransaction,
    selectGroupById,
    selectTransactionById,
    selectTransactionHasPositions,
    transactionEditStarted,
} from "@abrechnung/redux";
import { PositionValidator, Transaction, TransactionValidator } from "@abrechnung/types";
import { Add as AddIcon } from "@mui/icons-material";
import { Button, Divider, Grid } from "@mui/material";
import * as React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { typeToFlattenedError, z } from "zod";
import { TransactionActions } from "./TransactionActions";
import { TransactionMetadata } from "./TransactionMetadata";
import { ValidationErrors as PositionValidationErrors, TransactionPositions } from "./purchase/TransactionPositions";

interface Props {
    groupId: number;
}

const emptyErrors = { fieldErrors: {}, formErrors: [] };
const emptyPositionErrors = {};

export const TransactionDetail: React.FC<Props> = ({ groupId }) => {
    const params = useParams();
    const dispatch = useAppDispatch();
    const query = useQuery();
    const navigate = useNavigate();
    const transactionId = Number(params["id"]);

    const [showPositions, setShowPositions] = React.useState(false);
    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const transaction: Transaction | undefined = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    useTitle(`${group.name} - ${transaction?.name}`);

    const hasPositions = useAppSelector((state) =>
        selectTransactionHasPositions({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const [showProgress, setShowProgress] = React.useState(false);

    const [validationErrors, setValidationErrors] =
        React.useState<typeToFlattenedError<z.infer<typeof TransactionValidator>>>(emptyErrors);
    const [positionValidationErrors, setPositionValidationErrors] =
        React.useState<PositionValidationErrors>(emptyPositionErrors);

    React.useEffect(() => {
        setValidationErrors(emptyErrors);
        setPositionValidationErrors(emptyPositionErrors);
    }, [transaction, setValidationErrors]);

    const edit = React.useCallback(() => {
        if (!transaction.is_wip) {
            dispatch(transactionEditStarted({ groupId, transactionId }));
        }
    }, [transaction, dispatch, groupId, transactionId]);

    const abortEdit = React.useCallback(() => {
        if (!transaction.is_wip) {
            toast.error("Cannot save as there are not changes made");
            return;
        }
        setShowProgress(true);
        dispatch(discardTransactionChange({ groupId, transactionId }));
        setShowProgress(false);
        navigate(`/groups/${groupId}/`);
    }, [transaction, setShowProgress, groupId, transactionId, dispatch, navigate]);

    const confirmDeleteTransaction = React.useCallback(() => {
        setShowProgress(true);
        dispatch(deleteTransaction({ groupId, transactionId, api }))
            .unwrap()
            .then(() => {
                setShowProgress(false);
                navigate(`/groups/${groupId}/`);
            })
            .catch((err) => {
                setShowProgress(false);
                toast.error(`error while deleting transaction: ${err.toString()}`);
            });
    }, [setShowProgress, dispatch, navigate, groupId, transactionId]);

    const save = React.useCallback(() => {
        if (!transaction.is_wip) {
            toast.error("Cannot cancel editing as there are not changes made");
            return;
        }
        const validated = TransactionValidator.safeParse(transaction);
        const positionErrors = {};
        for (const position of Object.values(transaction.positions)) {
            const v = PositionValidator.safeParse(position);
            if (!v.success) {
                positionErrors[position.id] = (v as any).error.formErrors;
            }
        }
        if (!validated.success || Object.keys(positionErrors).length > 0) {
            if (!validated.success) {
                setValidationErrors((validated as any).error.formErrors);
                toast.error("Please recheck the transaction details");
            }
            if (Object.keys(positionErrors).length > 0) {
                setPositionValidationErrors(positionErrors);
                toast.error("Please recheck the purchase items");
            }
            return;
        }
        setValidationErrors(emptyErrors);
        setPositionValidationErrors(emptyPositionErrors);
        setShowProgress(true);
        dispatch(saveTransaction({ groupId, transactionId, api }))
            .unwrap()
            .then(({ oldTransactionId, transaction }) => {
                setShowProgress(false);
                if (oldTransactionId !== transaction.id) {
                    navigate(`/groups/${groupId}/transactions/${transaction.id}?no-redirect=true`, { replace: true });
                }
            })
            .catch((err) => {
                setShowProgress(false);
                toast.error(`error while saving transaction: ${err.toString()}`);
            });
    }, [transaction, setPositionValidationErrors, dispatch, setShowProgress, navigate, groupId, transactionId]);

    if (transaction === undefined) {
        if (query.get("no-redirect") === "true") {
            return <Loading />;
        } else {
            return <Navigate to="/404" />;
        }
    }

    return (
        <>
            <MobilePaper>
                <TransactionActions
                    groupId={groupId}
                    transactionId={transactionId}
                    onStartEdit={edit}
                    onCommitEdit={save}
                    onAbortEdit={abortEdit}
                    onDelete={confirmDeleteTransaction}
                    showProgress={showProgress}
                />
                <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
                <TransactionMetadata
                    groupId={groupId}
                    transactionId={transactionId}
                    validationErrors={validationErrors}
                />
            </MobilePaper>

            {transaction.type === "purchase" && !showPositions && transaction.is_wip && !hasPositions ? (
                <Grid container justifyContent="center" sx={{ marginTop: 2 }}>
                    <Button startIcon={<AddIcon />} onClick={() => setShowPositions(true)}>
                        Add Positions
                    </Button>
                </Grid>
            ) : (showPositions && transaction.is_wip) || hasPositions ? (
                <TransactionPositions
                    groupId={groupId}
                    transactionId={transactionId}
                    validationErrors={positionValidationErrors}
                />
            ) : null}
        </>
    );
};
