import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    LinearProgress,
    TextField,
    Typography,
} from "@mui/material";
import imageCompression from "browser-image-compression";
import React, { useState } from "react";
import { useAppDispatch } from "../../../store";
import placeholderImg from "./PlaceholderImage.svg";

interface Props {
    groupId: number;
    transactionId: number;
    show: boolean;
    onClose: () => void;
}

export const ImageUploadDialog: React.FC<Props> = ({ groupId, transactionId, show, onClose }) => {
    const dispatch = useAppDispatch();
    const [fileState, setFileState] = useState({
        currentFile: undefined,
        previewImage: undefined,
        progress: 0,
        compress: true,
        message: "",
        isError: false,
    });
    const [filename, setFilename] = useState("");

    const selectFile = (event) => {
        const file: File = event.target.files[0];
        const strippedFilename = event.target.files[0].name.split(".")[0];
        const renamedFile = new File([file], strippedFilename, { type: file.type });
        setFileState({
            ...fileState,
            currentFile: renamedFile,
            previewImage: URL.createObjectURL(renamedFile),
            progress: 0,
            message: "",
        });
        console.log("checked: ", fileState.compress);
        setFilename(strippedFilename);
    };

    const onFilenameChange = (event) => {
        if (event.target.value != null) {
            setFilename(event.target.value);
        } else {
            setFilename("");
        }
    };

    const dispatchUpload = (file) => {
        // dispatch(uploadFile({ groupId, transactionId, file: file, api }))
        //     .unwrap()
        //     .then((t) => {
        //         setFileState({
        //             currentFile: undefined,
        //             previewImage: undefined,
        //             progress: 0,
        //             compress: fileState.compress,
        //             message: "",
        //             isError: false,
        //         });
        //         onClose();
        //     })
        //     .catch((err) => {
        //         console.log("error on uploading file", err);
        //         setFileState({
        //             ...fileState,
        //             progress: 0,
        //             message: `Could not upload the image! ${err.message}`,
        //             currentFile: undefined,
        //             isError: true,
        //         });
        //     });
    };

    const updateCompressionProgress = (progress) => {
        setFileState({
            ...fileState,
            progress: progress,
            message: `compressing...`,
            isError: false,
        });
    };

    const upload = () => {
        setFileState({
            ...fileState,
            progress: 0,
        });

        const properlyNamedFile = new File([fileState.currentFile], filename, { type: fileState.currentFile.type });

        if (fileState.compress) {
            const options = {
                maxSizeMB: 1,
                useWebWorker: true,
                onProgress: updateCompressionProgress,
            };

            imageCompression(properlyNamedFile, options)
                .then(function (compressedFile) {
                    console.log("compressedFile instanceof Blob", compressedFile instanceof Blob); // true
                    console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB
                    setFileState({
                        ...fileState,
                        progress: 0,
                        message: `uploading...`,
                        isError: false,
                    });

                    dispatchUpload(compressedFile); // write your own logic
                })
                .catch(function (error) {
                    console.log(error.message);
                    setFileState({
                        ...fileState,
                        progress: 0,
                        message: `Failed to compress! ${error.message}`,
                        isError: true,
                    });
                    return;
                });
        } else {
            dispatchUpload(properlyNamedFile);
        }
    };

    const toggleCompress = () => {
        setFileState({
            ...fileState,
            compress: !fileState.compress,
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
                {!fileState.isError && fileState.message && <Alert severity="info">{fileState.message}</Alert>}
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

                <FormControlLabel
                    control={<Checkbox checked={fileState.compress} onChange={toggleCompress} />}
                    label="compress"
                />
                <Button color="primary" component="span" disabled={!fileState.currentFile} onClick={upload}>
                    Upload
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ImageUploadDialog;
