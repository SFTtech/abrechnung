import Spinner from "react-bootstrap/Spinner";
import React from "react";

export default function Loading() {
    return (
        <div className={"d-flex justify-content-center mt-5"}>
            <Spinner animation="border" role="status">
                <span className="sr-only">Loading...</span>
            </Spinner>
        </div>
    )
}