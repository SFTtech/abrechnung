import React, {useState} from "react";
import {Link as RouterLink, useParams} from "react-router-dom";
import {ws} from "../../websocket";
import Loading from "../../components/style/Loading";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Link from "@material-ui/core/Link";
import {Alert} from "@material-ui/lab";


export default function ConfirmRegistration() {
    const [error, setError] = useState(null);
    const [status, setStatus] = useState("idle");
    const {token} = useParams();

    const confirmEmail = (e) => {
        e.preventDefault();
        setStatus("loading");
        ws.call("confirm_registration", {
            token: token,
        })
            .then((value) => {
                setError(null);
                setStatus("success");
            })
            .catch((err) => {
                setError(err);
                setStatus("failed")
            });
    };

    if (status === "success") {
        return (
            <div>
                <Typography component="h4" variant="h5">
                    Confirmation successful
                </Typography>
                <h4 className="text-center text-success">Confirmation successful</h4>
                <p>
                    Please <Link to="/login" component={RouterLink}>login</Link> using your credentials.
                </p>
            </div>
        );
    }

    return (
        <div>
            <Typography component="h4" variant="h5">
                Confirm Registration
            </Typography>
            {error && <Alert severity="danger">{error}</Alert>}
            {status === "loading" ? (
                <Loading/>
            ) : (
                <p>
                    Click{" "}
                    <Button color="primary" onClick={confirmEmail}>
                        here
                    </Button>{" "}
                    to confirm your registration.
                </p>
            )}
        </div>
    );
}
