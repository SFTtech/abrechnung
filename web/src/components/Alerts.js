import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";

import { removeMessage } from "../features/messages/messagesSlice";

export class Alerts extends Component {
    static propTypes = {
        messages: PropTypes.object.isRequired,
        removeMessage: PropTypes.func.isRequired,
    };

    render() {
        if (this.props.messages.msg !== null) {
            const alertType = "alert alert-" + this.props.messages.status;
            return (
                <div className={alertType} role="alert">
                    {this.props.messages.msg}
                    <button type="button" onClick={this.props.removeMessage()} className="close" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            );
        }
        return "";
    }
}

const mapStateToProps = (state) => ({
    messages: state.messages,
});

export default connect(mapStateToProps, { removeMessage })(Alerts);
