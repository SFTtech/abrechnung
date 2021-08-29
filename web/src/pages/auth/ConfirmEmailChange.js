import React, {useState} from "react";
import {useParams, useRouteMatch} from "react-router-dom";
import {toast} from "react-toastify";
import Loading from "../../components/style/Loading";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import {confirmEmailChange} from "../../api";

export default function ConfirmEmailChange() {
    const [status, setStatus] = useState("idle");
    const {token} = useParams();

    const confirmEmail = (e) => {
        e.preventDefault();
        setStatus("loading");
        confirmEmailChange({token: token})
            .then(value => {
                setStatus("success");
            })
            .catch(error => {
                toast.error(`${error}`);
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
                    </Button>
                    {" "}
                    to confirm your new email.
                </p>
            )}
        </div>
    );
}
