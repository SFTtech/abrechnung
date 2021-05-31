import React, {useEffect, useState} from "react";
import {useHistory} from "react-router-dom";
import {Formik} from "formik";
import {fetchUserData, isAuthenticated, login, sessionToken, userData} from "../../recoil/auth";
import {useRecoilState, useSetRecoilState} from "recoil";
import Layout from "../../components/Layout";
import Loading from "../../components/Loading";
import {toast} from "react-toastify";

export default function Login() {
    const setSessionToken = useSetRecoilState(sessionToken);
    const [loggedIn, setLoggedIn] = useRecoilState(isAuthenticated);
    const [loading, setLoading] = useState(true);
    const setUserData = useSetRecoilState(userData);
    let history = useHistory();

    useEffect(() => {
        if (loggedIn) {
            setLoading(false);
            history.push('/');
        } else {
            setLoading(false);
        }
    }, [loggedIn, history])

    const handleSubmit = (values, {setSubmitting}) => {
        login(values).then(res => {
            toast.success(`Logged in...`, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            setLoggedIn(true);
            setSessionToken(res);
            setSubmitting(false);
            fetchUserData({authToken: res}).then(result => {
                setUserData(result);
                history.push("/"); // handle next
            }).catch(err => {})
        }).catch(err => {
            toast.error(`${err}`, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            setSubmitting(false);
        })
    };


    // if (this.props.isAuthenticated) {
    //     let params = queryString.parse(this.props.location.search);
    //     if (params.next !== null && params.next !== undefined && params.next.startsWith("/")) {
    //         return <Redirect to={params.next}/>;
    //     }
    //     return <Redirect to="/"/>;
    // }

    return (
        <>
            {loading ? <Loading/> : (
                <Layout title="Login">
                    <div className="col-md-6 m-auto">
                        <div className="card card-body mt-5">
                            <h2 className="text-center">Login</h2>
                            <Formik initialValues={{password: "", username: ""}} onSubmit={handleSubmit}>
                                {({values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting}) => (
                                    <form onSubmit={handleSubmit}>
                                        <input type="hidden" name="remember" value="true"/>
                                        <div className="form-group">
                                            <label>Username</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="username"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                value={values.username}
                                            />
                                            {errors.username && touched.username && errors.username}
                                        </div>

                                        <div className="form-group">
                                            <label>Password</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                name="password"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                value={values.password}
                                            />
                                            {errors.password && touched.password && errors.password}
                                        </div>

                                        <div className="form-group">
                                            <button type="submit"
                                                    className="btn btn-primary"
                                                    disabled={isSubmitting}>
                                                {isSubmitting ? "Logging in..." : "Login"}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </Formik>
                        </div>
                    </div>
                </Layout>
            )}
        </>
    );
}
