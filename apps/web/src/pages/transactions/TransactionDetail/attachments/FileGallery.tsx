import { Loading } from "@abrechnung/components";
import { api } from "@/core/api";
import { useAppDispatch, useAppSelector } from "@/store";
import { FileAttachment as BackendFileAttachment, NewFile } from "@abrechnung/api";
import { selectTransactionFiles, wipFileDeleted } from "@abrechnung/redux";
import { FileAttachment, Transaction, UpdatedFileAttachment } from "@abrechnung/types";
import { AddCircle, ChevronLeft, ChevronRight, Delete } from "@mui/icons-material";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
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

type Attachment = {
    meta: FileAttachment;
    objectUrl?: string;
};

const useAttachments = ({ groupId, transaction }: { groupId: number; transaction: Transaction }) => {
    const storeAttachments = useAppSelector((state) => selectTransactionFiles(state, groupId, transaction.id));
    // map of file id to blob object url
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [active, setActive] = useState(0);

    useEffect(() => {
        const fetchAttachments = async () => {
            const atts = await Promise.all(
                storeAttachments.map(async (attachment): Promise<Attachment | null> => {
                    if (attachment.type === "new") {
                        return {
                            meta: attachment,
                        };
                    }
                    if (attachment.blob_id == null) {
                        return null;
                    }
                    const blob = await api.fetchFile(attachment.id, attachment.blob_id).then((objectUrl) => {
                        return {
                            fileId: attachment.id,
                            blobId: attachment.blob_id,
                            objectUrl,
                        };
                    });

                    return {
                        meta: attachment,
                        objectUrl: blob.objectUrl,
                    };
                })
            );
            setAttachments(atts.filter((a) => a != null));
        };

        fetchAttachments().catch((err) => {
            toast.error(`Error loading file: ${err}`);
        });

        setActive((oldActive) => Math.max(0, Math.min(oldActive, storeAttachments.length - 1)));
    }, [storeAttachments]);

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

    const activeAttachment = useMemo(() => {
        if (active >= attachments.length) {
            return null;
        }
        return attachments[active];
    }, [active, attachments]);

    return { attachments, activeAttachment, activeAttachmentIdx: active, toPrevImage, toNextImage };
};

export interface FileGalleryProps {
    groupId: number;
    transaction: Transaction;
}

export const FileGallery: React.FC<FileGalleryProps> = ({ groupId, transaction }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [showImage, setShowImage] = useState(false);

    const { attachments, activeAttachment, activeAttachmentIdx, toPrevImage, toNextImage } = useAttachments({
        groupId,
        transaction,
    });

    const doShowImage = () => {
        setShowImage(true);
    };

    const deleteSelectedFile = () => {
        if (activeAttachment) {
            console.log("deleting file", activeAttachment)
            dispatch(wipFileDeleted({ groupId, transactionId: transaction.id, fileId: activeAttachment.meta.id }));
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
                            key={item.meta.id}
                            file={item.meta}
                            isActive={idx === activeAttachmentIdx}
                            objectUrl={item.objectUrl}
                            onShowImage={doShowImage}
                        />
                    ))
                )}
                {attachments.length > 0 && (
                    <Chip
                        sx={{ position: "absolute", top: "5px", right: "10px" }}
                        size="small"
                        label={`${activeAttachmentIdx + 1} / ${attachments.length}`}
                    />
                )}
                {activeAttachmentIdx > 0 && (
                    <IconButton onClick={toPrevImage} sx={{ position: "absolute", top: "40%", left: "10px" }}>
                        <ChevronLeft />
                    </IconButton>
                )}
                {activeAttachmentIdx < attachments.length - 1 && (
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
                {activeAttachmentIdx < attachments.length && (
                    <DialogTitle>{activeAttachment?.meta.filename.split(".")[0]}</DialogTitle>
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
                        {activeAttachment &&
                            (activeAttachment.meta.type === "new" ? (
                                <img
                                    height="100%"
                                    width="100%"
                                    src={activeAttachment.meta.content}
                                    alt={activeAttachment.meta.filename}
                                    loading="lazy"
                                />
                            ) : (
                                <img
                                    height="100%"
                                    width="100%"
                                    src={activeAttachment.objectUrl}
                                    srcSet={activeAttachment.objectUrl}
                                    alt={activeAttachment.meta.filename}
                                    loading="lazy"
                                />
                            ))}
                        {activeAttachmentIdx > 0 && (
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
                        {activeAttachmentIdx < attachments.length - 1 && (
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
