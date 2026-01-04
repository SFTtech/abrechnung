import * as React from "react";
import { Alert, AlertTitle, AppBar, Box, Container, CssBaseline, Toolbar, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { LanguageSelect } from "@/components/LanguageSelect";
import { Banner } from "@/components/style/Banner";

const PrettyError: React.FC = () => {
    const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        return (
            <Alert severity="error">
                <AlertTitle>Error</AlertTitle>
                <h1>
                    {error.status} {error.statusText}
                </h1>
                <p>{error.data}</p>
            </Alert>
        );
    } else if (error instanceof Error) {
        return (
            <Alert severity="error">
                <AlertTitle>Error: {error.message}</AlertTitle>
                <div>
                    <pre>{error.stack}</pre>
                </div>
            </Alert>
        );
    } else {
        return (
            <Alert severity="error">
                <AlertTitle>An unknown error occurred</AlertTitle>
            </Alert>
        );
    }
};

export const ErrorBoundary = () => {
    const { t } = useTranslation();

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
                            {t("app.name")}
                        </RouterLink>
                    </Typography>
                    <LanguageSelect />
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
                <Container sx={{ padding: { xs: 0, md: 1, lg: 3 } }}>
                    <PrettyError />
                </Container>
            </Box>
        </Box>
    );
};
