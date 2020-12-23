import React, { Component } from "react";
import { connect } from "react-redux";
import "react-datetime/css/react-datetime.css";
import PropTypes from "prop-types";
import { createGroupLog, fetchGroupLog, fetchGroupMembers } from "./groupsSlice";
import Spinner from "react-bootstrap/Spinner";
import Form from "react-bootstrap/Form";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import { Button } from "react-bootstrap";
import Col from "react-bootstrap/Col";

class GroupLog extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
    };

    state = {
        showAllLogs: false,
        message: "",
    };

    componentDidMount = () => {
        if (this.props.group.log === undefined) {
            this.props.fetchGroupLog({ groupID: this.props.group.id });
        }
        if (this.props.group.members === undefined) {
            this.props.fetchGroupMembers({ groupID: this.props.group.id });
        }
    };

    onMessageSend = (e) => {
        e.preventDefault();
        this.props.createGroupLog({ groupID: this.props.group.id, message: this.state.message });
        this.setState({message: ""});
    }

    render() {
        if (this.props.group.log === undefined) {
            return (
                <div>
                    <h5>Log</h5>
                    <hr />
                    <div className={"d-flex justify-content-center"}>
                        <Spinner animation="border" role="status">
                            <span className="sr-only">Loading...</span>
                        </Spinner>
                    </div>
                </div>
            );
        }

        const log = this.state.showAllLogs
            ? this.props.group.log
            : this.props.group.log.filter((entry) => entry.type === "text-message");

        const error = this.props.error !== null ? <div className="alert alert-danger">{this.props.error}</div> : "";

        return (
            <div>
                <h5>Log</h5>
                {error}
                <hr />
                <Col xs={12}>
                    <Form.Check
                        type={"switch"}
                        id={"show-all"}
                        label={"Show all Logs"}
                        checked={this.state.showAllLogs}
                        onChange={(e) => this.setState({ showAllLogs: e.target.checked })}
                    />
                    <Form noValidate className={"mt-3"} onSubmit={this.onMessageSend}>
                        <Form.Text
                            required
                            as={"textarea"}
                            id={"new-message"}
                            name={"new-message"}
                            className={"w-100"}
                            placeholder={"Write a message to the group ..."}
                            value={this.state.message}
                            onChange={(e) => this.setState({message: e.target.value})}
                        />
                        <Button type={"submit"} variant={"success"} className={"mt-2"}>
                            Send
                        </Button>
                    </Form>
                </Col>
                <hr />
                <ListGroup variant={"flush"} className={"mt-3"}>
                    {log.map((logEntry) => (
                        <ListGroup.Item key={logEntry.id}>
                            <span>{logEntry.message === "" ? logEntry.type : logEntry.message}</span>
                            <div className={"d-flex justify-content-between"}>
                                <small className={"text-muted"}>
                                    by {this.props.group.members.find((user) => user.id === logEntry.usr).username}
                                </small>
                                <small className={"text-muted"}>{logEntry.logged}</small>
                            </div>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.groups.status,
    error: state.groups.error,
});

export default connect(mapStateToProps, { fetchGroupLog, fetchGroupMembers, createGroupLog })(GroupLog);
