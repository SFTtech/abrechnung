import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import { LinkContainer } from "react-router-bootstrap";

export class Header extends Component {
    static propTypes = {
        isAuthenticated: PropTypes.bool.isRequired,
    };

    render() {
        const { isAuthenticated } = this.props;

        return (
            <Navbar bg={"primary"} variant={"dark"} className={"mb-4"}>
                <div className={"container"}>
                    <Navbar.Brand>
                        <Link to={"/"}>Abrechnung</Link>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls={"responsive-navbar-nav"} />
                    <Navbar.Collapse id={"responsive-navbar-nav"}>
                        {isAuthenticated ? (
                            <>
                                <Nav>
                                    <Nav.Item>
                                        <LinkContainer to={"/groups"}>
                                            <Nav.Link>Groups</Nav.Link>
                                        </LinkContainer>
                                    </Nav.Item>
                                </Nav>
                                <Nav className={"ml-auto"}>
                                    <Nav.Item>
                                        <LinkContainer to={"/profile"}>
                                            <Nav.Link>Profile</Nav.Link>
                                        </LinkContainer>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <LinkContainer to={"/logout"}>
                                            <Nav.Link>Logout</Nav.Link>
                                        </LinkContainer>
                                    </Nav.Item>
                                </Nav>
                            </>
                        ) : (
                            <Nav className={"ml-auto"}>
                                <Nav.Item>
                                    <LinkContainer to={"/register"}>
                                        <Nav.Link>Register</Nav.Link>
                                    </LinkContainer>
                                </Nav.Item>
                                <Nav.Item>
                                    <LinkContainer to={"/login"}>
                                        <Nav.Link>Login</Nav.Link>
                                    </LinkContainer>
                                </Nav.Item>
                            </Nav>
                        )}
                    </Navbar.Collapse>
                </div>
            </Navbar>
        );
    }
}

const mapStateToProps = (state) => ({
    isAuthenticated: state.auth.isAuthenticated,
});

export default connect(mapStateToProps)(Header);
