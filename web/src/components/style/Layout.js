import clsx from "clsx";
import React, {useEffect, useState} from "react";
import {Container, makeStyles, Menu, MenuItem, SwipeableDrawer, useMediaQuery, useTheme} from "@material-ui/core";
import {Link as RouterLink} from "react-router-dom";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import List from "@material-ui/core/List";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ListItemText from "@material-ui/core/ListItemText";
import {useRecoilValue} from "recoil";
import {isAuthenticated} from "../../recoil/auth";
import ListItemLink from "./ListItemLink";
import Button from "@material-ui/core/Button";
import AccountCircleIcon from "@material-ui/icons/AccountCircle";

const iOS = process.browser && /iPad|iPhone|iPod/.test(navigator.userAgent);

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex"
    },
    appBar: {
        transition: theme.transitions.create(["margin", "width"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
        })
    },
    appBarShift: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: drawerWidth,
        transition: theme.transitions.create(["margin", "width"], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen
        })
    },
    menuButton: {
        marginRight: theme.spacing(2)
    },
    hide: {
        display: "none"
    },
    title: {
        flexGrow: 1
    },
    drawer: {
        width: drawerWidth,
        flexShrink: 0
    },
    drawerPaper: {
        width: drawerWidth
    },
    drawerHeader: {
        display: "flex",
        alignItems: "center",
        padding: theme.spacing(0, 1),
        // necessary for content to be below app bar
        ...theme.mixins.toolbar,
        justifyContent: "flex-end"
    },
    content: {
        flexGrow: 1,
        padding: theme.spacing(3),
        transition: theme.transitions.create("margin", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
        }),
        marginLeft: 0
    },
    contentShift: {
        transition: theme.transitions.create("margin", {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen
        }),
        marginLeft: drawerWidth
    }
}));

export default function Layout({group = null, children}) {
    const classes = useStyles();
    const theme = useTheme();
    const authenticated = useRecoilValue(isAuthenticated);
    const [anchorEl, setAnchorEl] = useState(null);
    const dotsMenuOpen = Boolean(anchorEl);

    const isLargeScreen = useMediaQuery(theme.breakpoints.up("sm"));
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (sidebarOpen !== isLargeScreen) {
            setSidebarOpen(isLargeScreen);
        }
    }, [sidebarOpen, isLargeScreen])

    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleDotsMenuClose = (event) => {
        setAnchorEl(null);
    };

    const handleSidebarOpen = () => {
        setSidebarOpen(true);
    };

    const handleSidebarClose = () => {
        setSidebarOpen(false);
    };

    return (
        <div>
            <AppBar
                position="fixed"
                className={clsx(classes.appBar, {[classes.appBarShift]: sidebarOpen && isLargeScreen && authenticated})}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleSidebarOpen}
                        edge="start"
                        className={clsx(classes.menuButton, sidebarOpen && classes.hide)}
                    >
                        <MenuIcon/>
                    </IconButton>
                    {group !== null ? (
                        <Button color="inherit" noWrap className={classes.title} component={RouterLink}
                                to={`/groups/${group.id}`}>
                            {group.name}
                        </Button>
                    ) : (
                        <Typography variant="h6" noWrap className={classes.title}>
                            Abrechnung
                        </Typography>
                    )}
                    {authenticated ? (
                        <div>
                            <IconButton
                                aria-label="account of current user"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleProfileMenuOpen}
                                color="inherit"
                            >
                                <AccountCircleIcon/>
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                open={dotsMenuOpen}
                                anchorOrigin={{
                                    vertical: "top",
                                    horizontal: "right"
                                }}
                                keepMounted
                                anchorEl={anchorEl}
                                transformOrigin={{
                                    vertical: "top",
                                    horizontal: "right"
                                }}
                                onClose={handleDotsMenuClose}
                            >
                                <MenuItem component={RouterLink} to="/profile">Profile</MenuItem>
                                <MenuItem component={RouterLink} to="/profile/sessions">Sessions</MenuItem>
                                <MenuItem component={RouterLink} to="/profile/change-email">Change E-Mail</MenuItem>
                                <MenuItem component={RouterLink} to="/profile/change-password">Change
                                    Password</MenuItem>
                                <MenuItem component={RouterLink} to="/logout">Sign out</MenuItem>
                            </Menu>
                        </div>
                    ) : (
                        <Button component={RouterLink} color="inherit" to="/login">
                            Login
                        </Button>
                    )}
                </Toolbar>
            </AppBar>

            {authenticated ? (
                <SwipeableDrawer
                    className={classes.drawer}
                    disableBackdropTransition={!iOS}
                    disableDiscovery={iOS}
                    open={sidebarOpen}
                    onClose={handleSidebarClose}
                    onOpen={handleSidebarOpen}
                    variant={isLargeScreen ? "persistent" : "temporary"}
                    classes={{
                        paper: classes.drawerPaper
                    }}
                >
                    <div className={classes.drawerHeader}>
                        <IconButton onClick={handleSidebarClose}>
                            {theme.direction === "ltr" ? <ChevronLeftIcon/> : <ChevronRightIcon/>}
                        </IconButton>
                    </div>
                    <Divider/>
                    {group != null && (
                        <>
                            <ListItemLink to={`/groups/${group.id}/`}>
                                <ListItemText primary="Transactions"/>
                            </ListItemLink>
                            <ListItemLink to={`/groups/${group.id}/accounts`}>
                                <ListItemText primary="Accounts"/>
                            </ListItemLink>
                            <ListItemLink to={`/groups/${group.id}/detail`}>
                                <ListItemText primary="Group detail"/>
                            </ListItemLink>
                            <ListItemLink to={`/groups/${group.id}/members`}>
                                <ListItemText primary="Group Members"/>
                            </ListItemLink>
                            <ListItemLink to={`/groups/${group.id}/invites`}>
                                <ListItemText primary="Group Invites"/>
                            </ListItemLink>
                            <ListItemLink to={`/groups/${group.id}/log`}>
                                <ListItemText primary="Group Log"/>
                            </ListItemLink>
                            <Divider/>
                        </>
                    )}
                    <List>
                        <ListItemLink to="/">
                            <ListItemText primary="Groups"/>
                        </ListItemLink>
                        <Divider/>
                        <ListItemLink to="/logout">
                            <ListItemText primary="Sign out"/>
                        </ListItemLink>
                    </List>
                </SwipeableDrawer>
            ) : null}
            <main className={clsx(classes.content, {
                [classes.contentShift]: sidebarOpen && isLargeScreen && authenticated
            })}>
                <div className={classes.drawerHeader}/>
                <Container maxWidth="lg">
                    {children}
                </Container>
            </main>
        </div>
    );
}
