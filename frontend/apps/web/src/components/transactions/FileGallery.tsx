import React, { useEffect, useState } from "react";
import { api } from "../../core/api";
import { toast } from "react-toastify";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton } from "@mui/material";
import { AddCircle, ChevronLeft, ChevronRight, Delete } from "@mui/icons-material";
import ImageUploadDialog from "./ImageUploadDialog";
import { Transition } from "react-transition-group";
import placeholderImg from "./PlaceholderImage.svg";
import { useAppSelector, selectTransactionSlice } from "../../store";
import { selectTransactionAttachments, selectTransactionIsWip } from "@abrechnung/redux";

const duration = 200;

const defaultStyle = {
    transition: `opacity ${duration}ms ease-in-out`,
    opacity: 0,
};

const transitionStyles = {
    entering: { opacity: 0, display: "none" },
    entered: { opacity: 1, display: "block" },
    exited: { opacity: 0, display: "none" },
};

interface Props {
    groupId: number;
    transactionId: number;
}

export const FileGallery: React.FC<Props> = ({ groupId, transactionId }) => {
    const attachments = useAppSelector((state) =>
        selectTransactionAttachments({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const isWip = useAppSelector((state) =>
        selectTransactionIsWip({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const [files, setFiles] = useState([]); // map of file id to object
    const [active, setActive] = useState(0);

    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [showImage, setShowImage] = useState(false);

    useEffect(() => {
        const newFileIDs = new Set(attachments.map((file) => file.id));
        const filteredFiles = files.reduce((map, file) => {
            map[file.id] = file;
            return map;
        }, {});
        for (const loadedFile of files) {
            if (!newFileIDs.has(loadedFile.id)) {
                URL.revokeObjectURL(loadedFile.objectUrl); // clean up memory
                delete filteredFiles[loadedFile.id];
            }
        }
        setFiles(Object.values(filteredFiles)); // TODO: maybe include placeholders
        setActive((oldActive) => Math.max(0, Math.min(oldActive, attachments.length - 1)));

        const newFiles = attachments.filter((file) => filteredFiles[file.id] === undefined);
        Promise.all(
            newFiles.map((newFile) => {
                return api.fetchFile(newFile.id, newFile.blobID).then((objectUrl) => {
                    return {
                        ...newFile,
                        objectUrl: objectUrl,
                    };
                });
            })
        )
            .then((newlyLoadedFiles) => {
                setFiles([...Object.values(filteredFiles), ...newlyLoadedFiles]);
            })
            .catch((err) => {
                toast.error(`Error loading file: ${err}`);
            });
    }, [attachments]); // TODO: do not add files as dependencies, we'd get an infinite loop then

    const toNextImage = () => {
        if (active < files.length - 1) {
            setActive(active + 1);
        }
    };

    const toPrevImage = () => {
        if (active > 0) {
            setActive(active - 1);
        }
    };

    const doShowImage = (img) => {
        setShowImage(true);
    };

    const deleteSelectedFile = () => {
        if (active < files.length) {
            // sanity check, should not be needed
            // TODO: implement
            api.deleteFile(files[active].id)
                .then((t) => {
                    // updateTransactionInState(t, setTransactions);
                    setShowImage(false);
                })
                .catch((err) => {
                    toast.error(`Error deleting file: ${err}`);
                });
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
                {files.length === 0 ? (
                    <img height="100%" src={placeholderImg} alt="placeholder" />
                ) : (
                    files.map((item, idx) => (
                        <Transition key={item.id} in={active === idx} timeout={duration}>
                            {(state) => (
                                <img
                                    height="100%"
                                    style={{
                                        ...defaultStyle,
                                        ...transitionStyles[state],
                                    }}
                                    onClick={() => doShowImage(item)}
                                    src={item.objectUrl}
                                    srcSet={item.objectUrl}
                                    alt={item.filename.split(".")[0]}
                                    loading="lazy"
                                />
                            )}
                        </Transition>
                    ))
                )}
                <Chip
                    sx={{ position: "absolute", top: "5px", right: "10px" }}
                    size="small"
                    label={`${Math.min(files.length, active + 1)} / ${files.length}`}
                />
                {active > 0 && (
                    <IconButton onClick={toPrevImage} sx={{ position: "absolute", top: "40%", left: "10px" }}>
                        <ChevronLeft />
                    </IconButton>
                )}
                {active < files.length - 1 && (
                    <IconButton onClick={toNextImage} sx={{ position: "absolute", top: "40%", right: "10px" }}>
                        <ChevronRight />
                    </IconButton>
                )}
                {isWip && (
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
                            transactionId={transactionId}
                            show={showUploadDialog}
                            onClose={() => setShowUploadDialog(false)}
                        />
                    </>
                )}
            </Grid>
            <Dialog open={showImage} onClose={() => setShowImage(false)} scroll="body">
                {active < files.length && <DialogTitle>{files[active].filename.split(".")[0]}</DialogTitle>}

                <DialogContent>
                    <Grid
                        container
                        justifyContent="center"
                        alignItems="center"
                        style={{
                            position: "relative",
                        }}
                    >
                        {active < files.length && (
                            <img
                                height="100%"
                                width="100%"
                                src={files[active]?.objectUrl}
                                srcSet={files[active]?.objectUrl}
                                alt={files[active]?.filename}
                                loading="lazy"
                            />
                        )}
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
                        {active < files.length - 1 && (
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
                {isWip && (
                    <DialogActions>
                        <Button startIcon={<Delete />} onClick={deleteSelectedFile} variant="outlined" color="error">
                            Delete
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
        </>
    );
};

export default FileGallery;
