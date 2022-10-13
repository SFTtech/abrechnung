import React, { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import Loading from "../../components/style/Loading";
import { confirmRegistration } from "../../core/api";
import { Alert, Button, Container, Link, Typography } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../core/utils";

export default function ConfirmRegistration() {
    const [error, setError] = useState(null);
    const [status, setStatus] = useState("idle");
    const { token } = useParams();

    useTitle("Abrechnung - Confirm Registration");

    const confirmEmail = (e) => {
        e.preventDefault();
        setStatus("loading");
        confirmRegistration({ token: token })
            .then((value) => {
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
                    Confirm Registration
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                {status === "success" ? (
                    <>
                        <Alert severity="success">Confirmation successful</Alert>
                        <p>
                            Please{" "}
                            <Link to="/login" component={RouterLink}>
                                login
                            </Link>{" "}
                            using your credentials.
                        </p>
                    </>
                ) : status === "loading" ? (
                    <Loading />
                ) : (
                    <p>
                        Click{" "}
                        <Button color="primary" onClick={confirmEmail}>
                            here
                        </Button>{" "}
                        to confirm your registration.
                    </p>
                )}
            </MobilePaper>
        </Container>
    );
}
