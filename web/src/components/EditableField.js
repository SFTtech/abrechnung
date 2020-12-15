import React, { Component } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons/faPencilAlt";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";

class EditableField extends Component {
    static propTypes = {
        value: PropTypes.string.isRequired,
        onChange: PropTypes.func.isRequired
    };

    state = {
        value: null,
        editing: false
    };

    onSave = () => {
        this.props.onChange(this.state.value);
        this.setState({value: null, editing: false});
    }

    render() {
        if (this.state.editing) {
           return (
               <> {this.props.type === "textarea" ? (
                   <textarea
                       value={this.state.value}
                       onChange={(event) => this.setState({ value: event.target.value })}
                   />
               ) : (
                   <input
                       type={"text"}
                       value={this.state.value}
                       onChange={(event) => this.setState({ value: event.target.value })}
                   />
               )}
                   <div>
                       <button
                           className="btn text-success p-0"
                           onClick={this.onSave}
                       >
                           <FontAwesomeIcon icon={faCheck} />
                       </button>
                       <button
                           className="btn text-danger p-0 ml-2"
                           onClick={() => this.setState({ name: null, editing: false })}
                       >
                           <FontAwesomeIcon icon={faTimes} />
                       </button>
                   </div>
               </>
           )
        }
        return (
                    <>
                        <span>{this.props.value}</span>
                        <button
                            className="btn text-info p-0"
                            onClick={() => this.setState({ value: this.props.value, editing: true })}
                        >
                            <FontAwesomeIcon icon={faPencilAlt} />
                        </button>
                    </>
                );
    }
}

export default EditableField;
