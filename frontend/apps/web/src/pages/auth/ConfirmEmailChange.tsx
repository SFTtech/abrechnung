import { Button, Typography } from "@mui/material";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Loading } from "@/components/style/Loading";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import { Trans, useTranslation } from "react-i18next";

export const ConfirmEmailChange: React.FC = () => {
    const { t } = useTranslation();
    const [status, setStatus] = useState("idle");
    const { token } = useParams();

    useTitle(t("auth.confirmEmailChange.tabTitle"));

    const confirmEmail = (e: React.MouseEvent) => {
        if (!token) {
            return;
        }
        e.preventDefault();
        setStatus("loading");
        api.client.auth
            .confirmEmailChange({ requestBody: { token } })
            .then((value) => {
                setStatus("success");
            })
            .catch((error) => {
                toast.error(error);
            });
    };

    if (status === "success") {
        return (
            <Typography component="h4" variant="h5">
                {t("auth.confirmEmailChange.confirmSuccessful")}
            </Typography>
        );
    }

    return (
        <div>
            <Typography component="h4" variant="h5">
                {t("auth.confirmEmailChange.header")}
            </Typography>
            {status === "loading" ? (
                <Loading />
            ) : (
                <p>
                    <Trans Key="auth.confirmEmailChange.clickHereToConfirm">
                        Click
                        <Button color="primary" onClick={confirmEmail}>
                            here
                        </Button>
                        to confirm your new email.
                    </Trans>
                </p>
            )}
        </div>
    );
};
