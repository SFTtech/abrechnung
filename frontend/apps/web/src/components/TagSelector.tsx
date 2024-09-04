import { selectTagsInGroup } from "@abrechnung/redux";
import { Add as AddIcon } from "@mui/icons-material";
import { Box, Checkbox, Chip, ChipProps, ListItemIcon, ListItemText, MenuItem, TextFieldProps } from "@mui/material";
import * as React from "react";
import { useAppSelector } from "@/store";
import { AddNewTagDialog } from "./AddNewTagDialog";
import { DisabledTextField } from "./style/DisabledTextField";
import { useTranslation } from "react-i18next";

interface Props extends Omit<TextFieldProps, "value" | "onChange" | "disabled" | "select" | "SelectProps"> {
    groupId: number;
    editable: boolean;
    value: string[];
    onChange: (newValue: string[]) => void;
    addCreateNewOption?: boolean;
    chipProps?: Omit<ChipProps, "label" | "variant">;
}

const CREATE_TAG = "create-new-tag";

export const TagSelector: React.FC<Props> = ({
    groupId,
    editable,
    value,
    onChange,
    chipProps,
    addCreateNewOption = true,
    ...props
}) => {
    const { t } = useTranslation();
    const [addTagDialogOpen, setAddTagDialogOpen] = React.useState(false);

    const possibleTags = useAppSelector((state) => selectTagsInGroup(state, groupId));

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!editable) {
            return;
        }
        const newTags = event.target.value as unknown as string[];
        if (newTags.indexOf(CREATE_TAG) > -1) {
            openAddTagDialog();
            return;
        }

        if (JSON.stringify(newTags) !== JSON.stringify(value)) {
            onChange(newTags);
        }
    };

    const openAddTagDialog = () => setAddTagDialogOpen(true);
    const handleCloseTagDialog = () => {
        setAddTagDialogOpen(false);
    };
    const handleCreateNewTag = (newTag: string) => {
        setAddTagDialogOpen(false);
        onChange([...value, newTag]);
    };

    return (
        <>
            <DisabledTextField
                select
                variant="standard"
                value={value}
                SelectProps={{
                    multiple: true,
                    renderValue: (selected: unknown) => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {(selected as string[]).map((value) => (
                                <Chip key={value} label={value} variant="outlined" {...chipProps} />
                            ))}
                        </Box>
                    ),
                }}
                onChange={handleChange}
                disabled={!editable}
                {...props}
            >
                {possibleTags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                        <Checkbox checked={value.indexOf(tag) > -1} />
                        <ListItemText primary={tag} />
                    </MenuItem>
                ))}
                {addCreateNewOption && (
                    <MenuItem value={CREATE_TAG}>
                        <ListItemIcon>
                            <AddIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText>{t("common.addNewTag")}</ListItemText>
                    </MenuItem>
                )}
            </DisabledTextField>
            {addCreateNewOption && (
                <AddNewTagDialog open={addTagDialogOpen} onClose={handleCloseTagDialog} onCreate={handleCreateNewTag} />
            )}
        </>
    );
};
