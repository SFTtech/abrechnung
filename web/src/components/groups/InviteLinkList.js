import React, {useState} from "react";

import ListGroup from "react-bootstrap/cjs/ListGroup";
import Button from "react-bootstrap/cjs/Button";
import "react-datetime/css/react-datetime.css";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTrash} from "@fortawesome/free-solid-svg-icons/faTrash";
import {useRecoilState, useRecoilValue} from "recoil";
import {deleteInviteToken, groupInviteTokens} from "../../recoil/groups";
import InviteLinkCreate from "./InviteLinkCreate";
import {sessionToken} from "../../recoil/auth";
import {toast} from "react-toastify";

export default function InviteLinkList({group}) {
    const [showModal, setShowModal] = useState(false);
    const authToken = useRecoilValue(sessionToken);
    const [tokens, setTokens] = useRecoilState(groupInviteTokens(group.group_id));

    const deleteToken = (id) => {
        deleteInviteToken({sessionToken: authToken, groupID: group.group_id, tokenID: id})
            .then(result => {
                toast.success(`Removed invite link`, {
                    position: "top-right",
                    autoClose: 5000,
                });
                setTokens((oldTokens) => oldTokens.filter(token => token.invite_id !== id));
            }).catch(err => {
            toast.error(`${err}`, {
                position: "top-right",
                autoClose: 5000,
            });
        })
    }

    return (
        <div>
            <h5>
                Active invite links{" "}
                <Button className={"float-right"} onClick={() => setShowModal(true)} variant={"success"}>
                    Invite
                </Button>
            </h5>
            <hr/>
            <ListGroup variant={"flush"}>
                {tokens.length === 0 ? (
                    <ListGroup.Item>No Links</ListGroup.Item>
                ) : (
                    tokens.map((link, index) => (
                        <ListGroup.Item key={index} className={"d-flex justify-content-between"}>
                            <div>
                                <span>{window.location.origin}/groups/invite/{link.token}</span>
                                <br/>
                                <small className={"text-muted"}>{link.description}</small>
                            </div>
                            <div>
                                <button
                                    className="btn text-danger"
                                    onClick={() => deleteToken(link.invite_id)}
                                >
                                    <FontAwesomeIcon icon={faTrash}/>
                                </button>
                            </div>
                        </ListGroup.Item>
                    ))
                )}
            </ListGroup>
            <InviteLinkCreate show={showModal} onClose={() => setShowModal(false)} group={group}/>
        </div>
    );
}
