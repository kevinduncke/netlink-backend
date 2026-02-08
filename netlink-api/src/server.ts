import { createApp } from "./app";

const PORT = process.env.PORT || 4400;

const app = createApp();

app.listen(PORT, () => {
    console.log(`NETLINK API LISTENING ON PORT http://localhost:${PORT}`);
    console.log(`TEST ROUTE: http://localhost:${PORT}/health`);
    console.log(`DATABASE ROUTE: http://localhost:${PORT}/db/health`);
});