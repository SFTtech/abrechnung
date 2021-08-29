import React, {Suspense, useState} from "react";
import {Route, Switch, useRouteMatch} from "react-router-dom";
import GroupInvites from "./GroupInvites";
import GroupMemberList from "./GroupMemberList";
// import GroupLog from "./GroupLog";
import Accounts from "../../components/groups/Accounts";
import TransactionLog from "../../components/transactions/TransactionLog";
import {useRecoilValue} from "recoil";
import {groupById} from "../../recoil/groups";
import Layout from "../../components/style/Layout";
import Loading from "../../components/style/Loading";
import {AppBar, Box, Paper, Tab, Tabs} from "@material-ui/core";
import Transaction from "./Transaction";
import GroupDetail from "./GroupDetail";
import Grid from "@material-ui/core/Grid";

function TabPanel(props) {
    const {children, value, index, ...other} = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`wrapped-tabpanel-${index}`}
            aria-labelledby={`wrapped-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index) {
    return {
        id: `wrapped-tab-${index}`,
        'aria-controls': `wrapped-tabpanel-${index}`,
    };
}

export default function Group() {
    const match = useRouteMatch();
    const groupID = match.params.id;
    const group = useRecoilValue(groupById(parseInt(groupID)));
    const [selectedTab, setSelectedTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setSelectedTab(newValue);
    }

    // TODO: handle 404
    return (
        <Layout group={group}>
            <Switch>
                {/*<Route exact path={`${match.path}/log`}>*/}
                {/*    <GroupLog group={group} />*/}
                {/*</Route>*/}
                <Route exact path={`${match.path}/members`}>
                    <GroupMemberList group={group} />
                </Route>
                <Route exact path={`${match.path}/detail`}>
                    <GroupDetail group={group} />
                </Route>
                <Route exact path={`${match.path}/invites`}>
                    <GroupInvites group={group} />
                </Route>
                <Route exact path={`${match.path}/`}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Paper elevation={1}>
                                <AppBar position="static" color="default">
                                    <Tabs
                                        value={selectedTab}
                                        indicatorColor="primary"
                                        textColor="primary"
                                        centered
                                        onChange={handleTabChange}
                                    >
                                        <Tab label="Transactions" {...a11yProps(0)} />
                                        <Tab label="Accounts" {...a11yProps(1)} />
                                    </Tabs>
                                </AppBar>
                                <TabPanel value={selectedTab} index={0}>
                                    <Suspense fallback={<Loading/>}>
                                        <TransactionLog group={group}/>
                                    </Suspense>
                                </TabPanel>
                                <TabPanel value={selectedTab} index={1}>
                                    <Suspense fallback={<Loading/>}>
                                        <Accounts group={group}/>
                                    </Suspense>
                                </TabPanel>
                            </Paper>
                        </Grid>
                    </Grid>
                </Route>
                <Route path={`${match.path}/transactions/:id([0-9]+)`}>
                    <Suspense fallback={<Loading/>}>
                        <Transaction group={group}/>
                    </Suspense>
                </Route>
            </Switch>
        </Layout>
    );
}
