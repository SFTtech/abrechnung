import { components } from "@abrechnung/api";
import { createGroup } from "@abrechnung/redux";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, HelperText, useTheme } from "react-native-paper";
import { CurrencySelect } from "../components/CurrencySelect";
import { useApi } from "../core/ApiProvider";
import { GroupStackScreenProps } from "../navigation/types";
import { useAppDispatch } from "../store";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormCheckbox, FormTextInput } from "../components";
import { notify } from "../notifications";

type FormSchema = z.infer<typeof components.schemas.GroupPayload>;

export const AddGroup: React.FC<GroupStackScreenProps<"AddGroup">> = ({ navigation }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { api } = useApi();

    const {
        control,
        handleSubmit,
        reset: resetForm,
    } = useForm<FormSchema>({
        resolver: zodResolver(components.schemas.GroupPayload),
        defaultValues: {
            name: "",
            description: "",
            currency_symbol: "€",
            terms: "",
            add_user_account_on_join: false,
        },
    });
    const onSubmit = React.useCallback(
        (values: FormSchema) => {
            dispatch(createGroup({ api, group: values }))
                .unwrap()
                .then(() => {
                    navigation.goBack();
                })
                .catch(() => {
                    notify({ text: "An error occured during group creation" });
                });
        },
        [dispatch, navigation, api]
    );

    const cancel = React.useCallback(() => {
        resetForm();
        navigation.goBack();
    }, [resetForm, navigation]);

    React.useLayoutEffect(() => {
        navigation.setOptions({
            onGoBack: cancel,
            headerRight: () => {
                return (
                    <>
                        <Button onPress={cancel} textColor={theme.colors.error}>
                            Cancel
                        </Button>
                        <Button onPress={() => handleSubmit(onSubmit)()}>Save</Button>
                    </>
                );
            },
        } as any);
    }, [theme, navigation, handleSubmit, onSubmit, cancel]);

    return (
        <View style={styles.container}>
            <FormTextInput label="Name" name="name" control={control} style={styles.input} />
            <FormTextInput label="Description" name="description" control={control} style={styles.input} />
            <FormTextInput label="Terms" name="terms" control={control} style={styles.input} multiline={true} />
            <Controller
                name="currency_symbol"
                control={control}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <>
                        <CurrencySelect label="Currency" value={value} onChange={onChange} />
                        {error && <HelperText type="error">{error.message}</HelperText>}
                    </>
                )}
            />
            <FormCheckbox
                label="Add user accounts on join"
                name="add_user_account_on_join"
                control={control}
                style={styles.input}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 6,
    },
    input: {
        marginBottom: 4,
    },
});
