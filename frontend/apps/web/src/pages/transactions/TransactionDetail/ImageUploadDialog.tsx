import { NewFile } from "@abrechnung/api";
import { wipFileAdded } from "@abrechnung/redux";
import { toBase64 } from "@abrechnung/utils";
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
import imageCompression from "browser-image-compression";
import React, { useState } from "react";
import { useAppDispatch } from "@/store";
import placeholderImg from "./PlaceholderImage.svg";
import { useTranslation } from "react-i18next";

interface Props {
    groupId: number;
    transactionId: number;
    show: boolean;
    onClose: () => void;
}

const MAX_FILESIZE_MB = 1;

export const ImageUploadDialog: React.FC<Props> = ({ groupId, transactionId, show, onClose }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [selectedFile, setSelectedFile] = useState<NewFile | undefined>(undefined);
    const [compressionProgress, setCompressionProgress] = useState<number | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);

    const compressImage = async (file: File): Promise<File | undefined> => {
        setCompressionProgress(0);
        const options = {
            maxSizeMB: MAX_FILESIZE_MB,
            useWebWorker: true,
            onProgress: setCompressionProgress,
        };

        try {
            const compressedImage = await imageCompression(file, options);
            setCompressionProgress(undefined);
            return compressedImage;
        } catch (error) {
            setCompressionProgress(undefined);
            setError(`Failed to compress image! ${(error as any).message}`);
            return undefined;
        }
    };

    const selectFile: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        const strippedFilename = file.name.split(".")[0];
        const renamedFile = new File([file], strippedFilename, { type: file.type });
        const compressedFile = await compressImage(renamedFile);
        if (!compressedFile) {
            return;
        }
        try {
            const imageAsBase64 = await toBase64(compressedFile);
            setSelectedFile({
                content: imageAsBase64,
                filename: compressedFile.name,
                mime_type: compressedFile.type,
            });
        } catch (e) {
            setError(`Error during image upload: ${(e as any).message}`);
            setSelectedFile(undefined);
        }
    };

    const onFilenameChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        if (event.target.value == null) {
            return;
        }
        setSelectedFile((prev) => {
            if (!prev) {
                return prev;
            }

            return { ...prev, filename: event.target.value };
        });
    };

    const upload = () => {
        if (!selectedFile) {
            return;
        }
        dispatch(wipFileAdded({ groupId, transactionId, file: selectedFile }));
        onClose();
        setError(undefined);
        setSelectedFile(undefined);
        setCompressionProgress(undefined);
    };

    return (
        <Dialog open={show} onClose={onClose} scroll="body">
            <DialogTitle>{t("images.uploadImage")}</DialogTitle>
            <DialogContent>
                <Box sx={{ padding: 1 }}>
                    {selectedFile ? (
                        <img width="100%" src={selectedFile.content} alt="" />
                    ) : (
                        <img width="100%" src={placeholderImg} alt="placeholder" />
                    )}
                </Box>
                {compressionProgress !== undefined && (
                    <>
                        <Box display="flex" alignItems="center">
                            <Box width="100%" mr={1}>
                                <LinearProgress variant="determinate" value={compressionProgress} />
                            </Box>
                            <Box minWidth={35}>
                                <Typography
                                    variant="body2"
                                    color="textSecondary"
                                >{`${compressionProgress}%`}</Typography>
                            </Box>
                        </Box>
                        <Alert severity="info">{t("images.compressing")}</Alert>
                    </>
                )}

                {selectedFile && (
                    <TextField
                        name="filename"
                        label={t("images.filename")}
                        fullWidth
                        variant="standard"
                        value={selectedFile.filename}
                        onChange={onFilenameChange}
                    />
                )}

                {error && <Alert severity="error">{error}</Alert>}
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
                    <Button component="span">{t("images.chooseImage")}</Button>
                </label>

                <Button color="primary" component="span" onClick={upload}>
                    {t("common.add")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
