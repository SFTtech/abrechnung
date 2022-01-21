import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Loading from "../../components/style/Loading";
import { confirmEmailChange } from "../../api";
import { Button, Typography } from "@mui/material";

export default function ConfirmEmailChange() {
    const [status, setStatus] = useState("idle");
    const { token } = useParams();

    const confirmEmail = (e) => {
        e.preventDefault();
        setStatus("loading");
        confirmEmailChange({ token: token })
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
                Confirmation successful
            </Typography>
        );
    }

    return (
        <div>
            <Typography component="h4" variant="h5">
                Confirm your new E-Mail
            </Typography>
            {status === "loading" ? (
                <Loading />
            ) : (
                <p>
                    Click{" "}
                    <Button color="primary" onClick={confirmEmail}>
                        here
                    </Button>{" "}
                    to confirm your new email.
                </p>
            )}
        </div>
    );
}
