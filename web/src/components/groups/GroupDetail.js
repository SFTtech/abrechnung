import React from "react";
import "react-datetime/css/react-datetime.css";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/cjs/Alert";
import EditableField from "../EditableField";

import "./GroupDetail.css";

export default function GroupDetail({group}) {

    const updateName = (name) => {
        this.props.updateGroupMetadata({groupID: group.group_id, name: name});
    };

    const updateDescription = (description) => {
        this.props.updateGroupMetadata({groupID: group.group_id, description: description});
    };

    const updateCurrencySymbol = (currency_symbol) => {
        this.props.updateGroupMetadata({groupID: group.group_id, currency_symbol: currency_symbol});
    };

    const updateTerms = (terms) => {
        this.props.updateGroupMetadata({groupID: group.group_id, terms: terms});
    };

    return (
        <>
            {group.is_owner ? (
                <Alert variant={"info"}>You are an owner of this group</Alert>
            ) : !group.can_write ? (
                <Alert variant={"info"}>You only have read access to this group</Alert>
            ) : (
                ""
            )}
            <span className={"font-weight-bold"}>Name</span>
            <div className={"p-0 d-flex justify-content-between"}>
                <EditableField value={group.name} onChange={updateName}/>
            </div>

            <span className={"font-weight-bold"}>Description</span>
            <div className={"p-0 d-flex justify-content-between"}>
                <EditableField value={group.description} onChange={updateDescription}/>
            </div>

            <span className={"font-weight-bold"}>Created</span><br/>
            <span className={"info-text"}>{group.created}</span><br/>

            <span className={"font-weight-bold"}>Joined</span><br/>
            <span className={"info-text"}>{group.joined}</span><br/>

            <span className={"font-weight-bold"}>Last Changed</span><br/>
            <span className={"info-text"}>
                    {group.latest_commit === null ? "never" : group.latest_commit}
                </span><br/>

            {group.currency_symbol === undefined || group.terms === undefined ? (
                <div className={"d-flex justify-content-center"}>
                    <Spinner animation="border" role="status">
                        <span className="sr-only">Loading...</span>
                    </Spinner>
                </div>
            ) : (
                <>
                    <span className={"font-weight-bold"}>Currency Symbol</span>
                    <div className={"d-flex justify-content-between"}>
                        <EditableField value={group.currency_symbol}
                                       onChange={updateCurrencySymbol}/>
                    </div>

                    <span className={"font-weight-bold"}>Terms</span>
                    <div className={"d-flex justify-content-between"}>
                        <EditableField
                            type={"textarea"}
                            value={group.terms}
                            onChange={updateTerms}
                        />
                    </div>
                </>
            )}
        </>
    );
}
