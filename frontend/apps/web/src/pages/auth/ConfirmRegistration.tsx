import { Alert, Button, Container, Link, Typography } from "@mui/material";
import React, { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Loading } from "@abrechnung/components";
import { MobilePaper } from "@/components/style";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import { Trans, useTranslation } from "react-i18next";

export const ConfirmRegistration: React.FC = () => {
    const { t } = useTranslation();
    const [error, setError] = useState(null);
    const [status, setStatus] = useState("idle");
    const { token } = useParams();

    useTitle(t("auth.confirmRegistration.tabTitle"));

    const confirmEmail = (e: React.MouseEvent) => {
        if (!token) {
            return;
        }

        e.preventDefault();
        setStatus("loading");
        api.client.auth
            .confirmRegistration({ requestBody: { token } })
            .then(() => {
                setError(null);
                setStatus("success");
            })
            .catch((err) => {
                setError(err);
                setStatus("failed");
            });
    };

    return (
        <Container maxWidth="xs">
            <MobilePaper>
                <Typography component="h1" variant="h5">
                    {t("auth.confirmRegistration.header")}
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                {status === "success" ? (
                    <>
                        <Alert severity="success">{t("auth.confirmRegistration.confirmSuccessful")}</Alert>
                        <p>
                            <Trans Key="auth.confirmRegistration.successfulLinkToLogin">
                                Please
                                <Link to="/login" component={RouterLink}>
                                    login
                                </Link>
                                using your credentials.
                            </Trans>
                        </p>
                    </>
                ) : status === "loading" ? (
                    <Loading />
                ) : (
                    <p>
                        <Trans Key="auth.confirmRegistration.clickHereToConfirm">
                            Click
                            <Button color="primary" onClick={confirmEmail}>
                                here
                            </Button>
                            to confirm your registration.
                        </Trans>
                    </p>
                )}
            </MobilePaper>
        </Container>
    );
};
