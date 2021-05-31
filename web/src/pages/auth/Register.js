import React, {useEffect, useState} from "react";
import {Link, useHistory} from "react-router-dom";
import {Formik} from "formik";

import {useRecoilState} from "recoil";
import {isAuthenticated, register} from "../../recoil/auth";
import {toast} from "react-toastify";
import Loading from "../../components/Loading";
import Layout from "../../components/Layout";

export default function Register() {
    const [loggedIn, setLoggedIn] = useRecoilState(isAuthenticated);
    const [loading, setLoading] = useState(true);
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
        register(values).then(res => {
            if (res.success) {
                toast.dark(`🐴 Registered successfully...`, {
                    position: "top-right",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
                setLoggedIn(true);
                setSubmitting(false);
                history.push('/profile');
            }
        }).catch(err => {
            toast.dark(`❌ ${err}`, {
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

    const validate = (values) => {
        let errors = {};
        if (values.password !== values.password2) {
            errors.password = "Passwords do not match";
        }
        return errors;
    }

    // if (this.props.isAuthenticated) {
    //     return <Redirect to="/"/>;
    // }
    //
    // if (this.state.status === "success") {
    //     return (
    //         <div className="col-md-6 m-auto">
    //             <div className="card card-body mt-5">
    //                 <h4 className="text-center text-success">Registration successful</h4>
    //                 <p>
    //                     Registration successful, please confirm the follow link you received via email to confirm
    //                     your registration.
    //                 </p>
    //             </div>
    //         </div>
    //     );
    // }

    return (
        <>
            {loading ? <Loading/> : (<>
                <Layout title="Register">
                    <div className="py-4 flex items-center justify-center bg-gray-50">
                        <div className="max-w-md w-full">
                            <div>
                                <h2 className="mt-6 text-center text-3xl leading-9 font-extrabold text-gray-900">
                                    Register a new account
                                </h2>
                                <p className="mt-2 text-center text-sm leading-5 text-gray-600">
                                    Or <Link to="/login"
                                             className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition ease-in-out duration-150">
                                    login here.
                                </Link>
                                </p>
                            </div>
                            <Formik
                                validate={validate}
                                initialValues={{
                                    username: "",
                                    email: "",
                                    password: "",
                                    password2: "",
                                }}
                                onSubmit={handleSubmit}
                            >
                                {({values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting}) => (

                                    <form onSubmit={handleSubmit} className="mt-8">
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
                                            <label>Email</label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                name="email"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                value={values.email}
                                            />
                                            {errors.email && touched.email && errors.email}
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
                                            <label>Confirm Password</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                name="password2"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                value={values.password2}
                                            />
                                            {errors.password2 && touched.password2 && errors.password2}
                                        </div>
                                        <div className="form-group">
                                            <button type="submit"
                                                    className="btn btn-primary"
                                                    disabled={isSubmitting}>
                                                {isSubmitting ? "Registering..." : "Register"}
                                            </button>
                                        </div>
                                        <p>
                                            Already have an account? <Link to="/login">Login</Link>
                                        </p>
                                    </form>
                                )}
                            </Formik>

                        </div>
                    </div>
                </Layout>
            </>)}
        </>
    )
}
