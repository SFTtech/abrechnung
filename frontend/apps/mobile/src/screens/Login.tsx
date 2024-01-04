import { login } from "@abrechnung/redux";
import { toFormikValidationSchema } from "@abrechnung/utils";
import { SerializedError } from "@reduxjs/toolkit";
import { Formik, FormikHelpers } from "formik";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Appbar, Button, HelperText, ProgressBar, Text, TextInput, useTheme } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { z } from "zod";
import { useInitApi } from "../core/ApiProvider";
import { RootDrawerScreenProps } from "../navigation/types";
import { notify } from "../notifications";
import { useAppDispatch } from "../store";
import { useTranslation } from "react-i18next";
import LogoSvg from "../assets/logo.svg";

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

    const handleSubmit = (values: FormSchema, { setSubmitting }: FormikHelpers<FormSchema>) => {
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
            .then(() => {
                setSubmitting(false);
            })
            .catch((err: SerializedError) => {
                console.log("error on login", err);
                if (err.message) {
                    notify({ text: err.message });
                }
                setSubmitting(false);
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
            <Formik
                validationSchema={toFormikValidationSchema(validationSchema)}
                initialValues={initialValues}
                onSubmit={handleSubmit}
            >
                {({ values, touched, handleSubmit, handleBlur, isSubmitting, errors, setFieldValue }) => (
                    <View style={styles.container}>
                        <TextInput
                            label={t("common.server")}
                            style={styles.input}
                            returnKeyType="next"
                            autoCapitalize="none"
                            textContentType="URL"
                            keyboardType="url"
                            value={values.server}
                            onBlur={() => handleBlur("server")}
                            onChangeText={(val) => setFieldValue("server", val)}
                            error={touched.server && !!errors.server}
                        />
                        {touched.server && !!errors.server && <HelperText type="error">{errors.server}</HelperText>}

                        <TextInput
                            label={t("common.username")}
                            style={styles.input}
                            returnKeyType="next"
                            autoCapitalize="none"
                            textContentType="username"
                            value={values.username}
                            onBlur={() => handleBlur("username")}
                            onChangeText={(val) => setFieldValue("username", val)}
                            error={touched.username && !!errors.username}
                        />
                        {touched.username && !!errors.username && (
                            <HelperText type="error">{errors.username}</HelperText>
                        )}

                        <TextInput
                            label={t("common.password")}
                            style={styles.input}
                            returnKeyType="done"
                            textContentType="password"
                            autoCapitalize="none"
                            value={values.password}
                            onBlur={() => handleBlur("password")}
                            onChangeText={(val) => setFieldValue("password", val)}
                            error={touched.password && !!errors.password}
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
                        {touched.password && !!errors.password && (
                            <HelperText type="error">{errors.password}</HelperText>
                        )}

                        {isSubmitting ? <ProgressBar indeterminate={true} /> : null}
                        <Button mode="contained" style={styles.submit} onPress={() => handleSubmit()}>
                            Login
                        </Button>

                        <View style={styles.row}>
                            <Text>Don’t have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                                <Text style={styles.link}>Sign up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Formik>
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
