import { Loading } from "@abrechnung/components";
import { api } from "@/core/api";
import { useAppDispatch, useAppSelector } from "@/store";
import { FileAttachment as BackendFileAttachment, NewFile } from "@abrechnung/api";
import { selectTransactionFiles, wipFileDeleted } from "@abrechnung/redux";
import { FileAttachment, Transaction, UpdatedFileAttachment } from "@abrechnung/types";
import { AddCircle, ChevronLeft, ChevronRight, Delete } from "@mui/icons-material";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton } from "@mui/material";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Transition } from "react-transition-group";
import { ImageUploadDialog } from "./ImageUploadDialog";
import placeholderImg from "./PlaceholderImage.svg";
import { useTranslation } from "react-i18next";

const duration = 200;

const defaultStyle = {
    transition: `opacity ${duration}ms ease-in-out`,
    margin: "10px",
    opacity: 0,
};

const transitionStyles = {
    entering: { opacity: 0, display: "none" },
    entered: { opacity: 1, display: "block" },
    exited: { opacity: 0, display: "none" },
    exiting: {},
    unmounted: {},
} as const;

interface ImageDisplayProps {
    isActive: boolean;
    objectUrl?: string;
    file: FileAttachment;
    onShowImage: () => void;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ file, isActive, onShowImage, objectUrl }) => {
    if (file.type === "backend") {
        return (
            <Transition in={isActive} timeout={duration}>
                {(state) =>
                    objectUrl === undefined ? (
                        <Loading />
                    ) : (
                        <img
                            height="100%"
                            width="100%"
                            style={{
                                ...defaultStyle,
                                ...transitionStyles[state],
                            }}
                            onClick={onShowImage}
                            src={objectUrl}
                            srcSet={objectUrl}
                            alt={file.filename.split(".")[0]}
                            loading="lazy"
                        />
                    )
                }
            </Transition>
        );
    }
    if (file.type === "new") {
        return (
            <Transition in={isActive} timeout={duration}>
                {(state) => (
                    <img
                        height="100%"
                        width="100%"
                        style={{
                            ...defaultStyle,
                            ...transitionStyles[state],
                        }}
                        onClick={onShowImage}
                        src={file.content}
                        alt={file.filename.split(".")[0]}
                        loading="lazy"
                    />
                )}
            </Transition>
        );
    }

    return null;
};

export interface FileGalleryProps {
    groupId: number;
    transaction: Transaction;
}

