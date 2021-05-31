import React, {useState} from "react";
import "react-datetime/css/react-datetime.css";
import Form from "react-bootstrap/Form";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import {Button} from "react-bootstrap";
import Col from "react-bootstrap/Col";
import {useRecoilValue} from "recoil";
import {groupLog, groupMembers} from "../../recoil/groups";

export default function GroupLog({group}) {
    const [message, setMessage] = useState("");
    const [showAllLogs, setShowAllLogs] = useState(false);
    const logEntries = useRecoilValue(groupLog(group.group_id));
    const members = useRecoilValue(groupMembers(group.group_id));

    const onMessageSend = (e) => {
        e.preventDefault();
        this.props.createGroupLog({groupID: group.group_id, message: message});
        this.setState({message: ""});
    }

    const log = showAllLogs
        ? logEntries
        : logEntries.filter((entry) => entry.type === "text-message");

    return (
        <div>
            <Col xs={12}>
                <Form.Check
                    type={"switch"}
                    id={"show-all"}
                    label={"Show all Logs"}
                    checked={showAllLogs}
                    onChange={e => setShowAllLogs(e.target.checked)}
                />
                <Form noValidate className={"mt-3"} onSubmit={onMessageSend}>
                    <Form.Text
                        required
                        as={"textarea"}
                        id={"new-message"}
                        name={"new-message"}
                        className={"w-100"}
                        placeholder={"Write a message to the group ..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <Button type={"submit"} variant={"success"} className={"mt-2"}>
                        Send
                    </Button>
                </Form>
            </Col>
            <hr/>
            <ListGroup variant={"flush"} className={"mt-3"}>
                {log.map((logEntry) => (
                    <ListGroup.Item key={logEntry.logentry_id}>
                        <span>{logEntry.message === "" ? logEntry.type : logEntry.message}</span>
                        <div className={"d-flex justify-content-between"}>
                            <small className={"text-muted"}>
                                by {members.find((user) => user.user_id === logEntry.user_id).username}
                            </small>
                            <small className={"text-muted"}>{logEntry.logged}</small>
                        </div>
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </div>
    );
}
