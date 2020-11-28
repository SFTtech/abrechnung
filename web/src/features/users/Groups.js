import React, {Component} from "react";
import {connect} from "react-redux";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";

class Groups extends Component {
    render() {
        let groups = this.props.groups.map((group, index) => {
            return (
                <ListGroup.Item>{group.name}</ListGroup.Item>
            );
        });
        return (
            <div className="row mt-5">
                <div className="col-12">
                    <h4>Groups</h4>
                    <Row>
                        <Col md={6} xs={12}>
                            <ListGroup variant={"flush"}>{groups}</ListGroup>
                        </Col>
                    </Row>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.users.status,
    error: state.users.error,
    users: state.users.users,
    groups: state.users.groups,
});

export default connect(mapStateToProps)(Groups);
