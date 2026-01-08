import { api } from "@/core/api";
import { useAppDispatch, useAppSelector } from "@/store";
import { selectTransactionFiles, wipFileDeleted } from "@abrechnung/redux";
import { FileAttachment, Transaction } from "@abrechnung/types";
import { Delete } from "@mui/icons-material";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    ImageList,
    ImageListItem,
    ImageListItemBar,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

type Attachment = {
    meta: FileAttachment;
    objectUrl?: string;
};

const useAttachments = ({ groupId, transaction }: { groupId: number; transaction: Transaction }) => {
    const storeAttachments = useAppSelector((state) => selectTransactionFiles(state, groupId, transaction.id));
    // map of file id to blob object url
    const [attachments, setAttachments] = useState<Attachment[]>([]);

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
    }, [storeAttachments]);

    return attachments;
};

export interface FileGalleryProps {
    groupId: number;
    transaction: Transaction;
}

export const FileGallery: React.FC<FileGalleryProps> = ({ groupId, transaction }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [shownImage, setShownImage] = useState<Attachment | null>(null);

    const attachments = useAttachments({
        groupId,
        transaction,
    });

    const deleteFile = (attachment: Attachment) => {
        dispatch(wipFileDeleted({ groupId, transactionId: transaction.id, fileId: attachment.meta.id }));
        setShownImage(null);
    };

    return (
        <>
            <ImageList sx={{ padding: 1 }} cols={3} rowHeight={150} gap={4}>
                {attachments.map((attachment) => (
                    <ImageListItem key={attachment.meta.id}>
                        {attachment.meta.type === "new" ? (
                            <img
                                style={{ cursor: "pointer" }}
                                onClick={() => setShownImage(attachment)}
                                src={attachment.meta.content}
                                alt={attachment.meta.filename.split(".")[0]}
                                loading="lazy"
                            />
                        ) : (
                            <img
                                style={{ cursor: "pointer" }}
                                onClick={() => setShownImage(attachment)}
                                src={attachment.objectUrl}
                                srcSet={attachment.objectUrl}
                                alt={attachment.meta.filename.split(".")[0]}
                                loading="lazy"
                            />
                        )}
                        <ImageListItemBar
                            title={attachment.meta.filename}
                            sx={{
                                background:
                                    "linear-gradient(to top, rgba(0,0,0,0.7) 0%, " +
                                    "rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)",
                            }}
                        />
                    </ImageListItem>
                ))}
            </ImageList>
            <Dialog open={shownImage != null} onClose={() => setShownImage(null)} scroll="body">
                {shownImage && <DialogTitle>{shownImage.meta.filename.split(".")[0]}</DialogTitle>}

                <DialogContent>
                    <Grid
                        container
                        justifyContent="center"
                        alignItems="center"
                        style={{
                            position: "relative",
                        }}
                    >
                        {shownImage &&
                            (shownImage.meta.type === "new" ? (
                                <img
                                    height="100%"
                                    width="100%"
                                    src={shownImage.meta.content}
                                    alt={shownImage.meta.filename}
                                    loading="lazy"
                                />
                            ) : (
                                <img
                                    height="100%"
                                    width="100%"
                                    src={shownImage.objectUrl}
                                    srcSet={shownImage.objectUrl}
                                    alt={shownImage.meta.filename}
                                    loading="lazy"
                                />
                            ))}
                    </Grid>
                </DialogContent>
                {transaction.is_wip && (
                    <DialogActions>
                        <Button
                            startIcon={<Delete />}
                            onClick={() => shownImage && deleteFile(shownImage)}
                            variant="outlined"
                            color="error"
                        >
                            {t("common.delete")}
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
        </>
    );
};
