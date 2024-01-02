import * as React from "react";
import { Link as RouterLink, Outlet, Navigate } from "react-router-dom";
import { AppBar, Box, Button, Container, CssBaseline, Toolbar, Typography } from "@mui/material";
import { Banner } from "../../components/style/Banner";
import { selectIsAuthenticated } from "@abrechnung/redux";
import { useAppSelector, selectAuthSlice } from "../../store";
import { LanguageSelect } from "@/components/LanguageSelect";

export const UnauthenticatedLayout: React.FC = () => {
    const authenticated = useAppSelector((state) => selectIsAuthenticated({ state: selectAuthSlice(state) }));

    if (authenticated) {
        return <Navigate to="/" />;
    }

    return (
        <Box sx={{ display: "flex" }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                }}
            >
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <RouterLink to="/" style={{ textDecoration: "none", color: "inherit" }}>
                            Abrechnung
                        </RouterLink>
                    </Typography>
                    <LanguageSelect />
                    <Button component={RouterLink} color="inherit" to="/login">
                        Login
                    </Button>
                </Toolbar>
            </AppBar>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                }}
            >
                <Toolbar />
                <Banner />
                <Container maxWidth="lg" sx={{ padding: { xs: 0, md: 1, lg: 3 } }}>
                    <Outlet />
                </Container>
            </Box>
        </Box>
    );
};
