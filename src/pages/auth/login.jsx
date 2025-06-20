import React, { useState } from 'react';
import useAuthentication from "../../hooks/useAuthentication";
import { NavLink, useNavigate } from "react-router-dom"
import { Container, Row, Col, Form, Button, Alert } from "react-bootstrap";
import { loadingContent } from "../../components/general/general-components";

const Login = () => {
    const navigate = useNavigate();
    const { isLoading, message, signInCall, setMessage } = useAuthentication();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleLogin = async (e) => {
        e.preventDefault();

        // Validate input
        if (!email || !password) {
            setMessage({
                content: "Please fill in all fields",
                isError: true
            });
            return;
        }

        if (!emailRegex.test(email)) {
            setMessage({
                content: "Please enter a valid email address",
                isError: true
            });
            return;
        }

        const { success, role } = await signInCall({ email, password });
        if (success) {
            navigate('/');
        }
    }

    return (
        <div id="login">
            <Container className="pt-4 pb-5">
                <Row>
                    <Col>
                        <h1 className="fs-1 text-center text-uppercase">Login</h1>
                        {message !== null && (
                            message.isError
                                ? <Alert key="danger" variant="danger">{message.content}</Alert>
                                : <Alert key="success" variant="success">{message.content}</Alert>
                        )}
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Row className="justify-content-center">
                            <Col xs={12} md={8} className={isLoading ? "text-center" : null}>
                                {isLoading ? loadingContent : (
                                    <Form onSubmit={handleLogin}>
                                        <Form.Group className="mb-3" controlId="formBasicEmail">
                                            <Form.Label>Email address</Form.Label>
                                            <Form.Control
                                                type="email"
                                                placeholder="Enter email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3" controlId="formBasicPassword">
                                            <Form.Label>Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                placeholder="Password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3" controlId="formBasicCheckbox">
                                            <Form.Check type="checkbox" label="Check me out" />
                                        </Form.Group>
                                        <Button
                                            variant="primary rent-now-button primary-bg-color border-0 rounded-1 px-4 fw-bold"
                                            type="submit"
                                        >
                                            Login
                                        </Button>
                                    </Form>
                                )}
                                <p>
                                    No account yet? {' '}
                                    <NavLink to="/sign-up">
                                        Sign up
                                    </NavLink>
                                </p>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Login;