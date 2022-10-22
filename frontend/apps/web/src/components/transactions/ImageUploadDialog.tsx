import React, { useState } from "react";
import { api } from "../../core/api";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    TextField,
    Typography,
} from "@mui/material";
import placeholderImg from "./PlaceholderImage.svg";
import { useSetRecoilState } from "recoil";
import { groupTransactions, updateTransactionInState } from "../../state/transactions";
import { Transaction } from "@abrechnung/types";

interface Props {
    transaction: Transaction;
    show: boolean;
    onClose: () => void;
}

export const ImageUploadDialog: React.FC<Props> = ({ transaction, show, onClose }) => {
    const [fileState, setFileState] = useState({
        currentFile: undefined,
        previewImage: undefined,
        progress: 0,

        message: "",
        isError: false,
    });
    const [filename, setFilename] = useState("");
    const setTransactions = useSetRecoilState(groupTransactions(transaction.groupID));

    const selectFile = (event) => {
        setFileState({
            ...fileState,
            currentFile: event.target.files[0],
            previewImage: URL.createObjectURL(event.target.files[0]),
            progress: 0,
            message: "",
        });
        setFilename(event.target.files[0].name.split(".")[0]);
    };

    const onFilenameChange = (event) => {
        if (event.target.value != null) {
            setFilename(event.target.value);
        } else {
            setFilename("");
        }
    };

    const upload = () => {
        setFileState({
            ...fileState,
            progress: 0,
        });

        api.uploadFile(
            transaction.id,
            filename,
            fileState.currentFile
            // onUploadProgress: (event) => {
            //     setFileState({
            //         ...fileState,
            //         progress: Math.round((100 * event.loaded) / event.total),
            //     });
            // },
        )
            .then((t) => {
                setFileState({
                    currentFile: undefined,
                    previewImage: undefined,
                    progress: 0,

                    message: "",
                    isError: false,
                });
                updateTransactionInState(t, setTransactions);
                onClose();
            })
            .catch((err) => {
                console.log("error on uploading file", err);
                setFileState({
                    ...fileState,
                    progress: 0,
                    message: `Could not upload the image! ${err}`,
                    currentFile: undefined,
                    isError: true,
                });
            });
    };

    return (
        <Dialog open={show} onClose={onClose} scroll="body">
            <DialogTitle>Upload Image</DialogTitle>
            <DialogContent>
                <Box sx={{ padding: 1 }}>
                    {fileState.previewImage ? (
                        <img width="100%" src={fileState.previewImage} alt="" />
                    ) : (
                        <img width="100%" src={placeholderImg} alt="placeholder" />
                    )}
                </Box>

                {fileState.currentFile && (
                    <>
                        <TextField
                            name="filename"
                            label="File Name"
                            fullWidth
                            variant="standard"
                            value={filename}
                            onChange={onFilenameChange}
                        />

                        <Box display="flex" alignItems="center">
                            <Box width="100%" mr={1}>
                                <LinearProgress variant="determinate" value={fileState.progress} />
                            </Box>
                            <Box minWidth={35}>
                                <Typography
                                    variant="body2"
                                    color="textSecondary"
                                >{`${fileState.progress}%`}</Typography>
                            </Box>
                        </Box>
                    </>
                )}

                {fileState.isError && fileState.message && <Alert severity="error">{fileState.message}</Alert>}
            </DialogContent>

            <DialogActions>
                <label htmlFor="btn-upload">
                    <input
                        id="btn-upload"
                        name="btn-upload"
                        style={{ display: "none" }}
                        type="file"
                        accept="image/*"
                        onChange={selectFile}
                    />
                    <Button component="span">Choose Image</Button>
                </label>

                <Button color="primary" component="span" disabled={!fileState.currentFile} onClick={upload}>
                    Upload
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ImageUploadDialog;
