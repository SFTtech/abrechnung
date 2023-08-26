import {
    deleteTransaction,
    discardTransactionChange,
    saveTransaction,
    selectGroupById,
    selectTransactionById,
    selectTransactionHasPositions,
    selectTransactionPositions,
    transactionEditStarted,
} from "@abrechnung/redux";
import { PositionValidator, TransactionValidator } from "@abrechnung/types";
import { Add as AddIcon } from "@mui/icons-material";
import { Button, Divider, Grid } from "@mui/material";
import * as React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { typeToFlattenedError, z } from "zod";
import Loading from "../../../components/style/Loading";
import { MobilePaper } from "../../../components/style/mobile";
import { api } from "../../../core/api";
import { useQuery, useTitle } from "../../../core/utils";
import { selectGroupSlice, selectTransactionSlice, useAppDispatch, useAppSelector } from "../../../store";
import { TransactionPositions, ValidationErrors as PositionValidationErrors } from "./purchase/TransactionPositions";
import { TransactionActions } from "./TransactionActions";
import { TransactionMetadata } from "./TransactionMetadata";

interface Props {
    groupId: number;
}

const emptyErrors = { fieldErrors: {}, formErrors: [] };
const emptyPositionErrors = {};

export const TransactionDetail: React.FC<Props> = ({ groupId }) => {
    const params = useParams();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const transactionId = Number(params["id"]);

    const [showPositions, setShowPositions] = React.useState(false);
    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const hasPositions = useAppSelector((state) =>
        selectTransactionHasPositions({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const positions = useAppSelector((state) =>
        selectTransactionPositions({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const query = useQuery();

    const [showProgress, setShowProgress] = React.useState(false);

    const [validationErrors, setValidationErrors] =
        React.useState<typeToFlattenedError<z.infer<typeof TransactionValidator>>>(emptyErrors);
    const [positionValidationErrors, setPositionValidationErrors] =
        React.useState<PositionValidationErrors>(emptyPositionErrors);

    useTitle(`${group.name} - ${transaction?.name}`);

    React.useEffect(() => {
        setValidationErrors(emptyErrors);
        setPositionValidationErrors(emptyPositionErrors);
    }, [transaction, setValidationErrors]);

    const edit = React.useCallback(() => {
        if (!transaction.isWip) {
            dispatch(transactionEditStarted({ groupId, transactionId }));
        }
    }, [transaction, dispatch, groupId, transactionId]);

    const abortEdit = React.useCallback(() => {
        if (!transaction.isWip) {
            toast.error("Cannot save as there are not changes made");
            return;
        }
        setShowProgress(true);
        dispatch(discardTransactionChange({ groupId, transactionId, api }))
            .unwrap()
            .then(({ deletedTransaction }) => {
                setShowProgress(false);
                if (deletedTransaction) {
                    navigate(`/groups/${groupId}/`);
                }
            })
            .catch((err) => {
                setShowProgress(false);
                toast.error(`error while cancelling edit: ${err.toString()}`);
            });
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
        if (!transaction.isWip) {
            toast.error("Cannot cancel editing as there are not changes made");
            return;
        }
        const validated = TransactionValidator.safeParse(transaction);
        const positionErrors = {};
        for (const position of positions) {
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
            .then(({ oldTransactionId, transactionContainer }) => {
                setShowProgress(false);
                if (oldTransactionId !== transactionContainer.transaction.id) {
                    navigate(
                        `/groups/${groupId}/transactions/${transactionContainer.transaction.id}?no-redirect=true`,
                        { replace: true }
                    );
                }
            })
            .catch((err) => {
                setShowProgress(false);
                toast.error(`error while saving transaction: ${err.toString()}`);
            });
    }, [
        transaction,
        positions,
        setPositionValidationErrors,
        dispatch,
        setShowProgress,
        navigate,
        groupId,
        transactionId,
    ]);

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
                <TransactionMetadata groupId={groupId} transaction={transaction} validationErrors={validationErrors} />
            </MobilePaper>

            {transaction.type === "purchase" && !showPositions && transaction.isWip && !hasPositions ? (
                <Grid container justifyContent="center" sx={{ marginTop: 2 }}>
                    <Button startIcon={<AddIcon />} onClick={() => setShowPositions(true)}>
                        Add Positions
                    </Button>
                </Grid>
            ) : (showPositions && transaction.isWip) || hasPositions ? (
                <TransactionPositions
                    groupId={groupId}
                    transactionId={transactionId}
                    validationErrors={positionValidationErrors}
                />
            ) : null}
        </>
    );
};
