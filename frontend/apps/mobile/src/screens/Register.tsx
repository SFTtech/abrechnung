import { selectIsAuthenticated } from "@abrechnung/redux";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Appbar, Button, Text, useTheme } from "react-native-paper";
import { z } from "zod";
import { useInitApi } from "../core/ApiProvider";
import { RootDrawerScreenProps } from "../navigation/types";
import { notify } from "../notifications";
import { useAppSelector } from "../store";
import { useTranslation } from "react-i18next";
import { ApiError } from "@abrechnung/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTextInput } from "../components";

const validationSchema = z
    .object({
        server: z.string({ required_error: "server is required" }).url({ message: "invalid server url" }),
        username: z.string({ required_error: "username is required" }),
        email: z.string({ required_error: "email is required" }).email({ message: "invalid email" }),
        password: z.string({ required_error: "password is required" }),
        password2: z.string({ required_error: "repeat the password" }),
    })
    .refine((data) => data.password === data.password2, {
        message: "Passwords do not match",
        path: ["password2"],
    });
type FormSchema = z.infer<typeof validationSchema>;

const initialValues: FormSchema = {
    server: "https://demo.abrechnung.sft.lol",
    username: "",
    email: "",
    password: "",
    password2: "",
};

export const RegisterScreen: React.FC<RootDrawerScreenProps<"Register">> = ({ navigation }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const loggedIn = useAppSelector(selectIsAuthenticated);
    const initApi = useInitApi();

    React.useEffect(() => {
        if (loggedIn) {
            navigation.navigate("GroupList");
        }
    }, [loggedIn, navigation]);

    const { control, handleSubmit } = useForm<FormSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialValues,
    });

    const onSubmit = (values: FormSchema) => {
        const { api: newApi } = initApi(values.server);
        newApi.client.auth
            .register({ requestBody: { username: values.username, email: values.email, password: values.password } })
            .then(() => {
                notify({ text: `Registered successfully, please confirm your email before logging in...` });
                navigation.navigate("Login");
            })
            .catch((err: ApiError) => {
                notify({ text: `${err.body.msg}` });
            });
    };

    return (
        <>
            <Appbar.Header theme={{ colors: { primary: theme.colors.surface } }}>
                <Appbar.Content title={t("auth.register.title")} />
            </Appbar.Header>
            <View style={styles.container}>
                <FormTextInput
                    label={t("common.server")}
                    style={styles.input}
                    returnKeyType="next"
                    autoCapitalize="none"
                    textContentType="URL"
                    keyboardType="url"
                    name="server"
                    control={control}
                />

                <FormTextInput
                    autoFocus={true}
                    label={t("common.username")}
                    style={styles.input}
                    textContentType="username"
                    returnKeyType="next"
                    autoCapitalize="none"
                    name="username"
                    control={control}
                />

                <FormTextInput
                    label={t("common.email")}
                    style={styles.input}
                    keyboardType="email-address"
                    returnKeyType="next"
                    autoCapitalize="none"
                    name="email"
                    control={control}
                />

                <FormTextInput
                    label={t("common.password")}
                    style={styles.input}
                    keyboardType="default"
                    secureTextEntry={true}
                    returnKeyType="next"
                    autoCapitalize="none"
                    name="password"
                    control={control}
                />

                <FormTextInput
                    label={t("common.repeatPassword")}
                    style={styles.input}
                    keyboardType="default"
                    secureTextEntry={true}
                    returnKeyType="next"
                    autoCapitalize="none"
                    name="password2"
                    control={control}
                />

                <Button mode="contained" onPress={handleSubmit(onSubmit)}>
                    {t("auth.register.title")}
                </Button>

                <View style={styles.row}>
                    <Text>Already have an account?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                        <Text style={styles.link}>Sign in</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
    },
    row: {
        flexDirection: "row",
        marginTop: 4,
    },
    input: {
        marginBottom: 6,
    },
    link: {
        fontWeight: "bold",
        // color: theme.colors.primary,
    },
});
