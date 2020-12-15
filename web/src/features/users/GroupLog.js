import React, { Component } from "react";
import { connect } from "react-redux";
import "react-datetime/css/react-datetime.css";
import PropTypes from "prop-types";

class GroupLog extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
    };

    state = {};

    componentDidMount = () => {
    };

    render() {
        return (
            <div>
                <h5>Log</h5>
                <hr />
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.users.status,
    error: state.users.error,
});

export default connect(mapStateToProps, null)(GroupLog);