export const FileGallery: React.FC<FileGalleryProps> = ({ groupId, transaction }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const attachments = useAppSelector((state) => selectTransactionFiles(state, groupId, transaction.id));
    // map of file id to blob object url
    const [objectUrls, setObjectUrls] = useState<Record<number, string>>({});
    const [active, setActive] = useState(0);

    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [showImage, setShowImage] = useState(false);

    useEffect(() => {
        const backendAttachments = attachments.filter((a) => a.type !== "new") as (
            | BackendFileAttachment
            | UpdatedFileAttachment
        )[];
        Promise.all(
            backendAttachments.map((attachment) => {
                if (attachment.blob_id == null) {
                    return null;
                }
                return api.fetchFile(attachment.id, attachment.blob_id).then((objectUrl) => {
                    return {
                        fileId: attachment.id,
                        blobId: attachment.blob_id,
                        objectUrl,
                    };
                });
            })
        )
            .then((loadedBlobs) => {
                const urlMap = Object.fromEntries(
                    loadedBlobs
                        .filter((objInfo) => objInfo != null)
                        .map((objInfo) => [objInfo.fileId, objInfo.objectUrl])
                );
                setObjectUrls(urlMap);
            })
            .catch((err) => {
                toast.error(`Error loading file: ${err}`);
            });

        setActive((oldActive) => Math.max(0, Math.min(oldActive, attachments.length - 1)));
    }, [attachments]);

    const toNextImage = () => {
        if (active < attachments.length - 1) {
            setActive(active + 1);
        }
    };

    const toPrevImage = () => {
        if (active > 0) {
            setActive(active - 1);
        }
    };

    const doShowImage = () => {
        setShowImage(true);
    };

    const deleteSelectedFile = () => {
        if (active < attachments.length) {
            dispatch(wipFileDeleted({ groupId, transactionId: transaction.id, fileId: attachments[active].id }));
            setShowImage(false);
        }
    };

    return (
        <>
            <Grid
                container
                justifyContent="center"
                alignItems="center"
                style={{
                    position: "relative",
                    height: "200px",
                    width: "100%",
                }}
            >
                {attachments.length === 0 ? (
                    <img height="100%" src={placeholderImg} alt="placeholder" />
                ) : (
                    attachments.map((item, idx) => (
                        <ImageDisplay
                            key={item.id}
                            file={item}
                            isActive={idx === active}
                            objectUrl={objectUrls[item.id]}
                            onShowImage={doShowImage}
                        />
                    ))
                )}
                {attachments.length > 0 && (
                    <Chip
                        sx={{ position: "absolute", top: "5px", right: "10px" }}
                        size="small"
                        label={`${active + 1} / ${attachments.length}`}
                    />
                )}
                {active > 0 && (
                    <IconButton onClick={toPrevImage} sx={{ position: "absolute", top: "40%", left: "10px" }}>
                        <ChevronLeft />
                    </IconButton>
                )}
                {active < attachments.length - 1 && (
                    <IconButton onClick={toNextImage} sx={{ position: "absolute", top: "40%", right: "10px" }}>
                        <ChevronRight />
                    </IconButton>
                )}
                {transaction.is_wip && (
                    <>
                        <IconButton
                            color="primary"
                            sx={{
                                position: "absolute",
                                top: "80%",
                                right: "10px",
                            }}
                            onClick={() => setShowUploadDialog(true)}
                        >
                            <AddCircle fontSize="large" />
                        </IconButton>
                        <ImageUploadDialog
                            groupId={groupId}
                            transactionId={transaction.id}
                            show={showUploadDialog}
                            onClose={() => setShowUploadDialog(false)}
                        />
                    </>
                )}
            </Grid>
            <Dialog open={showImage} onClose={() => setShowImage(false)} scroll="body">
                {active < attachments.length && (
                    <DialogTitle>{attachments[active]?.filename.split(".")[0]}</DialogTitle>
                )}

                <DialogContent>
                    <Grid
                        container
                        justifyContent="center"
                        alignItems="center"
                        style={{
                            position: "relative",
                        }}
                    >
                        {active < attachments.length &&
                            (attachments[active].type === "new" ? (
                                <img
                                    height="100%"
                                    width="100%"
                                    src={(attachments[active] as NewFile | undefined)?.content}
                                    alt={attachments[active]?.filename}
                                    loading="lazy"
                                />
                            ) : (
                                <img
                                    height="100%"
                                    width="100%"
                                    src={objectUrls[attachments[active].id]}
                                    srcSet={objectUrls[attachments[active].id]}
                                    alt={attachments[active]?.filename}
                                    loading="lazy"
                                />
                            ))}
                        {active > 0 && (
                            <IconButton
                                onClick={toPrevImage}
                                sx={{
                                    position: "absolute",
                                    top: "40%",
                                    left: "0px",
                                }}
                            >
                                <ChevronLeft />
                            </IconButton>
                        )}
                        {active < attachments.length - 1 && (
                            <IconButton
                                onClick={toNextImage}
                                sx={{
                                    position: "absolute",
                                    top: "40%",
                                    right: "0px",
                                }}
                            >
                                <ChevronRight />
                            </IconButton>
                        )}
                    </Grid>
                </DialogContent>
                {transaction.is_wip && (
                    <DialogActions>
                        <Button startIcon={<Delete />} onClick={deleteSelectedFile} variant="outlined" color="error">
                            {t("common.delete")}
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
        </>
    );
};
