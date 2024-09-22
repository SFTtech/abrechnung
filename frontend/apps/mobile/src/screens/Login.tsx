import { login } from "@abrechnung/redux";
import { SerializedError } from "@reduxjs/toolkit";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Appbar, Button, Text, TextInput, useTheme } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { z } from "zod";
import { useInitApi } from "../core/ApiProvider";
import { RootDrawerScreenProps } from "../navigation/types";
import { notify } from "../notifications";
import { useAppDispatch } from "../store";
import { useTranslation } from "react-i18next";
import LogoSvg from "../assets/logo.svg";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTextInput } from "../components";

const validationSchema = z.object({
    server: z.string({ required_error: "server is required" }).url({ message: "invalid server url" }),
    username: z.string({ required_error: "username is required" }),
    password: z.string({ required_error: "password is required" }),
});
type FormSchema = z.infer<typeof validationSchema>;

const initialValues: FormSchema = {
    server: "https://demo.abrechnung.sft.lol",
    username: "",
    password: "",
};

export const LoginScreen: React.FC<RootDrawerScreenProps<"Login">> = ({ navigation }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const initApi = useInitApi();

    const [showPassword, setShowPassword] = useState(false);

    const toggleShowPassword = () => {
        setShowPassword((oldVal) => !oldVal);
    };

    const { control, handleSubmit } = useForm<FormSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialValues,
    });

    const onSubmit = (values: FormSchema) => {
        const { api } = initApi(values.server);
        dispatch(
            login({
                username: values.username,
                password: values.password,
                sessionName: "Abrechnung Mobile",
                api,
            })
        )
            .unwrap()
            .catch((err: SerializedError) => {
                console.log("error on login", err);
                if (err.message) {
                    notify({ text: err.message });
                }
            });
    };

    return (
        <>
            <Appbar.Header theme={{ colors: { primary: theme.colors.surface } }}>
                <Appbar.Content title={t("app.name")} />
            </Appbar.Header>
            <View style={styles.logoContainer}>
                <LogoSvg height="100%" />
            </View>
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
                    label={t("common.username")}
                    style={styles.input}
                    returnKeyType="next"
                    autoCapitalize="none"
                    textContentType="username"
                    name="username"
                    control={control}
                />

                <FormTextInput
                    label={t("common.password")}
                    style={styles.input}
                    returnKeyType="done"
                    textContentType="password"
                    autoCapitalize="none"
                    name="password"
                    control={control}
                    secureTextEntry={!showPassword}
                    right={
                        <TextInput.Icon
                            icon={({ color, size }) => (
                                <MaterialCommunityIcons
                                    name={showPassword ? "eye-off" : "eye"}
                                    color={color}
                                    size={size}
                                    onPress={toggleShowPassword}
                                />
                            )}
                        />
                    }
                />

                <Button mode="contained" style={styles.submit} onPress={handleSubmit(onSubmit)}>
                    Login
                </Button>

                <View style={styles.row}>
                    <Text>Don’t have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                        <Text style={styles.link}>Sign up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    logoContainer: {
        alignItems: "center",
        justifyContent: "center",
        height: 100,
    },
    container: {
        padding: 8,
    },
    row: {
        flexDirection: "row",
        marginTop: 8,
    },
    submit: {
        marginTop: 8,
    },
    input: {
        marginBottom: 6,
    },
    link: {
        fontWeight: "bold",
        // color: theme.colors.primary,
    },
});

export default LoginScreen;
