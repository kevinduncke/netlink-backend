import { createApp } from "./app";

const PORT = process.env.PORT || 4400;

const app = createApp();

app.listen(PORT, () => {
    console.log(`\nNETLINK API LISTENING ON PORT http://localhost:${PORT}`);
    
    console.log('\nROUTE TESTS:');
    console.log(`TEST ROUTE: http://localhost:${PORT}/health`);
    console.log(`DATABASE ROUTE: http://localhost:${PORT}/db/health`);
});