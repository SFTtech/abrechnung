import { selectTagsInGroup } from "@abrechnung/redux";
import * as React from "react";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import {
    Button,
    HelperText,
    TextInput,
    Checkbox,
    Dialog,
    Divider,
    List,
    Searchbar,
    useTheme,
    IconButton,
} from "react-native-paper";
import { useAppSelector } from "../../store";
import { KeyboardAvoidingDialog } from "../style/KeyboardAvoidingDialog";

interface Props {
    groupId: number;
    value: string[];
    onChange: (newValue: string[]) => void;
    showDialog: boolean;
    onHideDialog: () => void;
    title: string;
}

const EMPTY_LIST: string[] = [];

export const TagSelectDialog: React.FC<Props> = ({ groupId, value, onChange, showDialog, onHideDialog, title }) => {
    const theme = useTheme();
    const usedTags = useAppSelector((state) => selectTagsInGroup(state, groupId));

    const [tags, setTags] = useState<string[]>(EMPTY_LIST);
    const [searchTerm, setSearchTerm] = useState("");
    const [newTag, setNewTag] = useState("");
    const [newTagError, setNewTagError] = useState(false);
    const [addingNew, setAddingNew] = useState(false);

    const possibleTags = Array.from(new Set([...usedTags, ...tags])).sort();

    useEffect(() => {
        setTags(value);
    }, [value, setTags]);

    const toggleTag = (tag: string) => {
        setTags((currTags) => {
            if (currTags.includes(tag)) {
                return currTags.filter((t) => t !== tag);
            } else {
                return [...currTags, tag];
            }
        });
    };

    const finishDialog = () => {
        onChange(tags);
        onHideDialog();
    };

    const handleOnAddNew = () => {
        setNewTag("");
        setAddingNew(true);
        setNewTagError(false);
    };

    const handleCancelAddNew = () => {
        setAddingNew(false);
        setNewTag("");
        setNewTagError(false);
    };

    const handleSaveNewTag = () => {
        if (newTag !== "") {
            setTags((currTags) => [...currTags, newTag]);
            setAddingNew(false);
            setNewTag("");
            setNewTagError(false);
        } else {
            setNewTagError(true);
        }
    };

    return (
        <KeyboardAvoidingDialog visible={showDialog} onDismiss={finishDialog}>
            <Dialog.Title>{title}</Dialog.Title>

            {possibleTags.length > 5 && (
                <Dialog.Content>
                    <Searchbar placeholder="Search" onChangeText={setSearchTerm} value={searchTerm} />
                </Dialog.Content>
            )}

            <Dialog.ScrollArea>
                <ScrollView>
                    {possibleTags.map((tag) => (
                        <List.Item
                            key={tag}
                            title={tag}
                            onPress={() => toggleTag(tag)}
                            right={() => <Checkbox.Android status={tags.includes(tag) ? "checked" : "unchecked"} />}
                        />
                    ))}
                    <Divider />
                    {addingNew ? (
                        <>
                            <View style={{ display: "flex", flexDirection: "row" }}>
                                <TextInput
                                    value={newTag}
                                    dense={true}
                                    style={{ flexGrow: 10, marginTop: 4, marginBottom: 4 }}
                                    onChangeText={(val) => setNewTag(val)}
                                    error={newTagError}
                                />
                                <IconButton iconColor={theme.colors.primary} onPress={handleSaveNewTag} icon="check" />
                                <IconButton
                                    iconColor={theme.colors.primary}
                                    onPress={handleCancelAddNew}
                                    icon="cancel"
                                />
                            </View>
                            {newTagError && <HelperText type="error">please enter a tag name</HelperText>}
                        </>
                    ) : (
                        <List.Item
                            title="Add new"
                            onPress={handleOnAddNew}
                            left={(props) => <List.Icon {...props} icon="add" />}
                        />
                    )}
                </ScrollView>
            </Dialog.ScrollArea>

            <Dialog.Actions>
                <Button onPress={finishDialog}>Done</Button>
            </Dialog.Actions>
        </KeyboardAvoidingDialog>
    );
};
